"use client";

import Link from "next/link";

 type PerfilFinalProps = {
  codigo: string;
  nombre: string;
  href: string;
  texto: string;
  modoAdmision: boolean;
};

export default function PerfilFinal({
  codigo,
  nombre,
  href,
  texto,
  modoAdmision,
}: PerfilFinalProps) {
  if (!modoAdmision) {
    return (
      <Link
        href={href}
        style={{
          display: "block",
          background: "#fffdf7",
          border: "1px solid #ddd4c7",
          borderLeft: "6px solid #b08a3c",
          borderRadius: "8px",
          padding: "10px 12px",
          lineHeight: 1.6,
          textDecoration: "none",
          color: "#1f1f1f",
        }}
      >
        {texto} →{" "}
        <strong>
          <em>Perfil {codigo}:</em> {nombre}
        </strong>
      </Link>
    );
  }

  const solicitudHref = `/solicitud?perfil=${encodeURIComponent(
    codigo
  )}&nombre=${encodeURIComponent(nombre)}`;

  return (
    <div
      style={{
        background: "#fffdf7",
        border: "1px solid #ddd4c7",
        borderLeft: "6px solid #b08a3c",
        borderRadius: "10px",
        padding: "1rem",
      }}
    >
      <p style={{ marginTop: 0, lineHeight: 1.7 }}>
        {texto} →{" "}
        <strong>
          <em>Perfil {codigo}:</em> {nombre}
        </strong>
      </p>

      <div
        style={{
          background: "#eef6e9",
          border: "1px solid #cfe3c4",
          borderRadius: "8px",
          padding: "0.85rem",
          marginTop: "0.85rem",
        }}
      >
        <strong>Perfil identificado</strong>
        <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
          Puede consultar la descripción completa del perfil o continuar con su
          solicitud de ingreso a la Academia.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        <Link href={href} className="button secondary">
          Ver descripción del perfil
        </Link>

        <Link href={solicitudHref} className="button primary">
          Continuar con el proceso de admisión
        </Link>
      </div>
    </div>
  );
}
