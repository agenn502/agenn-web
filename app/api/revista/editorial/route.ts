import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const AMBITO = "REVISTA";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

function mezclar<T>(lista: T[]) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function asegurarAsignaciones(manuscrito: any) {
  if (!["CANDIDATO", "EN_REVISION", "REENVIADO"].includes(String(manuscrito.estado))) return;

  const { data: existentes, error } = await supabaseServer.from("revision_asignaciones")
    .select("id,revisor_miembro_id,estado,ronda")
    .eq("ambito", AMBITO).eq("objeto_id", manuscrito.id);
  if (error) throw new Error(error.message);

  if ((existentes || []).length >= 2) {
    if (manuscrito.estado === "REENVIADO") {
      const nuevaRonda = Math.max(...(existentes || []).map((x: any) => Number(x.ronda || 1))) + 1;
      const ahora = new Date().toISOString();
      const { error: resetError } = await supabaseServer.from("revision_asignaciones")
        .update({ estado: "PENDIENTE", ronda: nuevaRonda, motivo_codigo: null, observaciones: null, fecha_decision: null, updated_at: ahora })
        .eq("ambito", AMBITO).eq("objeto_id", manuscrito.id);
      if (resetError) throw new Error(resetError.message);
      const { error: estadoError } = await supabaseServer.from("manuscritos_editoriales")
        .update({ estado: "EN_REVISION", updated_at: ahora }).eq("id", manuscrito.id);
      if (estadoError) throw new Error(estadoError.message);
      manuscrito.estado = "EN_REVISION";
    }
    return;
  }

  const { data: ce, error: ceError } = await supabaseServer.from("consejo_editorial_miembros")
    .select("miembro_id,activo").eq("activo", true);
  if (ceError) throw new Error(ceError.message);

  const elegibles = (ce || []).filter((x: any) => Number(x.miembro_id) !== Number(manuscrito.autor_miembro_id));
  if (elegibles.length < 2) throw new Error(`El manuscrito ${manuscrito.id} no tiene dos revisores editoriales elegibles.`);
  const seleccionados = mezclar(elegibles).slice(0, 2);
  const ahora = new Date().toISOString();

  const { error: insertError } = await supabaseServer.from("revision_asignaciones").insert(
    seleccionados.map((x: any) => ({ ambito: AMBITO, objeto_id: manuscrito.id, revisor_miembro_id: x.miembro_id, estado: "PENDIENTE", ronda: 1 })),
  );
  if (insertError) throw new Error(insertError.message);

  if (manuscrito.estado === "CANDIDATO") {
    const { error: estadoError } = await supabaseServer.from("manuscritos_editoriales").update({ estado: "EN_REVISION", updated_at: ahora }).eq("id", manuscrito.id);
    if (estadoError) throw new Error(estadoError.message);
    manuscrito.estado = "EN_REVISION";
  }
}

