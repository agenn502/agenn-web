import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const UNIDAD = "introductorio";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

async function validarAspirante(codigo: string) {
  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,nivel,nombre,consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;

  const esConsejo =
    data.consejo === true ||
    data.consejo === "true" ||
    data.consejo === "TRUE" ||
    data.consejo === 1;

  if (esConsejo) return data;
  if (String(data.nivel || "").toUpperCase() !== "ASP") return null;

  return data;
}

export async function GET(req: NextRequest) {
  try {
    const codigo = normalizarCodigo(
      req.nextUrl.searchParams.get("codigo")
    );

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "Falta el código del usuario." },
        { status: 400 }
      );
    }

    const usuario = await validarAspirante(codigo);

    if (!usuario) {
      return NextResponse.json(
        { ok: false, error: "Usuario no autorizado para este módulo." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseServer
      .from("progreso_aspirante")
      .select(
        "user_codigo,unidad_slug,completada,porcentaje,respuestas,fecha_actualizacion"
      )
      .eq("user_codigo", codigo)
      .eq("unidad_slug", UNIDAD)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      progreso: data || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el avance.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const codigo = normalizarCodigo(body.codigo);
    const payload = body.payload;

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "Falta el código del usuario." },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { ok: false, error: "El avance recibido no es válido." },
        { status: 400 }
      );
    }

    const usuario = await validarAspirante(codigo);

    if (!usuario) {
      return NextResponse.json(
        { ok: false, error: "Usuario no autorizado para este módulo." },
        { status: 403 }
      );
    }

    const completedIds = Array.isArray(payload.completedIds)
      ? payload.completedIds
          .map((id: unknown) => Number(id))
          .filter(
            (id: number) =>
              Number.isInteger(id) && id >= 1 && id <= 50
          )
      : [];

    const idsUnicos = Array.from(new Set(completedIds));

    const porcentaje = Math.min(
      100,
      Math.max(0, Math.round((idsUnicos.length / 50) * 100))
    );

    const finalizado =
      payload.finished === true &&
      idsUnicos.length === 50 &&
      porcentaje === 100;

    const payloadSeguro = {
      currentIndex: Number.isInteger(Number(payload.currentIndex))
        ? Math.min(49, Math.max(0, Number(payload.currentIndex)))
        : 0,
      completedIds: idsUnicos,
      selectedAnswers:
        payload.selectedAnswers &&
        typeof payload.selectedAnswers === "object"
          ? payload.selectedAnswers
          : {},
      attemptCounts:
        payload.attemptCounts &&
        typeof payload.attemptCounts === "object"
          ? payload.attemptCounts
          : {},
      lastWrongQuestionId:
        payload.lastWrongQuestionId === null ||
        Number.isInteger(Number(payload.lastWrongQuestionId))
          ? payload.lastWrongQuestionId
          : null,
      finished: finalizado,
    };

    const { data, error } = await supabaseServer
      .from("progreso_aspirante")
      .upsert(
        {
          user_codigo: codigo,
          unidad_slug: UNIDAD,
          completada: finalizado,
          porcentaje,
          respuestas: payloadSeguro,
          fecha_actualizacion: new Date().toISOString(),
        },
        {
          onConflict: "user_codigo,unidad_slug",
        }
      )
      .select(
        "user_codigo,unidad_slug,completada,porcentaje,respuestas,fecha_actualizacion"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      progreso: data,
      listoParaAscenso: finalizado,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible guardar el avance.",
      },
      { status: 500 }
    );
  }
}