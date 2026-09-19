import { chromium } from "playwright";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];

const MAX_PAGINAS = 180;

const CARPETA_SALIDA = path.resolve("auditoria-responsive");
const CARPETA_CAPTURAS = path.join(CARPETA_SALIDA, "capturas");
const ARCHIVO_SESION = path.resolve(
  ".playwright",
  "agenn-session.json"
);

/*
 * Rutas que sabemos que son importantes aunque no siempre puedan
 * descubrirse mediante enlaces HTML normales.
 */
const RUTAS_INICIALES = [
  "/",
  "/miembros",
  "/miembros/proceso_inv",
  "/miembros/revista",
  "/miembros/revista/editorial",
  "/revista",
];

/*
 * Elementos deliberadamente fuera de pantalla.
 *
 * No deben considerarse errores responsive:
 * - menÃº lateral cerrado de miembros;
 * - elementos decorativos del encabezado de Revista.
 */
const SELECTORES_IGNORADOS = [
  "aside.menu-lateral",
  ".menu-lateral",
  ".globoContenedor",
];

/*
 * Palabras que ayudan a identificar botones que probablemente
 * conducen a pÃ¡ginas interiores importantes.
 */
const TEXTO_BOTONES_NAVEGACION =
  /ver|abrir|editar|revisar|versi[oÃ³]n|manuscrito|continuar|detalle|gestionar|publicable/i;

await fs.mkdir(CARPETA_CAPTURAS, { recursive: true });

