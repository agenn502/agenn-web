import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ModalidadIncorporacion =
  | "INV_FORMACION"
  | "INV_ACREDITADO"
  | "NUM";

type Sexo = "M" | "F";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      nombre,
      correo,
      telefono,
      sexo,
      nivelPropuesto,
      modalidadIncorporacion,
      justificacion,
      proponenteCodigo,
    } = body;

    if (
      !nombre ||
      !sexo ||
      !nivelPropuesto ||
      !modalidadIncorporacion ||
      !justificacion ||
      !proponenteCodigo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos obligatorios.",
        },
        { status: 400 }
      );
    }

    const sexoNormalizado = String(sexo)
      .trim()
      .toUpperCase() as Sexo;

    if (!["M", "F"].includes(sexoNormalizado)) {
      return NextResponse.json(
        {
          ok: false,
          error: "El sexo indicado no es válido.",
        },
        { status: 400 }
      );
    }

    const modalidad = String(
      modalidadIncorporacion
    ).trim() as ModalidadIncorporacion;

    if (
      ![
        "INV_FORMACION",
        "INV_ACREDITADO",
        "NUM",
      ].includes(modalidad)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La modalidad de incorporación indicada no es válida.",
        },
        { status: 400 }
      );
    }

    const nivelEsperado =
      modalidad === "NUM" ? "NUM" : "INV";

    if (nivelPropuesto !== nivelEsperado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El nivel propuesto no coincide con la modalidad de incorporación.",
        },
        { status: 400 }
      );
    }

    const codigoProponente = String(
      proponenteCodigo
    )
      .trim()
      .toUpperCase();

    const { data: proponente, error: proponenteError } =
      await supabaseServer
        .from("users")
        .select("codigo,consejo")
        .eq("codigo", codigoProponente)
        .maybeSingle();

    if (proponenteError || !proponente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No fue posible identificar al miembro proponente.",
        },
        { status: 404 }
      );
    }

    const esConsejo =
      proponente.consejo === true ||
      proponente.consejo === "true" ||
      proponente.consejo === "TRUE" ||
      proponente.consejo === 1;

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

    const { error } = await supabaseServer
      .from("asimilaciones")
      .insert({
        nombre: String(nombre).trim(),

        sexo: sexoNormalizado,

        correo: correo
          ? String(correo).trim().toLowerCase()
          : null,

        telefono: telefono
          ? String(telefono).trim()
          : null,

        nivel_propuesto: nivelEsperado,

        modalidad_incorporacion: modalidad,

        justificacion: String(
          justificacion
        ).trim(),

        proponente_codigo: codigoProponente,
      });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "La propuesta de incorporación fue registrada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error en /api/asimilaciones/nueva:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado.",
      },
      { status: 500 }
    );
  }
}