import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 1, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_1 = "Elabore una **nota breve de investigación**. El propósito no es resolver una investigación completa, sino demostrar que puede **construir un problema investigable**.\n\nDebe contener:\n\n1. Título.\n2. Objeto o fenómeno seleccionado.\n3. Pregunta de investigación.\n4. Justificación breve.\n5. Evidencia inicial localizada.\n6. Hipótesis provisional.\n7. Distinción explícita entre al menos un **hecho documentado**, una **inferencia** y una **hipótesis**.\n8. Entre **3 y 5 fuentes pertinentes**.\n9. Información o evidencia adicional que todavía necesitaría encontrar.\n\nIncluya citas y lista final de referencias.\n\n**Criterio fundamental:** el Consejo Académico no evaluará si su hipótesis era “correcta” desde el inicio. Evaluará si la pregunta puede investigarse, si las fuentes son pertinentes, si distingue evidencia de interpretación y si reconoce los límites de lo que todavía puede afirmar.";

export function obtenerInstruccionesUnidad1() {
  const regla = obtenerReglaTrabajoInv("unidad-1")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_1, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
