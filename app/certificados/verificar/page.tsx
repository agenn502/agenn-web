"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerificarCertificadoPage() {
  const router = useRouter();

  const [registro, setRegistro] = useState("");
  const [error, setError] = useState("");

  const verificar = (event: React.FormEvent) => {
    event.preventDefault();

    const valor = registro.trim().toUpperCase();

    if (!valor) {
      setError("Ingrese el registro del certificado.");
      return;
    }

    setError("");

    router.push(
      `/certificados/verificar/${encodeURIComponent(valor)}`
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f2",
        padding: "3rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
          }}
        >
          <p
            style={{
              margin: "0 0 0.4rem",
              color: "#6b6f1a",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: "0.82rem",
            }}
          >
            Academia Guatemalteca de Estudios Numismáticos y Notafílicos
          </p>

          <h1
            style={{
              marginTop: 0,
              color: "#4d371c",
            }}
          >
            Verificación de certificados
          </h1>

          <p
            style={{
              lineHeight: 1.8,
              color: "#555",
            }}
          >
            Ingrese el registro institucional que aparece en el
            certificado para comprobar su autenticidad y vigencia.
          </p>

          <form
            onSubmit={verificar}
            style={{
              marginTop: "2rem",
            }}
          >
            <label
              htmlFor="registro"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: 700,
                color: "#4d371c",
              }}
            >
              Registro del certificado
            </label>

            <input
              id="registro"
              type="text"
              value={registro}
              onChange={(e) => setRegistro(e.target.value)}
              placeholder="Ej. AGENN-INV-2026-000001"
              autoComplete="off"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.9rem 1rem",
                border: "1px solid #cbbfa9",
                borderRadius: "8px",
                fontSize: "1rem",
                textTransform: "uppercase",
              }}
            />

            {error && (
              <div
                style={{
                  marginTop: "0.8rem",
                  background: "#f8ecec",
                  border: "1px solid #ebc8c8",
                  borderRadius: "8px",
                  padding: "0.8rem",
                  color: "#8b2f2f",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                marginTop: "1rem",
                background: "#6b6f1a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.9rem 1.3rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Verificar certificado
            </button>
          </form>

          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid #eee7dc",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#666",
                lineHeight: 1.7,
                fontSize: "0.92rem",
              }}
            >
              Cada certificado emitido por la AGENN posee un registro
              institucional único y permanente. Este registro permite
              comprobar los datos de la acreditación sin depender del
              código de miembro que la persona utilice en otros niveles
              académicos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}