"use client";

import { useState } from "react";

export default function CompartirArticulo({
  titulo,
  url,
}: {
  titulo: string;
  url?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const direccion =
    url ||
    (typeof window !== "undefined"
      ? window.location.href
      : "");

  const texto = encodeURIComponent(titulo);
  const enlace = encodeURIComponent(direccion);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(direccion);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  };

  const compartirNativo = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: titulo,
        text: titulo,
        url: direccion,
      });
    } catch {
      // El usuario puede cancelar el diálogo sin que sea un error.
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        flexWrap: "wrap",
        marginTop: "1.25rem",
      }}
    >
      <strong
        style={{
          color: "#4d371c",
          marginRight: "0.2rem",
          fontSize: "0.9rem",
        }}
      >
        Compartir:
      </strong>

      <Red
        href={`https://www.facebook.com/sharer/sharer.php?u=${enlace}`}
      >
        Facebook
      </Red>

      <Red
        href={`https://twitter.com/intent/tweet?text=${texto}&url=${enlace}`}
      >
        X
      </Red>

      <Red
        href={`https://wa.me/?text=${texto}%20${enlace}`}
      >
        WhatsApp
      </Red>

      <Red
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${enlace}`}
      >
        LinkedIn
      </Red>

      <button type="button" onClick={copiar} style={boton}>
        {copiado ? "¡Copiado!" : "Copiar enlace"}
      </button>

      {typeof navigator !== "undefined" && "share" in navigator && (
        <button type="button" onClick={compartirNativo} style={boton}>
          Compartir…
        </button>
      )}
    </div>
  );
}

function Red({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={boton}
    >
      {children}
    </a>
  );
}

const boton: React.CSSProperties = {
  display: "inline-block",
  border: "1px solid #c8bca9",
  background: "#fffdf8",
  color: "#4d371c",
  borderRadius: "999px",
  padding: "0.4rem 0.7rem",
  fontFamily: "inherit",
  fontSize: "0.82rem",
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};
