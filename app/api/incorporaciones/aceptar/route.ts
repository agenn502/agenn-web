import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "La invitación no contiene un token válido.",
        },
        { status: 400 }
      );
    }

    const { data: invitacion, error: invitacionError } =
      await supabaseServer
        .from("incorporaciones_invitaciones")
        .select(
          `
          id,
          asimilacion_id,
          correo,
          estado,
          fecha_creacion,
          fecha_vencimiento,
          fecha_aceptacion,
          fecha_utilizacion
          `
        )
        .eq("token", token)
        .maybeSingle();

    if (invitacionError) {
      throw new Error(invitacionError.message);
    }

    if (!invitacion) {
      return NextResponse.json(
        {
          ok: false,
          error: "La invitación no existe o el enlace no es válido.",
        },
        { status: 404 }
      );
    }

    const vencimiento = new Date(invitacion.fecha_vencimiento);
    const ahora = new Date();

    if (vencimiento.getTime() < ahora.getTime()) {
      if (invitacion.estado === "pendiente") {
        await supabaseServer
          .from("incorporaciones_invitaciones")
          .update({
            estado: "vencida",
          })
          .eq("id", invitacion.id);
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Esta invitación ha vencido.",
          estado: "vencida",
        },
        { status: 410 }
      );
    }

    if (
      invitacion.estado !== "pendiente" &&
      invitacion.estado !== "aceptada" &&
      invitacion.estado !== "utilizada"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Esta invitación ya no está disponible.",
          estado: invitacion.estado,
        },
        { status: 400 }
      );
    }

    const { data: propuesta, error: propuestaError } =
      await supabaseServer
        .from("asimilaciones")
        .select(
          `
          id,
          nombre,
          sexo,
          correo,
          telefono,
          nivel_propuesto,
          modalidad_incorporacion,
          estado,
          resultado,
          fecha_resolucion,
          fecha_envio_invitacion,
          fecha_aceptacion,
          fecha_incorporacion,
          codigo_asignado
          `
        )
        .eq("id", invitacion.asimilacion_id)
        .maybeSingle();

    if (propuestaError) {
      throw new Error(propuestaError.message);
    }

    if (!propuesta) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró la incorporación asociada a esta invitación.",
        },
        { status: 404 }
      );
    }

    const modalidadNombre =
      nombreModalidad(propuesta.modalidad_incorporacion) ||
      nombreNivel(propuesta.nivel_propuesto);

    return NextResponse.json({
      ok: true,

      invitacion: {
        id: invitacion.id,
        estado: invitacion.estado,
        correo: invitacion.correo,
        fechaVencimiento: invitacion.fecha_vencimiento,
        fechaAceptacion: invitacion.fecha_aceptacion,
        fechaUtilizacion: invitacion.fecha_utilizacion,
      },

      incorporacion: {
        id: propuesta.id,
        nombre: propuesta.nombre,
        sexo: propuesta.sexo,
        correo: propuesta.correo,
        telefono: propuesta.telefono,

        nivel: propuesta.nivel_propuesto,
        nivelNombre: nombreNivel(propuesta.nivel_propuesto),

        modalidad: propuesta.modalidad_incorporacion,
        modalidadNombre,

        estado: propuesta.estado,
        resultado: propuesta.resultado,

        fechaResolucion: propuesta.fecha_resolucion,
        fechaEnvioInvitacion: propuesta.fecha_envio_invitacion,
        fechaAceptacion: propuesta.fecha_aceptacion,
        fechaIncorporacion: propuesta.fecha_incorporacion,

        codigoAsignado: propuesta.codigo_asignado,
      },
    });
  } catch (error) {
    console.error(
      "Error GET /api/incorporaciones/aceptar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible validar la invitación.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const token = String(body.token || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "La invitación no contiene un token válido.",
        },
        { status: 400 }
      );
    }

    const { data: invitacion, error: invitacionError } =
      await supabaseServer
        .from("incorporaciones_invitaciones")
        .select(
          `
          id,
          asimilacion_id,
          estado,
          fecha_vencimiento,
          fecha_aceptacion
          `
        )
        .eq("token", token)
        .maybeSingle();

    if (invitacionError) {
      throw new Error(invitacionError.message);
    }

    if (!invitacion) {
      return NextResponse.json(
        {
          ok: false,
          error: "La invitación no existe o el enlace no es válido.",
        },
        { status: 404 }
      );
    }

    const vencimiento = new Date(invitacion.fecha_vencimiento);
    const ahora = new Date();

    if (vencimiento.getTime() < ahora.getTime()) {
      await supabaseServer
        .from("incorporaciones_invitaciones")
        .update({
          estado: "vencida",
        })
        .eq("id", invitacion.id);

      return NextResponse.json(
        {
          ok: false,
          error: "Esta invitación ha vencido.",
        },
        { status: 410 }
      );
    }

    if (invitacion.estado === "aceptada") {
      return NextResponse.json({
        ok: true,
        mensaje: "La invitación ya había sido aceptada.",
        yaAceptada: true,
      });
    }

    if (invitacion.estado === "utilizada") {
      return NextResponse.json({
        ok: true,
        mensaje:
          "Esta invitación ya fue utilizada para completar la incorporación.",
        yaUtilizada: true,
      });
    }

    if (invitacion.estado !== "pendiente") {
      return NextResponse.json(
        {
          ok: false,
          error: "Esta invitación ya no puede ser aceptada.",
        },
        { status: 400 }
      );
    }

    const fechaAceptacion = new Date().toISOString();

    const { error: actualizarInvitacionError } =
      await supabaseServer
        .from("incorporaciones_invitaciones")
        .update({
          estado: "aceptada",
          fecha_aceptacion: fechaAceptacion,
        })
        .eq("id", invitacion.id);

    if (actualizarInvitacionError) {
      throw new Error(actualizarInvitacionError.message);
    }

    const { error: actualizarPropuestaError } =
      await supabaseServer
        .from("asimilaciones")
        .update({
          estado: "aceptada",
          fecha_aceptacion: fechaAceptacion,
        })
        .eq("id", invitacion.asimilacion_id);

    if (actualizarPropuestaError) {
      throw new Error(actualizarPropuestaError.message);
    }

    return NextResponse.json({
      ok: true,
      mensaje: "La invitación fue aceptada correctamente.",
      fechaAceptacion,
    });
  } catch (error) {
    console.error(
      "Error POST /api/incorporaciones/aceptar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible aceptar la invitación.",
      },
      { status: 500 }
    );
  }
}