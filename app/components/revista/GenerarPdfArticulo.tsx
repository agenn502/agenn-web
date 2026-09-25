"use client";

export default function GenerarPdfArticulo() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Generar versión PDF del artículo"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        marginTop: "0.9rem",
        padding: "0.65rem 1rem",
        border: "1px solid #496b5a",
        borderRadius: 8,
        background: "#fff",
        color: "#315344",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9V2h9l3 3v4" />
        <path d="M15 2v4h4" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      Generar PDF
    </button>
  );
}
