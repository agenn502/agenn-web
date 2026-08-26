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
    //
    // Un certificado conserva el código histórico con el que
    // se obtuvo el nivel. Por ejemplo:
    //
    // NOV0004 -> certificado NOV
    // INV0002 -> identidad actual
    //
    // Ambos códigos pueden pertenecer al mismo miembro.
    // -------------------------------------------------------

    const codigoSolicitante = String(
      request.headers.get(
        "x-user-codigo"
      ) || ""
    )
      .trim()
      .toUpperCase();

    const codigoCertificado = String(
      certificado.codigo_miembro || ""
    )
      .trim()
      .toUpperCase();

    let esPropietario = false;

    if (codigoSolicitante) {
      // Compatibilidad directa:
      // funciona para certificados cuyo código coincide
      // todavía con la identidad actual.
      if (
        codigoSolicitante ===
        codigoCertificado
      ) {
        esPropietario = true;
      } else {
        /*
         * Primero intentamos localizar ambos códigos en el
         * historial académico.
         */
        const [
          {
            data: historialSolicitante,
            error: historialSolicitanteError,
          },
          {
            data: historialCertificado,
            error: historialCertificadoError,
          },
        ] = await Promise.all([
          supabaseServer
            .from("historial_miembro")
            .select("miembro_id")
            .eq("codigo", codigoSolicitante)
            .maybeSingle(),

          supabaseServer
            .from("historial_miembro")
            .select("miembro_id")
            .eq("codigo", codigoCertificado)
            .maybeSingle(),
        ]);

        if (historialSolicitanteError) {
          throw new Error(
            historialSolicitanteError.message
          );
        }

        if (historialCertificadoError) {
          throw new Error(
            historialCertificadoError.message
          );
        }

        if (
          historialSolicitante &&
          historialCertificado &&
          historialSolicitante.miembro_id ===
            historialCertificado.miembro_id
        ) {
          esPropietario = true;
        } else {
          /*
           * Compatibilidad con expedientes anteriores a
           * historial_miembro.
           *
           * Si el código actual existe en miembros y el código
           * histórico del certificado ya está en el historial,
           * comparamos igualmente el miembro_id.
           */
          const [
            {
              data: miembroActual,
              error: miembroActualError,
            },
            {
              data: historialCodigoCertificado,
              error: historialCodigoCertificadoError,
            },
          ] = await Promise.all([
            supabaseServer
              .from("miembros")
              .select("id")
              .eq("codigo", codigoSolicitante)
              .maybeSingle(),

            supabaseServer
              .from("historial_miembro")
              .select("miembro_id")
              .eq("codigo", codigoCertificado)
              .maybeSingle(),
          ]);

          if (miembroActualError) {
            throw new Error(
              miembroActualError.message
            );
          }

          if (historialCodigoCertificadoError) {
            throw new Error(
              historialCodigoCertificadoError.message
            );
          }

          if (
            miembroActual &&
            historialCodigoCertificado &&
            miembroActual.id ===
              historialCodigoCertificado.miembro_id
          ) {
            esPropietario = true;
          }
        }
      }
    }

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