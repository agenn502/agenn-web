"use client";

import { useEffect, useState } from "react";

import DashboardASP from "@/components/dashboard/DashboardASP";
import DashboardNOV from "@/components/dashboard/DashboardNOV";
import DashboardINV from "@/components/dashboard/DashboardINV";
import DashboardINVACREDITADO from "@/components/dashboard/DashboardINVACREDITADO";
import DashboardNUM from "@/components/dashboard/DashboardNUM";
import DashboardCA from "@/components/dashboard/DashboardCA";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
  estado_academico?: string | null;
};

export default function MiembrosPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      setUser({
        ...parsed,

        codigo: String(parsed.codigo || "")
          .trim()
          .toUpperCase(),

        nivel: String(parsed.nivel || "")
          .trim()
          .toUpperCase(),

        estado_academico: parsed.estado_academico
          ? String(parsed.estado_academico)
              .trim()
              .toUpperCase()
          : null,
      });
    } catch {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  if (!user) {
    return <p>Cargando...</p>;
  }

  const esConsejo =
    user.consejo === true ||
    user.consejo === "true" ||
    user.consejo === "TRUE" ||
    user.consejo === 1;

  /*
   * Los miembros del Consejo conservan su
   * DashboardCA independientemente de su nivel.
   */
  if (esConsejo) {
    return <DashboardCA />;
  }

  switch (user.nivel) {
    case "ASP":
      return <DashboardASP />;

    case "NOV":
      return <DashboardNOV />;

    case "INV":
      /*
       * Un Investigador acreditado ya no debe
       * regresar al proceso de formación.
       */
      if (
        user.estado_academico === "ACREDITADO"
      ) {
        return <DashboardINVACREDITADO />;
      }

      /*
       * Los INV antiguos que todavía tengan
       * estado_academico = null continúan usando
       * el dashboard normal de formación.
       */
      return <DashboardINV />;

    case "NUM":
      return <DashboardNUM />;

    default:
      return (
        <div>
          Nivel no reconocido.
        </div>
      );
  }
}