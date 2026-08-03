import { randomBytes, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";

async function validarConsejo(codigo: string) {
  const { data } = await supabaseServer
    .from("users")
    .select("consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  const valor = data?.consejo;
  return valor === true || valor === "true" || valor === "TRUE" || valor === 1;
}

function generarPasswordTemporal() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (byte) => caracteres[byte % caracteres.length]).join("");
}

async function siguienteCodigo(nivel: "ASP" | "INV") {
  const [{ data: usuarios }, { data: miembros }] = await Promise.all([
    supabaseServer.from("users").select("codigo").like("codigo", `${nivel}%`),
    supabaseServer.from("miembros").select("codigo").like("codigo", `${nivel}%`),
  ]);

  const usados = new Set<number>();
  [...(usuarios || []), ...(miembros || [])].forEach((row) => {
    const match = String(row.codigo || "").match(new RegExp(`^${nivel}(\\d+)$`));
    if (match) usados.add(Number(match[1]));
  });

  let numero = 1;
  while (usados.has(numero)) numero += 1;
  return `${nivel}${String(numero).padStart(4, "0")}`;
}

async function registrarHistorial(params: {
  candidatoId: string;
  codigo: string;
  accion: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  detalle: string;
  actorCodigo: string;
  visibleCandidato: boolean;
}) {
  return supabaseServer.from("candidatos_historial").insert({
    candidato_id: params.candidatoId,
    codigo_candidato: params.codigo,
    accion: params.accion,
    estado_anterior: params.estadoAnterior,
    estado_nuevo: params.estadoNuevo,
    detalle: params.detalle,
    actor_codigo: params.actorCodigo,
    visible_candidato: params.visibleCandidato,
  });
}

