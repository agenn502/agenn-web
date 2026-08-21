import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";
import {
  formatearCorrelativoCertificado,
  prefijoRegistroCertificado,
} from "@/lib/certificados";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

async function siguienteCodigo(prefijo: "NOV" | "INV") {
  const [{ data: usuarios, error: usersError }, { data: miembros, error: miembrosError }] =
    await Promise.all([
      supabaseServer.from("users").select("codigo").like("codigo", `${prefijo}%`),
      supabaseServer.from("miembros").select("codigo").like("codigo", `${prefijo}%`),
    ]);

  if (usersError) throw new Error(usersError.message);
  if (miembrosError) throw new Error(miembrosError.message);

  const usados = new Set<number>();

  [...(usuarios || []), ...(miembros || [])].forEach((fila) => {
    const coincidencia = String(fila.codigo || "").match(
      new RegExp(`^${prefijo}(\\d+)$`)
    );

    if (coincidencia) {
      usados.add(Number(coincidencia[1]));
    }
  });

  let numero = 1;

  while (usados.has(numero)) {
    numero += 1;
  }

  if (numero > 9999) {
    throw new Error(`No hay códigos ${prefijo} disponibles.`);
  }

  return `${prefijo}${String(numero).padStart(4, "0")}`;
}

async function generarCertificadoNovicio(
  codigoMiembro: string,
  nombre: string
) {
  const nivel = "NOV";
  const origen = "FORMACION";

  const { data: existente, error: existenteError } = await supabaseServer
    .from("certificados")
    .select(
      "id,registro,codigo_miembro,nombre,nivel,origen_acreditacion,fecha_emision,estado"
    )
    .eq("codigo_miembro", codigoMiembro)
    .eq("nivel", nivel)
    .eq("origen_acreditacion", origen)
    .eq("estado", "vigente")
    .maybeSingle();

  if (existenteError) {
    throw new Error(existenteError.message);
  }

  if (existente) {
    return existente;
  }

  const fechaEmision = new Date();
  const prefijo = prefijoRegistroCertificado(nivel, fechaEmision);

  const { data: registros, error: registrosError } = await supabaseServer
    .from("certificados")
    .select("registro")
    .like("registro", `${prefijo}%`);

  if (registrosError) {
    throw new Error(registrosError.message);
  }

  let mayor = 0;

  for (const fila of registros || []) {
    const registro = String(fila.registro || "");

    if (!registro.startsWith(prefijo)) continue;

    const numero = Number(registro.substring(prefijo.length));

    if (Number.isInteger(numero) && numero > mayor) {
      mayor = numero;
    }
  }

  const registro = `${prefijo}${formatearCorrelativoCertificado(mayor + 1)}`;

  const { data: certificado, error: certificadoError } = await supabaseServer
    .from("certificados")
    .insert({
      registro,
      codigo_miembro: codigoMiembro,
      nombre,
      nivel,
      origen_acreditacion: origen,
      fecha_emision: fechaEmision.toISOString(),
      estado: "vigente",
    })
    .select(
      "id,registro,codigo_miembro,nombre,nivel,origen_acreditacion,fecha_emision,estado"
    )
    .single();

  if (certificadoError) {
    throw new Error(certificadoError.message);
  }

  return certificado;
}

