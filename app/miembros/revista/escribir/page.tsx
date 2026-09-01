"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";

type Miembro = { id: number; codigo: string; nombre: string; nivel: string };
type Tema = { id: number; nombre: string; descripcion: string | null };
type Subtema = { id: number; tema_id: number; nombre: string };
type Periodo = {
  id: number;
  nombre: string;
  anio_inicio: number | null;
  anio_fin: number | null;
};

const BORRADOR_LOCAL_KEY = "revista-nuevo-manuscrito";

function codigoLocal() {
  const stored = localStorage.getItem("user");
  if (!stored) return "";
  try {
    return String(JSON.parse(stored).codigo || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export default function EscribirEnsayoPage() {
  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [titulo, setTitulo] = useState("");
  const [temaId, setTemaId] = useState("");
  const [subtemaId, setSubtemaId] = useState("");
  const [secundarios, setSecundarios] = useState<number[]>([]);
  const [alcance, setAlcance] = useState("");
  const [anioInicio, setAnioInicio] = useState("");
  const [anioFin, setAnioFin] = useState("");
  const [palabras, setPalabras] = useState("");
  const [solicitudId, setSolicitudId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(BORRADOR_LOCAL_KEY);
      const datos = guardado ? JSON.parse(guardado) : {};

      setTitulo(String(datos.titulo || ""));
      setTemaId(String(datos.temaId || ""));
      setSubtemaId(String(datos.subtemaId || ""));
      setSecundarios(Array.isArray(datos.secundarios) ? datos.secundarios : []);
      setAlcance(String(datos.alcance || ""));
      setAnioInicio(String(datos.anioInicio || ""));
      setAnioFin(String(datos.anioFin || ""));
      setPalabras(String(datos.palabras || ""));
      setSolicitudId(String(datos.solicitudId || crypto.randomUUID()));
    } catch {
      setSolicitudId(crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    if (!solicitudId) return;
    localStorage.setItem(
      BORRADOR_LOCAL_KEY,
      JSON.stringify({
        titulo,
        temaId,
        subtemaId,
        secundarios,
        alcance,
        anioInicio,
        anioFin,
        palabras,
        solicitudId,
      })
    );
  }, [
    titulo,
    temaId,
    subtemaId,
    secundarios,
    alcance,
    anioInicio,
    anioFin,
    palabras,
    solicitudId,
  ]);

  useEffect(() => {
    const cargar = async () => {
      const codigo = codigoLocal();
      if (!codigo) {
        window.location.href = "/login";
        return;
      }
      try {
        const [respuestaMiembro, respuestaCatalogos] = await Promise.all([
          fetch("/api/revista/mis-manuscritos", {
            headers: { "x-user-codigo": codigo },
            cache: "no-store",
          }),
          fetch("/api/revista/catalogos", { cache: "no-store" }),
        ]);
        const datosMiembro = await respuestaMiembro.json();
        const catalogos = await respuestaCatalogos.json();

        if (!respuestaMiembro.ok || !datosMiembro?.ok) {
          throw new Error(datosMiembro?.error || "No fue posible identificar al miembro.");
        }
        if (!respuestaCatalogos.ok || !catalogos?.ok) {
          throw new Error(catalogos?.error || "No fue posible cargar los temas.");
        }

        const codigoReal = String(datosMiembro.miembro?.codigo || "").toUpperCase();
        if (!codigoReal.startsWith("INV") && !codigoReal.startsWith("NUM")) {
          throw new Error(
            "Esta opción está disponible únicamente para Investigadores acreditados y miembros Numerarios."
          );
        }

        setMiembro(datosMiembro.miembro);
        setTemas(catalogos.temas || []);
        setSubtemas(catalogos.subtemas || []);
        setPeriodos(catalogos.periodos || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible preparar el formulario.");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const subtemasDisponibles = useMemo(
    () => subtemas.filter((item) => item.tema_id === Number(temaId)),
    [subtemas, temaId]
  );
  const secundariosDisponibles = useMemo(
    () => temas.filter((item) => item.id !== Number(temaId)),
    [temas, temaId]
  );

  const cambiarTema = (valor: string) => {
    setTemaId(valor);
    setSubtemaId("");
    setSecundarios((actuales) => actuales.filter((id) => id !== Number(valor)));
  };

  const alternarSecundario = (id: number) => {
    setSecundarios((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id]
    );
  };

  const crear = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (titulo.trim().length < 10) return setError("El título debe contener al menos 10 caracteres.");
    if (!temaId) return setError("Seleccione un tema principal.");
    if (alcance === "PERSONALIZADO" && !anioInicio && !anioFin) {
      return setError("Indique al menos uno de los años del intervalo personalizado.");
    }
    if (anioInicio && anioFin && Number(anioInicio) > Number(anioFin)) {
      return setError("El año inicial no puede ser posterior al año final.");
    }

    setCreando(true);
    try {
      const response = await fetch("/api/revista/mis-manuscritos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({
          solicitud_id: solicitudId,
          titulo: titulo.trim(),
          tema_id: Number(temaId),
          subtema_id: subtemaId ? Number(subtemaId) : null,
          temas_secundarios: secundarios,
          periodo_id: alcance && alcance !== "PERSONALIZADO" ? Number(alcance) : null,
          anio_inicio: alcance === "PERSONALIZADO" && anioInicio ? Number(anioInicio) : null,
          anio_fin: alcance === "PERSONALIZADO" && anioFin ? Number(anioFin) : null,
          palabras_clave: palabras.split(",").map((p) => p.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible crear el borrador.");
      }
      localStorage.removeItem(BORRADOR_LOCAL_KEY);
      window.location.href = `/miembros/revista/mis-manuscritos/${result.manuscrito_id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el borrador.");
      setCreando(false);
    }
  };

  if (cargando) return <p>Cargando formulario editorial...</p>;

  return (
    <div style={{ maxWidth: "860px" }}>
      <p style={sobreTitulo}>Revista AGENN · Participación</p>
      <h1 style={{ color: "#4d371c" }}>Escribir ensayo</h1>
      <p style={introduccion}>
        Cree el borrador y continúe en el editor completo. El tema principal
        facilita la organización; los demás criterios son opcionales.
      </p>
      {error && <div style={errorEstilo}>{error}</div>}

      {miembro && (
        <form onSubmit={crear} style={formulario}>
          <div style={autorEstilo}>
            <span style={{ color: "#666" }}>Autor</span>
            <strong>{miembro.nombre}</strong>
            <span style={{ color: "#6b6f1a", fontWeight: 700 }}>{miembro.codigo}</span>
          </div>

          <Campo etiqueta="Título inicial del ensayo" requerido>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={250}
              required
              autoFocus
              style={control}
              placeholder="Podrá modificarlo posteriormente en el editor"
            />
          </Campo>

          <Campo etiqueta="Tema principal" requerido>
            <select value={temaId} onChange={(e) => cambiarTema(e.target.value)} required style={control}>
              <option value="">Seleccione un tema</option>
              {temas.map((tema) => <option key={tema.id} value={tema.id}>{tema.nombre}</option>)}
            </select>
          </Campo>

          <Campo etiqueta="Subtema" opcional>
            <select
              value={subtemaId}
              onChange={(e) => setSubtemaId(e.target.value)}
              disabled={!temaId || subtemasDisponibles.length === 0}
              style={control}
            >
              <option value="">Sin subtema específico</option>
              {subtemasDisponibles.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>

          {temaId && (
            <fieldset style={fieldset}>
              <legend style={legend}>Temas secundarios <span style={opcional}>(opcionales)</span></legend>
              <div style={casillas}>
                {secundariosDisponibles.map((tema) => (
                  <label key={tema.id} style={casilla}>
                    <input
                      type="checkbox"
                      checked={secundarios.includes(tema.id)}
                      onChange={() => alternarSecundario(tema.id)}
                    />
                    {tema.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <Campo etiqueta="Alcance temporal" opcional>
            <select
              value={alcance}
              onChange={(e) => {
                setAlcance(e.target.value);
                if (e.target.value !== "PERSONALIZADO") {
                  setAnioInicio("");
                  setAnioFin("");
                }
              }}
              style={control}
            >
              <option value="">Sin delimitación temporal</option>
              {periodos.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}
              <option value="PERSONALIZADO">Intervalo personalizado</option>
            </select>
          </Campo>

          {alcance === "PERSONALIZADO" && (
            <div style={dosColumnas}>
              <Campo etiqueta="Año inicial" opcional>
                <input type="number" min={1} max={2200} value={anioInicio} onChange={(e) => setAnioInicio(e.target.value)} style={control} placeholder="1874" />
              </Campo>
              <Campo etiqueta="Año final" opcional>
                <input type="number" min={1} max={2200} value={anioFin} onChange={(e) => setAnioFin(e.target.value)} style={control} placeholder="2025" />
              </Campo>
            </div>
          )}

          <Campo etiqueta="Palabras clave" opcional>
            <input value={palabras} onChange={(e) => setPalabras(e.target.value)} style={control} placeholder="Sepárelas con comas" />
            <small style={ayuda}>Ejemplo: billete guatemalteco, diseño, iconografía, transformación</small>
          </Campo>

          <div style={acciones}>
            <Link href="/miembros/revista" style={botonSecundario}>Cancelar</Link>
            <button type="submit" disabled={creando} style={botonPrincipal}>
              {creando ? "Guardando borrador..." : "Crear y guardar borrador"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Campo({ etiqueta, requerido, opcional: esOpcional, children }: {
  etiqueta: string;
  requerido?: boolean;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={etiquetaEstilo}>
      <span>{etiqueta} {requerido && <span style={asterisco}>*</span>}{esOpcional && <span style={opcional}> (opcional)</span>}</span>
      {children}
    </label>
  );
}

const sobreTitulo: CSSProperties = { color: "#6b6f1a", fontWeight: 700, textTransform: "uppercase", fontSize: "0.82rem", letterSpacing: "0.05em" };
const introduccion: CSSProperties = { lineHeight: 1.8, color: "#555", textAlign: "justify" };
const formulario: CSSProperties = { marginTop: "1.5rem", padding: "1.5rem", border: "1px solid #ddd4c7", borderRadius: "12px", background: "white", display: "grid", gap: "1.25rem" };
const autorEstilo: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem", padding: "0.9rem 1rem", borderRadius: "8px", background: "#f4f1e8" };
const etiquetaEstilo: CSSProperties = { display: "grid", gap: "0.45rem", color: "#4d371c", fontWeight: 700 };
const control: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "0.8rem 0.9rem", border: "1px solid #c8beb0", borderRadius: "8px", background: "white", color: "#222", font: "inherit", fontWeight: 400 };
const fieldset: CSSProperties = { margin: 0, padding: "1rem", border: "1px solid #d8d0c2", borderRadius: "8px" };
const legend: CSSProperties = { padding: "0 0.35rem", color: "#4d371c", fontWeight: 700 };
const casillas: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.7rem 1rem" };
const casilla: CSSProperties = { display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#444", lineHeight: 1.4 };
const dosColumnas: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" };
const acciones: CSSProperties = { display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: "0.75rem" };
const botonPrincipal: CSSProperties = { border: 0, borderRadius: "8px", padding: "0.85rem 1.15rem", background: "#6b6f1a", color: "white", fontWeight: 700, cursor: "pointer" };
const botonSecundario: CSSProperties = { border: "1px solid #b9b0a3", borderRadius: "8px", padding: "0.78rem 1rem", color: "#4d371c", fontWeight: 700, textDecoration: "none" };
const errorEstilo: CSSProperties = { marginTop: "1rem", padding: "0.9rem 1rem", borderRadius: "8px", border: "1px solid #d28b8b", background: "#fff3f3", color: "#7a1f1f" };
const asterisco: CSSProperties = { color: "#9e2424" };
const opcional: CSSProperties = { color: "#777", fontWeight: 400 };
const ayuda: CSSProperties = { color: "#777", fontWeight: 400 };