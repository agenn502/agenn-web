import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

async function autorizarConsejo() {
  const sesion = await obtenerSesion();
  if (!sesion) return false;
  const { data, error } = await supabaseServer.from("users")
    .select("consejo,estado_miembro")
    .eq("codigo", sesion.codigo).maybeSingle();
  return !error && !!data && data.consejo === true &&
    String(data.estado_miembro || "").toUpperCase() === "ACTIVO";
}

function contenido(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

function datosEvento(body: Record<string, unknown>) {
  const titulo = contenido(body.titulo, 250);
  const fecha_inicio = contenido(body.fecha_inicio, 40);
  const fecha_fin = contenido(body.fecha_fin, 40);
  if (!titulo || !fecha_inicio || !fecha_fin ||
      !Number.isFinite(Date.parse(fecha_inicio)) || !Number.isFinite(Date.parse(fecha_fin)) ||
      Date.parse(fecha_fin) < Date.parse(fecha_inicio)) return null;
  return {
    titulo, fecha_inicio, fecha_fin,
    lugar: contenido(body.lugar, 500),
    descripcion: contenido(body.descripcion, 20000),
    imagen_url: contenido(body.imagen_url, 2000) || null,
  };
}

async function ejecutar(request: NextRequest, metodo: "POST" | "PATCH" | "DELETE") {
  try {
    if (!(await autorizarConsejo()))
      return NextResponse.json({ error: "Solo miembros activos del Consejo pueden administrar eventos." }, { status: 403 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: "Solicitud incorrecta." }, { status: 400 });
    const payload = body as Record<string, unknown>;
    const id = typeof payload.id === "string" || typeof payload.id === "number" ? String(payload.id) : "";
    if (metodo !== "POST" && (!id || id.length > 100))
      return NextResponse.json({ error: "Identificador de evento inválido." }, { status: 400 });
    if (metodo === "DELETE") {
      const { error } = await supabaseServer.from("eventos").delete().eq("id", id);
      if (error) throw error;
    } else {
      const datos = datosEvento(payload);
      if (!datos) return NextResponse.json({ error: "Revise el título y las fechas del evento." }, { status: 400 });
      const { error } = metodo === "POST"
        ? await supabaseServer.from("eventos").insert([datos])
        : await supabaseServer.from("eventos").update(datos).eq("id", id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error administrando evento:", error);
    return NextResponse.json({ error: "No se pudo completar la operación." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return ejecutar(request, "POST"); }
export async function PATCH(request: NextRequest) { return ejecutar(request, "PATCH"); }
export async function DELETE(request: NextRequest) { return ejecutar(request, "DELETE"); }
