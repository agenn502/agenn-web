import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const MAX_IMAGE_BYTES = 100 * 1024;

export async function POST(request: NextRequest) {
  try {
    const codigo = String(request.headers.get("x-user-codigo") || "").trim().toUpperCase();
    if (!codigo) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });

    const { data: miembro, error: miembroError } = await supabaseServer
      .from("miembros").select("codigo").eq("codigo", codigo).maybeSingle();
    if (miembroError || !miembro) return NextResponse.json({ ok: false, error: "Miembro no encontrado." }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file") as File | null;
    const temaId = String(form.get("tema_id") || "").trim();
    const respuestaId = String(form.get("respuesta_id") || "").trim() || null;

    if (!file || !temaId) return NextResponse.json({ ok: false, error: "Falta la imagen o el tema." }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ ok: false, error: "La imagen debe pesar como máximo 100 KB." }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ ok: false, error: "Formato de imagen no admitido." }, { status: 400 });

    const { data: tema, error: temaError } = await supabaseServer
      .from("foro_temas").select("id,autor_codigo").eq("id", temaId).maybeSingle();
    if (temaError || !tema) return NextResponse.json({ ok: false, error: "La discusión no existe." }, { status: 404 });

    if (respuestaId) {
      const { data: respuesta, error: respuestaError } = await supabaseServer
        .from("foro_respuestas").select("id,tema_id,autor_codigo").eq("id", respuestaId).maybeSingle();
      if (respuestaError || !respuesta || respuesta.tema_id !== temaId) return NextResponse.json({ ok: false, error: "La respuesta no existe en esta discusión." }, { status: 404 });
      if (String(respuesta.autor_codigo).toUpperCase() !== codigo) return NextResponse.json({ ok: false, error: "No puede adjuntar una imagen a una respuesta de otro miembro." }, { status: 403 });
    } else if (String(tema.autor_codigo).toUpperCase() !== codigo) {
      return NextResponse.json({ ok: false, error: "No puede adjuntar una imagen a esta discusión." }, { status: 403 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const ruta = `${temaId}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabaseServer.storage.from("foro-imagenes").upload(ruta, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabaseServer.from("foro_imagenes").insert({ tema_id: temaId, respuesta_id: respuestaId, autor_codigo: codigo, ruta }).select("*").single();
    if (error) {
      await supabaseServer.storage.from("foro-imagenes").remove([ruta]);
      throw error;
    }
    return NextResponse.json({ ok: true, imagen: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "No fue posible subir la imagen." }, { status: 500 });
  }
}
