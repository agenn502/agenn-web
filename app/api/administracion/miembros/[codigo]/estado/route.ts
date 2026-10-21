
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { obtenerSesion } from "@/lib/authSession";

// ---------------------------------------------------------
// Obtener administrador desde una sesión verificada
// ---------------------------------------------------------

async function obtenerAdministrador(): Promise<string | null> {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return null;
  }

  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,administrador,estado_miembro")
    .eq("codigo", sesion.codigo)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const esAdministrador =
    data.administrador === true ||
    data.administrador === "true" ||
    data.administrador === "TRUE" ||
    data.administrador === 1;

  const estadoMiembro = String(
    data.estado_miembro || ""
  )
    .trim()
    .toUpperCase();

  if (!esAdministrador || estadoMiembro !== "ACTIVO") {
    return null;
  }

  return String(data.codigo || "")
    .trim()
    .toUpperCase();
}

// ---------------------------------------------------------
// Cambiar estado institucional de un miembro
// ---------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{ codigo: string }>;
  }
) {
  try {
    const administrador = await obtenerAdministrador();

    if (!administrador) {
      return NextResponse.json(
        {
          ok: false,
          error: "Acceso no autorizado.",
        },
        { status: 403 }
      );
    }

    const { codigo } = await context.params;

    const miembroCodigo = String(codigo || "")
      .trim()
      .toUpperCase();

    const body = await req.json();

    const estadoNuevo = String(body?.estado || "")
      .trim()
      .toUpperCase();

    const motivo = String(body?.motivo || "").trim();

    const estadosPermitidos = [
      "ACTIVO",
      "SUSPENDIDO",
      "RETIRADO",
      "EXPULSADO",
    ];

    if (!miembroCodigo) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se indicó el miembro.",
        },
        { status: 400 }
      );
    }

    if (!estadosPermitidos.includes(estadoNuevo)) {
      return NextResponse.json(
        {
          ok: false,
          error: "El estado solicitado no es válido.",
        },
        { status: 400 }
      );
    }

    if (!motivo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe indicar el motivo del cambio.",
        },
        { status: 400 }
      );
    }

    // El administrador no puede modificar su propio estado.
    if (miembroCodigo === administrador) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No puede modificar su propio estado desde Administración.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // Ejecutar cambio de estado y registrar responsable
    // -------------------------------------------------------

    const { error } = await supabaseServer.rpc(
      "cambiar_estado_miembro",
      {
        p_miembro_codigo: miembroCodigo,
        p_estado_nuevo: estadoNuevo,
        p_motivo: motivo,
        p_realizado_por: administrador,
      }
    );

    if (error) {
      console.error(
        "Error cambiando estado del miembro:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            error.message ||
            "No se pudo cambiar el estado del miembro.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      codigo: miembroCodigo,
      estado_miembro: estadoNuevo,
    });
  } catch (err) {
    console.error(
      "Error inesperado cambiando estado del miembro:",
      err
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Ocurrió un error inesperado al cambiar el estado.",
      },
      { status: 500 }
    );
  }
}
