import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function usuarioActivo(codigoRaw: string) {
  const codigo = String(codigoRaw || "").trim().toUpperCase();
  if (!codigo) return null;
  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,nombre,nivel,consejo,estado_miembro")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error || !data) return null;
  if (String(data.estado_miembro || "").trim().toUpperCase() !== "ACTIVO") return null;
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const usuario = await usuarioActivo(req.headers.get("x-user-codigo") || "");
    if (!usuario) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });

    const vista = String(req.nextUrl.searchParams.get("vista") || "conversaciones").toLowerCase();
    if (vista === "destinatarios") {
      const { data, error } = await supabaseServer
        .from("users")
        .select("codigo,nombre,nivel,consejo,estado_miembro")
        .eq("estado_miembro", "ACTIVO")
        .neq("codigo", usuario.codigo)
        .order("nombre", { ascending: true });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, destinatarios: data || [] });
    }

    const { data: participaciones, error: pError } = await supabaseServer
      .from("mensaje_participantes")
      .select("conversacion_id,ultimo_leido_at,archivado_at")
      .eq("miembro_codigo", usuario.codigo);
    if (pError) throw new Error(pError.message);
    const archivadas = vista === "archivados";
    const visibles = (participaciones || []).filter((p: any) => archivadas ? Boolean(p.archivado_at) : !p.archivado_at);
    const ids: string[] = visibles.map((p: any) => String(p.conversacion_id));
    if (!ids.length) return NextResponse.json({ ok: true, conversaciones: [] });

    const [{ data: conversaciones, error: cError }, { data: participantes, error: ppError }, { data: mensajes, error: mError }] = await Promise.all([
      supabaseServer.from("mensaje_conversaciones").select("id,asunto,creador_codigo,created_at,updated_at").in("id", ids).order("updated_at", { ascending: false }),
      supabaseServer.from("mensaje_participantes").select("conversacion_id,miembro_codigo").in("conversacion_id", ids),
      supabaseServer.from("mensaje_hilo").select("id,conversacion_id,remitente_codigo,cuerpo,created_at").in("conversacion_id", ids).order("created_at", { ascending: true }),
    ]);
    if (cError) throw new Error(cError.message);
    if (ppError) throw new Error(ppError.message);
    if (mError) throw new Error(mError.message);

    const codigos: string[] = [...new Set<string>((participantes || []).map((p: any) => String(p.miembro_codigo)))];
    const nombres = new Map<string, string>();
    if (codigos.length) {
      const { data: personas, error } = await supabaseServer.from("users").select("codigo,nombre").in("codigo", codigos);
      if (error) throw new Error(error.message);
      for (const p of personas || []) nombres.set(String(p.codigo), String(p.nombre || p.codigo));
    }

    const lectura = new Map<string, string | null>(visibles.map((p: any) => [String(p.conversacion_id), p.ultimo_leido_at ? String(p.ultimo_leido_at) : null]));
    const resultado = (conversaciones || []).map((c: any) => {
      const ps = (participantes || []).filter((p: any) => String(p.conversacion_id) === String(c.id));
      const ms = (mensajes || []).filter((m: any) => String(m.conversacion_id) === String(c.id));
      const ultimo = ms.length ? ms[ms.length - 1] : null;
      const ultimoLeido = lectura.get(String(c.id)) || null;
      const noLeido = Boolean(ultimo && String(ultimo.remitente_codigo) !== String(usuario.codigo) && (!ultimoLeido || new Date(ultimo.created_at).getTime() > new Date(ultimoLeido).getTime()));
      return {
        ...c,
        participantes: ps.map((p: any) => ({ codigo: p.miembro_codigo, nombre: nombres.get(String(p.miembro_codigo)) || p.miembro_codigo })),
        ultimo_mensaje: ultimo ? { cuerpo: ultimo.cuerpo, remitente_codigo: ultimo.remitente_codigo, remitente_nombre: nombres.get(String(ultimo.remitente_codigo)) || ultimo.remitente_codigo, created_at: ultimo.created_at } : null,
        no_leido: noLeido,
      };
    });
    return NextResponse.json({ ok: true, conversaciones: resultado });
  } catch (error) {
    console.error("Error en /api/mensajes GET:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible cargar las conversaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const remitente = await usuarioActivo(req.headers.get("x-user-codigo") || "");
    if (!remitente) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    const body = await req.json();
    const asunto = String(body.asunto || "").trim();
    const cuerpo = String(body.cuerpo || "").trim();
    const recibidos: unknown[] = Array.isArray(body.destinatarios_codigos) ? body.destinatarios_codigos : [];
    const normalizados = recibidos.map(x => String(x || "").trim().toUpperCase()).filter(Boolean);
    const codigos: string[] = [...new Set<string>(normalizados)].filter(c => c !== String(remitente.codigo).toUpperCase());
    if (!codigos.length || !asunto || !cuerpo) return NextResponse.json({ ok: false, error: "Seleccione al menos un destinatario y complete asunto y mensaje." }, { status: 400 });
    if (asunto.length > 180 || cuerpo.length > 12000) return NextResponse.json({ ok: false, error: "El asunto o el mensaje exceden la longitud permitida." }, { status: 400 });

    const { data: activos, error: aError } = await supabaseServer.from("users").select("codigo").in("codigo", codigos).eq("estado_miembro", "ACTIVO");
    if (aError) throw new Error(aError.message);
    const validos = new Set<string>((activos || []).map((x: any) => String(x.codigo).toUpperCase()));
    if (codigos.some(c => !validos.has(c))) return NextResponse.json({ ok: false, error: "Uno o más participantes ya no están disponibles." }, { status: 409 });

    const ahora = new Date().toISOString();
    const { data: conversacion, error: cError } = await supabaseServer
      .from("mensaje_conversaciones")
      .insert({ asunto, creador_codigo: remitente.codigo, created_at: ahora, updated_at: ahora })
      .select("id,asunto")
      .single();
    if (cError || !conversacion) throw new Error(cError?.message || "No fue posible crear la conversación.");

    const participantes = [String(remitente.codigo).toUpperCase(), ...codigos].map(miembro_codigo => ({ conversacion_id: conversacion.id, miembro_codigo, ultimo_leido_at: miembro_codigo === String(remitente.codigo).toUpperCase() ? ahora : null }));
    const { error: pError } = await supabaseServer.from("mensaje_participantes").insert(participantes);
    if (pError) throw new Error(pError.message);
    const { error: mError } = await supabaseServer.from("mensaje_hilo").insert({ conversacion_id: conversacion.id, remitente_codigo: remitente.codigo, cuerpo, created_at: ahora });
    if (mError) throw new Error(mError.message);
    return NextResponse.json({ ok: true, conversacion_id: conversacion.id });
  } catch (error) {
    console.error("Error en /api/mensajes POST:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible crear la conversación." }, { status: 500 });
  }
}
