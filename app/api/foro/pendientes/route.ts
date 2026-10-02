import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const codigo = String(request.headers.get("x-user-codigo") || "").trim().toUpperCase();
    if (!codigo) return NextResponse.json({ ok: true, total: 0 });

    const [{ data: temas, error: temasError }, { data: lecturas, error: lecturasError }, { data: seguimientos, error: seguimientosError }] = await Promise.all([
      supabaseServer.from("foro_temas").select("id,autor_codigo,created_at,updated_at").order("updated_at", { ascending: false }).limit(200),
      supabaseServer.from("foro_lecturas").select("tema_id,ultimo_leido_at").eq("codigo_miembro", codigo),
      supabaseServer.from("foro_seguimientos").select("tema_id").eq("codigo_miembro", codigo),
    ]);

    if (temasError) throw temasError;
    if (lecturasError) throw lecturasError;
    if (seguimientosError) throw seguimientosError;

    const lecturaPorTema = new Map((lecturas || []).map((x) => [x.tema_id, new Date(x.ultimo_leido_at).getTime()]));
    const seguidos = new Set((seguimientos || []).map((x) => x.tema_id));
    const idsSeguidos = [...seguidos];

    let respuestas: { tema_id: string; autor_codigo: string; created_at: string }[] = [];
    if (idsSeguidos.length) {
      const { data, error } = await supabaseServer
        .from("foro_respuestas")
        .select("tema_id,autor_codigo,created_at")
        .in("tema_id", idsSeguidos)
        .neq("autor_codigo", codigo)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      respuestas = data || [];
    }

    const respuestaNuevaPorTema = new Map<string, number>();
    for (const r of respuestas) {
      const fecha = new Date(r.created_at).getTime();
      const actual = respuestaNuevaPorTema.get(r.tema_id) || 0;
      if (fecha > actual) respuestaNuevaPorTema.set(r.tema_id, fecha);
    }

    let total = 0;
    for (const tema of temas || []) {
      const leido = lecturaPorTema.get(tema.id) || 0;
      const creado = new Date(tema.created_at).getTime();

      // Toda discusión nueva creada por otra persona es una novedad para el miembro.
      const temaNuevo = String(tema.autor_codigo).toUpperCase() !== codigo && creado > leido;

      // Las respuestas generan alerta en discusiones que el miembro sigue
      // (crear un tema o responderlo lo agrega automáticamente al seguimiento).
      const respuestaNueva = seguidos.has(tema.id) && (respuestaNuevaPorTema.get(tema.id) || 0) > leido;

      if (temaNuevo || respuestaNueva) total += 1;
    }

    return NextResponse.json({ ok: true, total });
  } catch (e) {
    return NextResponse.json({ ok: false, total: 0, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
