"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  file: File | null;
  onFile: (file: File | null) => void;
  existingUrl?: string | null;
  disabled?: boolean;
};

async function comprimirPortada(archivo: File) {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen.");
  }

  const imagen = await createImageBitmap(archivo);
  const maximoAncho = 700;
  const maximoAlto = 900;
  const escala = Math.min(
    1,
    maximoAncho / imagen.width,
    maximoAlto / imagen.height,
  );
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No fue posible procesar la portada.");

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();

  let calidad = 0.78;
  let resultado: Blob | null = null;

  while (calidad >= 0.48) {
    resultado = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", calidad),
    );
    if (resultado && resultado.size <= 180 * 1024) break;
    calidad -= 0.08;
  }

  if (!resultado) throw new Error("No fue posible comprimir la portada.");

  return new File([resultado], "portada-biblioteca.jpg", {
    type: "image/jpeg",
  });
}

export default function PortadaDropzone({
  file,
  onFile,
  existingUrl = null,
  disabled = false,
}: Props) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(existingUrl);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [existingUrl, file]);

  const recibir = async (archivo?: File | null) => {
    if (!archivo || disabled) return;

    try {
      setProcesando(true);
      setError("");
      const comprimida = await comprimirPortada(archivo);
      onFile(comprimida);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible procesar la portada.",
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <label style={{ display: "block", fontWeight: 700, marginBottom: "0.45rem" }}>
        Portada del material (opcional)
      </label>
      <div
        tabIndex={disabled ? -1 : 0}
        onPaste={(event) => {
          const archivoEnArchivos = Array.from(event.clipboardData.files).find(
            (item) => item.type.startsWith("image/"),
          );
          const archivoEnElementos = Array.from(event.clipboardData.items)
            .find((item) => item.type.startsWith("image/"))
            ?.getAsFile();
          const archivo = archivoEnArchivos || archivoEnElementos;
          if (archivo) {
            event.preventDefault();
            void recibir(archivo);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void recibir(event.dataTransfer.files?.[0]);
        }}
        style={{
          display: "grid",
          gridTemplateColumns: preview ? "120px 1fr" : "1fr",
          gap: "1rem",
          alignItems: "center",
          minHeight: 150,
          padding: "1rem",
          border: "2px dashed #b9ab94",
          borderRadius: 10,
          background: "#fffdf8",
          outline: "none",
        }}
      >
        {preview && (
          <img
            src={preview}
            alt="Vista previa de la portada"
            style={{
              display: "block",
              width: 110,
              height: 145,
              objectFit: "cover",
              borderRadius: 6,
              boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
            }}
          />
        )}
        <div>
          <strong>
            {procesando
              ? "Reduciendo la imagen..."
              : "Pegue aquí la portada con Ctrl + V o Command + V"}
          </strong>
          <p style={{ margin: "0.4rem 0 0.7rem", lineHeight: 1.5 }}>
            También puede arrastrar una imagen o seleccionarla desde su
            dispositivo. Se reducirá automáticamente antes de guardarse.
          </p>
          <label
            htmlFor={inputId}
            style={{
              display: "inline-block",
              padding: "0.6rem 0.8rem",
              border: "1px solid #6b4f2a",
              borderRadius: 8,
              background: "white",
              color: "#4d371c",
              cursor: disabled ? "default" : "pointer",
              fontWeight: 700,
            }}
          >
            Seleccionar imagen
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(event) => void recibir(event.target.files?.[0])}
            style={{ display: "none" }}
          />
          {file && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onFile(null)}
              style={{
                marginLeft: "0.6rem",
                padding: "0.6rem 0.8rem",
                border: "1px solid #9d9588",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
              }}
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      {error && <p style={{ color: "#8b2f2f" }}>{error}</p>}
    </div>
  );
}