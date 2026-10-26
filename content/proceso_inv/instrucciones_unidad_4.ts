import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 4, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_4 = "Elabore una **propuesta razonada de clasificación ** sobre un corpus guatemalteco, preferiblemente de **5 a 15 ejemplares**.\n\nIncluya: propósito; delimitación del corpus; fuentes de identificación; características observadas; criterios; definición operativa de tipo/variante/subvariante; clasificación resultante; ficha catalográfica de al menos un ejemplar; casos dudosos; limitaciones; evidencia que podría modificar la propuesta; y referencias.\n\nEl Consejo Académico **no evaluará si coincide necesariamente con un catálogo existente**. Evaluará delimitación, observación, criterios explícitos y consistentes, evidencia y reconocimiento de límites.\n\nUna clasificación diferente de la tradicional puede ser válida si está bien fundamentada.";

export function obtenerInstruccionesUnidad4() {
  const regla = obtenerReglaTrabajoInv("unidad-4")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_4, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
