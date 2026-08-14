import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function obtenerConsejoActivo() {
  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,nombre,consejo")
    .eq("consejo", true);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

function nombreNivel(nivel: string) {
  if (nivel === "NUM") return "Académico Numerario";
  if (nivel === "INV") return "Académico Investigador";

  return nivel;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const asimilacionId = Number(body.asimilacionId);

    const consejeroCodigo = String(body.consejeroCodigo || "")
      .trim()
      .toUpperCase();

    const voto = String(body.voto || "")
      .trim()
      .toLowerCase();

    const comentario = String(body.comentario || "").trim();

    if (!asimilacionId || !consejeroCodigo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos para registrar el voto.",
        },
        { status: 400 }
      );
    }

    if (!["favor", "contra"].includes(voto)) {
      return NextResponse.json(
        {
          ok: false,
          error: "El voto indicado no es válido.",
        },
        { status: 400 }
      );
    }

    if (voto === "contra" && !comentario) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe indicar la razón del voto en contra.",
        },
        { status: 400 }
      );
    }

    const { data: consejero, error: consejeroError } =
      await supabaseServer
        .from("users")
        .select("codigo,nombre,consejo")
        .eq("codigo", consejeroCodigo)
        .maybeSingle();

    if (consejeroError || !consejero) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró al miembro del Consejo Académico.",
        },
        { status: 404 }
      );
    }

    const esConsejo =
      consejero.consejo === true ||
      consejero.consejo === "true" ||
      consejero.consejo === "TRUE" ||
      consejero.consejo === 1;

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
        .select("id,estado,nombre,nivel_propuesto")
        .eq("id", asimilacionId)
        .maybeSingle();

    if (propuestaError || !propuesta) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró la propuesta de asimilación.",
        },
        { status: 404 }
      );
    }

    if (propuesta.estado !== "pendiente") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta propuesta ya no se encuentra pendiente de votación.",
        },
        { status: 400 }
      );
    }

    const { data: votoExistente, error: votoExistenteError } =
      await supabaseServer
        .from("asimilaciones_votos")
        .select("id")
        .eq("asimilacion_id", asimilacionId)
        .eq("consejero_codigo", consejeroCodigo)
        .maybeSingle();

    if (votoExistenteError) {
      throw new Error(votoExistenteError.message);
    }

    if (votoExistente) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ya emitió su voto en esta propuesta.",
        },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabaseServer
      .from("asimilaciones_votos")
      .insert({
        asimilacion_id: asimilacionId,
        consejero_codigo: consejeroCodigo,
        voto,
        comentario: voto === "contra" ? comentario : null,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const consejo = await obtenerConsejoActivo();

    const { data: votos, error: votosError } =
      await supabaseServer
        .from("asimilaciones_votos")
        .select("voto")
        .eq("asimilacion_id", asimilacionId);

    if (votosError) {
      throw new Error(votosError.message);
    }

    const totalConsejo = consejo.length;

    const votosEmitidos = votos?.length || 0;

    const votosFavor =
      votos?.filter((item) => item.voto === "favor").length || 0;

    const votosContra =
      votos?.filter((item) => item.voto === "contra").length || 0;

    let estado = "pendiente";
    let resultado: string | null = null;
    let fechaResolucion: string | null = null;

    if (
      totalConsejo > 0 &&
      votosEmitidos === totalConsejo
    ) {
      fechaResolucion = new Date().toISOString();

      const nivelTexto = nombreNivel(
        propuesta.nivel_propuesto
      );

      if (votosContra === 0) {
        estado = "aprobada";

        resultado =
          `El Consejo Académico, por unanimidad, resuelve aprobar ` +
          `la incorporación por asimilación de ${propuesta.nombre} ` +
          `al nivel de ${nivelTexto}.`;
      } else {
        estado = "rechazada";

        resultado =
          `El Consejo Académico no alcanzó la unanimidad requerida ` +
          `para aprobar la incorporación por asimilación de ` +
          `${propuesta.nombre} al nivel de ${nivelTexto}.`;
      }
    }

    const { error: updateError } = await supabaseServer
      .from("asimilaciones")
      .update({
        votos_favor: votosFavor,
        votos_contra: votosContra,
        votos_emitidos: votosEmitidos,
        estado,
        resultado,
        fecha_resolucion: fechaResolucion,
      })
      .eq("id", asimilacionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      votosFavor,
      votosContra,
      votosEmitidos,
      totalConsejo,
      estado,
      resultado,
    });
  } catch (error) {
    console.error(
      "Error en /api/asimilaciones/votar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible registrar el voto.",
      },
      { status: 500 }
    );
  }
}