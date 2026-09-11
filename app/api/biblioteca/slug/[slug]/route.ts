import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const codigo = String(req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 401 },
    );
  }

  const { data: usuario, error: usuarioError } = await supabaseServer
    .from("users")
    .select("codigo,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (
    usuarioError ||
    !usuario ||
    !["NOV", "INV", "NUM"].includes(String(usuario.nivel).toUpperCase())
  ) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 },
    );
  }

  const { slug } = await context.params;
  const { data, error } = await supabaseServer
    .from("biblioteca")
    .select("id,slug,titulo,autores,anio,tipo,editorial,descripcion,portada_url,enlace_url")
    .eq("slug", slug)
    .eq("estado", "ACTIVO")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Material no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: data });
}
