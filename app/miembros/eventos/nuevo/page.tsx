"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

export default function NuevoEventoPage() {
  const router = useRouter();

  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [esConsejo, setEsConsejo] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");

  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);

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
    setCargandoUsuario(false);

    if (!consejoNormalizado) {
      window.location.href = "/miembros/eventos";
    }
  }, []);

  const manejarSubidaImagen = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoImagen(true);

    const extension = file.name.split(".").pop();
    const nombreArchivo = `evento-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("eventos-imagenes")
      .upload(nombreArchivo, file, {
        upsert: true,
      });

    if (uploadError) {
      alert("Error al subir la imagen: " + uploadError.message);
      setSubiendoImagen(false);
      return;
    }

    const { data } = supabase.storage
      .from("eventos-imagenes")
      .getPublicUrl(nombreArchivo);

    setImagenUrl(data.publicUrl);
    setSubiendoImagen(false);
  };

  const guardarEvento = async () => {
    if (!titulo.trim() || !fechaInicio || !fechaFin) {
      alert("Completa al menos título, fecha de inicio y fecha de fin");
      return;
    }

    if (fechaFin < fechaInicio) {
      alert("La fecha final no puede ser anterior a la fecha inicial");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("eventos").insert([
      {
        titulo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        lugar,
        descripcion,
        imagen_url: imagenUrl || null,
      },
    ]);

    if (error) {
      alert("Error al guardar el evento: " + error.message);
      setGuardando(false);
      return;
    }

    alert("Evento creado correctamente");
    setGuardando(false);
    router.push("/miembros/eventos");
  };

  if (cargandoUsuario) {
    return <div>Cargando...</div>;
  }

  if (!esConsejo) {
    return <div>Redirigiendo...</div>;
  }

  return (
    <div style={{ maxWidth: "760px" }}>
      <h1 style={{ marginTop: 0 }}>Crear evento</h1>

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label>Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem",
              marginTop: "0.4rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label>Fecha de inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem",
                marginTop: "0.4rem",
                border: "1px solid #ddd4c7",
                borderRadius: "8px",
              }}
            />
          </div>

          <div>
            <label>Fecha de fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem",
                marginTop: "0.4rem",
                border: "1px solid #ddd4c7",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Lugar</label>
          <input
            type="text"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem",
              marginTop: "0.4rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Descripción del evento</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{
              width: "100%",
              minHeight: "140px",
              padding: "0.8rem",
              marginTop: "0.4rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Imagen del evento</label>
          <input
            type="file"
            accept="image/*"
            onChange={manejarSubidaImagen}
            style={{ display: "block", marginTop: "0.5rem" }}
          />

          {subiendoImagen && (
            <p style={{ marginTop: "0.5rem" }}>Subiendo imagen...</p>
          )}

          {imagenUrl && (
            <div style={{ marginTop: "1rem" }}>
              <img
                src={imagenUrl}
                alt="Vista previa"
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  borderRadius: "10px",
                  display: "block",
                }}
              />
            </div>
          )}
        </div>

        <button
          onClick={guardarEvento}
          disabled={guardando}
          style={{
            background: "#6b6f1a",
            color: "white",
            padding: "0.8rem 1.2rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {guardando ? "Guardando..." : "Guardar evento"}
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}