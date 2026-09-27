import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const codigo = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    const { id } = await context.params;
    if (!codigo || !id) return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });

    const { data: usuario } = await supabaseServer
      .from("users")
      .select("codigo,estado_miembro")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!usuario || String(usuario.estado_miembro || "").toUpperCase() !== "ACTIVO") {
      return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from("mensajes_internos")
      .update({ leido_at: new Date().toISOString() })
      .eq("id", id)
      .eq("destinatario_codigo", codigo)
      .select("id,leido_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ ok: false, error: "Mensaje no encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true, mensaje: data });
  } catch (error) {
    console.error("Error en /api/mensajes/[id] PATCH:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible actualizar el mensaje." }, { status: 500 });
  }
}
