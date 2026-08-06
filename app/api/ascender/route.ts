import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

function generarPasswordTemporal() {
  const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);

  return Array.from(
    bytes,
    (byte) => caracteres[byte % caracteres.length]
  ).join("");
}

async function siguienteCodigoNovicio() {
  const [{ data: usuarios, error: usersError }, { data: miembros, error: miembrosError }] =
    await Promise.all([
      supabaseServer
        .from("users")
        .select("codigo")
        .like("codigo", "NOV%"),
      supabaseServer
        .from("miembros")
        .select("codigo")
        .like("codigo", "NOV%"),
    ]);

  if (usersError) throw new Error(usersError.message);
  if (miembrosError) throw new Error(miembrosError.message);

  const usados = new Set<number>();

  [...(usuarios || []), ...(miembros || [])].forEach((fila) => {
    const coincidencia = String(fila.codigo || "").match(/^NOV(\d+)$/);

    if (coincidencia) {
      usados.add(Number(coincidencia[1]));
    }
  });

  let numero = 1;

  while (usados.has(numero)) {
    numero += 1;
  }

  if (numero > 9999) {
    throw new Error("No hay códigos NOV disponibles.");
  }

  return `NOV${String(numero).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  let codigoAnterior = "";
  let codigoNuevo = "";
  let passwordAnterior: string | null = null;
  let usuarioActualizado = false;
  let miembroActualizado = false;

  try {
    const body = await req.json();
    codigoAnterior = normalizarCodigo(body.codigo);

    if (!codigoAnterior) {
      return NextResponse.json(
        { ok: false, error: "Falta el código del aspirante." },
        { status: 400 }
      );
    }

    const { data: usuario, error: usuarioError } = await supabaseServer
      .from("users")
      .select("codigo,password,nivel,nombre,consejo")
      .eq("codigo", codigoAnterior)
      .maybeSingle();

    if (usuarioError || !usuario) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el usuario aspirante." },
        { status: 404 }
      );
    }

    const nivelActual = String(usuario.nivel || "").toUpperCase();

    /*
     * Protección frente a doble ejecución:
     * si ya fue ascendido, no se crea otro código.
     */
    if (nivelActual === "NOV") {
      return NextResponse.json({
        ok: true,
        yaAscendido: true,
        codigoNuevo: usuario.codigo,
      });
    }

    if (nivelActual !== "ASP") {
      return NextResponse.json(
        {
          ok: false,
          error: "El usuario no pertenece al Nivel Aspirante.",
        },
        { status: 409 }
      );
    }

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
          error:
            "El módulo introductorio todavía no está completado al 100 %.",
        },
        { status: 409 }
      );
    }

    codigoNuevo = await siguienteCodigoNovicio();
    const passwordTemporal = generarPasswordTemporal();
    passwordAnterior = usuario.password || null;

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

    const { error: actualizarUsuarioError } = await supabaseServer
      .from("users")
      .update({
        codigo: codigoNuevo,
        nivel: "NOV",
        password: passwordTemporal,
      })
      .eq("codigo", codigoAnterior);

    if (actualizarUsuarioError) {
      throw new Error(actualizarUsuarioError.message);
    }

    usuarioActualizado = true;

    const { error: actualizarMiembroError } = await supabaseServer
      .from("miembros")
      .update({
        codigo: codigoNuevo,
        nivel: "NOV",
      })
      .eq("codigo", codigoAnterior);

    if (actualizarMiembroError) {
      throw new Error(actualizarMiembroError.message);
    }

    miembroActualizado = true;

    /*
     * Conservamos el progreso introductorio, pero lo trasladamos
     * al nuevo código NOV para mantener el historial académico.
     */
    const { error: trasladarProgresoError } = await supabaseServer
      .from("progreso_aspirante")
      .update({
        user_codigo: codigoNuevo,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("user_codigo", codigoAnterior)
      .eq("unidad_slug", "introductorio");

    if (trasladarProgresoError) {
      throw new Error(trasladarProgresoError.message);
    }

    /*
     * Inicia el proceso NOV en cero.
     * Esta fila representa la primera unidad disponible.
     */
    const { error: progresoNovicioError } = await supabaseServer
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
        {
          onConflict: "user_codigo,unidad_slug",
        }
      );

    if (progresoNovicioError) {
      throw new Error(progresoNovicioError.message);
    }

    /*
     * Buscamos el correo original del candidato admitido.
     */
    const { data: candidato } = await supabaseServer
      .from("candidatos")
      .select("correo,nombres,apellidos,codigo")
      .eq("codigo_miembro_generado", codigoAnterior)
      .maybeSingle();

    const sitio =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://agenn-web.vercel.app";

    let correo: {
	  enviado: boolean;
	  error?: string;
	} = {
	  enviado: false,
	  error: "No se encontró el correo del expediente de admisión.",
	};

    if (candidato?.correo) {
      const nombreCompleto =
        `${candidato.nombres || ""} ${candidato.apellidos || ""}`.trim() ||
        usuario.nombre;

      correo = await enviarCorreo({
        para: candidato.correo,
        asunto: `AGENN | Bienvenido(a) al Nivel Novicio — ${codigoNuevo}`,
        html: plantillaCorreo(`
          <p>Estimado(a) <strong>${nombreCompleto}</strong>:</p>

          <p>
            Nos complace felicitarle por haber completado satisfactoriamente
            el Módulo Introductorio del Nivel Aspirante.
          </p>

          <p>
            A partir de este momento ha sido promovido(a) oficialmente al
            <strong>Nivel Novicio</strong> de la Academia Guatemalteca de
            Estudios Numismáticos y Notafílicos.
          </p>

          <div
            style="
              background:#eef6e9;
              border-left:5px solid #4f7f3b;
              padding:16px;
              margin:20px 0;
            "
          >
            <strong>Nuevo código:</strong> ${codigoNuevo}<br>
            <strong>Contraseña temporal:</strong> ${passwordTemporal}
          </div>

          <p>
            El Programa de Formación para Novicios está integrado por
            diez unidades de estudio. Cada unidad combina contenidos
            formativos con un cuestionario que deberá completarse para
            habilitar la siguiente etapa.
          </p>

          <p>
            En la última unidad se solicitará la elaboración de un texto
            académico breve, con el que podrá demostrar la comprensión y
            aplicación de los conocimientos adquiridos.
          </p>

          <p style="text-align:center;margin:28px 0;">
            <a
              href="${sitio}/login"
              style="
                background:#6b4f2a;
                color:white;
                text-decoration:none;
                padding:12px 20px;
                border-radius:8px;
                font-weight:bold;
              "
            >
              Ingresar al Nivel Novicio
            </a>
          </p>

          <p>
            Por seguridad, conserve este mensaje hasta confirmar que puede
            ingresar correctamente con sus nuevas credenciales.
          </p>

          <p>
            Le deseamos muchos éxitos en esta nueva etapa de su formación.
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
      passwordTemporal,
      correo,
    });
  } catch (error) {
    console.error("Error en /api/ascender:", error);

    /*
     * Intento de reversión si alguna etapa intermedia falla.
     */
    if (usuarioActualizado && codigoNuevo && codigoAnterior) {
      await supabaseServer
        .from("users")
        .update({
          codigo: codigoAnterior,
          nivel: "ASP",
          password: passwordAnterior,
        })
        .eq("codigo", codigoNuevo);
    }

    if (miembroActualizado && codigoNuevo && codigoAnterior) {
      await supabaseServer
        .from("miembros")
        .update({
          codigo: codigoAnterior,
          nivel: "ASP",
        })
        .eq("codigo", codigoNuevo);
    }

    if (codigoNuevo && codigoAnterior) {
      await supabaseServer
        .from("progreso_aspirante")
        .update({
          user_codigo: codigoAnterior,
        })
        .eq("user_codigo", codigoNuevo)
        .eq("unidad_slug", "introductorio");

      await supabaseServer
        .from("progreso_novicio")
        .delete()
        .eq("user_codigo", codigoNuevo)
        .eq("unidad_slug", "unidad-1");
    }

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