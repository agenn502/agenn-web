export default function PerfilB2Page() {
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
          <h1>Perfil B2</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Operador de Doble Rol Académico-Comercial No Ético
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Se trata de una persona que participa simultáneamente en espacios
            académicos y en actividades comerciales, pero sin mantener coherencia
            con los principios de honestidad intelectual y transparencia. Su
            presencia en ámbitos de estudio puede otorgarle una apariencia de
            legitimidad que no siempre se corresponde con sus prácticas reales.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Tiene visibilidad o reconocimiento en espacios académicos o de
              estudio.
            </li>
            <li>
              Participa en el mercado numismático de forma activa.
            </li>
            <li>
              Puede proyectar autoridad intelectual mientras desarrolla prácticas
              comerciales cuestionables.
            </li>
            <li>
              Mezcla prestigio académico con intereses comerciales de manera
              poco transparente.
            </li>
            <li>
              Genera confusión entre conocimiento genuino y uso instrumental del
              saber.
            </li>
            <li>
              Su doble rol no es el problema en sí, sino la falta de coherencia ética.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Obtener reconocimiento y beneficio
            simultáneamente, sin establecer una separación clara entre el ámbito
            académico y el comercial.
          </p>

          <p>
            <strong>Conocimiento:</strong> Generalmente sólido, con capacidad de
            desenvolverse en entornos especializados y de construir discursos con
            apariencia de rigor.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Dual, pero con tendencia a
            instrumentalizar el conocimiento para favorecer intereses propios.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Ambiguo; puede influir en la
            formación de otros, pero también distorsionar criterios y generar
            desconfianza.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil representa un desafío particular para el ámbito
            numismático, ya que dificulta distinguir entre autoridad intelectual
            legítima y uso instrumental del conocimiento. Su presencia refuerza
            la necesidad de criterios claros de validación académica, revisión
            crítica y transparencia en las prácticas.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            La coexistencia de actividades académicas y comerciales no es, por sí
            misma, negativa. Sin embargo, cuando no existe coherencia ética entre
            ambas, se compromete la credibilidad del entorno académico. Este
            perfil pone de relieve la importancia de separar el reconocimiento
            intelectual de los intereses particulares.
          </p>
        </section>
      </div>
    </section>
  );
}