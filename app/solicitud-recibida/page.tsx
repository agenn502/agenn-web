"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SolicitudRecibidaContenido() {
  const searchParams = useSearchParams();
  const codigo = searchParams.get("codigo") || "";

  return (
    <section className="section">
      <div
        className="container content-page"
        style={{ maxWidth: "760px", textAlign: "center" }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "2rem",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#eef6e9",
              color: "#4f7f3b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "2rem",
              fontWeight: 700,
            }}
          >
            ✓
          </div>

          <h1 style={{ marginTop: 0 }}>Solicitud recibida</h1>

          <p style={{ lineHeight: 1.8 }}>
            Su solicitud para ingresar al proceso formativo de la Academia
            Guatemalteca de Estudios Numismáticos y Notafílicos fue recibida
            correctamente.
          </p>

          {codigo && (
            <div
              style={{
                background: "#f8f5ef",
                border: "1px solid #ddd4c7",
                borderRadius: "10px",
                padding: "1rem",
                margin: "1.5rem 0",
              }}
            >
              <p style={{ margin: 0, color: "#666" }}>
                Número de solicitud
              </p>

              <p
                style={{
                  margin: "0.35rem 0 0",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#6b4f2a",
                  letterSpacing: "0.05em",
                }}
              >
                {codigo}
              </p>
            </div>
          )}

          <p style={{ lineHeight: 1.8 }}>
            El Consejo Académico revisará la información proporcionada. Recibirá
            por correo electrónico la resolución de su solicitud o, si fuera
            necesario, una petición para completar o corregir algún dato.
          </p>

          <p style={{ lineHeight: 1.8 }}>
            Conserve el número de solicitud para cualquier consulta relacionada
            con su proceso de admisión.
          </p>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: "1.5rem",
            }}
          >
            <Link href="/" className="button primary">
              Volver al inicio
            </Link>

            <Link href="/miembro" className="button secondary">
              Ver información de afiliación
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SolicitudRecibidaPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div
            className="container content-page"
            style={{ maxWidth: "760px", textAlign: "center" }}
          >
            <p>Cargando confirmación...</p>
          </div>
        </section>
      }
    >
      <SolicitudRecibidaContenido />
    </Suspense>
  );
}
