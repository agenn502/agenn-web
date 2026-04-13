"use client";

import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean;
};

export default function MiembrosPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    setUser(JSON.parse(stored));
  }, []);

  if (!user) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      <h1>Bienvenido {user.nombre}</h1>

      <p>
        <strong>Código:</strong> {user.codigo}
      </p>
      <p>
        <strong>Nivel:</strong> {user.nivel}
      </p>

      {user.consejo === true && (
        <p>
          <strong>Consejo Académico:</strong> Sí
        </p>
      )}

      <p style={{ marginTop: "2rem" }}>
        Selecciona una opción del menú para continuar.
      </p>
    </div>
  );
}