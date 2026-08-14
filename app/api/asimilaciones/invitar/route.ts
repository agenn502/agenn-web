import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";
import { randomUUID } from "crypto";

function nombreNivel(nivel: string) {
  if (nivel === "INV") return "Académico Investigador";
  if (nivel === "NUM") return "Académico Numerario";
  return nivel;
}

function nombreModalidad(modalidad: string | null) {
  if (modalidad === "INV_FORMACION") {
    return "Académico Investigador — en formación";
  }

  if (modalidad === "INV_ACREDITADO") {
    return "Académico Investigador acreditado";
  }

  if (modalidad === "NUM") {
    return "Académico Numerario";
  }

  return "";
}

function textoModalidad(modalidad: string | null) {
  if (modalidad === "INV_FORMACION") {
    return `
      <p>
        Su incorporación será realizada directamente al
        <strong>Nivel Investigador</strong>. A partir de su ingreso
        tendrá acceso al proceso de formación y acreditación
        correspondiente a este nivel.
      </p>

      <p>
        Este reconocimiento le permite omitir las etapas académicas
        anteriores, manteniéndose el proceso formativo establecido
        para alcanzar la acreditación como Académico Investigador.
      </p>
    `;
  }

  if (modalidad === "INV_ACREDITADO") {
    return `
      <p>
        El Consejo Académico ha considerado que su trayectoria,
        experiencia y conocimientos son equivalentes a los
        resultados académicos esperados del proceso de formación
        del Nivel Investigador.
      </p>

      <p>
        Por esta razón, su incorporación se realizará directamente
        como <strong>Académico Investigador acreditado</strong>,
        sin necesidad de cursar el proceso formativo correspondiente.
      </p>

      <p>
        Una vez completada su incorporación tendrá derecho al
        certificado que le acredita como Académico Investigador y,
        si así lo desea, podrá posteriormente iniciar el proceso
        establecido para optar al nivel de Académico Numerario.
      </p>
    `;
  }

  if (modalidad === "NUM") {
    return `
      <p>
        El Consejo Académico ha considerado que su trayectoria y
        producción académica satisfacen los requisitos establecidos
        para la incorporación al nivel superior de la Academia.
      </p>

      <p>
        Por esta razón, su incorporación se realizará directamente
        como <strong>Académico Numerario</strong>, en reconocimiento
        a sus méritos y aportes académicos.
      </p>
    `;
  }

  return `
    <p>
      Esta invitación constituye un reconocimiento académico a su
      trayectoria y méritos.
    </p>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const asimilacionId = Number(body.asimilacionId);

    const enviadoPor = String(body.enviadoPor || "")
      .trim()
      .toUpperCase();

    if (!asimilacionId || !enviadoPor) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos para enviar la invitación.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 1. Verificar que quien envía pertenece al Consejo
    // ---------------------------------------------------------

    const { data: consejero, error: consejeroError } =
      await supabaseServer
        .from("users")
        .select("codigo,nombre,consejo")
        .eq("codigo", enviadoPor)
        .maybeSingle();

    if (consejeroError || !consejero) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró al miembro del Consejo Académico.",
        },
        { status: 404 }
      );
    }

    const esConsejo =
      consejero.consejo === true ||
      consejero.consejo === "true" ||
      consejero.consejo === "TRUE" ||
      consejero.consejo === 1;

    if (!esConsejo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta acción es exclusiva del Consejo Académico.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 2. Obtener propuesta aprobada
    // ---------------------------------------------------------

    const { data: propuesta, error: propuestaError } =
      await supabaseServer
        .from("asimilaciones")
        .select(
          `
          id,
          nombre,
          sexo,
          correo,
          nivel_propuesto,
          modalidad_incorporacion,
          estado,
          resultado,
          fecha_resolucion,
          fecha_envio_invitacion
          `
        )
        .eq("id", asimilacionId)
        .maybeSingle();

    if (propuestaError || !propuesta) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró la propuesta de incorporación.",
        },
        { status: 404 }
      );
    }

    if (propuesta.estado !== "aprobada") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La invitación solo puede enviarse después de que la incorporación haya sido aprobada por unanimidad.",
        },
        { status: 400 }
      );
    }

    if (!propuesta.correo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La propuesta no tiene un correo electrónico registrado para la persona invitada.",
          requiereCorreo: true,
        },
        { status: 400 }
      );
    }

    if (propuesta.fecha_envio_invitacion) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La invitación institucional ya fue enviada.",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // 3. Comprobar que no exista invitación previa
    // ---------------------------------------------------------

    const {
      data: invitacionExistente,
      error: invitacionExistenteError,
    } = await supabaseServer
      .from("incorporaciones_invitaciones")
      .select("id,estado")
      .eq("asimilacion_id", asimilacionId)
      .maybeSingle();

    if (invitacionExistenteError) {
      throw new Error(invitacionExistenteError.message);
    }

    if (invitacionExistente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe una invitación asociada a esta incorporación.",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // 4. Generar token seguro
    // ---------------------------------------------------------

    const token = randomUUID();

    const ahora = new Date();

    const vencimiento = new Date(ahora);
    vencimiento.setDate(vencimiento.getDate() + 30);

    // ---------------------------------------------------------
    // 5. Registrar invitación
    // ---------------------------------------------------------

    const { data: invitacion, error: invitacionError } =
      await supabaseServer
        .from("incorporaciones_invitaciones")
        .insert({
          asimilacion_id: asimilacionId,
          correo: propuesta.correo,
          token,
          estado: "pendiente",
          fecha_vencimiento: vencimiento.toISOString(),
        })
        .select("id")
        .single();

    if (invitacionError || !invitacion) {
      throw new Error(
        invitacionError?.message ||
          "No fue posible registrar la invitación."
      );
    }

    // ---------------------------------------------------------
    // 6. Preparar enlace y textos
    // ---------------------------------------------------------

    const sitio = process.env.NEXT_PUBLIC_SITE_URL;

		if (!sitio) {
		  throw new Error(
			"NEXT_PUBLIC_SITE_URL no está configurada."
		  );
		}

    const enlaceAceptacion =
      `${sitio}/incorporacion/aceptar?token=${encodeURIComponent(
        token
      )}`;

    const nivelTexto = nombreNivel(
      propuesta.nivel_propuesto
    );

    const modalidadTexto =
      nombreModalidad(propuesta.modalidad_incorporacion) ||
      nivelTexto;

    const tratamiento =
      propuesta.sexo === "F"
        ? "Estimada"
        : "Estimado";

    const contenidoModalidad =
      textoModalidad(propuesta.modalidad_incorporacion);

    // ---------------------------------------------------------
    // 7. Enviar correo institucional
    // ---------------------------------------------------------

    const correo = await enviarCorreo({
      para: propuesta.correo,

      asunto:
        `AGENN | Invitación de incorporación como ${modalidadTexto}`,

      html: plantillaCorreo(`
        <p>
          ${tratamiento} <strong>${propuesta.nombre}</strong>:
        </p>

        <p>
          El Consejo Académico de la Academia Guatemalteca de
          Estudios Numismáticos y Notafílicos —AGENN— ha
          considerado su trayectoria, experiencia y aportes al
          estudio, investigación o difusión de la numismática y
          disciplinas relacionadas.
        </p>

        <p>
          Como resultado de esta consideración, el Consejo
          Académico resolvió por unanimidad invitarle a
          incorporarse a la Academia en calidad de:
        </p>

        <div
          style="
            background:#eef6e9;
            border-left:5px solid #6b6f1a;
            padding:18px;
            margin:22px 0;
            text-align:center;
          "
        >
          <strong
            style="
              font-size:20px;
              color:#4d371c;
            "
          >
            ${modalidadTexto}
          </strong>
        </div>

        ${contenidoModalidad}

        <p>
          Si acepta formar parte de la Academia, le invitamos a
          utilizar el siguiente enlace para confirmar su
          incorporación y completar los datos necesarios para
          crear su expediente institucional.
        </p>

        <p style="text-align:center;margin:30px 0;">
          <a
            href="${enlaceAceptacion}"
            style="
              display:inline-block;
              background:#6b6f1a;
              color:white;
              text-decoration:none;
              padding:13px 22px;
              border-radius:8px;
              font-weight:bold;
            "
          >
            Aceptar invitación e incorporarme a la AGENN
          </a>
        </p>

        <p>
          Esta invitación permanecerá vigente durante
          <strong>30 días</strong> a partir de la fecha de envío.
        </p>

        <p>
          Será un honor contar con su participación y experiencia
          dentro de la comunidad académica de la AGENN.
        </p>

        <p>
          Atentamente,
        </p>

        <p>
          <strong>Consejo Académico</strong><br>
          Academia Guatemalteca de Estudios Numismáticos y
          Notafílicos
        </p>
      `),
    });

    // ---------------------------------------------------------
    // 8. Si el correo falló, eliminar invitación para permitir
    //    un nuevo intento
    // ---------------------------------------------------------

    if (!correo.enviado) {
      await supabaseServer
        .from("incorporaciones_invitaciones")
        .delete()
        .eq("id", invitacion.id);

      return NextResponse.json(
        {
          ok: false,
          error:
            correo.error ||
            "No fue posible enviar el correo institucional.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 9. Actualizar expediente
    // ---------------------------------------------------------

    const fechaEnvio = new Date().toISOString();

    const { error: actualizarError } =
      await supabaseServer
        .from("asimilaciones")
        .update({
          estado: "invitacion_enviada",
          fecha_envio_invitacion: fechaEnvio,
          invitacion_enviada_por: enviadoPor,
        })
        .eq("id", asimilacionId);

    if (actualizarError) {
      throw new Error(actualizarError.message);
    }

    // ---------------------------------------------------------
    // 10. Respuesta
    // ---------------------------------------------------------

    return NextResponse.json({
      ok: true,
      mensaje:
        "La invitación institucional fue enviada correctamente.",
      fechaEnvio,
    });
  } catch (error) {
    console.error(
      "Error en /api/asimilaciones/invitar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible enviar la invitación institucional.",
      },
      { status: 500 }
    );
  }
}