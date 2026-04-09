export default function PerfilFPage() {
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
          <h1>Perfil F</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Investigador de Enfoque Amplio
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a la persona que se interesa por la numismática y la
            notafilia desde una perspectiva investigativa amplia, abierta a
            múltiples periodos, emisores, regiones o problemáticas. A diferencia
            del numismático especializado, no concentra su esfuerzo en un campo
            estrechamente delimitado, sino que desarrolla una visión panorámica
            y comparativa de la disciplina.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Mantiene una curiosidad amplia y sostenida sobre diversos temas
              numismáticos y notafílicos.
            </li>
            <li>
              Relaciona contextos históricos, materiales, series y fenómenos de
              distintas procedencias.
            </li>
            <li>
              Se interesa tanto por la pieza como por los procesos culturales,
              políticos, económicos o artísticos que la rodean.
            </li>
            <li>
              Favorece comparaciones, conexiones y lecturas transversales.
            </li>
            <li>
              Puede no profundizar de manera extrema en un solo tema, pero
              compensa ello con una comprensión amplia y articuladora.
            </li>
            <li>
              Suele enriquecer el debate colectivo con preguntas, vínculos y
              perspectivas generales.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Comprender la disciplina en su amplitud,
            estableciendo conexiones entre piezas, contextos y tradiciones
            monetarias o fiduciarias.
          </p>

          <p>
            <strong>Conocimiento:</strong> Extenso y diversificado, con capacidad
            de integrar información de distintos campos sin quedar limitado a una
            sola línea temática.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Integradora y comparativa;
            las considera puntos de entrada a procesos históricos más amplios.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Articulador de saberes,
            dinamizador del intercambio intelectual y generador de puentes entre
            especialistas, coleccionistas e investigadores.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil cumple una función muy valiosa al conectar temas,
            tradiciones y enfoques que de otro modo podrían permanecer aislados.
            Su mirada amplia contribuye a enriquecer la comprensión general de
            la disciplina y a favorecer el diálogo interdisciplinario.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Dentro de una academia, este perfil puede desempeñar un papel
            especialmente útil en la articulación de proyectos, en la creación de
            marcos generales de interpretación y en la apertura de nuevas líneas
            de investigación. Su principal fortaleza es la capacidad de ver
            relaciones donde otros solo perciben fragmentos aislados.
          </p>
        </section>
      </div>
    </section>
  );
}