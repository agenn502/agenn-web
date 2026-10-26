import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 6, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_6 = "Elabore una **biografía documental de una pieza exonúmica guatemalteca**.\n\nEl trabajo deberá:\n\n1. identificar y describir la pieza;\n2. registrar su procedencia o la fuente de la imagen;\n3. separar observación e interpretación;\n4. identificar establecimiento, persona o institución relacionada, si la evidencia lo permite;\n5. localizar al menos **tres fuentes adicionales**;\n6. establecer qué función puede demostrarse;\n7. distinguir función monetaria, laboral, administrativa, comercial u otra;\n8. analizar críticamente fechas y atribuciones;\n9. reconstruir el contexto histórico pertinente;\n10. identificar afirmaciones tradicionales que no pudieron comprobarse;\n11. presentar una interpretación propia;\n12. indicar explícitamente qué continúa sin poder determinarse;\n13. incluir citas y referencias completas.\n\nUna ficha de catálogo **no constituye por sí sola la investigación completa**. Debe existir un intento documentado de llevar el objeto hacia fuentes externas.\n\nEl Consejo Académico evaluará especialmente la correspondencia entre pieza, fuentes y afirmaciones, y valorará positivamente que el estudiante reconozca los límites de la evidencia.";

export function obtenerInstruccionesUnidad6() {
  const regla = obtenerReglaTrabajoInv("unidad-6")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_6, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
