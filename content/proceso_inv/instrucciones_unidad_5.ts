import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Consigna académica de la Unidad 5. Se comparte entre el editor y la API.
export const REQUISITOS_UNIDAD_5 = [
  "Pregunta de investigación",
  "Delimitación temporal",
  "Legislación pertinente",
  "Denominaciones autorizadas",
  "Especies materialmente documentadas",
  "Diferenciación entre autorización, acuñación, emisión y circulación, cuando las fuentes lo permitan",
  "Tabla, esquema o representación de la configuración monetaria",
  "Continuidades, adiciones, sustituciones o reducciones",
  "Posibles configuraciones híbridas o paralelas, si la evidencia las demuestra",
  "Contradicciones y vacíos documentales",
  "Interpretación propia",
  "Afirmaciones que todavía no pueden demostrarse",
  "Citas y referencias completas",
] as const;

export const INTRODUCCION_UNIDAD_5 =
  "Elabore una nota de investigación sobre una transformación concreta del sistema monetario guatemalteco. Seleccione un período delimitado, como los primeros intentos decimales, las configuraciones de finales del siglo XIX, la Reforma Monetaria de 1924–1927 o una transformación posterior del subcono.";

export const CIERRE_UNIDAD_5 =
  "El Consejo Académico evaluará la correspondencia entre evidencia y reconstrucción, no la reproducción mecánica del esquema de un autor. Los conceptos propuestos por Rodríguez Orozco pueden utilizarse como herramientas analíticas, pero deberán aplicarse de manera argumentada.";

export function obtenerInstruccionesUnidad5() {
  const regla = obtenerReglaTrabajoInv("unidad-5")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [
    INTRODUCCION_UNIDAD_5,
    "El trabajo deberá incluir, en la medida que corresponda al caso y que las fuentes permitan documentarlo:",
    ...REQUISITOS_UNIDAD_5.map((texto, indice) => `${indice + 1}. ${texto}.`),
    CIERRE_UNIDAD_5,
    extension,
  ].join("\n");
  const criterios = "Compruebe el cumplimiento de los elementos solicitados que sean aplicables al tema y verificables con las fuentes disponibles; distinga ausencias sustanciales de aspectos no aplicables o no documentables. Evalúe especialmente la correspondencia entre evidencia y reconstrucción histórica, la argumentación, la identificación de fuentes, la precisión conceptual y el reconocimiento explícito de incertidumbres. No exija evidencia inexistente ni penalice la ausencia de configuraciones híbridas o paralelas cuando no correspondan al caso. La tabla, esquema o representación puede integrarse como texto estructurado cuando el editor no permita tablas.";
  return { consigna, criterios, extension, regla };
}
