"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type Miembro = {
  codigo: string;
  nivel: string;
};

export default function DashboardNUM() {
  const [user, setUser] = useState<User | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const stored = localStorage.getItem("user");

        if (!stored) {
          window.location.href = "/login";
          return;
        }

        const parsed = JSON.parse(stored) as User;
        setUser(parsed);

        const response = await fetch("/api/directorio", {
          headers: {
            "x-user-codigo": parsed.codigo,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error || "No fue posible cargar la información de la Academia."
          );
        }

        setMiembros(result.miembros || []);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el panel."
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  if (loading) {
    return <div>Cargando panel institucional...</div>;
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  const aspirantes = miembros.filter((m) => m.nivel === "ASP").length;
  const novicios = miembros.filter((m) => m.nivel === "NOV").length;
  const investigadores = miembros.filter((m) => m.nivel === "INV").length;
  const numerarios = miembros.filter((m) => m.nivel === "NUM").length;
  const total = miembros.length;

  const estadisticas = [
    { nombre: "Aspirantes", cantidad: aspirantes },
    { nombre: "Académicos Novicios", cantidad: novicios },
    { nombre: "Académicos Investigadores", cantidad: investigadores },
    { nombre: "Académicos Numerarios", cantidad: numerarios },
  ];

  return (
    <div style={{ maxWidth: "950px" }}>
      <p
        style={{
          margin: "0 0 0.4rem",
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontSize: "0.82rem",
        }}
      >
        Académico Numerario
      </p>

      <h1 style={{ marginTop: 0 }}>Bienvenido(a) de nuevo</h1>

      <p style={{ lineHeight: 1.8 }}>
        <strong>{user.nombre}</strong>, desde esta sección puede observar el
        crecimiento y composición actual de la Academia.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Código institucional: <strong>{user.codigo}</strong>
      </p>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            background: "#fff3f3",
            border: "1px solid #d8a3a3",
            borderRadius: "10px",
            padding: "1rem",
            color: "#7a1f1f",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: "2rem",
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.4rem",
        }}
      >
        <p
          style={{
            margin: "0 0 0.3rem",
            color: "#666",
            fontSize: "0.9rem",
          }}
        >
          Miembros registrados
        </p>

        <p
          style={{
            margin: 0,
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#6b6f1a",
          }}
        >
          {total}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {estadisticas.map((item) => (
          <div
            key={item.nombre}
            style={{
              background: "#faf8f3",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1.2rem",
            }}
          >
            <p
              style={{
                margin: "0 0 0.4rem",
                color: "#666",
                lineHeight: 1.5,
              }}
            >
              {item.nombre}
            </p>

            <strong
              style={{
                fontSize: "1.8rem",
                color: "#6b6f1a",
              }}
            >
              {item.cantidad}
            </strong>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.25rem",
          marginTop: "1.5rem",
        }}
      >
        <div
          style={{
            background: "#faf8f3",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>👥 Directorio</h2>

          <p style={{ lineHeight: 1.7 }}>
            Consulte los miembros de la Academia y el avance académico de
            Aspirantes, Novicios e Investigadores.
          </p>

          <Link
            href="/miembros/directorio"
            style={{
              display: "inline-block",
              background: "#6b6f1a",
              color: "white",
              padding: "0.7rem 1rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Abrir directorio
          </Link>
        </div>

        <div
          style={{
            background: "#faf8f3",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>🧭 Niveles de la Academia</h2>

          <p style={{ lineHeight: 1.7 }}>
            Consulte la estructura académica, los procesos de formación y las
            acreditaciones institucionales de la AGENN.
          </p>

          <Link
            href="/miembros/niveles"
            style={{
              display: "inline-block",
              border: "1px solid #6b6f1a",
              color: "#6b6f1a",
              padding: "0.7rem 1rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Ver niveles
          </Link>
        </div>
      </div>
    </div>
  );
}