export async function GET(req: NextRequest) {
  try {
    const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));
    if (!codigo) return NextResponse.json({ ok: false, error: "No se indicó el código del usuario." }, { status: 401 });

    const { data: miembro, error: miembroError } = await supabaseServer.from("miembros").select("id,codigo,nombre,nivel").eq("codigo", codigo).maybeSingle();
    if (miembroError) throw new Error(miembroError.message);
    if (!miembro) return NextResponse.json({ ok: false, error: "No se encontró el miembro." }, { status: 401 });

    const { data: registroCE, error: ceError } = await supabaseServer.from("consejo_editorial_miembros").select("id,rol,activo").eq("miembro_id", miembro.id).eq("activo", true).maybeSingle();
    if (ceError) throw new Error(ceError.message);
    if (!registroCE) return NextResponse.json({ ok: false, error: "El usuario no pertenece actualmente al Consejo Editorial." }, { status: 403 });

    if (req.nextUrl.searchParams.get("acceso_prueba") === "1") {
      const { data: numeroPrueba, error: numeroPruebaError } = await supabaseServer.from("revistas").select("id,slug,titulo").eq("estado", "PUBLICADA").ilike("titulo", "prueba").order("anio", { ascending: false }).order("numero", { ascending: false }).limit(1).maybeSingle();
      if (numeroPruebaError) throw new Error(numeroPruebaError.message);
      return NextResponse.json({ ok: true, numero_prueba: numeroPrueba ? { id: Number(numeroPrueba.id), slug: String(numeroPrueba.slug || ""), titulo: String(numeroPrueba.titulo || "Prueba") } : null });
    }

    const { data: manuscritos, error: manuscritosError } = await supabaseServer.from("manuscritos_editoriales")
      .select("id,ensayo_id,autor_miembro_id,origen,tipo_contenido,estado,titulo_actual,tema,fecha_ingreso,fecha_aval,created_at,updated_at")
      .not("estado", "in", '(BORRADOR,CORRECCIONES)').order("fecha_ingreso", { ascending: false });
    if (manuscritosError) throw new Error(manuscritosError.message);

    const lista = manuscritos || [];
    for (const manuscrito of lista) await asegurarAsignaciones(manuscrito);

    const autorIds = [...new Set(lista.map((m: any) => Number(m.autor_miembro_id)).filter(Boolean))];
    let autores: any[] = [];
    if (autorIds.length) {
      const { data, error } = await supabaseServer.from("miembros").select("id,codigo,nombre,nivel").in("id", autorIds);
      if (error) throw new Error(error.message);
      autores = data || [];
    }
    const autoresPorId = new Map(autores.map((a: any) => [Number(a.id), a]));

    const manuscritoIds = lista.map((m: any) => Number(m.id));
    let versiones: any[] = [];
    let asignaciones: any[] = [];
    if (manuscritoIds.length) {
      const { data, error } = await supabaseServer.from("manuscrito_versiones").select("id,manuscrito_id,numero_version,created_at").in("manuscrito_id", manuscritoIds).order("numero_version", { ascending: false });
      if (error) throw new Error(error.message);
      versiones = data || [];

      const { data: asig, error: aError } = await supabaseServer.from("revision_asignaciones")
        .select("objeto_id,revisor_miembro_id,estado,ronda,motivo_codigo,observaciones")
        .eq("ambito", AMBITO).in("objeto_id", manuscritoIds);
      if (aError) throw new Error(aError.message);
      asignaciones = asig || [];
    }

    const versionPorManuscrito = new Map<number, any>();
    for (const version of versiones) if (!versionPorManuscrito.has(Number(version.manuscrito_id))) versionPorManuscrito.set(Number(version.manuscrito_id), version);

    const resultado = lista.map((manuscrito: any) => {
      const autor = autoresPorId.get(Number(manuscrito.autor_miembro_id));
      const version = versionPorManuscrito.get(Number(manuscrito.id));
      const revisores = asignaciones.filter((a: any) => Number(a.objeto_id) === Number(manuscrito.id));
      const miAsignacion = revisores.find((a: any) => Number(a.revisor_miembro_id) === Number(miembro.id)) || null;
      return {
        ...manuscrito,
        autor: autor ? { id: autor.id, codigo: autor.codigo, nombre: autor.nombre, nivel: autor.nivel } : null,
        version_actual: version?.numero_version || null,
        version_id: version?.id || null,
        revision_asignada: miAsignacion,
        avales: revisores.filter((a: any) => a.estado === "AVALADO").length,
        revisores_requeridos: 2,
      };
    });

    return NextResponse.json({ ok: true, consejo_editorial: { miembro_id: miembro.id, codigo: miembro.codigo, nombre: miembro.nombre, rol: registroCE.rol }, manuscritos: resultado });
  } catch (error) {
    console.error("Error GET /api/revista/editorial:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible cargar la gestión editorial." }, { status: 500 });
  }
}
