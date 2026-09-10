import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarMiembro(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) return null;

  const { data: usuario, error: usuarioError } = await supabaseServer
    .from("users")
    .select("codigo,nombre,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (
    usuarioError ||
    !usuario ||
    !["NOV", "INV", "NUM"].includes(usuario.nivel)
  ) {
    return null;
  }

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError || !miembro) return null;

  return {
    id: Number(miembro.id),
    codigo: String(miembro.codigo),
    nombre: String(miembro.nombre || usuario.nombre || codigo),
  };
}

async function subirPortada(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("La portada debe ser una imagen.");
  }

  if (file.size > 500 * 1024) {
    throw new Error("La portada supera el tamaño permitido.");
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

function autoresDesdeTexto(texto: string) {
  return texto
    .split(",")
    .map((autor) => autor.trim())
    .filter(Boolean);
}

function validarUrl(valor: string) {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const miembro = await validarMiembro(req);

  if (!miembro) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 },
    );
  }

  const { data, error } = await supabaseServer
    .from("biblioteca_solicitudes")
    .select(
      "id,titulo,autores,anio,tipo,editorial,descripcion,portada_url,enlace_url,motivo,estado,observaciones_ca,created_at,updated_at,fecha_resolucion",
    )
    .eq("propuesto_por_miembro_id", miembro.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, solicitudes: data || [] });
}

export async function POST(req: NextRequest) {
  const miembro = await validarMiembro(req);

  if (!miembro) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const solicitudId = String(formData.get("solicitud_id") || "").trim();
    const titulo = String(formData.get("titulo") || "").trim();
    const autoresTexto = String(formData.get("autores") || "").trim();
    const tipo = String(formData.get("tipo") || "").trim();
    const editorial = String(formData.get("editorial") || "").trim();
    const descripcion = String(formData.get("descripcion") || "").trim();
    const enlaceUrl = String(formData.get("enlace_url") || "").trim();
    const motivo = String(formData.get("motivo") || "").trim();
    const anioTexto = String(formData.get("anio") || "").trim();
    const declaracionCompartir =
      String(formData.get("declaracion_compartir") || "") === "true";
    const portadaFile = formData.get("portada") as File | null;

    if (!titulo || !autoresTexto || !enlaceUrl || !motivo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Título, autoría, enlace y razón de la propuesta son obligatorios.",
        },
        { status: 400 },
      );
    }

    if (!validarUrl(enlaceUrl)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ingrese una dirección pública válida que comience con http:// o https://.",
        },
        { status: 400 },
      );
    }

    if (!declaracionCompartir) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe confirmar que el enlace puede compartirse con la Academia.",
        },
        { status: 400 },
      );
    }

    const anio = anioTexto ? Number(anioTexto) : null;
    if (
      anio !== null &&
      (!Number.isInteger(anio) || anio < 1400 || anio > 2200)
    ) {
      return NextResponse.json(
        { ok: false, error: "El año indicado no es válido." },
        { status: 400 },
      );
    }

    const ahora = new Date().toISOString();
    let existente:
      | {
          id: string;
          estado: string;
          portada_url: string | null;
          portada_storage_path: string | null;
        }
      | null = null;

    if (solicitudId) {
      const { data, error } = await supabaseServer
        .from("biblioteca_solicitudes")
        .select("id,estado,portada_url,portada_storage_path")
        .eq("id", solicitudId)
        .eq("propuesto_por_miembro_id", miembro.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      existente = data;

      if (!existente || existente.estado !== "CORRECCIONES") {
        return NextResponse.json(
          {
            ok: false,
            error: "Esta propuesta no está disponible para corrección.",
          },
          { status: 409 },
        );
      }
    }

    const portadaNueva =
      portadaFile && portadaFile.size > 0
        ? await subirPortada(portadaFile)
        : null;

    const payload = {
      titulo,
      autores: autoresDesdeTexto(autoresTexto),
      anio,
      tipo: tipo || null,
      editorial: editorial || null,
      descripcion: descripcion || null,
      portada_url: portadaNueva?.url || existente?.portada_url || null,
      portada_storage_path:
        portadaNueva?.path || existente?.portada_storage_path || null,
      enlace_url: enlaceUrl,
      motivo,
      declaracion_compartir: true,
      estado: "PENDIENTE",
      observaciones_ca: null,
      updated_at: ahora,
      fecha_resolucion: null,
      resuelto_por_miembro_id: null,
    };

    if (solicitudId) {
      const { error } = await supabaseServer
        .from("biblioteca_solicitudes")
        .update(payload)
        .eq("id", solicitudId)
        .eq("propuesto_por_miembro_id", miembro.id);

      if (error) {
        if (portadaNueva) {
          await supabaseServer.storage
            .from("portadas-biblioteca")
            .remove([portadaNueva.path]);
        }
        throw new Error(error.message);
      }

      if (
        portadaNueva &&
        existente?.portada_storage_path &&
        existente.portada_storage_path !== portadaNueva.path
      ) {
        await supabaseServer.storage
          .from("portadas-biblioteca")
          .remove([existente.portada_storage_path]);
      }

      return NextResponse.json({
        ok: true,
        message: "Propuesta corregida y reenviada al Consejo Académico.",
      });
    }

    const { error } = await supabaseServer
      .from("biblioteca_solicitudes")
      .insert({
        ...payload,
        propuesto_por_miembro_id: miembro.id,
        propuesto_por_codigo: miembro.codigo,
        propuesto_por_nombre: miembro.nombre,
      });

    if (error) {
      if (portadaNueva) {
        await supabaseServer.storage
          .from("portadas-biblioteca")
          .remove([portadaNueva.path]);
      }
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Propuesta enviada al Consejo Académico.",
    });
  } catch (error) {
    console.error("Error en /api/biblioteca/propuestas:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "No fue posible guardar la propuesta bibliográfica.",
      },
      { status: 500 },
    );
  }
}