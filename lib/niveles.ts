export const NIVELES = {
  ASP: {
    nombre: "Académico Aspirante",
    color: "#222222",
  },

  NOV: {
    nombre: "Académico Novicio",
    color: "#6f8760",
  },

  INV: {
    nombre: "Académico Investigador",
    color: "#6b6f1a",
  },

  NUM: {
    nombre: "Académico Numerario",
    color: "#4f623f",
  },
};

export function nombreNivel(codigo: string): string {
  return NIVELES[codigo as keyof typeof NIVELES]?.nombre || codigo;
}

export function colorNivel(codigo: string): string {
  return NIVELES[codigo as keyof typeof NIVELES]?.color || "#222222";
}