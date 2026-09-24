import { NextRequest, NextResponse } from "next/server";

type SolicitudRevision = {
  unidad: string;
  tipoTrabajo: string;
  tema: string;
  titulo: string;
  consigna: string;
  criterios?: string;
  requisitosCuantitativos?: string;
  recuentoReal?: { palabras?: number; caracteres?: number };
  contenido: string;
};

type ResultadoProveedor = {
  revision: any;
  proveedor: "gemini" | "groq";
  modelo: string;
  tokens: number | null;
};

const esquemaRevision = {
  type: "object",
  properties: {
    estado: {
      type: "string",
      enum: ["REQUIERE_AJUSTES", "LISTO_PARA_REMITIR"],
    },
    sintesis: { type: "string" },
    cumplimientoConsigna: { type: "string" },
    estructuraArgumentacion: { type: "string" },
    fuentesEvidencias: { type: "string" },
    precisionConceptual: { type: "string" },
    correccionesObligatorias: {
      type: "array",
      items: { type: "string" },
    },
    recomendacionesOpcionales: {
      type: "array",
      items: { type: "string" },
    },
    recomendacionFinal: { type: "string" },
  },
  required: [
    "estado",
    "sintesis",
    "cumplimientoConsigna",
    "estructuraArgumentacion",
    "fuentesEvidencias",
    "precisionConceptual",
    "correccionesObligatorias",
    "recomendacionesOpcionales",
    "recomendacionFinal",
  ],
  additionalProperties: false,
};

function construirPrompt(trabajo: SolicitudRevision) {
  const palabrasReales = Number(trabajo.recuentoReal?.palabras);
  const caracteresReales = Number(trabajo.recuentoReal?.caracteres);
  const recuento = [
    Number.isFinite(palabrasReales) ? `${palabrasReales} palabras` : null,
    Number.isFinite(caracteresReales) ? `${caracteresReales} caracteres` : null,
  ].filter(Boolean).join("; ");

  return `
Usted actúa como revisor académico preliminar de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos (AGENN).

Su función NO es llevar el trabajo a la perfección ni sustituir al Consejo Académico. Debe comprobar si reúne las condiciones mínimas académicas y metodológicas para ser sometido a evaluación humana.

REGLAS OBLIGATORIAS:
- Esta NO es una aprobación académica.
- No otorgue calificaciones numéricas.
- No utilice las palabras "aprobado" o "reprobado".
- Evalúe contra la CONSIGNA y los CRITERIOS ESPECÍFICOS proporcionados. No invente requisitos adicionales.
- Si el estudiante cumple los elementos expresamente solicitados y alcanza un nivel metodológico suficiente, marque LISTO_PARA_REMITIR aunque existan mejoras posibles.
- Separe estrictamente CORRECCIONES OBLIGATORIAS de RECOMENDACIONES OPCIONALES.
- Son correcciones obligatorias únicamente: incumplimientos de la consigna; ausencia de elementos expresamente requeridos; problemas metodológicos sustanciales; afirmaciones fundamentales sin evidencia; contradicciones relevantes; criterios que no pueden reproducirse; o deficiencias que impiden evaluar razonablemente el trabajo.
- Son recomendaciones opcionales las mejoras que enriquecerían el trabajo pero que la actividad no exige. Las recomendaciones opcionales NUNCA deben impedir LISTO_PARA_REMITIR.
- No exija imágenes, diagramas, análisis físico de piezas, ampliación del corpus, mayor número de fuentes, páginas específicas, secciones o URL salvo que la consigna los exija expresamente o que sean indispensables para verificar una afirmación concreta.
- En las referencias compruebe que las fuentes sean suficientemente identificables. No exija automáticamente página, sección o URL. Solicite localización específica solo cuando una afirmación concreta dependa de ella o sea realmente necesaria para verificar la evidencia.
- No invente hechos, referencias bibliográficas ni errores.
- Distinga entre una afirmación incorrecta y una afirmación que necesita respaldo documental.
- Si detecta un posible problema histórico, numismático o conceptual que no pueda comprobar con el material proporcionado, formúlelo como recomendación de verificación; solo será obligatorio si afecta un elemento fundamental del argumento.
- Para requisitos cuantitativos use EXCLUSIVAMENTE los límites específicos indicados abajo y el RECUENTO REAL calculado por el sistema. No estime la extensión visualmente, no diga "parece acercarse al mínimo" y no pida ampliar un texto que ya está dentro del rango exigido.
- Las observaciones deben ser concretas, formativas y útiles.
- Mantenga un tono académico y respetuoso y diríjase al estudiante de "usted".
- Si correccionesObligatorias queda vacío, el estado DEBE ser LISTO_PARA_REMITIR.
- Si correccionesObligatorias contiene al menos un elemento, el estado DEBE ser REQUIERE_AJUSTES.
- Si está listo, recomendacionFinal debe expresar: "El trabajo reúne los elementos necesarios para ser remitido al Consejo Académico."
- Si requiere ajustes, recomendacionFinal debe indicar que debe solventar únicamente las correcciones obligatorias antes de solicitar aval.

DATOS DEL TRABAJO
Unidad: ${trabajo.unidad}
Tipo de trabajo: ${trabajo.tipoTrabajo || "No especificado"}
Tema: ${trabajo.tema || "No especificado"}
Título: ${trabajo.titulo}

CONSIGNA:
${trabajo.consigna}

CRITERIOS ESPECÍFICOS:
${trabajo.criterios || "No se proporcionaron criterios adicionales."}

REQUISITOS CUANTITATIVOS DE ESTA ACTIVIDAD:
${trabajo.requisitosCuantitativos || "No se proporcionaron requisitos cuantitativos adicionales."}

RECUENTO REAL CALCULADO POR EL SISTEMA:
${recuento || "No disponible."}

TRABAJO PRESENTADO:
${trabajo.contenido}
`.trim();
}
function extraerTextoGemini(datos: any): string | null {
  if (!Array.isArray(datos?.steps)) return null;
  for (let i = datos.steps.length - 1; i >= 0; i--) {
    const paso = datos.steps[i];
    if (paso?.type !== "model_output" || !Array.isArray(paso?.content)) continue;
    const textos = paso.content
      .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
      .map((item: any) => item.text);
    if (textos.length) return textos.join("");
  }
  return null;
}