async function ascenderAspANov(
  codigoAnterior: string,
  usuario: any,
  sitio: string
) {
  const { data: progreso, error: progresoError } = await supabaseServer
    .from("progreso_aspirante")
    .select("completada,porcentaje,respuestas")
    .eq("user_codigo", codigoAnterior)
    .eq("unidad_slug", "introductorio")
    .maybeSingle();

  if (
    progresoError ||
    !progreso ||
    progreso.completada !== true ||
    Number(progreso.porcentaje) !== 100
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "El módulo introductorio todavía no está completado al 100 %.",
      },
      { status: 409 }
    );
  }

  const codigoNuevo = await siguienteCodigo("NOV");

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel")
    .eq("codigo", codigoAnterior)
    .maybeSingle();

  if (miembroError || !miembro) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se encontró el expediente del miembro aspirante.",
      },
      { status: 404 }
    );
  }

  const { error: usuarioError } = await supabaseServer
    .from("users")
    .update({
      codigo: codigoNuevo,
      nivel: "NOV",
    })
    .eq("codigo", codigoAnterior);

  if (usuarioError) throw new Error(usuarioError.message);

  const { error: miembroUpdateError } = await supabaseServer
    .from("miembros")
    .update({
      codigo: codigoNuevo,
      nivel: "NOV",
    })
    .eq("codigo", codigoAnterior);

  if (miembroUpdateError) throw new Error(miembroUpdateError.message);

  const { error: progresoMoverError } = await supabaseServer
    .from("progreso_aspirante")
    .update({
      user_codigo: codigoNuevo,
      fecha_actualizacion: new Date().toISOString(),
    })
    .eq("user_codigo", codigoAnterior)
    .eq("unidad_slug", "introductorio");

  if (progresoMoverError) throw new Error(progresoMoverError.message);

  const { error: progresoNovError } = await supabaseServer
    .from("progreso_novicio")
    .upsert(
      {
        user_codigo: codigoNuevo,
        unidad_slug: "unidad-1",
        completada: false,
        porcentaje: 0,
        respuestas: null,
        fecha_actualizacion: new Date().toISOString(),
      },
      { onConflict: "user_codigo,unidad_slug" }
    );

  if (progresoNovError) throw new Error(progresoNovError.message);

  let correo = {
    enviado: false,
    error: "No se encontró correo registrado para el usuario.",
  } as { enviado: boolean; error?: string };

  let correoDestino = String(usuario.correo || "").trim();

  /*
   * Compatibilidad con miembros creados antes de que el correo
   * se almacenara también en users/miembros.
   */
  if (!correoDestino) {
    const { data: candidatoOrigen } = await supabaseServer
      .from("candidatos")
      .select("correo")
      .eq("miembro_id", miembro.id)
      .maybeSingle();

    correoDestino = String(candidatoOrigen?.correo || "").trim();
  }

  if (correoDestino) {
    correo = await enviarCorreo({
      para: correoDestino,
      asunto: `AGENN | Bienvenido(a) al Nivel Novicio — ${codigoNuevo}`,
      html: plantillaCorreo(`
        <p>Estimado(a) <strong>${miembro.nombre}</strong>:</p>
        <p>
          Nos complace felicitarle por haber completado satisfactoriamente
          el Módulo Introductorio del Nivel Aspirante.
        </p>
        <p>
          A partir de este momento ha sido promovido(a) oficialmente al
          <strong>Nivel Novicio</strong>.
        </p>
        <div style="background:#eef6e9;border-left:5px solid #4f7f3b;padding:16px;margin:20px 0;line-height:1.8;">
          <strong>Nuevo código institucional:</strong> ${codigoNuevo}<br>
          <strong>Nivel:</strong> Académico Novicio
        </div>
        <p>
          Su contraseña personal no ha cambiado. Ingrese con su nuevo código
          institucional y la misma contraseña.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${sitio}/login" style="background:#6b4f2a;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
            Ingresar al Nivel Novicio
          </a>
        </p>
        <p>Si no encuentra este correo en su bandeja de entrada, revise también la carpeta de Spam.</p>
      `),
    });
  }

  return NextResponse.json({
    ok: true,
    codigoAnterior,
    codigoNuevo,
    nivelAnterior: "ASP",
    nivelNuevo: "NOV",
    correo,
  });
}

