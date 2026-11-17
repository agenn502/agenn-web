import { validarIdentidadCabecera } from "@/app/api/_seguridadSesion";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type SolicitudRevision = {
  manuscritoId: number;
  titulo: string;
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
    estado: { type: "string", enum: ["REQUIERE_AJUSTES", "LISTO_PARA_REMITIR"] },
    sintesis: { type: "string" },
    ortografia: { type: "string" },
    gramatica: { type: "string" },
    comprension: { type: "string" },
    citacion: { type: "string" },
    congruenciaBibliografica: { type: "string" },
    bibliografiaAPA: { type: "string" },
    correccionesObligatorias: { type: "array", items: { type: "string" } },
    recomendacionesOpcionales: { type: "array", items: { type: "string" } },
    recomendacionFinal: { type: "string" },
  },
  required: ["estado","sintesis","ortografia","gramatica","comprension","citacion","congruenciaBibliografica","bibliografiaAPA","correccionesObligatorias","recomendacionesOpcionales","recomendacionFinal"],
  additionalProperties: false,
};

// Convierte el HTML del editor en texto para la IA, sin alterar lo guardado.
function textoParaRevision(contenido: string): string {
  const prefijo = "<!--AGENN_RICH_HTML_V1-->";
  if (!contenido.trimStart().startsWith(prefijo)) return contenido;

  const html = contenido.trimStart().slice(prefijo.length);
  const texto = html
    .replace(/<\s*(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
    .replace(/<\s*br\b[^>]*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|blockquote|tr|section|article)\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip);/gi, (entidad, codigo: string) => {
      const nombres: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '\"', apos: "'",
        nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
      };
      const clave = codigo.toLowerCase();
      if (clave.startsWith("#")) {
        const numero = clave.startsWith("#x")
          ? parseInt(clave.slice(2), 16)
          : parseInt(clave.slice(1), 10);
        return Number.isInteger(numero) && numero > 0 && numero <= 0x10ffff
          && !(numero >= 0xd800 && numero <= 0xdfff)
          ? String.fromCodePoint(numero)
          : entidad;
      }
      return nombres[clave] ?? entidad;
    })
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return texto || contenido;
}

