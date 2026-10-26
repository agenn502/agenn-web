import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return NextResponse.json({ ok: false, error: "Sesion inexistente o vencida." }, { status: 401 });
    }

    const declarado = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
    if (declarado !== sesion.codigo) {
      return NextResponse.json({ ok: false, error: "Identidad no autorizada." }, { status: 403 });
    }

    const { data: usuario, error: errorUsuario } = await supabaseServer
      .from("users")
      .select("codigo,estado_miembro")
      .eq("codigo", sesion.codigo)
      .maybeSingle();

    if (errorUsuario) {
      return NextResponse.json({ ok: false, error: "No se pudo verificar la sesion." }, { status: 503 });
    }
    if (!usuario || String(usuario.estado_miembro || "").toUpperCase() !== "ACTIVO") {
      return NextResponse.json({ ok: false, error: "Membresia inactiva o no autorizada." }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from("ensayos")
      .select("estado_revision")
      .eq("autor_codigo", sesion.codigo)
      .eq("estado", "publicado")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error consultando alertas de ensayos:", error);
      return NextResponse.json({ ok: false, error: "No fue posible consultar las alertas." }, { status: 500 });
    }

    const revisiones = data || [];
    const tieneRechazado = revisiones.some((r) => r.estado_revision === "rechazado");
    const tienePendiente = revisiones.some((r) => r.estado_revision === "pendiente");
    return NextResponse.json({ ok: true, alerta: tieneRechazado ? "⚠️" : tienePendiente ? "⏳" : "" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error verificando alertas de ensayos:", error);
    return NextResponse.json({ ok: false, error: "Error al consultar las alertas." }, { status: 500 });
  }
}
