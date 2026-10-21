import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

async function verificar(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión inexistente o vencida.", status: 401 };
  const declarado = String(req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (declarado !== sesion.codigo) return { error: "Identidad no autorizada.", status: 403 };
  const { data, error } = await supabaseServer.from("users")
    .select("codigo,nombre,correo,nivel,estado_miembro")
    .eq("codigo", sesion.codigo).maybeSingle();
  if (error) return { error: "No se pudo verificar la sesión.", status: 503 };
  if (!data || String(data.estado_miembro || "").toUpperCase() !== "ACTIVO")
    return { error: "Membresía inactiva o no autorizada.", status: 403 };
  return { usuario: data, codigo: sesion.codigo };
}
const fallo = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

export async function GET(req: NextRequest) {
  const v = await verificar(req);
  if ("error" in v) return fallo(v.error!, v.status!);
  const { data, error } = await supabaseServer.from("miembros")
    .select("codigo,nombre,correo,nivel,profesion,bio,publicaciones,foto_url,fecha_nacimiento")
    .eq("codigo", v.codigo!).maybeSingle();
  if (error) return fallo("No fue posible consultar la biografía.", 500);
  if (data) return NextResponse.json({ ok: true, miembro: data });
  // Solo el servidor crea fichas faltantes; el nivel y la identidad proceden de users.
  const usuario = v.usuario!;
  const nuevo = { codigo: v.codigo!, nombre: usuario.nombre || "", correo: usuario.correo || "",
    nivel: usuario.nivel || "", profesion: "", bio: "", publicaciones: "", foto_url: "", fecha_nacimiento: null };
  const creado = await supabaseServer.from("miembros").upsert(nuevo, { onConflict: "codigo", ignoreDuplicates: true });
  if (creado.error) return fallo("No fue posible crear la ficha biográfica.", 500);
  const consulta = await supabaseServer.from("miembros")
    .select("codigo,nombre,correo,nivel,profesion,bio,publicaciones,foto_url,fecha_nacimiento")
    .eq("codigo", v.codigo!).maybeSingle();
  if (consulta.error || !consulta.data) return fallo("No fue posible cargar la ficha biográfica.", 500);
  return NextResponse.json({ ok: true, miembro: consulta.data });
}

export async function PATCH(req: NextRequest) {
  const v = await verificar(req);
  if ("error" in v) return fallo(v.error!, v.status!);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fallo("Solicitud inválida.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fallo("Datos inválidos.", 400);
  const permitidos = ["nombre", "correo", "profesion", "bio", "publicaciones", "fecha_nacimiento", "foto_url"] as const;
  const claves = Object.keys(body);
  if (!claves.length || claves.some(k => !permitidos.includes(k as typeof permitidos[number])))
    return fallo("Se intentó modificar un campo no autorizado.", 400);
  const cambios: Record<string, string | null> = {};
  for (const campo of permitidos) {
    if (!(campo in body)) continue;
    const valor = body[campo];
    if (campo === "fecha_nacimiento") {
      if (valor !== null && (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)))
        return fallo("Fecha de nacimiento inválida.", 400);
      cambios[campo] = valor as string | null;
    } else {
      if (typeof valor !== "string") return fallo("Tipo de dato inválido.", 400);
      const limites: Record<string, number> = { nombre: 250, correo: 320, profesion: 500, bio: 20000, publicaciones: 20000, foto_url: 2048 };
      if (valor.length > limites[campo]) return fallo("El contenido excede la longitud permitida.", 400);
      cambios[campo] = valor;
    }
  }
  if ("nombre" in cambios && !String(cambios.nombre || "").trim()) return fallo("Nombre obligatorio.", 400);
  if ("correo" in cambios && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(cambios.correo || "")))
    return fallo("Correo electrónico inválido.", 400);
  if ("foto_url" in cambios) {
    const url = String(cambios.foto_url);
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base || !url.startsWith(`${base.replace(/\/$/, "")}/storage/v1/object/public/miembros-fotos/`))
      return fallo("La fotografía no pertenece al almacenamiento autorizado.", 400);
    const nombre = decodeURIComponent(url.split("/miembros-fotos/")[1]?.split("?")[0] || "");
    if (!nombre.startsWith(`${v.codigo!}-`) || !/^[A-Z0-9_-]+-\d+\.jpg$/i.test(nombre))
      return fallo("La fotografía no corresponde al miembro.", 400);
  }
  const { data, error } = await supabaseServer.from("miembros")
    .update(cambios).eq("codigo", v.codigo!).select("codigo").maybeSingle();
  if (error) return fallo("No fue posible guardar los datos biográficos.", 500);
  if (!data) return fallo("No se encontró la ficha biográfica.", 404);
  return NextResponse.json({ ok: true });
}
