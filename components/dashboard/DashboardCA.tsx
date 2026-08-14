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

export default function DashboardCA() {
  const [user, setUser] = useState<User | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [pendientes, setPendientes] = useState(0);
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

        const [directorioResponse, pendientesResponse] = await Promise.all([
          fetch("/api/directorio", {
            headers: {
              "x-user-codigo": parsed.codigo,
            },
            cache: "no-store",
          }),

          fetch("/api/aprobacion/pendientes", {
            headers: {
              "x-user-codigo": parsed.codigo,
            },
            cache: "no-store",
          }),
        ]);

        const directorioResult = await directorioResponse.json();
        const pendientesResult = await pendientesResponse.json();

        if (!directorioResponse.ok || !directorioResult.ok) {
          throw new Error(
            directorioResult.error ||
              "No fue posible cargar la información de la Academia."
          );
        }

        setMiembros(directorioResult.miembros || []);

        if (pendientesResponse.ok && pendientesResult.ok) {
          setPendientes(Number(pendientesResult.total || 0));
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el panel del Consejo Académico."
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  if (loading) {
    return <div>Cargando panel del Consejo Académico...</div>;
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  const aspirantes = miembros.filter((m) => m.nivel === "ASP").length;
  const novicios = miembros.filter((m) => m.nivel === "NOV").length;
  const investigadores = miembros.filter((m) => m.nivel === "INV").length;
  const numerarios = miembros.filter((m) => m.nivel === "NUM").length;
  const total = miembros.length;

  return (
    <div style={{ maxWidth: "980px" }}>
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
        Consejo Académico
      </p>

      <h1 style={{ marginTop: 0 }}>Panel del Consejo Académico</h1>

      <p style={{ lineHeight: 1.8 }}>
        Bienvenido(a), <strong>{user.nombre}</strong>. Desde este panel puede
        consultar el estado general de la Academia y acceder a los procesos que
        requieren atención del Consejo Académico.
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
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <div
          style={{
            background: pendientes > 0 ? "#fff8e5" : "white",
            border:
              pendientes > 0
                ? "1px solid #dfc46b"
                : "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.4rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.4rem",
              color: "#666",
            }}
          >
            Pendientes de revisión
          </p>

          <strong
            style={{
              fontSize: "2.5rem",
              color: pendientes > 0 ? "#8a6800" : "#6b6f1a",
            }}
          >
            {pendientes}
          </strong>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.6,
              color: "#555",
            }}
          >
            {pendientes > 0
              ? "Existen solicitudes o procesos pendientes de atención."
              : "No existen pendientes de aprobación en este momento."}
          </p>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.4rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.4rem",
              color: "#666",
            }}
          >
            Total de miembros
          </p>

          <strong
            style={{
              fontSize: "2.5rem",
              color: "#6b6f1a",
            }}
          >
            {total}
          </strong>
        </div>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Composición de la Academia</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          ["Aspirantes", aspirantes],
          ["Novicios", novicios],
          ["Investigadores", investigadores],
          ["Numerarios", numerarios],
        ].map(([titulo, cantidad]) => (
          <div
            key={String(titulo)}
            style={{
              background: "#faf8f3",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1.1rem",
            }}
          >
            <p
              style={{
                margin: "0 0 0.4rem",
                color: "#666",
              }}
            >
              {titulo}
            </p>

            <strong
              style={{
                fontSize: "1.7rem",
                color: "#6b6f1a",
              }}
            >
              {cantidad}
            </strong>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: "2rem" }}>Accesos del Consejo</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.25rem",
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
          <h3 style={{ marginTop: 0 }}>📋 Proceso de aprobación</h3>

          <p style={{ lineHeight: 1.7 }}>
            Revise solicitudes de ingreso y otros procesos que requieren
            resolución del Consejo Académico.
          </p>

          <Link
            href="/miembros/proceso-aprobacion"
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
            Revisar pendientes
            {pendientes > 0 ? ` (${pendientes})` : ""}
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
          <h3 style={{ marginTop: 0 }}>👥 Directorio académico</h3>

          <p style={{ lineHeight: 1.7 }}>
            Consulte la composición completa de la Academia y el avance
            académico de los miembros en formación.
          </p>

          <Link
            href="/miembros/directorio"
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
          <h3 style={{ marginTop: 0 }}>🎓 Procesos de formación</h3>

          <p style={{ lineHeight: 1.7 }}>
            Acceda a los procesos ASP, NOV e INV en modo Consejo Académico para
            revisar contenidos y funcionamiento.
          </p>

          <Link
            href="/miembros/proceso_asp"
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
            Ver procesos
          </Link>
        </div>
      </div>
    </div>
  );
}