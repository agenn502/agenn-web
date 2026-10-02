"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const LIMITE_BYTES = 100 * 1024;
const MAX_LADO_INICIAL = 1400;

type TemaSimilar = {
  id: string;
  titulo: string;
};

async function comprimirImagen(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Seleccione un archivo de imagen.");
  }

  const bitmap = await createImageBitmap(file);
  let ancho = bitmap.width;
  let alto = bitmap.height;

  if (Math.max(ancho, alto) > MAX_LADO_INICIAL) {
    const escala = MAX_LADO_INICIAL / Math.max(ancho, alto);
    ancho = Math.round(ancho * escala);
    alto = Math.round(alto * escala);
  }

  let calidad = 0.82;
  let blob: Blob | null = null;

  for (let intento = 0; intento < 14; intento += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, ancho);
    canvas.height = Math.max(1, alto);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("No fue posible procesar la imagen.");
    }

    // Fondo blanco para fotografías PNG con transparencia al convertir a JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", calidad)
    );

    if (!blob) {
      bitmap.close();
      throw new Error("No fue posible comprimir la imagen.");
    }

    if (blob.size <= LIMITE_BYTES) break;

    if (calidad > 0.5) {
      calidad -= 0.08;
    } else {
      ancho = Math.round(ancho * 0.84);
      alto = Math.round(alto * 0.84);
      calidad = 0.72;
    }
  }

  bitmap.close();

  if (!blob || blob.size > LIMITE_BYTES) {
    throw new Error("No fue posible reducir la imagen a menos de 100 KB.");
  }

  const nombreBase = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${nombreBase}.jpg`, { type: "image/jpeg" });
}

export default function Nuevo() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState("Notafilia");
  const [similares, setSimilares] = useState<TemaSimilar[]>([]);
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState("");

  const codigo = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").codigo || "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const temporizador = setTimeout(async () => {
      if (titulo.trim().length < 4) {
        setSimilares([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/foro/similares?q=${encodeURIComponent(titulo)}`
        );
        const data = await response.json();
        setSimilares(data.temas || []);
      } catch {
        setSimilares([]);
      }
    }, 350);

    return () => clearTimeout(temporizador);
  }, [titulo]);

  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const seleccionarImagen = async (file: File | null) => {
    setError("");

    if (!file) {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
      setImagen(null);
      setVistaPrevia("");
      return;
    }

    setProcesandoImagen(true);

    try {
      const comprimida = await comprimirImagen(file);
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
      setImagen(comprimida);
      setVistaPrevia(URL.createObjectURL(comprimida));
    } catch (e) {
      setImagen(null);
      setVistaPrevia("");
      setError(e instanceof Error ? e.message : "No fue posible procesar la imagen.");
    } finally {
      setProcesandoImagen(false);
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPublicando(true);

    try {
      const userCodigo = codigo();
      const response = await fetch("/api/foro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": userCodigo,
        },
        body: JSON.stringify({ titulo, contenido, categoria }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No fue posible crear la discusión.");
      }

      if (imagen) {
        const formData = new FormData();
        formData.append("file", imagen);
        formData.append("tema_id", data.tema.id);

        const subida = await fetch("/api/foro/imagenes", {
          method: "POST",
          headers: { "x-user-codigo": userCodigo },
          body: formData,
        });

        const resultadoSubida = await subida.json();

        if (!subida.ok || !resultadoSubida.ok) {
          throw new Error(
            resultadoSubida.error ||
              "La discusión se creó, pero no fue posible adjuntar la imagen."
          );
        }
      }

      router.push(`/miembros/foro/${data.tema.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible crear la discusión.");
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1>Nueva discusión</h1>

      <form onSubmit={enviar} style={{ display: "grid", gap: 14 }}>
        <label>
          Tema o título
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={{ display: "block", width: "100%", padding: 12, marginTop: 6 }}
          />
        </label>

        {similares.length > 0 && (
          <div style={{ padding: 14, background: "#fff8df", borderRadius: 8 }}>
            <strong>Ya existen discusiones que podrían estar relacionadas:</strong>
            {similares.map((tema) => (
              <div key={tema.id}>
                <Link href={`/miembros/foro/${tema.id}`}>{tema.titulo}</Link>
              </div>
            ))}
          </div>
        )}

        <label>
          Categoría
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{ display: "block", padding: 10, marginTop: 6 }}
          >
            <option>Notafilia</option>
            <option>Monedas</option>
            <option>Exonumia</option>
            <option>Historia monetaria</option>
            <option>Bibliografía</option>
            <option>General</option>
          </select>
        </label>

        <label>
          Plantee la discusión
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={12}
            style={{ display: "block", width: "100%", padding: 12, marginTop: 6 }}
          />
        </label>

        <div
          style={{
            padding: 14,
            border: "1px solid #d8d8d8",
            borderRadius: 8,
            background: "white",
          }}
        >
          <label style={{ fontWeight: 600 }}>
            Imagen de apoyo (opcional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={procesandoImagen || publicando}
              onChange={(e) => seleccionarImagen(e.target.files?.[0] || null)}
              style={{ display: "block", marginTop: 8 }}
            />
          </label>

          <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "#666" }}>
            El sistema reduce automáticamente la imagen a un máximo de 100 KB antes de subirla.
          </p>

          {procesandoImagen && <p>Reduciendo imagen...</p>}

          {imagen && vistaPrevia && (
            <div style={{ marginTop: 12 }}>
              <img
                src={vistaPrevia}
                alt="Vista previa de la imagen adjunta"
                style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 6 }}
              />
              <div style={{ marginTop: 6, fontSize: "0.9rem" }}>
                Imagen preparada: {(imagen.size / 1024).toFixed(1)} KB
                <button
                  type="button"
                  onClick={() => seleccionarImagen(null)}
                  style={{ marginLeft: 12 }}
                >
                  Quitar imagen
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ color: "#9b1c1c" }}>{error}</p>}

        <button
          disabled={publicando || procesandoImagen}
          style={{
            padding: 12,
            background: "#6f8760",
            color: "white",
            border: 0,
            borderRadius: 8,
            opacity: publicando || procesandoImagen ? 0.65 : 1,
          }}
        >
          {publicando ? "Publicando..." : "Publicar discusión"}
        </button>
      </form>
    </div>
  );
}
