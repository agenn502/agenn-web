"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type Question = {
  id: number;
  kind: "vf" | "mc";
  prompt: string;
  options: string[];
  correct: string;
  feedback: string;
};

type ProgressPayload = {
  currentIndex: number;
  completedIds: number[];
  selectedAnswers: Record<number, string>;
  attemptCounts: Record<number, number>;
  lastWrongQuestionId?: number | null;
  finished: boolean;
};

const TEORIA = [
  {
    titulo: "1. Introducción",
    texto:
      "Antes de abordar el estudio específico de la historia monetaria de Guatemala, es imprescindible comprender los fundamentos conceptuales que sustentan la numismática, la notafilia y la evolución del dinero como fenómeno histórico. Este módulo tiene como finalidad proporcionar al estudiante las herramientas básicas necesarias para interpretar correctamente monedas, billetes y otros objetos vinculados al intercambio económico.\n\nLa numismática no debe entenderse únicamente como el estudio de objetos antiguos o coleccionables, sino como una disciplina que permite analizar procesos históricos complejos. A través del dinero es posible comprender transformaciones económicas, estructuras de poder, sistemas políticos y cambios culturales. Cada moneda o billete es, en esencia, un documento histórico que contiene información sobre la sociedad que lo produjo.\n\nDe esta manera, el estudiante debe comenzar a desarrollar una visión analítica del dinero, entendiendo que su valor no es únicamente económico, sino también histórico, simbólico e institucional. Este enfoque será fundamental para el desarrollo de las unidades posteriores.",
  },
  {
    titulo: "2. ¿Qué es la numismática?",
    texto:
      "La numismática es la disciplina que estudia las monedas y otros objetos relacionados con el dinero, entendidos como instrumentos emitidos por una autoridad con el propósito de facilitar el intercambio económico. Sin embargo, su alcance va mucho más allá de esta definición básica.\n\nA través del estudio de las monedas es posible analizar múltiples dimensiones de la historia. En el ámbito político, las monedas reflejan cambios de gobierno, legitimación del poder y construcción de identidad estatal. En el ámbito económico, permiten observar sistemas monetarios, reformas y crisis. En el ámbito artístico, evidencian estilos, técnicas de grabado e iconografía. En el ámbito cultural, transmiten símbolos, valores y representaciones sociales.\n\nEl análisis numismático requiere observar cuidadosamente elementos como el material, el peso, el diámetro, el diseño, las inscripciones, la fecha de emisión y la ceca o lugar de acuñación. Cada uno de estos elementos aporta información específica que permite contextualizar la pieza.\n\nPor lo tanto, la numismática es una disciplina interdisciplinaria que combina historia, economía, arte y análisis técnico, y que exige del estudiante una observación detallada y un enfoque interpretativo.",
  },
  {
    titulo: "3. ¿Qué es la notafilia?",
    texto:
      "La notafilia es una especialización dentro de la numismática que se enfoca en el estudio del papel moneda y otros documentos financieros como billetes, bonos, vales, acciones y cheques. Su importancia radica en que permite analizar una etapa más reciente y compleja del desarrollo del dinero: el sistema fiduciario.\n\nA diferencia de las monedas metálicas, los billetes no poseen valor intrínseco, sino que su valor depende de la confianza en la institución emisora. Esto implica que el análisis notafílico debe centrarse no solo en las características físicas del billete, sino también en su contexto institucional, económico y político.\n\nLos billetes suelen presentar diseños más complejos que las monedas, incorporando elementos gráficos detallados, símbolos nacionales, personajes históricos y sistemas de seguridad avanzados. Esto los convierte en objetos especialmente ricos para el análisis histórico y cultural.\n\nPara el estudiante, la notafilia representa una herramienta fundamental para comprender la evolución moderna del dinero, así como la relación entre el Estado, la economía y la sociedad.",
  },
  {
    titulo: "4. Historia general del dinero",
    texto:
      "El dinero, tal como se conoce actualmente, es el resultado de un largo proceso de evolución que responde a las necesidades de intercambio de las sociedades humanas. Este proceso puede dividirse en varias etapas fundamentales.\n\nEn las primeras sociedades, el intercambio se realizaba mediante el trueque, un sistema basado en el intercambio directo de bienes. Sin embargo, este sistema presentaba limitaciones importantes, como la necesidad de coincidencia de intereses entre las partes.\n\nPosteriormente surge el dinero mercancía, en el cual ciertos bienes como la sal, el ganado, el cacao o los metales comienzan a utilizarse como referencia de valor. Estos bienes eran aceptados por su utilidad o escasez.\n\nEl uso de metales preciosos como el oro y la plata permitió almacenar valor de forma más eficiente, dando paso a la moneda acuñada. Las autoridades comenzaron a emitir piezas con peso y valor definidos, facilitando el comercio y estandarizando el sistema.\n\nEl papel moneda surge como una solución práctica para evitar el transporte de grandes cantidades de metal, representando valor mediante documentos respaldados por instituciones financieras.\n\nFinalmente, el dinero moderno incluye tanto formas físicas como digitales, y su valor depende de sistemas financieros complejos basados en la confianza, la regulación y la política económica.",
  },
  {
    titulo: "5. Conceptos básicos para el estudio numismático",
    texto:
      "Para analizar correctamente monedas y billetes, es necesario manejar un conjunto de conceptos fundamentales que permiten describir y clasificar las piezas de manera precisa.\n\nEl anverso corresponde a la cara principal de la moneda o billete, donde suele ubicarse la información más relevante. El reverso es la cara opuesta, que complementa el diseño. La denominación indica el valor nominal del objeto dentro del sistema monetario.\n\nLa serie agrupa emisiones con características comunes, mientras que la fecha permite ubicar la pieza en un contexto temporal. El emisor es la institución responsable de la producción del dinero, y las firmas identifican a las autoridades que validan el documento.\n\nEn el caso de las monedas, la ceca indica el lugar de acuñación. El valor facial representa el valor oficial asignado por la autoridad emisora, independientemente del valor de mercado.\n\nEl dominio de estos conceptos es esencial para el desarrollo del análisis numismático y notafílico, ya que proporciona un lenguaje técnico común.",
  },
  {
    titulo: "6. Variantes y clasificación",
    texto:
      "En numismática y notafilia, es importante comprender que no todas las piezas son idénticas, incluso dentro de una misma emisión. Existen variantes que pueden surgir por cambios intencionales o por errores en el proceso de producción.\n\nEstas variantes pueden incluir modificaciones en el diseño, diferencias en las firmas, cambios en el color, variaciones en el tamaño o errores de impresión. Algunas de estas diferencias son evidentes, mientras que otras requieren un análisis detallado.\n\nLa clasificación permite organizar estas piezas de manera sistemática, facilitando su estudio e identificación. Un sistema de clasificación bien estructurado permite agrupar las piezas según criterios como el emisor, la denominación, el período histórico o el diseño.\n\nPara el estudiante, la clasificación no es solo una herramienta organizativa, sino un método de análisis que permite comprender mejor la diversidad y evolución del dinero.",
  },
  {
    titulo: "7. El coleccionismo",
    texto:
      "El coleccionismo es una práctica central dentro de la numismática y la notafilia, pero no debe entenderse como una simple acumulación de objetos. Un coleccionista desarrolla una relación activa con sus piezas, basada en el conocimiento, la organización y la interpretación.\n\nEl coleccionismo implica investigar el origen de las piezas, clasificarlas según criterios definidos, documentar sus características y conservarlas adecuadamente. Esto convierte la colección en un sistema estructurado de conocimiento.\n\nExisten diferentes enfoques de coleccionismo, como por país, por época, por denominación o por temática. Cada uno de estos enfoques responde a intereses específicos del coleccionista.\n\nAdemás, el coleccionismo implica una responsabilidad ética, especialmente en lo relacionado con la autenticidad y la conservación de las piezas, ya que estas forman parte del patrimonio histórico.",
  },
  {
    titulo: "8. Conservación y estado de las piezas",
    texto:
      "El estado de conservación es uno de los factores más importantes en la numismática y la notafilia, ya que influye directamente en el valor y la integridad de una pieza.\n\nLas monedas y billetes pueden deteriorarse debido al desgaste, la humedad, la exposición a la luz, la manipulación inadecuada o la limpieza incorrecta. En el caso del papel moneda, el riesgo es mayor debido a la fragilidad del material.\n\nPara conservar adecuadamente una pieza, es necesario manipularla con cuidado, evitar condiciones ambientales adversas y utilizar materiales de almacenamiento adecuados, como protectores libres de ácido.\n\nEl estudiante debe comprender que la conservación no solo protege el valor económico de una pieza, sino también su valor histórico.",
  },
  {
    titulo: "9. Falsificaciones",
    texto:
      "Las falsificaciones han existido a lo largo de toda la historia del dinero, tanto en monedas como en billetes. Estas pueden tener fines económicos, pero también pueden formar parte de contextos históricos específicos.\n\nIdentificar falsificaciones requiere un análisis detallado de aspectos como el material, la calidad de impresión, los detalles de diseño y los elementos de seguridad. En muchos casos, las falsificaciones presentan inconsistencias que pueden detectarse mediante la observación cuidadosa.\n\nEl estudio de las falsificaciones es importante no solo para evitar pérdidas económicas, sino también para comprender los desafíos que han enfrentado los sistemas monetarios a lo largo del tiempo.",
  },
  {
    titulo: "10. Introducción a Guatemala",
    texto:
      "Antes de la introducción de la moneda formal, en el territorio que hoy corresponde a Guatemala existieron sistemas de intercambio basados en bienes como el cacao, el jade y otros productos de valor cultural y económico. Estos sistemas reflejan formas tempranas de organización económica.\n\nCon la llegada de los españoles, se introduce la moneda metálica como parte del sistema colonial, marcando el inicio de la historia numismática formal del país. Este cambio representa la integración de Guatemala a un sistema económico global.\n\nComprender esta transición es fundamental para analizar el desarrollo posterior del sistema monetario guatemalteco, que será estudiado en las unidades siguientes.",
  },
  {
    titulo: "11. Conclusión",
    texto:
      "La numismática y la notafilia son disciplinas que permiten analizar la historia desde una perspectiva concreta y material. Las monedas y los billetes no son únicamente medios de intercambio, sino testimonios de procesos históricos complejos.\n\nEste módulo proporciona las bases necesarias para desarrollar una visión crítica del dinero, entendiéndolo como un fenómeno económico, político y cultural. A partir de estos fundamentos, el estudiante estará preparado para abordar el estudio de la historia monetaria de Guatemala con mayor profundidad.",
  },
];

