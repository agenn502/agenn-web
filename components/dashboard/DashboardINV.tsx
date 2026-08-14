"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type MiembroDirectorio = {
  codigo: string;
  nombre: string;
  nivel: string;
  avanceAcademico?: number;
};

export default function DashboardINV() {
  const [user, setUser] = useState<User | null>(null);
  const [avance, setAvance] = useState(0);
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
            result.error || "No fue posible cargar el avance académico."
          );
        }

        const miembro = (result.miembros || []).find(
          (item: MiembroDirectorio) =>
            String(item.codigo || "").toUpperCase() ===
            String(parsed.codigo || "").toUpperCase()
        );

        setAvance(Number(miembro?.avanceAcademico || 0));
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
    return <div>Cargando panel académico...</div>;
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  return (
    <div style={{ maxWidth: "900px" }}>
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
        Académico Investigador
      </p>

      <h1 style={{ marginTop: 0 }}>Bienvenido(a) de nuevo</h1>

      <p style={{ lineHeight: 1.8 }}>
        <strong>{user.nombre}</strong>, continúa desarrollando su formación
        académica dentro de la AGENN.
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
        <h2 style={{ marginTop: 0 }}>Avance académico</h2>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "0.65rem",
          }}
        >
          <span>Progreso general del Nivel Investigador</span>

          <strong
            style={{
              fontSize: "1.25rem",
              color: "#6b6f1a",
            }}
          >
            {avance}%
          </strong>
        </div>

        <div
          style={{
            width: "100%",
            height: "14px",
            background: "#e6dfd1",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${avance}%`,
              height: "100%",
              background: "#6b6f1a",
            }}
          />
        </div>

        <p
          style={{
            marginBottom: 0,
            marginTop: "1rem",
            lineHeight: 1.7,
            color: "#555",
          }}
        >
          El Nivel Investigador profundiza en el análisis histórico,
          metodológico e interpretativo de la numismática y la notafilia.
          Al completar satisfactoriamente su proceso obtendrá la acreditación
          correspondiente como Académico Investigador.
        </p>
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
          <h2 style={{ marginTop: 0 }}>🎓 Formación y acreditación</h2>

          <p style={{ lineHeight: 1.7 }}>
            Continúe con las unidades correspondientes a su formación como
            Académico Investigador y consulte el estado de su avance.
          </p>

          <Link
            href="/miembros/proceso_inv"
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
            Continuar mi formación
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
          <h2 style={{ marginTop: 0 }}>📚 Ensayos académicos</h2>

          <p style={{ lineHeight: 1.7 }}>
            Consulte sus trabajos académicos, evidencias y publicaciones
            desarrolladas como parte de su actividad investigativa.
          </p>

          <Link
            href="/miembros/ensayos"
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
            Ver ensayos
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
            Consulte el itinerario de formación y acreditación académica,
            incluyendo los requisitos para la categoría de Académico Numerario.
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
            Ver itinerario académico
          </Link>
        </div>
      </div>
    </div>
  );
}