import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";
import { formatearCorrelativoCertificado, prefijoRegistroCertificado } from "@/lib/certificados";

async function obtenerConsejoActivo() {
  const { data, error } = await supabaseServer.from("users").select("codigo,nombre,consejo,estado_miembro").eq("consejo", true).eq("estado_miembro", "ACTIVO");
  if (error) throw new Error(error.message); return data || [];
}
function nombreNivel(nivel: string) { if (nivel === "NOV") return "Académico Novicio"; if (nivel === "INV") return "Académico Investigador"; if (nivel === "NUM") return "Académico Numerario"; return nivel; }

async function siguienteCodigo(prefijo: "NOV" | "INV" | "NUM") {
  const [{ data: u, error: eu }, { data: m, error: em }, { data: h, error: eh }] = await Promise.all([
    supabaseServer.from("users").select("codigo").like("codigo", `${prefijo}%`),
    supabaseServer.from("miembros").select("codigo").like("codigo", `${prefijo}%`),
    supabaseServer.from("historial_miembro").select("codigo").like("codigo", `${prefijo}%`),
  ]);
  if (eu) throw new Error(eu.message); if (em) throw new Error(em.message); if (eh) throw new Error(eh.message);
  const usados = new Set<number>(); [...(u || []), ...(m || []), ...(h || [])].forEach((f) => { const x = String(f.codigo || "").match(new RegExp(`^${prefijo}(\\d+)$`)); if (x) usados.add(Number(x[1])); });
  let n = 1; while (usados.has(n)) n++; if (n > 9999) throw new Error(`No hay códigos ${prefijo} disponibles.`);
  return `${prefijo}${String(n).padStart(4, "0")}`;
}

async function generarCertificadoPromocion(codigo: string, nombre: string, nivel: "INV" | "NUM") {
  const origen = "PROMOCION_EXTRAORDINARIA";
  const { data: existente, error: ee } = await supabaseServer.from("certificados").select("id,registro").eq("codigo_miembro", codigo).eq("nivel", nivel).eq("origen_acreditacion", origen).eq("estado", "vigente").maybeSingle();
  if (ee) throw new Error(ee.message); if (existente) return existente;
  const fecha = new Date(); const prefijo = prefijoRegistroCertificado(nivel, fecha);
  const { data: registros, error: er } = await supabaseServer.from("certificados").select("registro").like("registro", `${prefijo}%`);
  if (er) throw new Error(er.message);
  let mayor = 0; for (const f of registros || []) { const r = String(f.registro || ""); if (!r.startsWith(prefijo)) continue; const n = Number(r.substring(prefijo.length)); if (Number.isInteger(n) && n > mayor) mayor = n; }
  const registro = `${prefijo}${formatearCorrelativoCertificado(mayor + 1)}`;
  const { data, error } = await supabaseServer.from("certificados").insert({ registro, codigo_miembro: codigo, nombre, nivel, origen_acreditacion: origen, fecha_emision: fecha.toISOString(), estado: "vigente" }).select("id,registro").single();
  if (error) throw new Error(error.message); return data;
}

async function marcarUnidades(tabla: "progreso_novicio" | "progreso_inv", codigo: string, cantidad = 10) {
  const ahora = new Date().toISOString();
  const unidades = Array.from({ length: cantidad }, (_, i) => `unidad-${i + 1}`);
  const { data: existentes, error: lecturaError } = await supabaseServer
    .from(tabla).select("unidad_slug,respuestas").eq("user_codigo", codigo).in("unidad_slug", unidades);
  if (lecturaError) throw new Error(lecturaError.message);
  const porUnidad = new Map((existentes || []).map((fila: any) => [String(fila.unidad_slug), fila.respuestas]));
  const filas = unidades.map((unidad) => ({
    user_codigo: codigo, unidad_slug: unidad, completada: true, porcentaje: 100,
    respuestas: porUnidad.has(unidad) ? porUnidad.get(unidad) : { promocion_extraordinaria: true, fecha: ahora },
    fecha_actualizacion: ahora,
  }));
  const { error } = await supabaseServer.from(tabla).upsert(filas, { onConflict: "user_codigo,unidad_slug" });
  if (error) throw new Error(error.message);
}