async function revisarConGemini(prompt: string): Promise<ResultadoProveedor> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  if (!apiKey) throw new Error("GEMINI_NO_CONFIGURADO");

  const respuesta = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: modelo,
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: esquemaRevision,
        },
      }),
      cache: "no-store",
    }
  );

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    console.error("Gemini no disponible:", respuesta.status, datos);
    throw new Error(`GEMINI_${respuesta.status}`);
  }

  const texto = extraerTextoGemini(datos);
  if (!texto) throw new Error("GEMINI_SIN_CONTENIDO");

  return {
    revision: JSON.parse(texto),
    proveedor: "gemini",
    modelo,
    tokens: datos?.usage?.total_tokens ?? null,
  };
}

async function revisarConGroq(prompt: string): Promise<ResultadoProveedor> {
  const apiKey = process.env.GROQ_API_KEY;
  const modelo = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  if (!apiKey) throw new Error("GROQ_NO_CONFIGURADO");

  const respuesta = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "system",
            content:
              "Usted es el sistema de revisión preliminar académica de AGENN. Devuelva exclusivamente el JSON solicitado, sin texto adicional.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "revision_preliminar_agenn",
            strict: true,
            schema: esquemaRevision,
          },
        },
      }),
      cache: "no-store",
    }
  );

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    console.error("Groq no disponible:", respuesta.status, datos);
    throw new Error(`GROQ_${respuesta.status}`);
  }

  const texto = datos?.choices?.[0]?.message?.content;
  if (!texto || typeof texto !== "string") throw new Error("GROQ_SIN_CONTENIDO");

  return {
    revision: JSON.parse(texto),
    proveedor: "groq",
    modelo,
    tokens: datos?.usage?.total_tokens ?? null,
  };
}

export async function POST(request: NextRequest) {
  let trabajo: SolicitudRevision;

  try {
    trabajo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  if (!trabajo?.unidad || !trabajo?.titulo || !trabajo?.contenido || !trabajo?.consigna) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos necesarios para realizar la revisión." },
      { status: 400 }
    );
  }

  const prompt = construirPrompt(trabajo);
  const errores: string[] = [];

  // 1. Proveedor principal
  try {
    const resultado = await revisarConGemini(prompt);
    return NextResponse.json({
      ok: true,
      disponible: true,
      revision: resultado.revision,
      metadata: {
        proveedor: resultado.proveedor,
        modelo: resultado.modelo,
        tokens: resultado.tokens,
        usoRespaldo: false,
      },
    });
  } catch (error: any) {
    errores.push(error?.message || "GEMINI_ERROR");
    console.warn("Se activa proveedor de respaldo para revisión INV.");
  }

  // 2. Respaldo abierto mediante Groq
  try {
    const resultado = await revisarConGroq(prompt);
    return NextResponse.json({
      ok: true,
      disponible: true,
      revision: resultado.revision,
      metadata: {
        proveedor: resultado.proveedor,
        modelo: resultado.modelo,
        tokens: resultado.tokens,
        usoRespaldo: true,
      },
    });
  } catch (error: any) {
    errores.push(error?.message || "GROQ_ERROR");
    console.error("Todos los proveedores de revisión fallaron:", errores);
  }

  return NextResponse.json(
    {
      ok: false,
      disponible: false,
      temporal: true,
      error:
        "La revisión preliminar no está disponible en este momento. Su borrador permanece guardado. Inténtelo nuevamente en unos minutos.",
    },
    { status: 503 }
  );
}