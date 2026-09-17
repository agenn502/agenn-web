import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarAdministrador(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) return false;

  const { data, error } = await supabaseServer
    .from("users")
    .select("administrador,estado_miembro")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return false;

  const administrador =
    data.administrador === true ||
    data.administrador === "true" ||
    data.administrador === "TRUE" ||
    data.administrador === 1;

  const estadoMiembro = String(
    data.estado_miembro || ""
  )
    .trim()
    .toUpperCase();

  return administrador && estadoMiembro === "ACTIVO";
}

export async function GET(req: NextRequest) {
  try {
    if (!(await validarAdministrador(req))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Acceso no autorizado.",
        },
        { status: 403 }
      );
    }

    const { data: miembros, error } = await supabaseServer
      .from("users")
      .select(
        "codigo,nombre,nivel,consejo,administrador,estado_miembro"
      )
      .order("nivel", { ascending: true })
      .order("codigo", { ascending: true });

    if (error) {
      console.error(
        "Error consultando miembros para administración:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo obtener el listado de miembros.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      miembros: miembros || [],
    });
  } catch (err) {
    console.error(
      "Error inesperado en /api/administracion/miembros:",
      err
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Ocurrió un error inesperado.",
      },
      { status: 500 }
    );
  }
}