import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const codigo = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    if (!codigo) return NextResponse.json({ ok: false, total: 0 }, { status: 401 });
    const { data: participaciones, error } = await supabaseServer.from("mensaje_participantes").select("conversacion_id,ultimo_leido_at,archivado_at").eq("miembro_codigo", codigo).is("archivado_at", null);
    if (error) throw new Error(error.message);
    const ids: string[] = (participaciones || []).map((p: any) => String(p.conversacion_id));
    if (!ids.length) return NextResponse.json({ ok: true, total: 0 });
    const { data: mensajes, error: mError } = await supabaseServer.from("mensaje_hilo").select("conversacion_id,remitente_codigo,created_at").in("conversacion_id", ids).order("created_at", { ascending: true });
    if (mError) throw new Error(mError.message);
    const ultimo = new Map<string, any>();
    for (const m of mensajes || []) ultimo.set(String(m.conversacion_id), m);
    let total = 0;
    for (const p of participaciones || []) {
      const m = ultimo.get(String(p.conversacion_id));
      if (!m || String(m.remitente_codigo) === codigo) continue;
      if (!p.ultimo_leido_at || new Date(m.created_at).getTime() > new Date(p.ultimo_leido_at).getTime()) total++;
    }
    return NextResponse.json({ ok: true, total });
  } catch (error) {
    return NextResponse.json({ ok: false, total: 0, error: error instanceof Error ? error.message : "No fue posible contar las conversaciones." }, { status: 500 });
  }
}
