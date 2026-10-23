import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";
export async function POST(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "Sesión vencida." }, { status: 401 });
  if ((req.headers.get("x-user-codigo") || "").trim().toUpperCase() !== sesion.codigo)
    return NextResponse.json({ error: "Identidad no autorizada." }, { status: 403 });
  const usuario = await supabaseServer.from("users").select("estado_miembro").eq("codigo", sesion.codigo).maybeSingle();
  if (usuario.error) return NextResponse.json({ error: "No se pudo verificar la sesión." }, { status: 503 });
  if (String(usuario.data?.estado_miembro || "").toUpperCase() !== "ACTIVO")
    return NextResponse.json({ error: "Membresía inactiva." }, { status: 403 });
  const miembro = await supabaseServer.from("miembros").select("id").eq("codigo", sesion.codigo).maybeSingle();
  if (!miembro.data || miembro.error) return NextResponse.json({ error: "Miembro no encontrado." }, { status: 403 });
  const form = await req.formData();
  const unidad = String(form.get("unidad") || "");
  if (!["unidad-1", "unidad-2", "unidad-3", "unidad-4", "unidad-5", "unidad-6", "unidad-7", "unidad-8", "unidad-9", "unidad-10"].includes(unidad)) return NextResponse.json({ error: "Unidad inválida." }, { status: 400 });
  const archivo = form.get("imagen");
  if (!(archivo instanceof File) || archivo.size > 102400 || archivo.size < 1 || archivo.type !== "image/jpeg")
    return NextResponse.json({ error: "La imagen debe ser JPEG y no superar 100 KB." }, { status: 400 });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
    return NextResponse.json({ error: "El archivo no es un JPEG válido." }, { status: 400 });
  const existente = await supabaseServer.from("ensayos").select("estado,estado_revision")
    .eq("autor_miembro_id", miembro.data.id).eq("unidad_slug", unidad)
    .eq("proceso", "INV").eq("origen_ensayo", "FORMACION")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (existente.error) return NextResponse.json({ error: "No se pudo comprobar el estado del trabajo." }, { status: 500 });
  if (existente.data && (!["borrador", "correcciones"].includes(existente.data.estado) || (existente.data.estado_revision && existente.data.estado_revision !== "correcciones")))
    return NextResponse.json({ error: "El trabajo no permite cambios de imagen." }, { status: 409 });
  const ruta = `${unidad}/${sesion.codigo}-${unidad.replace("unidad-", "u")}.jpg`;
  const subida = await supabaseServer.storage.from("ensayos").upload(ruta, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
  if (subida.error) return NextResponse.json({ error: subida.error.message }, { status: 500 });
  const { data } = supabaseServer.storage.from("ensayos").getPublicUrl(ruta);
  return NextResponse.json({ ok: true, url: `${data.publicUrl}?v=${Date.now()}` });
}
