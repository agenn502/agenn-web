export type EstadoModulo = "operativo" | "en-desarrollo" | "pendiente";

export type ModuloProyecto = {
  nombre: string;
  estado: EstadoModulo;
  detalle: string;
  href?: string;
};

export type IncidenciaProyecto = {
  fecha: string;
  titulo: string;
  causa?: string;
  solucion: string;
};

export const CONTINUIDAD = {
  version: "0.8.4",
  estadoGeneral: "Operativo",
  ultimaActualizacion: "31 de julio de 2026",

  propietarioCodigo: "NUM0002",

  ultimoHito: {
    titulo: "Unidad 1 del proceso INV concluida",
    descripcion:
      "Se completó el flujo de cuestionario, ensayo, publicación en una red social, revisión del Consejo Académico y desbloqueo automático de la Unidad 2.",
  },

  siguientePaso: {
    titulo: "Retomar la Unidad 1 del proceso NOV",
    descripcion:
      "Separar el contenido teórico y las 50 preguntas del page.tsx, trasladándolos a content/proceso_nov/unidad1.ts. El archivo debe exportar TEORIA y QUESTIONS.",
    href: "/miembros/proceso_nov/unidad-1",
  },

  recomendacionPrevia: {
    titulo: "Antes de continuar",
    descripcion:
      "Primero confirma que content/proceso_nov/unidad1.ts exporte TEORIA y QUESTIONS. El último error de compilación ocurrió porque solo se exportaba TEORIA.",
  },

  recordatorios: [
    "El proceso NOV no requiere ensayo ni publicación en redes sociales en cada unidad.",
    "La Unidad 1 de NOV tendrá 50 preguntas y se completa únicamente con el cuestionario.",
    "El contenido de las unidades debe mantenerse fuera del page.tsx.",
    "El page.tsx debe encargarse del flujo, progreso y presentación; unidad1.ts debe contener teoría y preguntas.",
    "No copiar al proceso NOV la lógica de aprobación del Consejo Académico utilizada en las unidades INV.",
    "La tarea final de NOV sí será revisada por el Consejo Académico antes del ascenso a INV.",
  ],

  modulos: [
    {
      nombre: "Supabase",
      estado: "operativo",
      detalle: "Conexión y tablas principales disponibles.",
    },
    {
      nombre: "Autenticación local",
      estado: "operativo",
      detalle: "El área privada recupera el usuario desde localStorage.",
    },
    {
      nombre: "Proceso NOV",
      estado: "en-desarrollo",
      detalle: "Estructura general creada; falta completar y modularizar la Unidad 1.",
      href: "/miembros/proceso_nov",
    },
    {
      nombre: "Proceso INV",
      estado: "en-desarrollo",
      detalle: "Unidad 1 funcional; unidades 2 a 10 y tarea final pendientes.",
      href: "/miembros/proceso_inv",
    },
    {
      nombre: "Revisión del Consejo Académico",
      estado: "operativo",
      detalle: "Aprobación, rechazo, observaciones y desbloqueo de la siguiente unidad implementados.",
      href: "/miembros/proceso-aprobacion",
    },
    {
      nombre: "Ensayos académicos",
      estado: "operativo",
      detalle: "Edición, publicación, evidencia social y catálogo disponibles.",
      href: "/miembros/ensayos",
    },
    {
      nombre: "Proceso NUM",
      estado: "pendiente",
      detalle: "Se desarrollará después de completar los procesos NOV e INV.",
    },
  ] satisfies ModuloProyecto[],

  incidencias: [
    {
      fecha: "31/07/2026",
      titulo: "React Client Manifest desactualizado",
      causa: "Caché antigua de Next.js/Turbopack.",
      solucion:
        "Detener npm, borrar únicamente la carpeta .next y ejecutar nuevamente npm run dev.",
    },
    {
      fecha: "31/07/2026",
      titulo: "Turbopack detectaba una raíz incorrecta",
      causa: "Existía C:/Users/geperez/package-lock.json fuera del proyecto.",
      solucion:
        "Se renombró el archivo externo a package-lock.bak. No debe volver a crearse un package-lock.json en C:/Users/geperez.",
    },
    {
      fecha: "31/07/2026",
      titulo: "QUESTIONS no exportado en NOV Unidad 1",
      causa: "content/proceso_nov/unidad1.ts exportaba TEORIA, pero no QUESTIONS.",
      solucion:
        "Agregar y exportar el arreglo QUESTIONS en content/proceso_nov/unidad1.ts antes de cargar la unidad.",
    },
  ] satisfies IncidenciaProyecto[],
};
