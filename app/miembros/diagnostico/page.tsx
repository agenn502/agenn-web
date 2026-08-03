"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  CONTINUIDAD,
  type EstadoModulo,
  type ModuloProyecto,
} from "@/content/continuidad";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
};

type PruebaTecnica = {
  nombre: string;
  estado: "comprobando" | "correcto" | "error";
  detalle: string;
};

const estilosEstado: Record<EstadoModulo, { etiqueta: string; fondo: string; borde: string }> = {
  operativo: { etiqueta: "✅ Operativo", fondo: "#eef7ea", borde: "#b9d7ad" },
  "en-desarrollo": { etiqueta: "🟡 En desarrollo", fondo: "#fff8e5", borde: "#e0c46c" },
  pendiente: { etiqueta: "⚪ Pendiente", fondo: "#f2f2f2", borde: "#cccccc" },
};

export default function DiagnosticoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [pruebas, setPruebas] = useState<PruebaTecnica[]>([
    { nombre: "Sesión local", estado: "comprobando", detalle: "Revisando usuario..." },
    { nombre: "Tabla progreso_novicio", estado: "comprobando", detalle: "Consultando Supabase..." },
    { nombre: "Tabla progreso_inv", estado: "comprobando", detalle: "Consultando Supabase..." },
    { nombre: "Tabla ensayos", estado: "comprobando", detalle: "Consultando Supabase..." },
  ]);

  useEffect(() => {
    const revisar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      let parsed: User;

      try {
        parsed = JSON.parse(stored) as User;
      } catch {
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      if (parsed.codigo !== CONTINUIDAD.propietarioCodigo) {
        setAccesoDenegado(true);
        return;
      }

      setUser(parsed);

      const resultados: PruebaTecnica[] = [
        {
          nombre: "Sesión local",
          estado: "correcto",
          detalle: `${parsed.nombre} — ${parsed.codigo}`,
        },
      ];

      const tablas = ["progreso_novicio", "progreso_inv", "ensayos"] as const;

      for (const tabla of tablas) {
        const { error } = await supabase
          .from(tabla)
          .select("*", { count: "exact", head: true });

        resultados.push({
          nombre: `Tabla ${tabla}`,
          estado: error ? "error" : "correcto",
          detalle: error ? error.message : "Disponible y accesible.",
        });
      }

      setPruebas(resultados);
    };

    revisar();
  }, []);

  const resumenTecnico = useMemo(() => {
    const errores = pruebas.filter((prueba) => prueba.estado === "error").length;
    const comprobando = pruebas.some((prueba) => prueba.estado === "comprobando");

    if (comprobando) return { texto: "Comprobando...", simbolo: "⏳" };
    if (errores > 0) return { texto: `${errores} problema(s) detectado(s)`, simbolo: "⚠️" };
    return { texto: "Comprobaciones básicas correctas", simbolo: "✅" };
  }, [pruebas]);

  if (accesoDenegado) {
    return (
      <div style={{ maxWidth: 760 }}>
        <h1>Acceso restringido</h1>
        <p>Este panel está disponible únicamente para el propietario del proyecto.</p>
        <Link href="/miembros">Volver al área de miembros</Link>
      </div>
    );
  }

  if (!user) return <div>Cargando panel de continuidad...</div>;

  return (
    <div style={{ maxWidth: 1050 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: 0, color: "#6b6f1a", fontWeight: 700 }}>AGENN v{CONTINUIDAD.version}</p>
        <h1 style={{ marginTop: "0.25rem", marginBottom: "0.5rem" }}>Estado y continuidad del proyecto</h1>
        <p style={{ margin: 0, color: "#555" }}>
          Última actualización: {CONTINUIDAD.ultimaActualizacion}
        </p>
      </div>

      <section style={tarjetaPrincipal}>
        <h2 style={{ marginTop: 0 }}>📍 ¿Dónde nos quedamos?</h2>
        <h3 style={{ marginBottom: "0.4rem", color: "#4f612f" }}>{CONTINUIDAD.ultimoHito.titulo}</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 0 }}>{CONTINUIDAD.ultimoHito.descripcion}</p>
      </section>

      <section style={{ ...tarjetaPrincipal, background: "#fff8e5", borderColor: "#e0c46c" }}>
        <h2 style={{ marginTop: 0 }}>▶ Siguiente paso recomendado</h2>
        <h3 style={{ marginBottom: "0.4rem", color: "#6a5200" }}>{CONTINUIDAD.siguientePaso.titulo}</h3>
        <p style={{ lineHeight: 1.7 }}>{CONTINUIDAD.siguientePaso.descripcion}</p>
        <Link href={CONTINUIDAD.siguientePaso.href} style={botonPrincipal}>
          Abrir Unidad 1 de NOV
        </Link>
      </section>

      <section style={{ ...tarjetaPrincipal, background: "#fff3f3", borderColor: "#d28b8b" }}>
        <h2 style={{ marginTop: 0 }}>⚠️ {CONTINUIDAD.recomendacionPrevia.titulo}</h2>
        <p style={{ lineHeight: 1.7, marginBottom: 0 }}>{CONTINUIDAD.recomendacionPrevia.descripcion}</p>
      </section>

      <h2>Diagnóstico rápido</h2>
      <div style={{ ...tarjetaPrincipal, marginBottom: "1.5rem" }}>
        <p style={{ marginTop: 0, fontWeight: 700 }}>
          {resumenTecnico.simbolo} {resumenTecnico.texto}
        </p>
        <div style={{ display: "grid", gap: "10px" }}>
          {pruebas.map((prueba) => (
            <div
              key={prueba.nombre}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.75rem",
                borderRadius: "8px",
                background: prueba.estado === "error" ? "#fff3f3" : "#f6f5f1",
              }}
            >
              <strong>{prueba.nombre}</strong>
              <span style={{ textAlign: "right" }}>
                {prueba.estado === "comprobando" ? "⏳" : prueba.estado === "correcto" ? "✅" : "❌"} {prueba.detalle}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h2>Estado de los módulos</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        {CONTINUIDAD.modulos.map((modulo: ModuloProyecto) => {
          const estilo = estilosEstado[modulo.estado];
          return (
            <article
              key={modulo.nombre}
              style={{ background: estilo.fondo, border: `1px solid ${estilo.borde}`, borderRadius: "12px", padding: "1rem" }}
            >
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700 }}>{estilo.etiqueta}</p>
              <h3 style={{ marginBottom: "0.4rem" }}>{modulo.nombre}</h3>
              <p style={{ lineHeight: 1.6 }}>{modulo.detalle}</p>
              {modulo.href && <Link href={modulo.href}>Abrir módulo →</Link>}
            </article>
          );
        })}
      </div>

      <h2 style={{ marginTop: "2rem" }}>Recordatorios de continuidad</h2>
      <section style={tarjetaPrincipal}>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          {CONTINUIDAD.recordatorios.map((recordatorio) => (
            <li key={recordatorio}>{recordatorio}</li>
          ))}
        </ul>
      </section>

      <h2 style={{ marginTop: "2rem" }}>Bitácora de incidencias</h2>
      <div style={{ display: "grid", gap: "12px" }}>
        {CONTINUIDAD.incidencias.map((incidencia) => (
          <article key={`${incidencia.fecha}-${incidencia.titulo}`} style={tarjetaPrincipal}>
            <p style={{ marginTop: 0, color: "#6b6f1a", fontWeight: 700 }}>{incidencia.fecha}</p>
            <h3>{incidencia.titulo}</h3>
            {incidencia.causa && <p><strong>Causa:</strong> {incidencia.causa}</p>}
            <p style={{ marginBottom: 0 }}><strong>Solución:</strong> {incidencia.solucion}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

const tarjetaPrincipal: React.CSSProperties = {
  background: "white",
  border: "1px solid #ddd4c7",
  borderRadius: "12px",
  padding: "1.2rem",
  marginBottom: "1rem",
};

const botonPrincipal: React.CSSProperties = {
  display: "inline-block",
  background: "#6b6f1a",
  color: "white",
  textDecoration: "none",
  padding: "0.7rem 1rem",
  borderRadius: "8px",
};
