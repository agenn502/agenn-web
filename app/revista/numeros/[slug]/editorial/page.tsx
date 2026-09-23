import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Numero = {
  volumen: number | null;
  numero: number;
  anio: number;
  editorial: string | null;
  slug: string;
};

const obtenerNumero = cache(async (slug: string): Promise<Numero | null> => {
  const { data, error } = await supabaseServer
    .from("revistas")
    .select("volumen,numero,anio,editorial,slug")
    .eq("slug", slug)
    .eq("estado", "PUBLICADA")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Numero | null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const numero = await obtenerNumero(slug);

  if (!numero) return { title: "Editorial no encontrado" };

  return {
    title: `Editorial | Revista AGENN Vol. ${numero.volumen || "—"}, Núm. ${numero.numero}`,
    description: `Editorial de Revista AGENN, volumen ${numero.volumen || "—"}, número ${numero.numero}, ${numero.anio}.`,
  };
}

export default async function EditorialPublicadoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const numero = await obtenerNumero(slug);

  if (!numero || !numero.editorial) notFound();

  return (
    <main
      style={{
        width: "min(920px, calc(100% - 32px))",
        margin: "0 auto",
        padding: "32px 0 64px",
      }}
    >
      <nav style={{ marginBottom: "28px" }}>
        <Link href={`/revista/numeros/${numero.slug}`}>
          ← Volver al número
        </Link>
      </nav>

      <header style={{ marginBottom: "28px" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "0.82rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Revista AGENN
        </p>

        <h1 style={{ margin: "0 0 10px" }}>Editorial</h1>

        <p style={{ margin: 0 }}>
          Volumen {numero.volumen || "—"} · Número {numero.numero} · {numero.anio}
        </p>
      </header>

      <article
        style={{
          fontSize: "1.05rem",
          lineHeight: 1.75,
          textAlign: "justify",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: numero.editorial }}
      />
    </main>
  );
}