function construirPrompt(trabajo: SolicitudRevision) {
  return `
Usted actúa como corrector editorial preliminar de Revista AGENN.

Su función es EXCLUSIVAMENTE revisar aspectos formales antes del primer envío al Consejo Editorial. NO evalúe mérito académico, originalidad, metodología, exactitud histórica o numismática, relevancia, novedad ni publicabilidad.

REGLAS OBLIGATORIAS:
- Revise ortografía, gramática, comprensión, citas y referencias con criterio conservador. Su tarea es detectar defectos formales verificables, NO perfeccionar el estilo.
- Una corrección obligatoria debe describir un error objetivo, citar literalmente el fragmento afectado tal como aparece en el MANUSCRITO y explicar brevemente por qué impide la remisión. Si no puede localizarlo de manera inequívoca en el texto recibido, NO lo incluya como obligatorio.
- No invente ni reconstruya supuestos residuos de Word, etiquetas, fragmentos ocultos o errores de conversión. Solo señale texto residual si aparece literalmente en el MANUSCRITO proporcionado y afecta la lectura. No suponga que existe por el origen del documento.
- Distinga entre error y preferencia. Una oración comprensible no es obligatoria solo por ser mejorable, poco elegante, regional o inusual. Por ejemplo, «su circulación empezó hasta en el año 2025» es comprensible: si propone mejorarla, hágalo solo en recomendacionesOpcionales.
- Una frase no requiere reescritura obligatoria por una supuesta ambigüedad si puede comprenderse razonablemente en su contexto. No imponga una reformulación sin identificar dos interpretaciones realmente incompatibles que impidan entenderla.
- Revise citas y bibliografía buscando correspondencia real entre obras citadas y referencias. Una mera mención de una persona, institución, personaje o hecho NO equivale automáticamente a una cita académica que requiera referencia.
- Distinga las variantes de escritura de nombres propios de una discrepancia bibliográfica real. No imponga guiones ni modifique nombres o apellidos por preferencias de uniformidad; solo exija corrección cuando impidan identificar inequívocamente la fuente citada.
- Aplique APA según el tipo de fuente. No exija DOI o URL cuando no existan o no correspondan, ni número de edición para una primera edición. No exija fecha de recuperación salvo que resulte necesaria por tratarse de contenido cambiante y sin versión archivada. No invente datos ausentes.
- No exija fuentes adicionales ni verifique externamente hechos, exactitud histórica, numismática, mérito, metodología, originalidad o publicabilidad.
- Clasifique como recomendacionesOpcionales las preferencias estilísticas, mejoras de fluidez, uniformidad no esencial y observaciones APA discutibles o no comprobables. Estas recomendaciones NO bloquean el envío.
- Reserve correccionesObligatorias para faltas ortográficas o gramaticales objetivas y relevantes, texto residual realmente presente que dificulte la lectura, pasajes efectivamente incomprensibles, citas académicas sin referencia identificable o incumplimientos APA inequívocos y aplicables.
- No repita en correccionesObligatorias una observación descrita como opcional en otra sección. Si no existen errores obligatorios comprobables, deje la lista vacía aunque haya recomendaciones.
- No use las palabras «aprobado» o «reprobado». Diríjase al autor de «usted» con tono respetuoso y formativo. Sea conciso, preciso y evite repetir observaciones.
- Si correccionesObligatorias está vacío, estado DEBE ser LISTO_PARA_REMITIR y recomendacionFinal debe decir exactamente: «El manuscrito reúne las condiciones formales necesarias para ser remitido al Consejo Editorial.»
- Si correccionesObligatorias contiene al menos un elemento, estado DEBE ser REQUIERE_AJUSTES y recomendacionFinal debe indicar que debe solventar únicamente esas correcciones antes del primer envío.
TÍTULO:
${trabajo.titulo}

MANUSCRITO:
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

  // El nivel bajo reduce tokens internos de razonamiento en GPT-OSS.
  // Se reserva un presupuesto de salida moderado para no agotar la cuota gratuita.
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
        reasoning_effort: "low",
        max_completion_tokens: 1600,
        messages: [
          {
            role: "system",
            content:
              "Usted es el sistema de revisión preliminar editorial de Revista AGENN. Devuelva exclusivamente el JSON solicitado, sin texto adicional. Sea conciso en los campos narrativos; cite errores concretos y su ubicación aproximada, sin repetir observaciones entre secciones. No omita ninguna propiedad del esquema. No invente errores para llenar campos: cuando no haya incidencias, indique brevemente que no se identificaron. Mantenga todas las comprobaciones editoriales solicitadas.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "revision_preliminar_editorial_agenn",
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
  if (datos?.choices?.[0]?.finish_reason === "length") {
    console.error("Groq: salida incompleta por limite de tokens", {
      usage: datos?.usage ?? null,
      modelo,
    });
    throw new Error("GROQ_SALIDA_INCOMPLETA");
  }
  if (!texto || typeof texto !== "string") throw new Error("GROQ_SIN_CONTENIDO");

  return {
    revision: JSON.parse(texto),
    proveedor: "groq",
    modelo,
    tokens: datos?.usage?.total_tokens ?? null,
  };
}

export async function POST(request: NextRequest) {
  const rechazoSesion = await validarIdentidadCabecera(request);
  if (rechazoSesion) return rechazoSesion;

  let trabajo: SolicitudRevision;
  try { trabajo = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const codigo = String(request.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo || !trabajo?.manuscritoId || !trabajo?.titulo?.trim() || !trabajo?.contenido?.trim()) {
    return NextResponse.json({ ok: false, error: "Faltan datos necesarios para realizar la revisión." }, { status: 400 });
  }

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros").select("id,codigo").eq("codigo", codigo).maybeSingle();
  if (miembroError || !miembro) return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });

  const { data: manuscrito, error: manuscritoError } = await supabaseServer
    .from("manuscritos_editoriales")
    .select("id,autor_miembro_id,estado,flujo_editorial")
    .eq("id", Number(trabajo.manuscritoId)).eq("autor_miembro_id", miembro.id).maybeSingle();
  if (manuscritoError || !manuscrito) return NextResponse.json({ ok: false, error: "No se encontró el manuscrito." }, { status: 404 });
  if (manuscrito.estado !== "BORRADOR") {
    return NextResponse.json({ ok: false, error: "La revisión preliminar corresponde únicamente al primer envío editorial." }, { status: 409 });
  }

  const contenidoRevision = textoParaRevision(trabajo.contenido);
  const prompt = construirPrompt({ ...trabajo, contenido: contenidoRevision });
  const estimarTokens = (texto: string) => Math.ceil(texto.length / 3);
  console.info("Revision editorial - diagnostico de volumen:", {
    caracteresOriginales: trabajo.contenido.length,
    caracteresTexto: contenidoRevision.length,
    caracteresPrompt: prompt.length,
    palabrasTexto: contenidoRevision.split(/\s+/).filter(Boolean).length,
    tokensEstimadosPrompt: estimarTokens(prompt),
    nota: "Estimacion aproximada; el proveedor calcula los tokens reales.",
  });
  const errores: string[] = [];
  let resultado: ResultadoProveedor | null = null;
  let usoRespaldo = false;
  try { resultado = await revisarConGemini(prompt); }
  catch (error: any) { errores.push(error?.message || "GEMINI_ERROR"); }
  if (!resultado) {
    try { resultado = await revisarConGroq(prompt); usoRespaldo = true; }
    catch (error: any) { errores.push(error?.message || "GROQ_ERROR"); }
  }
  if (!resultado) {
    console.error("Todos los proveedores de revisión editorial fallaron:", errores);
    return NextResponse.json({ ok: false, disponible: false, temporal: true, error: "La revisión preliminar no está disponible temporalmente. Inténtelo nuevamente en unos minutos." }, { status: 503 });
  }

  const { createHash } = await import("crypto");
  const firma = createHash("sha256").update(`${trabajo.titulo.trim()}\n${trabajo.contenido.trim()}`, "utf8").digest("hex");
  const ahora = new Date().toISOString();
  const { error: guardarError } = await supabaseServer.from("manuscritos_editoriales").update({
    revision_preliminar_editorial: resultado.revision,
    fecha_revision_preliminar_editorial: ahora,
    firma_revision_preliminar_editorial: firma,
  }).eq("id", manuscrito.id).eq("autor_miembro_id", miembro.id);
  if (guardarError) throw new Error(guardarError.message);

  return NextResponse.json({ ok: true, disponible: true, revision: resultado.revision, fecha: ahora, firma, metadata: { proveedor: resultado.proveedor, modelo: resultado.modelo, tokens: resultado.tokens, usoRespaldo } });
}