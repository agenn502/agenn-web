import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const codigo = String(
      request.headers.get("x-user-codigo") || ""
    )
      .trim()
      .toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        {
          ok: false,
          error: "No fue posible identificar al usuario.",
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------------
    // 1. Verificar que el usuario exista
    // -------------------------------------------------------

    const { data: usuario, error: usuarioError } =
      await supabaseServer
        .from("users")
        .select("codigo,nombre,nivel,consejo")
        .eq("codigo", codigo)
        .maybeSingle();

    if (usuarioError) {
      throw new Error(usuarioError.message);
    }

    if (!usuario) {
      return NextResponse.json(
        {
          ok: false,
          error: "Usuario no encontrado.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 2. Buscar certificados vigentes del miembro
    // -------------------------------------------------------

    const { data: certificados, error: certificadosError } =
      await supabaseServer
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
        .eq("codigo_miembro", codigo)
        .eq("estado", "vigente")
        .order("fecha_emision", {
          ascending: false,
        });

    if (certificadosError) {
      throw new Error(certificadosError.message);
    }

    return NextResponse.json({
      ok: true,

      usuario: {
        codigo: usuario.codigo,
        nombre: usuario.nombre,
        nivel: usuario.nivel,
      },

      certificados: certificados || [],
    });
  } catch (error) {
    console.error(
      "Error en /api/certificados:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar los certificados.",
      },
      { status: 500 }
    );
  }
}