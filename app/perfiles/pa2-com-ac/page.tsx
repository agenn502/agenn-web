export default function PerfilA2Page() {
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
          <h1>Perfil A2</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Comerciante con Orientación Académica
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Combina la actividad comercial con un interés genuino por el
            estudio, la investigación y la difusión del conocimiento. No se
            limita a vender piezas: también las contextualiza, las documenta y
            las interpreta, procurando que el intercambio comercial no quede
            separado del valor histórico, técnico y cultural del objeto
            numismático o notafílico.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Participa activamente en el mercado, pero sin reducir las piezas a
              su mero valor de venta.
            </li>
            <li>
              Investiga por interés intelectual, no solo por necesidad comercial.
            </li>
            <li>
              Comparte conocimientos con clientes, colegas y coleccionistas.
            </li>
            <li>
              Puede elaborar textos, fichas, presentaciones o publicaciones
              sobre las piezas que maneja.
            </li>
            <li>
              Valora la legitimidad, la procedencia y el contexto histórico de
              los objetos.
            </li>
            <li>
              Entiende que el comercio también puede cumplir una función
              educativa.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Mixta; combina interés comercial
            legítimo con vocación de estudio.
          </p>

          <p>
            <strong>Conocimiento:</strong> Profundo, en expansión y con
            capacidad de integrar experiencia práctica con reflexión histórica y
            documental.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Dual; las comprende tanto
            como objetos de circulación comercial como fuentes de conocimiento.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Actúa como puente entre el
            mercado y el estudio serio, favoreciendo la formación de otros y la
            circulación responsable del conocimiento.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil es especialmente valioso porque demuestra que el
            comercio y la investigación no son incompatibles. Cuando se integran
            con ética, pueden fortalecer tanto el mercado como la cultura
            numismática y notafílica.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Se trata de uno de los perfiles más completos para el desarrollo de
            la disciplina, ya que combina sostenibilidad práctica con vocación
            intelectual. Su evolución natural puede orientarse hacia la
            publicación, la formación de nuevos estudiosos y la colaboración con
            proyectos de investigación y divulgación.
          </p>
        </section>
      </div>
    </section>
  );
}