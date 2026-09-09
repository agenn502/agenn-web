/**
 * Cambiar a true únicamente cuando las U1–U10 del Nivel Investigador estén
 * terminadas y sus cuestionarios estén listos para nuevos participantes.
 *
 * Quienes ya tengan progreso registrado pueden continuar durante el desarrollo.
 */
export const CUESTIONARIOS_INV_DISPONIBLES_PARA_NUEVOS = true;

export type TipoTrabajoInv =
  | "ANALISIS_BREVE"
  | "NOTA_INVESTIGACION"
  | "ENSAYO_ACADEMICO";

export type ReglaTrabajoInv = {
  tipo: TipoTrabajoInv;
  nombre: string;
  indicacionExtension: string;
  palabrasMinimas: number;
  palabrasMaximasRecomendadas: number;
  caracteresMinimos: number;
  tipoEditorial: "NOTA_BREVE" | "NOTA_INVESTIGACION" | "ENSAYO";
};

const ANALISIS_BREVE: ReglaTrabajoInv = {
  tipo: "ANALISIS_BREVE",
  nombre: "Análisis breve",
  indicacionExtension: "Extensión orientativa: entre 1 y 2 páginas.",
  palabrasMinimas: 500,
  palabrasMaximasRecomendadas: 800,
  caracteresMinimos: 3000,
  tipoEditorial: "NOTA_BREVE",
};

const NOTA_INVESTIGACION: ReglaTrabajoInv = {
  tipo: "NOTA_INVESTIGACION",
  nombre: "Nota de investigación",
  indicacionExtension: "Extensión orientativa: entre 2 y 3 páginas.",
  palabrasMinimas: 800,
  palabrasMaximasRecomendadas: 1200,
  caracteresMinimos: 5000,
  tipoEditorial: "NOTA_INVESTIGACION",
};

const ENSAYO_ACADEMICO: ReglaTrabajoInv = {
  tipo: "ENSAYO_ACADEMICO",
  nombre: "Ensayo académico",
  indicacionExtension: "Extensión orientativa: más de 3 páginas.",
  palabrasMinimas: 1200,
  palabrasMaximasRecomendadas: 2000,
  caracteresMinimos: 7500,
  tipoEditorial: "ENSAYO",
};

export const REGLAS_TRABAJOS_INV: Record<string, ReglaTrabajoInv> = {
  "unidad-1": ANALISIS_BREVE,
  "unidad-2": ANALISIS_BREVE,
  "unidad-3": ANALISIS_BREVE,
  "unidad-4": NOTA_INVESTIGACION,
  "unidad-5": NOTA_INVESTIGACION,
  "unidad-6": NOTA_INVESTIGACION,
  "unidad-7": ENSAYO_ACADEMICO,
  "unidad-8": ENSAYO_ACADEMICO,
  "unidad-9": ENSAYO_ACADEMICO,
  "unidad-10": ENSAYO_ACADEMICO,
};

export function obtenerReglaTrabajoInv(unidadSlug: string) {
  return REGLAS_TRABAJOS_INV[unidadSlug] || null;
}
