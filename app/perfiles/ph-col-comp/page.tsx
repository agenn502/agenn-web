export default function PerfilHPage() {
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
          <h1>Perfil H</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Coleccionista Orientado a la Completitud
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a la persona cuya principal motivación es completar
            series, conjuntos o secuencias de monedas, billetes u objetos
            afines. Su satisfacción proviene del orden, la continuidad y el
            logro de reunir un conjunto íntegro, más que de la calidad extrema
            o del estudio profundo de cada pieza por separado.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Define metas concretas de completitud dentro de una serie o grupo
              de piezas.
            </li>
            <li>
              Lleva registros, listados o controles de faltantes.
            </li>
            <li>
              Prioriza la incorporación de la pieza faltante, aunque no siempre
              sea la mejor en conservación.
            </li>
            <li>
              Encuentra satisfacción en el orden y en la secuencia completa.
            </li>
            <li>
              Suele desarrollar constancia, método y disciplina en su forma de
              coleccionar.
            </li>
            <li>
              Puede concentrarse intensamente en los objetivos definidos para su
              colección.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Alcanzar la completitud de series,
            emisiones, periodos o conjuntos específicos.
          </p>

          <p>
            <strong>Conocimiento:</strong> Generalmente orientado a identificar
            con precisión qué piezas integran una serie y cuáles hacen falta
            para completarla.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Estructurada y secuencial;
            cada ejemplar tiene valor dentro de un conjunto mayor.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Favorece el intercambio, la
            identificación de faltantes y la circulación de información útil
            para completar series.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil aporta orden, sistematicidad y continuidad al
            coleccionismo. Su forma de aproximarse a las piezas favorece la
            organización metódica y puede convertirse en una base importante
            para desarrollos posteriores más analíticos o investigativos.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Aunque su prioridad no siempre sea el estudio detallado o la
            excelencia material, este perfil puede evolucionar hacia formas más
            complejas de conocimiento cuando la búsqueda de completitud se
            complementa con interés por el contexto histórico, las variantes o
            los criterios de clasificación.
          </p>
        </section>
      </div>
    </section>
  );
}