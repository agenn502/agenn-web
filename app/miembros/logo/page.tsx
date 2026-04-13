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
      // 🔹 Fondo blanco (IMPORTANTE para JPG)
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 🔹 Imagen base
		ctx.drawImage(img, 0, 0);

      const niveles: Record<string, string> = {
        NUM: "ACADÉMICO NUMERARIO",
        INV: "ACADÉMICO INVESTIGADOR",
        NOV: "ACADÉMICO NOVICIO",
        ASP: "ASPIRANTE",
      };

      const textoNivel = niveles[user.nivel] || user.nivel;

      // Mitad derecha del logo
      const mitadDerechaX = canvas.width / 2;
      const centroTextoX = mitadDerechaX + canvas.width / 4;

      // AGENN
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.font = "900 220px Libre Baskerville, serif";
      ctx.fillText("AGENN", centroTextoX, 210);

      // Código
      ctx.font = "900 90px Libre Baskerville, serif";
      ctx.fillText(user.codigo, centroTextoX, 410);

      // Nivel
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 60px Libre Baskerville, serif";
      ctx.fillText(textoNivel, centroTextoX, canvas.height - 85);
    };
  }, [user]);

  const descargar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "agenn-logo-miembro.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  if (!user) return <div>Cargando...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>AGENN Logo de miembro</h1>

      <p style={{ marginBottom: "1rem", lineHeight: 1.6 }}>
        Generación automática de identificación institucional del miembro en
        formato JPG.
      </p>

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxWidth: "900px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          display: "block",
        }}
      />

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={descargar}
          style={{
            background: "#6b6f1a",
            color: "white",
            padding: "0.8rem 1.2rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Descargar JPG
        </button>
      </div>
    </div>
  );
}