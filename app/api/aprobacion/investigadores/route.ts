import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarConsejo(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo) return null;

  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;
  const valor = data.consejo;
  const esConsejo =
    valor === true || valor === "true" || valor === "TRUE" || valor === 1;
  if (!esConsejo) return null;

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError || !miembro) return null;
  return { codigo, miembroId: Number(miembro.id) };
}

function tipoEditorial(tipoTrabajo: string | null) {
  if (tipoTrabajo === "ANALISIS_BREVE") return "NOTA_BREVE";
  if (tipoTrabajo === "NOTA_INVESTIGACION") return "NOTA_INVESTIGACION";
  return "ENSAYO";
}

async function asegurarIngresoAlBanco(ensayoId: number, actorMiembroId: number) {
  const { data: existente, error: existenteError } = await supabaseServer
    .from("manuscritos_editoriales")
    .select("id")
    .eq("ensayo_id", ensayoId)
    .maybeSingle();

  if (existenteError) throw new Error(existenteError.message);
  if (existente) return Number(existente.id);

  const { data: trabajo, error: trabajoError } = await supabaseServer
    .from("ensayos")
    .select(
      "id,titulo,contenido,imagen_url,fuente_imagen,autor_miembro_id,tema,tema_id,subtema_id,periodo_id,anio_inicio,anio_fin,palabras_clave,tipo_trabajo"
    )
    .eq("id", ensayoId)
    .eq("origen_ensayo", "FORMACION")
    .eq("estado_revision", "aprobado")
    .eq("seleccionado_revista", true)
    .maybeSingle();

  if (trabajoError) throw new Error(trabajoError.message);
  if (!trabajo) return null;

  const ahora = new Date().toISOString();
  const { data: manuscrito, error: manuscritoError } = await supabaseServer
    .from("manuscritos_editoriales")
    .insert({
      ensayo_id: trabajo.id,
      autor_miembro_id: trabajo.autor_miembro_id,
      origen: "FORMACION",
      tipo_contenido: tipoEditorial(trabajo.tipo_trabajo),
      flujo_editorial: "SIMPLIFICADO",
      tipo_autoria: "MIEMBRO",
      autor_corporativo: null,
      mostrar_referencia: true,
      edicion_ce_permitida: true,
      estado: "PUBLICABLE",
      titulo_actual: trabajo.titulo,
      contenido_actual: trabajo.contenido,
      imagen_url_actual: trabajo.imagen_url || null,
      fuente_imagen_actual: trabajo.fuente_imagen || null,
      tema: trabajo.tema || null,
      tema_id: trabajo.tema_id || null,
      subtema_id: trabajo.subtema_id || null,
      periodo_id: trabajo.periodo_id || null,
      anio_inicio: trabajo.anio_inicio || null,
      anio_fin: trabajo.anio_fin || null,
      palabras_clave: trabajo.palabras_clave || [],
      fecha_aval: ahora,
      avalado_por: actorMiembroId,
      updated_at: ahora,
    })
    .select("id")
    .single();

  if (manuscritoError) throw new Error(manuscritoError.message);

  const manuscritoId = Number(manuscrito.id);
  const { data: version, error: versionError } = await supabaseServer
    .from("manuscrito_versiones")
    .insert({
      manuscrito_id: manuscritoId,
      numero_version: 1,
      titulo: trabajo.titulo,
      contenido: trabajo.contenido,
      imagen_url: trabajo.imagen_url || null,
      fuente_imagen: trabajo.fuente_imagen || null,
      enviado_por: trabajo.autor_miembro_id,
      nota_autor: "Trabajo académico aprobado y seleccionado para Revista AGENN.",
    })
    .select("id")
    .single();

  if (versionError) {
    await supabaseServer
      .from("manuscritos_editoriales")
      .delete()
      .eq("id", manuscritoId);
    throw new Error(versionError.message);
  }

  const { error: eventoError } = await supabaseServer
    .from("manuscrito_eventos")
    .insert({
      manuscrito_id: manuscritoId,
      version_id: version.id,
      tipo: "SELECCION",
      mensaje: "Trabajo académico seleccionado por el Consejo Académico para consideración de Revista AGENN.",
      actor_miembro_id: actorMiembroId,
    });

  if (eventoError) {
    console.warn("No fue posible registrar el evento de selección:", eventoError.message);
  }

  return manuscritoId;
}

