import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const ESTADOS = ["PENDIENTE", "EN_ANALISIS", "APROBADA", "EN_PROCESO", "RESUELTA", "DESCARTADA"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];
const esCA = (v: unknown) => v === true || v === 1 || String(v).toLowerCase() === "true";

async function autorizar(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  const { data: miembro } = await supabaseServer.from("miembros").select("id,codigo,nombre,nivel").eq("codigo", codigo).maybeSingle();
  if (!miembro) return null;
  const [{ data: usuario }, { data: ce }] = await Promise.all([
    supabaseServer.from("users").select("consejo").eq("codigo", codigo).maybeSingle(),
    supabaseServer.from("consejo_editorial_miembros").select("id").eq("miembro_id", miembro.id).eq("activo", true).maybeSingle(),
  ]);
  return esCA(usuario?.consejo) || Boolean(ce) ? miembro : null;
}

async function listarResponsables() {
  const [{ data: usuarios }, { data: ce }] = await Promise.all([
    supabaseServer.from("users").select("codigo,consejo"),
    supabaseServer.from("consejo_editorial_miembros").select("miembro_id").eq("activo", true),
  ]);
  const codigos = (usuarios || []).filter((u) => esCA(u.consejo)).map((u) => u.codigo);
  const ids = (ce || []).map((x) => x.miembro_id);
  if (!codigos.length && !ids.length) return [];
  const filtros = [];
  if (codigos.length) filtros.push(`codigo.in.(${codigos.join(",")})`);
  if (ids.length) filtros.push(`id.in.(${ids.join(",")})`);
  const { data } = await supabaseServer.from("miembros").select("id,codigo,nombre,nivel").or(filtros.join(",")).order("nombre");
  return data || [];
}

async function idValido(params: Promise<{ id: string }>) {
  const id = Number((await params).id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await autorizar(req))) return NextResponse.json({ ok: false, error: "Acceso reservado al CA y CE." }, { status: 403 });
  const id = await idValido(params);
  if (!id) return NextResponse.json({ ok: false, error: "Registro no válido." }, { status: 400 });
  const [{ data: hilo, error }, { data: comentarios }, responsables] = await Promise.all([
    supabaseServer.from("bitacora_hilos").select(`*,creador:miembros!bitacora_hilos_creado_por_fkey(id,codigo,nombre),responsable:miembros!bitacora_hilos_responsable_id_fkey(id,codigo,nombre),resuelto:miembros!bitacora_hilos_resuelto_por_fkey(id,codigo,nombre)`).eq("id", id).maybeSingle(),
    supabaseServer.from("bitacora_comentarios").select(`*,autor:miembros!bitacora_comentarios_autor_miembro_id_fkey(id,codigo,nombre)`).eq("hilo_id", id).order("created_at", { ascending: true }),
    listarResponsables(),
  ]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!hilo) return NextResponse.json({ ok: false, error: "Registro no encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, hilo, comentarios: comentarios || [], responsables });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const miembro = await autorizar(req);
  const id = await idValido(params);
  if (!miembro) return NextResponse.json({ ok: false, error: "Acceso reservado al CA y CE." }, { status: 403 });
  if (!id) return NextResponse.json({ ok: false, error: "Registro no válido." }, { status: 400 });
  const contenido = String((await req.json()).contenido || "").trim();
  if (contenido.length < 2 || contenido.length > 10000) return NextResponse.json({ ok: false, error: "El comentario debe tener entre 2 y 10,000 caracteres." }, { status: 400 });
  const { error } = await supabaseServer.from("bitacora_comentarios").insert({ hilo_id: id, autor_miembro_id: miembro.id, contenido, tipo: "COMENTARIO" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await supabaseServer.from("bitacora_hilos").update({ updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const miembro = await autorizar(req);
  const id = await idValido(params);
  if (!miembro) return NextResponse.json({ ok: false, error: "Acceso reservado al CA y CE." }, { status: 403 });
  if (!id) return NextResponse.json({ ok: false, error: "Registro no válido." }, { status: 400 });
  const { data: actual } = await supabaseServer.from("bitacora_hilos").select("estado,prioridad,responsable_id").eq("id", id).maybeSingle();
  if (!actual) return NextResponse.json({ ok: false, error: "Registro no encontrado." }, { status: 404 });
  const body = await req.json();
  const estado = String(body.estado || actual.estado).toUpperCase();
  const prioridad = String(body.prioridad || actual.prioridad).toUpperCase();
  const responsableId = body.responsable_id === null || body.responsable_id === "" ? null : Number(body.responsable_id ?? actual.responsable_id);
  if (!ESTADOS.includes(estado) || !PRIORIDADES.includes(prioridad)) return NextResponse.json({ ok: false, error: "Estado o prioridad no válidos." }, { status: 400 });
  const permitidos = await listarResponsables();
  if (responsableId && !permitidos.some((r) => r.id === responsableId)) return NextResponse.json({ ok: false, error: "Responsable no válido." }, { status: 400 });

  const final = ["RESUELTA", "DESCARTADA"].includes(estado);
  const { error } = await supabaseServer.from("bitacora_hilos").update({ estado, prioridad, responsable_id: responsableId, fecha_resolucion: final ? new Date().toISOString() : null, resuelto_por: final ? miembro.id : null }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const eventos = [];
  if (estado !== actual.estado) eventos.push({ hilo_id: id, autor_miembro_id: miembro.id, contenido: `Cambió el estado de ${actual.estado} a ${estado}.`, tipo: "CAMBIO_ESTADO", estado_anterior: actual.estado, estado_nuevo: estado });
  if (prioridad !== actual.prioridad) eventos.push({ hilo_id: id, autor_miembro_id: miembro.id, contenido: `Cambió la prioridad de ${actual.prioridad} a ${prioridad}.`, tipo: "CAMBIO_PRIORIDAD" });
  if (responsableId !== actual.responsable_id) {
    const nombre = permitidos.find((r) => r.id === responsableId)?.nombre || "Sin responsable";
    eventos.push({ hilo_id: id, autor_miembro_id: miembro.id, contenido: `Asignó como responsable a: ${nombre}.`, tipo: "CAMBIO_RESPONSABLE" });
  }
  if (eventos.length) await supabaseServer.from("bitacora_comentarios").insert(eventos);
  return NextResponse.json({ ok: true });
}