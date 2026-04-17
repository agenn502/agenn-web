import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const generarSlug = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

async function subirArchivo(bucket: string, file: File, prefijo: string) {
  const ext = file.name.split(".").pop() || "bin";
  const nombre = `${prefijo}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseServer.storage
    .from(bucket)
    .upload(nombre, buffer, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabaseServer.storage.from(bucket).getPublicUrl(nombre);
  return data.publicUrl;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const formData = await req.formData();

    const titulo = String(formData.get("titulo") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();
    const descripcion = String(formData.get("descripcion") || "").trim();

    const portadaFile = formData.get("portada") as File | null;
    const documentoFile = formData.get("documento") as File | null;

    if (!titulo) {
      return NextResponse.json(
        { ok: false, error: "Debes ingresar el título." },
        { status: 400 }
      );
    }

    const { data: actual, error: actualError } = await supabaseServer
      .from("documentos_oficiales")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (actualError) {
      return NextResponse.json(
        { ok: false, error: actualError.message },
        { status: 500 }
      );
    }

    if (!actual) {
      return NextResponse.json(
        { ok: false, error: "Documento no encontrado." },
        { status: 404 }
      );
    }

    let portadaUrl: string | null = actual.portada_url || null;
    let documentoUrl: string = actual.documento_url || "";

    if (portadaFile && portadaFile.size > 0) {
      portadaUrl = await subirArchivo(
        "portadas-documentos",
        portadaFile,
        "portada"
      );
    }

    if (documentoFile && documentoFile.size > 0) {
      documentoUrl = await subirArchivo(
        "documentos-oficiales",
        documentoFile,
        "documento"
      );
    }

    const slugFinal = slugInput ? generarSlug(slugInput) : generarSlug(titulo);

    const payload = {
      titulo,
      slug: slugFinal,
      descripcion,
      portada_url: portadaUrl,
      documento_url: documentoUrl,
    };

    const { error } = await supabaseServer
      .from("documentos_oficiales")
      .update(payload)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Documento actualizado correctamente.",
    });
  } catch (err) {
    console.error("Error en PUT /api/documentos/[id]:", err);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar documento." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { error } = await supabaseServer
      .from("documentos_oficiales")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Documento eliminado.",
    });
  } catch (err) {
    console.error("Error en DELETE /api/documentos/[id]:", err);
    return NextResponse.json(
      { ok: false, error: "Error al eliminar documento." },
      { status: 500 }
    );
  }
}