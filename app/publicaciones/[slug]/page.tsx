import { publicaciones } from "../data";
import { notFound } from "next/navigation";

type PublicacionDetalleProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicacionDetalle({
  params,
}: PublicacionDetalleProps) {
  const { slug } = await params;
  const pub = publicaciones.find((p) => p.slug === slug);

  if (!pub) return notFound();

  const baseUrl = "https://tu-sitio.com/publicaciones/";
  const publicUrl = `${baseUrl}${pub.slug}`;

  return (
    <section className="section">
      <div className="container content-page">
        <p>
          ← <a href="/publicaciones">Volver al catálogo</a>
        </p>

        <div className="publicacion-detalle-grid">
          <div className="publicacion-portada">
            <img
              src={pub.portada}
              alt={pub.titulo}
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

          <div className="publicacion-info">
            <p
              style={{
                margin: "0 0 0.4rem 0",
                fontStyle: "italic",
                color: "#4d371c",
              }}
            >
              {pub.serie}
            </p>

            <h1 style={{ marginTop: 0 }}>{pub.titulo}</h1>

            <p><strong>Autor(es):</strong> {pub.autores.join(", ")}</p>
            <p><strong>Editorial:</strong> {pub.editorial}</p>
            <p><strong>Año:</strong> {pub.anio}</p>

            <p style={{ marginTop: "1rem" }}>{pub.descripcion}</p>

            <div style={{ marginTop: "1.5rem" }}>
              <a
                href={pub.enlace}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "0.7rem 1.2rem",
                  background: "#6b4f2a",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  marginBottom: "1rem",
                }}
              >
                Visualizar
              </a>

              <div>
                <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.9rem" }}>
                  Compartir:
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "0.8rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      pub.titulo
                    )}&body=${encodeURIComponent(
                      `${pub.titulo}\n\n${publicUrl}`
                    )}`}
                    title="Compartir por correo"
                    style={{ display: "inline-block" }}
                  >
                    <img
                      src="/email-icon-150x150.png"
                      alt="Correo"
                      style={{ width: "28px", height: "28px" }}
                    />
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      publicUrl
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Compartir en Facebook"
                    style={{ display: "inline-block" }}
                  >
                    <img
                      src="/facebook-icon-150x150.png"
                      alt="Facebook"
                      style={{ width: "28px", height: "28px" }}
                    />
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      pub.titulo
                    )}&url=${encodeURIComponent(publicUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Compartir en X"
                    style={{ display: "inline-block" }}
                  >
                    <img
                      src="/x-icon-150x150.png"
                      alt="X"
                      style={{ width: "28px", height: "28px" }}
                    />
                  </a>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `${pub.titulo} - ${publicUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Compartir por WhatsApp"
                    style={{ display: "inline-block" }}
                  >
                    <img
                      src="/whatsapp-icon-150x150.png"
                      alt="WhatsApp"
                      style={{ width: "28px", height: "28px" }}
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .publicacion-detalle-grid {
            display: grid;
            grid-template-columns: 240px minmax(0, 1fr);
            gap: 2rem;
            align-items: start;
            margin-top: 1.5rem;
            width: 100%;
            max-width: 100%;
          }

          .publicacion-portada {
            min-height: 420px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-width: 0;
          }

          .publicacion-info {
            min-width: 0;
            max-width: 100%;
            overflow-wrap: anywhere;
            word-break: normal;
          }

          @media (max-width: 600px) {
            .publicacion-detalle-grid {
              grid-template-columns: minmax(0, 1fr);
              gap: 1.25rem;
            }

            .publicacion-portada {
              min-height: 0;
            }

            .publicacion-portada img {
              width: min(220px, 70vw) !important;
              max-width: 100% !important;
              height: auto !important;
            }

            .publicacion-info h1 {
              font-size: clamp(1.6rem, 7vw, 2rem);
              overflow-wrap: anywhere;
            }

            .publicacion-info a {
              max-width: 100%;
            }
          }
        `}</style>
      </div>
    </section>
  );
}