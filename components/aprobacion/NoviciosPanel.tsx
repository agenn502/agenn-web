"use client";

export default function NoviciosPanel() {
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
        No hay tareas finales del Nivel Novicio pendientes de aprobación. Este
        panel se activará cuando quede definida la actividad final para el
        ascenso de NOV a INV.
      </p>
    </div>
  );
}

