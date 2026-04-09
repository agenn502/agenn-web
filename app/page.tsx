import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-logo">
            <img
			  src="/logo-agenn.png"
			  alt="Logo de la AGENN"
			  style={{
				width: "320px",
				height: "auto",
				display: "block",
				margin: "0 auto",
				filter: "drop-shadow(0 0 8px rgba(255,255,255,0.8))",
			  }}
			/>
          </div>

          <div className="hero-text">
            <h1 style={{ textAlign: "center" }}>  Academia Guatemalteca de Estudios Numismáticos y Notafílicos
			</h1>
            <p style={{ textAlign: "center" }} className="motto">Scientia, Traditio et Memoria</p>
            <p>
              Entidad académica dedicada al estudio, investigación,
              documentación y difusión del conocimiento numismático y
              notafílico en Guatemala.
            </p>

            <div className="hero-actions">
              <Link href="/academia" className="button primary">
                Conocer la Academia
              </Link>
              <Link href="/miembro" className="button secondary">
                Cómo hacerse miembro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>¿Qué es la AGENN?</h2>
          <p>
            La Academia Guatemalteca de Estudios Numismáticos y Notafílicos es
            un espacio académico orientado al estudio, la investigación, la
            formación, el intercambio y la cooperación en torno a la numismática,
            la notafilia y los campos conexos de conocimiento.
          </p>
          <p>
            Su propósito es promover una visión que trascienda el coleccionismo
            y se oriente hacia la generación, organización y preservación del
            conocimiento histórico, técnico y cultural.
          </p>
        </div>
      </section>

      </>
  );
}