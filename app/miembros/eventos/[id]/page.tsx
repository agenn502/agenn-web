"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
};

export default function EventoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "").trim();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  const [imagenAbierta, setImagenAbierta] = useState(false);

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

    const cargarEvento = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("No se encontró el evento.");
      } else {
        setEvento(data);
      }

      setLoading(false);
    };

    if (id) {
      cargarEvento();
    }
  }, [id]);

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

  const eliminarEvento = async () => {
    if (!evento) return;

    const confirmado = window.confirm(
      "¿Deseas eliminar este evento? Esta acción no se puede deshacer."
    );

    if (!confirmado) return;

    setEliminando(true);

    const { error } = await supabase.from("eventos").delete().eq("id", evento.id);

    if (error) {
      alert("No se pudo eliminar el evento: " + error.message);
      setEliminando(false);
      return;
    }

    alert("Evento eliminado correctamente");
    router.push("/miembros/eventos");
  };

  if (loading) return <div>Cargando evento...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!evento) return <div>No hay datos del evento.</div>;

  return (
    <div style={{ maxWidth: "900px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.82rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#6b6f1a",
              fontWeight: 700,
            }}
          >
            Actividad académica
          </p>

          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>{evento.titulo}</h1>
        </div>

        {esConsejo && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href={`/miembros/eventos/editar/${evento.id}`}
              style={{
                background: "#6f8760",
                color: "white",
                padding: "0.7rem 1rem",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Editar evento
            </Link>

            <button
              onClick={eliminarEvento}
              disabled={eliminando}
              style={{
                background: "#8b3a3a",
                color: "white",
                padding: "0.7rem 1rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {eliminando ? "Eliminando..." : "Eliminar evento"}
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          height: "320px",
          background: "#ece7dc",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "0.6rem",
          cursor: evento.imagen_url ? "zoom-in" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => {
          if (evento.imagen_url) setImagenAbierta(true);
        }}
        title={evento.imagen_url ? "Clic para ampliar imagen" : ""}
      >
        <img
          src={evento.imagen_url || "/placeholder-evento.jpg"}
          alt={evento.titulo}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {evento.imagen_url && (
        <p
          style={{
            marginTop: 0,
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            color: "#666",
            fontStyle: "italic",
          }}
        >
          Clic sobre la imagen para ampliarla.
        </p>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.25rem",
        }}
      >
        <p style={{ marginTop: 0, marginBottom: "0.6rem", lineHeight: 1.6 }}>
          <strong>Fecha:</strong> {etiquetaFecha(evento)}
        </p>

        {evento.lugar && (
          <p style={{ marginTop: 0, marginBottom: "0.6rem", lineHeight: 1.6 }}>
            <strong>Lugar:</strong> {evento.lugar}
          </p>
        )}

        {evento.descripcion && (
          <div style={{ marginTop: "1.25rem" }}>
            <h2 style={{ marginBottom: "0.75rem" }}>Descripción</h2>
            <p style={{ lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>
              {evento.descripcion}
            </p>
          </div>
        )}
      </div>

      {imagenAbierta && (
        <div
          onClick={() => setImagenAbierta(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 2000,
            cursor: "zoom-out",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImagenAbierta(false);
            }}
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "8px",
              padding: "0.55rem 0.85rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Cerrar
          </button>

          <img
            src={evento.imagen_url || "/placeholder-evento.jpg"}
            alt={evento.titulo}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "block",
              maxWidth: "96vw",
              maxHeight: "92vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: "10px",
              boxShadow: "0 0 30px rgba(0,0,0,0.35)",
              background: "white",
            }}
          />
        </div>
      )}
    </div>
  );
}