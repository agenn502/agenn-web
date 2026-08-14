import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

import {
  esNivelCertificable,
  esOrigenCertificable,
  obtenerTextoCertificado,
} from "@/lib/certificados";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      registro: string;
    }>;
  }
) {
  try {
    const { registro: registroParam } =
      await context.params;

    const registro = String(
      registroParam || ""
    )
      .trim()
      .toUpperCase();

    if (!registro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se indicó el registro del certificado.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 1. Buscar certificado
    // -------------------------------------------------------

    const {
      data: certificado,
      error: certificadoError,
    } = await supabaseServer
      .from("certificados")
      .select(
        `
        id,
        registro,
        codigo_miembro,
        nombre,
        nivel,
        origen_acreditacion,
        fecha_emision,
        estado,
        created_at
        `
      )
      .eq("registro", registro)
      .maybeSingle();

    if (certificadoError) {
      throw new Error(
        certificadoError.message
      );
    }

    if (!certificado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró un certificado con ese registro.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 2. Validar datos históricos del certificado
    // -------------------------------------------------------

    const nivel = String(
      certificado.nivel || ""
    )
      .trim()
      .toUpperCase();

    const origen = String(
      certificado.origen_acreditacion || ""
    )
      .trim()
      .toUpperCase();

    if (!esNivelCertificable(nivel)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El certificado contiene un nivel no reconocido.",
        },
        { status: 500 }
      );
    }

    if (!esOrigenCertificable(origen)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El certificado contiene un origen de acreditación no reconocido.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // 3. Obtener texto institucional
    // -------------------------------------------------------

    const texto =
      obtenerTextoCertificado(
        nivel,
        origen
      );

    // -------------------------------------------------------
    // 4. Determinar si el solicitante es el propietario
    //    del certificado
    // -------------------------------------------------------

    const codigoSolicitante = String(
      request.headers.get(
        "x-user-codigo"
      ) || ""
    )
      .trim()
      .toUpperCase();

    const esPropietario =
      !!codigoSolicitante &&
      codigoSolicitante ===
        String(
          certificado.codigo_miembro || ""
        )
          .trim()
          .toUpperCase();

    // -------------------------------------------------------
    // 5. Respuesta
    // -------------------------------------------------------

    return NextResponse.json({
      ok: true,

      certificado: {
        id: certificado.id,

        registro:
          certificado.registro,

        codigoMiembro:
          certificado.codigo_miembro,

        nombre:
          certificado.nombre,

        nivel,

        origenAcreditacion:
          origen,

        fechaEmision:
          certificado.fecha_emision,

        estado:
          certificado.estado,

        createdAt:
          certificado.created_at,

        texto,

        /*
         * La página visual siempre buscará esta ruta.
         *
         * Si certificado.png todavía no existe,
         * la página simplemente dibujará el documento
         * sobre fondo blanco.
         */
        plantilla:
          "/plantillas/certificado.png",

        esPropietario,
      },
    });
  } catch (error) {
    console.error(
      "Error en /api/certificados/[registro]:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el certificado.",
      },
      { status: 500 }
    );
  }
}