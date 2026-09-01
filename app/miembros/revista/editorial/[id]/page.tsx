"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
};

type Manuscrito = {
  id: number;
  ensayo_id: number;
  autor_miembro_id: number;
  origen: string;
  tipo_contenido: string;
  estado: string;
  titulo_actual: string;
  contenido_actual: string;
  imagen_url_actual: string | null;
  fuente_imagen_actual: string | null;
  tema: string | null;
  fecha_ingreso: string;
  fecha_aval: string | null;
  avalado_por: number | null;
  autor: Autor | null;
};

type ImagenManuscrito = {
  id: number;
  version_id: number | null;
  url: string;
  titulo: string | null;
  fuente: string | null;
  orden: number | null;
};

type Version = {
  id: number;
  numero_version: number;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  fuente_imagen: string | null;
  enviado_por: number | null;
  nota_autor: string | null;
  created_at: string;
};

type Evento = {
  id: number;
  version_id: number | null;
  tipo: string;
  mensaje: string | null;
  actor_miembro_id: number | null;
  created_at: string;

  actor: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
};

type CE = {
  miembro_id: number;
  codigo: string;
  nombre: string;
  rol: string;
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

function fecha(valor: string | null) {
  if (!valor) return "—";

  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function estadoTexto(estado: string) {
  const nombres: Record<string, string> = {
    CANDIDATO: "Candidato",
    EN_REVISION: "En revisión",
    CORRECCIONES: "Correcciones solicitadas",
    REENVIADO: "Reenviado",
    AVALADO: "Avalado",
    ASIGNADO: "Asignado a revista",
    PUBLICADO: "Publicado",
    DESCARTADO: "No seleccionado",
  };

  return nombres[estado] || estado;
}

function eventoTexto(tipo: string) {
  const nombres: Record<string, string> = {
    INGRESO: "Ingreso al banco editorial",
    SELECCION: "Seleccionado para revisión",
    ENVIO: "Envío del autor",
    CORRECCIONES_SOLICITADAS: "Correcciones solicitadas",
    REENVIO: "Nueva versión enviada",
    AVAL: "Aval editorial",
    DESCARTE: "No seleccionado",
    ASIGNACION_REVISTA: "Asignado a un número",
    PUBLICACION: "Publicado",
    EDICION_EDITORIAL: "Edición editorial",
  };

  return nombres[tipo] || tipo;
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineAHtml(texto: string) {
  return escaparHtml(texto)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

const PREFIJO_HTML_ENRIQUECIDO = "<!--AGENN_RICH_HTML_V1-->";

function esHtmlEnriquecido(contenido: string) {
  return contenido.trimStart().startsWith(PREFIJO_HTML_ENRIQUECIDO);
}

function htmlFigura(imagen: ImagenManuscrito) {
  const titulo = imagen.titulo
    ? `<figcaption style="display:block;margin-top:12px;font-weight:700;color:#333;line-height:1.45"><strong>${escaparHtml(imagen.titulo)}</strong></figcaption>`
    : "";
  const fuente = imagen.fuente
    ? `<div style="display:block;margin-top:7px;font-size:.86rem;color:#777;font-style:italic;line-height:1.45"><em>${escaparHtml(imagen.fuente)}</em></div>`
    : "";

  return `<figure data-imagen-id="${imagen.id}" contenteditable="false" style="margin:24px auto 30px auto;text-align:center;max-width:760px"><img src="${escaparHtml(imagen.url)}" alt="${escaparHtml(imagen.titulo || "Imagen del manuscrito")}" style="display:block;margin:0 auto;max-width:100%;max-height:520px;object-fit:contain;border-radius:8px" />${titulo}${fuente}</figure><p><br></p>`;
}

function limpiarHtmlEnriquecido(editor: HTMLElement) {
  const copia = editor.cloneNode(true) as HTMLElement;

  copia.querySelectorAll<HTMLElement>("[data-imagen-id]").forEach((figura) => {
    const id = Number(figura.dataset.imagenId);
    if (!Number.isFinite(id)) {
      figura.remove();
      return;
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

  return copia.innerHTML.trim();
}

function contenidoAHtml(contenido: string, imagenes: ImagenManuscrito[]) {
  const imagenPorId = new Map(imagenes.map((img) => [Number(img.id), img]));

  if (esHtmlEnriquecido(contenido)) {
    const plantilla = document.createElement("template");
    plantilla.innerHTML = contenido
      .trimStart()
      .slice(PREFIJO_HTML_ENRIQUECIDO.length);

    plantilla.content
      .querySelectorAll<HTMLElement>("[data-agenn-imagen-id]")
      .forEach((marcador) => {
        const imagen = imagenPorId.get(Number(marcador.dataset.agennImagenId));
        if (!imagen) {
          marcador.remove();
          return;
        }

        const contenedor = document.createElement("div");
        contenedor.innerHTML = htmlFigura(imagen);
        marcador.replaceWith(...Array.from(contenedor.childNodes));
      });

    return plantilla.innerHTML;
  }

  const lineas = contenido.split(/\r?\n/);
  const salida: string[] = [];
  let lista: "ul" | "ol" | null = null;

  const cerrarLista = () => {
    if (lista) {
      salida.push(`</${lista}>`);
      lista = null;
    }
  };

  for (const linea of lineas) {
    const limpia = linea.trim();

    if (!limpia) {
      cerrarLista();
      continue;
    }

    if (limpia === "[[ESPACIO]]") {
      cerrarLista();
      salida.push('<div style="height:1rem"></div>');
      continue;
    }

    const imagenMatch = limpia.match(/^\[\[IMAGEN:(\d+)\]\]$/);

    if (imagenMatch) {
      cerrarLista();
      const imagen = imagenPorId.get(Number(imagenMatch[1]));

      if (imagen) {
        salida.push(htmlFigura(imagen));
      }
      continue;
    }

    const bullet = limpia.match(/^-\s+(.+)$/);
    if (bullet) {
      if (lista !== "ul") {
        cerrarLista();
        salida.push("<ul>");
        lista = "ul";
      }
      salida.push(`<li>${inlineAHtml(bullet[1])}</li>`);
      continue;
    }

    const numero = limpia.match(/^\d+\.\s+(.+)$/);
    if (numero) {
      if (lista !== "ol") {
        cerrarLista();
        salida.push("<ol>");
        lista = "ol";
      }
      salida.push(`<li>${inlineAHtml(numero[1])}</li>`);
      continue;
    }

    cerrarLista();
    salida.push(`<p>${inlineAHtml(limpia)}</p>`);
  }

  cerrarLista();
  return salida.join("");
}

function contenidoAHtmlParaVista(
  contenido: string,
  imagenes: ImagenManuscrito[],
) {
  const plantilla = document.createElement("template");
  plantilla.innerHTML = contenidoAHtml(contenido, imagenes);

  plantilla.content.querySelectorAll("figure").forEach((figura) => {
    let siguiente = figura.nextElementSibling;

    while (
      siguiente &&
      /^(P|H[1-6]|DIV)$/.test(siguiente.tagName) &&
      !siguiente.hasAttribute("data-espacio") &&
      !(siguiente.textContent || "").replace(/\u00a0/g, " ").trim() &&
      !siguiente.querySelector("img,figure,table,ul,ol")
    ) {
      const eliminar = siguiente;
      siguiente = siguiente.nextElementSibling;
      eliminar.remove();
    }
  });

  return plantilla.innerHTML;
}

function editorAContenido(editor: HTMLElement) {
  return `${PREFIJO_HTML_ENRIQUECIDO}${limpiarHtmlEnriquecido(editor)}`;
}

export default function RevisarManuscritoPage() {
  const params = useParams();

  const id = String(params.id || "");

  const [manuscrito, setManuscrito] = useState<Manuscrito | null>(null);

  const [versiones, setVersiones] = useState<Version[]>([]);

  const [eventos, setEventos] = useState<Evento[]>([]);

  const [imagenes, setImagenes] = useState<ImagenManuscrito[]>([]);

  const [ce, setCe] = useState<CE | null>(null);

  const [loading, setLoading] = useState(true);

  const [procesando, setProcesando] = useState(false);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [editandoEditorial, setEditandoEditorial] = useState(false);
  const [tituloEditorial, setTituloEditorial] = useState("");
  const [notaEditorial, setNotaEditorial] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const cargar = useCallback(async () => {
    const codigo = codigoLocal();

    if (!codigo) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/revista/editorial/${id}`, {
        headers: {
          "x-user-codigo": codigo,
        },
        cache: "no-store",
      });

      const texto = await response.text();

      let result: any;

      try {
        result = texto ? JSON.parse(texto) : null;
      } catch {
        throw new Error(
          `La API devolvió una respuesta no válida (${response.status}).`,
        );
      }

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible cargar el manuscrito.",
        );
      }

      setManuscrito(result.manuscrito);
      setVersiones(result.versiones || []);
      setEventos(result.eventos || []);
      setImagenes(result.imagenes || []);
      setCe(result.consejo_editorial);
      setTituloEditorial(result.manuscrito?.titulo_actual || "");
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

  const ejecutar = async (accion: string, requiereMensaje = false) => {
    if (requiereMensaje && !mensaje.trim()) {
      setError("Debe escribir las observaciones o el motivo de la decisión.");
      return;
    }

    const preguntas: Record<string, string> = {
      SELECCIONAR:
        "¿Desea seleccionar este manuscrito para iniciar su revisión editorial?",
      CORRECCIONES:
        "¿Enviar estas observaciones al autor y solicitar una nueva versión?",
      AVALAR: "¿Otorgar aval editorial a esta versión del manuscrito?",
      DESCARTAR:
        "¿Confirmar que este manuscrito no continuará en el proceso editorial?",
    };

    if (!confirm(preguntas[accion] || "¿Confirmar esta acción?")) {
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const response = await fetch(`/api/revista/editorial/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({
          accion,
          mensaje: mensaje.trim(),
        }),
      });

      const texto = await response.text();

      let result: any;

      try {
        result = texto ? JSON.parse(texto) : null;
      } catch {
        throw new Error(
          `La API devolvió una respuesta no válida (${response.status}).`,
        );
      }

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible registrar la decisión.",
        );
      }

      setMensaje("");
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la decisión.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const iniciarEdicionEditorial = () => {
    if (!manuscrito) return;
    setTituloEditorial(manuscrito.titulo_actual || "");
    setNotaEditorial("");
    setEditandoEditorial(true);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = contenidoAHtml(
          manuscrito.contenido_actual || "",
          imagenes,
        ).replace(
          /<figure[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/figure>/g,
          (figura) => figura,
        );

        // Reemplazar las figuras por bloques identificables para preservar su posición.
        const figuras = editorRef.current.querySelectorAll("figure");
        figuras.forEach((figura) => {
          const img = figura.querySelector("img");
          if (!img) return;
          const encontrada = imagenes.find(
            (x) => x.url === img.getAttribute("src"),
          );
          if (encontrada) {
            (figura as HTMLElement).dataset.imagenId = String(encontrada.id);
            (figura as HTMLElement).contentEditable = "false";
          }
        });
      }
    }, 0);
  };

  const formato = (
    comando: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList",
  ) => {
    document.execCommand(comando, false);
    editorRef.current?.focus();
  };

  const guardarEdicionEditorial = async () => {
    if (!manuscrito || !editorRef.current) return;

    const contenido = editorAContenido(editorRef.current);

    if (!tituloEditorial.trim() || !contenido.trim()) {
      setError("La edición editorial debe conservar título y contenido.");
      return;
    }

    if (!confirm("¿Guardar estos ajustes como una nueva versión editorial?"))
      return;

    setProcesando(true);
    setError("");

    try {
      const response = await fetch(`/api/revista/editorial/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({
          accion: "EDICION_EDITORIAL",
          titulo: tituloEditorial.trim(),
          contenido,
          nota_editorial: notaEditorial.trim(),
        }),
      });

      const texto = await response.text();
      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible guardar la edición editorial.",
        );
      }

      setEditandoEditorial(false);
      setNotaEditorial("");
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la edición editorial.",
      );
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return <p>Cargando manuscrito...</p>;
  }

  if (!manuscrito) {
    return (
      <div>
        <h1>Revisión editorial</h1>
        <p>{error || "Manuscrito no encontrado."}</p>

        <Link href="/miembros/revista/editorial">
          ← Volver a Gestión editorial
        </Link>
      </div>
    );
  }

  const puedeSeleccionar = manuscrito.estado === "CANDIDATO";

  const puedeDecidir =
    manuscrito.estado === "EN_REVISION" || manuscrito.estado === "REENVIADO";

  const puedeReabrir = manuscrito.estado === "AVALADO";

  const puedeDescartar = ![
    "AVALADO",
    "ASIGNADO",
    "PUBLICADO",
    "DESCARTADO",
  ].includes(manuscrito.estado);

  return (
    <div style={{ maxWidth: "1050px" }}>
      <p
        style={{
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
        }}
      >
        Revista AGENN · Consejo Editorial
      </p>

      <h1 style={{ color: "#4d371c" }}>{manuscrito.titulo_actual}</h1>

      <div
        style={{
          background: "#f4f1e8",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1rem",
          lineHeight: 1.8,
          marginBottom: "1.5rem",
        }}
      >
        <strong>{manuscrito.autor?.nombre}</strong>
        <br />
        {manuscrito.autor?.codigo} · {manuscrito.autor?.nivel}
        <br />
        {manuscrito.tipo_contenido} ·{" "}
        {manuscrito.origen === "FORMACION" ? "Origen formativo" : "Envío libre"}
        <br />
        Estado: <strong>{estadoTexto(manuscrito.estado)}</strong>
        <br />
        Versión actual: <strong>{versiones[0]?.numero_version || "—"}</strong>
      </div>

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

      <section
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ color: "#4d371c", marginTop: 0 }}>
            {editandoEditorial ? "Edición editorial" : "Manuscrito"}
          </h2>

          {!editandoEditorial &&
            [
              "EN_REVISION",
              "REENVIADO",
              "AVALADO",
              "ASIGNADO",
              "PUBLICADO",
            ].includes(manuscrito.estado) && (
              <button
                type="button"
                onClick={iniciarEdicionEditorial}
                style={botonEditorial}
              >
                Editar manuscrito
              </button>
            )}
        </div>

        {editandoEditorial ? (
          <>
            <div
              style={{
                background: "#fff8d9",
                border: "1px solid #dfc96d",
                borderRadius: "10px",
                padding: "0.9rem 1rem",
                marginBottom: "1rem",
                lineHeight: 1.6,
              }}
            >
              Los cambios del Consejo Editorial se guardarán como una nueva
              versión. La versión anterior permanecerá en el historial.
            </div>

            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              Título
            </label>
            <input
              value={tituloEditorial}
              onChange={(e) => setTituloEditorial(e.target.value)}
              disabled={procesando}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.75rem",
                border: "1px solid #aaa",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontFamily: "inherit",
              }}
            />

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
              }}
            >
              <button
                type="button"
                onClick={() => formato("bold")}
                style={botonFormato}
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => formato("italic")}
                style={botonFormato}
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => formato("insertUnorderedList")}
                style={botonFormato}
              >
                • Lista
              </button>
              <button
                type="button"
                onClick={() => formato("insertOrderedList")}
                style={botonFormato}
              >
                1. Lista
              </button>
            </div>

            <div
              ref={editorRef}
              contentEditable={!procesando}
              suppressContentEditableWarning
              className="editor-editorial"
              style={{
                height: "70vh",
                overflowY: "auto",
                border: "1px solid #aaa",
                borderRadius: "0 0 8px 8px",
                padding: "1rem",
                lineHeight: 1.9,
                textAlign: "justify",
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "18px",
                outline: "none",
                marginBottom: "1rem",
              }}
            />

            <style jsx>{`
              .editor-editorial :global(p) {
                margin: 0 0 1rem 0;
              }
              .editor-editorial :global(ul),
              .editor-editorial :global(ol) {
                margin: 0 0 1rem 1.5rem;
              }
              .editor-editorial :global(figure) {
                margin: 1.5rem 0 !important;
                text-align: center;
              }
            `}</style>

            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              Nota del ajuste editorial
            </label>
            <textarea
              value={notaEditorial}
              onChange={(e) => setNotaEditorial(e.target.value)}
              disabled={procesando}
              rows={4}
              placeholder="Ej.: Corrección de estilo y ajuste de puntuación previo a publicación."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.8rem",
                border: "1px solid #aaa",
                borderRadius: "8px",
                fontFamily: "inherit",
                marginBottom: "1rem",
              }}
            />

            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={procesando}
                onClick={guardarEdicionEditorial}
                style={botonVerde}
              >
                {procesando ? "Guardando..." : "Guardar como nueva versión"}
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={() => setEditandoEditorial(false)}
                style={botonSecundario}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="vista-manuscrito"
              style={{
                lineHeight: 1.9,
                color: "#333",
                textAlign: "justify",
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "18px",
              }}
              dangerouslySetInnerHTML={{
                __html: contenidoAHtmlParaVista(
                  manuscrito.contenido_actual || "",
                  imagenes,
                ),
              }}
            />

            <style jsx>{`
              .vista-manuscrito :global(p) {
                margin: 0 0 1rem 0;
              }
              .vista-manuscrito :global(p) {
                text-align: justify;
              }
              .vista-manuscrito :global(ul),
              .vista-manuscrito :global(ol) {
                margin: 0 0 1rem 1.5rem;
              }
              .vista-manuscrito :global(figure) {
                margin: 1.5rem auto !important;
                text-align: center;
              }
            `}</style>
          </>
        )}
      </section>

      {/* DECISIÓN EDITORIAL */}

      {manuscrito.estado !== "PUBLICADO" &&
        manuscrito.estado !== "ASIGNADO" &&
        manuscrito.estado !== "DESCARTADO" && (
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
                color: "#356128",
                marginTop: 0,
              }}
            >
              Decisión editorial
            </h2>

            {puedeSeleccionar && (
              <p style={{ lineHeight: 1.7 }}>
                Este trabajo se encuentra en el Banco de candidatos. El Consejo
                Editorial puede seleccionarlo para iniciar formalmente su
                revisión.
              </p>
            )}

            {(puedeDecidir || puedeReabrir) && (
              <>
                <p style={{ lineHeight: 1.7 }}>
                  {puedeReabrir
                    ? "Este manuscrito ya fue avalado. Puede reabrirlo para que el autor prepare una nueva versión. El aval anterior quedará revocado, pero permanecerá documentado en el historial."
                    : "Escriba observaciones cuando corresponda. Estas formarán parte del historial editorial y, en caso de solicitar correcciones, serán comunicadas al autor."}
                </p>

                <textarea
                  value={mensaje}
                  disabled={procesando}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={6}
                  placeholder="Observaciones del Consejo Editorial..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.8rem",
                    border: "1px solid #aaa",
                    borderRadius: "8px",
                    fontFamily: "inherit",
                    marginBottom: "1rem",
                  }}
                />
              </>
            )}

            {puedeSeleccionar && (
              <button
                type="button"
                disabled={procesando}
                onClick={() => ejecutar("SELECCIONAR")}
                style={botonVerde}
              >
                Seleccionar para revisión
              </button>
            )}

            {puedeDecidir && (
              <div
                style={{
                  display: "flex",
                  gap: "0.8rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => ejecutar("CORRECCIONES", true)}
                  style={botonAmarillo}
                >
                  Solicitar correcciones
                </button>

                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => ejecutar("AVALAR")}
                  style={botonVerde}
                >
                  Otorgar aval
                </button>
              </div>
            )}

            {puedeReabrir && (
              <button
                type="button"
                disabled={procesando}
                onClick={() => ejecutar("CORRECCIONES", true)}
                style={botonAmarillo}
              >
                Reabrir para correcciones
              </button>
            )}

            {puedeDescartar && (
              <div
                style={{
                  marginTop: "1rem",
                }}
              >
                {!puedeDecidir && (
                  <textarea
                    value={mensaje}
                    disabled={procesando}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={4}
                    placeholder="Motivo para no seleccionar el manuscrito..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.8rem",
                      marginBottom: "0.8rem",
                    }}
                  />
                )}

                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => ejecutar("DESCARTAR", true)}
                  style={botonRojo}
                >
                  No seleccionar
                </button>
              </div>
            )}
          </section>
        )}

      {/* VERSIONES */}

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
                }}
              >
                Nota del autor: {version.nota_autor}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* HISTORIAL */}

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

        {eventos.length === 0 ? (
          <p>No existen eventos registrados.</p>
        ) : (
          eventos.map((evento) => (
            <div
              key={evento.id}
              style={{
                padding: "0.9rem 0",
                borderBottom: "1px solid #e5ded3",
              }}
            >
              <strong>{eventoTexto(evento.tipo)}</strong>

              <div
                style={{
                  color: "#777",
                  fontSize: "0.87rem",
                  marginTop: "0.2rem",
                }}
              >
                {fecha(evento.created_at)}

                {evento.actor && (
                  <>
                    {" "}
                    · {evento.actor.nombre} ({evento.actor.codigo})
                  </>
                )}
              </div>

              {evento.mensaje && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    lineHeight: 1.7,
                  }}
                >
                  {evento.mensaje}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <Link
        href="/miembros/revista/editorial"
        style={{
          color: "#4d371c",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ← Volver a Gestión editorial
      </Link>
    </div>
  );
}

const botonVerde: React.CSSProperties = {
  background: "#356128",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const botonAmarillo: React.CSSProperties = {
  background: "#d9a928",
  color: "#332600",
  border: "none",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const botonRojo: React.CSSProperties = {
  background: "white",
  color: "#8b2f2f",
  border: "1px solid #d3a0a0",
  borderRadius: "8px",
  padding: "0.7rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const botonEditorial: React.CSSProperties = {
  background: "#4d371c",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "0.7rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const botonFormato: React.CSSProperties = {
  minWidth: "38px",
  border: "1px solid #b8ad9c",
  background: "white",
  borderRadius: "6px",
  padding: "0.45rem 0.65rem",
  cursor: "pointer",
};

const botonSecundario: React.CSSProperties = {
  background: "white",
  color: "#4d371c",
  border: "1px solid #b8ad9c",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};
