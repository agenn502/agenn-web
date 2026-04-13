"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type MenuItem = {
  label: string;
  href: string;
};

export default function MiembrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsed = JSON.parse(stored);

    const consejoNormalizado =
      parsed.consejo === true ||
      parsed.consejo === "true" ||
      parsed.consejo === "TRUE" ||
      parsed.consejo === 1;

    setUser(parsed);
    setEsConsejo(consejoNormalizado);
  }, []);

  if (!user) {
    return <p style={{ padding: 40 }}>Cargando...</p>;
  }

  const getMenu = (): MenuItem[] => {
    switch (user.nivel) {
      case "NUM": {
        const baseMenu: MenuItem[] = [
          { label: "Directorio", href: "/miembros/directorio" },
          { label: "Biografía personal", href: "/miembros/biografia" },
          { label: "Eventos", href: "/miembros/eventos" },
          { label: "Biblioteca", href: "/miembros/biblioteca" },
          { label: "Documentos oficiales", href: "/miembros/documentos" },
        ];

        if (esConsejo) {
          baseMenu.push({
            label: "Aprobación de miembros",
            href: "/miembros/aprobaciones",
          });
        }

        return baseMenu;
      }

      case "INV":
        return [
          { label: "Directorio", href: "/miembros/directorio" },
          { label: "Biografía personal", href: "/miembros/biografia" },
          { label: "Eventos", href: "/miembros/eventos" },
          { label: "Documentos oficiales", href: "/miembros/documentos" },
          { label: "Proceso de ascenso", href: "/miembros/proceso" },
        ];

      case "NOV":
        return [
          { label: "Directorio", href: "/miembros/directorio" },
          { label: "Biografía personal", href: "/miembros/biografia" },
          { label: "Eventos", href: "/miembros/eventos" },
          { label: "Documentos oficiales", href: "/miembros/documentos" },
          { label: "Proceso de ascenso", href: "/miembros/proceso" },
        ];

      case "ASP":
        return [
          { label: "Biografía personal", href: "/miembros/biografia" },
          { label: "Proceso de ingreso", href: "/miembros/proceso" },
        ];

      default:
        return [];
    }
  };

  const menu = getMenu();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "260px",
          background: "#6f8760",
          color: "white",
          padding: "1.5rem",
          flexShrink: 0,
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Área de miembros</h2>

        <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
          {user.nombre}
          <br />
          {user.codigo}
        </p>

        <p style={{ fontSize: "0.85rem", marginBottom: "1rem", opacity: 0.9 }}>
          Consejo Académico: {esConsejo ? "Sí" : "No"}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {menu.map((item, index) => (
            <li
              key={index}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Link
                href={item.href}
                style={{
                  display: "block",
                  padding: "0.8rem 0",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/login";
          }}
          style={{
            marginTop: "2rem",
            padding: "0.7rem",
            width: "100%",
            border: "none",
            background: "#6b6f1a",
            color: "white",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main style={{ flex: 1, padding: "2rem", background: "#faf8f2" }}>
        {children}
      </main>
    </div>
  );
}