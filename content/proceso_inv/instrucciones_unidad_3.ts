import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 3, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_3 = "Elabore una **nota crítica de fuentes**.\n\nSeleccione una afirmación numismática, notafílica o exonúmica encontrada durante su investigación y rastree su presencia en **al menos tres fuentes**.\n\nEl trabajo deberá incluir:\n\n1. la afirmación investigada;\n2. la fuente más antigua que logró localizar;\n3. cómo aparece la afirmación en las demás fuentes;\n4. posibles relaciones de dependencia entre ellas;\n5. evaluación de autoría, fecha, propósito y proximidad;\n6. coincidencias o contradicciones;\n7. evidencia independiente disponible;\n8. una conclusión propia, clasificada como **demostrada, probable, posible o no determinable con la evidencia disponible**;\n9. la fuente adicional que sería necesaria para aumentar la certeza.\n\nIncluya citas y referencias completas.\n\n**El estudiante no será penalizado por concluir que algo no puede demostrarse. Sí será observado si afirma más de lo que sus fuentes permiten.**\n\nEsta será la última nota breve del primer bloque metodológico. En unidad 4 aumentará la extensión y se aplicarán estas competencias al problema de la identificación, clasificación y catalogación.";

export function obtenerInstruccionesUnidad3() {
  const regla = obtenerReglaTrabajoInv("unidad-3")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_3, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
