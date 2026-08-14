export type NivelCertificado =
  | "NOV"
  | "INV"
  | "NUM";

export type OrigenCertificado =
  | "FORMACION"
  | "RECONOCIMIENTO";

export type DatosTextoCertificado = {
  nivel: NivelCertificado;
  origen: OrigenCertificado;

  nombreNivel: string;

  institucion: string[];

  autoridad: string;

  otorgamiento: string;

  textoAntesNivel: string;

  justificacion: string[];

  leyendaOrigen: string;
};

export function nombreNivelCertificado(
  nivel: NivelCertificado
): string {
  switch (nivel) {
    case "NOV":
      return "ACADÉMICO NOVICIO";

    case "INV":
      return "ACADÉMICO INVESTIGADOR";

    case "NUM":
      return "ACADÉMICO NUMERARIO";
  }
}

export function obtenerTextoCertificado(
  nivel: NivelCertificado,
  origen: OrigenCertificado
): DatosTextoCertificado {
  const nombreNivel =
    nombreNivelCertificado(nivel);

  const institucion = [
    "LA ACADEMIA GUATEMALTECA DE",
    "ESTUDIOS NUMISMÁTICOS Y NOTAFÍLICOS",
  ];

  const autoridad =
    "POR MEDIO DE SU CONSEJO ACADÉMICO";

  const otorgamiento =
    "OTORGA A:";

  const textoAntesNivel =
    "LA CERTIFICACIÓN QUE LO ACREDITA COMO:";

  /*
   * =========================================================
   * NOVICIO — FORMACIÓN
   * =========================================================
   */

  if (
    nivel === "NOV" &&
    origen === "FORMACION"
  ) {
    return {
      nivel,
      origen,
      nombreNivel,
      institucion,
      autoridad,
      otorgamiento,
      textoAntesNivel,

      justificacion: [
        "HABIENDO CUMPLIDO SATISFACTORIAMENTE LOS REQUISITOS",
        "ACADÉMICOS Y FORMATIVOS ESTABLECIDOS PARA ESTE NIVEL.",
      ],

      leyendaOrigen:
        "ACREDITACIÓN OBTENIDA MEDIANTE FORMACIÓN",
    };
  }

  /*
   * =========================================================
   * INVESTIGADOR — FORMACIÓN
   * =========================================================
   */

  if (
    nivel === "INV" &&
    origen === "FORMACION"
  ) {
    return {
      nivel,
      origen,
      nombreNivel,
      institucion,
      autoridad,
      otorgamiento,
      textoAntesNivel,

      justificacion: [
        "HABIENDO CUMPLIDO SATISFACTORIAMENTE LOS REQUISITOS",
        "ACADÉMICOS Y FORMATIVOS ESTABLECIDOS PARA ESTE NIVEL.",
      ],

      leyendaOrigen:
        "ACREDITACIÓN OBTENIDA MEDIANTE FORMACIÓN",
    };
  }

  /*
   * =========================================================
   * INVESTIGADOR — MÉRITOS RECONOCIDOS
   * =========================================================
   */

  if (
    nivel === "INV" &&
    origen === "RECONOCIMIENTO"
  ) {
    return {
      nivel,
      origen,
      nombreNivel,
      institucion,
      autoridad,
      otorgamiento,
      textoAntesNivel,

      justificacion: [
        "EN RECONOCIMIENTO DE SU EXPERIENCIA, MÉRITOS ACADÉMICOS",
        "Y TRAYECTORIA EN EL ÁMBITO NUMISMÁTICO Y NOTAFÍLICO.",
      ],

      leyendaOrigen:
        "ACREDITACIÓN POR MÉRITOS RECONOCIDOS",
    };
  }

  /*
   * =========================================================
   * NUMERARIO — FORMACIÓN
   * =========================================================
   */

  if (
    nivel === "NUM" &&
    origen === "FORMACION"
  ) {
    return {
      nivel,
      origen,
      nombreNivel,
      institucion,
      autoridad,
      otorgamiento,
      textoAntesNivel,

      justificacion: [
        "HABIENDO CUMPLIDO SATISFACTORIAMENTE LOS REQUISITOS",
        "ACADÉMICOS ESTABLECIDOS PARA ALCANZAR ESTE NIVEL.",
      ],

      leyendaOrigen:
        "ACREDITACIÓN OBTENIDA MEDIANTE FORMACIÓN",
    };
  }

  /*
   * =========================================================
   * NUMERARIO — MÉRITOS RECONOCIDOS
   * =========================================================
   */

  return {
    nivel,
    origen,
    nombreNivel,
    institucion,
    autoridad,
    otorgamiento,
    textoAntesNivel,

    justificacion: [
      "EN RECONOCIMIENTO DE SU EXPERIENCIA, MÉRITOS ACADÉMICOS",
      "Y TRAYECTORIA EN EL ÁMBITO NUMISMÁTICO Y NOTAFÍLICO.",
    ],

    leyendaOrigen:
      "ACREDITACIÓN POR MÉRITOS RECONOCIDOS",
  };
}

export function abreviaturaNivelCertificado(
  nivel: NivelCertificado
): string {
  switch (nivel) {
    case "NOV":
      return "NOV";

    case "INV":
      return "INV";

    case "NUM":
      return "NUM";
  }
}

export function prefijoRegistroCertificado(
  nivel: NivelCertificado,
  fecha = new Date()
): string {
  const anio = fecha.getFullYear();

  return `AGENN-${abreviaturaNivelCertificado(
    nivel
  )}-${anio}-`;
}

export function formatearCorrelativoCertificado(
  numero: number
): string {
  return String(numero).padStart(
    6,
    "0"
  );
}

export function esNivelCertificable(
  valor: unknown
): valor is NivelCertificado {
  return (
    valor === "NOV" ||
    valor === "INV" ||
    valor === "NUM"
  );
}

export function esOrigenCertificable(
  valor: unknown
): valor is OrigenCertificado {
  return (
    valor === "FORMACION" ||
    valor === "RECONOCIMIENTO"
  );
}