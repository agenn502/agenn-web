import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 7, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_7 = "Elabore un **ensayo académico ** utilizando un billete o una pequeña serie de billetes guatemaltecos como evidencia para estudiar una transformación histórica.\n\nEl trabajo deberá incluir:\n\n1. problema de investigación;\n2. pregunta;\n3. delimitación del corpus;\n4. descripción documental;\n5. fuentes primarias y secundarias;\n6. contexto histórico;\n7. análisis comparativo cuando corresponda;\n8. contraste entre la pieza y la documentación externa;\n9. interpretación propia;\n10. hipótesis alternativas cuando sean pertinentes;\n11. límites de la evidencia;\n12. conclusión;\n13. referencias en formato APA.\n\nEntre los posibles problemas se encuentran los primeros billetes de 1874, la pluralidad de emisores, la transición al quetzal, la centralización de la emisión, la transformación iconográfica, la evolución de una denominación, los cambios tecnológicos o las firmas como evidencia institucional.\n\nEl Consejo Académico evaluará especialmente si el ensayo pasa de **describir piezas** a **construir una interpretación demostrable mediante piezas y fuentes**.";

export function obtenerInstruccionesUnidad7() {
  const regla = obtenerReglaTrabajoInv("unidad-7")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_7, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
