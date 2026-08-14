"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type TextoCertificado = {
  nivel: string;
  origen: string;
  nombreNivel: string;
  institucion: string[];
  autoridad: string;
  otorgamiento: string;
  textoAntesNivel: string;
  justificacion: string[];
  leyendaOrigen: string;
};

type Certificado = {
  id: string;
  registro: string;
  codigoMiembro: string;
  nombre: string;
  nivel: "NOV" | "INV" | "NUM";
  origenAcreditacion: "FORMACION" | "RECONOCIMIENTO";
  fechaEmision: string;
  estado: string;
  createdAt: string;
  texto: TextoCertificado;
  plantilla: string;
};

export default function VerificarCertificadoPage() {
  const params = useParams();

  const registro = String(
    params?.registro || ""
  )
    .trim()
    .toUpperCase();

  const [certificado, setCertificado] =
    useState<Certificado | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        setError("");

        if (!registro) {
          throw new Error(
            "No se indicó un registro de certificado."
          );
        }

        const response = await fetch(
          `/api/certificados/${encodeURIComponent(
            registro
          )}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ||
              "No fue posible verificar el certificado."
          );
        }

        setCertificado(
          result.certificado
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible verificar el certificado."
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [registro]);

  const nombreNivel = (
    nivel: string
  ) => {
    if (nivel === "NOV") {
      return "Académico Novicio";
    }

    if (nivel === "INV") {
      return "Académico Investigador";
    }

    if (nivel === "NUM") {
      return "Académico Numerario";
    }

    return nivel;
  };

  const nombreOrigen = (
    origen: string
  ) => {
    if (
      origen === "FORMACION"
    ) {
      return "Acreditación obtenida mediante formación";
    }

    if (
      origen === "RECONOCIMIENTO"
    ) {
      return "Acreditación por méritos reconocidos";
    }

    return origen;
  };

  const formatearFecha = (
    fecha: string
  ) => {
    try {
      return new Intl.DateTimeFormat(
        "es-GT",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(
        new Date(fecha)
      );
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        Verificando certificado...
      </div>
    );
  }

  if (
    error ||
    !certificado
  ) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            border:
              "1px solid #ebc8c8",
            borderRadius:
              "16px",
            padding: "2rem",
          }}
        >
          <p
            style={{
              margin:
                "0 0 0.4rem",
              color:
                "#8b2f2f",
              fontWeight:
                700,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              fontSize:
                "0.82rem",
            }}
          >
            Verificación AGENN
          </p>

          <h1
            style={{
              marginTop: 0,
            }}
          >
            Certificado no verificado
          </h1>

          <div
            style={{
              background:
                "#f8ecec",
              border:
                "1px solid #ebc8c8",
              borderRadius:
                "10px",
              padding:
                "1rem",
              color:
                "#8b2f2f",
              lineHeight:
                1.7,
            }}
          >
            {error ||
              "No se encontró un certificado con ese registro."}
          </div>
        </div>
      </div>
    );
  }

  const esVigente =
    certificado.estado ===
    "vigente";

  return (
    <div
      style={{
        maxWidth: "820px",
        margin: "3rem auto",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "white",
          border:
            "1px solid #ddd4c7",
          borderRadius:
            "16px",
          padding: "2rem",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.06)",
        }}
      >
        <p
          style={{
            margin:
              "0 0 0.4rem",
            color:
              "#6b6f1a",
            fontWeight:
              700,
            textTransform:
              "uppercase",
            letterSpacing:
              "0.05em",
            fontSize:
              "0.82rem",
          }}
        >
          Academia Guatemalteca de Estudios Numismáticos y Notafílicos
        </p>

        <h1
          style={{
            marginTop: 0,
            color:
              "#4d371c",
          }}
        >
          Verificación de certificado
        </h1>

        <div
          style={{
            marginTop:
              "1.5rem",
            background:
              esVigente
                ? "#eef6e9"
                : "#f8ecec",
            border:
              esVigente
                ? "1px solid #cfe3c4"
                : "1px solid #ebc8c8",
            borderRadius:
              "12px",
            padding:
              "1.4rem",
            color:
              esVigente
                ? "#356128"
                : "#8b2f2f",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            {esVigente
              ? "✓ Certificado auténtico y vigente"
              : "Certificado no vigente"}
          </h2>

          <p
            style={{
              marginBottom: 0,
              lineHeight:
                1.8,
            }}
          >
            El registro consultado corresponde a un certificado
            emitido por la AGENN.
          </p>
        </div>

        <div
          style={{
            marginTop:
              "1.5rem",
            padding:
              "1.25rem",
            background:
              "#faf8f3",
            borderRadius:
              "12px",
          }}
        >
          <p
            style={{
              margin:
                "0.35rem 0",
            }}
          >
            <strong>
              Titular:
            </strong>{" "}
            {certificado.nombre}
          </p>

          <p
            style={{
              margin:
                "0.35rem 0",
            }}
          >
            <strong>
              Certificación:
            </strong>{" "}
            {nombreNivel(
              certificado.nivel
            )}
          </p>

          <p
            style={{
              margin:
                "0.35rem 0",
            }}
          >
            <strong>
              Tipo de acreditación:
            </strong>{" "}
            {nombreOrigen(
              certificado.origenAcreditacion
            )}
          </p>

          <p
            style={{
              margin:
                "0.35rem 0",
            }}
          >
            <strong>
              Fecha de emisión:
            </strong>{" "}
            {formatearFecha(
              certificado.fechaEmision
            )}
          </p>

          <p
            style={{
              margin:
                "0.35rem 0",
            }}
          >
            <strong>
              Registro institucional:
            </strong>{" "}
            {certificado.registro}
          </p>

          <p
            style={{
              margin:
                "0.35rem 0",
            }}
          >
            <strong>
              Estado:
            </strong>{" "}
            {certificado.estado}
          </p>
        </div>

        <p
          style={{
            marginTop:
              "1.5rem",
            marginBottom: 0,
            color:
              "#666",
            fontSize:
              "0.9rem",
            lineHeight:
              1.7,
          }}
        >
          Este registro es único y permanente y permite comprobar
          la autenticidad documental de la acreditación académica.
        </p>
      </div>
    </div>
  );
}