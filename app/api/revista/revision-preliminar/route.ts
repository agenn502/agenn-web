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

function construirPrompt(trabajo: SolicitudRevision) {
  return `
Usted actúa como corrector editorial preliminar de Revista AGENN.

Su función es EXCLUSIVAMENTE revisar aspectos formales antes del primer envío al Consejo Editorial. NO evalúe mérito académico, originalidad, metodología, exactitud histórica o numismática, relevancia, novedad ni publicabilidad.

REGLAS OBLIGATORIAS:
- Revise ortografía y gramática.
- Revise redacción únicamente cuando un pasaje resulte confuso, ambiguo o difícil de comprender. No intente uniformar ni perfeccionar el estilo del autor.
- Revise la forma de las citas en el texto y su correspondencia con la bibliografía.
- Compruebe, hasta donde permita el manuscrito, que las obras citadas en el texto tengan entrada bibliográfica y que las entradas bibliográficas correspondan con citas del texto. Señale las excepciones concretas; no invente faltantes.
- Revise consistencia bibliográfica según APA. No invente DOI, URL, autor, año, título, editorial, páginas ni ningún dato ausente. Si falta un dato necesario, indique cuál falta.
- No exija fuentes adicionales solo porque considere que mejorarían el manuscrito.
- No haga verificación externa de hechos ni de la existencia de las fuentes.
- No reescriba el manuscrito completo ni sustituya la voz del autor.
- Una preferencia estilística, una mejora de elegancia o una sugerencia no debe bloquear el envío: colóquela en recomendacionesOpcionales.
- Son correcciones obligatorias únicamente errores objetivos de ortografía o gramática de importancia, pasajes que no se entienden razonablemente, citas sin correspondencia bibliográfica, referencias citadas que no pueden identificarse en la bibliografía, o deficiencias APA concretas que deban corregirse antes de remitir.
- No use las palabras "aprobado" o "reprobado".
- Diríjase al autor de "usted" y mantenga tono respetuoso y formativo.
- Si correccionesObligatorias está vacío, estado DEBE ser LISTO_PARA_REMITIR.
- Si contiene al menos un elemento, estado DEBE ser REQUIERE_AJUSTES.
- Si está listo, recomendacionFinal debe decir exactamente: "El manuscrito reúne las condiciones formales necesarias para ser remitido al Consejo Editorial."
- Si requiere ajustes, indique que debe solventar únicamente las correcciones obligatorias antes del primer envío.

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
              "Usted es el sistema de revisión preliminar editorial de Revista AGENN. Devuelva exclusivamente el JSON solicitado, sin texto adicional.",
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

  const prompt = construirPrompt(trabajo);
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
