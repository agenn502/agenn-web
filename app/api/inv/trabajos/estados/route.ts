import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sesion = await obtenerSesion();
    if (!sesion?.codigo) {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    }

    const { data: miembro, error: miembroError } = await supabaseServer
      .from("users")
      .select("codigo,estado_miembro,nivel,consejo")
      .eq("codigo", sesion.codigo)
      .maybeSingle();

    if (miembroError) {
      return NextResponse.json({ error: "No se pudo verificar la membresía." }, { status: 500 });
    }
    const nivel = String(miembro?.nivel || "").toUpperCase();
    if (!miembro || String(miembro.estado_miembro || "").toUpperCase() !== "ACTIVO" ||
        (nivel !== "INV" && nivel !== "NUM" && miembro.consejo !== true)) {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from("ensayos")
      .select("id,unidad_slug,estado,estado_revision,observaciones_revision,fecha_revision,slug,updated_at")
      .eq("autor_codigo", sesion.codigo)
      .eq("proceso", "INV")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "No se pudieron consultar los trabajos." }, { status: 500 });
    }
    return NextResponse.json({ ensayos: data || [] }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Error interno al consultar los trabajos." }, { status: 500 });
  }
}
