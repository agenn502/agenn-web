"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortadaDropzone from "@/components/biblioteca/PortadaDropzone";

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
  created_at?: string;
};

type SolicitudBiblioteca = {
  id: string;
  titulo: string;
  autores: string[];
  anio: number | null;
  tipo: string | null;
  editorial: string | null;
  descripcion: string | null;
  portada_url: string | null;
  enlace_url: string;
  motivo: string;
  estado: "PENDIENTE" | "CORRECCIONES" | "APROBADA" | "RECHAZADA";
  observaciones_ca: string | null;
  created_at: string;
};

const initialForm = {
  titulo: "",
  autores: "",
  anio: "",
  tipo: "",
  editorial: "",
  descripcion: "",
  slug: "",
  enlace_url: "",
};

const initialPropuesta = {
  titulo: "",
  autores: "",
  anio: "",
  tipo: "",
  editorial: "",
  descripcion: "",
  enlaceUrl: "",
  motivo: "",
  declaracionCompartir: false,
};

export default function BibliotecaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);

  const [items, setItems] = useState<ItemBiblioteca[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [anioFiltro, setAnioFiltro] = useState("");
  const [autorFiltro, setAutorFiltro] = useState("");

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarPropuesta, setMostrarPropuesta] = useState(false);
  const [propuesta, setPropuesta] = useState(initialPropuesta);
  const [solicitudEditada, setSolicitudEditada] = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudBiblioteca[]>([]);
  const [enviandoPropuesta, setEnviandoPropuesta] = useState(false);
  const [portadaPropuesta, setPortadaPropuesta] = useState<File | null>(null);
  const [portadaExistente, setPortadaExistente] = useState<string | null>(null);

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

    setUser(parsed);
    setEsConsejo(consejoNormalizado);

    void cargarBiblioteca(parsed.codigo);
    void cargarSolicitudes(parsed.codigo);
  }, []);

  const cargarSolicitudes = async (codigo: string) => {
    try {
      const res = await fetch("/api/biblioteca/propuestas", {
        headers: { "x-user-codigo": codigo },
        cache: "no-store",
      });
      const result = await res.json();

      if (res.ok && result.ok) {
        setSolicitudes(
          Array.isArray(result.solicitudes) ? result.solicitudes : [],
        );
      }
    } catch (err) {
      console.error("Error cargando propuestas bibliográficas:", err);
    }
  };

  const cargarBiblioteca = async (codigo: string) => {
    try {
      setLoading(true);

      const res = await fetch("/api/biblioteca", {
        headers: { "x-user-codigo": codigo },
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        alert(result.error || "Error al cargar biblioteca");
        setItems([]);
      } else {
        setItems((result.items as ItemBiblioteca[]) || []);
      }
    } catch (err) {
      console.error("Error al cargar biblioteca:", err);
      alert("No se pudo cargar la biblioteca.");
    } finally {
      setLoading(false);
    }
  };

  const tiposDisponibles = Array.from(
    new Set(items.map((i) => i.tipo).filter(Boolean))
  ).sort() as string[];

  const aniosDisponibles = Array.from(
    new Set(items.map((i) => i.anio).filter((v) => v !== null))
  )
    .map(String)
    .sort((a, b) => Number(b) - Number(a));

  const autoresDisponibles = Array.from(
    new Set(items.flatMap((i) => i.autores || []).filter(Boolean))
  ).sort();

  const resultados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();

    return items
      .filter((item) => {
        const texto = [
          item.titulo,
          item.autores?.join(" ") || "",
          item.editorial || "",
          item.descripcion || "",
          item.tipo || "",
          item.anio ? String(item.anio) : "",
        ]
          .join(" ")
          .toLowerCase();

        const coincideBusqueda = !termino || texto.includes(termino);
        const coincideTipo = !tipoFiltro || item.tipo === tipoFiltro;
        const coincideAnio =
          !anioFiltro || String(item.anio || "") === anioFiltro;
        const coincideAutor =
          !autorFiltro || (item.autores || []).includes(autorFiltro);

        return (
          coincideBusqueda &&
          coincideTipo &&
          coincideAnio &&
          coincideAutor
        );
      })
      .sort((a, b) => (b.anio || 0) - (a.anio || 0));
  }, [items, busqueda, tipoFiltro, anioFiltro, autorFiltro]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setPortadaFile(null);
  };

  const cancelarPropuesta = () => {
    setPropuesta(initialPropuesta);
    setPortadaPropuesta(null);
    setPortadaExistente(null);
    setSolicitudEditada(null);
    setMostrarPropuesta(false);
  };

  const corregirPropuesta = (solicitud: SolicitudBiblioteca) => {
    setSolicitudEditada(solicitud.id);
    setPortadaPropuesta(null);
    setPortadaExistente(solicitud.portada_url || null);
    setPropuesta({
      titulo: solicitud.titulo,
      autores: (solicitud.autores || []).join(", "),
      anio: solicitud.anio ? String(solicitud.anio) : "",
      tipo: solicitud.tipo || "",
      editorial: solicitud.editorial || "",
      descripcion: solicitud.descripcion || "",
      enlaceUrl: solicitud.enlace_url,
      motivo: solicitud.motivo,
      declaracionCompartir: false,
    });
    setMostrarPropuesta(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enviarPropuesta = async () => {
    if (!user) return;

    if (
      !propuesta.titulo.trim() ||
      !propuesta.autores.trim() ||
      !propuesta.enlaceUrl.trim() ||
      !propuesta.motivo.trim()
    ) {
      alert("Título, autoría, enlace y razón de la propuesta son obligatorios.");
      return;
    }

    if (!propuesta.declaracionCompartir) {
      alert("Debe confirmar que el enlace puede compartirse con la Academia.");
      return;
    }

    try {
      setEnviandoPropuesta(true);

      const formData = new FormData();
      formData.append("solicitud_id", solicitudEditada || "");
      formData.append("titulo", propuesta.titulo);
      formData.append("autores", propuesta.autores);
      formData.append("anio", propuesta.anio);
      formData.append("tipo", propuesta.tipo);
      formData.append("editorial", propuesta.editorial);
      formData.append("descripcion", propuesta.descripcion);
      formData.append("enlace_url", propuesta.enlaceUrl);
      formData.append("motivo", propuesta.motivo);
      formData.append(
        "declaracion_compartir",
        String(propuesta.declaracionCompartir),
      );
      if (portadaPropuesta) formData.append("portada", portadaPropuesta);

      const res = await fetch("/api/biblioteca/propuestas", {
        method: "POST",
        headers: { "x-user-codigo": user.codigo },
        body: formData,
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.error || "No fue posible enviar la propuesta.");
      }

      alert(result.message);
      cancelarPropuesta();
      await cargarSolicitudes(user.codigo);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "No fue posible enviar la propuesta.",
      );
    } finally {
      setEnviandoPropuesta(false);
    }
  };

  const guardarItem = async () => {
    if (!user) return;

    if (!form.titulo.trim() || !form.enlace_url.trim()) {
      alert("Título y enlace del documento son obligatorios.");
      return;
    }

    try {
      setSubiendo(true);

      const formData = new FormData();
      formData.append("titulo", form.titulo.trim());
      formData.append("autores", form.autores);
      formData.append("anio", form.anio);
      formData.append("tipo", form.tipo);
      formData.append("editorial", form.editorial);
      formData.append("descripcion", form.descripcion);
      formData.append("slug", form.slug);
      formData.append("enlace_url", form.enlace_url.trim());

      if (portadaFile) {
        formData.append("portada", portadaFile);
      }

      const res = await fetch(
        editingId ? `/api/biblioteca/${editingId}` : "/api/biblioteca",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "x-user-codigo": user.codigo },
          body: formData,
        }
      );

      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.error || "No se pudo guardar el material.");
      }

      alert(
        editingId
          ? "Material actualizado correctamente."
          : "Material agregado correctamente."
      );

      resetForm();
      await cargarBiblioteca(user.codigo);
    } catch (err: any) {
      alert("Error al guardar material: " + err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const editarItem = (item: ItemBiblioteca) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo || "",
      autores: (item.autores || []).join(", "),
      anio: item.anio ? String(item.anio) : "",
      tipo: item.tipo || "",
      editorial: item.editorial || "",
      descripcion: item.descripcion || "",
      slug: item.slug || "",
      enlace_url: item.enlace_url || "",
    });
    setPortadaFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarItem = async (id: string) => {
    if (!user) return;

    const ok = window.confirm("¿Deseas eliminar este material de la biblioteca?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/biblioteca/${id}`, {
        method: "DELETE",
        headers: { "x-user-codigo": user.codigo },
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        alert("Error al eliminar: " + (result.error || "Error desconocido"));
        return;
      }

      alert("Material eliminado.");
      await cargarBiblioteca(user.codigo);
    } catch (err) {
      console.error("Error al eliminar material:", err);
      alert("No se pudo eliminar el material.");
    }
  };

  if (loading) return <div>Cargando biblioteca...</div>;
  if (!user) return <div>Cargando usuario...</div>;

  return (
    <section>
      <div>
        <h1>Biblioteca</h1>

        <p style={{ fontStyle: "italic", marginBottom: "1rem", lineHeight: 1.7 }}>
          Uso exclusivo de miembros. Parte del material disponible en esta sección
          puede estar protegido por derechos de autor, por lo que no debe ser
          compartido, redistribuido ni difundido fuera del ámbito interno de la Academia.
        </p>

        {!esConsejo && (
          <div
            style={{
              background: "#f4f1e8",
              border: "1px solid #d6ccb9",
              borderRadius: 12,
              padding: "1.25rem",
              margin: "1.5rem 0",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Comparta una recomendación</h2>
            <p style={{ lineHeight: 1.7 }}>
              Si usted posee material bibliográfico que considere valioso para
              la Academia, puede proponer su incorporación a la Biblioteca. El
              documento deberá encontrarse alojado en una dirección de acceso
              público o compartido mediante un enlace que permita su consulta.
              Todas las propuestas serán revisadas por el Consejo Académico
              antes de publicarse.
            </p>

            {!mostrarPropuesta && (
              <button
                type="button"
                onClick={() => setMostrarPropuesta(true)}
                style={{
                  padding: "0.8rem 1rem",
                  border: "1px solid #6b4f2a",
                  borderRadius: 8,
                  background: "#6b4f2a",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Proponer material bibliográfico
              </button>
            )}

            {mostrarPropuesta && (
              <div style={{ display: "grid", gap: "0.8rem", marginTop: "1rem" }}>
                <h3 style={{ margin: 0 }}>
                  {solicitudEditada
                    ? "Corregir propuesta bibliográfica"
                    : "Nueva propuesta bibliográfica"}
                </h3>

                <input
                  type="text"
                  placeholder="Título del material"
                  value={propuesta.titulo}
                  onChange={(e) =>
                    setPropuesta((actual) => ({
                      ...actual,
                      titulo: e.target.value,
                    }))
                  }
                  style={{
                    padding: "0.85rem",
                    border: "1px solid #cfc5b7",
                    borderRadius: 8,
                  }}
                />

                <input
                  type="text"
                  placeholder="Autor o autores, separados por coma"
                  value={propuesta.autores}
                  onChange={(e) =>
                    setPropuesta((actual) => ({
                      ...actual,
                      autores: e.target.value,
                    }))
                  }
                  style={{
                    padding: "0.85rem",
                    border: "1px solid #cfc5b7",
                    borderRadius: 8,
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "0.8rem",
                  }}
                >
                  <input
                    type="number"
                    placeholder="Año"
                    value={propuesta.anio}
                    onChange={(e) =>
                      setPropuesta((actual) => ({
                        ...actual,
                        anio: e.target.value,
                      }))
                    }
                    style={{
                      padding: "0.85rem",
                      border: "1px solid #cfc5b7",
                      borderRadius: 8,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Tipo (libro, artículo, catálogo...)"
                    value={propuesta.tipo}
                    onChange={(e) =>
                      setPropuesta((actual) => ({
                        ...actual,
                        tipo: e.target.value,
                      }))
                    }
                    style={{
                      padding: "0.85rem",
                      border: "1px solid #cfc5b7",
                      borderRadius: 8,
                    }}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Editorial o institución"
                  value={propuesta.editorial}
                  onChange={(e) =>
                    setPropuesta((actual) => ({
                      ...actual,
                      editorial: e.target.value,
                    }))
                  }
                  style={{
                    padding: "0.85rem",
                    border: "1px solid #cfc5b7",
                    borderRadius: 8,
                  }}
                />

                <textarea
                  placeholder="Descripción breve del material"
                  value={propuesta.descripcion}
                  onChange={(e) =>
                    setPropuesta((actual) => ({
                      ...actual,
                      descripcion: e.target.value,
                    }))
                  }
                  style={{
                    minHeight: 100,
                    padding: "0.85rem",
                    border: "1px solid #cfc5b7",
                    borderRadius: 8,
                    fontFamily: "inherit",
                  }}
                />

                <input
                  type="url"
                  placeholder="Enlace público de consulta"
                  value={propuesta.enlaceUrl}
                  onChange={(e) =>
                    setPropuesta((actual) => ({
                      ...actual,
                      enlaceUrl: e.target.value,
                    }))
                  }
                  style={{
                    padding: "0.85rem",
                    border: "1px solid #cfc5b7",
                    borderRadius: 8,
                  }}
                />

                <textarea
                  placeholder="¿Por qué recomienda incorporar este material?"
                  value={propuesta.motivo}
                  onChange={(e) =>
                    setPropuesta((actual) => ({
                      ...actual,
                      motivo: e.target.value,
                    }))
                  }
                  style={{
                    minHeight: 100,
                    padding: "0.85rem",
                    border: "1px solid #cfc5b7",
                    borderRadius: 8,
                    fontFamily: "inherit",
                  }}
                />

                <PortadaDropzone
                  file={portadaPropuesta}
                  onFile={setPortadaPropuesta}
                  existingUrl={portadaExistente}
                  disabled={enviandoPropuesta}
                />

                <label style={{ display: "flex", gap: "0.65rem", lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={propuesta.declaracionCompartir}
                    onChange={(e) =>
                      setPropuesta((actual) => ({
                        ...actual,
                        declaracionCompartir: e.target.checked,
                      }))
                    }
                  />
                  Confirmo que el enlace permite consultar el material y que
                  puede compartirse dentro de la Biblioteca de la Academia.
                </label>

                <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void enviarPropuesta()}
                    disabled={enviandoPropuesta}
                    style={{
                      padding: "0.8rem 1rem",
                      border: 0,
                      borderRadius: 8,
                      background: "#6b6f1a",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {enviandoPropuesta
                      ? "Enviando..."
                      : solicitudEditada
                        ? "Reenviar propuesta"
                        : "Enviar al Consejo Académico"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarPropuesta}
                    style={{
                      padding: "0.8rem 1rem",
                      border: "1px solid #9d9588",
                      borderRadius: 8,
                      background: "white",
                      color: "#4d371c",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {solicitudes.length > 0 && (
              <div style={{ marginTop: "1.4rem" }}>
                <h3>Mis propuestas</h3>
                <div style={{ display: "grid", gap: "0.7rem" }}>
                  {solicitudes.map((solicitud) => (
                    <div
                      key={solicitud.id}
                      style={{
                        background: "white",
                        border: "1px solid #ddd4c7",
                        borderRadius: 8,
                        padding: "0.85rem",
                      }}
                    >
                      <strong>{solicitud.titulo}</strong>
                      <p style={{ margin: "0.35rem 0" }}>
                        Estado:{" "}
                        {solicitud.estado === "PENDIENTE"
                          ? "Pendiente de revisión"
                          : solicitud.estado === "CORRECCIONES"
                            ? "Correcciones solicitadas"
                            : solicitud.estado === "APROBADA"
                              ? "Aprobada e incorporada"
                              : "Rechazada"}
                      </p>
                      {solicitud.observaciones_ca && (
                        <p style={{ margin: "0.35rem 0", color: "#6a4a22" }}>
                          <strong>Observaciones del CA:</strong>{" "}
                          {solicitud.observaciones_ca}
                        </p>
                      )}
                      {solicitud.estado === "CORRECCIONES" && (
                        <button
                          type="button"
                          onClick={() => corregirPropuesta(solicitud)}
                          style={{
                            marginTop: "0.4rem",
                            border: "1px solid #6b6f1a",
                            borderRadius: 8,
                            background: "white",
                            color: "#4d371c",
                            padding: "0.6rem 0.8rem",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Corregir y reenviar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {esConsejo && (
          <div
            style={{
              background: "white",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1.25rem",
              margin: "1.5rem 0",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {editingId ? "Editar material" : "Agregar material a la biblioteca"}
            </h2>

            <div style={{ display: "grid", gap: "0.8rem" }}>
              <input
                type="text"
                placeholder="Título"
                value={form.titulo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, titulo: e.target.value }))
                }
                style={{
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #ddd4c7",
                }}
              />

              <input
                type="text"
                placeholder="Autores (separados por coma)"
                value={form.autores}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, autores: e.target.value }))
                }
                style={{
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #ddd4c7",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gap: "0.8rem",
                  gridTemplateColumns: "1fr 1fr 1fr",
                }}
              >
                <input
                  type="number"
                  placeholder="Año"
                  value={form.anio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, anio: e.target.value }))
                  }
                  style={{
                    padding: "0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #ddd4c7",
                  }}
                />

                <input
                  type="text"
                  placeholder="Tipo (Libro, Artículo, etc.)"
                  value={form.tipo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tipo: e.target.value }))
                  }
                  style={{
                    padding: "0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #ddd4c7",
                  }}
                />

                <input
                  type="text"
                  placeholder="Slug opcional"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  style={{
                    padding: "0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #ddd4c7",
                  }}
                />
              </div>

              <input
                type="text"
                placeholder="Editorial / fuente"
                value={form.editorial}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, editorial: e.target.value }))
                }
                style={{
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #ddd4c7",
                }}
              />

              <textarea
                placeholder="Descripción"
                value={form.descripcion}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                style={{
                  minHeight: "130px",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #ddd4c7",
                }}
              />

              <input
                type="text"
                placeholder="Enlace del documento (Drive u otro servidor)"
                value={form.enlace_url}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enlace_url: e.target.value }))
                }
                style={{
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #ddd4c7",
                }}
              />

              <div>
                <label style={{ display: "block", marginBottom: "0.3rem" }}>
                  Portada opcional
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPortadaFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                <button
                  onClick={guardarItem}
                  disabled={subiendo}
                  style={{
                    padding: "0.85rem 1rem",
                    border: "1px solid #6b4f2a",
                    borderRadius: "8px",
                    background: "#6b4f2a",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {subiendo
                    ? "Guardando..."
                    : editingId
                    ? "Guardar cambios"
                    : "Agregar material"}
                </button>

                {editingId && (
                  <button
                    onClick={resetForm}
                    style={{
                      padding: "0.85rem 1rem",
                      border: "1px solid #999",
                      borderRadius: "8px",
                      background: "#ccc",
                      color: "#222",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.8rem",
            alignItems: "center",
            margin: "1.5rem 0 1rem 0",
          }}
        >
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              flex: "1 1 280px",
              minWidth: "220px",
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              fontSize: "1rem",
              fontFamily: "inherit",
            }}
          />

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              background: "white",
            }}
          >
            <option value="">Todos los tipos</option>
            {tiposDisponibles.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>

          <select
            value={anioFiltro}
            onChange={(e) => setAnioFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              background: "white",
            }}
          >
            <option value="">Todos los años</option>
            {aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </select>

          <select
            value={autorFiltro}
            onChange={(e) => setAutorFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              background: "white",
            }}
          >
            <option value="">Todos los autores</option>
            {autoresDisponibles.map((autor) => (
              <option key={autor} value={autor}>
                {autor}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setBusqueda("");
              setTipoFiltro("");
              setAnioFiltro("");
              setAutorFiltro("");
            }}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #6b4f2a",
              borderRadius: "8px",
              background: "#6b4f2a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Limpiar
          </button>
        </div>

        <p style={{ marginTop: "0.5rem" }}>
          {resultados.length} material{resultados.length !== 1 ? "es" : ""} encontrado
          {resultados.length !== 1 ? "s" : ""}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          {resultados.map((item) => (
            <article
              key={item.slug}
              style={{
                width: "350px",
                height: "450px",
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "12px",
                padding: "0.8rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ marginBottom: "0.8rem" }}>
                  <img
                    src={item.portada_url || "/placeholder-miembro.jpg"}
                    alt={item.titulo}
                    style={{
                      display: "block",
                      width: "150px",
                      height: "195px",
                      objectFit: "cover",
                      margin: "0 auto",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                    }}
                  />
                </div>

                <p
                  style={{
                    margin: "0 0 0.8rem 0",
                    fontWeight: "bold",
                    lineHeight: 1.25,
                    fontSize: "0.95rem",
                    minHeight: "95px",
                  }}
                >
                  {item.titulo}
                </p>

                <p style={{ margin: 0, lineHeight: 1.2, fontSize: "0.9rem" }}>
                  {(item.autores || []).join(", ")}
                </p>

                <p style={{ margin: 0, lineHeight: 1.2, fontSize: "0.9rem" }}>
                  {item.editorial || ""}
                </p>

                <p style={{ margin: 0, lineHeight: 1.2, fontSize: "0.9rem" }}>
                  {item.anio || ""}
                </p>
              </div>

              <div style={{ marginTop: "0.8rem" }}>
                <Link
                  href={`/miembros/biblioteca/${item.slug}`}
                  style={{
                    display: "inline-block",
                    fontWeight: "bold",
                    color: "#4d371c",
                    textDecoration: "none",
                    marginRight: "0.8rem",
                  }}
                >
                  Ver más
                </Link>

                {esConsejo && (
                  <>
                    <button
                      onClick={() => editarItem(item)}
                      style={{
                        marginRight: "0.5rem",
                        border: "none",
                        background: "transparent",
                        color: "#6b6f1a",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => eliminarItem(item.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#8b3a3a",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}

          {resultados.length === 0 && (
            <div
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              No se encontraron materiales que coincidan con la búsqueda o los filtros seleccionados.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
