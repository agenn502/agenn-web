import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const FOTO_MAX_BYTES = 100 * 1024;
const MIME_PERMITIDO = "image/jpeg";

const PERFILES: Record<string, string> = {
  A: "Comerciante profesional",
  A2: "Comerciante con orientación académica",
  B: "Operador comercial no ético de alto conocimiento",
  B2: "Operador de doble rol académico-comercial no ético",
  C: "Comerciante en formación",
  D: "Vendedor no especializado",
  E: "Numismático especializado",
  F: "Investigador de enfoque amplio",
  G: "Coleccionista orientado a la calidad",
  H: "Coleccionista orientado a la completitud",
  I: "Coleccionista en desarrollo",
  J: "Acumulador no sistemático",
};

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function booleano(formData: FormData, campo: string): boolean {
  return texto(formData, campo).toLowerCase() === "true";
}

function enteroOpcional(valor: string): number | null {
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function arregloIntereses(valor: string): string[] {
  try {
    const parsed = JSON.parse(valor);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  let candidatoId: string | null = null;
  let codigoCandidato: string | null = null;
  let fotoSubida = false;

  try {
    const formData = await request.formData();

    const perfilCodigo = texto(formData, "perfil_codigo").toUpperCase();
    const perfilNombre = texto(formData, "perfil_nombre");
    const nombres = texto(formData, "nombres");
    const apellidos = texto(formData, "apellidos");
    const fechaNacimiento = texto(formData, "fecha_nacimiento");
    const correo = texto(formData, "correo").toLowerCase();
    const telefono = texto(formData, "telefono");
    const profesionOficio = texto(formData, "profesion_oficio");
    const institucionTrabajo = texto(formData, "institucion_trabajo");
    const nivelAcademico = texto(formData, "nivel_academico");
    const pais = texto(formData, "pais") || "Guatemala";
    const departamento = texto(formData, "departamento");
    const municipio = texto(formData, "municipio");
    const comunidad = texto(formData, "comunidad");
    const intereses = arregloIntereses(texto(formData, "intereses"));
    const interesOtro = texto(formData, "interes_otro");
    const experienciaAnios = enteroOpcional(texto(formData, "experiencia_anios"));
    const poseeColeccion = booleano(formData, "posee_coleccion");
    const participaComunidad = booleano(formData, "participa_comunidad");
    const comunidadNumismatica = texto(formData, "comunidad_numismatica");
    const areasInteres = texto(formData, "areas_interes");
    const comoConocioAgenn = texto(formData, "como_conocio_agenn");
    const motivacion = texto(formData, "motivacion");
    const expectativasAprendizaje = texto(formData, "expectativas_aprendizaje");
    const aceptaProcesoFormativo = booleano(formData, "acepta_proceso_formativo");
    const aceptaTratamientoDatos = booleano(formData, "acepta_tratamiento_datos");
    const declaraInformacionVeraz = booleano(formData, "declara_informacion_veraz");
    const fotografia = formData.get("fotografia");

    if (!PERFILES[perfilCodigo] || PERFILES[perfilCodigo] !== perfilNombre) {
      return NextResponse.json(
        { ok: false, error: "El perfil numismático seleccionado no es válido." },
        { status: 400 }
      );
    }

    const obligatorios = [
      nombres,
      apellidos,
      fechaNacimiento,
      correo,
      profesionOficio,
      nivelAcademico,
      departamento,
      municipio,
      comoConocioAgenn,
      motivacion,
    ];

    if (obligatorios.some((valor) => !valor)) {
      return NextResponse.json(
        { ok: false, error: "Complete todos los campos obligatorios." },
        { status: 400 }
      );
    }

    if (!correo.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ingrese un correo electrónico válido." },
        { status: 400 }
      );
    }

    if (motivacion.length < 80) {
      return NextResponse.json(
        {
          ok: false,
          error: "La motivación debe contener al menos 80 caracteres.",
        },
        { status: 400 }
      );
    }

    if (intereses.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Seleccione al menos un interés." },
        { status: 400 }
      );
    }

    if (
      !aceptaProcesoFormativo ||
      !aceptaTratamientoDatos ||
      !declaraInformacionVeraz
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe aceptar las tres declaraciones para enviar la solicitud.",
        },
        { status: 400 }
      );
    }

    if (!(fotografia instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Debe seleccionar una fotografía válida." },
        { status: 400 }
      );
    }

    if (fotografia.type !== MIME_PERMITIDO) {
      return NextResponse.json(
        { ok: false, error: "La fotografía procesada debe estar en formato JPG." },
        { status: 400 }
      );
    }

    if (fotografia.size > FOTO_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "La fotografía excede el tamaño permitido." },
        { status: 400 }
      );
    }

    const { data: candidato, error: candidatoError } = await supabaseServer
      .from("candidatos")
      .insert({
        perfil_codigo: perfilCodigo,
        perfil_nombre: perfilNombre,
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        correo,
        telefono: telefono || null,
        pais,
        departamento,
        municipio,
        comunidad: comunidad || null,
        profesion_oficio: profesionOficio,
        institucion_trabajo: institucionTrabajo || null,
        nivel_academico: nivelAcademico,
        intereses,
        interes_otro: interesOtro || null,
        experiencia_anios: experienciaAnios,
        posee_coleccion: poseeColeccion,
        participa_comunidad: participaComunidad,
        comunidad_numismatica: comunidadNumismatica || null,
        areas_interes: areasInteres || null,
        como_conocio_agenn: comoConocioAgenn,
        motivacion,
        expectativas_aprendizaje: expectativasAprendizaje || null,
        acepta_proceso_formativo: aceptaProcesoFormativo,
        acepta_tratamiento_datos: aceptaTratamientoDatos,
        declara_informacion_veraz: declaraInformacionVeraz,
      })
      .select("id, codigo")
      .single();

    if (candidatoError || !candidato) {
      console.error("Error creando candidato:", candidatoError);
      return NextResponse.json(
        { ok: false, error: "No fue posible crear el expediente de admisión." },
        { status: 500 }
      );
    }

    candidatoId = candidato.id;
    codigoCandidato = candidato.codigo;

    const rutaFoto = `${codigoCandidato}.jpg`;
    const bytesFoto = await fotografia.arrayBuffer();

    const { error: fotoError } = await supabaseServer.storage
      .from("candidatos-fotos")
      .upload(rutaFoto, bytesFoto, {
        contentType: MIME_PERMITIDO,
        upsert: false,
        cacheControl: "3600",
      });

    if (fotoError) {
      console.error("Error subiendo fotografía:", fotoError);
      throw new Error("No fue posible guardar la fotografía.");
    }

    fotoSubida = true;

    const { error: actualizarError } = await supabaseServer
      .from("candidatos")
      .update({ foto_url: rutaFoto })
      .eq("id", candidatoId);

    if (actualizarError) {
      console.error("Error actualizando foto_url:", actualizarError);
      throw new Error("No fue posible vincular la fotografía al expediente.");
    }

    const { error: historialError } = await supabaseServer
      .from("candidatos_historial")
      .insert({
        candidato_id: candidatoId,
        codigo_candidato: codigoCandidato,
        accion: "solicitud_recibida",
        estado_anterior: null,
        estado_nuevo: "pendiente",
        detalle: "Solicitud de ingreso recibida correctamente.",
        actor_codigo: null,
        visible_candidato: true,
      });

    if (historialError) {
      console.error("Error creando historial:", historialError);
      throw new Error("No fue posible registrar el historial del expediente.");
    }

    return NextResponse.json({
      ok: true,
      codigo: codigoCandidato,
    });
  } catch (error) {
    console.error("Error inesperado en /api/candidatos:", error);

    if (fotoSubida && codigoCandidato) {
      await supabaseServer.storage
        .from("candidatos-fotos")
        .remove([`${codigoCandidato}.jpg`]);
    }

    if (candidatoId) {
      await supabaseServer.from("candidatos").delete().eq("id", candidatoId);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al enviar la solicitud.",
      },
      { status: 500 }
    );
  }
}