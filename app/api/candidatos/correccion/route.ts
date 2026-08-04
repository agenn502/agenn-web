import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function tokenValido(token: string) {
  return /^[0-9a-f-]{36}$/i.test(token);
}

export async function GET(req: NextRequest) {
  const token = String(req.nextUrl.searchParams.get("token") || "").trim();
  if (!tokenValido(token)) {
    return NextResponse.json({ ok: false, error: "Enlace de corrección inválido." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("candidatos")
    .select("id,codigo,estado,perfil_codigo,perfil_nombre,nombres,apellidos,fecha_nacimiento,correo,telefono,departamento,municipio,comunidad,profesion_oficio,institucion_trabajo,nivel_academico,intereses,interes_otro,experiencia_anios,posee_coleccion,participa_comunidad,comunidad_numismatica,areas_interes,como_conocio_agenn,motivacion,expectativas_aprendizaje,observaciones_candidato,foto_url,token_correccion_expira")
    .eq("token_correccion", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "No se encontró una solicitud habilitada para corrección." }, { status: 404 });
  }

  if (data.estado !== "correcciones_solicitadas") {
    return NextResponse.json({ ok: false, error: "Esta solicitud ya no está pendiente de corrección." }, { status: 409 });
  }

  if (!data.token_correccion_expira || new Date(data.token_correccion_expira).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "El enlace de corrección ha vencido." }, { status: 410 });
  }

  let foto_firmada: string | null = null;
  if (data.foto_url) {
    const { data: firma } = await supabaseServer.storage
      .from("candidatos-fotos")
      .createSignedUrl(data.foto_url, 60 * 30);
    foto_firmada = firma?.signedUrl || null;
  }

  return NextResponse.json({ ok: true, candidato: { ...data, foto_firmada } });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = String(formData.get("token") || "").trim();
    if (!tokenValido(token)) {
      return NextResponse.json({ ok: false, error: "Enlace de corrección inválido." }, { status: 400 });
    }

    const { data: candidato } = await supabaseServer
      .from("candidatos")
      .select("*")
      .eq("token_correccion", token)
      .maybeSingle();

    if (!candidato || candidato.estado !== "correcciones_solicitadas") {
      return NextResponse.json({ ok: false, error: "La solicitud no está habilitada para corrección." }, { status: 409 });
    }

    if (!candidato.token_correccion_expira || new Date(candidato.token_correccion_expira).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "El enlace de corrección ha vencido." }, { status: 410 });
    }

    const texto = (campo: string) => String(formData.get(campo) || "").trim();
    const booleano = (campo: string) => texto(campo).toLowerCase() === "true";
    const intereses = JSON.parse(texto("intereses") || "[]");
    const fotografia = formData.get("fotografia");

    const cambios: Record<string, unknown> = {
      perfil_codigo: texto("perfil_codigo").toUpperCase(),
      perfil_nombre: texto("perfil_nombre"),
      nombres: texto("nombres"),
      apellidos: texto("apellidos"),
      fecha_nacimiento: texto("fecha_nacimiento"),
      correo: texto("correo").toLowerCase(),
      telefono: texto("telefono") || null,
      departamento: texto("departamento"),
      municipio: texto("municipio"),
      comunidad: texto("comunidad") || null,
      profesion_oficio: texto("profesion_oficio"),
      institucion_trabajo: texto("institucion_trabajo") || null,
      nivel_academico: texto("nivel_academico"),
      intereses: Array.isArray(intereses) ? intereses : [],
      interes_otro: texto("interes_otro") || null,
      experiencia_anios: texto("experiencia_anios") ? Number(texto("experiencia_anios")) : null,
      posee_coleccion: booleano("posee_coleccion"),
      participa_comunidad: booleano("participa_comunidad"),
      comunidad_numismatica: texto("comunidad_numismatica") || null,
      areas_interes: texto("areas_interes") || null,
      como_conocio_agenn: texto("como_conocio_agenn"),
      motivacion: texto("motivacion"),
      expectativas_aprendizaje: texto("expectativas_aprendizaje") || null,
      estado: "reenviada",
      observaciones_candidato: null,
      token_correccion: null,
      token_correccion_expira: null,
      fecha_solicitud: new Date().toISOString(),
    };

    const obligatorios = ["perfil_codigo","perfil_nombre","nombres","apellidos","fecha_nacimiento","correo","departamento","municipio","profesion_oficio","nivel_academico","como_conocio_agenn","motivacion"];
    if (obligatorios.some((campo) => !String(cambios[campo] || "").trim())) {
      return NextResponse.json({ ok: false, error: "Complete todos los campos obligatorios." }, { status: 400 });
    }

    if (fotografia instanceof File && fotografia.size > 0) {
      if (fotografia.type !== "image/jpeg" || fotografia.size > 100 * 1024) {
        return NextResponse.json({ ok: false, error: "La fotografía no cumple los requisitos." }, { status: 400 });
      }
      const ruta = `${candidato.codigo}.jpg`;
      const { error: fotoError } = await supabaseServer.storage
        .from("candidatos-fotos")
        .upload(ruta, await fotografia.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
      if (fotoError) return NextResponse.json({ ok: false, error: fotoError.message }, { status: 500 });
      cambios.foto_url = ruta;
    }

    const { error } = await supabaseServer.from("candidatos").update(cambios).eq("id", candidato.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabaseServer.from("candidatos_historial").insert({
      candidato_id: candidato.id,
      codigo_candidato: candidato.codigo,
      accion: "solicitud_reenviada",
      estado_anterior: "correcciones_solicitadas",
      estado_nuevo: "reenviada",
      detalle: "El candidato corrigió y reenvió su solicitud.",
      actor_codigo: null,
      visible_candidato: true,
    });

    return NextResponse.json({ ok: true, codigo: candidato.codigo });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible reenviar la solicitud." }, { status: 500 });
  }
}
