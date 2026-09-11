"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  file: File | null;
  existingUrl?: string | null;
  disabled?: boolean;
  procesar: (file: File) => Promise<File>;
  onFile: (file: File | null) => void;
};

export default function ImagenTrabajoDropzone({ file, existingUrl, disabled, procesar, onFile }: Props) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(existingUrl || null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, existingUrl]);

  const recibir = async (archivo?: File | null) => {
    if (!archivo || disabled) return;
    try {
      setOcupado(true);
      onFile(await procesar(archivo));
    } catch (error) {
      alert(error instanceof Error ? error.message : "No fue posible procesar la imagen.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div
      tabIndex={disabled ? -1 : 0}
      onPaste={(event) => {
        const archivo = Array.from(event.clipboardData.items)
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
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
        gridTemplateColumns: preview ? "minmax(100px, 180px) minmax(0, 1fr)" : "1fr",
        gap: 16,
        alignItems: "center",
        minHeight: 170,
        margin: "0.5rem 0 1rem",
        padding: "1rem",
        border: "2px dashed #b9ab94",
        borderRadius: 10,
        background: "#fffdf8",
      }}
    >
      {preview && <img src={preview} alt="Vista previa" style={{ width: "100%", maxHeight: 220, objectFit: "contain" }} />}
      <div>
        <p><strong>{ocupado ? "Procesando imagen..." : "Pegue o arrastre aquí la imagen"}</strong></p>
        <p>También puede seleccionarla desde su dispositivo. Será optimizada automáticamente a menos de 100 KB.</p>
        <input id={id} type="file" accept="image/*" disabled={disabled || ocupado} onChange={(e) => void recibir(e.target.files?.[0])} />
        {file && <p>Nueva imagen optimizada: {(file.size / 1024).toFixed(1)} KB</p>}
      </div>
      <style jsx>{`@media (max-width: 600px) { div[tabindex] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}