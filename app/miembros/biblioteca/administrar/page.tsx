"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PortadaDropzone from "@/components/biblioteca/PortadaDropzone";

type Usuario = { codigo: string; nombre: string };
type Permisos = { puedeGestionar: boolean; puedeDesignar: boolean };
type Material = {
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
  estado: "ACTIVO" | "OCULTO" | "EN_REVISION";
  estado_enlace: "FUNCIONAL" | "ROTO" | "SIN_VERIFICAR";
  ultima_verificacion_enlace: string | null;
};
type Miembro = { id: number; codigo: string; nombre: string; nivel: string };
type Gestor = { id: number; miembro_id: number; miembro: Miembro | null };

const vacio = {
  titulo: "",
  autores: "",
  anio: "",
  tipo: "",
  editorial: "",
  descripcion: "",
  slug: "",
  enlace_url: "",
};

const caja = {
  background: "#fff",
  border: "1px solid #d8cfbf",
  borderRadius: 12,
  padding: "1rem",
} as const;

export default function AdministrarBibliotecaPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<Permisos | null>(null);
  const [items, setItems] = useState<Material[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroEnlace, setFiltroEnlace] = useState("");
  const [editando, setEditando] = useState<Material | null>(null);
  const [form, setForm] = useState(vacio);
  const [portada, setPortada] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [miembroElegido, setMiembroElegido] = useState("");

  useEffect(() => {
    const guardado = localStorage.getItem("user");
    if (!guardado) {
      window.location.href = "/login";
      return;
    }
    try {
      const parsed = JSON.parse(guardado) as Usuario;
      setUsuario(parsed);
      void cargar(parsed.codigo);
    } catch {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  async function cargar(codigo: string) {
    setError("");
    const res = await fetch("/api/biblioteca/administrar", {
      headers: { "x-user-codigo": codigo },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "No fue posible cargar la administración.");
      return;
    }
    setItems(data.items || []);
    setPermisos(data.permisos);
    if (data.permisos?.puedeDesignar) void cargarGestores(codigo);
  }

  async function cargarGestores(codigo: string) {
    const res = await fetch("/api/biblioteca/gestores", {
      headers: { "x-user-codigo": codigo },
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setMiembros(data.miembros || []);
      setGestores(data.gestores || []);
    }
  }

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return items.filter((item) => {
      const texto = [item.titulo, item.autores.join(" "), item.editorial, item.tipo]
        .join(" ")
        .toLowerCase();
      return (
        (!termino || texto.includes(termino)) &&
        (!filtroEstado || item.estado === filtroEstado) &&
        (!filtroEnlace || item.estado_enlace === filtroEnlace)
      );
    });
  }, [items, busqueda, filtroEstado, filtroEnlace]);

  function abrirEdicion(item: Material) {
    setEditando(item);
    setPortada(null);
    setForm({
      titulo: item.titulo,
      autores: item.autores.join(", "),
      anio: item.anio ? String(item.anio) : "",
      tipo: item.tipo || "",
      editorial: item.editorial || "",
      descripcion: item.descripcion || "",
      slug: item.slug,
      enlace_url: item.enlace_url,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enviar(formData: FormData) {
    if (!usuario) return;
    setOcupado(true);
    try {
      const res = await fetch("/api/biblioteca/administrar", {
        method: "PATCH",
        headers: { "x-user-codigo": usuario.codigo },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No fue posible guardar.");
      await cargar(usuario.codigo);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No fue posible guardar.");
    } finally {
      setOcupado(false);
    }
  }

  async function guardarEdicion() {
    if (!editando) return;
    const datos = new FormData();
    datos.append("id", editando.id);
    datos.append("accion", "ACTUALIZAR");
    Object.entries(form).forEach(([clave, valor]) => datos.append(clave, valor));
    if (portada) datos.append("portada", portada);
    await enviar(datos);
    setEditando(null);
    setForm(vacio);
    setPortada(null);
  }

  async function cambiarEstado(item: Material, estado: Material["estado"]) {
    const datos = new FormData();
    datos.append("id", item.id);
    datos.append("accion", "CAMBIAR_ESTADO");
    datos.append("estado", estado);
    await enviar(datos);
  }

  async function verificar(item: Material, estado: Material["estado_enlace"]) {
    const datos = new FormData();
    datos.append("id", item.id);
    datos.append("accion", "VERIFICAR_ENLACE");
    datos.append("estado_enlace", estado);
    await enviar(datos);
  }

  async function designar() {
    if (!usuario || !miembroElegido) return;
    const res = await fetch("/api/biblioteca/gestores", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-codigo": usuario.codigo },
      body: JSON.stringify({ miembro_id: Number(miembroElegido) }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return alert(data.error || "No fue posible designar.");
    setMiembroElegido("");
    await cargarGestores(usuario.codigo);
  }

  async function retirar(id: number) {
    if (!usuario || !confirm("¿Finalizar esta designación?")) return;
    const res = await fetch(`/api/biblioteca/gestores?id=${id}`, {
      method: "DELETE",
      headers: { "x-user-codigo": usuario.codigo },
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return alert(data.error || "No fue posible retirar.");
    await cargarGestores(usuario.codigo);
  }

  if (!usuario) return <p>Cargando...</p>;
  if (error) return <section><p><Link href="/miembros/biblioteca">← Biblioteca</Link></p><h1>Administración de Biblioteca</h1><p>{error}</p></section>;
  if (!permisos?.puedeGestionar) return <p>Comprobando permisos...</p>;

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto" }}>
      <p><Link href="/miembros/biblioteca">← Volver a la Biblioteca</Link></p>
      <h1>Administración de Biblioteca</h1>
      <p>Actualice fichas y enlaces sin eliminar su historia. Oculte temporalmente cualquier material que no deba estar disponible.</p>

      {editando && (
        <div style={{ ...caja, margin: "1.5rem 0" }}>
          <h2>Editar material</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
            <label>Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
            <label>Autores, separados por coma<input value={form.autores} onChange={(e) => setForm({ ...form, autores: e.target.value })} /></label>
            <label>Año<input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></label>
            <label>Tipo<input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></label>
            <label>Editorial / fuente<input value={form.editorial} onChange={(e) => setForm({ ...form, editorial: e.target.value })} /></label>
            <label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
          </div>
          <label style={{ display: "block", marginTop: 12 }}>Enlace público<input type="url" value={form.enlace_url} onChange={(e) => setForm({ ...form, enlace_url: e.target.value })} style={{ width: "100%" }} /></label>
          <label style={{ display: "block", marginTop: 12 }}>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={5} style={{ width: "100%" }} /></label>
          <div style={{ marginTop: 12 }}><PortadaDropzone file={portada} existingUrl={editando.portada_url} onFile={setPortada} /></div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={guardarEdicion} disabled={ocupado}>Guardar cambios</button>
            <button onClick={() => setEditando(null)} disabled={ocupado}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ ...caja, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, margin: "1.5rem 0" }}>
        <input placeholder="Buscar título, autor o editorial" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="">Toda visibilidad</option><option value="ACTIVO">Activos</option><option value="OCULTO">Ocultos</option><option value="EN_REVISION">En revisión</option></select>
        <select value={filtroEnlace} onChange={(e) => setFiltroEnlace(e.target.value)}><option value="">Todo estado de enlace</option><option value="FUNCIONAL">Funcional</option><option value="ROTO">Roto</option><option value="SIN_VERIFICAR">Sin verificar</option></select>
      </div>

      <p>{resultados.length} materiales</p>
      <div style={{ display: "grid", gap: 14 }}>
        {resultados.map((item) => (
          <article key={item.id} style={caja}>
            <div style={{ display: "flex", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
              {item.portada_url && <img src={item.portada_url} alt="" style={{ width: 72, height: 100, objectFit: "cover" }} />}
              <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                <h2 style={{ marginTop: 0 }}>{item.titulo}</h2>
                <p>{item.autores.join(", ") || "Sin autor consignado"} {item.anio ? `· ${item.anio}` : ""}</p>
                <p><strong>Catálogo:</strong> {item.estado} · <strong>Enlace:</strong> {item.estado_enlace}</p>
                <p style={{ overflowWrap: "anywhere" }}><a href={item.enlace_url} target="_blank" rel="noreferrer">Abrir enlace actual</a></p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button onClick={() => abrirEdicion(item)}>Editar ficha</button>
                  <button onClick={() => verificar(item, "FUNCIONAL")} disabled={ocupado}>Enlace funciona</button>
                  <button onClick={() => verificar(item, "ROTO")} disabled={ocupado}>Enlace roto</button>
                  {item.estado === "ACTIVO" ? <button onClick={() => cambiarEstado(item, "OCULTO")} disabled={ocupado}>Ocultar</button> : <button onClick={() => cambiarEstado(item, "ACTIVO")} disabled={ocupado}>Activar</button>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {permisos.puedeDesignar && (
        <div style={{ ...caja, marginTop: 28 }}>
          <h2>Responsables de Biblioteca</h2>
          <p>La designación permite mantener fichas, portadas y enlaces. No permite aprobar propuestas.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select value={miembroElegido} onChange={(e) => setMiembroElegido(e.target.value)}>
              <option value="">Seleccione un miembro</option>
              {miembros.filter((m) => !gestores.some((g) => g.miembro_id === Number(m.id))).map((m) => <option key={m.id} value={m.id}>{m.nombre} · {m.codigo}</option>)}
            </select>
            <button onClick={designar} disabled={!miembroElegido}>Designar</button>
          </div>
          <ul>
            {gestores.map((gestor) => <li key={gestor.id}>{gestor.miembro?.nombre || `Miembro ${gestor.miembro_id}`} {gestor.miembro?.codigo ? `· ${gestor.miembro.codigo}` : ""} <button onClick={() => retirar(gestor.id)}>Retirar</button></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}