import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Sesión vencida." }, { status: 401 });
  const declarado = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (declarado !== sesion.codigo) return NextResponse.json({ ok: false, error: "Identidad no autorizada." }, { status: 403 });
  const usuario = await supabaseServer.from("users")
    .select("codigo,estado_miembro").eq("codigo", sesion.codigo).maybeSingle();
  if (usuario.error) return NextResponse.json({ ok: false, error: "No se pudo verificar la membresía." }, { status: 503 });
  if (!usuario.data || String(usuario.data.estado_miembro || "").trim().toUpperCase() !== "ACTIVO")
    return NextResponse.json({ ok: false, error: "Membresía inactiva." }, { status: 403 });

  const consulta = await supabaseServer.from("miembros")
    .select("id,codigo,nombre,nivel,estado_academico,bio")
    .eq("codigo", sesion.codigo).maybeSingle();
  if (consulta.error) return NextResponse.json({ ok: false, error: "No se pudo consultar el perfil." }, { status: 500 });
  const miembro = consulta.data;
  let consejoEditorial: { rol: string; activo: boolean } | null = null;
  if (miembro) {
    const consejo = await supabaseServer.from("consejo_editorial_miembros")
      .select("rol,activo").eq("miembro_id", miembro.id).eq("activo", true).maybeSingle();
    if (consejo.error) return NextResponse.json({ ok: false, error: "No se pudieron verificar los permisos editoriales." }, { status: 500 });
    consejoEditorial = consejo.data;
  }
  return NextResponse.json({ ok: true, miembro, consejoEditorial }, { headers: { "Cache-Control": "no-store" } });
}
