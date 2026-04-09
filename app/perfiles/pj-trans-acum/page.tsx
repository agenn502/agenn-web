export default function PerfilJPage() {
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
          <h1>Perfil J</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Acumulador No Sistemático
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a la persona que conserva monedas, billetes u otros
            objetos afines por curiosidad, apego personal o simple gusto, pero
            sin un criterio definido de orden, colección o estudio. Su relación
            con las piezas es espontánea, no especializada y generalmente
            desligada de métodos de clasificación o de objetivos concretos.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Guarda piezas sin clasificarlas ni organizarlas de forma sistemática.
            </li>
            <li>
              Su interés suele ser anecdótico, afectivo o simplemente curioso.
            </li>
            <li>
              No busca necesariamente completar series ni profundizar en el
              estudio de las piezas.
            </li>
            <li>
              Puede desconocer el contexto histórico, técnico o económico de lo
              que conserva.
            </li>
            <li>
              Mantiene una relación libre y poco estructurada con su conjunto de
              objetos.
            </li>
            <li>
              Constituye una forma inicial y elemental de vínculo con la
              numismática y la notafilia.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Conservar piezas por gusto, recuerdo,
            curiosidad o simple inclinación personal, sin un propósito definido
            de colección o investigación.
          </p>

          <p>
            <strong>Conocimiento:</strong> Generalmente básico o mínimo; no suele
            ir acompañado de estudio ni de criterios técnicos consolidados.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Espontánea, afectiva o
            circunstancial; las piezas son valoradas por su presencia, novedad o
            vínculo personal más que por su lugar dentro de un sistema.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Periférico, aunque potencialmente
            relevante como punto de partida para futuros procesos de interés y
            formación.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Aunque este perfil no forma parte aún de un ejercicio consciente de
            estudio o colección, posee valor como etapa inicial de aproximación.
            Muchas trayectorias más estructuradas comienzan aquí, a partir de una
            curiosidad elemental que, con el tiempo, puede transformarse en
            interés organizado y conocimiento.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Este perfil no debe entenderse de manera despectiva, sino como una
            forma básica de relación con las piezas. Con estímulo adecuado,
            acompañamiento respetuoso y acceso a herramientas sencillas, puede
            evolucionar hacia el coleccionismo organizado o hacia intereses más
            formativos dentro del campo numismático y notafílico.
          </p>
        </section>
      </div>
    </section>
  );
}