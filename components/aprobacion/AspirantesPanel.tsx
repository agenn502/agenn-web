"use client";

export default function AspirantesPanel() {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ddd4c7",
        borderRadius: 12,
        padding: "1rem",
      }}
    >
      <p style={{ margin: 0 }}>
        No hay actividades del Nivel Aspirante pendientes de aprobación. El
        proceso ASP continúa funcionando de forma automática mientras no se
        defina una evaluación que requiera intervención del Consejo Académico.
      </p>
    </div>
  );
}
