export default function PerfilEPage() {
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
          <h1>Perfil E</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Numismático Especializado
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a la persona que se aproxima a la numismática o la
            notafilia desde una perspectiva rigurosa, metódica y orientada al
            conocimiento. Su interés principal no es la acumulación ni el
            comercio, sino el estudio profundo de las piezas como fuentes
            documentales, históricas, técnicas y culturales. Suele desarrollar
            una especialización concreta y avanzar en ella con disciplina.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Investiga con profundidad una temática, periodo, emisor, serie o
              campo específico.
            </li>
            <li>
              Valora la bibliografía, la documentación, la comparación y el uso
              de fuentes verificables.
            </li>
            <li>
              Comprende las piezas como objetos de estudio antes que como simples
              bienes de colección o intercambio.
            </li>
            <li>
              Tiende a sistematizar información y a construir criterios propios
              a partir del análisis.
            </li>
            <li>
              Puede producir conocimiento en forma de artículos, catálogos,
              conferencias, notas o investigaciones especializadas.
            </li>
            <li>
              Da prioridad al rigor metodológico y a la precisión conceptual.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Comprender, investigar y preservar el
            conocimiento relacionado con monedas, billetes y otros materiales
            afines.
          </p>

          <p>
            <strong>Conocimiento:</strong> Profundo y generalmente concentrado en
            un campo delimitado, aunque sustentado en una visión amplia de la
            disciplina.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Intelectual, analítica y
            documental; las considera testimonios materiales capaces de aportar
            información relevante.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Constructor de conocimiento,
            referencia técnica y posible formador de nuevos estudiosos.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil es central para el desarrollo de la disciplina. Aporta
            profundidad, precisión y continuidad al conocimiento numismático y
            notafílico, contribuyendo a que el campo no se reduzca a prácticas
            de acumulación o intercambio, sino que alcance un verdadero nivel de
            estudio académico.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            La consolidación de este perfil depende del acceso a fuentes,
            espacios de intercambio, publicación y validación entre pares. En el
            contexto de una academia, constituye uno de los perfiles más afines
            a sus fines institucionales, pues encarna el ideal del estudio serio,
            documentado y generador de conocimiento.
          </p>
        </section>
      </div>
    </section>
  );
}