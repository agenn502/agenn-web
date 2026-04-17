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

async function subirPortada(file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const nombre = `portada-biblio-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseServer.storage
    .from("portadas-biblioteca")
    .upload(nombre, buffer, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabaseServer.storage
    .from("portadas-biblioteca")
    .getPublicUrl(nombre);

  return data.publicUrl;
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("biblioteca")
      .select("*")
      .order("anio", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch (err) {
    console.error("Error en GET /api/biblioteca:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo cargar la biblioteca." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const titulo = String(formData.get("titulo") || "").trim();
    const autoresTexto = String(formData.get("autores") || "").trim();
    const anioTexto = String(formData.get("anio") || "").trim();
    const tipo = String(formData.get("tipo") || "").trim();
    const editorial = String(formData.get("editorial") || "").trim();
    const descripcion = String(formData.get("descripcion") || "").trim();
    const slugTexto = String(formData.get("slug") || "").trim();
    const enlaceUrl = String(formData.get("enlace_url") || "").trim();

    const portadaFile = formData.get("portada") as File | null;

    if (!titulo || !enlaceUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Título y enlace del documento son obligatorios.",
        },
        { status: 400 }
      );
    }

    let portadaUrl: string | null = null;

    if (portadaFile && portadaFile.size > 0) {
      portadaUrl = await subirPortada(portadaFile);
    }

    const payload = {
      slug: slugTexto ? generarSlug(slugTexto) : generarSlug(titulo),
      titulo,
      autores: autoresTexto
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      anio: anioTexto ? Number(anioTexto) : null,
      tipo: tipo || null,
      editorial: editorial || null,
      descripcion: descripcion || null,
      portada_url: portadaUrl,
      enlace_url: enlaceUrl,
    };

    const { error } = await supabaseServer.from("biblioteca").insert([payload]);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Material agregado correctamente.",
    });
  } catch (err) {
    console.error("Error en POST /api/biblioteca:", err);
    return NextResponse.json(
      { ok: false, error: "Error al guardar material." },
      { status: 500 }
    );
  }
}