import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("ensayos")
      .select("id,titulo,slug,autor_nombre,autor_codigo,nivel,proceso,unidad_slug,imagen_url,contenido,codigo_verificacion,url_social,estado,created_at,tipo_trabajo")
      .eq("estado", "publicado")
      .eq("estado_revision", "aprobado")
      .eq("origen_ensayo", "FORMACION")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al consultar trabajos publicados:", error.message);
      return NextResponse.json({ error: "No se pudieron consultar los trabajos." }, { status: 500 });
    }

    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error al consultar trabajos publicados:", error);
    return NextResponse.json({ error: "Error al consultar los trabajos." }, { status: 500 });
  }
}
