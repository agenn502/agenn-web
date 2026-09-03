"use client";

import {
  ClipboardEvent as ReactClipboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

type Manuscrito = {
  id: number;
  ensayo_id: number;
  origen: string;
  tipo_contenido: string;
  flujo_editorial: string;
  tipo_autoria: string;
  autor_corporativo: string | null;
  mostrar_referencia: boolean;
  edicion_ce_permitida: boolean;
  estado: string;
  titulo_actual: string;
  contenido_actual: string;
  imagen_url_actual: string | null;
  fuente_imagen_actual: string | null;
  tema: string | null;
  fecha_ingreso: string;
  fecha_aval: string | null;
};

type ResenaBibliografica = {
  id: number;
  manuscrito_id: number;
  titulo_obra: string;
  autores_obra: string;
  editorial: string | null;
  edicion: string | null;
  anio_publicacion: number | null;
  isbn: string | null;
  numero_paginas: number | null;
  portada_url: string | null;
  portada_storage_path: string | null;
  portada_alt: string | null;
  fuente_portada: string | null;
  updated_at: string;
};

type Version = {
  id: number;
  numero_version: number;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  fuente_imagen: string | null;
  nota_autor: string | null;
  created_at: string;
};

type Evento = {
  id: number;
  tipo: string;
  mensaje: string | null;
  created_at: string;

  actor: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
};

type ImagenManuscrito = {
  id: number;
  manuscrito_id: number;
  version_id: number | null;
  storage_path: string | null;
  url: string;
  titulo: string;
  fuente: string;
  orden: number;
  created_at: string;
  updated_at: string;
};

function codigoLocal() {
  const stored = localStorage.getItem("user");

  if (!stored) return "";

  try {
    const user = JSON.parse(stored);

    return String(user.codigo || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function fecha(valor: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(valor));
  } catch {
    return valor;
  }
}

function eventoTexto(tipo: string) {
  const nombres: Record<string, string> = {
    INGRESO: "Ingreso al banco editorial",
    SELECCION: "Seleccionado para revisión",
    CORRECCIONES_SOLICITADAS: "Correcciones solicitadas",
    REENVIO: "Nueva versión enviada",
    AVAL: "Aval editorial",
    DESCARTE: "No seleccionado",
    ASIGNACION_REVISTA: "Asignado a un número",
    PUBLICACION: "Publicado",
    ENVIO_BANCO: "Envío al Banco de publicables",
    EDICION_EDITORIAL: "Edición del Consejo Editorial",
  };

  return nombres[tipo] || tipo;
}

// ============================================================
// OPTIMIZACIÓN DE IMÁGENES
// ============================================================

async function comprimirImagen(
  file: File,
  maxBytes = 200 * 1024,
  maxWidth = 1600,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = () => {
      img.src = String(reader.result || "");
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer la imagen."));
    };

    img.onerror = () => {
      reject(new Error("No se pudo abrir la imagen."));
    };

    img.onload = async () => {
      try {
        const crearBlob = (maxWidth: number, calidad: number): Promise<Blob> =>
          new Promise((resolveBlob, rejectBlob) => {
            const escala = Math.min(maxWidth / img.width, 1);

            const canvas = document.createElement("canvas");

            canvas.width = Math.max(1, Math.round(img.width * escala));

            canvas.height = Math.max(1, Math.round(img.height * escala));

            const ctx = canvas.getContext("2d");

            if (!ctx) {
              rejectBlob(new Error("No se pudo procesar la imagen."));
              return;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  rejectBlob(new Error("No se pudo comprimir la imagen."));
                  return;
                }

                resolveBlob(blob);
              },
              "image/jpeg",
              calidad,
            );
          });

        let ancho = maxWidth;
        let calidad = 0.84;

        let blob = await crearBlob(ancho, calidad);

        while (blob.size > maxBytes && calidad > 0.5) {
          calidad = Math.max(0.5, calidad - 0.08);

          blob = await crearBlob(ancho, calidad);
        }

        while (blob.size > maxBytes && ancho > 700) {
          ancho -= 100;

          blob = await crearBlob(ancho, calidad);
        }

        while (blob.size > maxBytes && calidad > 0.35) {
          calidad = Math.max(0.35, calidad - 0.05);

          blob = await crearBlob(ancho, calidad);
        }

        if (blob.size > maxBytes) {
          reject(
            new Error(
              `No fue posible reducir la imagen a menos de ${Math.round(maxBytes / 1024)} KB. Pruebe con otra imagen.`,
            ),
          );
          return;
        }

        resolve(
          new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsDataURL(file);
  });
}

// ============================================================
// CONVERSIÓN ENTRE FORMATO GUARDADO Y EDITOR VISUAL
// ============================================================

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineAHtml(texto: string) {
  let salida = escaparHtml(texto);
  salida = salida.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  salida = salida.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return salida;
}

const PREFIJO_HTML_ENRIQUECIDO = "<!--AGENN_RICH_HTML_V1-->";

function esHtmlEnriquecido(contenido: string) {
  return contenido.trimStart().startsWith(PREFIJO_HTML_ENRIQUECIDO);
}

function normalizarAlineacionDeTexto(raiz: ParentNode) {
  raiz
    .querySelectorAll<HTMLElement>("p,div,li,blockquote")
    .forEach((elemento) => {
      const alineacion = elemento.style.textAlign.trim().toLowerCase();
      if (alineacion === "left" || alineacion === "start") {
        elemento.style.removeProperty("text-align");
      }

      if (!elemento.getAttribute("style")?.trim()) {
        elemento.removeAttribute("style");
      }
    });
}

function htmlFigura(imagen: ImagenManuscrito) {
  return `<figure data-imagen-id="${imagen.id}" contenteditable="false" style="margin:24px auto 16px auto;text-align:center;max-width:760px"><img src="${imagen.url}" alt="${escaparHtml(imagen.titulo || "Imagen del manuscrito")}" style="display:block;margin:0 auto;max-width:100%;max-height:520px;object-fit:contain;border-radius:8px" />${imagen.titulo ? `<figcaption style="display:block;margin-top:12px;font-weight:700;color:#333;line-height:1.45"><strong>${escaparHtml(imagen.titulo)}</strong></figcaption>` : ""}${imagen.fuente ? `<div style="display:block;margin-top:7px;font-size:.86rem;color:#777;font-style:italic;line-height:1.45"><em>${escaparHtml(imagen.fuente)}</em></div>` : ""}</figure>`;
}

function limpiarHtmlEnriquecido(editor: HTMLElement) {
  const copia = editor.cloneNode(true) as HTMLElement;

  copia.querySelectorAll<HTMLElement>("[data-imagen-id]").forEach((figura) => {
    const id = Number(figura.dataset.imagenId);
    if (!Number.isFinite(id)) {
      figura.remove();
      return;
    }
    const siguiente = figura.nextElementSibling as HTMLElement | null;
    if (
      siguiente?.tagName === "P" &&
      !(siguiente.textContent || "").trim() &&
      /^(?:\s|<br\s*\/?\s*>|&nbsp;)*$/i.test(siguiente.innerHTML)
    ) {
      siguiente.remove();
    }

    const marcador = document.createElement("p");
    marcador.dataset.agennImagenId = String(id);
    marcador.textContent = `[[IMAGEN:${id}]]`;
    figura.replaceWith(marcador);
  });

  copia
    .querySelectorAll(
      "script,style,link,meta,iframe,object,embed,form,input,button,textarea,select",
    )
    .forEach((nodo) => nodo.remove());

  // Las imágenes del manuscrito se administran mediante el cuadro de imágenes.
  // Así se evita guardar imágenes de Word como base64 dentro del texto.
  copia.querySelectorAll("img").forEach((imagen) => imagen.remove());

  copia.querySelectorAll<HTMLElement>("*").forEach((elemento) => {
    for (const atributo of Array.from(elemento.attributes)) {
      const nombre = atributo.name.toLowerCase();
      const valor = atributo.value;
      const permitido =
        nombre === "style" ||
        nombre === "class" ||
        nombre === "href" ||
        nombre === "target" ||
        nombre === "rel" ||
        nombre === "colspan" ||
        nombre === "rowspan" ||
        nombre === "start" ||
        nombre === "data-espacio" ||
        nombre === "data-agenn-imagen-id";

      if (!permitido || nombre.startsWith("on")) {
        elemento.removeAttribute(atributo.name);
        continue;
      }

      if (nombre === "href" && /^\s*(javascript|data):/i.test(valor)) {
        elemento.removeAttribute(atributo.name);
      }

      if (
        nombre === "style" &&
        /(expression\s*\(|url\s*\(|javascript:)/i.test(valor)
      ) {
        elemento.removeAttribute(atributo.name);
      }
    }
  });

  normalizarAlineacionDeTexto(copia);

  return copia.innerHTML.trim();
}

function contenidoAHtml(contenido: string, imagenes: ImagenManuscrito[]) {
  const mapa = new Map(imagenes.map((imagen) => [imagen.id, imagen]));

  if (esHtmlEnriquecido(contenido)) {
    const plantilla = document.createElement("template");
    plantilla.innerHTML = contenido
      .trimStart()
      .slice(PREFIJO_HTML_ENRIQUECIDO.length);
    plantilla.content
      .querySelectorAll<HTMLElement>("[data-agenn-imagen-id]")
      .forEach((marcador) => {
        const imagen = mapa.get(Number(marcador.dataset.agennImagenId));
        if (!imagen) {
          marcador.remove();
          return;
        }
        const contenedor = document.createElement("div");
        contenedor.innerHTML = htmlFigura(imagen);
        marcador.replaceWith(...Array.from(contenedor.childNodes));
      });

    normalizarAlineacionDeTexto(plantilla.content);
    return plantilla.innerHTML;
  }

  const lineas = contenido.replace(/\r/g, "").split("\n");
  const salida: string[] = [];
  let lista: "ul" | "ol" | null = null;

  const cerrarLista = () => {
    if (lista) salida.push(`</${lista}>`);
    lista = null;
  };

  for (const linea of lineas) {
    const limpia = linea.trim();

    // Las líneas vacías antiguas se interpretan solo como separadores
    // estructurales entre párrafos. El espacio añadido deliberadamente
    // por el autor se guarda como [[ESPACIO]].
    if (!limpia) {
      cerrarLista();
      continue;
    }

    if (limpia === "[[ESPACIO]]") {
      cerrarLista();
      salida.push('<p data-espacio="true"><br></p>');
      continue;
    }

    const imagenMatch = limpia.match(/^\[\[IMAGEN:(\d+)\]\]$/);
    if (imagenMatch) {
      cerrarLista();
      const imagen = mapa.get(Number(imagenMatch[1]));
      if (imagen) {
        salida.push(htmlFigura(imagen));
      }
      continue;
    }

    const vineta = linea.match(/^-\s+(.+)$/);
    if (vineta) {
      if (lista !== "ul") {
        cerrarLista();
        salida.push("<ul>");
        lista = "ul";
      }
      salida.push(`<li>${inlineAHtml(vineta[1])}</li>`);
      continue;
    }

    const numerada = linea.match(/^\d+\.\s+(.+)$/);
    if (numerada) {
      if (lista !== "ol") {
        cerrarLista();
        salida.push("<ol>");
        lista = "ol";
      }
      salida.push(`<li>${inlineAHtml(numerada[1])}</li>`);
      continue;
    }

    cerrarLista();
    salida.push(`<p>${inlineAHtml(linea)}</p>`);
  }

  cerrarLista();
  return salida.join("");
}

function editorAContenido(editor: HTMLElement) {
  return `${PREFIJO_HTML_ENRIQUECIDO}${limpiarHtmlEnriquecido(editor)}`;
}

// ============================================================
// PÁGINA
// ============================================================

export default function MiManuscritoPage() {
  const params = useParams();
  const id = String(params.id || "");

  const editorRef = useRef<HTMLDivElement | null>(null);

  const rangoImagenRef = useRef<Range | null>(null);

  const preparadoRef = useRef(false);

  const [manuscrito, setManuscrito] = useState<Manuscrito | null>(null);

  const [versiones, setVersiones] = useState<Version[]>([]);

  const [eventos, setEventos] = useState<Evento[]>([]);

  const [imagenesVersionActual, setImagenesVersionActual] = useState<
    ImagenManuscrito[]
  >([]);

  const [imagenesBorrador, setImagenesBorrador] = useState<ImagenManuscrito[]>(
    [],
  );

  const [titulo, setTitulo] = useState("");

  const [contenido, setContenido] = useState("");

  const [nota, setNota] = useState("");

  const [resena, setResena] = useState<ResenaBibliografica | null>(null);

  const [tipoAutoria, setTipoAutoria] = useState("MIEMBRO");

  const [mostrarReferencia, setMostrarReferencia] = useState(true);

  const [archivoPortada, setArchivoPortada] = useState<File | null>(null);

  const [vistaPortadaLocal, setVistaPortadaLocal] = useState<string | null>(
    null,
  );

  const [tamanoPortada, setTamanoPortada] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [procesando, setProcesando] = useState(false);

  const [estadoGuardado, setEstadoGuardado] = useState<
    "SIN_CAMBIOS" | "CAMBIOS" | "GUARDANDO" | "GUARDADO" | "ERROR"
  >("SIN_CAMBIOS");

  const [error, setError] = useState("");

  const cambiarDatoResena = (
    campo: keyof ResenaBibliografica,
    valor: string | number | null,
  ) => {
    setResena((actual) => (actual ? { ...actual, [campo]: valor } : actual));
    setEstadoGuardado("CAMBIOS");
  };

  // Modal imagen
  const [modalImagen, setModalImagen] = useState(false);

  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);

  const [tituloNuevaImagen, setTituloNuevaImagen] = useState("");

  const [fuenteNuevaImagen, setFuenteNuevaImagen] = useState("");

  const [tamanoNuevaImagen, setTamanoNuevaImagen] = useState<number | null>(
    null,
  );

  // =========================================================
  // CARGAR
  // =========================================================

  const cargar = useCallback(async () => {
    const codigo = codigoLocal();

    if (!codigo) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/revista/mis-manuscritos/${id}`, {
        headers: {
          "x-user-codigo": codigo,
        },
        cache: "no-store",
      });

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible cargar el manuscrito.",
        );
      }

      setManuscrito(result.manuscrito);

      setResena(result.resena || null);

      setTipoAutoria(result.manuscrito.tipo_autoria || "MIEMBRO");

      setMostrarReferencia(result.manuscrito.mostrar_referencia !== false);

      setVersiones(result.versiones || []);

      setEventos(result.eventos || []);

      const imagenesActuales = result.imagenes_version_actual || [];

      const imagenesBorradorActual = result.imagenes_borrador || [];

      setImagenesVersionActual(imagenesActuales);

      setImagenesBorrador(imagenesBorradorActual);

      setTitulo(result.manuscrito.titulo_actual || "");

      let textoContenido = result.manuscrito.contenido_actual || "";
      const esEdicionDeVersion =
        result.manuscrito.estado === "CORRECCIONES" ||
        (result.manuscrito.estado === "BORRADOR" &&
          (result.versiones || []).length > 0);

      // En correcciones, las copias editables reciben IDs nuevos. Conservamos
      // su posición remapeando por el mismo orden de la versión congelada.
      if (
        esEdicionDeVersion &&
        imagenesActuales.length > 0 &&
        imagenesBorradorActual.length > 0
      ) {
        const anterioresOrdenadas = [...imagenesActuales].sort(
          (a, b) => Number(a.orden || 0) - Number(b.orden || 0),
        );
        const borradoresOrdenados = [...imagenesBorradorActual].sort(
          (a, b) => Number(a.orden || 0) - Number(b.orden || 0),
        );

        anterioresOrdenadas.forEach((anterior, indice) => {
          const nueva = borradoresOrdenados[indice];
          if (!nueva || Number(anterior.id) === Number(nueva.id)) return;

          textoContenido = textoContenido
            .replaceAll(
              `data-agenn-imagen-id="${anterior.id}"`,
              `data-agenn-imagen-id="${nueva.id}"`,
            )
            .replaceAll(`[[IMAGEN:${anterior.id}]]`, `[[IMAGEN:${nueva.id}]]`);
        });
      }

      /* Compatibilidad solo para ensayos antiguos sin posición de imagen. */
      const tieneMarcadoresImagen =
        /\[\[IMAGEN:\d+\]\]|data-agenn-imagen-id=["']\d+["']/.test(
          textoContenido,
        );

      if (
        esEdicionDeVersion &&
        !esHtmlEnriquecido(textoContenido) &&
        !tieneMarcadoresImagen &&
        imagenesBorradorActual.length > 0
      ) {
        textoContenido = `[[IMAGEN:${imagenesBorradorActual[0].id}]]\n${textoContenido}`;
      }

      setContenido(textoContenido);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el manuscrito.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(
    () => () => {
      if (vistaPortadaLocal) URL.revokeObjectURL(vistaPortadaLocal);
    },
    [vistaPortadaLocal],
  );

  // =========================================================
  // PREPARAR COPIA EDITORIAL DE IMÁGENES
  // =========================================================

  useEffect(() => {
    const preparar = async () => {
      if (
        !manuscrito ||
        !(
          manuscrito.estado === "CORRECCIONES" ||
          (manuscrito.estado === "BORRADOR" && versiones.length > 0)
        ) ||
        preparadoRef.current
      ) {
        return;
      }

      preparadoRef.current = true;

      try {
        const response = await fetch(
          `/api/revista/mis-manuscritos/${id}/imagenes`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-user-codigo": codigoLocal(),
            },
            body: JSON.stringify({
              accion: "PREPARAR",
            }),
          },
        );

        const texto = await response.text();

        const result = texto ? JSON.parse(texto) : null;

        if (!response.ok || !result?.ok) {
          throw new Error(
            result?.error || "No fue posible preparar las imágenes.",
          );
        }

        if (result.preparado) {
          await cargar();
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible preparar las imágenes.",
        );
      }
    };

    preparar();
  }, [manuscrito, versiones.length, id, cargar]);

  // =========================================================
  // GUARDAR TEXTO / REENVIAR
  // =========================================================

  const datosEditoriales = () => ({
    tipo_autoria: tipoAutoria,
    mostrar_referencia: mostrarReferencia,
    resena: resena
      ? {
          titulo_obra: resena.titulo_obra,
          autores_obra: resena.autores_obra,
          editorial: resena.editorial,
          edicion: resena.edicion,
          anio_publicacion: resena.anio_publicacion,
          isbn: resena.isbn,
          numero_paginas: resena.numero_paginas,
          portada_alt: resena.portada_alt,
          fuente_portada: resena.fuente_portada,
        }
      : null,
  });

  const guardarContenido = async (
    nuevoContenido: string,
    mostrarAlerta = false,
  ) => {
    if (!titulo.trim()) {
      return;
    }

    const response = await fetch(`/api/revista/mis-manuscritos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-codigo": codigoLocal(),
      },
      body: JSON.stringify({
        accion: "GUARDAR",
        titulo: titulo.trim(),
        contenido: nuevoContenido,
        fuente_imagen: "",
        nota_autor: "",
        ...datosEditoriales(),
      }),
    });

    const texto = await response.text();

    const result = texto ? JSON.parse(texto) : null;

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "No fue posible guardar los cambios.");
    }

    if (mostrarAlerta) {
      alert("Cambios guardados.");
    }
  };

  const guardar = async (accion: "GUARDAR" | "ENVIAR" | "REENVIAR") => {
    const contenidoActual = editorRef.current
      ? editorAContenido(editorRef.current)
      : contenido;

    setContenido(contenidoActual);

    if (!titulo.trim() || !contenidoActual.trim()) {
      setError("El manuscrito debe conservar título y contenido.");
      return;
    }

    if (
      accion !== "GUARDAR" &&
      !confirm(
        accion === "ENVIAR"
          ? manuscrito?.flujo_editorial === "SIMPLIFICADO"
            ? "¿Enviar esta publicación al Banco de publicables? El Consejo Editorial podrá ajustar su presentación al incorporarla a un número."
            : "¿Enviar esta publicación al Consejo Editorial? Después del envío no podrá editarla hasta que exista una resolución editorial."
          : "¿Enviar esta nueva versión al Consejo Editorial? Después de enviarla no podrá editarla hasta que exista una nueva resolución.",
      )
    ) {
      return;
    }

    setProcesando(true);
    setError("");
    setEstadoGuardado("GUARDANDO");

    try {
      const response = await fetch(`/api/revista/mis-manuscritos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({
          accion,
          titulo: titulo.trim(),
          contenido: contenidoActual.trim(),
          fuente_imagen: "",
          nota_autor: nota.trim(),
          ...datosEditoriales(),
        }),
      });

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible guardar los cambios.");
      }

      if (accion === "GUARDAR") {
        setEstadoGuardado("GUARDADO");
      } else {
        alert(
          manuscrito?.flujo_editorial === "SIMPLIFICADO"
            ? `Versión ${result.numero_version} enviada al Banco de publicables.`
            : `Versión ${result.numero_version} enviada al Consejo Editorial.`,
        );

        setNota("");

        preparadoRef.current = false;
      }

      await cargar();
    } catch (err) {
      setEstadoGuardado("ERROR");
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar los cambios.",
      );
    } finally {
      setProcesando(false);
    }
  };

  // =========================================================
  // HERRAMIENTAS DEL EDITOR VISUAL
  // =========================================================

  const sincronizarEditor = () => {
    if (!editorRef.current) return contenido;
    const nuevo = editorAContenido(editorRef.current);
    setContenido(nuevo);
    setEstadoGuardado("CAMBIOS");
    return nuevo;
  };

  const guardarRango = () => {
    const editor = editorRef.current;
    const seleccion = window.getSelection();
    if (!editor || !seleccion || seleccion.rangeCount === 0) return;
    const rango = seleccion.getRangeAt(0);
    if (editor.contains(rango.commonAncestorContainer))
      rangoImagenRef.current = rango.cloneRange();
  };

  const ejecutarComando = (comando: string) => {
    editorRef.current?.focus();
    document.execCommand(comando, false);
    sincronizarEditor();
  };

  const manejarPegado = (event: ReactClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (!html) return;

    event.preventDefault();

    const plantilla = document.createElement("template");
    plantilla.innerHTML = html;

    plantilla.content
      .querySelectorAll(
        "script,style,link,meta,iframe,object,embed,form,input,button,textarea,select,img",
      )
      .forEach((nodo) => nodo.remove());

    plantilla.content.querySelectorAll<HTMLElement>("*").forEach((elemento) => {
      elemento.style.removeProperty("font-size");
      elemento.style.removeProperty("font-family");
      elemento.style.removeProperty("line-height");
      elemento.style.removeProperty("text-align");

      Array.from(elemento.style).forEach((propiedad) => {
        if (propiedad.toLowerCase().startsWith("mso-")) {
          elemento.style.removeProperty(propiedad);
        }
      });

      elemento.removeAttribute("face");
      elemento.removeAttribute("size");
      elemento.removeAttribute("class");

      if (!elemento.getAttribute("style")?.trim()) {
        elemento.removeAttribute("style");
      }
    });

    plantilla.content.querySelectorAll<HTMLElement>("*").forEach((elemento) => {
      if (elemento.tagName.includes(":")) {
        elemento.replaceWith(...Array.from(elemento.childNodes));
      }
    });

    document.execCommand("insertHTML", false, plantilla.innerHTML);
    sincronizarEditor();
  };

  const aplicarTamanoFuente = (tamano: string) => {
    const editor = editorRef.current;
    const rango = rangoImagenRef.current;
    if (!editor || !tamano || !rango) return;

    editor.focus();

    const seleccion = window.getSelection();
    if (!seleccion || !editor.contains(rango.commonAncestorContainer)) return;

    const rangoAplicacion = rango.cloneRange();
    if (rangoAplicacion.collapsed) return;

    // CSS directo: execCommand("fontSize") convierte algunos valores en
    // xxx-large antes de que puedan normalizarse.
    const fragmento = rangoAplicacion.extractContents();

    fragmento.querySelectorAll<HTMLElement>("*").forEach((elemento) => {
      elemento.style.removeProperty("font-size");
      if (elemento.tagName.toLowerCase() === "font") {
        elemento.removeAttribute("size");
      }
    });

    const nodosTexto: Text[] = [];
    const caminante = document.createTreeWalker(
      fragmento,
      NodeFilter.SHOW_TEXT,
    );
    let nodo = caminante.nextNode();
    while (nodo) {
      if ((nodo.textContent || "").length > 0) nodosTexto.push(nodo as Text);
      nodo = caminante.nextNode();
    }

    nodosTexto.forEach((texto) => {
      const span = document.createElement("span");
      span.style.fontSize = tamano;
      texto.parentNode?.replaceChild(span, texto);
      span.appendChild(texto);
    });

    const inicio = document.createComment("agenn-inicio-tamano");
    const fin = document.createComment("agenn-fin-tamano");
    fragmento.insertBefore(inicio, fragmento.firstChild);
    fragmento.appendChild(fin);
    rangoAplicacion.insertNode(fragmento);

    const nuevoRango = document.createRange();
    nuevoRango.setStartAfter(inicio);
    nuevoRango.setEndBefore(fin);
    inicio.remove();
    fin.remove();

    seleccion.removeAllRanges();
    seleccion.addRange(nuevoRango);
    rangoImagenRef.current = nuevoRango.cloneRange();

    sincronizarEditor();
  };

  // =========================================================
  // MODAL INSERTAR IMAGEN
  // =========================================================

  const abrirModalImagen = () => {
    guardarRango();
    setArchivoNuevo(null);
    setTamanoNuevaImagen(null);
    setTituloNuevaImagen("");
    setFuenteNuevaImagen("");
    setModalImagen(true);
  };

  const seleccionarImagen = async (file: File | null) => {
    if (!file) {
      setArchivoNuevo(null);

      setTamanoNuevaImagen(null);

      return;
    }

    setProcesando(true);
    setError("");

    try {
      const optimizada = await comprimirImagen(file);

      setArchivoNuevo(optimizada);

      setTamanoNuevaImagen(optimizada.size);
    } catch (err) {
      setArchivoNuevo(null);

      setTamanoNuevaImagen(null);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible optimizar la imagen.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const seleccionarPortada = async (file: File | null) => {
    if (vistaPortadaLocal) URL.revokeObjectURL(vistaPortadaLocal);
    setVistaPortadaLocal(null);
    setArchivoPortada(null);
    setTamanoPortada(null);

    if (!file) return;

    setProcesando(true);
    setError("");

    try {
      const optimizada = await comprimirImagen(file, 150 * 1024, 1200);
      setArchivoPortada(optimizada);
      setTamanoPortada(optimizada.size);
      setVistaPortadaLocal(URL.createObjectURL(optimizada));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible optimizar la portada.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const pegarPortada = (event: ReactClipboardEvent<HTMLDivElement>) => {
    const imagenDesdeItems = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();
    const imagen =
      imagenDesdeItems ||
      Array.from(event.clipboardData.files).find((archivo) =>
        archivo.type.startsWith("image/"),
      );

    if (!imagen) {
      setError(
        "El portapapeles no contiene una imagen. Copie la portada como imagen y vuelva a pegarla.",
      );
      return;
    }

    event.preventDefault();
    void seleccionarPortada(imagen);
  };

  const subirPortada = async () => {
    if (!archivoPortada || !resena) return;

    setProcesando(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("archivo", archivoPortada);
      formData.append("uso", "PORTADA");
      formData.append(
        "titulo",
        resena.portada_alt?.trim() || `Portada de ${resena.titulo_obra}`,
      );
      formData.append("fuente", resena.fuente_portada?.trim() || "");

      const response = await fetch(
        `/api/revista/mis-manuscritos/${id}/imagenes`,
        {
          method: "POST",
          headers: { "x-user-codigo": codigoLocal() },
          body: formData,
        },
      );
      const texto = await response.text();
      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible guardar la portada.");
      }

      setResena((actual) =>
        actual
          ? {
              ...actual,
              portada_url: result.portada.url,
              portada_storage_path: result.portada.storage_path,
              portada_alt: result.portada.alt || null,
              fuente_portada: result.portada.fuente || null,
            }
          : actual,
      );
      if (vistaPortadaLocal) URL.revokeObjectURL(vistaPortadaLocal);
      setVistaPortadaLocal(null);
      setArchivoPortada(null);
      setTamanoPortada(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la portada.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const eliminarPortada = async () => {
    if (
      !resena?.portada_url ||
      !confirm("¿Quitar la portada de esta reseña?")
    ) {
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const response = await fetch(
        `/api/revista/mis-manuscritos/${id}/imagenes`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-codigo": codigoLocal(),
          },
          body: JSON.stringify({ uso: "PORTADA" }),
        },
      );
      const texto = await response.text();
      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible quitar la portada.");
      }

      setResena((actual) =>
        actual
          ? {
              ...actual,
              portada_url: null,
              portada_storage_path: null,
              portada_alt: null,
              fuente_portada: null,
            }
          : actual,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible quitar la portada.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const reabrirPublicacion = async () => {
    if (
      !confirm(
        "¿Reabrir esta publicación para preparar una nueva versión? La versión anterior se conservará en el historial.",
      )
    ) {
      return;
    }

    setProcesando(true);
    setError("");
    try {
      const response = await fetch(`/api/revista/mis-manuscritos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({ accion: "REABRIR" }),
      });
      const texto = await response.text();
      const result = texto ? JSON.parse(texto) : null;
      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible reabrir la publicación.",
        );
      }
      preparadoRef.current = false;
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible reabrir la publicación.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const insertarImagen = async () => {
    if (!archivoNuevo) {
      setError("Seleccione una imagen.");
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("archivo", archivoNuevo);

      formData.append("titulo", tituloNuevaImagen.trim());

      formData.append("fuente", fuenteNuevaImagen.trim());

      const response = await fetch(
        `/api/revista/mis-manuscritos/${id}/imagenes`,
        {
          method: "POST",
          headers: {
            "x-user-codigo": codigoLocal(),
          },
          body: formData,
        },
      );

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible incorporar la imagen.",
        );
      }

      const imagen: ImagenManuscrito = result.imagen;

      setImagenesBorrador((actuales) => [...actuales, imagen]);

      const editor = editorRef.current;
      if (editor) {
        editor.focus();

        const figura = document.createElement("figure");
        figura.dataset.imagenId = String(imagen.id);
        figura.contentEditable = "false";
        figura.style.margin = "24px auto 30px auto";
        figura.style.textAlign = "center";
        figura.style.maxWidth = "760px";

        const img = document.createElement("img");
        img.src = imagen.url;
        img.alt = imagen.titulo || "Imagen del manuscrito";
        img.style.display = "block";
        img.style.margin = "0 auto";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "520px";
        img.style.objectFit = "contain";
        img.style.borderRadius = "8px";
        figura.appendChild(img);

        if (imagen.titulo) {
          const cap = document.createElement("figcaption");
          const strong = document.createElement("strong");
          strong.textContent = imagen.titulo;
          cap.appendChild(strong);
          cap.style.display = "block";
          cap.style.marginTop = "12px";
          cap.style.fontWeight = "700";
          cap.style.color = "#333";
          cap.style.lineHeight = "1.45";
          figura.appendChild(cap);
        }

        if (imagen.fuente) {
          const fuente = document.createElement("div");
          const em = document.createElement("em");
          em.textContent = imagen.fuente;
          fuente.appendChild(em);
          fuente.style.display = "block";
          fuente.style.marginTop = "7px";
          fuente.style.fontSize = ".86rem";
          fuente.style.color = "#777";
          fuente.style.fontStyle = "italic";
          fuente.style.lineHeight = "1.45";
          figura.appendChild(fuente);
        }

        const despues = document.createElement("p");
        despues.appendChild(document.createElement("br"));

        const seleccion = window.getSelection();
        const rangoGuardado = rangoImagenRef.current;

        if (
          seleccion &&
          rangoGuardado &&
          editor.contains(rangoGuardado.commonAncestorContainer)
        ) {
          const rango = rangoGuardado.cloneRange();
          rango.deleteContents();
          rango.collapse(true);

          let bloque: HTMLElement | null =
            rango.startContainer instanceof HTMLElement
              ? rango.startContainer
              : rango.startContainer.parentElement;

          while (
            bloque &&
            bloque !== editor &&
            !["P", "DIV", "LI"].includes(bloque.tagName)
          ) {
            bloque = bloque.parentElement;
          }

          if (
            bloque &&
            bloque !== editor &&
            (bloque.tagName === "P" || bloque.tagName === "DIV")
          ) {
            const antesRango = document.createRange();
            antesRango.selectNodeContents(bloque);
            antesRango.setEnd(rango.startContainer, rango.startOffset);

            const despuesRango = document.createRange();
            despuesRango.selectNodeContents(bloque);
            despuesRango.setStart(rango.startContainer, rango.startOffset);

            const antesFrag = antesRango.cloneContents();
            const despuesFrag = despuesRango.cloneContents();
            const antes = document.createElement("p");
            antes.appendChild(antesFrag);
            const despuesTexto = document.createElement("p");
            despuesTexto.appendChild(despuesFrag);

            const padre = bloque.parentNode;
            if (padre) {
              if ((antes.textContent || "").trim())
                padre.insertBefore(antes, bloque);
              padre.insertBefore(figura, bloque);
              padre.insertBefore(despuesTexto, bloque);
              padre.removeChild(bloque);
              if (!(despuesTexto.textContent || "").trim())
                despuesTexto.innerHTML = "<br>";

              const nuevoRango = document.createRange();
              nuevoRango.selectNodeContents(despuesTexto);
              nuevoRango.collapse(true);
              seleccion.removeAllRanges();
              seleccion.addRange(nuevoRango);
            }
          } else {
            const referencia =
              bloque && bloque !== editor
                ? bloque.closest("ul,ol") || bloque
                : null;
            if (referencia?.parentNode) {
              referencia.parentNode.insertBefore(
                figura,
                referencia.nextSibling,
              );
              referencia.parentNode.insertBefore(despues, figura.nextSibling);
            } else {
              editor.appendChild(figura);
              editor.appendChild(despues);
            }
          }
        } else {
          editor.appendChild(figura);
          editor.appendChild(despues);
        }
      }

      const editorActual = editorRef.current;
      if (
        editorActual &&
        !editorActual.querySelector(`[data-imagen-id="${imagen.id}"]`)
      ) {
        editorActual.insertAdjacentHTML("beforeend", htmlFigura(imagen));
      }

      const nuevoContenido = editorActual
        ? editorAContenido(editorActual)
        : contenido;
      setContenido(nuevoContenido);
      await guardarContenido(nuevoContenido);
      setModalImagen(false);
      setArchivoNuevo(null);
      setTamanoNuevaImagen(null);
      setTituloNuevaImagen("");
      setFuenteNuevaImagen("");
      rangoImagenRef.current = null;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible insertar la imagen.",
      );
    } finally {
      setProcesando(false);
    }
  };

  // =========================================================
  // DATOS DE IMÁGENES
  // =========================================================

  const colocarImagenEnTexto = async (imagen: ImagenManuscrito) => {
    const editor = editorRef.current;
    if (!editor) return;

    const existente = editor.querySelector(`[data-imagen-id="${imagen.id}"]`);
    if (existente) {
      existente.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const contenedor = document.createElement("div");
      contenedor.innerHTML = htmlFigura(imagen);
      const fragmento = document.createDocumentFragment();
      fragmento.append(...Array.from(contenedor.childNodes));

      const rango = rangoImagenRef.current;
      if (rango && editor.contains(rango.commonAncestorContainer)) {
        const posicion = rango.cloneRange();
        posicion.deleteContents();
        posicion.insertNode(fragmento);
      } else {
        editor.appendChild(fragmento);
      }

      const nuevoContenido = editorAContenido(editor);
      setContenido(nuevoContenido);
      await guardarContenido(nuevoContenido, true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible colocar la imagen dentro del texto.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const actualizarImagen = async (
    imagenId: number,
    tituloImagen: string,
    fuente: string,
  ) => {
    setProcesando(true);
    setError("");

    try {
      const response = await fetch(
        `/api/revista/mis-manuscritos/${id}/imagenes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-codigo": codigoLocal(),
          },
          body: JSON.stringify({
            accion: "ACTUALIZAR",
            imagen_id: imagenId,
            titulo: tituloImagen,
            fuente,
          }),
        },
      );

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible actualizar la imagen.",
        );
      }

      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar la imagen.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const eliminarImagen = async (imagenId: number) => {
    if (!confirm("¿Quitar esta imagen de la nueva versión del manuscrito?")) {
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const response = await fetch(
        `/api/revista/mis-manuscritos/${id}/imagenes`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-codigo": codigoLocal(),
          },
          body: JSON.stringify({
            imagen_id: imagenId,
          }),
        },
      );

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible quitar la imagen.");
      }

      editorRef.current
        ?.querySelector(`[data-imagen-id="${imagenId}"]`)
        ?.remove();
      setImagenesBorrador((actuales) =>
        actuales.filter((imagen) => imagen.id !== imagenId),
      );
      const nuevoContenido = editorRef.current
        ? editorAContenido(editorRef.current)
        : contenido.replace(
            new RegExp(`\n*\[\[IMAGEN:${imagenId}\]\]\n*`, "g"),
            "\n\n",
          );
      setContenido(nuevoContenido);
      await guardarContenido(nuevoContenido);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible quitar la imagen.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const editableActual = ["BORRADOR", "CORRECCIONES"].includes(
    manuscrito?.estado || "",
  );
  const imagenesEditor = editableActual
    ? imagenesBorrador
    : imagenesVersionActual;

  useEffect(() => {
    if (!editorRef.current || loading) return;
    editorRef.current.innerHTML = contenidoAHtml(contenido, imagenesEditor);
  }, [
    loading,
    manuscrito?.id,
    editableActual,
    imagenesVersionActual,
    imagenesBorrador,
  ]);

  // =========================================================
  // RENDER
  // =========================================================

  if (loading) {
    return <p>Cargando manuscrito...</p>;
  }

  if (!manuscrito) {
    return (
      <div>
        <h1>Mi manuscrito</h1>

        <p>{error || "No se encontró el manuscrito."}</p>

        <Link href="/miembros/revista/mis-manuscritos">
          ← Volver a Mis manuscritos
        </Link>
      </div>
    );
  }

  const editable = ["BORRADOR", "CORRECCIONES"].includes(manuscrito.estado);

  const ultimaCorreccion = eventos.find(
    (evento) => evento.tipo === "CORRECCIONES_SOLICITADAS",
  );

  const imagenesMostradas = editable ? imagenesBorrador : imagenesVersionActual;

  return (
    <div
      style={{
        maxWidth: "1050px",
      }}
    >
      <p
        style={{
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.82rem",
          letterSpacing: "0.04em",
        }}
      >
        Revista AGENN · Proceso editorial
      </p>

      <h1
        style={{
          color: "#4d371c",
        }}
      >
        {manuscrito.titulo_actual}
      </h1>

      {/* ===================================================
          OBSERVACIONES CE
      =================================================== */}

      {ultimaCorreccion && (
        <section
          style={{
            background: "#fff1cf",
            border: "1px solid #dfc36d",
            borderRadius: "12px",
            padding: "1.2rem",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.35rem 0",
              color: "#775500",
              fontSize: "0.78rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Consejo Editorial
          </p>

          <h2
            style={{
              margin: "0 0 0.8rem 0",
              color: "#775500",
            }}
          >
            Correcciones solicitadas
          </h2>

          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.8,
              color: "#4f3c00",
            }}
          >
            {ultimaCorreccion.mensaje}
          </div>

          <div
            style={{
              marginTop: "0.9rem",
              color: "#75601f",
              fontSize: "0.86rem",
            }}
          >
            {fecha(ultimaCorreccion.created_at)}

            {ultimaCorreccion.actor && <> · {ultimaCorreccion.actor.nombre}</>}
          </div>
        </section>
      )}

      {error && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            color: "#7a1f1f",
            padding: "1rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {manuscrito.flujo_editorial === "SIMPLIFICADO" &&
        manuscrito.estado === "PUBLICABLE" && (
          <section
            style={{
              background: "#eef6e9",
              border: "1px solid #b7d2aa",
              borderRadius: "12px",
              padding: "1.2rem",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#356128" }}>
              Preparar una nueva versión
            </h2>
            <p style={{ lineHeight: 1.7 }}>
              Puede reabrir esta publicación para corregir el texto o agregar,
              sustituir o eliminar su portada. La versión enviada anteriormente
              permanecerá en el historial.
            </p>
            <button
              type="button"
              disabled={procesando}
              onClick={reabrirPublicacion}
              style={{
                background: "#356128",
                color: "white",
                border: 0,
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                fontWeight: 700,
              }}
            >
              Reabrir para edición
            </button>
          </section>
        )}

      {manuscrito.flujo_editorial === "SIMPLIFICADO" &&
        manuscrito.estado === "ASIGNADO" && (
          <div
            style={{
              background: "#fff4d6",
              border: "1px solid #dfc36d",
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            Para preparar una nueva versión, el Consejo Editorial debe retirar
            primero esta publicación del número en preparación.
          </div>
        )}

      {manuscrito.tipo_contenido === "RESENA" && resena && (
        <section
          style={{
            background: "#f8f6ef",
            border: "1px solid #cfc7b8",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#4d371c" }}>
            Datos de la obra reseñada
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
            }}
          >
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Firma pública</strong>
              <select
                value={tipoAutoria}
                disabled={!editable || procesando}
                onChange={(e) => {
                  const valor = e.target.value;
                  setTipoAutoria(valor);
                  setMostrarReferencia(valor === "MIEMBRO");
                  setEstadoGuardado("CAMBIOS");
                }}
                style={{ padding: "0.7rem" }}
              >
                <option value="CONSEJO_EDITORIAL">Consejo Editorial</option>
                <option value="MIEMBRO">Mi nombre como autor</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Título de la obra</strong>
              <input
                value={resena.titulo_obra}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena("titulo_obra", e.target.value)
                }
                style={{ padding: "0.7rem" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Autor o autores de la obra</strong>
              <input
                value={resena.autores_obra}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena("autores_obra", e.target.value)
                }
                style={{ padding: "0.7rem" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Editorial</strong>
              <input
                value={resena.editorial || ""}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena("editorial", e.target.value || null)
                }
                style={{ padding: "0.7rem" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Edición</strong>
              <input
                value={resena.edicion || ""}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena("edicion", e.target.value || null)
                }
                style={{ padding: "0.7rem" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Año de publicación</strong>
              <input
                type="number"
                min={1000}
                max={2100}
                value={resena.anio_publicacion || ""}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena(
                    "anio_publicacion",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                style={{ padding: "0.7rem" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>ISBN</strong>
              <input
                value={resena.isbn || ""}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena("isbn", e.target.value || null)
                }
                style={{ padding: "0.7rem" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <strong>Número de páginas</strong>
              <input
                type="number"
                min={1}
                value={resena.numero_paginas || ""}
                disabled={!editable || procesando}
                onChange={(e) =>
                  cambiarDatoResena(
                    "numero_paginas",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                style={{ padding: "0.7rem" }}
              />
            </label>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.55rem",
              marginTop: "1rem",
            }}
          >
            <input
              type="checkbox"
              checked={mostrarReferencia}
              disabled={!editable || procesando}
              onChange={(e) => {
                setMostrarReferencia(e.target.checked);
                setEstadoGuardado("CAMBIOS");
              }}
            />
            Mostrar la referencia sugerida para citar esta reseña
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              marginTop: "1.25rem",
              alignItems: "start",
            }}
          >
            <div
              tabIndex={editable ? 0 : -1}
              onPaste={editable ? pegarPortada : undefined}
              style={{
                minHeight: "300px",
                border: "2px dashed #aaa17f",
                borderRadius: "12px",
                background: "white",
                padding: "0.8rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                outlineColor: "#6b6f1a",
              }}
              aria-label="Área para pegar la portada"
            >
              {vistaPortadaLocal || resena.portada_url ? (
                <img
                  src={vistaPortadaLocal || resena.portada_url || ""}
                  alt={resena.portada_alt || `Portada de ${resena.titulo_obra}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "360px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div style={{ color: "#6d6558", lineHeight: 1.7 }}>
                  <strong>Pegue aquí la portada</strong>
                  <br />
                  Use Ctrl + V después de copiarla como imagen.
                </div>
              )}
            </div>

            <div>
              <h3 style={{ marginTop: 0, color: "#4d371c" }}>
                Portada de la obra
              </h3>
              <p style={{ color: "#666", lineHeight: 1.6 }}>
                Puede pegarla directamente o seleccionarla como archivo. Será
                convertida a JPG y reducida automáticamente a un máximo de 150
                KB.
              </p>

              {editable && (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={procesando}
                  onChange={(e) =>
                    void seleccionarPortada(e.target.files?.[0] || null)
                  }
                />
              )}

              {tamanoPortada !== null && (
                <div
                  style={{
                    marginTop: "0.8rem",
                    padding: "0.8rem",
                    color: "#775500",
                    background: "#fff4d6",
                    border: "1px solid #dfc36d",
                    borderRadius: "8px",
                    lineHeight: 1.55,
                  }}
                >
                  <strong>
                    Portada preparada: {(tamanoPortada / 1024).toFixed(1)} KB
                  </strong>
                  <br />
                  Todavía no está guardada. Pulse{" "}
                  <strong>Guardar portada</strong> antes de enviar la
                  publicación.
                </div>
              )}

              <label
                style={{ display: "grid", gap: "0.35rem", marginTop: "1rem" }}
              >
                <strong>Texto alternativo</strong>
                <input
                  value={resena.portada_alt || ""}
                  disabled={!editable || procesando}
                  onChange={(e) =>
                    cambiarDatoResena("portada_alt", e.target.value || null)
                  }
                  placeholder={`Portada de ${resena.titulo_obra}`}
                  style={{ padding: "0.7rem" }}
                />
              </label>

              <label
                style={{ display: "grid", gap: "0.35rem", marginTop: "1rem" }}
              >
                <strong>Fuente de la portada</strong>
                <input
                  value={resena.fuente_portada || ""}
                  disabled={!editable || procesando}
                  onChange={(e) =>
                    cambiarDatoResena("fuente_portada", e.target.value || null)
                  }
                  placeholder="Ej.: Imagen proporcionada por la editorial"
                  style={{ padding: "0.7rem" }}
                />
              </label>

              {editable && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.7rem",
                    marginTop: "1rem",
                  }}
                >
                  {archivoPortada && (
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={subirPortada}
                      style={{
                        background: "#6b6f1a",
                        color: "white",
                        border: 0,
                        borderRadius: "8px",
                        padding: "0.7rem 1rem",
                        fontWeight: 700,
                      }}
                    >
                      Guardar portada
                    </button>
                  )}

                  {resena.portada_url && (
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={eliminarPortada}
                      style={{
                        background: "white",
                        color: "#8b2f2f",
                        border: "1px solid #d3a0a0",
                        borderRadius: "8px",
                        padding: "0.7rem 1rem",
                      }}
                    >
                      Quitar portada
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          EDITOR
      =================================================== */}

      <section
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#4d371c" }}>
          {editable ? "Texto del manuscrito" : "Versión actual del manuscrito"}
        </h2>

        {editable ? (
          <>
            <label>
              <strong>Título</strong>
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.75rem",
                margin: "0.5rem 0 1.25rem",
              }}
            />

            <BarraEditor
              onNegrita={() => ejecutarComando("bold")}
              onItalica={() => ejecutarComando("italic")}
              onTamanoFuente={aplicarTamanoFuente}
              onVinetas={() => ejecutarComando("insertUnorderedList")}
              onNumerada={() => ejecutarComando("insertOrderedList")}
              onImagen={abrirModalImagen}
            />

            <style jsx>{`
              .editor-revista {
                text-align: justify;
              }
              .editor-revista :global(p) {
                margin: 0;
                text-align: justify !important;
              }
              .editor-revista > :global(div),
              .editor-revista :global(li),
              .editor-revista :global(blockquote) {
                text-align: justify !important;
              }
              .editor-revista :global(p[data-espacio="true"]) {
                min-height: 1.85em;
              }
              .editor-revista :global(ul),
              .editor-revista :global(ol) {
                margin: 0 0 1rem 1.5rem;
              }
              .editor-revista :global(h1),
              .editor-revista :global(h2),
              .editor-revista :global(h3) {
                font-family: "Times New Roman", Times, serif;
                font-weight: 700;
                line-height: 1.35;
                text-align: left !important;
              }
              .editor-revista :global(strong),
              .editor-revista :global(b) {
                font-weight: 700;
              }
              .editor-revista :global(figure) {
                margin-top: 1.5rem !important;
                margin-bottom: 1rem !important;
              }
            `}</style>

            <div
              ref={editorRef}
              className="editor-revista"
              contentEditable
              suppressContentEditableWarning
              onInput={sincronizarEditor}
              onPaste={manejarPegado}
              onMouseUp={guardarRango}
              onKeyUp={guardarRango}
              onBlur={sincronizarEditor}
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: "70vh",
                overflowY: "auto",
                padding: "1rem",
                lineHeight: 1.85,
                border: "1px solid #aaa",
                borderRadius: "0 0 8px 8px",
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "18px",
                background: "white",
                outline: "none",
                whiteSpace: "normal",
                textAlign: "justify",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "0.8rem",
                marginTop: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={procesando}
                onClick={() => guardar("GUARDAR")}
                style={{
                  background: "white",
                  color: "#4d371c",
                  border: "1px solid #b9b0a3",
                  borderRadius: "8px",
                  padding: "0.7rem 1rem",
                  fontWeight: 700,
                }}
              >
                {estadoGuardado === "GUARDANDO"
                  ? "Guardando…"
                  : estadoGuardado === "GUARDADO"
                    ? "Guardado ✓"
                    : "Guardar cambios"}
              </button>

              <span
                aria-live="polite"
                style={{
                  alignSelf: "center",
                  color:
                    estadoGuardado === "ERROR"
                      ? "#a33"
                      : estadoGuardado === "GUARDADO"
                        ? "#356128"
                        : "#746957",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {estadoGuardado === "CAMBIOS" && "Hay cambios sin guardar"}
                {estadoGuardado === "GUARDANDO" && "Guardando el manuscrito…"}
                {estadoGuardado === "GUARDADO" && "Cambios guardados"}
                {estadoGuardado === "ERROR" &&
                  "No se pudo confirmar el guardado"}
              </span>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: "#4d371c", marginBottom: "1rem" }}>
              {manuscrito.titulo_actual}
            </h3>
            <VistaPrevia
              contenido={manuscrito.contenido_actual || ""}
              imagenes={imagenesVersionActual}
            />
          </>
        )}
      </section>
      {/* ===================================================
          ADMINISTRAR IMÁGENES
      =================================================== */}

      {imagenesMostradas.length > 0 && (
        <section
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#4d371c",
            }}
          >
            Imágenes incorporadas
          </h2>

          <p
            style={{
              color: "#666",
              lineHeight: 1.6,
            }}
          >
            Desde aquí puede corregir el título o fuente de cada imagen.
          </p>

          <div
            style={{
              display: "grid",
              gap: "1rem",
            }}
          >
            {imagenesMostradas.map((imagen) => (
              <ImagenEditable
                key={imagen.id}
                imagen={imagen}
                editable={editable}
                procesando={procesando}
                onColocar={colocarImagenEnTexto}
                onGuardar={actualizarImagen}
                onEliminar={eliminarImagen}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===================================================
          REENVÍO
      =================================================== */}

      {editable && (
        <section
          style={{
            background: "#eef6e9",
            border: "1px solid #cfe3c4",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#356128",
            }}
          >
            {manuscrito.estado === "BORRADOR"
              ? manuscrito.flujo_editorial === "SIMPLIFICADO"
                ? "Enviar al Banco de publicables"
                : "Enviar al Consejo Editorial"
              : "Reenviar al Consejo Editorial"}
          </h2>

          <p
            style={{
              lineHeight: 1.7,
              color: "#4d5f44",
            }}
          >
            {manuscrito.estado === "BORRADOR"
              ? manuscrito.flujo_editorial === "SIMPLIFICADO"
                ? "Cuando la publicación esté completa, envíela al Banco de publicables. El texto, la portada y las imágenes quedarán congelados como versión 1."
                : "Cuando la publicación esté completa, envíela para iniciar su revisión. El texto y las imágenes quedarán congelados como versión 1."
              : "Cuando haya atendido las observaciones, envíe la nueva versión. El texto y las imágenes quedarán registrados de forma independiente de la versión anterior."}
          </p>

          <label>
            <strong>Nota para el Consejo Editorial</strong>
          </label>

          <textarea
            value={nota}
            disabled={procesando}
            onChange={(e) => setNota(e.target.value)}
            rows={4}
            placeholder={
              manuscrito.estado === "BORRADOR"
                ? manuscrito.flujo_editorial === "SIMPLIFICADO"
                  ? "Nota opcional para el equipo editorial..."
                  : "Nota opcional para el Consejo Editorial..."
                : "Explique brevemente los ajustes realizados..."
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0.8rem",
              marginTop: "0.5rem",
            }}
          />

          <button
            type="button"
            disabled={procesando}
            onClick={() =>
              guardar(manuscrito.estado === "BORRADOR" ? "ENVIAR" : "REENVIAR")
            }
            style={{
              marginTop: "1rem",
              background: "#356128",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.8rem 1rem",
              fontWeight: 700,
            }}
          >
            {manuscrito.estado === "BORRADOR"
              ? manuscrito.flujo_editorial === "SIMPLIFICADO"
                ? "Enviar al Banco de publicables"
                : "Enviar publicación"
              : "Reenviar nueva versión"}
          </button>
        </section>
      )}

      {/* ===================================================
          VERSIONES
      =================================================== */}

      <section
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#4d371c",
          }}
        >
          Versiones
        </h2>

        {versiones.map((version) => (
          <div
            key={version.id}
            style={{
              borderBottom: "1px solid #eee8de",
              padding: "0.8rem 0",
            }}
          >
            <strong>Versión {version.numero_version}</strong>

            <div
              style={{
                color: "#666",
                marginTop: "0.25rem",
              }}
            >
              {fecha(version.created_at)}
            </div>

            {version.nota_autor && (
              <div
                style={{
                  marginTop: "0.5rem",
                  lineHeight: 1.6,
                }}
              >
                Nota del autor: {version.nota_autor}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ===================================================
          HISTORIAL
      =================================================== */}

      <section
        style={{
          background: "#faf8f2",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#4d371c",
          }}
        >
          Historial editorial
        </h2>

        {eventos.map((evento) => (
          <div
            key={evento.id}
            style={{
              borderBottom: "1px solid #e3ddd2",
              padding: "0.8rem 0",
            }}
          >
            <strong>{eventoTexto(evento.tipo)}</strong>

            <div
              style={{
                color: "#777",
                fontSize: "0.86rem",
                marginTop: "0.2rem",
              }}
            >
              {fecha(evento.created_at)}

              {evento.actor && <> · {evento.actor.nombre}</>}
            </div>

            {evento.mensaje && (
              <div
                style={{
                  marginTop: "0.5rem",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {evento.mensaje}
              </div>
            )}
          </div>
        ))}
      </section>

      <Link
        href="/miembros/revista/mis-manuscritos"
        style={{
          color: "#4d371c",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ← Volver a Mis manuscritos
      </Link>

      {/* ===================================================
          MODAL INSERTAR IMAGEN
      =================================================== */}

      {modalImagen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalImagen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              background: "white",
              borderRadius: "14px",
              padding: "1.5rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#4d371c",
              }}
            >
              Insertar imagen
            </h2>

            <p
              style={{
                color: "#666",
                lineHeight: 1.6,
              }}
            >
              La imagen será incorporada en la posición actual del cursor dentro
              del texto.
            </p>

            <label>
              <strong>Archivo</strong>
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={procesando}
              onChange={(e) => seleccionarImagen(e.target.files?.[0] || null)}
              style={{
                display: "block",
                marginTop: "0.5rem",
              }}
            />

            {tamanoNuevaImagen !== null && (
              <p
                style={{
                  color: "#356128",
                  fontSize: "0.9rem",
                }}
              >
                Imagen optimizada: {(tamanoNuevaImagen / 1024).toFixed(1)} KB
              </p>
            )}

            <label
              style={{
                display: "block",
                marginTop: "1rem",
              }}
            >
              <strong>Título o pie de imagen</strong>
            </label>

            <input
              value={tituloNuevaImagen}
              disabled={procesando}
              onChange={(e) => setTituloNuevaImagen(e.target.value)}
              placeholder="Ej.: Máscara funeraria de jade"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.75rem",
                marginTop: "0.4rem",
              }}
            />

            <label
              style={{
                display: "block",
                marginTop: "1rem",
              }}
            >
              <strong>Fuente</strong>
            </label>

            <input
              value={fuenteNuevaImagen}
              disabled={procesando}
              onChange={(e) => setFuenteNuevaImagen(e.target.value)}
              placeholder="Ej.: Fuente: Fotografía del autor"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.75rem",
                marginTop: "0.4rem",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.8rem",
                marginTop: "1.5rem",
              }}
            >
              <button
                type="button"
                disabled={procesando}
                onClick={() => setModalImagen(false)}
                style={{
                  background: "white",
                  border: "1px solid #aaa",
                  borderRadius: "8px",
                  padding: "0.7rem 1rem",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={procesando || !archivoNuevo}
                onClick={insertarImagen}
                style={{
                  background: "#6b6f1a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.7rem 1rem",
                  fontWeight: 700,
                  opacity: procesando || !archivoNuevo ? 0.65 : 1,
                }}
              >
                Insertar imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BARRA DEL EDITOR
// ============================================================

function BarraEditor({
  onNegrita,
  onItalica,
  onTamanoFuente,
  onVinetas,
  onNumerada,
  onImagen,
}: {
  onNegrita: () => void;
  onItalica: () => void;
  onTamanoFuente: (tamano: string) => void;
  onVinetas: () => void;
  onNumerada: () => void;
  onImagen: () => void;
}) {
  const boton = {
    background: "#f4f1e8",
    border: "1px solid #c8beb0",
    padding: "0.45rem 0.7rem",
    cursor: "pointer",
    minWidth: "38px",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "0.35rem",
        flexWrap: "wrap",
        padding: "0.5rem",
        background: "#eee9df",
        border: "1px solid #aaa",
        borderBottom: "none",
        borderRadius: "8px 8px 0 0",
        position: "sticky",
        top: 0,
        zIndex: 20,
        boxShadow: "0 3px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <button
        type="button"
        style={{
          ...boton,
          fontWeight: 800,
        }}
        onClick={onNegrita}
        title="Negrita"
      >
        B
      </button>

      <button
        type="button"
        style={{
          ...boton,
          fontStyle: "italic",
        }}
        onClick={onItalica}
        title="Itálica"
      >
        I
      </button>

      <select
        defaultValue=""
        onChange={(event) => {
          onTamanoFuente(event.target.value);
          event.currentTarget.value = "";
        }}
        onMouseDown={(event) => event.stopPropagation()}
        title="Tamaño de fuente"
        aria-label="Tamaño de fuente"
        style={{
          ...boton,
          minWidth: "145px",
          borderRadius: "2px",
        }}
      >
        <option value="" disabled>
          Tamaño de fuente
        </option>
        <option value="12px">12 px — pequeño</option>
        <option value="14px">14 px</option>
        <option value="16px">16 px — normal</option>
        <option value="18px">18 px — subtítulo</option>
        <option value="20px">20 px</option>
        <option value="24px">24 px — título</option>
        <option value="28px">28 px</option>
        <option value="32px">32 px — título mayor</option>
      </select>

      <button
        type="button"
        style={boton}
        onClick={onVinetas}
        title="Lista con viñetas"
      >
        • Lista
      </button>

      <button
        type="button"
        style={boton}
        onClick={onNumerada}
        title="Lista numerada"
      >
        1. Lista
      </button>

      <button
        type="button"
        style={{
          ...boton,
          background: "#e8efe2",
          color: "#356128",
          fontWeight: 700,
        }}
        onClick={onImagen}
        title="Insertar imagen"
      >
        🖼 Imagen
      </button>
    </div>
  );
}

// ============================================================
// VISTA PREVIA DEL MANUSCRITO
// ============================================================

function VistaPrevia({
  contenido,
  imagenes,
}: {
  contenido: string;
  imagenes: ImagenManuscrito[];
}) {
  if (esHtmlEnriquecido(contenido)) {
    return (
      <article
        style={{
          background: "white",
          border: "1px solid #e2dbcf",
          borderRadius: "10px",
          padding: "1.5rem",
          color: "#333",
          lineHeight: 1.9,
          textAlign: "justify",
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "18px",
        }}
        dangerouslySetInnerHTML={{
          __html: contenidoAHtml(contenido, imagenes),
        }}
      />
    );
  }

  const mapaImagenes = new Map(imagenes.map((imagen) => [imagen.id, imagen]));

  const lineas = contenido.split("\n");

  const bloques: ReactNode[] = [];

  let listaVinetas: string[] = [];

  let listaNumerada: string[] = [];

  const cerrarListas = () => {
    if (listaVinetas.length > 0) {
      bloques.push(
        <ul
          key={`ul-${bloques.length}`}
          style={{
            lineHeight: 1.8,
          }}
        >
          {listaVinetas.map((linea, index) => (
            <li key={index}>
              <TextoInline texto={linea} />
            </li>
          ))}
        </ul>,
      );

      listaVinetas = [];
    }

    if (listaNumerada.length > 0) {
      bloques.push(
        <ol
          key={`ol-${bloques.length}`}
          style={{
            lineHeight: 1.8,
          }}
        >
          {listaNumerada.map((linea, index) => (
            <li key={index}>
              <TextoInline texto={linea} />
            </li>
          ))}
        </ol>,
      );

      listaNumerada = [];
    }
  };

  lineas.forEach((linea, index) => {
    const imagenMatch = linea.trim().match(/^\[\[IMAGEN:(\d+)\]\]$/);

    if (imagenMatch) {
      cerrarListas();

      const imagen = mapaImagenes.get(Number(imagenMatch[1]));

      if (imagen) {
        bloques.push(
          <figure
            key={`img-${index}`}
            style={{
              margin: "1.5rem auto",
              maxWidth: "760px",
              textAlign: "center",
            }}
          >
            <img
              src={imagen.url}
              alt={imagen.titulo || "Imagen del manuscrito"}
              style={{
                maxWidth: "100%",
                maxHeight: "520px",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />

            {imagen.titulo && (
              <figcaption
                style={{
                  marginTop: "0.65rem",
                  fontWeight: 600,
                  color: "#444",
                }}
              >
                {imagen.titulo}
              </figcaption>
            )}

            {imagen.fuente && (
              <div
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.86rem",
                  color: "#777",
                  fontStyle: "italic",
                }}
              >
                {imagen.fuente}
              </div>
            )}
          </figure>,
        );
      }

      return;
    }

    const vinetas = linea.match(/^-\s+(.+)$/);

    if (vinetas) {
      if (listaNumerada.length > 0) {
        cerrarListas();
      }

      listaVinetas.push(vinetas[1]);

      return;
    }

    const numerada = linea.match(/^\d+\.\s+(.+)$/);

    if (numerada) {
      if (listaVinetas.length > 0) {
        cerrarListas();
      }

      listaNumerada.push(numerada[1]);

      return;
    }

    cerrarListas();

    if (linea.trim() === "[[ESPACIO]]") {
      bloques.push(
        <div key={`espacio-${index}`} style={{ height: "1.85em" }} />,
      );
      return;
    }

    if (linea.trim() === "") {
      return;
    }

    bloques.push(
      <p
        key={`p-${index}`}
        style={{
          lineHeight: 1.9,
          margin: "0 0 1rem 0",
          textAlign: "justify",
        }}
      >
        <TextoInline texto={linea} />
      </p>,
    );
  });

  cerrarListas();

  return (
    <article
      style={{
        background: "white",
        border: "1px solid #e2dbcf",
        borderRadius: "10px",
        padding: "1.5rem",
        color: "#333",
        lineHeight: 1.9,
        textAlign: "justify",
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: "18px",
      }}
    >
      {bloques.length > 0 ? (
        bloques
      ) : (
        <p
          style={{
            color: "#777",
          }}
        >
          No hay contenido para mostrar.
        </p>
      )}
    </article>
  );
}

// ============================================================
// FORMATO INLINE BÁSICO
// ============================================================

function TextoInline({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <>
      {partes.map((parte, index) => {
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={index}>{parte.slice(2, -2)}</strong>;
        }

        if (parte.startsWith("*") && parte.endsWith("*")) {
          return <em key={index}>{parte.slice(1, -1)}</em>;
        }

        return <span key={index}>{parte}</span>;
      })}
    </>
  );
}

// ============================================================
// ADMINISTRACIÓN DE UNA IMAGEN
// ============================================================

function ImagenEditable({
  imagen,
  editable,
  procesando,
  onColocar,
  onGuardar,
  onEliminar,
}: {
  imagen: ImagenManuscrito;
  editable: boolean;
  procesando: boolean;
  onColocar: (imagen: ImagenManuscrito) => Promise<void>;
  onGuardar: (
    imagenId: number,
    titulo: string,
    fuente: string,
  ) => Promise<void>;
  onEliminar: (imagenId: number) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(imagen.titulo || "");

  const [fuente, setFuente] = useState(imagen.fuente || "");

  useEffect(() => {
    setTitulo(imagen.titulo || "");

    setFuente(imagen.fuente || "");
  }, [imagen.titulo, imagen.fuente]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 260px) 1fr",
        gap: "1rem",
        background: "#faf8f2",
        border: "1px solid #e2dbcf",
        borderRadius: "12px",
        padding: "1rem",
      }}
    >
      <img
        src={imagen.url}
        alt={imagen.titulo || "Imagen del manuscrito"}
        style={{
          width: "100%",
          maxHeight: "220px",
          objectFit: "contain",
          borderRadius: "8px",
          background: "white",
        }}
      />

      <div>
        <label>
          <strong>Título o pie</strong>
        </label>

        <input
          value={titulo}
          disabled={!editable || procesando}
          onChange={(e) => setTitulo(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.7rem",
            margin: "0.35rem 0 0.8rem",
          }}
        />

        <label>
          <strong>Fuente</strong>
        </label>

        <input
          value={fuente}
          disabled={!editable || procesando}
          onChange={(e) => setFuente(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.7rem",
            marginTop: "0.35rem",
          }}
        />

        {editable && (
          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              flexWrap: "wrap",
              marginTop: "0.9rem",
            }}
          >
            <button
              type="button"
              disabled={procesando}
              onClick={() => onColocar(imagen)}
              style={{
                background: "#eef6e9",
                color: "#356128",
                border: "1px solid #9fbd91",
                borderRadius: "7px",
                padding: "0.45rem 0.7rem",
                fontWeight: 700,
              }}
            >
              Colocar en el texto
            </button>

            <button
              type="button"
              disabled={procesando}
              onClick={() => onGuardar(imagen.id, titulo.trim(), fuente.trim())}
            >
              Guardar datos
            </button>

            <button
              type="button"
              disabled={procesando}
              onClick={() => onEliminar(imagen.id)}
              style={{
                background: "white",
                color: "#8b2f2f",
                border: "1px solid #d3a0a0",
                borderRadius: "7px",
                padding: "0.45rem 0.7rem",
              }}
            >
              Quitar imagen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}