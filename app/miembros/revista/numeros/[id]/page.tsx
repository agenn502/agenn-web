"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Numero = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
  mes_publicacion: number | null;
  titulo: string | null;
  subtitulo: string | null;
  portada_url: string | null;
  editorial: string | null;
  estado: string;
  fecha_publicacion: string | null;
  slug: string | null;
};

type Autor = { id: number; codigo: string; nombre: string; nivel: string };

type VersionResumen = {
  id: number;
  manuscrito_id: number;
  numero_version: number;
  titulo: string;
  created_at: string;
};

type Articulo = {
  id: number;
  revista_id: number;
  manuscrito_id: number;
  version_id: number;
  seccion: string | null;
  orden: number;
  localizador: string | null;
  manuscrito: {
    id: number;
    titulo_actual: string;
    tipo_contenido: string;
    origen: string;
    estado: string;
    tema: string | null;
    autor: Autor | null;
  } | null;
  version: VersionResumen | null;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function nombreMes(mes: number | null) {
  if (!mes || mes < 1 || mes > 12) return null;
  return MESES[mes - 1];
}

function codigoLocal() {
  const stored = localStorage.getItem("user");
  if (!stored) return "";
  try {
    const user = JSON.parse(stored);
    return String(user.codigo || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function tipoContenidoTexto(tipo: string | null | undefined) {
  const etiquetas: Record<string, string> = {
    ENSAYO: "Ensayo",
    ARTICULO: "Artículo",
    ESTUDIO: "Estudio",
    NOTA_INVESTIGACION: "Nota de investigación",
    NOTA_BREVE: "Nota breve",
    RESENA: "Reseña bibliográfica",
  };

  return etiquetas[String(tipo || "").toUpperCase()] || tipo || "Sin tipo";
}

export default function GestionNumeroPage() {
  const params = useParams();
  const id = String(params.id || "");

  const [numero, setNumero] = useState<Numero | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [volumen, setVolumen] = useState("");
  const [numeroValor, setNumeroValor] = useState("");
  const [anio, setAnio] = useState("");
  const [mesPublicacion, setMesPublicacion] = useState("");
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [editorial, setEditorial] = useState("");

  const cargar = useCallback(async () => {
    const codigo = codigoLocal();
    if (!codigo) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/revista/numeros/${id}`, {
        headers: { "x-user-codigo": codigo },
        cache: "no-store",
      });

      const texto = await response.text();
      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible cargar el número.");
      }

      setNumero(result.numero);
      setArticulos(result.articulos || []);
      setVolumen(String(result.numero.volumen || 1));
      setNumeroValor(String(result.numero.numero));
      setAnio(String(result.numero.anio));
      setMesPublicacion(
        String(result.numero.mes_publicacion || new Date().getMonth() + 1),
      );
      setTitulo(result.numero.titulo || "");
      setSubtitulo(result.numero.subtitulo || "");
      setEditorial(result.numero.editorial || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible cargar el número.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = async (body: Record<string, unknown>) => {
    setProcesando(true);
    setError("");
    try {
      const response = await fetch(`/api/revista/numeros/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify(body),
      });

      const texto = await response.text();
      const result = texto ? JSON.parse(texto) : null;
      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible completar la operación.",
        );
      }

      await cargar();
      return result;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible completar la operación.",
      );
      return null;
    } finally {
      setProcesando(false);
    }
  };

  const guardarNumero = async () => {
    const result = await ejecutar({
      accion: "ACTUALIZAR_NUMERO",
      volumen: Number(volumen),
      numero: Number(numeroValor),
      anio: Number(anio),
      mes_publicacion: Number(mesPublicacion),
      titulo,
      subtitulo,
      editorial,
    });
    if (result) alert("Datos del número actualizados.");
  };

  const publicarNumero = async () => {
    const confirmar = window.confirm(
      "¿Publicar este número de Revista AGENN?\n\n" +
        "Antes de continuar, asegúrese de haber guardado la editorial, " +
        "verificado los trabajos y revisado la vista previa.\n\n" +
        "Mientras esté publicado, el contenido quedará bloqueado. Podrá despublicarlo desde esta misma pantalla si necesita corregirlo.",
    );

    if (!confirmar) return;

    const result = await ejecutar({
      accion: "PUBLICAR",
    });

    if (result) {
      alert("El número fue publicado correctamente.");
    }
  };

  const despublicarNumero = async () => {
    const confirmar = window.confirm(
      "¿Despublicar temporalmente este número?\n\n" +
        "Dejará de estar disponible para el público y volverá al estado EN_PREPARACION. " +
        "Los trabajos regresarán a ASIGNADO y conservarán sus versiones e historial.",
    );

    if (!confirmar) return;

    const result = await ejecutar({ accion: "DESPUBLICAR" });
    if (result) {
      alert("El número fue despublicado y volvió a preparación.");
    }
  };

  const quitar = async (articuloId: number) => {
    if (
      !confirm(
        "¿Retirar este trabajo del número? Volverá al Banco de publicables.",
      )
    )
      return;
    await ejecutar({ accion: "QUITAR", articulo_id: articuloId });
  };

  const actualizarArticulo = async (
    articulo: Articulo,
    seccion: string,
    orden: number,
  ) => {
    const result = await ejecutar({
      accion: "ACTUALIZAR_ARTICULO",
      articulo_id: articulo.id,
      seccion,
      orden,
    });
    if (result) alert("Datos editoriales del artículo actualizados.");
  };

  if (loading) return <p>Cargando número...</p>;

  if (!numero) {
    return (
      <div>
        <h1>Número de Revista AGENN</h1>
        <p>{error || "No se encontró el número."}</p>
        <Link href="/miembros/revista/numeros">
          ← Volver a Números de revista
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1150px" }}>
      <p
        style={{
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
        }}
      >
        Revista AGENN · Consejo Editorial
      </p>

      <h1 style={{ color: "#4d371c", marginBottom: "0.35rem" }}>
        Vol. {numero.volumen || "—"} · Núm. {numero.numero} ·{" "}
        {nombreMes(numero.mes_publicacion)
          ? `${nombreMes(numero.mes_publicacion)} de `
          : ""}
        {numero.anio}
      </h1>

      <div style={{ color: "#777", marginBottom: "1.5rem" }}>
        Estado: <strong>{numero.estado}</strong>
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <a
          href={`/revista/vista-previa/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#f0eadf",
            color: "#4d371c",
            border: "1px solid #b8ad9c",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Vista previa ↗
        </a>

        {numero.estado !== "PUBLICADA" ? (
          <button
            type="button"
            disabled={procesando}
            onClick={publicarNumero}
            style={{
              background: "#6b6f1a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontWeight: 700,
              cursor: procesando ? "not-allowed" : "pointer",
              opacity: procesando ? 0.65 : 1,
            }}
          >
            {procesando ? "Procesando..." : "Publicar número"}
          </button>
        ) : (
          <button
            type="button"
            disabled={procesando}
            onClick={despublicarNumero}
            style={{
              background: "white",
              color: "#8b2f2f",
              border: "1px solid #d3a0a0",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontWeight: 700,
              cursor: procesando ? "not-allowed" : "pointer",
              opacity: procesando ? 0.65 : 1,
            }}
          >
            {procesando ? "Procesando..." : "Despublicar número"}
          </button>
        )}
      </div>
      {error && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            color: "#7a1f1f",
            padding: "1rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <section style={seccion}>
        <h2 style={tituloSeccion}>Datos del número</h2>
        <p style={descripcion}>
          El título y subtítulo son opcionales. Pueden dejarse vacíos para
          números misceláneos.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
          }}
        >
          <Campo
            label="Volumen"
            value={volumen}
            onChange={setVolumen}
            type="number"
          />

          <Campo
            label="Número"
            value={numeroValor}
            onChange={setNumeroValor}
            type="number"
          />

          <Campo label="Año" value={anio} onChange={setAnio} type="number" />

          <CampoMes value={mesPublicacion} onChange={setMesPublicacion} />
        </div>

        <Campo
          label="Título especial (opcional)"
          value={titulo}
          onChange={setTitulo}
        />
        <Campo
          label="Subtítulo (opcional)"
          value={subtitulo}
          onChange={setSubtitulo}
        />

        <label
          style={{ display: "block", fontWeight: 700, marginBottom: "1rem" }}
        >
          Editorial / presentación del número
          <textarea
            value={editorial}
            onChange={(e) => setEditorial(e.target.value)}
            rows={6}
            style={input}
          />
        </label>

        <button
          type="button"
          disabled={procesando}
          onClick={guardarNumero}
          style={botonVerde}
        >
          Guardar datos del número
        </button>
      </section>

      <section style={seccion}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={tituloSeccion}>Contenido del número</h2>
            <p style={descripcion}>
              Los trabajos quedan vinculados a una versión específica para
              preservar la integridad editorial.
            </p>
          </div>
          <span style={contador}>{articulos.length}</span>
        </div>

        {numero.estado !== "PUBLICADA" && (
          <Link
            href={`/miembros/revista/banco?numero=${id}`}
            style={{
              display: "inline-block",
              marginBottom: "1.25rem",
              padding: "0.75rem 1rem",
              color: "white",
              background: "#356128",
              borderRadius: "8px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Ir al Banco de publicables
          </Link>
        )}

        {articulos.length === 0 ? (
          <div style={vacio}>Este número todavía no contiene trabajos.</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {articulos.map((articulo) => (
              <ArticuloNumero
                key={articulo.id}
                articulo={articulo}
                procesando={procesando}
                onGuardar={actualizarArticulo}
                onQuitar={quitar}
              />
            ))}
          </div>
        )}
      </section>

      <Link
        href="/miembros/revista/numeros"
        style={{ color: "#4d371c", fontWeight: 700, textDecoration: "none" }}
      >
        ← Volver a Números de revista
      </Link>
    </div>
  );
}

function CampoMes({
  value,
  onChange,
}: {
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <label
      style={{
        display: "block",
        fontWeight: 700,
        marginBottom: "1rem",
      }}
    >
      Mes editorial
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      >
        {MESES.map((mes, indice) => (
          <option key={mes} value={indice + 1}>
            {mes}
          </option>
        ))}
      </select>
    </label>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <label style={{ display: "block", fontWeight: 700, marginBottom: "1rem" }}>
      {label}
      <input
        type={type}
        min={type === "number" ? 1 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </label>
  );
}

function ArticuloNumero({
  articulo,
  procesando,
  onGuardar,
  onQuitar,
}: {
  articulo: Articulo;
  procesando: boolean;
  onGuardar: (
    articulo: Articulo,
    seccion: string,
    orden: number,
  ) => Promise<void>;
  onQuitar: (articuloId: number) => Promise<void>;
}) {
  const [seccionValor, setSeccionValor] = useState(
    articulo.seccion || "Ensayos",
  );
  const [ordenValor, setOrdenValor] = useState(String(articulo.orden));

  useEffect(() => {
    setSeccionValor(articulo.seccion || "Ensayos");
    setOrdenValor(String(articulo.orden));
  }, [articulo.seccion, articulo.orden]);

  return (
    <div
      style={{
        border: "1px solid #e2dbcf",
        borderRadius: "12px",
        padding: "1rem",
        background: "#faf8f2",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 500px" }}>
          <div
            style={{
              color: "#6b6f1a",
              fontWeight: 800,
              marginBottom: "0.3rem",
            }}
          >
            {articulo.localizador || "Sin localizador"}
          </div>
          <h3 style={{ margin: "0 0 0.5rem", color: "#4d371c" }}>
            {articulo.manuscrito?.titulo_actual ||
              articulo.version?.titulo ||
              "Trabajo sin título"}
          </h3>
          <div style={{ color: "#555", lineHeight: 1.7 }}>
            <strong>
              {articulo.manuscrito?.autor?.nombre || "Autor no identificado"}
            </strong>
            {articulo.manuscrito?.autor && (
              <> · {articulo.manuscrito.autor.codigo}</>
            )}
            <br />
            Tipo: {tipoContenidoTexto(articulo.manuscrito?.tipo_contenido)}
            <br />
            Versión congelada:{" "}
            <strong>{articulo.version?.numero_version || "—"}</strong>
          </div>
        </div>

        <Link
          href={`/miembros/revista/editorial/${articulo.manuscrito_id}`}
          style={{
            alignSelf: "flex-start",
            color: "#356128",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Ver manuscrito
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) 120px",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <Campo
          label="Sección"
          value={seccionValor}
          onChange={setSeccionValor}
        />
        <Campo
          label="Orden"
          value={ordenValor}
          onChange={setOrdenValor}
          type="number"
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={procesando}
          onClick={() => onGuardar(articulo, seccionValor, Number(ordenValor))}
          style={botonSecundario}
        >
          Guardar sección y orden
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={() => onQuitar(articulo.id)}
          style={botonRojo}
        >
          Quitar del número
        </button>
      </div>
    </div>
  );
}

const seccion: React.CSSProperties = {
  background: "white",
  border: "1px solid #ddd4c7",
  borderRadius: "14px",
  padding: "1.5rem",
  marginBottom: "1.5rem",
};
const tituloSeccion: React.CSSProperties = { marginTop: 0, color: "#4d371c" };
const descripcion: React.CSSProperties = { color: "#666", lineHeight: 1.7 };
const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "0.35rem",
  padding: "0.75rem",
  border: "1px solid #aaa",
  borderRadius: "8px",
  fontFamily: "inherit",
  fontWeight: 400,
};
const contador: React.CSSProperties = {
  background: "#f4f1e8",
  color: "#6b4f2a",
  borderRadius: "999px",
  padding: "0.35rem 0.7rem",
  fontWeight: 700,
};
const vacio: React.CSSProperties = {
  background: "#faf8f2",
  border: "1px dashed #cfc5b6",
  borderRadius: "10px",
  padding: "1rem",
  color: "#666",
};
const botonVerde: React.CSSProperties = {
  background: "#356128",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};
const botonSecundario: React.CSSProperties = {
  background: "white",
  color: "#4d371c",
  border: "1px solid #b8ad9c",
  borderRadius: "8px",
  padding: "0.7rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};
const botonRojo: React.CSSProperties = {
  background: "white",
  color: "#8b2f2f",
  border: "1px solid #d3a0a0",
  borderRadius: "8px",
  padding: "0.7rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
};