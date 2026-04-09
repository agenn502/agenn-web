import { publicaciones } from "../data";
import { notFound } from "next/navigation";

export default async function PublicacionDetalle({ params }) {
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: "2rem",
            alignItems: "start",
            marginTop: "1.5rem",
          }}
        >
          {/* PORTADA CENTRADA VERTICALMENTE */}
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

          {/* INFORMACIÓN */}
          <div>
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
                  {/* Email */}
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

                  {/* Facebook */}
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

                  {/* X */}
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

                  {/* WhatsApp */}
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
      </div>
    </section>
  );
}