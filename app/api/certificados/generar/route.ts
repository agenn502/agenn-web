import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

import {
  esNivelCertificable,
  esOrigenCertificable,
  formatearCorrelativoCertificado,
  obtenerTextoCertificado,
  prefijoRegistroCertificado,
} from "@/lib/certificados";


function textoPromocionExtraordinaria(nivel: string) {
  const nombreNivel = nivel === "NUM" ? "Académico Numerario" : "Académico Investigador";
  return {
    nivel,
    origen: "PROMOCION_EXTRAORDINARIA",
    nombreNivel,
    institucion: ["Academia Guatemalteca de Estudios Numismáticos y Notafílicos", "AGENN"],
    autoridad: "El Consejo Académico, reunido en pleno",
    otorgamiento: "resuelve conferir a",
    textoAntesNivel: "mediante Promoción Extraordinaria el nivel de",
    justificacion: ["por considerar que cumple con los requisitos académicos y de trayectoria", "necesarios para ascender a este nivel dentro de la Academia"],
    leyendaOrigen: "Acreditación conferida por Promoción Extraordinaria",
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const codigo = String(
      body.codigo || ""
    )
      .trim()
      .toUpperCase();

    const nivel = String(
      body.nivel || ""
    )
      .trim()
      .toUpperCase();

    const origen = String(
      body.origen_acreditacion || ""
    )
      .trim()
      .toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe indicarse el código del miembro.",
        },
        { status: 400 }
      );
    }

    if (!esNivelCertificable(nivel)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El nivel indicado no admite certificado.",
        },
        { status: 400 }
      );
    }

    if (origen !== "PROMOCION_EXTRAORDINARIA" && !esOrigenCertificable(origen)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El origen de la acreditación no es válido.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 1. Obtener expediente actual del miembro
    // -------------------------------------------------------

    const {
      data: miembro,
      error: miembroError,
    } = await supabaseServer
      .from("miembros")
      .select(
        `
        codigo,
        nombre,
        nivel,
        estado_academico,
        origen_acreditacion
        `
      )
      .eq("codigo", codigo)
      .maybeSingle();

    if (miembroError) {
      throw new Error(
        miembroError.message
      );
    }

    if (!miembro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró el expediente del miembro.",
        },
        { status: 404 }
      );
    }

    const nombre = String(
      miembro.nombre || ""
    ).trim();

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El expediente no contiene el nombre del miembro.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // 2. Validaciones académicas
    // -------------------------------------------------------

    /*
     * Para INV exigimos que actualmente figure
     * como ACREDITADO.
     *
     * Esto protege tanto:
     *
     * FORMACION
     * como
     * RECONOCIMIENTO.
     */

    if (nivel === "INV") {
      const estadoAcademico = String(
        miembro.estado_academico || ""
      )
        .trim()
        .toUpperCase();

      if (
        estadoAcademico !== "ACREDITADO"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El miembro todavía no se encuentra acreditado como Académico Investigador.",
          },
          { status: 409 }
        );
      }

      const origenExpediente = String(
        miembro.origen_acreditacion || ""
      )
        .trim()
        .toUpperCase();

      if (
        origenExpediente &&
        origenExpediente !== origen
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El origen de acreditación no coincide con el expediente académico.",
          },
          { status: 409 }
        );
      }
    }

    /*
     * NOV únicamente se certifica por FORMACIÓN.
     *
     * El certificado NOV puede emitirse inmediatamente
     * después del ascenso a INV; por ello no exigimos que
     * el nivel actual del expediente continúe siendo NOV.
     */
    if (
      nivel === "NOV" &&
      origen !== "FORMACION"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El certificado del Nivel Novicio únicamente se emite por formación.",
        },
        { status: 409 }
      );
    }

    /*
     * Para NUM dejamos preparada la arquitectura
     * para sus validaciones particulares.
     */

    // -------------------------------------------------------
    // 3. Evitar duplicados
    // -------------------------------------------------------

    const {
      data: certificadoExistente,
      error: existenteError,
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
        plantilla_id
        `
      )
      .eq("codigo_miembro", codigo)
      .eq("nivel", nivel)
      .eq("origen_acreditacion", origen)
      .eq("estado", "vigente")
      .maybeSingle();

    if (existenteError) {
      throw new Error(
        existenteError.message
      );
    }

    /*
     * Si ya existe, NO generamos otro.
     *
     * El certificado institucional es único para
     * esa acreditación.
     */
    if (certificadoExistente) {
      const { data: plantillaExistente, error: plantillaExistenteError } =
        await supabaseServer
          .from("certificado_plantillas")
          .select("id,nombre,archivo")
          .eq("id", certificadoExistente.plantilla_id)
          .single();

      if (plantillaExistenteError || !plantillaExistente) {
        throw new Error(
          plantillaExistenteError?.message ||
            "No se encontró la plantilla histórica asociada al certificado."
        );
      }

      const textoExistente =
        origen === "PROMOCION_EXTRAORDINARIA"
          ? textoPromocionExtraordinaria(nivel)
          : obtenerTextoCertificado(nivel, origen);

      return NextResponse.json({
        ok: true,
        yaExistia: true,
        certificado: {
          ...certificadoExistente,
          texto: textoExistente,
          plantilla: plantillaExistente.archivo,
          plantillaNombre: plantillaExistente.nombre,
        },
      });
    }

    // -------------------------------------------------------
    // 4. Generar registro permanente
    // -------------------------------------------------------

    const fechaEmision = new Date();

    const prefijo =
      prefijoRegistroCertificado(
        nivel,
        fechaEmision
      );

    /*
     * Buscamos todos los registros de este
     * nivel/año para encontrar el mayor
     * correlativo existente.
     */

    const {
      data: registrosExistentes,
      error: registrosError,
    } = await supabaseServer
      .from("certificados")
      .select("registro")
      .like(
        "registro",
        `${prefijo}%`
      );

    if (registrosError) {
      throw new Error(
        registrosError.message
      );
    }

    let mayorCorrelativo = 0;

    for (
      const fila of
      registrosExistentes || []
    ) {
      const registro = String(
        fila.registro || ""
      );

      if (
        !registro.startsWith(prefijo)
      ) {
        continue;
      }

      const parteNumerica =
        registro.substring(
          prefijo.length
        );

      const numero =
        Number(parteNumerica);

      if (
        Number.isInteger(numero) &&
        numero > mayorCorrelativo
      ) {
        mayorCorrelativo = numero;
      }
    }

    const siguienteCorrelativo =
      mayorCorrelativo + 1;

    const registro =
      `${prefijo}${formatearCorrelativoCertificado(
        siguienteCorrelativo
      )}`;

    // -------------------------------------------------------
    // 5. Fijar la plantilla histórica vigente
    // -------------------------------------------------------

    const { data: plantillaVigente, error: plantillaError } =
      await supabaseServer
        .from("certificado_plantillas")
        .select("id,nombre,archivo")
        .eq("activa", true)
        .order("vigente_desde", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (plantillaError) {
      throw new Error(plantillaError.message);
    }

    if (!plantillaVigente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No existe una plantilla de certificados activa. Active una plantilla antes de emitir el certificado.",
        },
        { status: 409 }
      );
    }

    // Desde este momento el certificado queda casado permanentemente
    // con esta versión de la plantilla, aunque cambie el Consejo Académico.

    // -------------------------------------------------------
    // 6. Crear certificado
    // -------------------------------------------------------

    const {
      data: certificado,
      error: certificadoError,
    } = await supabaseServer
      .from("certificados")
      .insert({
        registro,

        codigo_miembro: codigo,

        /*
         * Guardamos el nombre en el propio
         * certificado.
         *
         * Si la persona cambia posteriormente su
         * nombre en miembros, este documento
         * conserva el dato con el que fue emitido.
         */
        nombre,

        nivel,

        origen_acreditacion:
          origen,

        fecha_emision:
          fechaEmision.toISOString(),

        estado: "vigente",

        plantilla_id: plantillaVigente.id,
      })
      .select(
        `
        id,
        registro,
        codigo_miembro,
        nombre,
        nivel,
        origen_acreditacion,
        fecha_emision,
        estado
        `
      )
      .single();

    if (certificadoError) {
      /*
       * Si excepcionalmente dos procesos intentan
       * generar el mismo correlativo al mismo
       * tiempo, la restricción UNIQUE de registro
       * impedirá duplicarlo.
       */
      if (
        certificadoError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El registro del certificado coincidió con otra emisión simultánea. Intente nuevamente.",
          },
          { status: 409 }
        );
      }

      throw new Error(
        certificadoError.message
      );
    }

    // -------------------------------------------------------
    // 7. Obtener texto institucional
    // -------------------------------------------------------

    const texto =
      origen === "PROMOCION_EXTRAORDINARIA"
        ? textoPromocionExtraordinaria(nivel)
        : obtenerTextoCertificado(nivel, origen);

    // -------------------------------------------------------
    // 8. Respuesta
    // -------------------------------------------------------

    return NextResponse.json({
      ok: true,
      yaExistia: false,

      certificado: {
        ...certificado,

        texto,

        plantilla: plantillaVigente.archivo,
        plantillaNombre: plantillaVigente.nombre,
      },
    });
  } catch (error) {
    console.error(
      "Error en /api/certificados/generar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible generar el certificado.",
      },
      { status: 500 }
    );
  }
}