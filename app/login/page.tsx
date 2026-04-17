"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse =
  | {
      ok: true;
      user: {
        codigo: string;
        nivel: string;
        nombre: string;
        consejo: boolean;
      };
    }
  | {
      ok: false;
      error: string;
    };

export default function LoginPage() {
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    const codigoLimpio = codigo.trim().toUpperCase();
    const passwordLimpia = password.trim();

    if (!codigoLimpio || !passwordLimpia) {
      alert("Ingresa tu código y contraseña");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo: codigoLimpio,
          password: passwordLimpia,
        }),
      });

      const result: LoginResponse = await res.json();

      if (!res.ok || !result.ok) {
        alert(result.ok ? "No se pudo iniciar sesión" : result.error);
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(result.user));
      router.push("/miembros");
    } catch (err) {
      console.error("Error en login:", err);
      alert("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container content-page">
        <h1>Ingreso de miembros</h1>

        <div
          style={{
            maxWidth: "420px",
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "10px",
            padding: "1.5rem",
          }}
        >
          <label style={{ display: "block", marginBottom: "0.4rem" }}>
            Código de ingreso
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ej. NUM0001"
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "1rem",
            }}
          />

          <label style={{ display: "block", marginBottom: "0.4rem" }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "1rem",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: "0.85rem 1.2rem",
              border: "1px solid #6b4f2a",
              borderRadius: "8px",
              background: "#6b4f2a",
              color: "white",
              fontFamily: "inherit",
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </section>
  );
}