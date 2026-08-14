"use client";

import { useState } from "react";

type Props = {
  asimilacionId: number;
  userCodigo: string;
  puedeVotar: boolean;
  votosEmitidos: number;
  totalConsejo: number;
  votosFavor: number;
  votosContra: number;
  onActualizado: () => void;
};

export default function VotacionAsimilacion({
  asimilacionId,
  userCodigo,
  puedeVotar,
  votosEmitidos,
  totalConsejo,
  votosFavor,
  votosContra,
  onActualizado,
}: Props) {
  const [comentario, setComentario] = useState("");
  const [mostrarContra, setMostrarContra] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function votar(voto: "favor" | "contra") {
    if (voto === "contra" && comentario.trim() === "") {
      alert("Debe indicar la razón del voto en contra.");
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch("/api/asimilaciones/votar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asimilacionId,
          consejeroCodigo: userCodigo,
          voto,
          comentario,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error);
      }

      onActualizado();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el voto."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "1.5rem",
        borderTop: "1px solid #ddd",
        paddingTop: "1rem",
      }}
    >
      <strong>
        Votación del Consejo Académico
      </strong>

      <p style={{ marginTop: ".5rem" }}>
        Votos emitidos:
        <strong>
          {" "}
          {votosEmitidos} de {totalConsejo}
        </strong>
      </p>

      <p>
        ✅ A favor: {votosFavor}
        <br />
        ❌ En contra: {votosContra}
      </p>

      {!puedeVotar && (
        <div
          style={{
            background: "#eef6e9",
            padding: "1rem",
            borderRadius: 8,
          }}
        >
          Usted ya emitió su voto para esta propuesta.
        </div>
      )}

      {puedeVotar && (
        <>
          <div
            style={{
              display: "flex",
              gap: ".75rem",
              marginTop: "1rem",
              flexWrap: "wrap",
            }}
          >
            <button
              disabled={enviando}
              onClick={() => votar("favor")}
              style={{
                background: "#2d7d32",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: ".8rem 1.2rem",
                cursor: "pointer",
              }}
            >
              Aprobar propuesta
            </button>

            <button
              disabled={enviando}
              onClick={() => setMostrarContra(!mostrarContra)}
              style={{
                background: "#b33a3a",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: ".8rem 1.2rem",
                cursor: "pointer",
              }}
            >
              No aprobar
            </button>
          </div>

          {mostrarContra && (
            <div style={{ marginTop: "1rem" }}>
              <textarea
                value={comentario}
                onChange={(e) =>
                  setComentario(e.target.value)
                }
                placeholder="Indique las razones de su voto en contra."
                rows={5}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  padding: ".8rem",
                }}
              />

              <button
                disabled={enviando}
                onClick={() => votar("contra")}
                style={{
                  marginTop: ".8rem",
                  background: "#b33a3a",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: ".8rem 1.2rem",
                  cursor: "pointer",
                }}
              >
                Confirmar voto en contra
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
