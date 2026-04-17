"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type Documento = {
  id: string;
  slug: string;
  titulo: string;
  portada_url: string | null;
  documento_url: string;
  descripcion?: string | null;
  created_at?: string;
};

const initialForm = {
  titulo: "",
  slug: "",
  descripcion: "",
};

export default function DocumentosOficialesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
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

    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/documentos", {
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        alert(result.error || "Error al cargar documentos");
        setDocumentos([]);
      } else {
        setDocumentos(result.documentos || []);
      }
    } catch (err) {
      console.error("Error al cargar documentos:", err);
      alert("No se pudieron cargar los documentos.");
    } finally {
      setLoading(false);
    }
  };

  const resultados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();

    return documentos.filter((doc) => {
      const texto = [doc.titulo, doc.descripcion || ""].join(" ").toLowerCase();
      return !termino || texto.includes(termino);
    });
  }, [documentos, busqueda]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setPortadaFile(null);
    setDocumentoFile(null);
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      alert("Debes ingresar el título.");
      return;
    }

    if (!editingId && !documentoFile) {
      alert("Debes subir el archivo del documento.");
      return;
    }

    try {
      setSubiendo(true);

      const formData = new FormData();
      formData.append("titulo", form.titulo.trim());
      formData.append("slug", form.slug.trim());
      formData.append("descripcion", form.descripcion.trim());

      if (portadaFile) {
        formData.append("portada", portadaFile);
      }

      if (documentoFile) {
        formData.append("documento", documentoFile);
      }

      const res = await fetch(
        editingId ? `/api/documentos/${editingId}` : "/api/documentos",
        {
          method: editingId ? "PUT" : "POST",
          body: formData,
        }
      );

      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.error || "No se pudo guardar el documento.");
      }

      alert(
        editingId
          ? "Documento actualizado correctamente."
          : "Documento creado correctamente."
      );

      resetForm();
      await cargarDocumentos();
    } catch (err: any) {
      alert("Error al guardar documento: " + err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const editarDocumento = (doc: Documento) => {
    setEditingId(doc.id);
    setForm({
      titulo: doc.titulo,
      slug: doc.slug,
      descripcion: doc.descripcion || "",
    });
    setPortadaFile(null);
    setDocumentoFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarDocumento = async (id: string) => {
    const ok = window.confirm("¿Deseas eliminar este documento?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/documentos/${id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        alert("Error al eliminar: " + (result.error || "Error desconocido"));
        return;
      }

      alert("Documento eliminado.");
      await cargarDocumentos();
    } catch (err) {
      console.error("Error al eliminar documento:", err);
      alert("No se pudo eliminar el documento.");
    }
  };

  if (loading) return <div>Cargando documentos oficiales...</div>;
  if (!user) return <div>Cargando usuario...</div>;

  return (
    <section>
      <div>
        <h1>Documentos oficiales</h1>
        <p style={{ lineHeight: 1.8 }}>
          En esta sección se reúnen los documentos institucionales de la Academia,
          disponibles para consulta de los miembros autorizados.
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
              {editingId ? "Editar documento" : "Subir nuevo documento"}
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

              <textarea
                placeholder="Descripción opcional"
                value={form.descripcion}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                style={{
                  minHeight: "110px",
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

              <div>
                <label style={{ display: "block", marginBottom: "0.3rem" }}>
                  Documento
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setDocumentoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                <button
                  onClick={handleSubmit}
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
                    : "Subir documento"}
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
            placeholder="Buscar documento..."
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

          <button
            onClick={() => setBusqueda("")}
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
          {resultados.length} documento{resultados.length !== 1 ? "s" : ""} encontrado
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
          {resultados.map((doc) => (
            <article
              key={doc.id}
              style={{
                width: "320px",
                minHeight: "250px",
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
                    src={doc.portada_url || "/placeholder-miembro.jpg"}
                    alt={doc.titulo}
                    style={{
                      display: "block",
                      width: "120px",
                      height: "155px",
                      objectFit: "cover",
                      margin: "0 auto",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                    }}
                  />
                </div>

                <p
                  style={{
                    margin: "0 0 0.6rem 0",
                    fontWeight: "bold",
                    lineHeight: 1.3,
                    fontSize: "0.98rem",
                    minHeight: "62px",
                  }}
                >
                  {doc.titulo}
                </p>

                {doc.descripcion && (
                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.45,
                      fontSize: "0.88rem",
                      color: "#555",
                    }}
                  >
                    {doc.descripcion.length > 90
                      ? doc.descripcion.slice(0, 90) + "..."
                      : doc.descripcion}
                  </p>
                )}
              </div>

              <div style={{ marginTop: "0.8rem" }}>
                <a
                  href={doc.documento_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    fontWeight: "bold",
                    color: "#4d371c",
                    textDecoration: "none",
                    marginRight: "0.8rem",
                  }}
                >
                  Ver documento
                </a>

                {esConsejo && (
                  <>
                    <button
                      onClick={() => editarDocumento(doc)}
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
                      onClick={() => eliminarDocumento(doc.id)}
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
              No se encontraron documentos que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}