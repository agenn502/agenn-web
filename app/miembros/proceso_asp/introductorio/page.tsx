"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    titulo: "Presentación del módulo",
    texto:
      "El presente Módulo Introductorio forma parte del proceso de formación del Nivel Aspirante de la Academia. Su propósito es ofrecer una primera aproximación ordenada, clara y académica a la numismática, la notafilia y la historia del dinero.\n\nEste módulo está dirigido a personas que manifiestan interés por aprender sobre estos temas, aunque no cuenten todavía con conocimientos previos especializados. Por ello, los contenidos se presentan de manera progresiva, partiendo de conceptos básicos hasta llegar a una comprensión inicial del dinero como fenómeno histórico, económico, político y cultural.\n\nEl objetivo no es que el aspirante memorice definiciones, sino que comience a desarrollar una forma de observar, comparar, preguntar, justificar e interpretar monedas, billetes y otros objetos relacionados con el intercambio económico. Esta base será necesaria para incorporarse posteriormente al Nivel Novicio, donde iniciará una formación más estructurada y profunda.",
  },
  {
    titulo: "Objetivo general",
    texto:
      "Desarrollar en el aspirante una comprensión inicial del dinero, la numismática y la notafilia, que le permita reconocer monedas y billetes como objetos de estudio histórico y cultural, y no únicamente como medios de pago o piezas de colección.",
  },
  {
    titulo: "Objetivos específicos",
    texto:
      "- Comprender que el dinero tiene una dimensión histórica y social.\n- Identificar de forma inicial qué estudian la numismática y la notafilia.\n- Reconocer conceptos básicos para observar monedas y billetes.\n- Diferenciar entre valor nominal, valor histórico y valor de colección.\n- Introducir al aspirante en una forma de aprendizaje basada en la observación, la lectura y la reflexión.\n- Preparar al aspirante para ingresar al Nivel Novicio con una base común mínima.",
  },
  {
    titulo: "Perfil de ingreso",
    texto:
      "El Nivel Aspirante está dirigido a personas invitadas o aceptadas por la Academia que tienen interés en la numismática, la notafilia, la historia del dinero o el coleccionismo, aunque no posean formación previa en estas áreas.\n\nNo se requiere experiencia especializada. Sí se espera disposición para leer, observar, comparar, formular preguntas y construir progresivamente un criterio propio. El aspirante inicia aquí su primer acercamiento formal al estudio académico del dinero.",
  },
  {
    titulo: "Perfil de egreso del módulo",
    texto:
      "Al finalizar este módulo, el aspirante será capaz de:\n\n- Comprender que el dinero puede estudiarse como una construcción histórica.\n- Reconocer que monedas y billetes pueden ser fuentes para el estudio del pasado.\n- Identificar conceptos básicos como anverso, reverso, denominación, emisor, serie, ceca y valor facial.\n- Distinguir de manera inicial entre numismática, notafilia y coleccionismo.\n- Comprender la importancia de conservar adecuadamente monedas y billetes.\n- Estar preparado para iniciar el Nivel Novicio, donde estos temas se estudiarán con mayor profundidad.",
  },
  {
    titulo: "Enfoque metodológico",
    texto:
      "El módulo utiliza un enfoque introductorio, progresivo y formativo. Esto significa que los contenidos no deben verse como conocimientos cerrados, sino como puntos de partida para aprender a observar e interpretar el dinero.\n\nSe recomienda al aspirante leer cuidadosamente cada sección, tomar notas personales, anotar dudas y relacionar los conceptos con ejemplos concretos de monedas o billetes que conozca. El aprendizaje se apoyará en la lectura, la observación, la comparación y la reflexión.\n\nEl cuestionario final forma parte del proceso de formación y no busca castigar el error. Sus alternativas exigen comparar conceptos y situaciones plausibles, y cada respuesta incluye una retroalimentación amplia que desarrolla el tema. Si una respuesta es incorrecta, el sistema permitirá repetir la pregunta para fortalecer la comprensión.",
  },
  {
    titulo: "Lineamientos conceptuales",
    texto:
      "Este módulo adopta algunos principios básicos que acompañarán todo el proceso formativo posterior:\n\n- La numismática no es únicamente coleccionismo, sino una disciplina de análisis histórico.\n- El dinero cambia con el tiempo y responde a contextos sociales, políticos y económicos.\n- Una moneda o un billete pueden analizarse como documentos históricos.\n- Clasificar no significa solo ordenar, sino comprender diferencias y relaciones.\n- El valor del dinero puede depender de factores materiales, institucionales, históricos y sociales.\n\nEstos lineamientos ayudan a evitar una visión reducida del dinero y permiten iniciar una comprensión más amplia del campo numismático y notafílico.",
  },
  {
    titulo: "1. Introducción",
    texto:
      "Antes de estudiar la historia monetaria de Guatemala, es necesario comprender algunos fundamentos sobre el dinero, la numismática y la notafilia. Este módulo introductorio busca ofrecer esas herramientas iniciales al aspirante.\n\nLa numismática no debe reducirse al estudio de objetos antiguos o coleccionables. También permite analizar procesos históricos complejos. A través del dinero es posible interpretar transformaciones económicas, estructuras de poder, sistemas políticos y dinámicas culturales. En este sentido, cada moneda o billete puede considerarse un documento histórico que refleja la sociedad que lo produjo (Vico Belmonte y De Francisco Olmos, 2016; Huidobro Moya, 2015).\n\nA partir de esta idea, el aspirante debe comenzar a reconocer que el dinero no posee únicamente valor económico. También puede tener valor histórico, simbólico e institucional. Esta comprensión inicial será fundamental para continuar posteriormente con el Nivel Novicio.\n\nLecturas complementarias:\n- Vico Belmonte, A. y De Francisco Olmos, J. M. (2016). Introducción a la Numismática.\n- Huidobro Moya, J. (2015). Numismática y arte.\n\nActividad sugerida:\nElabore un texto breve donde explique por qué una moneda o un billete pueden considerarse documentos históricos.",
  },
  {
    titulo: "2. ¿Qué es la numismática?",
    texto:
      "La numismática es la disciplina que estudia las monedas y otros objetos relacionados con el dinero, especialmente aquellos emitidos por una autoridad para facilitar el intercambio económico (Vico Belmonte y De Francisco Olmos, 2016, p. 1). Sin embargo, su alcance es mucho más amplio.\n\nEl estudio de las monedas permite analizar aspectos políticos, económicos, artísticos y culturales. En lo político, las monedas pueden reflejar legitimación del poder e identidad estatal (Helleiner, 1998; Gilbert y Helleiner, 1999). En lo económico, muestran sistemas monetarios, reformas y crisis (Bulmer-Thomas, 2003). En lo artístico, permiten observar estilos, técnicas de grabado e iconografía (Huidobro Moya, 2015). En lo cultural, transmiten símbolos, valores y representaciones sociales (Zelizer, 2021).\n\nPara estudiar una moneda, se observan elementos como material, peso, diámetro, diseño, inscripciones, fecha de emisión y ceca. Cada uno aporta información útil para comprender la pieza dentro de su contexto (Vico Belmonte y De Francisco Olmos, 2016; Contreras Cortés, 1984).\n\nPara el aspirante, lo más importante es comprender que la numismática no consiste únicamente en acumular monedas, sino en aprender a interpretarlas.\n\nLecturas complementarias:\n- Helleiner, E. (1998). National currencies and national identities.\n- Bulmer-Thomas, V. (2003). The Economic History of Latin America since Independence.\n\nActividad sugerida:\nExplique tres áreas del conocimiento que pueden relacionarse con la numismática y cómo pueden observarse en una moneda.",
  },
  {
    titulo: "3. ¿Qué es la notafilia?",
    texto:
      "La notafilia es una especialización dentro de la numismática dedicada al estudio del papel moneda y otros documentos financieros, como billetes, bonos, vales, acciones y cheques (Zamora Vargas, 2013, p. 7; Vico Belmonte y De Francisco Olmos, 2016).\n\nSu importancia se relaciona con el desarrollo del dinero fiduciario. A diferencia de una moneda metálica, un billete no posee valor por el material del que está hecho. Su aceptación depende de la confianza en la institución que lo emite (Ingham, 2004; Helleiner, 2003).\n\nEl análisis notafílico no se limita a observar el papel o el diseño. También considera el contexto institucional, económico y político. Los billetes suelen incluir elementos gráficos, símbolos nacionales, personajes históricos y medidas de seguridad, lo que los convierte en documentos visuales muy ricos para el análisis (Banco de Guatemala, 2012; Pérez Irungaray, 2025).\n\nPara el aspirante, la notafilia abre una puerta para comprender cómo el Estado, la economía y la sociedad se relacionan a través del papel moneda.\n\nLecturas complementarias:\n- Ingham, G. (2004). The Nature of Money.\n- Helleiner, E. (2003). The Making of National Money.\n\nActividad sugerida:\nExplique brevemente la diferencia entre una moneda metálica y un billete, prestando atención al concepto de confianza.",
  },
  {
    titulo: "4. Historia general del dinero",
    texto:
      "El dinero actual es resultado de un largo proceso histórico vinculado a las necesidades de intercambio de las sociedades humanas (Ingham, 2004; Helleiner, 2003). Este proceso no fue igual en todos los lugares ni ocurrió de forma lineal.\n\nEn sus primeras etapas, muchas sociedades utilizaron el trueque, es decir, el intercambio directo de bienes. Este sistema tenía limitaciones importantes, como la necesidad de que ambas partes quisieran exactamente lo que la otra ofrecía (Bulmer-Thomas, 2003; Rosero García, 2009).\n\nLuego surgieron formas de dinero mercancía, en las que ciertos bienes como la sal, el ganado, el cacao o los metales fueron aceptados como medios de intercambio debido a su utilidad, escasez o valor social.\n\nEl uso de metales preciosos permitió estandarizar mejor el valor, dando paso a la moneda acuñada, emitida por autoridades que garantizaban su peso y pureza (Vico Belmonte y De Francisco Olmos, 2016). Más adelante, el papel moneda permitió representar valor sin transportar grandes cantidades de metal (Helleiner, 2003; Bruner, 2010).\n\nEn la actualidad, el dinero incluye formas físicas y digitales. Su valor depende de sistemas financieros complejos basados en la confianza, la regulación y la política económica (Ingham, 2004; Zelizer, 2021).\n\nLecturas complementarias:\n- Rosero García, J. (2009). Historia del dinero.\n- Bruner, K. (2010). Money and Banking.\n\nActividad sugerida:\nDescriba la evolución del dinero desde el trueque hasta el papel moneda, identificando al menos dos limitaciones del trueque.",
  },
  {
    titulo: "5. Conceptos básicos para el estudio numismático",
    texto:
      "Para analizar monedas y billetes es necesario conocer algunos conceptos básicos. Estos permiten describir y clasificar las piezas con mayor precisión (Vico Belmonte y De Francisco Olmos, 2016; Banco de Guatemala, 2006).\n\nEl anverso es la cara principal de una moneda o billete. El reverso es la cara opuesta. La denominación indica el valor nominal dentro del sistema monetario (Vico Belmonte y De Francisco Olmos, 2016; Huidobro Moya, 2015).\n\nLa serie agrupa emisiones con características comunes. La fecha permite ubicar la pieza en un momento histórico. El emisor es la institución responsable de producir o poner en circulación el dinero. Las firmas identifican a las autoridades que validan un billete (Asociación Numismática de Guatemala, 2016; Banco de Guatemala, 2006).\n\nEn monedas, la ceca indica el lugar de acuñación. El valor facial es el valor oficial asignado por la autoridad emisora, aunque no siempre coincide con el valor de mercado o de colección (Vico Belmonte y De Francisco Olmos, 2016; Huidobro Moya, 2015).\n\nPara el aspirante, estos conceptos funcionan como un primer vocabulario técnico para comenzar a observar piezas con mayor atención.\n\nLecturas complementarias:\n- Vico Belmonte y De Francisco Olmos (2016), capítulos técnicos.\n- Banco de Guatemala (2012). Billetes de Guatemala.\n\nActividad sugerida:\nSeleccione una moneda o billete y describa sus elementos básicos: anverso, reverso, denominación, emisor, fecha y otros detalles visibles.",
  },
  {
    titulo: "6. Tipo, variante y subvariante: una introducción a la clasificación",
    texto:
      "Clasificar no significa únicamente ordenar piezas. Un sistema de clasificación busca reconocer semejanzas, diferencias y relaciones mediante criterios definidos y aplicados de manera coherente. Por ello, encontrar una diferencia visible entre dos billetes no significa automáticamente haber encontrado una variante (Contreras Cortés, 1984; Pérez Irungaray, 2026).\n\nEn el sistema de clasificación propuesto en Notafilia guatemalteca: Un sistema de clasificación para los billetes de Guatemala, 1874-2023, se distinguen niveles jerárquicos como tipo, variante y subvariante. Para este módulo introductorio interesa comprender el principio metodológico: una diferencia debe analizarse según su naturaleza y según el nivel clasificatorio al que corresponde.\n\nLas firmas ofrecen un ejemplo importante. El simple cambio de las personas firmantes, manteniéndose la misma cantidad y disposición de las firmas, no constituye por sí mismo una variante ni una subvariante. Sin embargo, un cambio en la cantidad de firmas modifica la estructura del billete y puede dar lugar a una subvariante. También un cambio en la posición de las firmas puede adquirir relevancia clasificatoria.\n\nEsta distinción enseña una regla fundamental: observar una diferencia y clasificarla son dos operaciones distintas. Primero se documenta qué cambió; después se determina cómo interpreta ese cambio el sistema de clasificación utilizado.\n\nLa comparación sistemática entre ejemplares permite reconocer estas diferencias. También ayuda a distinguir modificaciones intencionales de anomalías o errores de producción, que no deben convertirse automáticamente en categorías clasificatorias.\n\nLectura complementaria:\n- Pérez Irungaray, G. E. (2026). Notafilia guatemalteca: Un sistema de clasificación para los billetes de Guatemala, 1874-2023: una propuesta metodológica.\n\nActividad sugerida:\nCompare hipotéticamente dos billetes. Primero cambie únicamente los nombres de los firmantes; después cambie de dos a tres la cantidad de firmas. Explique por qué ambas diferencias no reciben necesariamente la misma clasificación.",
  },
  {
    titulo: "7. El coleccionismo",
    texto:
      "El coleccionismo es una práctica importante dentro de la numismática y la notafilia, pero no debe entenderse como simple acumulación de objetos. Un coleccionista desarrolla una relación activa con sus piezas, basada en conocimiento, organización e interpretación (Vico Belmonte y De Francisco Olmos, 2016; Zamora Vargas, 2013).\n\nColeccionar implica investigar el origen de las piezas, clasificarlas, documentar sus características y conservarlas adecuadamente. De esta forma, una colección puede convertirse en un sistema organizado de conocimiento (Pérez Irungaray, 2026).\n\nExisten diferentes formas de coleccionar: por país, época, denominación, tema o tipo de pieza. Cada enfoque responde a intereses distintos (Clark, 1971; Banco de Guatemala, 2006; Zamora Vargas, 2013; Pérez Irungaray, 2025).\n\nEl coleccionismo también implica responsabilidad ética, especialmente en temas de autenticidad, conservación y respeto al patrimonio histórico (Banco de Guatemala, 2012; Pérez Irungaray, 2026).\n\nPara el aspirante, este tema permite diferenciar entre acumular piezas y construir una colección con criterio.\n\nLecturas complementarias:\n- Artículos sobre coleccionismo numismático disponibles en biblioteca interna.\n- Zelizer, V. (2021). The Social Meaning of Money.\n\nActividad sugerida:\nReflexione sobre la diferencia entre acumular piezas y coleccionar con criterio. Proponga tres características de una colección bien organizada.",
  },
  {
    titulo: "8. Conservación y estado de las piezas",
    texto:
      "El estado de conservación es uno de los factores más importantes en la numismática y la notafilia, porque influye en el valor, la integridad y la permanencia histórica de una pieza (Vico Belmonte y De Francisco Olmos, 2016).\n\nLas monedas y billetes pueden deteriorarse por desgaste, humedad, exposición a la luz, manipulación inadecuada o limpieza incorrecta. En el caso del papel moneda, los riesgos son mayores debido a la fragilidad del material (Zamora Vargas, 2013).\n\nPara conservar una pieza se recomienda manipularla con cuidado, evitar condiciones ambientales adversas y utilizar materiales adecuados, como protectores libres de ácido (Vico Belmonte y De Francisco Olmos, 2016).\n\nEl aspirante debe comprender desde el inicio que conservar no significa solo proteger el valor económico de una pieza. También significa preservar su valor histórico y patrimonial.\n\nLecturas complementarias:\n- Manuales básicos de conservación numismática.\n- Material institucional del Banco de Guatemala sobre billetes.\n\nActividad sugerida:\nDescriba prácticas adecuadas e inadecuadas para conservar monedas y billetes, explicando sus posibles consecuencias.",
  },
  {
    titulo: "9. Falsificaciones",
    texto:
      "Las falsificaciones han existido durante buena parte de la historia del dinero, tanto en monedas como en billetes. Pueden tener fines económicos, pero también pueden estudiarse como parte de contextos históricos específicos (Helleiner, 2003; Bulmer-Thomas, 2003).\n\nIdentificar falsificaciones requiere observar aspectos como material, calidad de impresión, detalles de diseño y elementos de seguridad. Muchas falsificaciones presentan inconsistencias que pueden detectarse mediante comparación y observación cuidadosa (Vico Belmonte y De Francisco Olmos, 2016).\n\nEl estudio de las falsificaciones es importante no solo para evitar pérdidas económicas, sino también para comprender los desafíos que enfrentan los sistemas monetarios (Molina Calderón, 2008; Bruner, 2010).\n\nPara el aspirante, este tema introduce la importancia de la atención al detalle y de la verificación antes de aceptar una pieza como auténtica.\n\nLecturas complementarias:\n- Banco de Guatemala: medidas de seguridad en billetes.\n- Documentos sobre falsificación monetaria.\n\nActividad sugerida:\nExplique por qué existen falsificaciones y qué elementos básicos deben observarse para identificarlas.",
  },
  {
    titulo: "10. Introducción a Guatemala",
    texto:
      "Antes de la introducción de la moneda formal, en el territorio que hoy corresponde a Guatemala existieron sistemas de intercambio basados en bienes como el cacao, el jade y otros productos con valor cultural y económico. Estos sistemas reflejan formas tempranas de organización económica (Banco de Guatemala, 2012; Quisquinay Rojas, 2022).\n\nCon la llegada de los españoles, se introdujo la moneda metálica como parte del sistema colonial. Esto marcó el inicio de la historia numismática formal del territorio y su integración a un sistema económico más amplio (Molina Calderón, 2008; Lara Grojec, 2021; Secretaría de Hacienda y Crédito Público, 1939).\n\nComprender esta transición es fundamental para estudiar posteriormente el desarrollo del sistema monetario guatemalteco (Banco de Guatemala, 2012; Molina Calderón, 2008; Quisquinay Rojas, 2022).\n\nPara el aspirante, esta sección funciona como una puerta de entrada al estudio de Guatemala, que será abordado con mayor profundidad en las unidades del Nivel Novicio.\n\nLecturas complementarias:\n- Banco de Guatemala (2012). Del jade al polímero.\n- Bulmer-Thomas (2003), secciones sobre Centroamérica.\n- Historia económica de Guatemala, fuentes locales.\n\nActividad sugerida:\nDescriba algunas formas de intercambio prehispánicas y explique cómo cambió el sistema con la introducción de la moneda colonial.",
  },
  {
    titulo: "11. Conclusión",
    texto:
      "La numismática y la notafilia permiten analizar la historia desde una perspectiva material y concreta. Monedas y billetes no son únicamente medios de intercambio, sino testimonios de procesos históricos complejos (Vico Belmonte y De Francisco Olmos, 2016; Helleiner, 1998; Zelizer, 2021).\n\nEste módulo ofrece al aspirante las bases necesarias para comenzar a mirar el dinero con una perspectiva crítica. A partir de ahora, una moneda o un billete pueden entenderse no solo por su valor económico, sino también por la información histórica, cultural, política e institucional que contienen.\n\nAl completar este módulo y su cuestionario, el aspirante habrá adquirido una base introductoria para incorporarse al Nivel Novicio y continuar su formación dentro de la Academia.\n\nLecturas complementarias:\n- Relectura general del módulo.\n- Notas personales del aspirante.\n\nActividad sugerida:\nElabore un texto de síntesis donde explique cómo cambió su comprensión del dinero después de estudiar este módulo.",
  },
  {
    titulo: "Referencias",
    texto:
      "Asociación Numismática de Guatemala. (2016). Guía para el coleccionista de billetes Q1.00 emitidos por el Banco de Guatemala (1946-2012). ANG.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q0.50. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q1.00. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q5.00. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q10.00. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q20.00. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q50.00. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2006). Catálogo de billetes de Q100.00. República de Guatemala. Banco de Guatemala.\n\nBanco de Guatemala. (2012). Del jade al polímero. Ediciones OPP.\n\nBruner, C. M. (2010). The changing face of money. Review of Banking & Financial Law, 30, 383–458.\n\nBulmer-Thomas, V. (2003). The economic history of Latin America since independence. Cambridge University Press.\n\nClark, O. H. (1971). Paper money of Guatemala. Almanzar's Coins of the World.\n\nContreras Cortés, F. (1984). Clasificación y tipología en arqueología: El camino hacia la cuantificación. Cuadernos de Prehistoria y Arqueología de la Universidad de Granada, 9, 327–385.\n\nGilbert, E., y Helleiner, E. (Eds.). (1999). Nation-states and money: The past, present and future of national currencies. Routledge.\n\nHelleiner, E. (1998). National currencies and national identities. American Behavioral Scientist, 41(10), 1409–1436.\n\nHelleiner, E. (2003). The making of national money: Territorial currencies in historical perspective. Cornell University Press.\n\nHuidobro Moya, J. M. (2015). Numismática y heráldica en España. Liber Factory.\n\nIngham, G. (2004). The nature of money. Economic Sociology: European Electronic Newsletter, 5(2), 18–28.\n\nLara Grojec, L. R. (2021). Historia de la banca en Guatemala. Visión Financiera, 41, 4–7. https://www.sib.gob.gt/c/document_library/get_file?folderId=2987926&name=DLFE-38007.pdf\n\nMolina Calderón, J. S. (2008). Un siglo y seis lustros de banca, bancos y banqueros (1877-2007). Editores Autores.\n\nPérez Irungaray, G. E. (2026). Notafilia guatemalteca: Un sistema de clasificación para los billetes de Guatemala, 1874-2023: una propuesta metodológica. América Latina en la Historia Económica, 33(2), e1603.\n\nPérez Irungaray, G. E. (2025). Notafilia guatemalteca: Un recorrido por la historia y el arte de los billetes de Guatemala. Editorial Cara Parens, Universidad Rafael Landívar.\n\nQuisquinay Rojas, E. D. (2022). Primeros billetes de banco en Guatemala: Banco Nacional de Guatemala (1874-1876). Revista de Investigación Proyección Científica, 4(1), 141–153. https://doi.org/10.56785/ripc.v4il.13\n\nRosero García, L. (2009). La moneda en Colombia: Un análisis histórico. Universidad Nacional de Colombia. https://repositorio.unal.edu.co/bitstream/handle/unal/6802/468470.2009.pdf\n\nSecretaría de Hacienda y Crédito Público. (1939). Las experiencias de Guatemala en los aspectos monetario, bancario y cambiario, durante el decenio comprendido de 1929 a 1938. Secretaría de Hacienda y Crédito Público.\n\nVico Belmonte, A., y De Francisco Olmos, J. M. (2016). Introducción a la numismática. Ediciones Paraninfo.\n\nZamora Vargas, J. A. (2013). Rescatemos una herencia: Notafilia costarricense. Revista Herencia, 26(1-2), 7–24. https://revistas.ucr.ac.cr/index.php/herencia/article/view/14526\n\nZelizer, V. A. (2021). The social meaning of money: Pin money, paychecks, poor relief, and other currencies. Princeton University Press.",
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
    prompt: "Dos personas desean intercambiar bienes, pero ninguna necesita lo que la otra ofrece. ¿Qué limitación del trueque se manifiesta principalmente?",
    options: [
      "La falta de coincidencia de necesidades entre las partes",
      "La imposibilidad de asignar cualquier valor a los bienes",
      "La obligación de que exista una autoridad monetaria",
      "La ausencia necesaria de bienes que puedan intercambiarse",
    ],
    correct: "La falta de coincidencia de necesidades entre las partes",
    feedback:
      "El intercambio directo puede dificultarse cuando no coinciden las necesidades de quienes participan. Este problema ayuda a comprender por qué distintas sociedades desarrollaron medios de intercambio más aceptados y referencias de valor. La historia monetaria, sin embargo, no debe reducirse a una secuencia universal y perfectamente lineal.",
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
    prompt: "¿Cuál situación describe mejor el funcionamiento del dinero mercancía?",
    options: [
      "Un bien socialmente aceptado que posee utilidad o valor propio y además funciona como medio de intercambio",
      "Un documento cuyo valor depende exclusivamente de una firma privada",
      "Una moneda cuyo valor facial siempre supera el valor del metal",
      "Un registro digital que carece de cualquier relación institucional",
    ],
    correct: "Un bien socialmente aceptado que posee utilidad o valor propio y además funciona como medio de intercambio",
    feedback:
      "El dinero mercancía utiliza bienes que poseen valor o utilidad y que, al mismo tiempo, son aceptados para facilitar intercambios. Cacao, sal, ganado o ciertos metales han cumplido funciones semejantes en distintos contextos. Su aceptación depende también de prácticas sociales y no únicamente de sus propiedades físicas.",
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
    prompt: "¿Qué cambio hizo especialmente útil al papel moneda frente al transporte de grandes cantidades de metal?",
    options: [
      "Permitió representar y transferir valor mediante un soporte más ligero, respaldado por arreglos institucionales",
      "Eliminó inmediatamente la necesidad de confianza en cualquier autoridad",
      "Hizo que el valor monetario dependiera exclusivamente del costo del papel",
      "Sustituyó en todos los países y al mismo tiempo cualquier otra forma de dinero",
    ],
    correct: "Permitió representar y transferir valor mediante un soporte más ligero, respaldado por arreglos institucionales",
    feedback:
      "El papel moneda facilitó operaciones que podían resultar incómodas mediante grandes cantidades de metal. Con el desarrollo de sistemas fiduciarios, su aceptación pasó a depender especialmente de la confianza, la autoridad emisora, la regulación y el reconocimiento social. No fue una sustitución instantánea ni universal.",
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
    prompt: "Un billete indica Q20, pero un ejemplar escaso de esa emisión se vende por una cantidad mucho mayor. ¿Qué concepto explica mejor esa diferencia?",
    options: [
      "El valor facial y el valor de colección son conceptos diferentes",
      "La denominación impresa cambia cuando aumenta la demanda",
      "El precio de colección sustituye legalmente al valor facial",
      "Toda pieza antigua debe valer más que su denominación",
    ],
    correct: "El valor facial y el valor de colección son conceptos diferentes",
    feedback:
      "El valor facial es el valor oficial asignado por la autoridad emisora. El valor de colección puede depender de rareza, conservación, demanda, autenticidad, procedencia y otras características. Tampoco debe confundirse el precio comercial con el interés histórico de una pieza.",
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
    prompt: "¿Cuál es la interpretación más prudente de una fecha impresa en una moneda o billete?",
    options: [
      "Es un dato temporal importante, pero puede requerir distinguir entre fecha impresa, emisión y circulación",
      "Demuestra siempre el día exacto en que la pieza comenzó a circular",
      "Indica necesariamente el momento en que fue retirada de circulación",
      "Solo tiene utilidad decorativa y no aporta contexto histórico",
    ],
    correct: "Es un dato temporal importante, pero puede requerir distinguir entre fecha impresa, emisión y circulación",
    feedback:
      "La fecha permite situar la pieza temporalmente, pero no debe pedírsele más información de la que realmente demuestra. Según la emisión, puede ser necesario distinguir fecha impresa, producción, autorización, emisión efectiva o circulación y confirmarlo con otras fuentes.",
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
    prompt: "Dos billetes mantienen el mismo diseño, la misma cantidad de firmas y la misma posición de estas, pero cambian las personas firmantes. Según el sistema de clasificación adoptado en este módulo, ¿qué interpretación es correcta?",
    options: [
      "El cambio crea necesariamente una variante",
      "El cambio crea necesariamente una subvariante",
      "El cambio puede ayudar a identificar una emisión, pero no constituye por sí solo variante ni subvariante",
      "Las firmas dejan de tener cualquier utilidad para el estudio",
    ],
    correct: "El cambio puede ayudar a identificar una emisión, pero no constituye por sí solo variante ni subvariante",
    feedback:
      "Las firmas identifican autoridades y pueden ser muy útiles para documentar o distinguir emisiones. Sin embargo, en el sistema de clasificación adoptado aquí, el simple cambio de las personas firmantes, manteniéndose la misma estructura de firmas, no constituye por sí mismo una variante ni una subvariante. Esta distinción evita confundir un dato de identificación con un criterio jerárquico de clasificación.",
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
    prompt: "Dos billetes conservan sus características principales, pero uno presenta dos firmas y el otro tres. ¿Qué concepto debe considerar el estudiante al clasificar esa diferencia?",
    options: [
      "Una subvariante, porque cambió la cantidad de firmas",
      "Un nuevo emisor, porque toda firma representa una institución distinta",
      "Una falsificación, porque un billete no puede cambiar la cantidad de firmas",
      "Ninguna diferencia clasificatoria, porque las firmas nunca son relevantes",
    ],
    correct: "Una subvariante, porque cambió la cantidad de firmas",
    feedback:
      "El cambio en la cantidad de firmas modifica la estructura con que estas aparecen en el billete. Dentro del sistema presentado en este módulo, esa diferencia puede dar lugar a una subvariante. No debe confundirse con el simple cambio de nombres de los funcionarios firmantes.",
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
    prompt: "Un investigador agrupa billetes por la institución responsable de ponerlos en circulación. ¿Qué aspecto histórico puede estudiar especialmente mediante ese criterio?",
    options: [
      "Transformaciones en la organización institucional de la emisión monetaria",
      "Únicamente cambios en el tamaño físico de los billetes",
      "Solo el grado de conservación de cada ejemplar",
      "Exclusivamente la cotización comercial de cada denominación",
    ],
    correct: "Transformaciones en la organización institucional de la emisión monetaria",
    feedback:
      "Clasificar por emisor puede ayudar a estudiar cambios entre bancos privados, instituciones estatales o bancos centrales y a relacionar las piezas con reformas y transformaciones de autoridad monetaria. La clasificación se vuelve así una herramienta de análisis histórico.",
  },
  {
    id: 23,
    kind: "vf",
    prompt: "Observar una diferencia entre dos billetes y decidir qué categoría clasificatoria corresponde a esa diferencia son dos operaciones distintas.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Primero se observa y documenta qué cambia; después se interpreta la diferencia mediante los criterios del sistema de clasificación. No toda diferencia visible merece el mismo rango. Separar observación e interpretación ayuda a evitar categorías arbitrarias.",
  },
  {
    id: 24,
    kind: "mc",
    prompt: "¿Qué describe mejor una clasificación rigurosa de tipo, variante y subvariante?",
    options: [
      "Una jerarquía de diferencias definida mediante criterios que deben aplicarse de forma coherente",
      "Tres nombres intercambiables para cualquier diferencia visible",
      "Una escala determinada exclusivamente por el precio de las piezas",
      "Una clasificación basada en la preferencia estética del coleccionista",
    ],
    correct: "Una jerarquía de diferencias definida mediante criterios que deben aplicarse de forma coherente",
    feedback:
      "Tipo, variante y subvariante representan niveles de diferenciación. Lo importante no es solo memorizar los términos, sino comprender qué criterio hace que una diferencia corresponda a determinado nivel y aplicar ese criterio de forma consistente.",
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
    prompt: "Dos ejemplares conservan la misma cantidad de firmas, pero estas aparecen en posiciones diferentes. ¿Qué procedimiento es más adecuado?",
    options: [
      "Examinar y documentar el cambio de posición porque puede tener relevancia clasificatoria",
      "Ignorarlo porque únicamente importan los nombres de quienes firman",
      "Crear automáticamente un nuevo tipo sin revisar otros rasgos",
      "Concluir que necesariamente pertenecen a emisores diferentes",
    ],
    correct: "Examinar y documentar el cambio de posición porque puede tener relevancia clasificatoria",
    feedback:
      "La posición de las firmas forma parte de la estructura gráfica del billete y puede tener relevancia dentro del sistema de clasificación. Antes de asignar una categoría debe documentarse la diferencia y compararse con otros ejemplares y con los criterios definidos.",
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
    prompt: "Un coleccionista encuentra una pequeña anomalía de impresión en un solo ejemplar. ¿Qué debería hacer antes de declararla una variante?",
    options: [
      "Investigar si es intencional, accidental, repetida y cómo se relaciona con el proceso de impresión",
      "Crear una categoría nueva porque toda diferencia visible es una variante",
      "Eliminar la anomalía para comprobar si el diseño original permanece debajo",
      "Asignarle una categoría según el precio que alcance el ejemplar",
    ],
    correct: "Investigar si es intencional, accidental, repetida y cómo se relaciona con el proceso de impresión",
    feedback:
      "Una anomalía aislada puede ser interesante, pero no debe convertirse automáticamente en una categoría. Es necesario estudiar su origen, repetición y relación con el proceso productivo. La clasificación requiere criterios y evidencia, no únicamente una diferencia visual.",
  },
  {
    id: 29,
    kind: "vf",
    prompt: "Un mismo billete puede tener subvariantes.",
    options: ["VERDADERO", "FALSO"],
    correct: "VERDADERO",
    feedback:
      "Un billete puede presentar subvariantes cuando una diferencia corresponde a ese nivel dentro del sistema adoptado. Un ejemplo introducido en este módulo es el cambio en la cantidad de firmas. La categoría debe justificarse mediante criterios y no por la simple existencia de cualquier diferencia.",
  },
  {
    id: 30,
    kind: "mc",
    prompt: "¿Por qué es metodológicamente importante comparar varios ejemplares semejantes?",
    options: [
      "Porque permite reconocer qué permanece constante, qué cambia y evaluar la importancia de esas diferencias",
      "Porque el ejemplar más atractivo determina la clasificación de todos los demás",
      "Porque evita tener que consultar cualquier fuente documental",
      "Porque todas las diferencias encontradas deben convertirse en subvariantes",
    ],
    correct: "Porque permite reconocer qué permanece constante, qué cambia y evaluar la importancia de esas diferencias",
    feedback:
      "La comparación sistemática ayuda a separar características estables de cambios, anomalías o modificaciones. Después, el sistema de clasificación permite interpretar cuáles diferencias son relevantes y en qué nivel deben situarse.",
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
    prompt: "Un coleccionista organiza billetes de distintos países alrededor de representaciones de fauna. ¿Qué hace que esa colección tenga un criterio y no sea una simple acumulación?",
    options: [
      "La existencia de un tema definido que orienta selección, organización y estudio",
      "Que todos los billetes tengan exactamente el mismo valor facial",
      "Que las piezas sean necesariamente raras",
      "Que se excluya cualquier documentación histórica",
    ],
    correct: "La existencia de un tema definido que orienta selección, organización y estudio",
    feedback:
      "Una colección temática utiliza un asunto común —fauna, arquitectura, personajes, acontecimientos u otros— como criterio de selección. Su valor formativo aumenta cuando las piezas se documentan y se estudia cómo ese tema fue representado en distintos contextos.",
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
    prompt: "Un billete conserva apariencia prácticamente original y no presenta señales de haber circulado. ¿Qué idea expresa mejor su estado?",
    options: [
      "Se encuentra en una condición propia de un ejemplar sin circular",
      "Debe clasificarse como muy fino únicamente por ser antiguo",
      "Su estado no puede describirse porque la conservación solo se aplica a monedas",
      "Debe considerarse restaurado aunque no exista evidencia de intervención",
    ],
    correct: "Se encuentra en una condición propia de un ejemplar sin circular",
    feedback:
      "La expresión 'sin circular' se aplica a un billete que no muestra señales de uso en circulación y conserva sus características originales. La evaluación precisa del grado puede requerir criterios especializados, que se estudiarán con mayor profundidad posteriormente.",
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
    prompt: "¿Por qué se prefieren materiales estables y apropiados para almacenar papel moneda?",
    options: [
      "Porque reducen el riesgo de reacciones químicas y deterioro del soporte",
      "Porque convierten una pieza común en una pieza rara",
      "Porque sustituyen completamente el control de humedad y luz",
      "Porque restauran automáticamente manchas y dobleces",
    ],
    correct: "Porque reducen el riesgo de reacciones químicas y deterioro del soporte",
    feedback:
      "Algunos plásticos, adhesivos, papeles y cartones pueden liberar sustancias o reaccionar con el billete. Un contenedor apropiado forma parte de la conservación preventiva, pero no sustituye el control ambiental ni la manipulación cuidadosa.",
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
    prompt: "Un billete presenta señales leves de circulación, pero conserva buena integridad y apariencia general. ¿Qué debe aprender primero el aspirante de esta observación?",
    options: [
      "Que el estado de conservación se evalúa mediante características físicas y no solo por la edad de la pieza",
      "Que cualquier doblez convierte automáticamente el billete en deteriorado",
      "Que una pieza antigua siempre debe considerarse sin circular",
      "Que la conservación depende exclusivamente de la rareza",
    ],
    correct: "Que el estado de conservación se evalúa mediante características físicas y no solo por la edad de la pieza",
    feedback:
      "Los grados de conservación describen el estado físico del ejemplar. Dobleces, desgaste, manchas, roturas, firmeza del papel y otros rasgos deben evaluarse con criterios definidos. La edad, la rareza o el precio no determinan por sí solos el grado.",
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
    prompt: "Recibe un billete antiguo con suciedad y un pequeño desgarro. ¿Cuál sería la primera actuación más responsable?",
    options: [
      "Documentar su estado y evitar intervenciones improvisadas antes de conocer el método adecuado",
      "Lavarlo para recuperar el color original",
      "Plancharlo para eliminar cualquier doblez",
      "Aplicar cinta adhesiva para impedir que el desgarro crezca",
    ],
    correct: "Documentar su estado y evitar intervenciones improvisadas antes de conocer el método adecuado",
    feedback:
      "Conservar no significa embellecer. Agua, calor, presión, adhesivos o químicos pueden alterar irreversiblemente fibras, tintas y superficie. Ante una pieza delicada, documentar y estabilizar es preferible a intervenir sin conocimiento técnico.",
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
    prompt: "Dos billetes tienen la misma denominación. Uno es muy común y el otro pertenece a una emisión escasa. ¿Qué conclusión es más razonable?",
    options: [
      "El ejemplar escaso puede alcanzar mayor valor de colección aunque ambos tengan el mismo valor facial",
      "Ambos deben tener el mismo precio porque comparten denominación",
      "La rareza solo afecta a monedas metálicas",
      "El billete común debe valer más porque existen más ejemplares para compararlo",
    ],
    correct: "El ejemplar escaso puede alcanzar mayor valor de colección aunque ambos tengan el mismo valor facial",
    feedback:
      "La denominación determina el valor facial, no el precio de colección. Rareza, conservación, demanda, autenticidad, procedencia y características particulares pueden modificar considerablemente el valor de mercado.",
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
    prompt: "Una pieza tiene bajo precio comercial, pero documenta una reforma monetaria importante. ¿Qué demuestra este caso?",
    options: [
      "Que el interés histórico y el precio de mercado no son equivalentes",
      "Que toda pieza históricamente importante debe ser rara",
      "Que el valor facial aumenta cuando una pieza adquiere interés académico",
      "Que solo las piezas costosas merecen ser estudiadas",
    ],
    correct: "Que el interés histórico y el precio de mercado no son equivalentes",
    feedback:
      "Una pieza común y económicamente accesible puede ser una fuente excelente para estudiar instituciones, reformas, tecnología o cultura. El mercado responde a factores diferentes de los que determinan el interés de una pieza como documento histórico.",
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
    prompt: "Un billete coincide en color con una imagen de referencia. ¿Es suficiente ese dato para declararlo auténtico?",
    options: [
      "No; la autenticidad debe evaluarse mediante múltiples características y fuentes confiables",
      "Sí; el color es el elemento de seguridad definitivo",
      "Sí, siempre que el billete tenga una denominación conocida",
      "No, porque ningún billete puede autenticarse mediante observación",
    ],
    correct: "No; la autenticidad debe evaluarse mediante múltiples características y fuentes confiables",
    feedback:
      "La autenticidad rara vez puede establecerse por una sola característica. Material, impresión, dimensiones, diseño, numeración, elementos de seguridad, procedencia y comparación con ejemplares confiables pueden ser necesarios. Además, fotografías y pantallas pueden alterar la percepción del color.",
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
    prompt: "Al estudiar una pieza desconocida, ¿qué secuencia refleja mejor una práctica académica inicial?",
    options: [
      "Observar, documentar, comparar, consultar fuentes y formular una interpretación",
      "Asignar primero un precio y utilizarlo como criterio de autenticidad",
      "Clasificarla inmediatamente y buscar después datos que confirmen la decisión",
      "Modificarla físicamente para descubrir cómo fue producida",
    ],
    correct: "Observar, documentar, comparar, consultar fuentes y formular una interpretación",
    feedback:
      "El análisis comienza con evidencia. Registrar características antes de interpretarlas reduce conclusiones precipitadas. La comparación y las fuentes permiten formular hipótesis mejor sustentadas y también reconocer cuándo la información todavía es insuficiente.",
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
    prompt: "Después de completar este módulo, ¿qué cambio de perspectiva se espera principalmente del aspirante?",
    options: [
      "Que comience a tratar monedas y billetes como documentos que requieren observación, comparación, contexto y criterios de análisis",
      "Que pueda determinar el precio de cualquier pieza sin consultar fuentes",
      "Que memorice una lista cerrada de definiciones y la repita sin modificarlas",
      "Que considere que el coleccionismo y la investigación son actividades incompatibles",
    ],
    correct: "Que comience a tratar monedas y billetes como documentos que requieren observación, comparación, contexto y criterios de análisis",
    feedback:
      "El propósito del módulo es iniciar una forma de pensar. El conocimiento numismático y notafílico se construye relacionando la pieza material con preguntas, fuentes, clasificación, conservación y contexto. El Nivel Novicio profundizará estas herramientas, pero la actitud de análisis comienza aquí.",
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
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [ascensoError, setAscensoError] = useState("");
  const [correoAscenso, setCorreoAscenso] = useState<{
    enviado: boolean;
    error?: string;
  } | null>(null);
  const [ascendiendo, setAscendiendo] = useState(false);

  const currentQuestion = QUESTIONS[payload.currentIndex] || null;
  const progresoQuiz = Math.round((payload.completedIds.length / QUESTIONS.length) * 100);

  useEffect(() => {
	  const cargar = async () => {
		const stored = localStorage.getItem("user");

		if (!stored) {
		  window.location.href = "/login";
		  return;
		}

		try {
		  const parsed = JSON.parse(stored) as User;

		  const consejoNormalizado =
			parsed.consejo === true ||
			parsed.consejo === "true" ||
			parsed.consejo === "TRUE" ||
			parsed.consejo === 1;

		  setUser(parsed);
		  setEsConsejo(consejoNormalizado);

		  if (!consejoNormalizado) {
			const response = await fetch(
			  `/api/progreso/aspirante?codigo=${encodeURIComponent(parsed.codigo)}`,
			  {
				method: "GET",
				cache: "no-store",
			  }
			);

			const result = await response.json();

			if (!response.ok || !result.ok) {
			  throw new Error(
				result.error || "No fue posible cargar el avance."
			  );
			}

			if (result.progreso?.respuestas) {
			  const saved = result.progreso.respuestas as ProgressPayload;

			  const hydrated: ProgressPayload = {
				...initialPayload,
				...saved,
			  };

			  setPayload(hydrated);

			  if (hydrated.finished) {
				setModo("final");
			  }
			}
		  }
		} catch (error) {
		  console.error("Error cargando el módulo introductorio:", error);

		  alert(
			error instanceof Error
			  ? error.message
			  : "No fue posible cargar el módulo introductorio."
		  );
		} finally {
		  setLoading(false);
		}
	  };

	  cargar();
	}, []);

  const persistir = async (
	  nextPayload: ProgressPayload
	): Promise<boolean> => {
	  if (!user || esConsejo) return true;

	  setSaving(true);

	  try {
		const response = await fetch("/api/progreso/aspirante", {
		  method: "POST",
		  headers: {
			"Content-Type": "application/json",
		  },
		  body: JSON.stringify({
			codigo: user.codigo,
			payload: nextPayload,
		  }),
		});

		const result = await response.json();

		if (!response.ok || !result.ok) {
		  throw new Error(
			result.error || "No fue posible guardar el avance."
		  );
		}

		return true;
	  } catch (error) {
		alert(
		  error instanceof Error
			? `No se pudo guardar el avance: ${error.message}`
			: "No se pudo guardar el avance."
		);

		return false;
	  } finally {
		setSaving(false);
	  }
	};

const ascenderAspiranteANovicio = async (): Promise<boolean> => {
  if (!user || esConsejo) return false;
  if (user.nivel !== "ASP") return false;
  if (ascendiendo) return false;

  try {
    setAscendiendo(true);
    setAscensoError("");

    const response = await fetch("/api/ascender", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo: user.codigo,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error || "No se pudo completar el ascenso."
      );
    }

    setNuevoCodigo(result.codigoNuevo || "");
    
    localStorage.removeItem("user");

    return true;
  } catch (error) {
    setAscensoError(
      error instanceof Error
        ? error.message
        : "No se pudo completar el ascenso."
    );

    return false;
  } finally {
    setAscendiendo(false);
  }
};

  const iniciarCuestionario = () => {
    setModo(payload.finished ? "final" : "quiz");
  };

  const responder = async (option: string) => {
    if (!currentQuestion || saving || ascendiendo) return;

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
      const guardado = await persistir(nextPayload);

		if (!guardado) {
		  return;
		}

		if (finished) {
		  await ascenderAspiranteANovicio();
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
    if (!currentQuestion || saving || ascendiendo) return;

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
    const guardado = await persistir(nextPayload);

		if (!guardado) {
		  return;
		}

		if (finished) {
		  await ascenderAspiranteANovicio();
		  setModo("final");
		}
  };

  const repetirPregunta = () => {
    setSelectedOption("");
    setFeedbackMode(null);
  };

  const continuarMasTarde = async () => {
    await persistir(payload);
    router.push("/miembros/proceso_asp");
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
            Nivel Aspirante
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
              onClick={() => router.push("/miembros/proceso_asp")}
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
              onClick={() => router.push("/miembros/proceso_asp")}
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
                disabled={feedbackMode === "correct" || saving || ascendiendo}
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
                  disabled={saving || ascendiendo}
                  style={{
                    background: "#6b6f1a",
                    color: "white",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {saving
                    ? "Guardando..."
                    : ascendiendo
                    ? "Procesando ascenso..."
                    : "Continuar"}
                </button>
              ) : (
                <button
                  onClick={repetirPregunta}
                  disabled={saving || ascendiendo}
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
              disabled={saving || ascendiendo}
              style={{
                background: "#ccc",
                color: "#222",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {ascendiendo
                ? "Procesando ascenso..."
                : saving
                ? "Guardando..."
                : "Continuar más tarde"}
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
			<h2 style={{ marginTop: 0 }}>Felicitaciones</h2>

			<p style={{ lineHeight: 1.8 }}>
			  Has finalizado satisfactoriamente el Módulo Introductorio, el cual te
			  brinda las bases necesarias para iniciar tu proceso formativo dentro de
			  la Academia.
			</p>

			<p style={{ lineHeight: 1.8 }}>
			  A partir de este momento, tu perfil asciende al{" "}
			  <strong>Nivel Novicio</strong>. En esta nueva etapa iniciarás tu proceso
			  de formación y acreditación académica, orientado al estudio progresivo
			  de la numismática y la notafilia guatemalteca.
			</p>

			{nuevoCodigo && (
			  <div
				style={{
				  background: "#f4f1e8",
				  border: "1px solid #ddd4c7",
				  borderRadius: "10px",
				  padding: "1rem",
				  margin: "1rem 0",
				}}
			  >
				<p style={{ marginTop: 0 }}>
				  Tu nuevo código institucional como Académico Novicio es:
				</p>

				<p
				  style={{
					fontSize: "1.5rem",
					fontWeight: 700,
					color: "#6b6f1a",
					margin: 0,
				  }}
				>
				  {nuevoCodigo}
				</p>

				<p
				  style={{
					marginBottom: 0,
					marginTop: "0.8rem",
					lineHeight: 1.7,
				  }}
				>
				  Tu contraseña personal continúa siendo la misma.
				  Para ingresar nuevamente a la plataforma deberás utilizar
				  tu nuevo código institucional junto con tu contraseña habitual.
				</p>

				{correoAscenso?.enviado ? (
				  <p
					style={{
					  marginBottom: 0,
					  marginTop: "0.8rem",
					  lineHeight: 1.7,
					}}
				  >
					También hemos enviado a tu correo electrónico la confirmación
					de tu ascenso y tu nuevo código institucional.
				  </p>
				) : correoAscenso ? (
				  <div
					style={{
					  marginTop: "0.8rem",
					  padding: "0.85rem 1rem",
					  background: "#fff4e5",
					  border: "1px solid #f0d2a4",
					  borderRadius: "8px",
					  lineHeight: 1.7,
					}}
				  >
					El ascenso quedó registrado correctamente, pero no fue posible
					enviar el correo de confirmación.
					{correoAscenso.error && (
					  <>
						<br />
						<strong>Detalle:</strong> {correoAscenso.error}
					  </>
					)}
				  </div>
				) : null}
			  </div>
			)}

			{ascensoError && (
			  <div
				style={{
				  background: "#f8ecec",
				  border: "1px solid #ebc8c8",
				  borderRadius: "10px",
				  padding: "1rem",
				  margin: "1rem 0",
				  color: "#8b2f2f",
				}}
			  >
				El módulo fue completado, pero no se pudo actualizar automáticamente el
				nivel del usuario: {ascensoError}
			  </div>
			)}

			<div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
			  <button
				onClick={() => {
				  localStorage.removeItem("user");
				  window.location.href = "/login";
				}}
				style={{
				  background: "#6b6f1a",
				  color: "white",
				  padding: "0.8rem 1.2rem",
				  border: "none",
				  borderRadius: "8px",
				  cursor: "pointer",
				}}
			  >
				Ir al inicio de sesión
			  </button>

			  {esConsejo && (
				<button
				  onClick={() => {
					setModo("quiz");
					setPayload(initialPayload);
					setSelectedOption("");
					setFeedbackMode(null);
					setNuevoCodigo("");
					setAscensoError("");
					setCorreoAscenso(null);
					setAscendiendo(false);
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