"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!codigo.trim() || !password.trim()) {
      alert("Ingresa tu código y contraseña");
      return;
    }

    setLoading(true);

    const codigoLimpio = codigo.trim().toUpperCase();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("codigo", codigoLimpio)
      .eq("password", password)
      .maybeSingle();

    if (error || !data) {
      alert("Credenciales incorrectas");
      setLoading(false);
      return;
    }

    const valorConsejo = data.consejo ?? data.Consejo ?? false;

    const userToStore = {
      codigo: String(data.codigo || "").trim().toUpperCase(),
      nivel: String(data.nivel || "").trim().toUpperCase(),
      nombre: String(data.nombre || "").trim(),
      consejo:
        valorConsejo === true ||
        valorConsejo === "true" ||
        valorConsejo === "TRUE" ||
        valorConsejo === 1,
    };

    localStorage.setItem("user", JSON.stringify(userToStore));
    setLoading(false);
    router.push("/miembros");
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