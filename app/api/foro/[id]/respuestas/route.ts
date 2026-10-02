import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const codigo = String(request.headers.get("x-user-codigo") || "")
      .trim()
      .toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "Sesión no válida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const contenido = String(body.contenido || "").trim();

    if (contenido.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Escriba una respuesta." },
        { status: 400 }
      );
    }

    const { data: miembro, error: miembroError } = await supabaseServer
      .from("miembros")
      .select("nombre")
      .eq("codigo", codigo)
      .maybeSingle();

    if (miembroError) {
      throw miembroError;
    }

    if (!miembro) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el expediente del miembro." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseServer
      .from("foro_respuestas")
      .insert({
        tema_id: id,
        autor_codigo: codigo,
        autor_nombre: miembro.nombre,
        contenido,
        respuesta_a: body.respuesta_a || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabaseServer
      .from("foro_temas")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    await supabaseServer
      .from("foro_seguimientos")
      .upsert({ tema_id: id, codigo_miembro: codigo });

    return NextResponse.json({ ok: true, respuesta: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible responder.",
      },
      { status: 500 }
    );
  }
}
