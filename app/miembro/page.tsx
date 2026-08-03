import Link from "next/link";

const pasos = [
  {
    numero: "1",
    titulo: "Identifique su perfil numismático",
    descripcion:
      "Complete una breve herramienta de autoorientación para reconocer su relación predominante con la numismática y la notafilia.",
  },
  {
    numero: "2",
    titulo: "Presente su solicitud de ingreso",
    descripcion:
      "Después de identificar su perfil, complete el expediente con sus datos personales, experiencia, intereses y motivación.",
  },
  {
    numero: "3",
    titulo: "Revisión del Consejo Académico",
    descripcion:
      "El Consejo Académico revisará la solicitud y podrá aprobarla, solicitar correcciones o emitir una resolución de rechazo.",
  },
  {
    numero: "4",
    titulo: "Ingreso al proceso formativo",
    descripcion:
      "Si la solicitud es aprobada, recibirá por correo su código académico y las instrucciones para ingresar a la plataforma formativa.",
  },
];

export default function MiembroPage() {
  return (
    <section className="section">
      <div className="container content-page" style={{ maxWidth: "980px" }}>
        <p
          style={{
            margin: "0 0 0.4rem 0",
            color: "#6b4f2a",
            fontSize: "0.82rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Afiliación
        </p>

        <h1 style={{ marginTop: 0 }}>Cómo hacerse miembro de la AGENN</h1>

        <p style={{ fontSize: "1.08rem", lineHeight: 1.8 }}>
          La Academia Guatemalteca de Estudios Numismáticos y Notafílicos es una
          institución de naturaleza académica y formativa. Su propósito es
          contribuir al estudio, la investigación, la documentación y la difusión
          del conocimiento numismático y notafílico, con especial atención a
          Guatemala.
        </p>

        <div
          style={{
            background: "#fff8e8",
            border: "1px solid #ddc58f",
            borderLeft: "6px solid #6b4f2a",
            borderRadius: "12px",
            padding: "1.2rem 1.3rem",
            margin: "1.5rem 0",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
            Una comunidad orientada al conocimiento
          </h2>

          <p style={{ marginBottom: 0 }}>
            La AGENN no está concebida como un espacio de compraventa,
            tasación o beneficio económico. Las personas que soliciten su ingreso
            deben mostrar interés genuino por aprender, investigar, conservar y
            compartir conocimiento. La actividad comercial no es incompatible con
            la Academia, pero no debe constituir el único propósito de participación.
          </p>
        </div>

        <h2>Proceso de admisión</h2>

        <p>
          El ingreso comienza con la identificación orientativa del perfil
          numismático del solicitante y continúa con la presentación de un
          expediente que será conocido por el Consejo Académico.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
            margin: "1.5rem 0 2rem",
          }}
        >
          {pasos.map((paso) => (
            <article
              key={paso.numero}
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "12px",
                padding: "1.15rem",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "#6b4f2a",
                  color: "white",
                  fontWeight: 700,
                  marginBottom: "0.8rem",
                }}
              >
                {paso.numero}
              </div>

              <h3 style={{ margin: "0 0 0.5rem" }}>{paso.titulo}</h3>
              <p style={{ marginBottom: 0 }}>{paso.descripcion}</p>
            </article>
          ))}
        </div>

        <h2>¿Qué información deberá proporcionar?</h2>

        <ul>
          <li>Nombre, fecha de nacimiento y datos de contacto.</li>
          <li>Fotografía real y reciente.</li>
          <li>
            Ubicación general: país, departamento, municipio y comunidad, sin
            solicitar una dirección domiciliar exacta.
          </li>
          <li>Profesión u oficio.</li>
          <li>Intereses y experiencia numismática o notafílica.</li>
          <li>Perfil obtenido mediante la herramienta de autoorientación.</li>
          <li>Motivación para ingresar y disposición para formarse.</li>
        </ul>

        <h2>Asignación del nivel inicial</h2>

        <p>
          La mayoría de las personas que comienzan desde cero ingresarán al nivel
          de <strong>Académico Aspirante (ASP)</strong>. De manera excepcional, el
          Consejo Académico podrá asignar directamente el nivel de
          <strong> Académico Investigador (INV)</strong> a personas con trayectoria,
          conocimientos o producción previamente reconocidos.
        </p>

        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
            marginTop: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Inicie su proceso de admisión</h2>

          <p style={{ maxWidth: "720px", margin: "0 auto 1.2rem" }}>
            El primer paso es identificar su perfil numismático. El resultado es
            orientativo y no determina por sí solo la admisión ni el nivel inicial,
            pero permite conocer mejor su punto de partida.
          </p>

          <Link href="/diagnostico?origen=admision" className="button primary">
			  Identificar mi perfil numismático
			</Link>

          <p
            style={{
              marginTop: "1rem",
              marginBottom: 0,
              color: "#666",
              fontSize: "0.92rem",
            }}
          >
            Al finalizar el diagnóstico podrá continuar con la solicitud de ingreso.
          </p>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderTop: "1px solid #ddd4c7",
            color: "#555",
          }}
        >
          <strong>¿Ya es miembro?</strong>{" "}
          <Link href="/login">Ingrese a la plataforma de miembros.</Link>
        </div>
      </div>
    </section>
  );
}