async function aplicarPromocion(propuesta: any) {
  const codigoAnterior = String(propuesta.miembro_codigo || "").toUpperCase();
  const { data: miembro, error: em } = await supabaseServer.from("miembros").select("id,codigo,nombre,nivel,estado_academico,correo").eq("codigo", codigoAnterior).maybeSingle();
  if (em || !miembro) throw new Error(em?.message || "No se encontró al miembro promovido.");
  const { data: usuario, error: eu } = await supabaseServer.from("users").select("codigo,nombre,nivel,correo").eq("codigo", codigoAnterior).maybeSingle();
  if (eu || !usuario) throw new Error(eu?.message || "No se encontró la cuenta del miembro promovido.");

  const destino = String(propuesta.nivel_propuesto).toUpperCase() as "NOV" | "INV" | "NUM";
  const modalidad = String(propuesta.modalidad_incorporacion || "");
  const ahora = new Date().toISOString();
  let codigoNuevo = codigoAnterior;

  // Si cambia el nivel institucional, se asigna el código correspondiente.
  if (String(miembro.nivel).toUpperCase() !== destino) codigoNuevo = await siguienteCodigo(destino);

  // Cerramos el nivel actual en el historial y conservamos el expediente real.
  const { data: histActual } = await supabaseServer.from("historial_miembro").select("id").eq("miembro_id", miembro.id).eq("estado", "ACTUAL").maybeSingle();
  if (histActual) {
    const { error } = await supabaseServer.from("historial_miembro").update({ estado: "COMPLETADO", fecha_fin: ahora }).eq("id", histActual.id); if (error) throw new Error(error.message);
  }

  // Mover los registros académicos que dependen del código antes de sustituirlo.
  if (codigoNuevo !== codigoAnterior) {
    for (const tabla of ["progreso_aspirante", "progreso_novicio", "progreso_inv"] as const) {
      const { error } = await supabaseServer.from(tabla).update({ user_codigo: codigoNuevo, fecha_actualizacion: ahora }).eq("user_codigo", codigoAnterior); if (error) throw new Error(error.message);
    }
    const { error: ensayosError } = await supabaseServer.from("ensayos").update({ autor_codigo: codigoNuevo }).eq("autor_codigo", codigoAnterior); if (ensayosError) throw new Error(ensayosError.message);
  }

  // Los niveles ya superados quedan disponibles como repaso. El nivel de destino
  // solo se marca completo cuando la promoción confiere una acreditación plena.
  if (destino === "INV" || destino === "NUM") await marcarUnidades("progreso_novicio", codigoNuevo);
  if (modalidad === "INV_ACREDITADO" || destino === "NUM") {
    await marcarUnidades("progreso_inv", codigoNuevo);
    const { error: cerrarEnsayosError } = await supabaseServer
      .from("ensayos")
      .update({ estado_revision: "cerrado_promocion_extraordinaria", observaciones_revision: "Requisito académico regularizado mediante Promoción extraordinaria." })
      .eq("autor_codigo", codigoNuevo)
      .in("estado_revision", ["pendiente", "correcciones"]);
    if (cerrarEnsayosError) throw new Error(cerrarEnsayosError.message);
  }
  if (destino === "NOV") {
    const { error } = await supabaseServer.from("progreso_novicio").upsert({ user_codigo: codigoNuevo, unidad_slug: "unidad-1", completada: false, porcentaje: 0, respuestas: null, fecha_actualizacion: ahora }, { onConflict: "user_codigo,unidad_slug" }); if (error) throw new Error(error.message);
  }

  const estadoAcademico = destino === "INV" ? (modalidad === "INV_ACREDITADO" ? "ACREDITADO" : "EN_FORMACION") : null;
  const origen = (modalidad === "INV_ACREDITADO" || destino === "NUM") ? "PROMOCION_EXTRAORDINARIA" : null;

  const { error: uu } = await supabaseServer.from("users").update({ codigo: codigoNuevo, nivel: destino }).eq("codigo", codigoAnterior); if (uu) throw new Error(uu.message);
  const { error: um } = await supabaseServer.from("miembros").update({ codigo: codigoNuevo, nivel: destino, estado_academico: estadoAcademico, origen_acreditacion: origen }).eq("id", miembro.id); if (um) throw new Error(um.message);
  const { error: hi } = await supabaseServer.from("historial_miembro").insert({ miembro_id: miembro.id, codigo: codigoNuevo, nivel: destino, estado: "ACTUAL", fecha_inicio: ahora, fecha_fin: null }); if (hi) throw new Error(hi.message);

  let certificado: any = null;
  if (modalidad === "INV_ACREDITADO") certificado = await generarCertificadoPromocion(codigoNuevo, miembro.nombre, "INV");
  if (destino === "NUM") certificado = await generarCertificadoPromocion(codigoNuevo, miembro.nombre, "NUM");

  const correoDestino = String(miembro.correo || usuario.correo || propuesta.correo || "").trim();
  let correo = { enviado: false, error: "El miembro no tiene correo registrado." } as { enviado: boolean; error?: string };
  if (correoDestino) {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || "";
    correo = await enviarCorreo({
      para: correoDestino,
      asunto: `AGENN | Promoción extraordinaria a ${nombreNivel(destino)}`,
      html: plantillaCorreo(`
        <p>Estimado(a) <strong>${miembro.nombre}</strong>:</p>
        <p>El Consejo Académico de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos —AGENN—, reunido en pleno, resolvió por unanimidad su <strong>Promoción extraordinaria</strong>.</p>
        <p>La resolución reconoce que, por su trayectoria, conocimientos y méritos académicos, cumple con los requisitos necesarios para ascender al nivel de <strong>${nombreNivel(destino)}</strong>.</p>
        <div style="background:#eef6e9;border-left:5px solid #6b6f1a;padding:16px;margin:20px 0;line-height:1.8;"><strong>Nivel:</strong> ${nombreNivel(destino)}<br><strong>Código institucional:</strong> ${codigoNuevo}${certificado ? `<br><strong>Certificado:</strong> ${certificado.registro}` : ""}<br><strong>Origen:</strong> Promoción extraordinaria</div>
        <p>Los contenidos académicos de las etapas regularizadas permanecerán disponibles para su consulta y repaso, sin constituir requisitos pendientes de acreditación.</p>
        ${sitio ? `<p style="text-align:center;margin:28px 0;"><a href="${sitio}/login" style="background:#6b6f1a;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Ingresar a la AGENN</a></p>` : ""}
        <p>Atentamente,<br><strong>Consejo Académico</strong><br>Academia Guatemalteca de Estudios Numismáticos y Notafílicos</p>
      `),
    });
  }

  const { error: ap } = await supabaseServer.from("asimilaciones").update({ codigo_asignado: codigoNuevo, fecha_incorporacion: ahora, fecha_aceptacion: ahora }).eq("id", propuesta.id); if (ap) throw new Error(ap.message);
  return { codigoAnterior, codigoNuevo, certificado, correo };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const asimilacionId = Number(body.asimilacionId);
    const consejeroCodigo = String(body.consejeroCodigo || "").trim().toUpperCase();
    const voto = String(body.voto || "").trim().toLowerCase();
    const comentario = String(body.comentario || "").trim();
    if (!asimilacionId || !consejeroCodigo) return NextResponse.json({ ok: false, error: "Faltan datos para registrar el voto." }, { status: 400 });
    if (!["favor", "contra"].includes(voto)) return NextResponse.json({ ok: false, error: "El voto indicado no es válido." }, { status: 400 });
    if (voto === "contra" && !comentario) return NextResponse.json({ ok: false, error: "Debe indicar la razón del voto en contra." }, { status: 400 });

    const { data: consejero, error: ec } = await supabaseServer.from("users").select("codigo,nombre,consejo,estado_miembro").eq("codigo", consejeroCodigo).maybeSingle();
    if (ec || !consejero) return NextResponse.json({ ok: false, error: "No se encontró al miembro del Consejo Académico." }, { status: 404 });
    const esConsejo = consejero.consejo === true || consejero.consejo === "true" || consejero.consejo === "TRUE" || consejero.consejo === 1;
    if (!esConsejo || String(consejero.estado_miembro || "").toUpperCase() !== "ACTIVO") return NextResponse.json({ ok: false, error: "Solo los miembros activos del Consejo Académico pueden emitir votos." }, { status: 403 });

    const { data: propuesta, error: ep } = await supabaseServer.from("asimilaciones").select("id,estado,nombre,nivel_propuesto,modalidad_incorporacion,tipo_propuesta,miembro_codigo,correo").eq("id", asimilacionId).maybeSingle();
    if (ep || !propuesta) return NextResponse.json({ ok: false, error: "No se encontró la propuesta." }, { status: 404 });
    if (propuesta.estado !== "pendiente") return NextResponse.json({ ok: false, error: "Esta propuesta ya no se encuentra pendiente de votación." }, { status: 400 });

    const { data: existente, error: ex } = await supabaseServer.from("asimilaciones_votos").select("id").eq("asimilacion_id", asimilacionId).eq("consejero_codigo", consejeroCodigo).maybeSingle();
    if (ex) throw new Error(ex.message); if (existente) return NextResponse.json({ ok: false, error: "Ya emitió su voto en esta propuesta." }, { status: 409 });
    const { error: iv } = await supabaseServer.from("asimilaciones_votos").insert({ asimilacion_id: asimilacionId, consejero_codigo: consejeroCodigo, voto, comentario: voto === "contra" ? comentario : null }); if (iv) throw new Error(iv.message);

    const consejo = await obtenerConsejoActivo();
    const { data: votos, error: ev } = await supabaseServer.from("asimilaciones_votos").select("voto").eq("asimilacion_id", asimilacionId); if (ev) throw new Error(ev.message);
    const totalConsejo = consejo.length, votosEmitidos = votos?.length || 0, votosFavor = votos?.filter((v) => v.voto === "favor").length || 0, votosContra = votos?.filter((v) => v.voto === "contra").length || 0;
    let estado = "pendiente", resultado: string | null = null, fechaResolucion: string | null = null, promocion: any = null;

    if (totalConsejo > 0 && votosEmitidos === totalConsejo) {
      fechaResolucion = new Date().toISOString();
      const nivelTexto = nombreNivel(propuesta.nivel_propuesto);
      if (votosContra === 0) {
        estado = "aprobada";
        if (propuesta.tipo_propuesta === "PROMOCION_EXTRAORDINARIA") {
          resultado = `El Consejo Académico, reunido en pleno, resuelve por unanimidad la Promoción extraordinaria de ${propuesta.nombre} al nivel de ${nivelTexto}.`;
          promocion = await aplicarPromocion(propuesta);
          estado = "promocion_ejecutada";
        } else {
          resultado = `El Consejo Académico, por unanimidad, resuelve aprobar la incorporación por asimilación de ${propuesta.nombre} al nivel de ${nivelTexto}.`;
        }
      } else {
        estado = "rechazada";
        resultado = propuesta.tipo_propuesta === "PROMOCION_EXTRAORDINARIA"
          ? `El Consejo Académico no alcanzó la unanimidad requerida para aprobar la Promoción extraordinaria de ${propuesta.nombre} al nivel de ${nivelTexto}.`
          : `El Consejo Académico no alcanzó la unanimidad requerida para aprobar la incorporación por asimilación de ${propuesta.nombre} al nivel de ${nivelTexto}.`;
      }
    }

    const { error: ua } = await supabaseServer.from("asimilaciones").update({ votos_favor: votosFavor, votos_contra: votosContra, votos_emitidos: votosEmitidos, estado, resultado, fecha_resolucion: fechaResolucion }).eq("id", asimilacionId); if (ua) throw new Error(ua.message);
    return NextResponse.json({ ok: true, votosFavor, votosContra, votosEmitidos, totalConsejo, estado, resultado, promocion });
  } catch (error) {
    console.error("Error en /api/asimilaciones/votar:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible registrar el voto." }, { status: 500 });
  }
}