const QUESTIONS: Question[] = [
  {
    id: 1,
    kind: "vf",
    prompt: "La numismática es únicamente el estudio de monedas antiguas.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "La numismática no se limita al estudio de monedas antiguas, sino que abarca monedas de todas las épocas, incluyendo modernas y contemporáneas. No se centra únicamente en el objeto físico, sino en su contexto histórico, político, económico y cultural. Es una disciplina interdisciplinaria que conecta historia, economía y arte.",
  },
  {
    id: 2,
    kind: "mc",
    prompt: "¿Qué estudia principalmente la numismática?",
    options: [
      "Solo metales preciosos",
      "Monedas y su contexto",
      "Únicamente billetes",
      "Solo economía moderna",
    ],
    correct: "Monedas y su contexto",
    feedback:
      "La numismática estudia las monedas desde una perspectiva integral: no solo su material o valor económico, sino también su contexto histórico, político y cultural. Analiza quién las emitió, en qué período, con qué finalidad y qué elementos simbólicos contienen.",
  },
  {
    id: 3,
    kind: "vf",
    prompt: "La notafilia es una disciplina independiente de la numismática.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "La notafilia no es una disciplina independiente, sino una rama especializada dentro de la numismática. Mientras la numismática se enfoca en monedas, la notafilia estudia el papel moneda y documentos financieros como billetes, bonos y vales.",
  },
  {
    id: 4,
    kind: "mc",
    prompt: "¿Qué estudia la notafilia?",
    options: [
      "Monedas exclusivamente",
      "Billetes y documentos similares",
      "Solo metales",
      "Economía digital",
    ],
    correct: "Billetes y documentos similares",
    feedback:
      "La notafilia estudia el papel moneda y otros documentos financieros como bonos, vales y certificados. A diferencia de las monedas, los billetes incluyen diseños más complejos con imágenes, textos y elementos de seguridad, convirtiéndolos en documentos visuales ricos en información.",
  },
  {
    id: 5,
    kind: "vf",
    prompt: "Las monedas y billetes no tienen valor histórico.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "Las monedas y billetes son documentos históricos fundamentales. Reflejan cambios de gobierno, símbolos nacionales, ideologías políticas y momentos históricos importantes. Para la numismática y la notafilia, son fuentes primarias de información que permiten estudiar la historia desde una perspectiva material.",
  },
  {
    id: 6,
    kind: "mc",
    prompt: "¿Cuál fue una de las primeras formas de intercambio?",
    options: ["Tarjetas", "Trueque", "Cheques", "Transferencias"],
    correct: "Trueque",
    feedback:
      "El trueque fue una de las primeras formas de intercambio, basado en el intercambio directo de bienes sin dinero. Sus limitaciones, como la necesidad de coincidencia de intereses entre las partes, impulsaron la creación de sistemas más eficientes como el dinero mercancía y las monedas.",
  },
  {
    id: 7,
    kind: "vf",
    prompt: "El trueque era un sistema perfecto sin limitaciones.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "El trueque presentaba múltiples limitaciones: requería coincidencia de intereses entre las partes, no permitía establecer fácilmente el valor de los bienes ni almacenar riqueza eficientemente. Estas dificultades llevaron al desarrollo de sistemas más avanzados como el dinero mercancía y las monedas.",
  },
  {
    id: 8,
    kind: "mc",
    prompt: "¿Qué es el dinero mercancía?",
    options: [
      "Dinero digital",
      "Bienes usados como medio de intercambio",
      "Solo monedas",
      "Billetes modernos",
    ],
    correct: "Bienes usados como medio de intercambio",
    feedback:
      "El dinero mercancía consiste en bienes con valor propio que también se usan como medio de intercambio. Ejemplos históricos incluyen el cacao, la sal, el ganado o metales preciosos. Representa una etapa intermedia entre el trueque y la moneda acuñada.",
  },
  {
    id: 9,
    kind: "vf",
    prompt: "El oro y la plata fueron importantes en la evolución del dinero.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El oro y la plata fueron fundamentales en la evolución del dinero gracias a sus propiedades: durabilidad, divisibilidad, portabilidad y escasez. Con el tiempo se acuñaron en monedas con peso y valor definidos, estandarizando el comercio y facilitando transacciones más complejas.",
  },
  {
    id: 10,
    kind: "mc",
    prompt: "¿Por qué surgió el papel moneda?",
    options: [
      "Por decoración",
      "Para facilitar el transporte de valor",
      "Por religión",
      "Por agricultura",
    ],
    correct: "Para facilitar el transporte de valor",
    feedback:
      "El papel moneda surgió como solución práctica para evitar transportar grandes cantidades de metales preciosos. Los documentos representaban ese valor y estaban respaldados por instituciones. Con el tiempo evolucionó hacia sistemas fiduciarios donde el valor depende de la confianza en el emisor.",
  },
  {
    id: 11,
    kind: "vf",
    prompt:
      "El anverso de una moneda o billete es la cara principal donde aparece la información más relevante.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El anverso es la cara principal de una moneda o billete, donde se ubican los elementos más importantes como el emisor, la denominación o figuras representativas. En Guatemala, por ley el escudo ha figurado en el anverso, situación que suele generar confusión.",
  },
  {
    id: 12,
    kind: "mc",
    prompt: "¿Qué elemento indica el valor de una moneda o billete?",
    options: ["Color", "Denominación", "Tamaño", "Diseño"],
    correct: "Denominación",
    feedback:
      "La denominación es el valor nominal asignado a una moneda o billete por la autoridad emisora. Aunque el tamaño o el color ayudan a distinguir diferentes valores, no los determinan. La denominación es clave para entender cómo funciona el sistema monetario.",
  },
  {
    id: 13,
    kind: "vf",
    prompt:
      "El reverso de una moneda o billete contiene información secundaria o complementaria.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El reverso es la cara opuesta al anverso y contiene información complementaria como paisajes, símbolos culturales o elementos decorativos. Aunque se considera secundaria en jerarquía, aporta valiosa información cultural y artística. En muchos casos puede ser más rico visualmente que el anverso.",
  },
  {
    id: 14,
    kind: "mc",
    prompt: "¿Qué indica la fecha en una moneda o billete?",
    options: ["El peso", "El año de emisión", "El material", "El valor real"],
    correct: "El año de emisión",
    feedback:
      "La fecha indica el año en que fue emitido o acuñado, permitiendo ubicar la pieza en un contexto histórico específico. Este dato ayuda a relacionarla con eventos históricos, gobiernos o reformas monetarias. En algunos casos puede no coincidir exactamente con el año de circulación.",
  },
  {
    id: 15,
    kind: "vf",
    prompt: "El emisor es la institución responsable de crear el dinero.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El emisor es la institución encargada de producir y poner en circulación el dinero. Puede ser un banco central, el Estado o bancos privados en ciertos períodos históricos. Su identidad determina el respaldo y la confianza en la pieza, aspecto clave en sistemas fiduciarios.",
  },
  {
    id: 16,
    kind: "mc",
    prompt: "¿Qué elemento identifica a las autoridades responsables en un billete?",
    options: ["Color", "Firmas", "Tamaño", "Forma"],
    correct: "Firmas",
    feedback:
      "Las firmas en un billete corresponden a funcionarios de la institución emisora y validan el documento. También permiten identificar el período de emisión, ya que sus cambios pueden indicar diferentes emisiones dentro de un mismo diseño, lo cual es clave para clasificar variantes.",
  },
  {
    id: 17,
    kind: "vf",
    prompt: "El valor facial siempre es igual al valor en el mercado numismático.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "El valor facial es el nominal asignado a la pieza, mientras que el valor numismático depende de la rareza, estado de conservación, demanda y relevancia histórica. Una pieza con bajo valor facial puede ser muy valiosa si es escasa, y viceversa.",
  },
  {
    id: 18,
    kind: "mc",
    prompt: "¿Qué es una serie en numismática?",
    options: [
      "Un grupo de billetes o monedas con características comunes",
      "Un número aleatorio",
      "Un error de impresión",
      "Un material específico",
    ],
    correct: "Un grupo de billetes o monedas con características comunes",
    feedback:
      "Una serie agrupa monedas o billetes que comparten características similares como diseño, período de emisión o firmas. Las series pueden incluir variaciones menores que dan lugar a subseries o variantes, y son fundamentales para estructurar una colección coherente.",
  },
  {
    id: 19,
    kind: "vf",
    prompt: "La ceca indica el lugar donde se acuñó una moneda.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "La ceca es el lugar donde se acuñan las monedas, representada frecuentemente por un símbolo o letra. Es importante porque diferentes cecas pueden producir monedas con ligeras variaciones, y permite analizar la distribución geográfica de la producción monetaria.",
  },
  {
    id: 20,
    kind: "mc",
    prompt: "¿Qué representa el valor facial?",
    options: [
      "El valor histórico",
      "El valor oficial asignado",
      "El valor del material",
      "El valor de mercado",
    ],
    correct: "El valor oficial asignado",
    feedback:
      "El valor facial es el valor oficial que la autoridad emisora asigna a una moneda o billete para que funcione como medio de intercambio. No necesariamente coincide con el valor real en términos de material o mercado numismático.",
  },
  {
    id: 21,
    kind: "vf",
    prompt:
      "La clasificación en numismática sirve únicamente para ordenar colecciones.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "La clasificación es una herramienta fundamental de análisis, no solo de orden. Permite identificar relaciones entre piezas, comprender su evolución histórica, detectar diferencias entre emisiones y facilitar la comunicación entre coleccionistas y especialistas.",
  },
  {
    id: 22,
    kind: "mc",
    prompt:
      "¿Qué criterio permite agrupar billetes según la institución que los emitió?",
    options: ["Color", "Emisor", "Tamaño", "Material"],
    correct: "Emisor",
    feedback:
      "La clasificación por emisor agrupa billetes según la institución responsable de su emisión: bancos privados, bancos centrales o el Estado. Este criterio permite comprender el contexto institucional del dinero y diferenciar períodos históricos como la banca privada y la centralización.",
  },
  {
    id: 23,
    kind: "vf",
    prompt:
      "Dos billetes con el mismo diseño pueden pertenecer a emisiones diferentes.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Es posible que dos billetes con el mismo diseño general pertenezcan a emisiones diferentes. Esto ocurre en reimpresiones con cambios menores como nuevas firmas, modificaciones de color o variaciones en la numeración, diferencias clave en la clasificación notafílica.",
  },
  {
    id: 24,
    kind: "mc",
    prompt: "¿Qué es una variante en notafilia?",
    options: [
      "Un billete falso",
      "Una diferencia dentro de un mismo tipo de billete",
      "Un error sin importancia",
      "Un billete destruido",
    ],
    correct: "Una diferencia dentro de un mismo tipo de billete",
    feedback:
      "Una variante es una diferencia dentro de un mismo tipo de billete, como cambios en firmas, colores, numeración o detalles gráficos. Suelen surgir entre distintas emisiones o reimpresiones e identificarlas requiere observación detallada y comparación entre ejemplares.",
  },
  {
    id: 25,
    kind: "vf",
    prompt: "Todas las variantes tienen el mismo valor numismático.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "No todas las variantes tienen el mismo valor. Algunas son muy comunes y no representan mayor aumento de valor, mientras que otras, especialmente las raras, pueden ser altamente valoradas. El valor depende de la rareza, demanda y estado de conservación.",
  },
  {
    id: 26,
    kind: "mc",
    prompt: "¿Cuál de los siguientes puede ser un ejemplo de variante?",
    options: [
      "Cambio en firmas",
      "Cambio en el clima",
      "Cambio en el idioma del país",
      "Cambio en la población",
    ],
    correct: "Cambio en firmas",
    feedback:
      "Un cambio en las firmas es uno de los ejemplos más comunes de variante. Las firmas corresponden a funcionarios de la institución emisora y pueden cambiar con el tiempo, generando distintas versiones de un mismo diseño e identificando emisiones específicas.",
  },
  {
    id: 27,
    kind: "vf",
    prompt: "Los errores de impresión pueden ser considerados variantes.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Los errores de impresión son un tipo especial de variante, pues representan diferencias respecto al diseño original. Pueden incluir desplazamientos de tinta, impresiones incompletas o fallas en el corte. Suelen ser raros y altamente valorados por su singularidad.",
  },
  {
    id: 28,
    kind: "mc",
    prompt: "¿Qué criterio permite clasificar billetes según su valor?",
    options: ["Diseño", "Denominación", "Color", "Tamaño"],
    correct: "Denominación",
    feedback:
      "La denominación permite clasificar billetes según su valor nominal dentro del sistema monetario. Refleja la estructura económica de la sociedad al mostrar qué valores eran necesarios para las transacciones en un período determinado.",
  },
  {
    id: 29,
    kind: "vf",
    prompt: "Un mismo billete puede tener subvariantes.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Un billete puede presentar subvariantes: diferencias aún más específicas dentro de una misma categoría, como ligeras variaciones de color, cambios en la numeración o pequeñas modificaciones de diseño. Son importantes para coleccionistas avanzados.",
  },
  {
    id: 30,
    kind: "mc",
    prompt: "¿Por qué es importante comparar billetes entre sí?",
    options: [
      "Para decorar",
      "Para identificar diferencias y variantes",
      "Para doblarlos mejor",
      "Para reducir su valor",
    ],
    correct: "Para identificar diferencias y variantes",
    feedback:
      "La comparación es fundamental en la notafilia para detectar variantes, errores de impresión y cambios en las emisiones entre billetes que a simple vista parecen iguales. Desarrolla habilidades de observación y permite comprender la evolución de un diseño.",
  },
  {
    id: 31,
    kind: "vf",
    prompt:
      "El coleccionismo consiste únicamente en acumular la mayor cantidad de billetes posible.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "El coleccionismo no se basa en la acumulación sin criterio, sino en la selección organizada con un propósito definido. Un coleccionista establece objetivos, investiga, clasifica y documenta sus piezas. El valor de una colección depende de su coherencia y calidad, no de su cantidad.",
  },
  {
    id: 32,
    kind: "mc",
    prompt:
      "¿Qué tipo de colección se enfoca en un tema específico (por ejemplo, animales o personajes)?",
    options: ["Geográfica", "Temática", "Aleatoria", "Comercial"],
    correct: "Temática",
    feedback:
      "La colección temática se organiza en torno a un concepto específico como fauna, personajes históricos, arquitectura o símbolos culturales. Permite analizar cómo un mismo tema aparece representado en diferentes billetes de distintos países o épocas.",
  },
  {
    id: 33,
    kind: "vf",
    prompt: "El estado de conservación de un billete no afecta su valor.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "El estado de conservación es uno de los factores más importantes en la valoración de un billete. Dobleces, manchas, rasgaduras o desgaste reducen significativamente su valor. Preservar el estado original es esencial tanto desde el punto de vista estético como histórico y económico.",
  },
  {
    id: 34,
    kind: "mc",
    prompt: "¿Qué grado de conservación indica un billete sin uso?",
    options: ["Fino", "Regular", "Sin circular", "Deteriorado"],
    correct: "Sin circular",
    feedback:
      "El grado 'sin circular' describe un billete que no ha sido utilizado en transacciones y conserva todas sus características originales: sin dobleces, manchas ni desgaste. Es el nivel más alto de conservación y generalmente el más valorado por coleccionistas.",
  },
  {
    id: 35,
    kind: "vf",
    prompt:
      "Los billetes deben protegerse de factores como la humedad y la luz.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El papel moneda es delicado y puede deteriorarse fácilmente. La humedad causa manchas y deformaciones, la luz solar desvanece los colores, y el calor y el polvo también afectan su estado. Almacenarlos en condiciones controladas es una práctica esencial.",
  },
  {
    id: 36,
    kind: "mc",
    prompt: "¿Qué material es adecuado para guardar billetes?",
    options: [
      "Papel periódico",
      "Plástico común",
      "Protectores libres de ácido",
      "Cartón reciclado",
    ],
    correct: "Protectores libres de ácido",
    feedback:
      "Los protectores libres de ácido son los más adecuados para almacenar billetes, ya que no reaccionan químicamente con el papel y evitan su deterioro a largo plazo. Además, permiten manipular las piezas sin contacto directo, protegiéndolas de grasa y humedad.",
  },
  {
    id: 37,
    kind: "vf",
    prompt:
      "Manipular billetes directamente con las manos no representa ningún riesgo.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "El contacto directo con las manos puede dañar los billetes debido a la grasa, humedad y suciedad de la piel, generando manchas o deterioro del papel. Se recomienda usar guantes o sujetar los billetes por los bordes y evitar manipularlos innecesariamente.",
  },
  {
    id: 38,
    kind: "mc",
    prompt:
      "¿Qué grado de conservación describe un billete con ligero desgaste pero buena apariencia?",
    options: ["Sin circular", "Muy fino", "Deteriorado", "Destruido"],
    correct: "Muy fino",
    feedback:
      "Un billete en estado 'muy fino' presenta signos leves de uso como pequeños dobleces o desgaste ligero, pero conserva una apariencia general atractiva. Es inferior al 'sin circular' pero sigue siendo altamente valorado en el coleccionismo.",
  },
  {
    id: 39,
    kind: "vf",
    prompt: "El coleccionismo puede ayudar a preservar el patrimonio histórico.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El coleccionismo contribuye a la preservación del patrimonio histórico al conservar piezas que podrían deteriorarse o desaparecer. Los coleccionistas actúan como custodios de documentos que reflejan la historia económica y cultural, transmitiendo ese conocimiento a futuras generaciones.",
  },
  {
    id: 40,
    kind: "mc",
    prompt: "¿Cuál es una práctica adecuada en el coleccionismo?",
    options: [
      "Doblar billetes para guardarlos",
      "Mezclar piezas sin orden",
      "Clasificar y proteger las piezas",
      "Limpiarlos con agua",
    ],
    correct: "Clasificar y proteger las piezas",
    feedback:
      "Clasificar y proteger las piezas es fundamental en el coleccionismo. Mantiene la colección organizada, facilita el estudio y evita daños físicos. Doblar, mezclar sin orden o limpiar con agua puede deteriorar los billetes de forma irreversible.",
  },
  {
    id: 41,
    kind: "vf",
    prompt:
      "El valor de un billete en el mercado siempre es igual a su valor nominal.",
    options: ["VERDADERO", "FALSO"],
    correct: "FALSO",
    feedback:
      "El valor nominal aparece impreso y sirve para el uso económico, mientras que el valor numismático depende de rareza, conservación, demanda y relevancia histórica. Un billete de baja denominación puede ser muy valioso si es escaso, y uno de alta denominación puede tener poco valor si es común.",
  },
  {
    id: 42,
    kind: "mc",
    prompt: "¿Cuál de los siguientes factores puede aumentar el valor de un billete?",
    options: ["Rasgaduras", "Manchas", "Rareza", "Dobleces"],
    correct: "Rareza",
    feedback:
      "La rareza es uno de los factores más importantes en la valoración. Una pieza difícil de encontrar en buen estado tendrá mayor demanda y valor. La rareza puede deberse a baja emisión, pérdida de ejemplares o características especiales como errores o variantes.",
  },
  {
    id: 43,
    kind: "vf",
    prompt: "La demanda de los coleccionistas influye en el valor de un billete.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "La demanda es un factor clave en el valor numismático. Cuando muchos coleccionistas buscan una misma pieza, su precio tiende a aumentar según la ley de oferta y demanda. Incluso billetes no extremadamente raros pueden subir de valor si se vuelven populares.",
  },
  {
    id: 44,
    kind: "mc",
    prompt: "¿Qué elemento puede reducir el valor de un billete?",
    options: ["Buen estado", "Rareza", "Deterioro", "Alta demanda"],
    correct: "Deterioro",
    feedback:
      "El deterioro reduce significativamente el valor de un billete, afectando su apariencia e integridad física. Rasgaduras, manchas, desgaste o pérdida de color disminuyen el atractivo para los coleccionistas, incluso en piezas raras.",
  },
  {
    id: 45,
    kind: "vf",
    prompt:
      "El mercado numismático es dinámico y puede cambiar con el tiempo.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "El mercado numismático cambia constantemente por factores como la oferta, la demanda, el descubrimiento de nuevas piezas y el interés de los coleccionistas. Eventos históricos o tendencias culturales también pueden influir en el valor de ciertas piezas.",
  },
  {
    id: 46,
    kind: "mc",
    prompt: "¿Qué elemento permite verificar la autenticidad de un billete?",
    options: [
      "Color únicamente",
      "Tamaño",
      "Elementos de seguridad",
      "Peso del papel",
    ],
    correct: "Elementos de seguridad",
    feedback:
      "Los elementos de seguridad como marcas de agua, hilos de seguridad, microimpresiones y tintas especiales son fundamentales para verificar la autenticidad. Son difíciles de reproducir en falsificaciones y su presencia confirma que una pieza es genuina.",
  },
  {
    id: 47,
    kind: "vf",
    prompt: "Las falsificaciones pueden formar parte del estudio numismático.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Las falsificaciones son también objeto de estudio en la numismática y la notafilia. Analizarlas permite comprender las técnicas de imitación y los métodos para prevenirlas. Algunas tienen valor histórico propio, y su estudio fortalece la capacidad de distinguir piezas auténticas.",
  },
  {
    id: 48,
    kind: "mc",
    prompt: "¿Qué práctica ayuda a evaluar correctamente un billete?",
    options: [
      "Ignorar su estado",
      "Observarlo superficialmente",
      "Analizar múltiples factores",
      "Doblarlo",
    ],
    correct: "Analizar múltiples factores",
    feedback:
      "Evaluar correctamente un billete requiere considerar múltiples factores: estado de conservación, rareza, demanda, autenticidad y contexto histórico. Analizar solo un aspecto puede llevar a conclusiones incorrectas e impedir una valoración justa.",
  },
  {
    id: 49,
    kind: "vf",
    prompt: "El papel moneda puede reflejar la historia y cultura de un país.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Los billetes son documentos culturales que reflejan la historia, los valores y la identidad de un país a través de personajes históricos, símbolos nacionales y elementos artísticos. También pueden reflejar cambios políticos o económicos relevantes.",
  },
  {
    id: 50,
    kind: "mc",
    prompt: "¿Cuál es el objetivo final del estudio numismático y notafílico?",
    options: [
      "Acumular objetos",
      "Comprender el dinero en su contexto",
      "Destruir billetes antiguos",
      "Reducir su uso",
    ],
    correct: "Comprender el dinero en su contexto",
    feedback:
      "El objetivo principal de la numismática y la notafilia es comprender el dinero en su contexto histórico, económico y cultural. No se trata solo de coleccionar, sino de analizar las piezas como documentos que reflejan la evolución de las sociedades.",
  },
];

