import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const [temasResultado, subtemasResultado, periodosResultado] =
      await Promise.all([
        supabaseServer
          .from("revista_temas")
          .select("id,nombre,slug,descripcion,orden")
          .eq("activo", true)
          .order("orden", { ascending: true })
          .order("nombre", { ascending: true }),
        supabaseServer
          .from("revista_subtemas")
          .select("id,tema_id,nombre,slug,descripcion,orden")
          .eq("activo", true)
          .order("orden", { ascending: true })
          .order("nombre", { ascending: true }),
        supabaseServer
          .from("revista_periodos")
          .select("id,nombre,slug,anio_inicio,anio_fin,orden")
          .eq("activo", true)
          .order("orden", { ascending: true })
          .order("nombre", { ascending: true }),
      ]);

    if (temasResultado.error) throw new Error(temasResultado.error.message);
    if (subtemasResultado.error) {
      throw new Error(subtemasResultado.error.message);
    }
    if (periodosResultado.error) {
      throw new Error(periodosResultado.error.message);
    }

    return NextResponse.json({
      ok: true,
      temas: temasResultado.data || [],
      subtemas: subtemasResultado.data || [],
      periodos: periodosResultado.data || [],
    });
  } catch (error) {
    console.error("Error GET /api/revista/catalogos:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar los catálogos editoriales.",
      },
      { status: 500 }
    );
  }
}
