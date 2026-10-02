import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ImagenForo = {
  id: string;
  ruta: string;
  [key: string]: unknown;
};

async function agregarUrlsFirmadas(imagenes: ImagenForo[] | null | undefined) {
  if (!imagenes?.length) return [];

  return Promise.all(
    imagenes.map(async (imagen) => {
      const { data } = await supabaseServer.storage
        .from("foro-imagenes")
        .createSignedUrl(imagen.ruta, 60 * 60);

      return {
        ...imagen,
        url: data?.signedUrl || null,
      };
    })
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const codigo = String(request.headers.get("x-user-codigo") || "")
      .trim()
      .toUpperCase();

    if (!codigo) {
      return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
    }

    const { data: miembro, error: miembroError } = await supabaseServer
      .from("miembros")
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (miembroError || !miembro) {
      return NextResponse.json({ ok: false, error: "Miembro no encontrado." }, { status: 404 });
    }

    const { data: tema, error } = await supabaseServer
      .from("foro_temas")
      .select("*,foro_imagenes(*)")
      .eq("id", id)
      .single();

    if (error) throw error;

    const { data: respuestas, error: respuestasError } = await supabaseServer
      .from("foro_respuestas")
      .select("*,foro_imagenes(*)")
      .eq("tema_id", id)
      .order("created_at", { ascending: true });

    if (respuestasError) throw respuestasError;

    const temaConImagenes = {
      ...tema,
      foro_imagenes: await agregarUrlsFirmadas((tema.foro_imagenes || []) as ImagenForo[]),
    };

    const respuestasConImagenes = await Promise.all(
      (respuestas || []).map(async (respuesta) => ({
        ...respuesta,
        foro_imagenes: await agregarUrlsFirmadas(
          (respuesta.foro_imagenes || []) as ImagenForo[]
        ),
      }))
    );

    await supabaseServer.from("foro_lecturas").upsert(
      {
        tema_id: id,
        codigo_miembro: codigo,
        ultimo_leido_at: new Date().toISOString(),
      },
      { onConflict: "tema_id,codigo_miembro" }
    );

    return NextResponse.json({
      ok: true,
      tema: temaConImagenes,
      respuestas: respuestasConImagenes,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "No fue posible cargar la discusión." },
      { status: 500 }
    );
  }
}
