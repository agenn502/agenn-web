import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarConsejo(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) return null;

  const { data: usuario, error: usuarioError } = await supabaseServer
    .from("users")
    .select("codigo,consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  const valor = usuario?.consejo;
  const esConsejo =
    valor === true ||
    valor === "true" ||
    valor === "TRUE" ||
    valor === 1;

  if (usuarioError || !usuario || !esConsejo) return null;

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError || !miembro) return null;

  return { id: Number(miembro.id), codigo };
}

async function subirPortada(file: File) {
  if (!file.type.startsWith("image/") || file.size > 500 * 1024) {
    throw new Error("La portada no es una imagen válida.");
  }

  const nombre =
    "propuestas/" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    ".jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseServer.storage
    .from("portadas-biblioteca")
    .upload(nombre, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabaseServer.storage
    .from("portadas-biblioteca")
    .getPublicUrl(nombre);

  return { url: data.publicUrl, path: nombre };
}

function generarSlug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function slugDisponible(titulo: string) {
  const base = generarSlug(titulo) || "material-bibliografico";
  let intento = base;
  let numero = 2;

  while (true) {
    const { data, error } = await supabaseServer
      .from("biblioteca")
      .select("id")
      .eq("slug", intento)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return intento;

    intento = base + "-" + numero;
    numero += 1;
  }
}

export async function GET(req: NextRequest) {
  if (!(await validarConsejo(req))) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 },
    );
  }

  const { data, error } = await supabaseServer
    .from("biblioteca_solicitudes")
    .select(
      "id,propuesto_por_codigo,propuesto_por_nombre,titulo,autores,anio,tipo,editorial,descripcion,portada_url,portada_storage_path,enlace_url,motivo,estado,observaciones_ca,created_at,updated_at",
    )
    .eq("estado", "PENDIENTE")
    .order("updated_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, solicitudes: data || [] });
}

export async function PATCH(req: NextRequest) {
  const actor = await validarConsejo(req);

  if (!actor) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const solicitudId = String(formData.get("solicitud_id") || "").trim();
    const accion = String(formData.get("accion") || "").trim().toUpperCase();
    const observaciones = String(formData.get("observaciones") || "").trim();
    const portadaFile = formData.get("portada") as File | null;

    if (!solicitudId || !["APROBAR", "CORRECCIONES", "RECHAZAR"].includes(accion)) {
      return NextResponse.json(
        { ok: false, error: "La solicitud o la acción no son válidas." },
        { status: 400 },
      );
    }

    if (accion !== "APROBAR" && !observaciones) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Escriba las observaciones que recibirá la persona proponente.",
        },
        { status: 400 },
      );
    }

    const { data: solicitud, error: solicitudError } = await supabaseServer
      .from("biblioteca_solicitudes")
      .select("*")
      .eq("id", solicitudId)
      .eq("estado", "PENDIENTE")
      .maybeSingle();

    if (solicitudError) throw new Error(solicitudError.message);
    if (!solicitud) {
      return NextResponse.json(
        { ok: false, error: "La propuesta ya no está pendiente." },
        { status: 409 },
      );
    }

    const ahora = new Date().toISOString();

    if (accion === "APROBAR") {
      const portadaNueva =
        portadaFile && portadaFile.size > 0
          ? await subirPortada(portadaFile)
          : null;
      const portadaUrl = portadaNueva?.url || solicitud.portada_url || null;
      const portadaPath =
        portadaNueva?.path || solicitud.portada_storage_path || null;
      const slug = await slugDisponible(String(solicitud.titulo));
      const { data: material, error: materialError } = await supabaseServer
        .from("biblioteca")
        .insert({
          slug,
          titulo: solicitud.titulo,
          autores: solicitud.autores || [],
          anio: solicitud.anio,
          tipo: solicitud.tipo,
          editorial: solicitud.editorial,
          descripcion: solicitud.descripcion,
          portada_url: portadaUrl,
          enlace_url: solicitud.enlace_url,
        })
        .select("id")
        .single();

      if (materialError) {
        if (portadaNueva) {
          await supabaseServer.storage
            .from("portadas-biblioteca")
            .remove([portadaNueva.path]);
        }
        throw new Error(materialError.message);
      }

      const { error: actualizarError } = await supabaseServer
        .from("biblioteca_solicitudes")
        .update({
          estado: "APROBADA",
          observaciones_ca: observaciones || null,
          resuelto_por_miembro_id: actor.id,
          biblioteca_id: material.id,
          portada_url: portadaUrl,
          portada_storage_path: portadaPath,
          fecha_resolucion: ahora,
          updated_at: ahora,
        })
        .eq("id", solicitudId)
        .eq("estado", "PENDIENTE");

      if (actualizarError) {
        await supabaseServer.from("biblioteca").delete().eq("id", material.id);
        if (portadaNueva) {
          await supabaseServer.storage
            .from("portadas-biblioteca")
            .remove([portadaNueva.path]);
        }
        throw new Error(actualizarError.message);
      }

      if (
        portadaNueva &&
        solicitud.portada_storage_path &&
        solicitud.portada_storage_path !== portadaNueva.path
      ) {
        await supabaseServer.storage
          .from("portadas-biblioteca")
          .remove([solicitud.portada_storage_path]);
      }

      return NextResponse.json({
        ok: true,
        message: "Propuesta aprobada e incorporada a la Biblioteca.",
      });
    }

    const estado = accion === "CORRECCIONES" ? "CORRECCIONES" : "RECHAZADA";
    const { error } = await supabaseServer
      .from("biblioteca_solicitudes")
      .update({
        estado,
        observaciones_ca: observaciones,
        resuelto_por_miembro_id: actor.id,
        fecha_resolucion: ahora,
        updated_at: ahora,
        ...(estado === "RECHAZADA"
          ? { portada_url: null, portada_storage_path: null }
          : {}),
      })
      .eq("id", solicitudId)
      .eq("estado", "PENDIENTE");

    if (error) throw new Error(error.message);

    if (estado === "RECHAZADA" && solicitud.portada_storage_path) {
      await supabaseServer.storage
        .from("portadas-biblioteca")
        .remove([solicitud.portada_storage_path]);
    }

    return NextResponse.json({
      ok: true,
      message:
        estado === "CORRECCIONES"
          ? "Se solicitaron correcciones a la propuesta."
          : "La propuesta fue rechazada.",
    });
  } catch (error) {
    console.error("Error en /api/aprobacion/biblioteca:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "No fue posible procesar la propuesta bibliográfica.",
      },
      { status: 500 },
    );
  }
}