"use client";

import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean;
};

export default function MiembrosPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    setUser(JSON.parse(stored));
  }, []);

  if (!user) {
    return <p>Cargando...</p>;
  }

  const nombreNivel: Record<string, string> = {
    NUM: "Académico Numerario",
    INV: "Académico Investigador",
    NOV: "Académico Novicio",
    ASP: "Aspirante",
  };

  return (
  <div style={{ maxWidth: "900px" }}>
    <h1>Bienvenido(a) a la Academia</h1>

    <p style={{ lineHeight: 1.8 }}>
      Estimado(a) <strong>{user.nombre}</strong>, le damos la bienvenida a la
      Academia Guatemalteca de Estudios Numismáticos y Notafílicos.
    </p>

    <p style={{ lineHeight: 1.8 }}>
      Su código institucional es <strong>{user.codigo}</strong> y actualmente
      pertenece al nivel de{" "}
      <strong>{nombreNivel[user.nivel] || user.nivel}</strong>.
    </p>

    <div
      style={{
        marginTop: "2rem",
        display: "grid",
        gap: "1.25rem",
      }}
    >
      <div
        style={{
          border: "1px solid #d7cfbf",
          borderRadius: "12px",
          padding: "1.25rem",
          background: "#faf8f3",
        }}
      >
        <h2>📖 Biografía Personal</h2>

        <p>
          Aquí podrá completar o actualizar su información personal,
          modificar su fotografía y mantener actualizado su perfil dentro
          de la Academia.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #d7cfbf",
          borderRadius: "12px",
          padding: "1.25rem",
          background: "#faf8f3",
        }}
      >
        <h2>🏛 AGENN Logo de miembro</h2>

        <p>
          Puede descargar una imagen personalizada con su nombre,
          código y nivel académico para utilizarla en redes sociales
          o como identificación institucional.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #d7cfbf",
          borderRadius: "12px",
          padding: "1.25rem",
          background: "#faf8f3",
        }}
      >
        <h2>🎓 Proceso de formación</h2>

        <p>
          Desde esta sección accederá al proceso académico correspondiente
          a su nivel actual.
        </p>

        {user.nivel === "ASP" && (
          <p>
            Como Aspirante deberá completar el Módulo Introductorio para
            ascender automáticamente al nivel de Académico Novicio.
          </p>
        )}
      </div>
    </div>
  </div>
);
}