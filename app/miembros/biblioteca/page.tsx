"use client";

import { useEffect, useMemo, useState } from "react";
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
  created_at?: string;
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

    cargarBiblioteca();
  }, []);

  const cargarBiblioteca = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/biblioteca", {
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

  const guardarItem = async () => {
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
      await cargarBiblioteca();
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
    const ok = window.confirm("¿Deseas eliminar este material de la biblioteca?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/biblioteca/${id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        alert("Error al eliminar: " + (result.error || "Error desconocido"));
        return;
      }

      alert("Material eliminado.");
      await cargarBiblioteca();
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