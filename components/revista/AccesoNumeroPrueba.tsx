"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AccesoNumeroPrueba({
  className,
}: {
  className?: string;
}) {
  const [slug, setSlug] = useState("");

  useEffect(() => {
    const comprobar = async () => {
      try {
        const usuario = JSON.parse(localStorage.getItem("user") || "null");
        const codigo = String(usuario?.codigo || "")
          .trim()
          .toUpperCase();
        if (!codigo) return;

        const respuesta = await fetch(
          "/api/revista/editorial?acceso_prueba=1",
          {
            headers: { "x-user-codigo": codigo },
            cache: "no-store",
          },
        );
        const resultado = await respuesta.json();

        if (respuesta.ok && resultado?.ok && resultado.numero_prueba?.slug) {
          setSlug(String(resultado.numero_prueba.slug));
        }
      } catch {
        // Para visitantes o sesiones vencidas simplemente no se muestra.
      }
    };

    comprobar();
  }, []);

  if (!slug) return null;

  return (
    <Link href={`/revista/numeros/${slug}`} className={className}>
      Acceder al número de prueba
    </Link>
  );
}