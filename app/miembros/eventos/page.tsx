"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type Evento = {
  id: string;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  lugar: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  created_at: string;
};

export default function EventosPage() {
  const [esConsejo, setEsConsejo] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsed = JSON.parse(stored) as User;

    const consejoNormalizado =
      parsed.consejo === true ||
      parsed.consejo === "true" ||
      parsed.consejo === "TRUE" ||
      parsed.consejo === 1;

    setEsConsejo(consejoNormalizado);

    const cargarEventos = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("fecha_inicio", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setEventos(data || []);
      }

      setLoading(false);
    };

    cargarEventos();
  }, []);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const eventosVigentes = eventos.filter((evento) => {
    const fin = new Date(evento.fecha_fin);
    fin.setHours(0, 0, 0, 0);
    return fin >= hoy;
  });

  const eventosPasados = eventos
    .filter((evento) => {
      const fin = new Date(evento.fecha_fin);
      fin.setHours(0, 0, 0, 0);
      return fin < hoy;
    })
    .sort((a, b) => {
      return (
        new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
      );
    });

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const etiquetaFecha = (evento: Evento) => {
    const inicio = formatearFecha(evento.fecha_inicio);
    const fin = formatearFecha(evento.fecha_fin);

    if (evento.fecha_inicio === evento.fecha_fin) {
      return inicio;
    }

    return `${inicio} al ${fin}`;
  };

  const resumen = (texto: string | null) => {
    if (!texto) return "";
    return texto.length > 150 ? texto.slice(0, 150) + "..." : texto;
  };

  const renderEventos = (lista: Evento[]) => {
    if (lista.length === 0) {
      return (
        <p style={{ marginTop: 0, color: "#555" }}>
          No hay eventos en esta sección.
        </p>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gap: "18px",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 320px))",
          justifyContent: "start",
        }}
      >
        {lista.map((evento) => (
          <Link
            key={evento.id}
            href={`/miembros/eventos/${evento.id}`}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "320px",
              background: "white",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              overflow: "hidden",
              textDecoration: "none",
              color: "inherit",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "180px",
                background: "#ece7dc",
                overflow: "hidden",
              }}
            >
              <img
                src={evento.imagen_url || "/placeholder-evento.jpg"}
                alt={evento.titulo}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <div style={{ padding: "1rem" }}>
              <p
                style={{
                  margin: "0 0 0.45rem 0",
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#6b6f1a",
                  fontWeight: 700,
                }}
              >
                Actividad académica
              </p>

              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "0.65rem",
                  fontSize: "1.08rem",
                  lineHeight: 1.35,
                }}
              >
                {evento.titulo}
              </h3>

              <p
                style={{
                  margin: "0 0 0.35rem 0",
                  fontSize: "0.95rem",
                  color: "#333",
                }}
              >
                <strong>Fecha:</strong> {etiquetaFecha(evento)}
              </p>

              {evento.lugar && (
                <p
                  style={{
                    margin: "0 0 0.35rem 0",
                    fontSize: "0.95rem",
                    color: "#333",
                  }}
                >
                  <strong>Lugar:</strong> {evento.lugar}
                </p>
              )}

              {evento.descripcion && (
                <p
                  style={{
                    margin: "0.75rem 0 0 0",
                    color: "#4a4a4a",
                    lineHeight: 1.6,
                  }}
                >
                  {resumen(evento.descripcion)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div>Cargando eventos...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Eventos</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#555", lineHeight: 1.6 }}>
            Espacio destinado a la difusión de actividades académicas,
            convocatorias, encuentros y sesiones de interés para los miembros de
            la AGENN.
          </p>
        </div>

        {esConsejo && (
          <Link
            href="/miembros/eventos/nuevo"
            style={{
              background: "#6b6f1a",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Crear evento
          </Link>
        )}
      </div>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ marginBottom: "0.4rem" }}>Eventos vigentes</h2>
        <p style={{ marginTop: 0, marginBottom: "1rem", color: "#666" }}>
          Actividades programadas o en desarrollo dentro del calendario
          institucional.
        </p>
        {renderEventos(eventosVigentes)}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.4rem" }}>Eventos pasados</h2>
        <p style={{ marginTop: 0, marginBottom: "1rem", color: "#666" }}>
          Registro histórico de actividades ya concluidas.
        </p>
        {renderEventos(eventosPasados)}
      </section>
    </div>
  );
}