function normalizarRuta(valor) {
  if (!valor) return null;

  try {
    const url = new URL(valor, BASE_URL);

    if (url.origin !== new URL(BASE_URL).origin) {
      return null;
    }

    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/_next/") ||
      url.pathname.startsWith("/favicon") ||
      url.pathname.startsWith("/robots") ||
      url.pathname.startsWith("/sitemap")
    ) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function nombreSeguro(ruta) {
  if (ruta === "/") return "inicio";

  return (
    ruta
      .replace(/^\/+/, "")
      .replace(/[/?&=:%#]+/g, "-")
      .replace(/[^a-zA-Z0-9Ã¡Ã©Ã­Ã³ÃºÃÃ‰ÃÃ“ÃšÃ±Ã‘_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 150) || "pagina"
  );
}

function esIgnorado(selector = "") {
  const limpio = selector.toLowerCase();

  return SELECTORES_IGNORADOS.some((ignorado) => {
    const regla = ignorado.toLowerCase();

    if (regla === "aside.menu-lateral") {
      return (
        limpio.includes("aside") &&
        limpio.includes("menu-lateral")
      );
    }

    if (regla === ".menu-lateral") {
      return limpio.includes("menu-lateral");
    }

    if (regla === ".globocontenedor") {
      return limpio.includes("globocontenedor");
    }

    return false;
  });
}

async function obtenerRutasDOM(page) {
  const valores = await page.evaluate(() => {
    const rutas = new Set();

    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href) rutas.add(href);
    });

    /*
     * Algunos controles guardan la ruta en atributos en vez de href.
     */
    document
      .querySelectorAll(
        "[data-href], [data-url], [data-route], [data-ruta]"
      )
      .forEach((el) => {
        [
          "data-href",
          "data-url",
          "data-route",
          "data-ruta",
        ].forEach((atributo) => {
          const valor = el.getAttribute(atributo);
          if (valor) rutas.add(valor);
        });
      });

    /*
     * TambiÃ©n buscamos rutas escritas dentro del HTML generado.
     * Esto permite encontrar bastantes router.push('/ruta/...').
     */
    const html = document.documentElement.innerHTML;

    const regex =
      /["'`](\/(?:miembros|revista|publicaciones|ensayos|perfiles)[^"'`<>\s]*)["'`]/g;

    let coincidencia;

    while ((coincidencia = regex.exec(html)) !== null) {
      rutas.add(coincidencia[1]);
    }

    return [...rutas];
  });

  return valores
    .map(normalizarRuta)
    .filter(Boolean);
}

async function descubrirMedianteBotones(page) {
  const nuevas = new Set();

  const candidatos = await page
    .locator("button, [role='button']")
    .evaluateAll((elementos) =>
      elementos
        .map((el, indice) => ({
          indice,
          texto: (el.textContent || "").trim().slice(0, 160),
          disabled:
            el.disabled === true ||
            el.getAttribute("aria-disabled") === "true",
        }))
        .filter((x) => !x.disabled && x.texto)
    )
    .catch(() => []);

  for (const candidato of candidatos) {
    if (!TEXTO_BOTONES_NAVEGACION.test(candidato.texto)) {
      continue;
    }

    /*
     * No queremos ejecutar acciones destructivas.
     */
    if (
      /eliminar|borrar|despublicar|rechazar|aprobar|guardar|enviar|remitir|cerrar sesi[oÃ³]n/i.test(
        candidato.texto
      )
    ) {
      continue;
    }

    const urlAntes = page.url();

    try {
      const botones = page.locator("button, [role='button']");
      const boton = botones.nth(candidato.indice);

      if (!(await boton.isVisible().catch(() => false))) {
        continue;
      }

      await boton.click({
        timeout: 1500,
        noWaitAfter: true,
      });

      await page.waitForTimeout(500);

      const urlDespues = page.url();

      if (urlDespues !== urlAntes) {
        const ruta = normalizarRuta(urlDespues);
        if (ruta) nuevas.add(ruta);

        await page.goto(urlAntes, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        await page.waitForTimeout(300);
      }
    } catch {
      /*
       * Un botÃ³n puede abrir modal, depender de datos o no ser
       * navegacional. Eso no debe detener la auditorÃ­a.
       */
      if (page.url() !== urlAntes) {
        try {
          await page.goto(urlAntes, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
        } catch {}
      }
    }
  }

  return [...nuevas];
}

async function detectarDesbordamientos(page, viewport) {
  return await page.evaluate(
    ({ viewport, selectoresIgnorados }) => {
      function selectorElemento(el) {
        if (!el) return "";

        let selector = el.tagName.toLowerCase();

        if (el.id) {
          selector += `#${el.id}`;
        }

        if (el.classList?.length) {
          selector +=
            "." +
            [...el.classList]
              .slice(0, 4)
              .map((c) => {
                try {
                  return CSS.escape(c);
                } catch {
                  return c;
                }
              })
              .join(".");
        }

        return selector;
      }

      function ignorarElemento(el, selector) {
        if (!el) return true;

        if (
          el.closest(
            "aside.menu-lateral, .menu-lateral, .globoContenedor"
          )
        ) {
          return true;
        }

        const limpio = selector.toLowerCase();

        if (
          selectoresIgnorados.some((regla) =>
            limpio.includes(
              regla
                .replace("aside.", "")
                .replace(".", "")
                .toLowerCase()
            )
          )
        ) {
          return true;
        }

        const estilo = getComputedStyle(el);

        if (
          estilo.display === "none" ||
          estilo.visibility === "hidden"
        ) {
          return true;
        }

        return false;
      }

      const doc = document.documentElement;

      const documentoDesborda =
        doc.scrollWidth > doc.clientWidth + 2;

      const elementos = [];

      const todos = [...document.body.querySelectorAll("*")];

      for (const el of todos) {
        const rect = el.getBoundingClientRect();
        const selector = selectorElemento(el);

        if (ignorarElemento(el, selector)) continue;

        /*
         * Ignoramos elementos sin dimensiones.
         */
        if (rect.width < 1 || rect.height < 1) continue;

        const saleDerecha = rect.right > viewport + 2;
        const saleIzquierda = rect.left < -2;

        const contenidoInternoDesborda =
          el.scrollWidth > el.clientWidth + 2;

        if (
          !saleDerecha &&
          !saleIzquierda &&
          !contenidoInternoDesborda
        ) {
          continue;
        }

        /*
         * Si un contenedor controla explÃ­citamente su propio
         * desplazamiento, no estÃ¡ rompiendo la pÃ¡gina.
         */
        const estilo = getComputedStyle(el);

        const controlaOverflow =
          ["auto", "scroll", "hidden", "clip"].includes(
            estilo.overflowX
          );

        if (
          contenidoInternoDesborda &&
          !saleDerecha &&
          !saleIzquierda &&
          controlaOverflow
        ) {
          continue;
        }

        /*
         * Evitamos reportar hijo y padre cuando el padre ya explica
         * exactamente el mismo problema.
         */
        const padre = el.parentElement;

        if (padre) {
          const rp = padre.getBoundingClientRect();

          const padreSale =
            rp.right > viewport + 2 || rp.left < -2;

          if (
            padreSale &&
            Math.abs(rp.right - rect.right) < 2 &&
            Math.abs(rp.left - rect.left) < 2
          ) {
            continue;
          }
        }

        elementos.push({
          selector,
          tag: el.tagName.toLowerCase(),
          ancho: Math.round(rect.width),
          izquierda: Math.round(rect.left),
          derecha: Math.round(rect.right),
          viewport,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          texto: (el.innerText || el.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 180),
        });

        if (elementos.length >= 20) break;
      }

      return {
        documentoDesborda,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        elementos,
      };
    },
    {
      viewport,
      selectoresIgnorados: SELECTORES_IGNORADOS,
    }
  );
}

