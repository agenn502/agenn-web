"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  titulo: string;
  codigoVerificacion: string;
  urlCanonica: string;
  volverHref: string;
  volverTexto: string;
};

export default function CompartirEnsayo({
  titulo,
  codigoVerificacion,
  urlCanonica,
  volverHref,
  volverTexto,
}: Props) {
  const [copiado, setCopiado] = useState(false);

  const textoCompartir = `${titulo}

Ensayo publicado en AGENN como parte del proceso formativo del Nivel Investigador.

Código de verificación: ${codigoVerificacion}

#NumismáticaGuatemalteca #AGENN

${urlCanonica}`;

  const copiarTexto = async () => {
    await navigator.clipboard.writeText(textoCompartir);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const abrir = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        borderTop: "1px solid #ddd4c7",
        paddingTop: "1.2rem",
      }}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom: "0.5rem",
          fontWeight: 700,
          color: "#4d371c",
        }}
      >
        Compartir este ensayo
      </p>

      <p
        style={{
          marginTop: 0,
          color: "#666",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
      >
        Puede copiar el texto sugerido o compartir directamente el enlace
        público del ensayo.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.7rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={copiarTexto}
          title="Copiar texto para compartir"
          aria-label="Copiar texto para compartir"
          style={{
            minHeight: "44px",
            border: "1px solid #bbb",
            borderRadius: "8px",
            background: "white",
            padding: "0.7rem 0.9rem",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {copiado ? "Texto copiado" : "Copiar texto"}
        </button>

        <button
          type="button"
          title="Compartir en Facebook"
          aria-label="Compartir en Facebook"
          onClick={() =>
            abrir(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                urlCanonica
              )}`
            )
          }
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "#1877F2",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v9h4v-9h3.5l.5-4h-4V9c0-.7.3-1 1-1z" />
          </svg>
        </button>

        <button
          type="button"
          title="Compartir en X"
          aria-label="Compartir en X"
          onClick={() =>
            abrir(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                urlCanonica
              )}&text=${encodeURIComponent(titulo)}`
            )
          }
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "#000",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
          </svg>
        </button>

        <button
          type="button"
          title="Compartir en LinkedIn"
          aria-label="Compartir en LinkedIn"
          onClick={() =>
            abrir(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                urlCanonica
              )}`
            )
          }
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "#0A66C2",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.34 3.5A2.34 2.34 0 1 1 5.34 8.18 2.34 2.34 0 0 1 5.34 3.5ZM3.3 9.7h4.08V22H3.3V9.7Zm6.62 0h3.91v1.68h.06c.54-1.03 1.87-2.12 3.85-2.12 4.12 0 4.88 2.71 4.88 6.23V22h-4.08v-5.77c0-1.38-.03-3.15-1.92-3.15-1.92 0-2.22 1.5-2.22 3.05V22H9.92V9.7Z" />
          </svg>
        </button>

        <button
          type="button"
          title="Compartir en Reddit"
          aria-label="Compartir en Reddit"
          onClick={() =>
            abrir(
              `https://www.reddit.com/submit?url=${encodeURIComponent(
                urlCanonica
              )}&title=${encodeURIComponent(titulo)}`
            )
          }
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "#FF4500",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 12.1c.1-.3.2-.6.2-.9a2 2 0 1 0-3.4 1.4c-1.4-.9-3.2-1.5-5.2-1.6l1-4.5 3.1.7a1.7 1.7 0 1 0 .3-1.2l-3.8-.8c-.3-.1-.6.1-.7.5L10.9 11c-2 .1-3.8.7-5.2 1.6a2 2 0 1 0-3.4-1.4c0 .3.1.6.2.9C1.5 13 1 14 1 15.1 1 18 5.9 20.4 12 20.4S23 18 23 15.1c0-1.1-.5-2.1-1.5-3ZM7.6 14.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm7.8 4.1c-.9.9-2.1 1.3-3.4 1.3s-2.5-.4-3.4-1.3a.6.6 0 0 1 .8-.9c.7.6 1.6 1 2.6 1s1.9-.4 2.6-1a.6.6 0 1 1 .8.9Zm1-1.3a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />
          </svg>
        </button>

        <button
          type="button"
          title="Copiar enlace y abrir Instagram"
          aria-label="Copiar enlace y abrir Instagram"
          onClick={async () => {
            await navigator.clipboard.writeText(urlCanonica);
            abrir("https://www.instagram.com/");
          }}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background:
              "linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle
              cx="17.5"
              cy="6.5"
              r="1"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </button>

        <Link
          href={volverHref}
          style={{
            color: "#4d371c",
            fontWeight: "bold",
            textDecoration: "none",
            marginLeft: "auto",
          }}
        >
          {volverTexto}
        </Link>
      </div>
    </div>
  );
}
