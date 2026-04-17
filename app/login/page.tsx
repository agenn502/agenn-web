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
    const codigoLimpio = codigo.trim().toUpperCase();
    const passwordLimpia = password.trim();

    if (!codigoLimpio || !passwordLimpia) {
      alert("Ingresa tu código y contraseña");
      return;
    }

    setLoading(true);

    try {
      console.log("Intentando login con código:", codigoLimpio);
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

      // 1) Buscar usuario solo por código
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("codigo", codigoLimpio)
        .maybeSingle();

      console.log("Resultado búsqueda por código:", { userData, userError });

      if (userError) {
        alert("Error al consultar usuarios: " + userError.message);
        setLoading(false);
        return;
      }

      if (!userData) {
        alert("No existe un usuario con ese código");
        setLoading(false);
        return;
      }

      // 2) Comparar contraseña
      const passwordGuardada = String(userData.password ?? "").trim();

      if (passwordGuardada !== passwordLimpia) {
        alert("Contraseña incorrecta");
        setLoading(false);
        return;
      }

      const valorConsejo = userData.consejo ?? userData.Consejo ?? false;

      const userToStore = {
        codigo: String(userData.codigo || "").trim().toUpperCase(),
        nivel: String(userData.nivel || "").trim().toUpperCase(),
        nombre: String(userData.nombre || "").trim(),
        consejo:
          valorConsejo === true ||
          valorConsejo === "true" ||
          valorConsejo === "TRUE" ||
          valorConsejo === 1,
      };

      localStorage.setItem("user", JSON.stringify(userToStore));
      router.push("/miembros");
    } catch (err: any) {
      console.error("Error inesperado en login:", err);
      alert("Ocurrió un error inesperado al iniciar sesión");
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