"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const LIMITE_BYTES = 100 * 1024;
const MAX_LADO_INICIAL = 1400;

type ImagenForo = { id: string; url?: string | null };
type TemaForo = { id: string; titulo: string; contenido: string; categoria: string; autor_nombre: string; created_at: string; cerrado: boolean; foro_imagenes?: ImagenForo[] };
type RespuestaForo = { id: string; autor_nombre: string; contenido: string; created_at: string; foro_imagenes?: ImagenForo[] };

async function comprimirImagen(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Seleccione un archivo de imagen.");
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
    canvas.width = Math.max(1, ancho); canvas.height = Math.max(1, alto);
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); throw new Error("No fue posible procesar la imagen."); }
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob) { bitmap.close(); throw new Error("No fue posible comprimir la imagen."); }
    if (blob.size <= LIMITE_BYTES) break;
    if (calidad > 0.5) calidad -= 0.08;
    else { ancho = Math.round(ancho * 0.84); alto = Math.round(alto * 0.84); calidad = 0.72; }
  }
  bitmap.close();
  if (!blob || blob.size > LIMITE_BYTES) throw new Error("No fue posible reducir la imagen a menos de 100 KB.");
  const nombreBase = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${nombreBase}.jpg`, { type: "image/jpeg" });
}

export default function Hilo() {
  const { id } = useParams<{ id: string }>();
  const [tema, setTema] = useState<TemaForo | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaForo[]>([]);
  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState("");

  const codigo = () => { try { return JSON.parse(localStorage.getItem("user") || "{}").codigo || ""; } catch { return ""; } };

  const cargar = async () => {
    try {
      const response = await fetch(`/api/foro/${id}`, { headers: { "x-user-codigo": codigo() }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) { setError(data.error || "No fue posible cargar la discusión."); return; }
      setTema(data.tema); setRespuestas(data.respuestas || []);
      window.dispatchEvent(new Event("agenn-foro-actualizado"));
    } catch { setError("No fue posible cargar la discusión."); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => () => { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); }, [vistaPrevia]);

  const seleccionarImagen = async (file: File | null) => {
    setError("");
    if (!file) { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); setImagen(null); setVistaPrevia(""); return; }
    setProcesandoImagen(true);
    try {
      const comprimida = await comprimirImagen(file);
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
      setImagen(comprimida); setVistaPrevia(URL.createObjectURL(comprimida));
    } catch (e) { setImagen(null); setVistaPrevia(""); setError(e instanceof Error ? e.message : "No fue posible procesar la imagen."); }
    finally { setProcesandoImagen(false); }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setPublicando(true);
    try {
      const userCodigo = codigo();
      const response = await fetch(`/api/foro/${id}/respuestas`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-codigo": userCodigo }, body: JSON.stringify({ contenido: texto }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible publicar la respuesta.");
      if (imagen) {
        const formData = new FormData(); formData.append("file", imagen); formData.append("tema_id", id); formData.append("respuesta_id", data.respuesta.id);
        const subida = await fetch("/api/foro/imagenes", { method: "POST", headers: { "x-user-codigo": userCodigo }, body: formData });
        const subidaData = await subida.json();
        if (!subida.ok || !subidaData.ok) throw new Error(subidaData.error || "La respuesta se publicó, pero no fue posible adjuntar la imagen.");
      }
      setTexto(""); setImagen(null); if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); setVistaPrevia(""); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible publicar la respuesta."); }
    finally { setPublicando(false); }
  };

  if (!tema) return <p>{error || "Cargando discusión..."}</p>;

  return <div style={{ maxWidth: 950, margin: "0 auto" }}>
    <div style={{ padding: 20, background: "white", borderRadius: 10, border: "1px solid #ddd" }}>
      <small>{tema.categoria}</small><h1>{tema.titulo}</h1><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{tema.contenido}</p>
      {(tema.foro_imagenes || []).map((img) => img.url && <div key={img.id} style={{ margin: "18px 0" }}><img src={img.url} alt={`Imagen de apoyo: ${tema.titulo}`} style={{ display: "block", maxWidth: "100%", maxHeight: 650, objectFit: "contain", borderRadius: 8, border: "1px solid #e1e1e1" }} /></div>)}
      <small>{tema.autor_nombre} · {new Date(tema.created_at).toLocaleString()}</small>
    </div>
    <h2 style={{ marginTop: 28 }}>Respuestas</h2>
    <div style={{ display: "grid", gap: 10 }}>
      {respuestas.map((r) => <div key={r.id} style={{ padding: 16, background: "white", border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>{r.autor_nombre}</strong><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{r.contenido}</p>
        {(r.foro_imagenes || []).map((img) => img.url && <div key={img.id} style={{ margin: "12px 0" }}><img src={img.url} alt="Imagen aportada en la respuesta" style={{ display: "block", maxWidth: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 8, border: "1px solid #e1e1e1" }} /></div>)}
        <small>{new Date(r.created_at).toLocaleString()}</small>
      </div>)}
    </div>
    {!tema.cerrado && <form onSubmit={enviar} style={{ marginTop: 22, padding: 16, background: "white", border: "1px solid #ddd", borderRadius: 8 }}>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} placeholder="Aporte información, evidencia o una respuesta..." style={{ width: "100%", padding: 12 }} />
      <div style={{ marginTop: 12 }}><label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Imagen de apoyo (opcional)</label><input type="file" accept="image/jpeg,image/png,image/webp" disabled={procesandoImagen || publicando} onChange={(e) => seleccionarImagen(e.target.files?.[0] || null)} /><div style={{ fontSize: ".82rem", marginTop: 5, color: "#666" }}>{procesandoImagen ? "Comprimiendo imagen..." : imagen ? `Imagen lista: ${(imagen.size / 1024).toFixed(1)} KB` : "AGENN la reducirá automáticamente a un máximo de 100 KB."}</div></div>
      {vistaPrevia && <div style={{ marginTop: 10 }}><img src={vistaPrevia} alt="Vista previa" style={{ maxWidth: 320, maxHeight: 240, objectFit: "contain", border: "1px solid #ddd", borderRadius: 7 }} /><div><button type="button" onClick={() => seleccionarImagen(null)} style={{ marginTop: 6 }}>Quitar imagen</button></div></div>}
      <button disabled={publicando || procesandoImagen || texto.trim().length < 2} style={{ marginTop: 12, padding: "10px 16px", background: "#6f8760", color: "white", border: 0, borderRadius: 8, opacity: publicando ? .7 : 1 }}>{publicando ? "Publicando..." : "Responder"}</button>
    </form>}
    {error && <p style={{ color: "#9b1c1c" }}>{error}</p>}
  </div>;
}