const initialPayload: ProgressPayload = {
  currentIndex: 0,
  completedIds: [],
  selectedAnswers: {},
  attemptCounts: {},
  lastWrongQuestionId: null,
  finished: false,
};

export default function IntroductorioPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [modo, setModo] = useState<"teoria" | "quiz" | "final">("teoria");
  const [payload, setPayload] = useState<ProgressPayload>(initialPayload);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedbackMode, setFeedbackMode] = useState<"correct" | "incorrect" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentQuestion = QUESTIONS[payload.currentIndex] || null;
  const progresoQuiz = Math.round((payload.completedIds.length / QUESTIONS.length) * 100);

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const parsed = JSON.parse(stored) as User;
      const consejoNormalizado =
        parsed.consejo === true ||
        parsed.consejo === "true" ||
        parsed.consejo === "TRUE" ||
        parsed.consejo === 1;

      setUser(parsed);
      setEsConsejo(consejoNormalizado);

      if (!consejoNormalizado) {
        const { data } = await supabase
          .from("progreso_novicio")
          .select("*")
          .eq("user_codigo", parsed.codigo)
          .eq("unidad_slug", "introductorio")
          .maybeSingle();

        if (data?.respuestas) {
          const saved = data.respuestas as ProgressPayload;
          const hydrated = {
            ...initialPayload,
            ...saved,
          };
          setPayload(hydrated);

          if (hydrated.finished) {
            setModo("final");
          }
        }
      }

      setLoading(false);
    };

    cargar();
  }, []);

  const persistir = async (nextPayload: ProgressPayload) => {
    if (!user || esConsejo) return;

    setSaving(true);

    const { error } = await supabase.from("progreso_novicio").upsert(
      [
        {
          user_codigo: user.codigo,
          unidad_slug: "introductorio",
          completada: nextPayload.finished,
          porcentaje: Math.round((nextPayload.completedIds.length / QUESTIONS.length) * 100),
          respuestas: nextPayload,
          fecha_actualizacion: new Date().toISOString(),
        },
      ],
      { onConflict: "user_codigo,unidad_slug" }
    );

    setSaving(false);

    if (error) {
      alert("No se pudo guardar el avance: " + error.message);
    }
  };

  const iniciarCuestionario = () => {
    setModo(payload.finished ? "final" : "quiz");
  };

  const responder = async (option: string) => {
    if (!currentQuestion) return;

    const currentId = currentQuestion.id;
    const wasWrongBefore = payload.lastWrongQuestionId === currentId;
    const isCorrect = option === currentQuestion.correct;

    const nextAttempts = {
      ...payload.attemptCounts,
      [currentId]: (payload.attemptCounts[currentId] || 0) + 1,
    };

    const nextSelectedAnswers = {
      ...payload.selectedAnswers,
      [currentId]: option,
    };

    if (wasWrongBefore && isCorrect) {
      const nextCompleted = payload.completedIds.includes(currentId)
        ? payload.completedIds
        : [...payload.completedIds, currentId];

      const nextIndex = Math.min(payload.currentIndex + 1, QUESTIONS.length);
      const finished = nextCompleted.length === QUESTIONS.length;

      const nextPayload: ProgressPayload = {
        currentIndex: finished ? payload.currentIndex : nextIndex,
        completedIds: nextCompleted,
        selectedAnswers: nextSelectedAnswers,
        attemptCounts: nextAttempts,
        lastWrongQuestionId: null,
        finished,
      };

      setPayload(nextPayload);
      setSelectedOption("");
      setFeedbackMode(null);
      await persistir(nextPayload);

      if (finished) {
        setModo("final");
      }

      return;
    }

    setSelectedOption(option);
    setFeedbackMode(isCorrect ? "correct" : "incorrect");

    const stagingPayload: ProgressPayload = {
      ...payload,
      selectedAnswers: nextSelectedAnswers,
      attemptCounts: nextAttempts,
      lastWrongQuestionId: isCorrect ? null : currentId,
    };

    setPayload(stagingPayload);
    await persistir(stagingPayload);
  };

  const continuarTrasCorrecta = async () => {
    if (!currentQuestion) return;

    const currentId = currentQuestion.id;
    const nextCompleted = payload.completedIds.includes(currentId)
      ? payload.completedIds
      : [...payload.completedIds, currentId];

    const nextIndex = Math.min(payload.currentIndex + 1, QUESTIONS.length);
    const finished = nextCompleted.length === QUESTIONS.length;

    const nextPayload: ProgressPayload = {
      currentIndex: finished ? payload.currentIndex : nextIndex,
      completedIds: nextCompleted,
      selectedAnswers: payload.selectedAnswers,
      attemptCounts: payload.attemptCounts,
      lastWrongQuestionId: null,
      finished,
    };

    setPayload(nextPayload);
    setSelectedOption("");
    setFeedbackMode(null);
    await persistir(nextPayload);

    if (finished) {
      setModo("final");
    }
  };

  const repetirPregunta = () => {
    setSelectedOption("");
    setFeedbackMode(null);
  };

  const continuarMasTarde = async () => {
    await persistir(payload);
    router.push("/miembros/proceso_nov");
  };

  const estadoActual = useMemo(() => {
    if (!currentQuestion) return "";
    return `Pregunta ${payload.currentIndex + 1} de ${QUESTIONS.length}`;
  }, [currentQuestion, payload.currentIndex]);

  if (loading) return <div>Cargando módulo introductorio...</div>;
  if (!user) return <div>Cargando usuario...</div>;

  return (
    <div style={{ maxWidth: "980px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 0.4rem 0",
              fontSize: "0.82rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#6b6f1a",
              fontWeight: 700,
            }}
          >
            Nivel Novicio
          </p>
          <h1 style={{ margin: 0 }}>Módulo Introductorio</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#555" }}>
            Fundamentos de numismática, notafilia e historia del dinero.
          </p>
        </div>

        {modo !== "teoria" && (
          <div
            style={{
              minWidth: "260px",
              background: "white",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "0.9rem 1rem",
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0" }}>
              <strong>Avance del cuestionario:</strong> {progresoQuiz}%
            </p>
            <div
              style={{
                width: "100%",
                height: "12px",
                background: "#e6dfd1",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progresoQuiz}%`,
                  height: "100%",
                  background: "#6b6f1a",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {modo === "teoria" && (
        <>
          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button
              onClick={iniciarCuestionario}
              style={{
                background: "#6b6f1a",
                color: "white",
                padding: "0.8rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {payload.completedIds.length > 0 ? "Continuar cuestionario" : "Ir al cuestionario"}
            </button>

            <button
              onClick={() => router.push("/miembros/proceso_nov")}
              style={{
                background: "#ccc",
                color: "#222",
                padding: "0.8rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Volver al proceso
            </button>
          </div>

          <div
            style={{
              background: "white",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ marginTop: 0, lineHeight: 1.8 }}>
              Este módulo proporciona las herramientas básicas para interpretar
              correctamente monedas, billetes y otros objetos relacionados con el
              intercambio económico. También explica conceptos esenciales, historia
              general del dinero, clasificación, coleccionismo, conservación y
              falsificaciones.
            </p>

            {TEORIA.map((section) => (
              <section key={section.titulo} style={{ marginBottom: "1.4rem" }}>
                <h2 style={{ marginBottom: "0.6rem" }}>{section.titulo}</h2>
                <p style={{ whiteSpace: "pre-line", lineHeight: 1.8, margin: 0 }}>
                  {section.texto}
                </p>
              </section>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button
              onClick={iniciarCuestionario}
              style={{
                background: "#6b6f1a",
                color: "white",
                padding: "0.8rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {payload.completedIds.length > 0 ? "Continuar cuestionario" : "Ir al cuestionario"}
            </button>

            <button
              onClick={() => router.push("/miembros/proceso_nov")}
              style={{
                background: "#ccc",
                color: "#222",
                padding: "0.8rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Volver al proceso
            </button>
          </div>
        </>
      )}

      {modo === "quiz" && currentQuestion && (
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          {esConsejo && (
            <p
              style={{
                marginTop: 0,
                marginBottom: "1rem",
                background: "#f4f1e8",
                padding: "0.8rem 1rem",
                borderRadius: "10px",
                color: "#555",
              }}
            >
              Modo Consejo Académico: puedes recorrer y probar el cuestionario, pero el
              avance no quedará guardado.
            </p>
          )}

          <p
            style={{
              marginTop: 0,
              marginBottom: "0.6rem",
              fontSize: "0.82rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#6b6f1a",
              fontWeight: 700,
            }}
          >
            {estadoActual}
          </p>
		  <p style={{ color: "#666", marginBottom: "1rem" }}>
			  Respuestas correctas completadas: {payload.completedIds.length} de {QUESTIONS.length}
			</p>

          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
            {currentQuestion.prompt}
          </h2>

          <div style={{ display: "grid", gap: "0.8rem" }}>
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => responder(option)}
                disabled={feedbackMode === "correct"}
                style={{
                  textAlign: "left",
                  padding: "0.95rem 1rem",
                  borderRadius: "10px",
                  border:
                    selectedOption === option
                      ? "2px solid #6b6f1a"
                      : "1px solid #ddd4c7",
                  background: selectedOption === option ? "#f4f1e8" : "#ffffff",
                  cursor: "pointer",
                }}
              >
                {option}
              </button>
            ))}
          </div>

          {feedbackMode && (
            <div
              style={{
                marginTop: "1.25rem",
                borderRadius: "12px",
                padding: "1rem",
                background: feedbackMode === "correct" ? "#eef6e9" : "#f8ecec",
                border:
                  feedbackMode === "correct"
                    ? "1px solid #cfe3c4"
                    : "1px solid #ebc8c8",
              }}
            >
              <p
                style={{
                  marginTop: 0,
                  fontWeight: 700,
                  color: feedbackMode === "correct" ? "#2f6a22" : "#8b2f2f",
                }}
              >
                {feedbackMode === "correct" ? "Correcto" : "Incorrecto"}
              </p>

              <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>
                {currentQuestion.feedback}
              </p>

              {feedbackMode === "correct" ? (
                <button
                  onClick={continuarTrasCorrecta}
                  style={{
                    background: "#6b6f1a",
                    color: "white",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={repetirPregunta}
                  style={{
                    background: "#8b3a3a",
                    color: "white",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Repetir
                </button>
              )}
            </div>
          )}

          <div style={{ marginTop: "1.25rem" }}>
            <button
              onClick={continuarMasTarde}
              disabled={saving}
              style={{
                background: "#ccc",
                color: "#222",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {saving ? "Guardando..." : "Continuar más tarde"}
            </button>
          </div>
        </div>
      )}

      {modo === "final" && (
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Módulo completado</h2>
          <p style={{ lineHeight: 1.8 }}>
            Has completado satisfactoriamente el Módulo Introductorio. Tu avance
            quedó registrado al 100%, por lo que la siguiente unidad queda
            desbloqueada en el proceso de ascenso.
          </p>

          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/miembros/proceso_nov")}
              style={{
                background: "#6b6f1a",
                color: "white",
                padding: "0.8rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Volver al proceso
            </button>

            {esConsejo && (
              <button
                onClick={() => {
                  setModo("quiz");
                  setPayload(initialPayload);
                  setSelectedOption("");
                  setFeedbackMode(null);
                }}
                style={{
                  background: "#ccc",
                  color: "#222",
                  padding: "0.8rem 1.2rem",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Reiniciar vista de prueba
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}