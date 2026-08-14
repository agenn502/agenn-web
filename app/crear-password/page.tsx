"use client";

import {
  Suspense,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

function CrearPasswordContenido() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const token =
    searchParams.get(
      "token"
    ) || "";

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmar,
    setConfirmar,
  ] = useState("");

  const [
    mostrandoPassword,
    setMostrandoPassword,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    completado,
    setCompletado,
  ] = useState(false);

  const [
    codigo,
    setCodigo,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const establecerPassword =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setError("");

      if (!token) {
        setError(
          "El enlace no contiene un token válido."
        );

        return;
      }

      if (
        password.length < 8
      ) {
        setError(
          "La contraseña debe contener al menos 8 caracteres."
        );

        return;
      }

      if (
        !/[A-Za-z]/.test(
          password
        )
      ) {
        setError(
          "La contraseña debe contener al menos una letra."
        );

        return;
      }

      if (
        !/[0-9]/.test(
          password
        )
      ) {
        setError(
          "La contraseña debe contener al menos un número."
        );

        return;
      }

      if (
        password !==
        confirmar
      ) {
        setError(
          "Las contraseñas no coinciden."
        );

        return;
      }

      setGuardando(true);

      try {
        const response =
          await fetch(
            "/api/password/establecer",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  token,
                  password,
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
              "No fue posible crear la contraseña."
          );
        }

        setCodigo(
          result.codigo || ""
        );

        setCompletado(
          true
        );

        setPassword("");
        setConfirmar("");
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible crear la contraseña."
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  if (!token) {
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
              "1px solid #ebc8c8",

            borderRadius:
              "16px",

            padding:
              "2rem",
          }}
        >
          <h1
            style={{
              marginTop: 0,
            }}
          >
            Crear contraseña
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
            }}
          >
            El enlace no contiene un token válido.
          </div>
        </div>
      </div>
    );
  }

  if (completado) {
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
            Contraseña creada
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
            Su contraseña fue establecida correctamente.
          </div>

          {codigo && (
            <div
              style={{
                marginTop:
                  "1.5rem",

                background:
                  "#faf8f3",

                border:
                  "1px solid #ddd4c7",

                borderRadius:
                  "10px",

                padding:
                  "1rem",
              }}
            >
              <strong>
                Su código de acceso:
              </strong>

              <div
                style={{
                  marginTop:
                    "0.4rem",

                  fontSize:
                    "1.4rem",

                  fontWeight:
                    700,

                  color:
                    "#4d371c",
                }}
              >
                {codigo}
              </div>
            </div>
          )}

          <p
            style={{
              marginTop:
                "1.5rem",

              lineHeight:
                1.8,

              color:
                "#555",
            }}
          >
            Ya puede ingresar al área de miembros utilizando su código institucional y la contraseña que acaba de crear.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/login"
              )
            }
            style={{
              marginTop:
                "0.5rem",

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
            Ingresar a mi cuenta
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
          Crear mi contraseña
        </h1>

        <p
          style={{
            lineHeight:
              1.8,

            color:
              "#555",
          }}
        >
          Cree una contraseña personal para ingresar al área de miembros de la AGENN.
        </p>

        <p
          style={{
            lineHeight:
              1.7,

            color:
              "#666",

            fontSize:
              "0.92rem",
          }}
        >
          La contraseña debe contener al menos 8 caracteres, incluyendo una letra y un número.
        </p>

        <form
          onSubmit={
            establecerPassword
          }
          style={{
            marginTop:
              "1.5rem",
          }}
        >
          <div>
            <label
              style={{
                display:
                  "block",

                marginBottom:
                  "0.4rem",

                fontWeight:
                  700,
              }}
            >
              Nueva contraseña
            </label>

            <input
              type={
                mostrandoPassword
                  ? "text"
                  : "password"
              }
              value={
                password
              }
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              autoComplete="new-password"
              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "0.85rem",

                border:
                  "1px solid #cbbfa9",

                borderRadius:
                  "8px",

                fontSize:
                  "1rem",
              }}
            />
          </div>

          <div
            style={{
              marginTop:
                "1rem",
            }}
          >
            <label
              style={{
                display:
                  "block",

                marginBottom:
                  "0.4rem",

                fontWeight:
                  700,
              }}
            >
              Confirmar contraseña
            </label>

            <input
              type={
                mostrandoPassword
                  ? "text"
                  : "password"
              }
              value={
                confirmar
              }
              onChange={(e) =>
                setConfirmar(
                  e.target.value
                )
              }
              autoComplete="new-password"
              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "0.85rem",

                border:
                  "1px solid #cbbfa9",

                borderRadius:
                  "8px",

                fontSize:
                  "1rem",
              }}
            />
          </div>

          <label
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "0.5rem",

              marginTop:
                "1rem",

              cursor:
                "pointer",

              color:
                "#555",
            }}
          >
            <input
              type="checkbox"
              checked={
                mostrandoPassword
              }
              onChange={(e) =>
                setMostrandoPassword(
                  e.target.checked
                )
              }
            />

            Mostrar contraseña
          </label>

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
              guardando
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
                guardando
                  ? "not-allowed"
                  : "pointer",

              fontWeight:
                700,

              opacity:
                guardando
                  ? 0.7
                  : 1,
            }}
          >
            {guardando
              ? "Guardando contraseña..."
              : "Crear mi contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CrearPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CrearPasswordContenido />
    </Suspense>
  );
}
