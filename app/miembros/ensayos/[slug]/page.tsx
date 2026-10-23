import EnsayoPublico from "@/app/ensayos/[slug]/page";

type Props = {
  params: Promise<{ slug: string }>;
};

// Reutiliza la presentación pública dentro del layout de miembros.
// La consulta pública ya limita los resultados a trabajos publicados y aprobados.
export default async function EnsayoMiembros({ params }: Props) {
  return <EnsayoPublico params={params} searchParams={Promise.resolve({})} />;
}
