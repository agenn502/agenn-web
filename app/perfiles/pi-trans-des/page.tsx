export default function PerfilIPage() {
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
          <h1>Perfil I</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Coleccionista en Desarrollo
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a la persona que ya no se limita a conservar piezas de
            manera espontánea, pero que aún no ha consolidado un criterio claro
            de organización, estudio o especialización. Se encuentra en una
            etapa de transición: reconoce que desea avanzar, ordenar mejor su
            colección o comprenderla con mayor profundidad, aunque todavía no ha
            definido plenamente su método ni su orientación.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Tiene interés real en avanzar más allá de la simple acumulación.
            </li>
            <li>
              Reconoce la necesidad de ordenar, clasificar o entender mejor sus
              piezas.
            </li>
            <li>
              Aún no ha definido con claridad su línea de colección o de estudio.
            </li>
            <li>
              Se muestra receptivo a la formación, la orientación y el
              aprendizaje.
            </li>
            <li>
              Puede oscilar entre varias formas de aproximación antes de
              consolidar una preferencia.
            </li>
            <li>
              Tiene alto potencial de evolución hacia perfiles más estructurados.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Comprender mejor lo que posee, ordenar
            su colección y encontrar una forma más consciente de relacionarse con
            la numismática o la notafilia.
          </p>

          <p>
            <strong>Conocimiento:</strong> Inicial o intermedio, con deseo de
            ampliación y con apertura a recibir herramientas formativas.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Evolutiva; empieza a verlas
            no solo como objetos conservados, sino también como materiales que
            pueden organizarse, compararse y estudiarse.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Potencial integrante activo en
            procesos de formación, intercambio y crecimiento académico o
            coleccionista.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil es especialmente importante para una academia o comunidad
            formativa, porque representa a quienes están en el punto justo para
            crecer. En él se encuentra una de las mayores oportunidades de
            fortalecimiento del campo: transformar el interés disperso en estudio
            consciente, ordenado y progresivo.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            La evolución de este perfil depende en gran medida del acceso a
            orientación clara, materiales de apoyo, espacios de intercambio y
            acompañamiento respetuoso. Puede desarrollarse hacia formas más
            organizadas de coleccionismo o incluso hacia perfiles de estudio e
            investigación si encuentra un entorno que estimule su crecimiento.
          </p>
        </section>
      </div>
    </section>
  );
}