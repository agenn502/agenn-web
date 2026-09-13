import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const TIPOS = ["ERROR", "MEJORA", "CONTENIDO", "DECISION", "EDITORIAL", "OTRO"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

function esConsejo(valor: unknown) {
  return valor === true || valor === 1 || String(valor).toLowerCase() === "true";
}

async function autorizar(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo) return null;

  const { data: miembro } = await supabaseServer
    .from("miembros").select("id,codigo,nombre,nivel").eq("codigo", codigo).maybeSingle();
  if (!miembro) return null;

  const [{ data: usuario }, { data: editorial }] = await Promise.all([
    supabaseServer.from("users").select("consejo").eq("codigo", codigo).maybeSingle(),
    supabaseServer.from("consejo_editorial_miembros").select("id").eq("miembro_id", miembro.id).eq("activo", true).maybeSingle(),
  ]);
  return esConsejo(usuario?.consejo) || Boolean(editorial) ? miembro : null;
}

async function responsables() {
  const [{ data: usuarios }, { data: editoriales }] = await Promise.all([
    supabaseServer.from("users").select("codigo,consejo"),
    supabaseServer.from("consejo_editorial_miembros").select("miembro_id").eq("activo", true),
  ]);
  const codigos = (usuarios || []).filter((u) => esConsejo(u.consejo)).map((u) => u.codigo);
  const ids = (editoriales || []).map((e) => e.miembro_id);
  let consulta = supabaseServer.from("miembros").select("id,codigo,nombre,nivel");
  if (codigos.length || ids.length) {
    const partes = [];
    if (codigos.length) partes.push(`codigo.in.(${codigos.join(",")})`);
    if (ids.length) partes.push(`id.in.(${ids.join(",")})`);
    consulta = consulta.or(partes.join(","));
  } else return [];
  const { data } = await consulta.order("nombre");
  return data || [];
}

export async function GET(req: NextRequest) {
  const miembro = await autorizar(req);
  if (!miembro) return NextResponse.json({ ok: false, error: "Acceso reservado al CA y CE." }, { status: 403 });

  const [{ data: hilos, error }, { data: comentarios }, listaResponsables] = await Promise.all([
    supabaseServer.from("bitacora_hilos").select(`*,creador:miembros!bitacora_hilos_creado_por_fkey(id,codigo,nombre),responsable:miembros!bitacora_hilos_responsable_id_fkey(id,codigo,nombre)`).order("updated_at", { ascending: false }).limit(500),
    supabaseServer.from("bitacora_comentarios").select("hilo_id"),
    responsables(),
  ]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const conteos = new Map<number, number>();
  for (const fila of comentarios || []) conteos.set(fila.hilo_id, (conteos.get(fila.hilo_id) || 0) + 1);
  const filas = (hilos || []).map((h) => ({ ...h, comentarios_count: conteos.get(h.id) || 0 }));
  const abiertos = filas.filter((h) => !["RESUELTA", "DESCARTADA"].includes(h.estado)).length;
  return NextResponse.json({ ok: true, hilos: filas, responsables: listaResponsables, resumen: { total: filas.length, abiertos } });
}

export async function POST(req: NextRequest) {
  const miembro = await autorizar(req);
  if (!miembro) return NextResponse.json({ ok: false, error: "Acceso reservado al CA y CE." }, { status: 403 });

  const body = await req.json();
  const titulo = String(body.titulo || "").trim();
  const descripcion = String(body.descripcion || "").trim();
  const tipo = String(body.tipo || "MEJORA").toUpperCase();
  const prioridad = String(body.prioridad || "MEDIA").toUpperCase();
  const modulo = String(body.modulo || "GENERAL").trim().toUpperCase();
  const ruta = String(body.ruta || "").trim() || null;
  const responsableId = body.responsable_id ? Number(body.responsable_id) : null;
  if (titulo.length < 5 || titulo.length > 200) return NextResponse.json({ ok: false, error: "El título debe tener entre 5 y 200 caracteres." }, { status: 400 });
  if (descripcion.length < 10 || descripcion.length > 10000) return NextResponse.json({ ok: false, error: "La descripción debe tener entre 10 y 10,000 caracteres." }, { status: 400 });
  if (!TIPOS.includes(tipo) || !PRIORIDADES.includes(prioridad)) return NextResponse.json({ ok: false, error: "Tipo o prioridad no válidos." }, { status: 400 });

  const permitidos = await responsables();
  if (responsableId && !permitidos.some((r) => r.id === responsableId)) return NextResponse.json({ ok: false, error: "El responsable seleccionado no es válido." }, { status: 400 });
  const { data, error } = await supabaseServer.from("bitacora_hilos").insert({ titulo, descripcion, tipo, prioridad, modulo: modulo.slice(0, 100), ruta: ruta?.slice(0, 500), creado_por: miembro.id, responsable_id: responsableId }).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}