import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 8, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_8 = "Elabore un **ensayo académico ** sobre un problema numismático, notafílico o exonúmico guatemalteco para el cual puedan formularse al menos dos interpretaciones razonables.\n\nEl trabajo deberá:\n\n1. formular y delimitar el problema;\n2. plantear la pregunta de investigación;\n3. presentar el corpus de evidencia;\n4. identificar procedencia y posible dependencia de las fuentes;\n5. formular al menos **dos hipótesis rivales**;\n6. explicar qué evidencia favorece o debilita cada una;\n7. incorporar evidencia contradictoria cuando exista;\n8. evaluar explicaciones alternativas;\n9. defender la interpretación que considere mejor sustentada;\n10. asignar y justificar un grado de certeza;\n11. identificar qué evidencia podría modificar la conclusión;\n12. establecer qué aspectos continúan sin poder determinarse;\n13. incluir referencias en formato APA.\n\nEl Consejo Académico no evaluará si el estudiante encontró una respuesta espectacular, sino **la calidad del razonamiento mediante el cual pasa de la evidencia a una conclusión**.\n\nUna conclusión provisional, probable o incluso no determinable puede ser excelente si refleja correctamente el estado de la evidencia.";

export function obtenerInstruccionesUnidad8() {
  const regla = obtenerReglaTrabajoInv("unidad-8")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_8, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