export async function GET(req: NextRequest) {
  if (!(await validarConsejo(req))) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseServer
    .from("ensayos")
    .select(
      "id,titulo,slug,autor_nombre,autor_codigo,nivel,unidad_slug,tema,contenido,imagen_url,fuente_imagen,estado_revision,observaciones_revision,seleccionado_revista,tipo_trabajo,numero_palabras,numero_caracteres"
    )
    .eq("origen_ensayo", "FORMACION")
    .eq("estado_revision", "pendiente")
    .order("updated_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ensayos: data || [] });
}

export async function PATCH(req: NextRequest) {
  const actor = await validarConsejo(req);
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: "Acceso no autorizado." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const ensayoId = Number(body.ensayoId);
    const accion = String(body.accion || "");

    if (!Number.isInteger(ensayoId) || ensayoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "El trabajo indicado no es válido." },
        { status: 400 }
      );
    }

    const { data: ensayo, error: consultaError } = await supabaseServer
      .from("ensayos")
      .select("id,autor_codigo,unidad_slug,estado_revision,seleccionado_revista")
      .eq("id", ensayoId)
      .eq("origen_ensayo", "FORMACION")
      .maybeSingle();

    if (consultaError || !ensayo) {
      return NextResponse.json(
        { ok: false, error: consultaError?.message || "Trabajo no encontrado." },
        { status: 404 }
      );
    }

    const ahora = new Date().toISOString();

    if (accion === "seleccion_revista") {
      const seleccionado = Boolean(body.seleccionado);
      const { error } = await supabaseServer
        .from("ensayos")
        .update({
          seleccionado_revista: seleccionado,
          updated_at: ahora,
        })
        .eq("id", ensayoId);

      if (error) throw new Error(error.message);
      const manuscritoId =
        seleccionado && ensayo.estado_revision === "aprobado"
          ? await asegurarIngresoAlBanco(ensayoId, actor.miembroId)
          : null;
      return NextResponse.json({ ok: true, manuscrito_id: manuscritoId });
    }

    if (ensayo.estado_revision !== "pendiente") {
      return NextResponse.json(
        { ok: false, error: "El trabajo ya no está pendiente de revisión." },
        { status: 409 }
      );
    }

    if (accion === "correcciones") {
      const observaciones = String(body.observaciones || "").trim();
      if (!observaciones) {
        return NextResponse.json(
          { ok: false, error: "Debe indicar las correcciones solicitadas." },
          { status: 400 }
        );
      }

      const { error: trabajoError } = await supabaseServer
        .from("ensayos")
        .update({
          estado: "correcciones",
          estado_revision: "correcciones",
          observaciones_revision: observaciones,
          revisado_por: actor.codigo,
          fecha_revision: ahora,
          updated_at: ahora,
        })
        .eq("id", ensayoId);

      if (trabajoError) throw new Error(trabajoError.message);

      const { error: progresoError } = await supabaseServer
        .from("progreso_inv")
        .update({ porcentaje: 50, completada: false, fecha_actualizacion: ahora })
        .eq("user_codigo", ensayo.autor_codigo)
        .eq("unidad_slug", ensayo.unidad_slug);

      if (progresoError) throw new Error(progresoError.message);
      return NextResponse.json({ ok: true });
    }

    if (accion === "aprobar") {
      const { error: trabajoError } = await supabaseServer
        .from("ensayos")
        .update({
          estado: "publicado",
          estado_revision: "aprobado",
          observaciones_revision: null,
          revisado_por: actor.codigo,
          fecha_revision: ahora,
          evidencia_validada: false,
          estado_difusion: null,
          observaciones_difusion: null,
          difusion_revisada_por: null,
          fecha_revision_difusion: null,
          updated_at: ahora,
        })
        .eq("id", ensayoId);

      if (trabajoError) throw new Error(trabajoError.message);

      const { error: progresoError } = await supabaseServer
        .from("progreso_inv")
        .upsert(
          {
            user_codigo: ensayo.autor_codigo,
            unidad_slug: ensayo.unidad_slug,
            porcentaje: 100,
            completada: true,
            fecha_actualizacion: ahora,
          },
          { onConflict: "user_codigo,unidad_slug" }
        );

      if (progresoError) throw new Error(progresoError.message);
      const manuscritoId = ensayo.seleccionado_revista
        ? await asegurarIngresoAlBanco(ensayoId, actor.miembroId)
        : null;
      return NextResponse.json({ ok: true, manuscrito_id: manuscritoId });
    }

    return NextResponse.json(
      { ok: false, error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible revisar el trabajo.",
      },
      { status: 500 }
    );
  }
}