import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const asimilacionId = Number(body.asimilacionId);
    const correo = String(body.correo || "")
      .trim()
      .toLowerCase();

    const usuarioCodigo = String(body.usuarioCodigo || "")
      .trim()
      .toUpperCase();

    if (!asimilacionId || !correo || !usuarioCodigo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos para registrar el correo.",
        },
        { status: 400 }
      );
    }

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!correoValido) {
      return NextResponse.json(
        {
          ok: false,
          error: "El correo electrónico no tiene un formato válido.",
        },
        { status: 400 }
      );
    }

    const { data: usuario, error: usuarioError } =
      await supabaseServer
        .from("users")
        .select("codigo,consejo")
        .eq("codigo", usuarioCodigo)
        .maybeSingle();

    if (usuarioError || !usuario) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró al usuario.",
        },
        { status: 404 }
      );
    }

    const esConsejo =
      usuario.consejo === true ||
      usuario.consejo === "true" ||
      usuario.consejo === "TRUE" ||
      usuario.consejo === 1;

    if (!esConsejo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Esta acción es exclusiva del Consejo Académico.",
        },
        { status: 403 }
      );
    }

    const { data: propuesta, error: propuestaError } =
      await supabaseServer
        .from("asimilaciones")
        .select("id,estado")
        .eq("id", asimilacionId)
        .maybeSingle();

    if (propuestaError || !propuesta) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró la propuesta de incorporación.",
        },
        { status: 404 }
      );
    }

    if (
      propuesta.estado !== "aprobada" &&
      propuesta.estado !== "invitacion_enviada"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El correo solo puede registrarse en una incorporación aprobada.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseServer
      .from("asimilaciones")
      .update({
        correo,
      })
      .eq("id", asimilacionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      correo,
    });
  } catch (error) {
    console.error(
      "Error en /api/asimilaciones/correo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible registrar el correo.",
      },
      { status: 500 }
    );
  }
}