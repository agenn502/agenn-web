import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

const UNIDADES = new Set(["unidad-1", "unidad-2", "unidad-3", "unidad-4", "unidad-5", "unidad-6", "unidad-7", "unidad-8", "unidad-9", "unidad-10"]);
const SIN_CACHE = { "Cache-Control": "no-store" };
function respuesta(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: SIN_CACHE });
}
async function identidad(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: respuesta("Sesión vencida.", 401) };
  const declarado = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (declarado !== sesion.codigo) return { error: respuesta("Identidad no autorizada.", 403) };
  const usuario = await supabaseServer.from("users").select("estado_miembro").eq("codigo", sesion.codigo).maybeSingle();
  if (usuario.error) return { error: respuesta("No se pudo verificar la membresía.", 503) };
  if (String(usuario.data?.estado_miembro || "").toUpperCase() !== "ACTIVO") return { error: respuesta("Membresía inactiva.", 403) };
  const miembro = await supabaseServer.from("miembros").select("id,codigo,nombre,nivel").eq("codigo", sesion.codigo).maybeSingle();
  if (miembro.error || !miembro.data) return { error: respuesta("No se encontró el perfil del miembro.", 403) };
  return { miembro: miembro.data };
}
function unidadValida(unidad: unknown): unidad is string {
  return typeof unidad === "string" && UNIDADES.has(unidad);
}
export async function GET(req: NextRequest) {
  const id = await identidad(req);
  if (id.error) return id.error;
  const unidad = req.nextUrl.searchParams.get("unidad");
  if (!unidadValida(unidad)) return respuesta("Unidad no autorizada.", 400);
  const { data, error } = await supabaseServer.from("ensayos").select("*")
    .eq("autor_miembro_id", id.miembro!.id).eq("unidad_slug", unidad)
    .eq("proceso", "INV").eq("origen_ensayo", "FORMACION")
    .in("estado", ["borrador", "en_revision", "correcciones", "publicado"])
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return respuesta("No se pudo consultar el trabajo.", 500);
  return NextResponse.json({ ok: true, ensayo: data }, { headers: SIN_CACHE });
}
export async function POST(req: NextRequest) {
  const id = await identidad(req);
  if (id.error) return id.error;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respuesta("Solicitud inválida.", 400); }
  const unidad = body.unidad;
  if (!unidadValida(unidad)) return respuesta("Unidad no autorizada.", 400);
  const titulo = String(body.titulo || "").trim();
  const contenido = String(body.contenido || "").trim();
  const tema = String(body.tema || "").trim();
  if (!titulo || !contenido || !tema || titulo.length > 500 || contenido.length > 250000)
    return respuesta("Complete el tema, título y contenido dentro de los límites permitidos.", 400);
  const enviar = body.enviarRevision === true;
  const miembro = id.miembro!;
  const { data: existentes, error: errorConsulta } = await supabaseServer.from("ensayos")
    .select("id,slug,estado,estado_revision,revision_preliminar,fecha_revision_preliminar")
    .eq("autor_miembro_id", miembro.id).eq("unidad_slug", unidad)
    .eq("proceso", "INV").eq("origen_ensayo", "FORMACION")
    .order("updated_at", { ascending: false }).limit(1);
  if (errorConsulta) return respuesta("No se pudo verificar el estado del trabajo.", 500);
  const previo = existentes?.[0] || null;
  const solicitado = body.trabajoId == null ? null : Number(body.trabajoId);
  if (solicitado !== null && (!Number.isSafeInteger(solicitado) || previo?.id !== solicitado))
    return respuesta("El trabajo solicitado no pertenece a esta cuenta o unidad.", 403);
  if (previo && !["borrador", "correcciones"].includes(String(previo.estado || "")))
    return respuesta("El trabajo está en revisión o publicado y no puede editarse.", 409);
  if (previo?.estado_revision && !["", "correcciones"].includes(previo.estado_revision))
    return respuesta("El Consejo Académico todavía tiene este trabajo en revisión.", 409);
  const estado = enviar ? "en_revision" : previo?.estado === "correcciones" ? "correcciones" : "borrador";
  const palabras = contenido.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const imagenUrl = String(body.imagenUrl || "");
  const urlBase = `${process.env.SUPABASE_URL}/storage/v1/object/public/ensayos/${unidad}/${miembro.codigo}-${unidad.replace("unidad-", "u")}.jpg`;
  if (imagenUrl && !imagenUrl.startsWith(urlBase)) return respuesta("Imagen no autorizada.", 400);
  const preliminar = enviar && previo?.estado !== "correcciones" && body.revisionPreliminar && typeof body.revisionPreliminar === "object" && !Array.isArray(body.revisionPreliminar) && JSON.stringify(body.revisionPreliminar).length <= 30000 ? body.revisionPreliminar : null;
  const base = {
    ...(imagenUrl ? { imagen_url: imagenUrl } : {}),
    titulo, contenido, tema, estado,
    fuente_imagen: String(body.fuenteImagen || "").trim().slice(0, 2000) || null,
    numero_palabras: palabras, numero_caracteres: contenido.length,
    updated_at: new Date().toISOString(),
    ...(preliminar ? { revision_preliminar: preliminar, fecha_revision_preliminar: new Date().toISOString() } : {}),
  };
  let resultado;
  if (previo) {
    // Filtro condicional para evitar sobrescribir una revisión iniciada en paralelo.
    let consulta = supabaseServer.from("ensayos").update({
      ...base, ...(enviar ? { estado_revision: "pendiente", observaciones_revision: null, revisado_por: null, fecha_revision: null } : {}),
    }).eq("id", previo.id).eq("autor_miembro_id", miembro.id).eq("estado", previo.estado);
    if (previo.estado_revision == null) consulta = consulta.is("estado_revision", null);
    else consulta = consulta.eq("estado_revision", previo.estado_revision);
    resultado = await consulta.select("id,slug,imagen_url,estado,estado_revision").maybeSingle();
    if (!resultado.error && !resultado.data) return respuesta("El trabajo cambió de estado. Recargue la página.", 409);
  } else {
    const slug = `${titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90)}-${miembro.codigo.toLowerCase()}-${unidad.replace("unidad-", "u")}`;
    resultado = await supabaseServer.from("ensayos").insert({
      ...base, slug, autor_nombre: miembro.nombre, autor_codigo: miembro.codigo,
      autor_miembro_id: miembro.id, nivel: miembro.nivel, proceso: "INV", unidad_slug: unidad,
      origen_ensayo: "FORMACION", tipo_trabajo: String(body.tipoTrabajo || "Análisis breve").slice(0, 150),
      codigo_verificacion: `AGENN-INV-${unidad.toUpperCase()}-${miembro.codigo}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      ...(enviar ? { estado_revision: "pendiente" } : {}),
    }).select("id,slug,imagen_url,estado,estado_revision").single();
  }
  if (resultado.error) return respuesta("No se pudo guardar el trabajo: " + resultado.error.message, 500);
  return NextResponse.json({ ok: true, ensayo: resultado.data }, { headers: SIN_CACHE });
}
