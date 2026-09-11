import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { obtenerPermisosBiblioteca } from "@/lib/bibliotecaPermisos";

function generarSlug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function subirPortada(file: File) {
  if (!file.type.startsWith("image/") || file.size > 500 * 1024) {
    throw new Error("La portada debe ser una imagen de hasta 500 KB.");
  }

  const nombre =
    "catalogo/" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    ".jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseServer.storage
    .from("portadas-biblioteca")
    .upload(nombre, buffer, { contentType: "image/jpeg", upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabaseServer.storage
    .from("portadas-biblioteca")
    .getPublicUrl(nombre);

  return data.publicUrl;
}

export async function GET(req: NextRequest) {
  try {
    const permisos = await obtenerPermisosBiblioteca(req);
    if (!permisos?.puedeGestionar) {
      return NextResponse.json(
        { ok: false, error: "No tiene permisos para administrar la Biblioteca." },
        { status: 403 },
      );
    }

    const { data, error } = await supabaseServer
      .from("biblioteca")
      .select(
        "id,slug,titulo,autores,anio,tipo,editorial,descripcion,portada_url,enlace_url,estado,estado_enlace,ultima_verificacion_enlace,updated_at",
      )
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, items: data || [], permisos });
  } catch (error) {
    console.error("Error en GET /api/biblioteca/administrar:", error);
    return NextResponse.json(
      { ok: false, error: "No fue posible cargar la administración." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const permisos = await obtenerPermisosBiblioteca(req);
    if (!permisos?.puedeGestionar) {
      return NextResponse.json(
        { ok: false, error: "No tiene permisos para administrar la Biblioteca." },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const id = String(formData.get("id") || "").trim();
    const accion = String(formData.get("accion") || "ACTUALIZAR").toUpperCase();

    if (!id || !["ACTUALIZAR", "CAMBIAR_ESTADO", "VERIFICAR_ENLACE"].includes(accion)) {
      return NextResponse.json(
        { ok: false, error: "La solicitud no es válida." },
        { status: 400 },
      );
    }

    const { data: actual, error: actualError } = await supabaseServer
      .from("biblioteca")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (actualError) throw new Error(actualError.message);
    if (!actual) {
      return NextResponse.json(
        { ok: false, error: "Material no encontrado." },
        { status: 404 },
      );
    }

    const ahora = new Date().toISOString();
    let payload: Record<string, unknown> = {
      actualizado_por_miembro_id: permisos.miembroId,
      updated_at: ahora,
    };
    let accionHistorial = "EDICION";

    if (accion === "CAMBIAR_ESTADO") {
      const estado = String(formData.get("estado") || "").toUpperCase();
      if (!["ACTIVO", "OCULTO", "EN_REVISION"].includes(estado)) {
        return NextResponse.json(
          { ok: false, error: "Estado de catálogo no válido." },
          { status: 400 },
        );
      }
      payload.estado = estado;
      accionHistorial = "CAMBIO_ESTADO";
    } else if (accion === "VERIFICAR_ENLACE") {
      const estadoEnlace = String(formData.get("estado_enlace") || "").toUpperCase();
      if (!["FUNCIONAL", "ROTO", "SIN_VERIFICAR"].includes(estadoEnlace)) {
        return NextResponse.json(
          { ok: false, error: "Estado del enlace no válido." },
          { status: 400 },
        );
      }
      payload.estado_enlace = estadoEnlace;
      payload.ultima_verificacion_enlace = ahora;
      if (estadoEnlace === "ROTO") payload.estado = "EN_REVISION";
      accionHistorial = "VERIFICACION_ENLACE";
    } else {
      const titulo = String(formData.get("titulo") || "").trim();
      const enlaceUrl = String(formData.get("enlace_url") || "").trim();
      const autores = String(formData.get("autores") || "")
        .split(",")
        .map((valor) => valor.trim())
        .filter(Boolean);
      const anioTexto = String(formData.get("anio") || "").trim();
      const portada = formData.get("portada") as File | null;

      if (!titulo || !enlaceUrl) {
        return NextResponse.json(
          { ok: false, error: "Título y enlace son obligatorios." },
          { status: 400 },
        );
      }

      payload = {
        ...payload,
        titulo,
        slug: generarSlug(String(formData.get("slug") || titulo)),
        autores,
        anio: anioTexto ? Number(anioTexto) : null,
        tipo: String(formData.get("tipo") || "").trim() || null,
        editorial: String(formData.get("editorial") || "").trim() || null,
        descripcion: String(formData.get("descripcion") || "").trim() || null,
        enlace_url: enlaceUrl,
        estado_enlace: "SIN_VERIFICAR",
        ultima_verificacion_enlace: null,
      };

      if (portada && portada.size > 0) payload.portada_url = await subirPortada(portada);
    }

    const { error: actualizarError } = await supabaseServer
      .from("biblioteca")
      .update(payload)
      .eq("id", id);
    if (actualizarError) throw new Error(actualizarError.message);

    const { error: historialError } = await supabaseServer
      .from("biblioteca_historial")
      .insert({
        biblioteca_id: id,
        accion: accionHistorial,
        actor_miembro_id: permisos.miembroId,
        detalle: { anterior: actual, cambios: payload },
      });
    if (historialError) console.error("No se registró historial:", historialError.message);

    return NextResponse.json({ ok: true, message: "Material actualizado." });
  } catch (error) {
    console.error("Error en PATCH /api/biblioteca/administrar:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No fue posible actualizar." },
      { status: 500 },
    );
  }
}