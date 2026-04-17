import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";

type ItemBiblioteca = {
  id: string;
  slug: string;
  titulo: string;
  autores: string[];
  anio: number | null;
  tipo: string | null;
  editorial: string | null;
  descripcion: string | null;
  portada_url: string | null;
  enlace_url: string;
};

type BibliotecaDetalleProps = {
  params: Promise<{ slug: string }>;
};

export default async function BibliotecaDetalle({
  params,
}: BibliotecaDetalleProps) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("biblioteca")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return notFound();

  const item = data as ItemBiblioteca;

  return (
    <section>
      <div>
        <p>
          ← <a href="/miembros/biblioteca">Volver a la biblioteca</a>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: "2rem",
            alignItems: "start",
            marginTop: "1.5rem",
          }}
        >
          <div
            style={{
              minHeight: "420px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <img
              src={item.portada_url || "/placeholder-miembro.jpg"}
              alt={item.titulo}
              style={{
                display: "block",
                width: "220px",
                maxWidth: "100%",
                height: "auto",
                margin: "0 auto",
                borderRadius: "8px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
              }}
            />
          </div>

          <div>
            {item.tipo && (
              <p
                style={{
                  margin: "0 0 0.4rem 0",
                  fontStyle: "italic",
                  color: "#4d371c",
                }}
              >
                {item.tipo}
              </p>
            )}

            <h1 style={{ marginTop: 0 }}>{item.titulo}</h1>

            {(item.autores || []).length > 0 && (
              <p><strong>Autor(es):</strong> {item.autores.join(", ")}</p>
            )}

            {item.editorial && (
              <p><strong>Editorial / fuente:</strong> {item.editorial}</p>
            )}

            {item.anio && (
              <p><strong>Año:</strong> {item.anio}</p>
            )}

            {item.descripcion && (
              <p style={{ marginTop: "1rem", lineHeight: 1.8 }}>
                {item.descripcion}
              </p>
            )}

            <div style={{ marginTop: "1.5rem" }}>
              <a
                href={item.enlace_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "0.7rem 1.2rem",
                  background: "#6b4f2a",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                Ver documento
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}