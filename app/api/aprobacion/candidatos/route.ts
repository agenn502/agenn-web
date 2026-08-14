import {
  createHash,
  randomBytes,
  randomUUID,
} from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";

async function validarConsejo(codigo: string) {
  const { data } = await supabaseServer
    .from("users")
    .select("consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  const valor = data?.consejo;
  return valor === true || valor === "true" || valor === "TRUE" || valor === 1;
}

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

async function siguienteCodigo(nivel: "ASP" | "INV") {
  const [{ data: usuarios }, { data: miembros }] = await Promise.all([
    supabaseServer.from("users").select("codigo").like("codigo", `${nivel}%`),
    supabaseServer.from("miembros").select("codigo").like("codigo", `${nivel}%`),
  ]);

  const usados = new Set<number>();
  [...(usuarios || []), ...(miembros || [])].forEach((row) => {
    const match = String(row.codigo || "").match(new RegExp(`^${nivel}(\\d+)$`));
    if (match) usados.add(Number(match[1]));
  });

  let numero = 1;
  while (usados.has(numero)) numero += 1;
  return `${nivel}${String(numero).padStart(4, "0")}`;
}

async function registrarHistorial(params: {
  candidatoId: string;
  codigo: string;
  accion: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  detalle: string;
  actorCodigo: string;
  visibleCandidato: boolean;
}) {
  return supabaseServer.from("candidatos_historial").insert({
    candidato_id: params.candidatoId,
    codigo_candidato: params.codigo,
    accion: params.accion,
    estado_anterior: params.estadoAnterior,
    estado_nuevo: params.estadoNuevo,
    detalle: params.detalle,
    actor_codigo: params.actorCodigo,
    visible_candidato: params.visibleCandidato,
  });
}

export async function GET(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo || !(await validarConsejo(codigo))) {
    return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("candidatos")
    .select("*")
    .in("estado", ["pendiente", "reenviada"])
    .order("fecha_solicitud", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const candidatos = await Promise.all(
    (data || []).map(async (candidato) => {
      let foto_firmada: string | null = null;
      if (candidato.foto_url) {
        const { data: firma } = await supabaseServer.storage
          .from("candidatos-fotos")
          .createSignedUrl(candidato.foto_url, 60 * 30);
        foto_firmada = firma?.signedUrl || null;
      }
      return { ...candidato, foto_firmada };
    })
  );

  return NextResponse.json({ ok: true, candidatos });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const actorCodigo = String(body.actorCodigo || "").trim().toUpperCase();
  const candidatoId = String(body.candidatoId || "").trim();
  const accion = String(body.accion || "").trim();

  if (!actorCodigo || !(await validarConsejo(actorCodigo))) {
    return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
  }

  const { data: candidato, error: candidatoError } = await supabaseServer
    .from("candidatos")
    .select("*")
    .eq("id", candidatoId)
    .maybeSingle();

  if (candidatoError || !candidato) {
    return NextResponse.json({ ok: false, error: "No se encontró el expediente." }, { status: 404 });
  }

  const sitio = process.env.NEXT_PUBLIC_SITE_URL;

		if (!sitio) {
		  throw new Error(
			"NEXT_PUBLIC_SITE_URL no está configurada."
		  );
		}
  const nombreCompleto = `${candidato.nombres} ${candidato.apellidos}`.trim();

  if (accion === "correcciones") {
    const observaciones = String(body.observacionesCandidato || "").trim();
    const privadas = String(body.observacionesPrivadas || "").trim();
    if (!observaciones) {
      return NextResponse.json({ ok: false, error: "Escriba las correcciones solicitadas." }, { status: 400 });
    }

    const token = randomUUID();
    const expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseServer
      .from("candidatos")
      .update({
        estado: "correcciones_solicitadas",
        observaciones_candidato: observaciones,
        observaciones_privadas: privadas || null,
        revisado_por_codigo: actorCodigo,
        fecha_revision: new Date().toISOString(),
        token_correccion: token,
        token_correccion_expira: expira,
      })
      .eq("id", candidato.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await registrarHistorial({
      candidatoId: candidato.id,
      codigo: candidato.codigo,
      accion: "correcciones_solicitadas",
      estadoAnterior: candidato.estado,
      estadoNuevo: "correcciones_solicitadas",
      detalle: observaciones,
      actorCodigo,
      visibleCandidato: true,
    });

    const enlace = `${sitio}/corregir-solicitud?token=${encodeURIComponent(token)}`;
    const correo = await enviarCorreo({
      para: candidato.correo,
      asunto: `AGENN | Correcciones solicitadas a ${candidato.codigo}`,
      html: plantillaCorreo(`
        <p>Estimado(a) <strong>${nombreCompleto}</strong>:</p>
        <p>El Consejo Académico revisó su solicitud <strong>${candidato.codigo}</strong> y requiere que complete o corrija la siguiente información:</p>
        <div style="background:#fff8e5;border-left:5px solid #b08a3c;padding:14px">${observaciones.replace(/\n/g, "<br>")}</div>
        <p>Puede actualizar su expediente mediante el siguiente enlace:</p>
        <p style="text-align:center"><a href="${enlace}" style="background:#6b4f2a;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Corregir mi solicitud</a></p>
        <p>El enlace estará disponible durante 30 días.</p>
      `),
    });

    await supabaseServer.from("candidatos").update({
      ultimo_correo_enviado: correo.enviado ? new Date().toISOString() : null,
      ultimo_error_correo: correo.error || null,
    }).eq("id", candidato.id);

    return NextResponse.json({ ok: true, correo });
  }

  if (accion === "rechazar") {
    const privadas = String(body.observacionesPrivadas || "").trim();
    const mensajePublico = String(body.observacionesCandidato || "").trim();
    if (!privadas) {
      return NextResponse.json({ ok: false, error: "Registre el fundamento privado de la decisión." }, { status: 400 });
    }

    const ahora = new Date().toISOString();
    const { error } = await supabaseServer.from("candidatos").update({
      estado: "rechazada",
      observaciones_privadas: privadas,
      observaciones_candidato: mensajePublico || null,
      revisado_por_codigo: actorCodigo,
      fecha_revision: ahora,
      fecha_resolucion: ahora,
      token_correccion: null,
      token_correccion_expira: null,
    }).eq("id", candidato.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await registrarHistorial({
      candidatoId: candidato.id,
      codigo: candidato.codigo,
      accion: "candidatura_rechazada",
      estadoAnterior: candidato.estado,
      estadoNuevo: "rechazada",
      detalle: mensajePublico || "Resolución de no aprobación emitida por el Consejo Académico.",
      actorCodigo,
      visibleCandidato: true,
    });

    const correo = await enviarCorreo({
      para: candidato.correo,
      asunto: `AGENN | Resolución de la solicitud ${candidato.codigo}`,
      html: plantillaCorreo(`
        <p>Estimado(a) <strong>${nombreCompleto}</strong>:</p>
        <p>Agradecemos sinceramente el interés manifestado en formar parte de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.</p>
        <p>Luego de revisar integralmente la información presentada y deliberar conforme a los criterios institucionales de la Academia, el Consejo Académico resolvió no aprobar su solicitud de ingreso en esta oportunidad.</p>
        ${mensajePublico ? `<p>${mensajePublico.replace(/\n/g, "<br>")}</p>` : ""}
        <p>Le agradecemos la confianza depositada en la AGENN y le deseamos éxitos en sus actividades futuras.</p>
      `),
    });

    await supabaseServer.from("candidatos").update({
      ultimo_correo_enviado: correo.enviado ? new Date().toISOString() : null,
      ultimo_error_correo: correo.error || null,
    }).eq("id", candidato.id);

    return NextResponse.json({ ok: true, correo });
  }

if (accion === "aprobar") {
  const nivel = String(body.nivel || "")
    .trim()
    .toUpperCase();

  const privadas = String(
    body.observacionesPrivadas || ""
  ).trim();

  if (nivel !== "ASP" && nivel !== "INV") {
    return NextResponse.json(
      {
        ok: false,
        error: "Seleccione ASP o INV.",
      },
      { status: 400 }
    );
  }

  const codigoMiembro = await siguienteCodigo(
    nivel as "ASP" | "INV"
  );

  let fotoMiembro: string | null = null;
  let miembroId: number | null = null;
  let usuarioCreado = false;
  let tokenPasswordCreado = false;

  try {
    // -------------------------------------------------------
    // 1. Trasladar fotografía
    // -------------------------------------------------------

    if (candidato.foto_url) {
      const {
        data: foto,
        error: descargaError,
      } = await supabaseServer.storage
        .from("candidatos-fotos")
        .download(candidato.foto_url);

      if (descargaError || !foto) {
        throw new Error(
          "No fue posible recuperar la fotografía del candidato."
        );
      }

      const rutaMiembro =
        `${codigoMiembro}-${Date.now()}.jpg`;

      const {
        error: subidaError,
      } = await supabaseServer.storage
        .from("miembros-fotos")
        .upload(
          rutaMiembro,
          await foto.arrayBuffer(),
          {
            contentType: "image/jpeg",
            upsert: false,
          }
        );

      if (subidaError) {
        throw new Error(
          "No fue posible guardar la fotografía del nuevo miembro."
        );
      }

      fotoMiembro =
        supabaseServer.storage
          .from("miembros-fotos")
          .getPublicUrl(rutaMiembro)
          .data.publicUrl;
    }

    // -------------------------------------------------------
    // 2. Crear miembro
    // -------------------------------------------------------

    const {
      data: miembro,
      error: miembroError,
    } = await supabaseServer
      .from("miembros")
      .insert({
        codigo: codigoMiembro,
        nombre: nombreCompleto,
        nivel,
        foto_url: fotoMiembro,
        fecha_nacimiento:
          candidato.fecha_nacimiento,
        profesion:
          candidato.profesion_oficio,
        bio: "",
        consejo: false,
      })
      .select("id")
      .single();

    if (miembroError || !miembro) {
      throw new Error(
        miembroError?.message ||
          "No fue posible crear el miembro."
      );
    }

    miembroId = miembro.id;

    // -------------------------------------------------------
    // 3. Crear usuario SIN contraseña
    // -------------------------------------------------------

    const {
      error: userError,
    } = await supabaseServer
      .from("users")
      .insert({
        codigo: codigoMiembro,

        /*
         * La cuenta queda creada, pero todavía no
         * puede utilizarse hasta que el académico
         * establezca personalmente su contraseña.
         */
        password: null,

        nivel,
        nombre: nombreCompleto,
        consejo: false,
		correo: candidato.correo,
      });

    if (userError) {
      throw new Error(
        userError.message
      );
    }

    usuarioCreado = true;

    // -------------------------------------------------------
    // 4. Inicializar progreso del ASP
    // -------------------------------------------------------

    if (nivel === "ASP") {
      const progresoInicial = {
        currentIndex: 0,
        completedIds: [],
        selectedAnswers: {},
        attemptCounts: {},
        lastWrongQuestionId: null,
        finished: false,
      };

      const {
        error: progresoError,
      } = await supabaseServer
        .from("progreso_aspirante")
        .upsert(
          {
            user_codigo:
              codigoMiembro,

            unidad_slug:
              "introductorio",

            completada: false,
            porcentaje: 0,

            respuestas:
              progresoInicial,

            fecha_actualizacion:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_codigo,unidad_slug",
          }
        );

      if (progresoError) {
        throw new Error(
          `No fue posible inicializar el progreso académico: ${progresoError.message}`
        );
      }
    }

    // -------------------------------------------------------
    // 5. Crear enlace seguro para contraseña
    // -------------------------------------------------------

    const tokenPasswordReal =
      randomBytes(32).toString("hex");

    const tokenPasswordHash =
      hashToken(tokenPasswordReal);

    const fechaToken =
      new Date();

    const fechaVencimientoToken =
      new Date();

    fechaVencimientoToken.setHours(
      fechaVencimientoToken.getHours() + 24
    );

    const {
      error: tokenPasswordError,
    } = await supabaseServer
      .from("password_tokens")
      .insert({
        codigo: codigoMiembro,

        /*
         * Nunca almacenamos el token real.
         * Supabase conserva solamente su SHA-256.
         */
        token: tokenPasswordHash,

        tipo: "crear",
        estado: "pendiente",

        fecha_creacion:
          fechaToken.toISOString(),

        fecha_vencimiento:
          fechaVencimientoToken.toISOString(),

        fecha_utilizacion: null,
      });

    if (tokenPasswordError) {
      throw new Error(
        tokenPasswordError.message
      );
    }

    tokenPasswordCreado = true;

    const enlaceCrearPassword =
      `${sitio}/crear-password?token=${encodeURIComponent(
        tokenPasswordReal
      )}`;

    // -------------------------------------------------------
    // 6. Aprobar candidatura
    // -------------------------------------------------------

    const ahora =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabaseServer
      .from("candidatos")
      .update({
        estado: "aprobada",
        nivel_asignado: nivel,
        miembro_id: miembroId,

        codigo_miembro_generado:
          codigoMiembro,

        observaciones_privadas:
          privadas || null,

        revisado_por_codigo:
          actorCodigo,

        fecha_revision: ahora,
        fecha_resolucion: ahora,

        token_correccion: null,
        token_correccion_expira: null,
      })
      .eq("id", candidato.id);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    // -------------------------------------------------------
    // 7. Historial
    // -------------------------------------------------------

    await registrarHistorial({
      candidatoId:
        candidato.id,

      codigo:
        candidato.codigo,

      accion:
        "candidatura_aprobada",

      estadoAnterior:
        candidato.estado,

      estadoNuevo:
        "aprobada",

      detalle:
        `Ingreso aprobado como ${nivel}. Código generado: ${codigoMiembro}.`,

      actorCodigo,

      visibleCandidato:
        true,
    });

    // -------------------------------------------------------
    // 8. Correo
    // -------------------------------------------------------

    const nombreNivel =
      nivel === "ASP"
        ? "Académico Aspirante"
        : "Académico Investigador";

    const textoProceso =
      nivel === "ASP"
        ? `
          <p>
            Al ingresar encontrará habilitado su
            proceso inicial de formación como
            Académico Aspirante.
          </p>
        `
        : `
          <p>
            Al ingresar encontrará habilitadas las
            funciones correspondientes a su nivel
            académico.
          </p>
        `;

    const correo =
      await enviarCorreo({
        para:
          candidato.correo,

        asunto:
          `Bienvenido(a) a la AGENN | ${codigoMiembro}`,

        html:
          plantillaCorreo(`
            <p>
              Estimado(a)
              <strong>${nombreCompleto}</strong>:
            </p>

            <p>
              Nos complace informarle que el Consejo
              Académico aprobó su ingreso a la Academia
              Guatemalteca de Estudios Numismáticos y
              Notafílicos.
            </p>

            <div
              style="
                background:#eef6e9;
                border-left:5px solid #4f7f3b;
                padding:16px;
                margin:22px 0;
                line-height:1.8;
              "
            >
              <strong>Nivel inicial:</strong>
              ${nombreNivel}<br>

              <strong>Código institucional:</strong>
              ${codigoMiembro}
            </div>

            <p>
              Para activar su acceso a la plataforma,
              deberá crear personalmente su contraseña
              mediante el siguiente enlace seguro:
            </p>

            <p
              style="
                text-align:center;
                margin:30px 0;
              "
            >
              <a
                href="${enlaceCrearPassword}"
                style="
                  display:inline-block;
                  background:#6b4f2a;
                  color:white;
                  padding:12px 20px;
                  border-radius:8px;
                  text-decoration:none;
                  font-weight:bold;
                "
              >
                Crear mi contraseña
              </a>
            </p>

            <p
              style="
                color:#666;
                font-size:14px;
                line-height:1.7;
              "
            >
              Por seguridad, este enlace es personal,
              puede utilizarse una sola vez y tendrá
              una vigencia de 24 horas.
            </p>

            ${textoProceso}

            <p>
              Una vez creada su contraseña podrá
              ingresar utilizando su código
              institucional:
              <strong>${codigoMiembro}</strong>.
            </p>

            <p>
              <strong>Consejo Académico</strong><br>
              Academia Guatemalteca de Estudios
              Numismáticos y Notafílicos
            </p>
          `),
      });

    // -------------------------------------------------------
    // 9. Registrar resultado del correo
    // -------------------------------------------------------

    await supabaseServer
      .from("candidatos")
      .update({
        ultimo_correo_enviado:
          correo.enviado
            ? new Date().toISOString()
            : null,

        ultimo_error_correo:
          correo.error || null,
      })
      .eq("id", candidato.id);

    // -------------------------------------------------------
    // 10. Respuesta al CA
    // -------------------------------------------------------

    return NextResponse.json({
      ok: true,

      codigoMiembro,

      /*
       * Ya NO devolvemos passwordTemporal.
       */

      requiereCrearPassword:
        true,

      fechaVencimientoPassword:
        fechaVencimientoToken.toISOString(),

      correo,
    });
  } catch (error) {
    // -------------------------------------------------------
    // Reversión
    // -------------------------------------------------------

    if (
      tokenPasswordCreado &&
      codigoMiembro
    ) {
      await supabaseServer
        .from("password_tokens")
        .delete()
        .eq(
          "codigo",
          codigoMiembro
        )
        .eq("tipo", "crear")
        .eq(
          "estado",
          "pendiente"
        );
    }

    /*
     * Si habíamos inicializado progreso ASP,
     * también debemos eliminarlo.
     */

    if (codigoMiembro) {
      await supabaseServer
        .from(
          "progreso_aspirante"
        )
        .delete()
        .eq(
          "user_codigo",
          codigoMiembro
        );
    }

    if (usuarioCreado) {
      await supabaseServer
        .from("users")
        .delete()
        .eq(
          "codigo",
          codigoMiembro
        );
    }

    if (miembroId) {
      await supabaseServer
        .from("miembros")
        .delete()
        .eq(
          "id",
          miembroId
        );
    }

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No fue posible aprobar la candidatura.",
      },
      { status: 500 }
    );
  }
}

  return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
}
