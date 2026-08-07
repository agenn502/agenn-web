"use client";

import { useEffect, useRef, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
};

export default function LogoMiembroPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsed = JSON.parse(stored);
    setUser(parsed);
  }, []);

  useEffect(() => {
    if (!user) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/plantillas/logo-miembro-base.png";

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fondo blanco para exportar correctamente a JPG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Imagen base
      ctx.drawImage(img, 0, 0);

      const niveles: Record<string, string> = {
        NUM: "ACADÉMICO NUMERARIO",
        INV: "ACADÉMICO INVESTIGADOR",
        NOV: "ACADÉMICO NOVICIO",
        ASP: "ASPIRANTE",
      };

      const textoNivel = niveles[user.nivel] || user.nivel;

      const nombre =
        user.nombre.length > 32
          ? user.nombre.substring(0, 32) + "..."
          : user.nombre;

      // Mitad derecha del distintivo
      const mitadDerechaX = canvas.width / 2;
      const centroTextoX = mitadDerechaX + canvas.width / 4;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // AGENN
      ctx.fillStyle = "#000000";
      ctx.font = "900 220px 'Libre Baskerville', Georgia, serif";
      ctx.fillText("AGENN", centroTextoX, 210);

      // Nombre del miembro
      ctx.fillStyle = "#000000";
      ctx.font = "700 68px 'Libre Baskerville', Georgia, serif";
      ctx.fillText(nombre, centroTextoX, 330);

      // Código
      ctx.fillStyle = "#000000";
      ctx.font = "900 90px 'Libre Baskerville', Georgia, serif";
      ctx.fillText(user.codigo, centroTextoX, 445);

      // Nivel
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 60px 'Libre Baskerville', Georgia, serif";
      ctx.fillText(textoNivel, centroTextoX, canvas.height - 85);
    };
  }, [user]);

  const descargar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !user) return;

    const link = document.createElement("a");
    link.download = `${user.codigo}-distintivo-agenn.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  if (!user) return <div>Cargando...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px" }}>
      <h1>Distintivo institucional</h1>

      <p style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
        Esta imagen constituye su distintivo personal dentro de la Academia.
        Puede descargarla y utilizarla en sus redes sociales o en actividades
        relacionadas con la AGENN.
      </p>

      <p style={{ marginBottom: "1.5rem", lineHeight: 1.7 }}>
        El distintivo muestra su nombre, código institucional y nivel académico
        actual. Cuando avance dentro del proceso formativo, podrá generar una
        nueva versión con su categoría actualizada.
      </p>

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxWidth: "900px",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          display: "block",
          background: "white",
        }}
      />

      <div style={{ marginTop: "1.25rem" }}>
        <button
          onClick={descargar}
          style={{
            background: "#6b6f1a",
            color: "white",
            padding: "0.8rem 1.2rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Descargar distintivo JPG
        </button>
      </div>
    </div>
  );
}