async function ascenderNovAInv(
  codigoAnterior: string,
  usuario: any,
  sitio: string
) {
  const unidades = Array.from({ length: 10 }, (_, i) => `unidad-${i + 1}`);

  const { data: progreso, error: progresoError } = await supabaseServer
    .from("progreso_novicio")
    .select("unidad_slug,completada,porcentaje")
    .eq("user_codigo", codigoAnterior)
    .in("unidad_slug", unidades);

  if (progresoError) {
    throw new Error(progresoError.message);
  }

  const completas = new Set(
    (progreso || [])
      .filter(
        (fila) =>
          fila.completada === true &&
          Number(fila.porcentaje) === 100
      )
      .map((fila) => String(fila.unidad_slug))
  );

  const faltantes = unidades.filter((unidad) => !completas.has(unidad));

  if (faltantes.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          `El Nivel Novicio todavía no está completo. Faltan: ${faltantes.join(", ")}.`,
      },
      { status: 409 }
    );
  }

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select(
      "id,codigo,nombre,nivel,estado_academico,origen_acreditacion,correo"
    )
    .eq("codigo", codigoAnterior)
    .maybeSingle();

  if (miembroError || !miembro) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se encontró el expediente del miembro novicio.",
      },
      { status: 404 }
    );
  }

  const codigoNuevo = await siguienteCodigo("INV");
  const ahora = new Date().toISOString();

  let usuarioActualizado = false;
  let miembroActualizado = false;
  let progresoMovido = false;
  let progresoInvCreado = false;
  let certificadoCreado: any = null;

  try {
    const { error: usuarioError } = await supabaseServer
      .from("users")
      .update({
        codigo: codigoNuevo,
        nivel: "INV",
      })
      .eq("codigo", codigoAnterior);

    if (usuarioError) throw new Error(usuarioError.message);
    usuarioActualizado = true;

    const { error: miembroUpdateError } = await supabaseServer
      .from("miembros")
      .update({
        codigo: codigoNuevo,
        nivel: "INV",
        estado_academico: "EN_FORMACION",
        origen_acreditacion: "FORMACION",
      })
      .eq("codigo", codigoAnterior);

    if (miembroUpdateError) throw new Error(miembroUpdateError.message);
    miembroActualizado = true;

    const { error: moverProgresoError } = await supabaseServer
      .from("progreso_novicio")
      .update({
        user_codigo: codigoNuevo,
        fecha_actualizacion: ahora,
      })
      .eq("user_codigo", codigoAnterior);

    if (moverProgresoError) throw new Error(moverProgresoError.message);
    progresoMovido = true;

    const { error: progresoInvError } = await supabaseServer
      .from("progreso_inv")
      .upsert(
        {
          user_codigo: codigoNuevo,
          unidad_slug: "unidad-1",
          completada: false,
          porcentaje: 0,
          respuestas: null,
          fecha_actualizacion: ahora,
        },
        { onConflict: "user_codigo,unidad_slug" }
      );

    if (progresoInvError) throw new Error(progresoInvError.message);
    progresoInvCreado = true;

    certificadoCreado = await generarCertificadoNovicio(
      codigoNuevo,
      miembro.nombre
    );

    let correoDestino = String(
      usuario.correo || miembro.correo || ""
    ).trim();

    /*
     * Compatibilidad con expedientes antiguos sin correo en users/miembros.
     * El vínculo miembro_id permanece aunque cambie el código institucional.
     */
    if (!correoDestino) {
      const { data: candidatoOrigen } = await supabaseServer
        .from("candidatos")
        .select("correo")
        .eq("miembro_id", miembro.id)
        .maybeSingle();

      correoDestino = String(candidatoOrigen?.correo || "").trim();
    }

    let correo = {
      enviado: false,
      error: "No se encontró correo registrado para el miembro.",
    } as { enviado: boolean; error?: string };

    if (correoDestino) {
      correo = await enviarCorreo({
        para: correoDestino,
        asunto: `AGENN | Ascenso al Nivel Investigador — ${codigoNuevo}`,
        html: plantillaCorreo(`
          <p>Estimado(a) <strong>${miembro.nombre}</strong>:</p>

          <p>
            Nos complace felicitarle por haber completado satisfactoriamente
            las diez unidades del <strong>Nivel Novicio</strong>.
          </p>

          <p>
            Su formación en este nivel ha quedado aprobada y la Academia ha
            emitido el certificado institucional correspondiente.
          </p>

          <div style="background:#eef6e9;border-left:5px solid #4f7f3b;padding:16px;margin:20px 0;line-height:1.8;">
            <strong>Nuevo código institucional:</strong> ${codigoNuevo}<br>
            <strong>Nuevo nivel:</strong> Académico Investigador<br>
            <strong>Certificado NOV:</strong> ${certificadoCreado.registro}
          </div>

          <p>
            A partir de este momento queda habilitado su
            <strong>Proceso de Formación y Acreditación — Nivel Investigador</strong>.
          </p>

          <p>
            Su contraseña personal no ha cambiado. Para ingresar deberá utilizar
            su nuevo código <strong>${codigoNuevo}</strong> junto con la misma
            contraseña que ha utilizado hasta ahora.
          </p>

          <p style="text-align:center;margin:28px 0;">
            <a href="${sitio}/login" style="background:#6b4f2a;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
              Ingresar al Nivel Investigador
            </a>
          </p>

          <p>
            Si no encuentra este correo en su bandeja de entrada, revise también
            la carpeta de Spam.
          </p>

          <p>
            <strong>Consejo Académico</strong><br>
            Academia Guatemalteca de Estudios Numismáticos y Notafílicos
          </p>
        `),
      });
    }

    return NextResponse.json({
      ok: true,
      codigoAnterior,
      codigoNuevo,
      nivelAnterior: "NOV",
      nivelNuevo: "INV",
      certificado: certificadoCreado,
      correo,
    });
  } catch (error) {
    if (certificadoCreado?.id) {
      await supabaseServer
        .from("certificados")
        .delete()
        .eq("id", certificadoCreado.id);
    }

    if (progresoInvCreado) {
      await supabaseServer
        .from("progreso_inv")
        .delete()
        .eq("user_codigo", codigoNuevo);
    }

    if (progresoMovido) {
      await supabaseServer
        .from("progreso_novicio")
        .update({
          user_codigo: codigoAnterior,
        })
        .eq("user_codigo", codigoNuevo);
    }

    if (miembroActualizado) {
      await supabaseServer
        .from("miembros")
        .update({
          codigo: codigoAnterior,
          nivel: "NOV",
          estado_academico: miembro.estado_academico || null,
          origen_acreditacion: miembro.origen_acreditacion || null,
        })
        .eq("codigo", codigoNuevo);
    }

    if (usuarioActualizado) {
      await supabaseServer
        .from("users")
        .update({
          codigo: codigoAnterior,
          nivel: "NOV",
        })
        .eq("codigo", codigoNuevo);
    }

    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const codigoAnterior = normalizarCodigo(body.codigo);

    if (!codigoAnterior) {
      return NextResponse.json(
        { ok: false, error: "Falta el código del miembro." },
        { status: 400 }
      );
    }

    const sitio = process.env.NEXT_PUBLIC_SITE_URL;

    if (!sitio) {
      throw new Error("NEXT_PUBLIC_SITE_URL no está configurada.");
    }

    const { data: usuario, error: usuarioError } = await supabaseServer
      .from("users")
      .select("codigo,password,nivel,nombre,consejo,correo")
      .eq("codigo", codigoAnterior)
      .maybeSingle();

    if (usuarioError || !usuario) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el usuario." },
        { status: 404 }
      );
    }

    const nivelActual = String(usuario.nivel || "").toUpperCase();

    if (nivelActual === "ASP") {
      return await ascenderAspANov(codigoAnterior, usuario, sitio);
    }

    if (nivelActual === "NOV") {
      return await ascenderNovAInv(codigoAnterior, usuario, sitio);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "El usuario no pertenece a un nivel con ascenso automático habilitado.",
      },
      { status: 409 }
    );
  } catch (error) {
    console.error("Error en /api/ascender:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible completar el ascenso.",
      },
      { status: 500 }
    );
  }
}