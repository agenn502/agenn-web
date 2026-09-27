import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const codigo = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    if (!codigo) return NextResponse.json({ ok: false, total: 0 }, { status: 401 });
    const { count, error } = await supabaseServer
      .from("mensajes_internos")
      .select("*", { count: "exact", head: true })
      .eq("destinatario_codigo", codigo)
      .is("leido_at", null);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, total: count || 0 });
  } catch (error) {
    return NextResponse.json({ ok: false, total: 0, error: error instanceof Error ? error.message : "No fue posible contar los mensajes." }, { status: 500 });
  }
}
