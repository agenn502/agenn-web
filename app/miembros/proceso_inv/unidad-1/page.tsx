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
    titulo: "1. Introducción: Antes de la moneda, existía el valor",
    texto: `El estudio de la numismática suele comenzar con monedas, pero esto puede generar una idea errónea: que el dinero siempre ha existido en forma de piezas metálicas. La realidad es distinta. Antes de la llegada de los españoles en 1524, en el territorio de Guatemala no existía moneda acuñada, pero sí existían sistemas económicos complejos y plenamente funcionales.

Las sociedades mayas desarrollaron estructuras de intercambio donde el valor no estaba fijado por una autoridad central ni representado por una unidad estandarizada. En lugar de ello, el valor emergía de factores como la utilidad, la rareza, el significado simbólico y el control social de los bienes.

El registro arqueológico documenta asentamientos humanos en el territorio guatemalteco desde aproximadamente 12,500 años atrás, con indicios tempranos de intercambio de conocimientos y bienes. Ya hacia el 9,000 a.C., se observa la coexistencia de tradiciones de manufactura de puntas de proyectil de orígenes distantes —la tradición "Clovis" del norte y la "cola de pescado" del sur— lo que sugiere contactos interregionales. La presencia de puntas fabricadas con materiales obtenidos a cientos de kilómetros de su lugar de hallazgo confirma la existencia de intercambios entre grupos humanos desde épocas muy tempranas.

Para el estudiante avanzado, este es el primer gran aprendizaje: 👉 la moneda no crea el valor; el valor existe antes que la moneda, y su estudio requiere herramientas arqueológicas, antropológicas e históricas, no solo numismáticas.`,
  },
  {
    titulo: "2. El valor como construcción social",
    texto: `En ausencia de moneda, el valor no se expresa en cifras, sino en relaciones. Un objeto vale no por lo que "dice", sino por lo que representa dentro de una sociedad. Como señala el arqueólogo Stephen Houston, el "valor" es una figura intangible que escapa al registro arqueológico directo, pero puede inferirse a través del comportamiento de los artefactos: desde su extracción, producción y distribución hasta su contexto de hallazgo.

En el mundo prehispánico, el valor se construía a partir de múltiples elementos que interactuaban de manera compleja:

Utilidad práctica: un bien podía ser valioso por su función (herramientas, armas, alimentos)

Rareza o dificultad de obtención: cuanto más lejano o difícil de producir, mayor valor

Significado simbólico o religioso: vinculado a la cosmovisión, deidades o poder

Control por parte de élites: el acceso restringido a ciertos bienes aumentaba su valor

A estos factores se añade una distinción fundamental: el valor podía ser intrínseco (derivado de las propiedades físicas del objeto) o adquirido (derivado de su contexto social, político o ritual). Esta distinción es clave para entender por qué un mismo bien podía tener distintos valores dependiendo del contexto geográfico o social.

Para el numismático avanzado: 👉 entender el valor como construcción social implica reconocer que el dinero no es un fenómeno universal ni natural, sino una solución histórica a problemas específicos de intercambio y estandarización.`,
  },
  {
    titulo: "3. Bienes como medios de intercambio: Más allá del trueque",
    texto: `El intercambio en la economía maya no puede reducirse al concepto simple de trueque. Existían bienes que, por sus características, funcionaban como medios de intercambio más estables, y operaban dentro de redes que combinaban diferentes modos de intercambio: reciprocidad, redistribución y comercio.

Entre los bienes que circularon como medios de intercambio destacan:

Cacao (Theobroma cacao)

Textiles (de algodón, con diseños estandarizados)

Plumas (especialmente de quetzal)

Sal (producida en salinas de Belice y la costa)

Jade (en contextos específicos y de élite)

Conchas marinas (Spondylus, usadas como ofrenda y adorno)

El cacao, en particular, presenta características que lo acercan al concepto de proto-dinero:

Divisibilidad: podía contarse en unidades (almendras)

Portabilidad: fácil de transportar

Aceptación generalizada: reconocido en toda el área maya

Unidad de cuenta documentada: el xiquipil (8,000 almendras) funcionaba como medida estandarizada

La investigadora Marion Popenoe de Hatch documentó en Kaminaljuyú la presencia de un tipo cerámico (Monte Alto Rojo) cuyos contenedores tenían una capacidad estandarizada que coincide con la carga de cacao conocida en época colonial: tres xiquipiles o 24,000 almendras, con un peso de algo más de 50 libras (dos arrobas). Esto sugiere que el transporte de cacao ya se organizaba mediante unidades de medida estables desde tiempos prehispánicos.

Además, la presencia en Tak'alik Ab'aj y Kaminaljuyú de abundantes "tiestos cortados" (fragmentos cerámicos con formas particulares) ha sido interpretada como evidencia de un sistema de contabilidad que permitía llevar cuentas de grandes cantidades de producto.

Sin embargo, el cacao no era moneda en sentido estricto, ya que no existía una estandarización oficial ni una autoridad emisora. Su valor fluctuaba según el contexto y no todos los cacaos eran iguales (existían variedades de diferente calidad).

Para el estudiante avanzado: 👉 el dinero no aparece de repente; evoluciona a partir de bienes que cumplen funciones similares. El estudio de estos bienes proto-monetarios permite entender las condiciones que hacen necesaria la aparición de la moneda.`,
  },
  {
    titulo: "4. Bienes de prestigio vs bienes utilitarios",
    texto: `No todos los bienes tenían el mismo tipo de valor ni circulaban por los mismos circuitos. Es fundamental distinguir entre dos categorías que operaban bajo lógicas diferentes:

BIENES UTILITARIOS:

Obsidiana (herramientas, armas)

Sal (conservación de alimentos)

Productos agrícolas (maíz, frijol, calabaza)

Cerámica utilitaria

Su valor radica principalmente en su uso práctico. Su circulación solía ser más amplia y menos controlada, aunque no necesariamente exenta de regulación por parte de las élites.

BIENES DE PRESTIGIO:

Jade

Plumas exóticas (especialmente de quetzal)

Conchas marinas (Spondylus)

Objetos rituales (incensarios, estatuillas)

Textiles finos

Su valor radica en su significado simbólico, su asociación con el poder y su rareza. Estos bienes circulaban predominantemente entre las élites y funcionaban como marcadores de estatus, regalos diplomáticos u ofrendas rituales.

Esta distinción introduce una idea central para el análisis económico: el valor puede ser económico o simbólico, y ambos coexisten. En el mundo maya, no existía una separación tajante entre esferas de intercambio; los mismos bienes podían participar en circuitos diferentes según el contexto.

Para el numismático avanzado: 👉 entender esta dualidad permite explicar por qué algunas monedas posteriores (especialmente las acuñadas en metales preciosos) cumplieron funciones más allá del intercambio cotidiano, actuando también como depósitos de valor, símbolos de poder o instrumentos de prestigio.`,
  },
  {
    titulo: "5. La Obsidiana: Valor por utilidad y distribución",
    texto: `La obsidiana es uno de los mejores ejemplos de un bien cuyo valor combina utilidad práctica y control económico. Era utilizada para fabricar herramientas, armas y objetos rituales (navajas prismáticas, puntas de flecha, raspadores), lo que la hacía esencial en la vida cotidiana.

El valor de la obsidiana dependía de múltiples factores:

Origen geográfico: las principales fuentes en el territorio guatemalteco eran San Martín Jilotepeque (Chimaltenango) y El Chayal (cerca de la actual ciudad de Guatemala). Otras fuentes importantes fuera del territorio incluían Pachuca (centro de México) y Ixtepeque.

Calidad del material: no todas las fuentes producían obsidiana de igual calidad para la talla de navajas prismáticas.

Distancia a la fuente: la obsidiana era más valiosa en regiones donde no se producía localmente.

Control por parte de élites: la distribución de obsidiana muestra patrones que sugieren intervención de grupos de poder.

La presencia de obsidiana de San Martín Jilotepeque y El Chayal en sitios arqueológicos de Petén, la costa sur y el altiplano occidental demuestra la existencia de redes comerciales activas y de larga distancia. El análisis de las rutas muestra cambios significativos a lo largo del tiempo: durante el Preclásico Tardío (300 a.C. – 250 d.C.), se observa una disminución en la presencia de obsidiana de San Martín Jilotepeque y un aumento de la fuente de El Chayal, lo que indica un cambio en las alianzas comerciales y posiblemente en el control político de las rutas.

En Kaminaljuyú, la evidencia de talleres de obsidiana sugiere que este centro no solo consumía el material, sino que también lo procesaba y redistribuía, consolidando su posición como nodo económico.

Para el estudiante avanzado: 👉 un bien puede ser valioso no solo por lo que es (sus propiedades físicas), sino por cómo circula (quién lo controla, hacia dónde se distribuye) y por el conocimiento tecnológico requerido para transformarlo.`,
  },
  {
    titulo: "6. El jade: Valor como poder y representación",
    texto: `El jade (jadeíta), a diferencia de la obsidiana, no era un bien de uso cotidiano. Su dureza (superior a la del acero) y su rareza lo convertían en un material excepcional, cuyo trabajo requería especialización y herramientas adecuadas (generalmente abrasivos y cuerda).

Su valor estaba ligado a múltiples dimensiones:

Prestigio social: asociado a la élite gobernante

Religión y cosmovisión: vinculado a la vida, la muerte y el inframundo

Poder político: controlado por las clases gobernantes

Estética: su color verde esmeralda lo asociaba con el agua, el maíz tierno y la fertilidad

La principal fuente de jade en el área maya era el valle del río Motagua, en el oriente de Guatemala. Su control fue un factor estratégico para varios centros políticos. En Cancuén (Petén), se ha documentado el único taller de jade conocido en las tierras bajas mayas, donde se importaban grandes núcleos sin trabajar desde las fuentes del Motagua. En este taller se observa gran cantidad de desecho no reutilizado y una selección del material según sus cualidades, lo que indica producción especializada destinada a la élite y posiblemente a la exportación hacia sitios lejanos como Palenque.

A diferencia de la obsidiana, el jade no era un medio de intercambio común. Su circulación estaba restringida a contextos de élite: ajuares funerarios, ofrendas ceremoniales, insignias de poder. Esto introduce una idea fundamental para el análisis económico:

👉 no todo lo valioso circula como dinero; algunas cosas existen para diferenciar, no para intercambiar.

Para el numismático avanzado: 👉 el estudio del jade permite entender que el valor no es unidimensional. Un mismo objeto puede ser al mismo tiempo un bien económico (por su rareza y costo de producción), un símbolo político (por su asociación con el poder) y un objeto ritual (por su significado religioso).`,
  },
  {
    titulo: "7. Las plumas, en especial las de quetzal: valor simbólico y poder",
    texto: `Las plumas, particularmente las del quetzal (Pharomachrus mocinno), constituyen uno de los mejores ejemplos de un bien cuyo valor era exclusivamente simbólico, ritual y político, sin utilidad práctica alguna. A diferencia de la obsidiana (útil) o el cacao (consumible), las plumas de quetzal no servían para fabricar herramientas ni para alimentarse. Su valor residía enteramente en lo que representaban..

El quetzal en la cosmovisión maya: En el Popol Vuh, el libro sagrado de los quichés, se narra la creación del mundo: los dioses creadores, Tepeu y Gucumatz, estaban ocultos "bajo plumas verdes y azules". Por ello se les llama Gucumatz (Serpiente Emplumada). Los reyes, caciques y sacerdotes, para parecerse a las divinidades, utilizaban estas plumas en sus adornos personales. El quetzal no era solo un adorno; era una conexión viva con el mundo divino.

Aunque rara vez aparece el dibujo completo del quetzal en el arte maya, sus plumas sí están omnipresentes, adornando a los señores principales en estelas, vasijas polícromas, murales y códices. En Bonampak, numerosos personajes aparecen cubiertos con plumas de quetzal en contextos de poder: encabezando desfiles militares, batallas y ceremonias rituales.

Las plumas como bien de intercambio: Las plumas de quetzal fueron comercializadas y muy cotizadas en toda el área maya. Se recolectaban en tierras altas (donde habita el ave) y desde allí partían por medio de rutas de intercambio, a pie atravesando montañas y en barcas por ríos, lagos y mares, cubriendo toda el área mesoamericana desde el centro de México hasta el sur de Centroamérica.

Servían como medio de cambio o trueque en varias regiones productoras. El control de su comercio era un privilegio de las élites, que las utilizaban para:

👉 Marcar estatus: solo los gobernantes y altos dignatarios podían portar tocados y espaldares de plumas de quetzal.

👉 Establecer alianzas: las plumas eran regalos diplomáticos de alto valor.

👉 Realizar ofrendas rituales: se depositaban en contextos ceremoniales y funerarios.

👉 Pagar tributo: regiones productoras de plumas las entregaban a centros hegemónicos.

Control y prohibición: Según fray Bartolomé de las Casas, en la Provincia de la Verapaz "tenía pena de muerte el que matase al pájaro de plumas ricas, porque no los había en otra parte y era cosa de mucho valor, porque usaban ellas como de moneda". Esta prohibición revela no solo el valor económico de las plumas, sino también un control consciente de su reproducción y distribución. No se mataba al quetzal; se le capturaba, se le arrancaban las plumas largas de la cola, y se le liberaba para que volviera a crecerlas. Este manejo sostenible del recurso es evidencia de una planificación económica sofisticada.

Las plumas en la época colonial y su legado simbólico: El valor de las plumas de quetzal no desapareció con la conquista. En el Lienzo de Tlaxcala y el Lienzo de Quauhquechollan (documentos pictográficos del siglo XVI), se representan batallas de la conquista en Quetzaltenango con pictogramas que incluyen plumas verdes de quetzal. El nombre nahua Quetzaltenango significa precisamente "lugar de Quetzales" o "muralla del Quetzal".

Ya en el siglo XIX, tras la independencia, el quetzal fue adoptado como símbolo patrio. El poeta Francisco Mérida de Aparicio escribió en 1871 un poema al quetzal que inspiró al general Justo Rufino Barrios, quien declaró: "el quetzal será el emblema de la patria". En 1871 se instituyó el Escudo Nacional con el quetzal como símbolo de libertad. En 1924, cuando se creó la moneda nacional, se le dio precisamente el nombre de quetzal.

Esto introduce una idea fundamental para el numismático: 👉 el valor simbólico puede trascender siglos. Un bien que nunca fue moneda (las plumas) terminó dando nombre a la moneda nacional, conectando el mundo prehispánico con la Guatemala contemporánea.

Para el estudiante avanzado: 👉 las plumas de quetzal representan una categoría de bienes cuyo valor es puramente simbólico y político. Su estudio permite entender que no todo lo valioso circula como dinero, y que los sistemas de valor prehispánicos incluían dimensiones (religiosas, estéticas, políticas) que no pueden reducirse a categorías económicas modernas.`,
  },
  {
    titulo: "8. Redes comerciales: la economía como sistema",
    texto: `La economía prehispánica no era local ni aislada. Existían redes comerciales que conectaban distintas regiones ecológicas:

Altiplano (fuentes de obsidiana, jade, clima frío)

Costa sur (cacao, algodón, sal, productos tropicales)

Tierras bajas de Petén (madera, jade tallado, productos ceremoniales)

Costa atlántica (conchas marinas, sal)

A través de estas redes circulaban bienes de diverso tipo. Centros como Tak'alik Ab'aj (en la boca costa del Pacífico) y Kaminaljuyú (en el valle de Guatemala) funcionaban como nodos estratégicos donde convergían rutas comerciales y se concentraba el control económico.

Tak'alik Ab'aj, durante el Preclásico Medio (1,000–300 a.C.), se convirtió en un centro comercial o nudo principal dentro de una red de mercado, compuesta por ciudades comerciales intermedias ubicadas en puntos estratégicos a lo largo de la boca costa. Desde allí, el comercio podía continuar su ruta a lo largo de la costa o ascender hacia el altiplano. Esta ruta estaba marcada por escultura no portable en estilo olmeca, lo que sugiere un control de esa cultura sobre dichas rutas.

Kaminaljuyú, por su parte, se fortaleció a partir del Preclásico Medio y se convirtió en el agente de intercambio del jade hacia la costa. Se ha postulado la existencia desde el Preclásico Medio de una especie de "banco de cacao" en Kaminaljuyú, con base en la presencia abundante de contenedores cerámicos estandarizados.

Hacia el Preclásico Tardío, el sitio de El Portón (cerca de Salamá) se convirtió en intermediario entre los productos que circulaban de sur a norte y viceversa, controlando la ruta que corre por el Usumacinta y la del río Cahabón hacia la región del río La Pasión.

Para el numismático avanzado:
👉 antes de la moneda, ya existían sistemas económicos complejos. El estudio de las rutas comerciales permite entender que el intercambio no es un fenómeno secundario o marginal, sino una fuerza estructurante de las sociedades prehispánicas.`,
  },
  {
    titulo: "9. El contexto geográfico y su impacto en el valor",
    texto: `El valor de los bienes estaba profundamente influenciado por la geografía. La disponibilidad de recursos variaba según la región, lo que generaba diferencias significativas en el valor de los mismos bienes en distintos contextos.

Ejemplos documentados:

👉 La obsidiana de San Martín Jilotepeque era más valiosa en Petén que en el altiplano, donde era más accesible.

👉 El cacao era más valioso en el altiplano que en la costa sur, donde se producía.

👉 Las conchas marinas (Spondylus) alcanzaban gran valor en el interior, lejos de las costas del Pacífico y Atlántico.

👉 La sal producida en Belice y en la costa sur era un bien de intercambio fundamental para regiones sin acceso directo a fuentes salinas.

Este patrón de variación geográfica del valor se observa consistentemente en el registro arqueológico. La presencia de obsidiana de Pachuca (centro de México) en contextos del Clásico Tardío en Petén y Kaminaljuyú indica contactos a muy larga distancia, y su valor era sin duda mucho mayor que el de las fuentes locales.

Además, la geografía política influía en el valor: ciertos bienes eran controlados por élites que restringían su acceso, aumentando artificialmente su valor. El caso del jade es paradigmático: aunque la fuente principal estaba en el Motagua, su distribución estaba fuertemente controlada.

Esto refuerza una idea clave para el análisis económico: 👉 el valor no es absoluto, es contextual. Depende de la geografía, la tecnología disponible, las relaciones de poder y los sistemas de creencias.

Para el numismático avanzado: 👉 la variabilidad geográfica del valor es una de las razones que explican la eventual aparición de monedas estandarizadas: estas reducen la incertidumbre y los costos de transacción asociados a la negociación de valor en cada intercambio.`,
  },
  {
    titulo: "10. La ausencia de estandarización: un sistema flexible",
    texto: `A diferencia de los sistemas monetarios posteriores, en la economía maya prehispánica no existía una unidad universal de valor. Esto hacía que el sistema fuera flexible y adaptable a diferentes contextos, pero también más complejo y dependiente del conocimiento local.

Las equivalencias no eran fijas, sino negociadas. Esto requería:

Conocimiento profundo de los bienes y sus calidades

Experiencia en negociación

Relaciones sociales establecidas que permitían el intercambio

Información sobre la procedencia y calidad de los bienes

Esta ausencia de estandarización no implicaba caos. Por el contrario, existían convenciones sociales ampliamente reconocidas. El xiquipil como unidad de cuenta para el cacao es un ejemplo de cierta estandarización práctica sin necesidad de una autoridad emisora central.

El debate académico sobre la existencia de mercados en el mundo maya ilustra la complejidad del sistema. Mientras algunos investigadores sostienen que no existían mercados en el sentido pleno del término (con plazas fijas, trueque generalizado y oferta diversa), otros señalan evidencias como:

Grandes espacios abiertos localizados a los costados de calzadas en sitios de Petén (posibles áreas de mercado)

Edificios de disposición concéntrica con habitaciones de dimensiones regulares, cercanos a las plazas principales (posibles "galerías" comerciales)

Murales en Calakmul que muestran personajes relacionados con actividades de intercambio

La ausencia de textos que documenten transacciones y la dificultad de identificar acumulaciones de materiales perecederos limitan nuestras conclusiones. Lo que sí está claro es que coexistían diferentes modos de intercambio: el tributo (patán), el comercio de larga distancia controlado por élites, el intercambio local de bienes utilitarios, y la redistribución desde centros políticos.

Para el estudiante avanzado: 👉 la moneda surge, en parte, para resolver la complejidad de un sistema sin estandarización. Reduce los costos de negociación, elimina la necesidad de información detallada sobre cada bien y facilita transacciones entre desconocidos.`,
  },
  {
    titulo: "11. Del intercambio a la moneda: El camino hacia la numismática",
    texto: `La transición hacia el uso de moneda metálica en el territorio de Guatemala no implicó la desaparición inmediata de los sistemas prehispánicos, sino su transformación y coexistencia.

Cuando la moneda llega con los españoles a partir de 1524:

Se introduce una unidad estandarizada (el real, luego el peso)

Se impone una autoridad emisora (la corona española, luego las cecas coloniales)

Se redefine el concepto de valor (ahora vinculado al contenido metálico y al respaldo real)

Se introducen nuevas formas de pago obligatorio (tributos, quinto real)

Sin embargo, estos cambios no eliminaron completamente las prácticas anteriores. El cacao continuó utilizándose como medio de intercambio entre la población indígena hasta finales del siglo XIX, coexistiendo con la moneda metálica. Esta persistencia es un fenómeno bien documentado en otras regiones del mundo: los sistemas monetarios no reemplazan instantáneamente a los anteriores, sino que se superponen durante largos períodos de transición.

Para el numismático avanzado, esto plantea preguntas fundamentales:

¿Cómo se negociaba el valor entre sistemas diferentes (cacao vs. reales)?

¿Qué bienes prehispánicos continuaron circulando y por qué?

¿Cómo afectó la introducción de la moneda a las estructuras de poder existentes?

👉 la moneda es el resultado de una evolución, no un punto de partida. Comprender esta evolución permite entender por qué las primeras monedas coloniales no fueron aceptadas inmediatamente, y por qué coexistieron múltiples medios de pago durante décadas.`,
  },
  {
    titulo: "12. Errores comunes del novicio (y cómo superarlos en el nivel avanzado)",
    texto: `En el nivel principiante, identificamos cinco errores frecuentes. En el nivel avanzado, profundizamos en por qué estos errores persisten y cómo evitarlos:

Error común	Explicación avanzada
Pensar que sin moneda no hay economía	La economía es un sistema de producción, distribución y consumo. La moneda es solo una herramienta. El error surge de identificar economía con mercado monetario.
Confundir trueque con sistema económico simple	El trueque directo (bien por bien) es solo una forma de intercambio. En el mundo maya coexistían trueque, reciprocidad, redistribución, tributo y comercio.
No diferenciar valor simbólico y utilitario	Esta confusión lleva a malinterpretar bienes como el jade (¿moneda? ¿adorno? ¿insignia?). La respuesta es: todo a la vez, según el contexto.
Asumir que el valor es fijo	El valor es contextual (geográfico, social, temporal). Un mismo bien vale diferente para distintos actores y en distintas circunstancias.
No entender la función del cacao como proto-dinero	El cacao cumplía varias funciones monetarias (unidad de cuenta, medio de cambio) pero no todas (no era depósito de valor a largo plazo ni estaba estandarizado oficialmente).

Superar estos errores es esencial para avanzar en la formación numismática. En el nivel avanzado, el estudiante debe ser capaz no solo de identificarlos, sino de explicar por qué surgen y cómo evitarlos en el análisis histórico.`,
  },
  {
    titulo: "13. Conclusión: El valor antes del dinero",
    texto: `La economía prehispánica en el territorio de Guatemala demuestra que el dinero no es necesario para que exista un sistema económico complejo. El valor puede construirse socialmente y materializarse en distintos objetos, desde granos de cacao hasta cuentas de jade o navajas de obsidiana.

Esta unidad ha recorrido:

Los fundamentos teóricos del valor como construcción social

Los bienes que funcionaron como medios de intercambio

La distinción entre bienes utilitarios y de prestigio

El papel de la geografía y las redes comerciales

Las limitaciones del sistema sin estandarización

El camino hacia la moneda como solución histórica

La economía maya no era ni primitiva ni caótica. Era un sistema adaptado a sus condiciones sociales, ecológicas y tecnológicas, con mecanismos de control, especialización, circulación y valoración perfectamente funcionales.

Esta unidad cumple una función fundamental en la formación del numismático:
👉 prepara al estudiante para entender que la moneda no es el origen del valor, sino una herramienta para organizarlo.

Sin esta base, la numismática se reduce a identificación de piezas. Con ella, se convierte en una disciplina de interpretación histórica, capaz de leer en las monedas no solo metales y fechas, sino también siglos de evolución económica, luchas de poder y transformaciones sociales.

Aquí comienza realmente la formación del numismático avanzado.`,
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
  const progresoQuiz =
    QUESTIONS.length > 0
      ? Math.round((payload.completedIds.length / QUESTIONS.length) * 100)
      : 0;

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
          .from("progreso_investigador")
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

    const { error } = await supabase.from("progreso_investigador").upsert(
      [
        {
          user_codigo: user.codigo,
          unidad_slug: "introductorio",
          completada: nextPayload.finished,
          porcentaje:
            QUESTIONS.length > 0
              ? Math.round((nextPayload.completedIds.length / QUESTIONS.length) * 100)
              : 0,
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
    if (QUESTIONS.length === 0) {
      alert("Aún no hay preguntas configuradas para esta unidad.");
      return;
    }

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
    router.push("/miembros/proceso_inv");
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
            Nivel Investigador
          </p>
          <h1 style={{ margin: 0 }}>Unidad 1</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#555" }}>
            Economía y medios de intercambio en la Guatemala prehispánica.
          </p>
        </div>

        {modo !== "teoria" && QUESTIONS.length > 0 && (
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
              onClick={() => router.push("/miembros/proceso_inv")}
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
              Este módulo explora los sistemas económicos desarrollados en el territorio de
              Guatemala antes de la llegada de los españoles en 1524, cuando aún no existía
              moneda acuñada. También analiza cómo el valor surgía de factores como la utilidad,
              la rareza, el significado simbólico y el control social, utilizando bienes como el
              cacao, la obsidiana o el jade como medios de intercambio.
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
              onClick={() => router.push("/miembros/proceso_inv")}
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
              Modo Consejo Académico: puedes recorrer y probar el cuestionario, pero el avance no
              quedará guardado.
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

          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>{currentQuestion.prompt}</h2>

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

      {modo === "quiz" && !currentQuestion && QUESTIONS.length === 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Cuestionario pendiente</h2>
          <p style={{ lineHeight: 1.8 }}>
            Esta unidad ya tiene el contenido teórico cargado, pero todavía no hay preguntas
            configuradas en el arreglo <code>QUESTIONS</code>.
          </p>

          <button
            onClick={() => router.push("/miembros/proceso_inv")}
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
            Has completado satisfactoriamente el Módulo Introductorio. Tu avance quedó registrado
            al 100%, por lo que la siguiente unidad queda desbloqueada en el proceso de ascenso.
          </p>

          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/miembros/proceso_inv")}
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