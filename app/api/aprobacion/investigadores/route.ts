import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarConsejo(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) return false;

  const { data, error } = await supabaseServer
    .from("users")
    .select("consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return false;

  const valor = data.consejo;
  return valor === true || valor === "true" || valor === "TRUE" || valor === 1;
}

export async function GET(req: NextRequest) {
  if (!(await validarConsejo(req))) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseServer
    .from("ensayos")
    .select(
      "id,titulo,slug,autor_nombre,autor_codigo,nivel,unidad_slug,tema,url_social,codigo_verificacion,fecha_evidencia,estado_revision"
    )
    .eq("estado", "publicado")
    .eq("estado_revision", "pendiente")
    .order("fecha_evidencia", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ensayos: data || [] });
}
