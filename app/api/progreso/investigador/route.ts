import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

import { QUESTIONS as Q1 } from "@/content/proceso_inv/unidad1";
import { QUESTIONS as Q2 } from "@/content/proceso_inv/unidad2";
import { QUESTIONS as Q3 } from "@/content/proceso_inv/unidad3";
import { QUESTIONS as Q4 } from "@/content/proceso_inv/unidad4";
import { QUESTIONS as Q5 } from "@/content/proceso_inv/unidad5";
import { QUESTIONS as Q6 } from "@/content/proceso_inv/unidad6";
import { QUESTIONS as Q7 } from "@/content/proceso_inv/unidad7";
import { QUESTIONS as Q8 } from "@/content/proceso_inv/unidad8";
import { QUESTIONS as Q9 } from "@/content/proceso_inv/unidad9";
import { QUESTIONS as Q10 } from "@/content/proceso_inv/unidad10";

const cuestionarios: Record<string, { correcta: number; opciones: string[] }[]> = {
  "unidad-1": Q1,
  "unidad-2": Q2,
  "unidad-3": Q3,
  "unidad-4": Q4,
  "unidad-5": Q5,
  "unidad-6": Q6,
  "unidad-7": Q7,
  "unidad-8": Q8,
  "unidad-9": Q9,
  "unidad-10": Q10
};

const unidadValida = (u: unknown) => typeof u === "string" && /^unidad-(10|[1-9])$/.test(u);

async function autorizar() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const { data, error } = await supabaseServer.from("users")
    .select("codigo,estado_miembro,nivel,consejo").eq("codigo", sesion.codigo).maybeSingle();
  if (error || !data || String(data.estado_miembro || "").toUpperCase() !== "ACTIVO") return null;
  const nivel = String(data.nivel || "").toUpperCase();
  if (nivel !== "INV" && nivel !== "NUM" && data.consejo !== true) return null;
  return sesion.codigo;
}

export async function GET(req: NextRequest) {
  const codigo = await autorizar();
  if (!codigo) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
  const unidad = req.nextUrl.searchParams.get("unidad");
  if (unidad && !unidadValida(unidad)) return NextResponse.json({ error: "Unidad inválida." }, { status: 400 });
  let q = supabaseServer.from("progreso_inv")
    .select("user_codigo,unidad_slug,completada,porcentaje,respuestas,fecha_actualizacion")
    .eq("user_codigo", codigo);
  if (unidad) q = q.eq("unidad_slug", unidad);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Error consultando el progreso." }, { status: 500 });
  return NextResponse.json({ progreso: unidad ? (data?.[0] || null) : (data || []) });
}

export async function POST(req: NextRequest) {
  const codigo = await autorizar();
  if (!codigo) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || !unidadValida(body.unidad)) return NextResponse.json({ error: "Unidad inválida." }, { status: 400 });
  if (body.accion === "responder") {
    const preguntas = cuestionarios[body.unidad];
    const posicion = body.posicion;
    const opcion = body.opcion;
    if (!Number.isInteger(posicion) || posicion < 0 || posicion >= preguntas.length ||
        !Number.isInteger(opcion) || opcion < 0 || opcion >= preguntas[posicion].opciones.length) {
      return NextResponse.json({ error: "Respuesta o posición inválida." }, { status: 400 });
    }
    const { data: anterior, error: lecturaError } = await supabaseServer.from("progreso_inv")
      .select("completada,porcentaje,respuestas")
      .eq("user_codigo", codigo).eq("unidad_slug", body.unidad).maybeSingle();
    if (lecturaError) return NextResponse.json({ error: "Error consultando el progreso." }, { status: 500 });
    const respuestas = anterior?.respuestas && typeof anterior.respuestas === "object" && !Array.isArray(anterior.respuestas) ? anterior.respuestas : {};
    const previo = Number(respuestas.pregunta_pendiente_inv || 0);
    if (!Number.isInteger(previo) || previo < 0 || previo > preguntas.length) {
      return NextResponse.json({ error: "Progreso almacenado inválido." }, { status: 409 });
    }
    if (anterior?.completada || respuestas.cuestionario_completado) {
      return NextResponse.json({ error: "El cuestionario ya fue completado." }, { status: 409 });
    }
    if (posicion !== previo) {
      return NextResponse.json({ error: "La secuencia del cuestionario no coincide.", pregunta_pendiente: previo }, { status: 409 });
    }
    if (preguntas[posicion].correcta !== opcion) {
      return NextResponse.json({ ok: true, correcta: false, pregunta_pendiente: previo });
    }
    const siguiente = posicion + 1;
    const terminado = siguiente === preguntas.length;
    const porcentaje = Math.max(Number(anterior?.porcentaje || 0), Math.floor(siguiente * 50 / preguntas.length));
    const { error } = await supabaseServer.from("progreso_inv").upsert({
      user_codigo: codigo, unidad_slug: body.unidad,
      completada: anterior?.completada === true, porcentaje,
      respuestas: {
        ...respuestas, pregunta_pendiente_inv: siguiente,
        ...(terminado ? { cuestionario_completado: true, fecha: new Date().toISOString() } : {}),
      },
      fecha_actualizacion: new Date().toISOString(),
    }, { onConflict: "user_codigo,unidad_slug" });
    if (error) return NextResponse.json({ error: "No se pudo guardar el avance." }, { status: 500 });
    return NextResponse.json({ ok: true, correcta: true, porcentaje, pregunta_pendiente: siguiente, cuestionario_completado: terminado });
  }
  // Se retiran los endpoints que permitían declarar avances sin comprobar respuestas.
  if (body.accion === "avance_cuestionario" || body.accion === "cuestionario") {
    return NextResponse.json({ error: "Operación obsoleta. Actualiza la página del cuestionario." }, { status: 410 });
  }
  if (body.accion === "envio_trabajo") {
    // La finalización de la unidad sigue reservada al flujo de revisión académica.
    const { data: actual, error: lecturaError } = await supabaseServer.from("progreso_inv")
      .select("respuestas,porcentaje,completada")
      .eq("user_codigo", codigo).eq("unidad_slug", body.unidad).maybeSingle();
    if (lecturaError) return NextResponse.json({ error: "Error consultando el progreso." }, { status: 500 });
    if (!actual?.respuestas?.cuestionario_completado) {
      return NextResponse.json({ error: "Debe completar el cuestionario antes de registrar el trabajo." }, { status: 409 });
    }
    const { error } = await supabaseServer.from("progreso_inv").update({
      porcentaje: Math.max(Number(actual.porcentaje || 0), 50),
      fecha_actualizacion: new Date().toISOString(),
    }).eq("user_codigo", codigo).eq("unidad_slug", body.unidad);
    if (error) return NextResponse.json({ error: "No se pudo actualizar el progreso." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Operación no permitida." }, { status: 400 });
}
