"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export const PREFIJO_TRABAJO_ENRIQUECIDO =
  "<!--AGENN_RICH_HTML_V1-->";

function escapar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function convertirTextoInicial(valor: string) {
  if (
    valor
      .trimStart()
      .startsWith(PREFIJO_TRABAJO_ENRIQUECIDO)
  ) {
    return valor
      .trimStart()
      .slice(PREFIJO_TRABAJO_ENRIQUECIDO.length);
  }

  return valor
    .split(/\n\s*\n/)
    .map(
      (parrafo) =>
        `<p>${escapar(parrafo).replace(
          /\n/g,
          "<br>"
        )}</p>`
    )
    .join("");
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function EditorTrabajoAcademico({
  value,
  onChange,
  disabled = false,
}: Props) {
  const editorRef =
    useRef<HTMLDivElement | null>(null);

  const [montado, setMontado] =
    useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (
      !editor ||
      document.activeElement === editor
    ) {
      return;
    }

    document.execCommand(
      "defaultParagraphSeparator",
      false,
      "p"
    );

    const html =
      convertirTextoInicial(value);

    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }, [value]);

  const ejecutar = (
    comando: string,
    valor?: string
  ) => {
    if (disabled) return;

    editorRef.current?.focus();

    document.execCommand(
      comando,
      false,
      valor
    );

    const html =
      editorRef.current?.innerHTML || "";

    onChange(
      PREFIJO_TRABAJO_ENRIQUECIDO +
        html
    );
  };

  const boton = (
    texto: string,
    comando: string,
    valor?: string
  ) => (
    <button
      type="button"
      onMouseDown={(event) =>
        event.preventDefault()
      }
      onClick={() =>
        ejecutar(comando, valor)
      }
      style={{
        flex: "1 1 auto",
        padding: "0.55rem 0.75rem",
        border: "1px solid #b9ab94",
        borderRadius: 7,
        background: "#ffffff",
        color: "#4d371c",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </button>
  );

  return (
    <div>
      {!disabled &&
        montado &&
        createPortal(
          <div
            className="barra-editor-flotante"
            style={{
              position: "fixed",
              left: "50%",
              bottom: 12,
              transform:
                "translateX(-50%)",
              width:
                "min(880px, calc(100vw - 24px))",
              maxHeight: "35vh",
              overflowY: "auto",
              zIndex: 100000,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "0.65rem",
              background:
                "rgba(255, 253, 248, 0.98)",
              border:
                "1px solid #d8cfbf",
              borderRadius: 10,
              boxShadow:
                "0 4px 18px rgba(0, 0, 0, 0.22)",
              backdropFilter:
                "blur(4px)",
            }}
          >
            {boton(
              "Texto",
              "formatBlock",
              "p"
            )}

            {boton(
              "Título",
              "formatBlock",
              "h2"
            )}

            {boton(
              "Negrita",
              "bold"
            )}

            {boton(
              "Cursiva",
              "italic"
            )}

            {boton(
              "Viñetas",
              "insertUnorderedList"
            )}

            {boton(
              "Lista numerada",
              "insertOrderedList"
            )}

            {boton(
              "Justificar",
              "justifyFull"
            )}
          </div>,
          document.body
        )}

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={(event) =>
          onChange(
            PREFIJO_TRABAJO_ENRIQUECIDO +
              event.currentTarget.innerHTML
          )
        }
        onPaste={(event) => {
          event.preventDefault();

          document.execCommand(
            "insertText",
            false,
            event.clipboardData.getData(
              "text/plain"
            )
          );
        }}
        data-placeholder="Redacte aquí su trabajo académico..."
        style={{
          minHeight: 430,
          width: "100%",
          padding: "1rem 1rem 7rem",
          border: "1px solid #aaa",
          borderRadius: 8,
          background: disabled
            ? "#f5f5f5"
            : "white",
          fontFamily:
            "Georgia, 'Times New Roman', serif",
          fontSize: 18,
          lineHeight: 1.75,
          textAlign: "justify",
          overflowWrap: "anywhere",
          outline: "none",
        }}
      />

      <style jsx>{`
        div[contenteditable="true"]:empty::before {
          content: attr(
            data-placeholder
          );
          color: #777;
        }

        div[contenteditable] :global(p) {
          margin: 0 0 1em;
          font-size: 18px;
          line-height: 1.75;
          text-align: justify;
        }

        div[contenteditable] :global(div) {
          margin: 0 0 1em;
          font-size: 18px;
          line-height: 1.75;
          text-align: justify;
        }

        div[contenteditable] :global(h2) {
          margin: 1.35em 0 0.65em;
          font-size: 24px;
          line-height: 1.3;
          text-align: left;
        }
      `}</style>
    </div>
  );
}

export function obtenerTextoVisibleTrabajo(
  contenido: string
) {
  if (
    !contenido
      .trimStart()
      .startsWith(
        PREFIJO_TRABAJO_ENRIQUECIDO
      )
  ) {
    return contenido;
  }

  const html = contenido
    .trimStart()
    .slice(
      PREFIJO_TRABAJO_ENRIQUECIDO.length
    );

  if (
    typeof document !== "undefined"
  ) {
    const temporal =
      document.createElement("div");

    temporal.innerHTML = html;

    return temporal.innerText;
  }

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
}