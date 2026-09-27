import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function participanteActivo(codigo: string, id: string) {
  const { data: usuario } = await supabaseServer.from("users").select("codigo,estado_miembro").eq("codigo", codigo).maybeSingle();
  if (!usuario || String(usuario.estado_miembro || "").toUpperCase() !== "ACTIVO") return false;
  const { data } = await supabaseServer.from("mensaje_participantes").select("conversacion_id").eq("conversacion_id", id).eq("miembro_codigo", codigo).maybeSingle();
  return Boolean(data);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const codigo = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    const { id } = await context.params;
    if (!codigo || !(await participanteActivo(codigo, id))) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const archivar = body?.archivar !== false;
    const { error } = await supabaseServer.from("mensaje_participantes").update({ archivado_at: archivar ? new Date().toISOString() : null }).eq("conversacion_id", id).eq("miembro_codigo", codigo);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, archivado: archivar });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible actualizar la conversación." }, { status: 500 });
  }
}
