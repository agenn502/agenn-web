"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [pendientesCE, setPendientesCE] = useState<number | null>(null);
  const [esCE, setEsCE] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      const codigo = String(parsed.codigo || "").trim().toUpperCase();
      // La API devuelve 403 si el miembro no pertenece al CE.
      fetch("/api/revista/editorial", {
        headers: { "x-user-codigo": codigo }, cache: "no-store",
      }).then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.ok || !data.consejo_editorial) return;
        setEsCE(true);
        setPendientesCE((data.manuscritos || []).filter((m: any) =>
          ["CANDIDATO", "EN_REVISION", "REENVIADO"].includes(String(m.estado || "").toUpperCase())
        ).length);
      }).catch(() => {});

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

  // Los miembros exclusivos del CE conservan su panel de nivel,
  // con el aviso editorial adicional en Inicio.
  let panel: React.ReactNode;
  switch (user.nivel) {
    case "ASP":
      panel = <DashboardASP />; break;

    case "NOV":
      panel = <DashboardNOV />; break;

    case "INV":
      /*
       * Un Investigador acreditado ya no debe
       * regresar al proceso de formación.
       */
      if (
        user.estado_academico === "ACREDITADO"
      ) {
        panel = <DashboardINVACREDITADO />; break;
      }

      /*
       * Los INV antiguos que todavía tengan
       * estado_academico = null continúan usando
       * el dashboard normal de formación.
       */
      panel = <DashboardINV />; break;

    case "NUM":
      panel = <DashboardNUM />; break;

    default:
      panel = <div>Nivel no reconocido.</div>;
  }

  return (
    <>
      {esCE && (
        <div style={{ maxWidth: "980px", marginBottom: "1.5rem", padding: "1.25rem", background: (pendientesCE || 0) > 0 ? "#fff8e5" : "white", border: "1px solid #ddd4c7", borderRadius: "12px" }}>
          <strong>Consejo Editorial — Gestión editorial</strong>
          <p style={{ lineHeight: 1.7 }}>
            {(pendientesCE || 0) > 0
              ? `Hay ${pendientesCE} manuscrito(s) que requieren atención del Consejo Editorial.`
              : "No hay manuscritos que requieran atención del Consejo Editorial en este momento."}
          </p>
          <Link href="/miembros/revista/editorial" style={{ color: "#6b6f1a", fontWeight: 700 }}>
            Ir a gestión editorial{pendientesCE ? ` (${pendientesCE})` : ""}
          </Link>
        </div>
      )}
      {panel}
    </>
  );
}
