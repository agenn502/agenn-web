import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function acceso(codigo: string, id: string) {
  const { data: usuario } = await supabaseServer.from("users").select("codigo,estado_miembro").eq("codigo", codigo).maybeSingle();
  if (!usuario || String(usuario.estado_miembro || "").toUpperCase() !== "ACTIVO") return false;
  const { data } = await supabaseServer.from("mensaje_participantes").select("conversacion_id").eq("conversacion_id", id).eq("miembro_codigo", codigo).maybeSingle();
  return Boolean(data);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const codigo = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    const { id } = await context.params;
    if (!codigo || !(await acceso(codigo, id))) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    const [{ data: conversacion, error: cError }, { data: participantes, error: pError }, { data: mensajes, error: mError }] = await Promise.all([
      supabaseServer.from("mensaje_conversaciones").select("id,asunto,creador_codigo,created_at,updated_at").eq("id", id).single(),
      supabaseServer.from("mensaje_participantes").select("miembro_codigo").eq("conversacion_id", id),
      supabaseServer.from("mensaje_hilo").select("id,remitente_codigo,cuerpo,created_at").eq("conversacion_id", id).order("created_at", { ascending: true }),
    ]);
    if (cError) throw new Error(cError.message); if (pError) throw new Error(pError.message); if (mError) throw new Error(mError.message);
    const codigos: string[] = [...new Set<string>((participantes || []).map((p: any) => String(p.miembro_codigo)))];
    const nombres = new Map<string, string>();
    if (codigos.length) {
      const { data: personas, error } = await supabaseServer.from("users").select("codigo,nombre").in("codigo", codigos);
      if (error) throw new Error(error.message);
      for (const p of personas || []) nombres.set(String(p.codigo), String(p.nombre || p.codigo));
    }
    const ahora = new Date().toISOString();
    await supabaseServer.from("mensaje_participantes").update({ ultimo_leido_at: ahora }).eq("conversacion_id", id).eq("miembro_codigo", codigo);
    return NextResponse.json({ ok: true, conversacion, participantes: (participantes || []).map((p: any) => ({ codigo: p.miembro_codigo, nombre: nombres.get(String(p.miembro_codigo)) || p.miembro_codigo })), mensajes: (mensajes || []).map((m: any) => ({ ...m, remitente_nombre: nombres.get(String(m.remitente_codigo)) || m.remitente_codigo })) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible abrir la conversación." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const codigo = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    const { id } = await context.params;
    if (!codigo || !(await acceso(codigo, id))) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    const body = await req.json();
    const cuerpo = String(body.cuerpo || "").trim();
    if (!cuerpo || cuerpo.length > 12000) return NextResponse.json({ ok: false, error: "Escriba un mensaje válido." }, { status: 400 });
    const ahora = new Date().toISOString();
    const { data, error } = await supabaseServer.from("mensaje_hilo").insert({ conversacion_id: id, remitente_codigo: codigo, cuerpo, created_at: ahora }).select("id,remitente_codigo,cuerpo,created_at").single();
    if (error) throw new Error(error.message);
    await Promise.all([
      supabaseServer.from("mensaje_conversaciones").update({ updated_at: ahora }).eq("id", id),
      supabaseServer.from("mensaje_participantes").update({ ultimo_leido_at: ahora, archivado_at: null }).eq("conversacion_id", id).eq("miembro_codigo", codigo),
      // Una respuesta nueva devuelve el hilo a la bandeja principal de los demas participantes.
      supabaseServer.from("mensaje_participantes").update({ archivado_at: null }).eq("conversacion_id", id).neq("miembro_codigo", codigo),
    ]);
    return NextResponse.json({ ok: true, mensaje: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible responder." }, { status: 500 });
  }
}
