import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const { data, error } = await supabaseServer
      .from("biblioteca")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Material no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (err) {
    console.error("Error en GET /api/biblioteca/slug/[slug]:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo cargar el material." },
      { status: 500 }
    );
  }
}