"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export default function RecuperarPasswordPage() {
  const router =
    useRouter();

  const [
    codigo,
    setCodigo,
  ] = useState("");

  const [
    enviando,
    setEnviando,
  ] = useState(false);

  const [
    enviado,
    setEnviado,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const solicitar =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setError("");

      const codigoNormalizado =
        codigo
          .trim()
          .toUpperCase();

      if (!codigoNormalizado) {
        setError(
          "Debe indicar su código institucional."
        );

        return;
      }

      setEnviando(true);

      try {
        const response =
          await fetch(
            "/api/password/recuperar",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  codigo:
                    codigoNormalizado,
                }),
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
              "No fue posible procesar la solicitud."
          );
        }

        setEnviado(true);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible procesar la solicitud."
        );
      } finally {
        setEnviando(false);
      }
    };

  if (enviado) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          background:
            "#faf8f2",
          padding:
            "3rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth:
              "650px",
            margin:
              "0 auto",
            background:
              "white",
            border:
              "1px solid #ddd4c7",
            borderRadius:
              "16px",
            padding:
              "2rem",
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
            Revise su correo
          </h1>

          <div
            style={{
              background:
                "#eef6e9",
              border:
                "1px solid #cfe3c4",
              borderRadius:
                "12px",
              padding:
                "1.25rem",
              color:
                "#356128",
              lineHeight:
                1.8,
            }}
          >
            Si el código corresponde a una cuenta con correo
            registrado, recibirá un enlace para restablecer su
            contraseña.
          </div>

          <p
            style={{
              marginTop:
                "1.25rem",
              lineHeight:
                1.8,
              color:
                "#555",
            }}
          >
            El enlace tendrá una vigencia de 24 horas y podrá
            utilizarse una sola vez.
          </p>

          <div
            style={{
              marginTop:
                "1rem",
              background:
                "#fff8e5",
              border:
                "1px solid #dfc46b",
              borderRadius:
                "10px",
              padding:
                "1rem",
              lineHeight:
                1.7,
              color:
                "#6b5715",
            }}
          >
            <strong>¿No encuentra el correo?</strong>
            <br />
            Revise también las carpetas de Spam o Correo no deseado.
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/login"
              )
            }
            style={{
              marginTop:
                "1.5rem",
              background:
                "#6b6f1a",
              color:
                "white",
              border:
                "none",
              borderRadius:
                "8px",
              padding:
                "0.9rem 1.4rem",
              cursor:
                "pointer",
              fontWeight:
                700,
            }}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#faf8f2",
        padding:
          "3rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth:
            "650px",
          margin:
            "0 auto",
          background:
            "white",
          border:
            "1px solid #ddd4c7",
          borderRadius:
            "16px",
          padding:
            "2rem",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.05)",
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
          Recuperar contraseña
        </h1>

        <p
          style={{
            lineHeight:
              1.8,
            color:
              "#555",
          }}
        >
          Ingrese su código institucional. Si su cuenta tiene un
          correo electrónico registrado, le enviaremos un enlace
          seguro para crear una nueva contraseña.
        </p>

        <form
          onSubmit={
            solicitar
          }
          style={{
            marginTop:
              "1.5rem",
          }}
        >
          <label
            htmlFor="codigo"
            style={{
              display:
                "block",
              marginBottom:
                "0.4rem",
              fontWeight:
                700,
              color:
                "#4d371c",
            }}
          >
            Código institucional
          </label>

          <input
            id="codigo"
            type="text"
            value={
              codigo
            }
            onChange={(e) =>
              setCodigo(
                e.target.value
              )
            }
            placeholder="Ej. ASP0001, NOV0001, INV0002"
            autoComplete="username"
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                "0.9rem 1rem",
              border:
                "1px solid #cbbfa9",
              borderRadius:
                "8px",
              fontSize:
                "1rem",
              textTransform:
                "uppercase",
            }}
          />

          {error && (
            <div
              style={{
                marginTop:
                  "1rem",
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
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              enviando
            }
            style={{
              marginTop:
                "1.25rem",
              background:
                "#6b6f1a",
              color:
                "white",
              border:
                "none",
              borderRadius:
                "8px",
              padding:
                "0.9rem 1.4rem",
              cursor:
                enviando
                  ? "not-allowed"
                  : "pointer",
              fontWeight:
                700,
              opacity:
                enviando
                  ? 0.7
                  : 1,
            }}
          >
            {enviando
              ? "Enviando enlace..."
              : "Enviar enlace de recuperación"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/login"
              )
            }
            style={{
              marginTop:
                "0.8rem",
              marginLeft:
                "0.6rem",
              background:
                "transparent",
              color:
                "#6b4f2a",
              border:
                "1px solid #cbbfa9",
              borderRadius:
                "8px",
              padding:
                "0.85rem 1.2rem",
              cursor:
                "pointer",
              fontWeight:
                700,
            }}
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}