async function cargarPagina(page, ruta) {
  const url = new URL(ruta, BASE_URL).href;

  let respuesta = null;

  try {
    respuesta = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForTimeout(600);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      status: null,
    };
  }

  return {
    error: null,
    status: respuesta?.status() ?? null,
  };
}

/* ============================================================
   INICIO
   ============================================================ */

const opcionesContexto = {};

if (fsSync.existsSync(ARCHIVO_SESION)) {
  opcionesContexto.storageState = ARCHIVO_SESION;
  console.log(`âœ“ SesiÃ³n cargada: ${ARCHIVO_SESION}`);
} else {
  console.warn(
    `âš  No se encontrÃ³ ${ARCHIVO_SESION}. Las pÃ¡ginas privadas podrÃ­an redirigir a /login.`
  );
}

const browser = await chromium.launch({
  headless: true,
});

const contextoDescubrimiento =
  await browser.newContext(opcionesContexto);

const paginaDescubrimiento =
  await contextoDescubrimiento.newPage();

const pendientes = [...RUTAS_INICIALES];
const descubiertas = new Set();

console.log("\nDescubriendo pÃ¡ginas...\n");

while (
  pendientes.length > 0 &&
  descubiertas.size < MAX_PAGINAS
) {
  const ruta = pendientes.shift();

  if (!ruta || descubiertas.has(ruta)) continue;

  descubiertas.add(ruta);

  process.stdout.write(
    `  [${descubiertas.size}] ${ruta}\n`
  );

  const carga = await cargarPagina(
    paginaDescubrimiento,
    ruta
  );

  if (carga.error) continue;

  const rutaFinal = normalizarRuta(
    paginaDescubrimiento.url()
  );

  if (
    rutaFinal &&
    !descubiertas.has(rutaFinal) &&
    !pendientes.includes(rutaFinal)
  ) {
    pendientes.push(rutaFinal);
  }

  const rutasDOM = await obtenerRutasDOM(
    paginaDescubrimiento
  );

  for (const encontrada of rutasDOM) {
    if (
      !descubiertas.has(encontrada) &&
      !pendientes.includes(encontrada)
    ) {
      pendientes.push(encontrada);
    }
  }

  /*
   * En Ã¡reas de Revista y miembros buscamos tambiÃ©n navegaciÃ³n
   * mediante botones. AhÃ­ es donde estaban escapÃ¡ndose las
   * pÃ¡ginas de manuscritos y versiones.
   */
  if (
    ruta.startsWith("/miembros/revista") ||
    ruta.startsWith("/revista")
  ) {
    const rutasBotones =
      await descubrirMedianteBotones(
        paginaDescubrimiento
      );

    for (const encontrada of rutasBotones) {
      if (
        !descubiertas.has(encontrada) &&
        !pendientes.includes(encontrada)
      ) {
        pendientes.push(encontrada);
      }
    }
  }
}

await contextoDescubrimiento.close();

const rutas = [...descubiertas].sort((a, b) =>
  a.localeCompare(b, "es")
);

await fs.writeFile(
  path.join(
    CARPETA_SALIDA,
    "rutas-descubiertas.json"
  ),
  JSON.stringify(rutas, null, 2),
  "utf8"
);

console.log(
  `\nâœ“ ${rutas.length} rutas descubiertas.\n`
);

/* ============================================================
   AUDITORÃA
   ============================================================ */

const resultados = [];

for (const viewport of VIEWPORTS) {
  console.log(
    `\n===== ${viewport.width}px =====\n`
  );

  const contexto = await browser.newContext({
    ...opcionesContexto,
    viewport,
  });

  const page = await contexto.newPage();

  for (const ruta of rutas) {
    const carga = await cargarPagina(page, ruta);

    if (carga.error) {
      resultados.push({
        viewport: viewport.width,
        ruta,
        rutaFinal: normalizarRuta(page.url()),
        status: carga.status,
        estado: "ERROR",
        error: carga.error,
        documentoDesborda: false,
        scrollWidth: null,
        clientWidth: viewport.width,
        elementos: [],
      });

      console.log(
        `âš  ${viewport.width}px ${ruta} ERROR`
      );

      continue;
    }

    const rutaFinal =
      normalizarRuta(page.url()) || ruta;

    const analisis =
      await detectarDesbordamientos(
        page,
        viewport.width
      );

    /*
     * Un problema real debe:
     * - hacer desbordar el documento; o
     * - contener un elemento problemÃ¡tico no ignorado.
     */
    const tieneProblema =
      analisis.documentoDesborda ||
      analisis.elementos.length > 0;

    const estado = tieneProblema
      ? "DESBORDAMIENTO"
      : "OK";

    resultados.push({
      viewport: viewport.width,
      ruta,
      rutaFinal,
      status: carga.status,
      estado,
      ...analisis,
    });

    if (tieneProblema) {
      console.log(
        `âŒ ${viewport.width}px ${ruta}: ${analisis.elementos.length} elemento(s)`
      );

      const captura = path.join(
        CARPETA_CAPTURAS,
        `${viewport.width}-${nombreSeguro(
          ruta
        )}.png`
      );

      try {
        await page.screenshot({
          path: captura,
          fullPage: true,
        });
      } catch {}
    } else {
      console.log(
        `âœ“ ${viewport.width}px ${ruta}`
      );
    }
  }

  await contexto.close();
}

