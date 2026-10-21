
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { obtenerSesion } from "@/lib/authSession";

// ---------------------------------------------------------
// Validar identidad y permisos del administrador
// ---------------------------------------------------------

async function validarAdministrador(): Promise<boolean> {
  // La identidad proviene de la cookie firmada,
  // nunca de un código enviado por el navegador.
  const sesion = await obtenerSesion();

  if (!sesion) {
    return false;
  }

  const { data, error } = await supabaseServer
    .from("users")
    .select("administrador,estado_miembro")
    .eq("codigo", sesion.codigo)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

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

// ---------------------------------------------------------
// Obtener listado de miembros para administración
// ---------------------------------------------------------

export async function GET() {
  try {
    if (!(await validarAdministrador())) {
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
