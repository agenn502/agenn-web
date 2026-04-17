"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type ItemBiblioteca = {
  id: string;
  slug: string;
  titulo: string;
  autores: string[];
  anio: number | null;
  tipo: string | null;
  editorial: string | null;
  descripcion: string | null;
  portada_url: string | null;
  enlace_url: string;
};

type BibliotecaDetalleProps = {
  params: Promise<{ slug: string }>;
};

export default function BibliotecaDetalle({
  params,
}: BibliotecaDetalleProps) {
  const [user, setUser] = useState<User | null>(null);
  const [item, setItem] = useState<ItemBiblioteca | null>(null);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const parsed = JSON.parse(stored) as User;
      setUser(parsed);

      const resolved = await params;
      setSlug(resolved.slug);

      try {
        const res = await fetch(`/api/biblioteca/slug/${resolved.slug}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (!res.ok || !result.ok) {
          setItem(null);
        } else {
          setItem(result.item as ItemBiblioteca);
        }
      } catch (err) {
        console.error("Error al cargar material:", err);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [params]);

  if (loading) return <div>Cargando material...</div>;
  if (!user) return <div>Cargando usuario...</div>;

  if (!item) {
    return (
      <section>
        <div>
          <p>
            ← <Link href="/miembros/biblioteca">Volver a la biblioteca</Link>
          </p>
          <h1>Material no encontrado</h1>
          <p>No se encontró un registro para el slug: {slug}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div>
        <p>
          ← <Link href="/miembros/biblioteca">Volver a la biblioteca</Link>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: "2rem",
            alignItems: "start",
            marginTop: "1.5rem",
          }}
        >
          <div
            style={{
              minHeight: "420px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <img
              src={item.portada_url || "/placeholder-miembro.jpg"}
              alt={item.titulo}
              style={{
                display: "block",
                width: "220px",
                maxWidth: "100%",
                height: "auto",
                margin: "0 auto",
                borderRadius: "8px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
              }}
            />
          </div>

          <div>
            {item.tipo && (
              <p
                style={{
                  margin: "0 0 0.4rem 0",
                  fontStyle: "italic",
                  color: "#4d371c",
                }}
              >
                {item.tipo}
              </p>
            )}

            <h1 style={{ marginTop: 0 }}>{item.titulo}</h1>

            {(item.autores || []).length > 0 && (
              <p>
                <strong>Autor(es):</strong> {item.autores.join(", ")}
              </p>
            )}

            {item.editorial && (
              <p>
                <strong>Editorial / fuente:</strong> {item.editorial}
              </p>
            )}

            {item.anio && (
              <p>
                <strong>Año:</strong> {item.anio}
              </p>
            )}

            {item.descripcion && (
              <p style={{ marginTop: "1rem", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {item.descripcion}
              </p>
            )}

            <div
              style={{
                background: "#f7f3ea",
                border: "1px solid #ddd4c7",
                borderRadius: "12px",
                padding: "1rem",
                margin: "1rem 0",
                lineHeight: 1.8,
              }}
            >
              Uso exclusivo de miembros. Este material puede estar protegido por
              derechos de autor y no debe ser redistribuido fuera del ámbito interno
              de la Academia.
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <a
                href={item.enlace_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "0.7rem 1.2rem",
                  background: "#6b4f2a",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                Ver documento
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}