await browser.close();

/* ============================================================
   RESUMEN
   ============================================================ */

const conProblemas = resultados.filter(
  (r) => r.estado !== "OK"
);

const desbordamientoReal = resultados.filter(
  (r) => r.documentoDesborda
);

const erroresHTTP = resultados.filter(
  (r) =>
    r.status !== null &&
    (r.status < 200 || r.status >= 400)
);

const resumenPorViewport = VIEWPORTS.map(
  ({ width }) => {
    const grupo = resultados.filter(
      (r) => r.viewport === width
    );

    return {
      viewport: width,
      revisiones: grupo.length,
      conProblemas: grupo.filter(
        (r) => r.estado !== "OK"
      ).length,
      documentoDesborda: grupo.filter(
        (r) => r.documentoDesborda
      ).length,
      erroresHTTP: grupo.filter(
        (r) =>
          r.status !== null &&
          (r.status < 200 || r.status >= 400)
      ).length,
    };
  }
);

const informe = {
  generado: new Date().toISOString(),
  baseUrl: BASE_URL,
  paginasDescubiertas: rutas.length,
  viewports: VIEWPORTS.map((v) => v.width),
  totalRevisiones: resultados.length,
  totalConProblemas: conProblemas.length,
  totalDocumentoDesborda:
    desbordamientoReal.length,
  totalErroresHTTP: erroresHTTP.length,
  resumenPorViewport,
  resultados,
};

await fs.writeFile(
  path.join(CARPETA_SALIDA, "informe.json"),
  JSON.stringify(informe, null, 2),
  "utf8"
);

/*
 * Informe pequeÃ±o, mucho mÃ¡s cÃ³modo para revisar que el JSON
 * completo.
 */
const resumen = {
  generado: informe.generado,
  paginasDescubiertas:
    informe.paginasDescubiertas,
  totalRevisiones: informe.totalRevisiones,
  totalConProblemas:
    informe.totalConProblemas,
  totalDocumentoDesborda:
    informe.totalDocumentoDesborda,
  totalErroresHTTP:
    informe.totalErroresHTTP,
  resumenPorViewport,
  problemas: conProblemas.map((r) => ({
    viewport: r.viewport,
    ruta: r.ruta,
    rutaFinal: r.rutaFinal,
    status: r.status,
    documentoDesborda:
      r.documentoDesborda,
    scrollWidth: r.scrollWidth,
    clientWidth: r.clientWidth,
    elementos: r.elementos,
  })),
};

await fs.writeFile(
  path.join(CARPETA_SALIDA, "resumen.json"),
  JSON.stringify(resumen, null, 2),
  "utf8"
);

console.log("\n==============================");
console.log("AUDITORÃA TERMINADA");
console.log("==============================");
console.log(
  `PÃ¡ginas descubiertas: ${rutas.length}`
);
console.log(
  `Revisiones realizadas: ${resultados.length}`
);
console.log(
  `Marcadas con problemas: ${conProblemas.length}`
);
console.log(
  `Desbordamientos reales: ${desbordamientoReal.length}`
);
console.log(
  `Errores HTTP: ${erroresHTTP.length}`
);

console.log("\nPor resoluciÃ³n:");

for (const fila of resumenPorViewport) {
  console.log(
    `  ${fila.viewport}px: ` +
      `${fila.conProblemas} problema(s), ` +
      `${fila.documentoDesborda} desbordamiento(s), ` +
      `${fila.erroresHTTP} error(es) HTTP`
  );
}

console.log(
  "\nArchivos generados:"
);
console.log(
  `  ${path.join(
    CARPETA_SALIDA,
    "rutas-descubiertas.json"
  )}`
);
console.log(
  `  ${path.join(
    CARPETA_SALIDA,
    "informe.json"
  )}`
);
console.log(
  `  ${path.join(
    CARPETA_SALIDA,
    "resumen.json"
  )}`
);
console.log(
  `  ${CARPETA_CAPTURAS}`
);