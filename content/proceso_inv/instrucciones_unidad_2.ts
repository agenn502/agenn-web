import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 2, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_2 = "Elabore una **nota breve de investigación ** centrada en la construcción de un corpus documental.\n\nPuede continuar la pregunta de unidad 1 o formular otra claramente delimitada.\n\nDebe contener:\n\n1. **Pregunta de investigación.**\n2. **Evidencia necesaria:** qué tendría que conocer para responderla.\n3. **Corpus inicial de 4 a 6 fuentes**, de por lo menos **tres tipos distintos**.\n4. Qué aporta cada fuente.\n5. Al menos una limitación de cada tipo utilizado.\n6. Cuál considera más cercana al hecho investigado y por qué.\n7. Si alguna fuente secundaria conduce a una fuente primaria todavía pendiente de consulta.\n8. **Qué evidencia continúa faltando.**\n\nIncluya las referencias completas.\n\n**No se evaluará la cantidad de bibliografía.** El Consejo Académico evaluará la correspondencia entre pregunta, evidencia necesaria y fuentes seleccionadas, y la comprensión de sus límites.\n\nLa finalidad de unidad 2 es demostrar que usted sabe **dónde y cómo comenzar a buscar evidencia**.";

export function obtenerInstruccionesUnidad2() {
  const regla = obtenerReglaTrabajoInv("unidad-2")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_2, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
