import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const AMBITO = "INV";

async function validarConsejo(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo) return null;

  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,consejo,estado_miembro")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;
  const valor = data.consejo;
  const esConsejo = valor === true || valor === "true" || valor === "TRUE" || valor === 1;
  if (!esConsejo || ["SUSPENDIDO", "RETIRADO", "EXPULSADO"].includes(String(data.estado_miembro || "").toUpperCase())) return null;

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError || !miembro) return null;
  return { codigo, miembroId: Number(miembro.id), nombre: miembro.nombre };
}

function mezclar<T>(lista: T[]) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function miembrosConsejoActivos() {
  const { data: usuarios, error } = await supabaseServer
    .from("users")
    .select("codigo,consejo,estado_miembro")
    .eq("consejo", true);
  if (error) throw new Error(error.message);

  const codigos = (usuarios || [])
    .filter((u: any) => !["SUSPENDIDO", "RETIRADO", "EXPULSADO"].includes(String(u.estado_miembro || "").toUpperCase()))
    .map((u: any) => String(u.codigo || "").toUpperCase())
    .filter(Boolean);
  if (!codigos.length) return [];

  const { data: miembros, error: mError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre")
    .in("codigo", codigos);
  if (mError) throw new Error(mError.message);
  return miembros || [];
}

async function asegurarAsignaciones(ensayo: any) {
  const { data: existentes, error } = await supabaseServer
    .from("revision_asignaciones")
    .select("*")
    .eq("ambito", AMBITO)
    .eq("objeto_id", ensayo.id);
  if (error) throw new Error(error.message);

  if ((existentes || []).length >= 2) {
    const esperando = (existentes || []).some((x: any) => x.estado === "ESPERANDO_REENVIO" || x.estado === "DEVUELTO");
    if (ensayo.estado_revision === "pendiente" && esperando) {
      const nuevaRonda = Math.max(...(existentes || []).map((x: any) => Number(x.ronda || 1))) + 1;
      const { error: resetError } = await supabaseServer
        .from("revision_asignaciones")
        .update({ estado: "PENDIENTE", ronda: nuevaRonda, motivo_codigo: null, observaciones: null, fecha_decision: null, updated_at: new Date().toISOString() })
        .eq("ambito", AMBITO)
        .eq("objeto_id", ensayo.id);
      if (resetError) throw new Error(resetError.message);
    }
    return;
  }

  const consejo = await miembrosConsejoActivos();
  const autor = consejo.find((m: any) => String(m.codigo).toUpperCase() === String(ensayo.autor_codigo || "").toUpperCase());
  const elegibles = consejo.filter((m: any) => !autor || Number(m.id) !== Number(autor.id));
  if (elegibles.length < 2) throw new Error("No hay al menos dos miembros elegibles del Consejo Académico para revisar este trabajo.");

  const seleccionados = mezclar(elegibles).slice(0, 2);
  const { error: insertError } = await supabaseServer.from("revision_asignaciones").insert(
    seleccionados.map((m: any) => ({ ambito: AMBITO, objeto_id: ensayo.id, revisor_miembro_id: m.id, estado: "PENDIENTE", ronda: 1 })),
  );
  if (insertError) throw new Error(insertError.message);
}

function tipoEditorial(tipoTrabajo: string | null) {
  if (tipoTrabajo === "ANALISIS_BREVE") return "NOTA_BREVE";
  if (tipoTrabajo === "NOTA_INVESTIGACION") return "NOTA_INVESTIGACION";
  return "ENSAYO";
}

async function asegurarIngresoAlBanco(ensayoId: number, actorMiembroId: number) {
  const { data: existente, error: existenteError } = await supabaseServer.from("manuscritos_editoriales").select("id").eq("ensayo_id", ensayoId).maybeSingle();
  if (existenteError) throw new Error(existenteError.message);
  if (existente) return Number(existente.id);

  const { data: trabajo, error: trabajoError } = await supabaseServer
    .from("ensayos")
    .select("id,titulo,contenido,imagen_url,fuente_imagen,autor_miembro_id,tema,tema_id,subtema_id,periodo_id,anio_inicio,anio_fin,palabras_clave,tipo_trabajo")
    .eq("id", ensayoId).eq("origen_ensayo", "FORMACION").eq("estado_revision", "aprobado").eq("seleccionado_revista", true).maybeSingle();
  if (trabajoError) throw new Error(trabajoError.message);
  if (!trabajo) return null;

  const ahora = new Date().toISOString();
  const { data: manuscrito, error: manuscritoError } = await supabaseServer.from("manuscritos_editoriales").insert({
    ensayo_id: trabajo.id, autor_miembro_id: trabajo.autor_miembro_id, origen: "FORMACION", tipo_contenido: tipoEditorial(trabajo.tipo_trabajo),
    flujo_editorial: "SIMPLIFICADO", tipo_autoria: "MIEMBRO", autor_corporativo: null, mostrar_referencia: true, edicion_ce_permitida: true,
    estado: "PUBLICABLE", titulo_actual: trabajo.titulo, contenido_actual: trabajo.contenido, imagen_url_actual: trabajo.imagen_url || null,
    fuente_imagen_actual: trabajo.fuente_imagen || null, tema: trabajo.tema || null, tema_id: trabajo.tema_id || null, subtema_id: trabajo.subtema_id || null,
    periodo_id: trabajo.periodo_id || null, anio_inicio: trabajo.anio_inicio || null, anio_fin: trabajo.anio_fin || null, palabras_clave: trabajo.palabras_clave || [],
    fecha_aval: ahora, avalado_por: actorMiembroId, updated_at: ahora,
  }).select("id").single();
  if (manuscritoError) throw new Error(manuscritoError.message);

  const manuscritoId = Number(manuscrito.id);
  const { data: version, error: versionError } = await supabaseServer.from("manuscrito_versiones").insert({
    manuscrito_id: manuscritoId, numero_version: 1, titulo: trabajo.titulo, contenido: trabajo.contenido, imagen_url: trabajo.imagen_url || null,
    fuente_imagen: trabajo.fuente_imagen || null, enviado_por: trabajo.autor_miembro_id, nota_autor: "Trabajo académico aprobado y seleccionado para Revista AGENN.",
  }).select("id").single();
  if (versionError) { await supabaseServer.from("manuscritos_editoriales").delete().eq("id", manuscritoId); throw new Error(versionError.message); }

  await supabaseServer.from("manuscrito_eventos").insert({ manuscrito_id: manuscritoId, version_id: version.id, tipo: "SELECCION", mensaje: "Trabajo académico aprobado por dos revisores del Consejo Académico y seleccionado para consideración de Revista AGENN.", actor_miembro_id: actorMiembroId });
  return manuscritoId;
}

async function registrarHistorial(objetoId: number, actorId: number, ronda: number, accion: string, motivo: string | null, observaciones: string | null) {
  const { error } = await supabaseServer.from("revision_historial").insert({ ambito: AMBITO, objeto_id: objetoId, revisor_miembro_id: actorId, ronda, accion, motivo_codigo: motivo, observaciones });
  if (error) throw new Error(error.message);
}

export async function GET(req: NextRequest) {
  try {
    const actor = await validarConsejo(req);
    if (!actor) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });

    const { data: pendientes, error } = await supabaseServer.from("ensayos")
      .select("id,titulo,slug,autor_nombre,autor_codigo,nivel,unidad_slug,tema,contenido,imagen_url,fuente_imagen,estado_revision,observaciones_revision,seleccionado_revista,tipo_trabajo,numero_palabras,numero_caracteres,revision_preliminar,fecha_revision_preliminar")
      .eq("origen_ensayo", "FORMACION").eq("estado_revision", "pendiente").order("updated_at", { ascending: true });
    if (error) throw new Error(error.message);

    for (const ensayo of pendientes || []) await asegurarAsignaciones(ensayo);

    const ids = (pendientes || []).map((e: any) => Number(e.id));
    if (!ids.length) return NextResponse.json({ ok: true, ensayos: [] });

    const { data: asignaciones, error: aError } = await supabaseServer.from("revision_asignaciones")
      .select("objeto_id,estado,ronda,motivo_codigo,observaciones")
      .eq("ambito", AMBITO).eq("revisor_miembro_id", actor.miembroId).in("objeto_id", ids);
    if (aError) throw new Error(aError.message);

    const porId = new Map((asignaciones || []).map((a: any) => [Number(a.objeto_id), a]));
    const propios = (pendientes || []).filter((e: any) => porId.has(Number(e.id))).map((e: any) => ({ ...e, revision_asignada: porId.get(Number(e.id)) }));
    return NextResponse.json({ ok: true, ensayos: propios });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible cargar las revisiones." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await validarConsejo(req);
  if (!actor) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });

  try {
    const body = await req.json();
    const ensayoId = Number(body.ensayoId);
    const accion = String(body.accion || "").trim().toLowerCase();
    if (!Number.isInteger(ensayoId) || ensayoId <= 0) return NextResponse.json({ ok: false, error: "El trabajo indicado no es válido." }, { status: 400 });

    const { data: ensayo, error: consultaError } = await supabaseServer.from("ensayos")
      .select("id,autor_codigo,unidad_slug,estado_revision,seleccionado_revista")
      .eq("id", ensayoId).eq("origen_ensayo", "FORMACION").maybeSingle();
    if (consultaError || !ensayo) return NextResponse.json({ ok: false, error: consultaError?.message || "Trabajo no encontrado." }, { status: 404 });

    if (accion === "seleccion_revista") {
      const seleccionado = Boolean(body.seleccionado);
      const { error } = await supabaseServer.from("ensayos").update({ seleccionado_revista: seleccionado, updated_at: new Date().toISOString() }).eq("id", ensayoId);
      if (error) throw new Error(error.message);
      const manuscritoId = seleccionado && ensayo.estado_revision === "aprobado" ? await asegurarIngresoAlBanco(ensayoId, actor.miembroId) : null;
      return NextResponse.json({ ok: true, manuscrito_id: manuscritoId });
    }

    const { data: asignacion, error: asigError } = await supabaseServer.from("revision_asignaciones")
      .select("id,estado,ronda").eq("ambito", AMBITO).eq("objeto_id", ensayoId).eq("revisor_miembro_id", actor.miembroId).maybeSingle();
    if (asigError) throw new Error(asigError.message);
    if (!asignacion) return NextResponse.json({ ok: false, error: "Este trabajo no fue asignado a usted para revisión." }, { status: 403 });
    if (ensayo.estado_revision !== "pendiente") return NextResponse.json({ ok: false, error: "El trabajo ya no está pendiente de revisión." }, { status: 409 });

    const ahora = new Date().toISOString();
    const devoluciones: Record<string, { motivo: string; texto: string }> = {
      devolucion_ortografia: { motivo: "ORTOGRAFIA_GRAMATICA", texto: "El trabajo se devuelve para corregir aspectos de ortografía o gramática antes de continuar con la revisión académica." },
      devolucion_citacion: { motivo: "CITACION_INADECUADA", texto: "El trabajo se devuelve porque la citación de las fuentes requiere corrección antes de continuar con la revisión académica." },
      devolucion_apa: { motivo: "REFERENCIAS_APA", texto: "El trabajo se devuelve porque las referencias bibliográficas no cumplen las normas APA requeridas." },
    };

    if (devoluciones[accion] || accion === "correcciones") {
      const rapido = devoluciones[accion];
      const observaciones = rapido ? rapido.texto : String(body.observaciones || "").trim();
      const motivo = rapido?.motivo || "OTRAS_CORRECCIONES";
      if (!observaciones) return NextResponse.json({ ok: false, error: "Debe indicar las correcciones solicitadas." }, { status: 400 });

      await supabaseServer.from("revision_asignaciones").update({ estado: "ESPERANDO_REENVIO", updated_at: ahora }).eq("ambito", AMBITO).eq("objeto_id", ensayoId);
      const { error: dError } = await supabaseServer.from("revision_asignaciones").update({ estado: "DEVUELTO", motivo_codigo: motivo, observaciones, fecha_decision: ahora, updated_at: ahora }).eq("id", asignacion.id);
      if (dError) throw new Error(dError.message);
      await registrarHistorial(ensayoId, actor.miembroId, Number(asignacion.ronda || 1), "DEVOLUCION", motivo, observaciones);

      const { error: trabajoError } = await supabaseServer.from("ensayos").update({ estado: "correcciones", estado_revision: "correcciones", observaciones_revision: observaciones, revisado_por: actor.codigo, fecha_revision: ahora, updated_at: ahora }).eq("id", ensayoId);
      if (trabajoError) throw new Error(trabajoError.message);
      const { error: progresoError } = await supabaseServer.from("progreso_inv").update({ porcentaje: 50, completada: false, fecha_actualizacion: ahora }).eq("user_codigo", ensayo.autor_codigo).eq("unidad_slug", ensayo.unidad_slug);
      if (progresoError) throw new Error(progresoError.message);
      return NextResponse.json({ ok: true, estado_revision: "correcciones" });
    }

    if (accion === "aprobar") {
      const { error: avalError } = await supabaseServer.from("revision_asignaciones").update({ estado: "AVALADO", motivo_codigo: null, observaciones: null, fecha_decision: ahora, updated_at: ahora }).eq("id", asignacion.id);
      if (avalError) throw new Error(avalError.message);
      await registrarHistorial(ensayoId, actor.miembroId, Number(asignacion.ronda || 1), "AVAL", null, null);

      const { data: avales, error: contarError } = await supabaseServer.from("revision_asignaciones").select("id").eq("ambito", AMBITO).eq("objeto_id", ensayoId).eq("estado", "AVALADO");
      if (contarError) throw new Error(contarError.message);
      const total = (avales || []).length;
      if (total < 2) return NextResponse.json({ ok: true, avales: total, requeridos: 2, aprobado: false });

      const { error: trabajoError } = await supabaseServer.from("ensayos").update({ estado: "publicado", estado_revision: "aprobado", observaciones_revision: null, revisado_por: actor.codigo, fecha_revision: ahora, evidencia_validada: false, estado_difusion: null, observaciones_difusion: null, difusion_revisada_por: null, fecha_revision_difusion: null, updated_at: ahora }).eq("id", ensayoId);
      if (trabajoError) throw new Error(trabajoError.message);
      const { error: progresoError } = await supabaseServer.from("progreso_inv").upsert({ user_codigo: ensayo.autor_codigo, unidad_slug: ensayo.unidad_slug, porcentaje: 100, completada: true, fecha_actualizacion: ahora }, { onConflict: "user_codigo,unidad_slug" });
      if (progresoError) throw new Error(progresoError.message);
      const manuscritoId = ensayo.seleccionado_revista ? await asegurarIngresoAlBanco(ensayoId, actor.miembroId) : null;
      return NextResponse.json({ ok: true, avales: 2, requeridos: 2, aprobado: true, manuscrito_id: manuscritoId });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible revisar el trabajo." }, { status: 500 });
  }
}
