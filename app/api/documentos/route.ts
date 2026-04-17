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

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("documentos_oficiales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      documentos: data || [],
    });
  } catch (err) {
    console.error("Error en GET /api/documentos:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar los documentos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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

    if (!documentoFile || documentoFile.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Debes subir el archivo del documento." },
        { status: 400 }
      );
    }

    let portadaUrl: string | null = null;

    if (portadaFile && portadaFile.size > 0) {
      portadaUrl = await subirArchivo(
        "portadas-documentos",
        portadaFile,
        "portada"
      );
    }

    const documentoUrl = await subirArchivo(
      "documentos-oficiales",
      documentoFile,
      "documento"
    );

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
      .insert([payload]);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Documento creado correctamente.",
    });
  } catch (err) {
    console.error("Error en POST /api/documentos:", err);
    return NextResponse.json(
      { ok: false, error: "Error al guardar documento." },
      { status: 500 }
    );
  }
}