import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

// Instrucciones académicas de la Unidad 10, procedentes del material formativo.
// La extensión se toma exclusivamente de config.ts.
export const TEXTO_ACADEMICO_UNIDAD_10 = "El trabajo final se desarrollará mediante **cuatro hitos**.\n\n### Hito 1 — Propuesta\n\nPresentación y aprobación del problema de investigación por el Consejo Académico.\n\n### Hito 2 — Corpus y avance\n\nPresentación del corpus inicial, bitácora de búsqueda, fuentes localizadas y evidencia preliminar. El Consejo podrá advertir problemas metodológicos importantes, pero no resolverá la investigación por el estudiante.\n\n### Hito 3 — Manuscrito\n\nEntrega del trabajo final completo. El Consejo podrá solicitar correcciones antes de pasar a defensa.\n\n### Hito 4 — Defensa\n\nPresentación y discusión académica del trabajo ante el Consejo Académico.\n\nLa unidad 10 se considerará aprobada únicamente cuando el estudiante haya completado satisfactoriamente los cuatro hitos y las correcciones solicitadas.\n\n**Criterio central:** el trabajo debe demostrar autonomía metodológica. No se espera ausencia absoluta de orientación; se espera que el estudiante pueda justificar sus decisiones y sostener su investigación con evidencia propia y fuentes verificables.\n\nLa aprobación del cuestionario formativo no sustituye ninguno de estos hitos.";

export function obtenerInstruccionesUnidad10() {
  const regla = obtenerReglaTrabajoInv("unidad-10")!;
  const extension = `Mínimo obligatorio: ${regla.palabrasMinimas.toLocaleString("es-GT")} palabras y ${regla.caracteresMinimos.toLocaleString("es-GT")} caracteres. Extensión orientativa hasta ${regla.palabrasMaximasRecomendadas.toLocaleString("es-GT")} palabras; superar esa cifra no constituye por sí solo un incumplimiento.`;
  const consigna = [TEXTO_ACADEMICO_UNIDAD_10, extension].join("\n\n");
  const criterios = "Compruebe el cumplimiento de las instrucciones académicas específicas de esta unidad, con atención a la evidencia, las fuentes, la argumentación y los límites de lo que puede demostrarse. Distinga las obligaciones expresas de las recomendaciones y los aspectos no aplicables al tema elegido. No invente exigencias ni exija recursos o pruebas no disponibles o no solicitados. Aplique los mínimos oficiales de extensión; el máximo es únicamente recomendado. La decisión académica corresponde al Consejo Académico.";
  return { consigna, criterios, extension, regla };
}
