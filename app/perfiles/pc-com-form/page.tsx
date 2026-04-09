export default function PerfilCPage() {
  return (
    <section className="section">
      <div className="container content-page">
        <div style={{ marginBottom: "1.5rem" }}>
          <p>
            ← <a href="/diagnostico">Repetir diagnóstico</a>
          </p>
          <p>
            <a href="/perfiles">Ver guía completa de perfiles</a>
          </p>
        </div>

        <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
          <h1>Perfil C</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Comerciante en Formación
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a una persona que ha comenzado a participar en la compra
            y venta de monedas o billetes, pero que aún se encuentra en proceso
            de adquirir conocimientos técnicos y criterios sólidos. Su actividad
            suele estar guiada por el interés comercial, acompañado de una
            disposición abierta al aprendizaje.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Tiene interés por el comercio de piezas numismáticas o
              notafílicas.
            </li>
            <li>
              Posee conocimientos parciales o en construcción.
            </li>
            <li>
              Puede cometer errores de valoración o descripción por falta de
              experiencia.
            </li>
            <li>
              Aprende a través de la práctica, la observación y la interacción
              con otros.
            </li>
            <li>
              Está abierto a corregir y mejorar sus criterios.
            </li>
            <li>
              Su conducta puede orientarse positivamente con formación adecuada.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Ingresar y desenvolverse en el ámbito
            comercial de la numismática o la notafilia, con interés en aprender
            y mejorar.
          </p>

          <p>
            <strong>Conocimiento:</strong> Inicial o intermedio; en proceso de
            consolidación mediante la experiencia y el estudio.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Principalmente orientada al
            intercambio, aunque comienza a desarrollar interés por su
            identificación, clasificación y contexto.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Participante en formación que
            puede evolucionar hacia perfiles más sólidos, tanto en el ámbito
            comercial como en el académico.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil representa un punto de transición importante dentro del
            ecosistema numismático. Con orientación adecuada, puede convertirse
            en un comerciante responsable o incluso en un estudioso de la
            disciplina, contribuyendo al fortalecimiento del medio.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            La formación, el acceso a información confiable y el acompañamiento
            por parte de actores más experimentados son factores determinantes
            para la evolución de este perfil. Su desarrollo dependerá en gran
            medida de las referencias y prácticas que adopte en sus primeras
            etapas.
          </p>
        </section>
      </div>
    </section>
  );
}