export async function GET(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo || !(await validarConsejo(codigo))) {
    return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("candidatos")
    .select("*")
    .in("estado", ["pendiente", "reenviada"])
    .order("fecha_solicitud", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const candidatos = await Promise.all(
    (data || []).map(async (candidato) => {
      let foto_firmada: string | null = null;
      if (candidato.foto_url) {
        const { data: firma } = await supabaseServer.storage
          .from("candidatos-fotos")
          .createSignedUrl(candidato.foto_url, 60 * 30);
        foto_firmada = firma?.signedUrl || null;
      }
      return { ...candidato, foto_firmada };
    })
  );

  return NextResponse.json({ ok: true, candidatos });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const actorCodigo = String(body.actorCodigo || "").trim().toUpperCase();
  const candidatoId = String(body.candidatoId || "").trim();
  const accion = String(body.accion || "").trim();

  if (!actorCodigo || !(await validarConsejo(actorCodigo))) {
    return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
  }

  const { data: candidato, error: candidatoError } = await supabaseServer
    .from("candidatos")
    .select("*")
    .eq("id", candidatoId)
    .maybeSingle();

  if (candidatoError || !candidato) {
    return NextResponse.json({ ok: false, error: "No se encontró el expediente." }, { status: 404 });
  }

  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const nombreCompleto = `${candidato.nombres} ${candidato.apellidos}`.trim();

  if (accion === "correcciones") {
    const observaciones = String(body.observacionesCandidato || "").trim();
    const privadas = String(body.observacionesPrivadas || "").trim();
    if (!observaciones) {
      return NextResponse.json({ ok: false, error: "Escriba las correcciones solicitadas." }, { status: 400 });
    }

    const token = randomUUID();
    const expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseServer
      .from("candidatos")
      .update({
        estado: "correcciones_solicitadas",
        observaciones_candidato: observaciones,
        observaciones_privadas: privadas || null,
        revisado_por_codigo: actorCodigo,
        fecha_revision: new Date().toISOString(),
        token_correccion: token,
        token_correccion_expira: expira,
      })
      .eq("id", candidato.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await registrarHistorial({
      candidatoId: candidato.id,
      codigo: candidato.codigo,
      accion: "correcciones_solicitadas",
      estadoAnterior: candidato.estado,
      estadoNuevo: "correcciones_solicitadas",
      detalle: observaciones,
      actorCodigo,
      visibleCandidato: true,
    });

    const enlace = `${sitio}/corregir-solicitud?token=${encodeURIComponent(token)}`;
    const correo = await enviarCorreo({
      para: candidato.correo,
      asunto: `AGENN | Correcciones solicitadas a ${candidato.codigo}`,
      html: plantillaCorreo(`
        <p>Estimado(a) <strong>${nombreCompleto}</strong>:</p>
        <p>El Consejo Académico revisó su solicitud <strong>${candidato.codigo}</strong> y requiere que complete o corrija la siguiente información:</p>
        <div style="background:#fff8e5;border-left:5px solid #b08a3c;padding:14px">${observaciones.replace(/\n/g, "<br>")}</div>
        <p>Puede actualizar su expediente mediante el siguiente enlace:</p>
        <p style="text-align:center"><a href="${enlace}" style="background:#6b4f2a;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Corregir mi solicitud</a></p>
        <p>El enlace estará disponible durante 30 días.</p>
      `),
    });

    await supabaseServer.from("candidatos").update({
      ultimo_correo_enviado: correo.enviado ? new Date().toISOString() : null,
      ultimo_error_correo: correo.error || null,
    }).eq("id", candidato.id);

    return NextResponse.json({ ok: true, correo });
  }

  if (accion === "rechazar") {
    const privadas = String(body.observacionesPrivadas || "").trim();
    const mensajePublico = String(body.observacionesCandidato || "").trim();
    if (!privadas) {
      return NextResponse.json({ ok: false, error: "Registre el fundamento privado de la decisión." }, { status: 400 });
    }

    const ahora = new Date().toISOString();
    const { error } = await supabaseServer.from("candidatos").update({
      estado: "rechazada",
      observaciones_privadas: privadas,
      observaciones_candidato: mensajePublico || null,
      revisado_por_codigo: actorCodigo,
      fecha_revision: ahora,
      fecha_resolucion: ahora,
      token_correccion: null,
      token_correccion_expira: null,
    }).eq("id", candidato.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await registrarHistorial({
      candidatoId: candidato.id,
      codigo: candidato.codigo,
      accion: "candidatura_rechazada",
      estadoAnterior: candidato.estado,
      estadoNuevo: "rechazada",
      detalle: mensajePublico || "Resolución de no aprobación emitida por el Consejo Académico.",
      actorCodigo,
      visibleCandidato: true,
    });

    const correo = await enviarCorreo({
      para: candidato.correo,
      asunto: `AGENN | Resolución de la solicitud ${candidato.codigo}`,
      html: plantillaCorreo(`
        <p>Estimado(a) <strong>${nombreCompleto}</strong>:</p>
        <p>Agradecemos sinceramente el interés manifestado en formar parte de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.</p>
        <p>Luego de revisar integralmente la información presentada y deliberar conforme a los criterios institucionales de la Academia, el Consejo Académico resolvió no aprobar su solicitud de ingreso en esta oportunidad.</p>
        ${mensajePublico ? `<p>${mensajePublico.replace(/\n/g, "<br>")}</p>` : ""}
        <p>Le agradecemos la confianza depositada en la AGENN y le deseamos éxitos en sus actividades futuras.</p>
      `),
    });

    await supabaseServer.from("candidatos").update({
      ultimo_correo_enviado: correo.enviado ? new Date().toISOString() : null,
      ultimo_error_correo: correo.error || null,
    }).eq("id", candidato.id);

    return NextResponse.json({ ok: true, correo });
  }

  if (accion === "aprobar") {
    const nivel = String(body.nivel || "").trim().toUpperCase();
    const privadas = String(body.observacionesPrivadas || "").trim();
    if (nivel !== "ASP" && nivel !== "INV") {
      return NextResponse.json({ ok: false, error: "Seleccione ASP o INV." }, { status: 400 });
    }

    const codigoMiembro = await siguienteCodigo(nivel as "ASP" | "INV");
    const passwordTemporal = generarPasswordTemporal();
    let fotoMiembro: string | null = null;
    let miembroId: number | null = null;

    try {
      if (candidato.foto_url) {
        const { data: foto, error: descargaError } = await supabaseServer.storage
          .from("candidatos-fotos")
          .download(candidato.foto_url);
        if (descargaError || !foto) throw new Error("No fue posible recuperar la fotografía del candidato.");

        const rutaMiembro = `${codigoMiembro}-${Date.now()}.jpg`;
        const { error: subidaError } = await supabaseServer.storage
          .from("miembros-fotos")
          .upload(rutaMiembro, await foto.arrayBuffer(), { contentType: "image/jpeg", upsert: false });
        if (subidaError) throw new Error("No fue posible guardar la fotografía del nuevo miembro.");
        fotoMiembro = supabaseServer.storage.from("miembros-fotos").getPublicUrl(rutaMiembro).data.publicUrl;
      }

      const { data: miembro, error: miembroError } = await supabaseServer.from("miembros").insert({
        codigo: codigoMiembro,
        nombre: nombreCompleto,
        nivel,
        foto_url: fotoMiembro,
        fecha_nacimiento: candidato.fecha_nacimiento,
        profesion: candidato.profesion_oficio,
        bio: "",
        consejo: false,
      }).select("id").single();
      if (miembroError || !miembro) throw new Error(miembroError?.message || "No fue posible crear el miembro.");
      miembroId = miembro.id;

      const { error: userError } = await supabaseServer.from("users").insert({
        codigo: codigoMiembro,
        password: passwordTemporal,
        nivel,
        nombre: nombreCompleto,
        consejo: false,
      });
      if (userError) throw new Error(userError.message);

      const ahora = new Date().toISOString();
      const { error: updateError } = await supabaseServer.from("candidatos").update({
        estado: "aprobada",
        nivel_asignado: nivel,
        miembro_id: miembroId,
        codigo_miembro_generado: codigoMiembro,
        observaciones_privadas: privadas || null,
        revisado_por_codigo: actorCodigo,
        fecha_revision: ahora,
        fecha_resolucion: ahora,
        token_correccion: null,
        token_correccion_expira: null,
      }).eq("id", candidato.id);
      if (updateError) throw new Error(updateError.message);

      await registrarHistorial({
        candidatoId: candidato.id,
        codigo: candidato.codigo,
        accion: "candidatura_aprobada",
        estadoAnterior: candidato.estado,
        estadoNuevo: "aprobada",
        detalle: `Ingreso aprobado como ${nivel}. Código generado: ${codigoMiembro}.`,
        actorCodigo,
        visibleCandidato: true,
      });

      const correo = await enviarCorreo({
        para: candidato.correo,
        asunto: `Bienvenido(a) a la AGENN | ${codigoMiembro}`,
        html: plantillaCorreo(`
          <p>Estimado(a) <strong>${nombreCompleto}</strong>:</p>
          <p>Nos complace informarle que el Consejo Académico aprobó su ingreso a la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.</p>
          <p>Su nivel inicial es <strong>${nivel}</strong> y sus credenciales temporales son:</p>
          <div style="background:#eef6e9;border-left:5px solid #4f7f3b;padding:14px">
            <strong>Código:</strong> ${codigoMiembro}<br>
            <strong>Contraseña temporal:</strong> ${passwordTemporal}
          </div>
          <p>Puede ingresar en:</p>
          <p style="text-align:center"><a href="${sitio}/login" style="background:#6b4f2a;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Ingresar a la plataforma</a></p>
          <p>Le recomendamos conservar este mensaje. En una etapa posterior de la plataforma podrá cambiar su contraseña desde su perfil.</p>
        `),
      });

      await supabaseServer.from("candidatos").update({
        ultimo_correo_enviado: correo.enviado ? new Date().toISOString() : null,
        ultimo_error_correo: correo.error || null,
      }).eq("id", candidato.id);

      return NextResponse.json({ ok: true, codigoMiembro, passwordTemporal, correo });
    } catch (error) {
      if (miembroId) await supabaseServer.from("miembros").delete().eq("id", miembroId);
      await supabaseServer.from("users").delete().eq("codigo", codigoMiembro);
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible aprobar la candidatura." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
}
