export default function PerfilGPage() {
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
          <h1>Perfil G</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Coleccionista Orientado a la Calidad
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a la persona que colecciona con especial atención al
            estado de conservación, a la presentación material y a la calidad
            visual de las piezas. Su interés se centra en reunir ejemplares que
            destaquen por su integridad, limpieza visual, atractivo estético y
            buena preservación.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Da prioridad al estado de conservación como criterio central de su
              colección.
            </li>
            <li>
              Valora especialmente la presentación, la integridad física y el
              atractivo visual de las piezas.
            </li>
            <li>
              Prefiere piezas mejor conservadas, aun si eso implica adquirir
              menos ejemplares.
            </li>
            <li>
              Suele prestar atención a detalles superficiales, desgaste, brillo,
              limpieza y calidad general.
            </li>
            <li>
              Organiza su colección de manera cuidada y con interés por su
              exhibición.
            </li>
            <li>
              Puede desarrollar conocimientos importantes sobre grados de
              conservación y criterios de evaluación material.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Reunir piezas bien conservadas y
            visualmente atractivas, encontrando valor en su excelencia material.
          </p>

          <p>
            <strong>Conocimiento:</strong> Variable, pero con tendencia a
            fortalecerse especialmente en aspectos relacionados con conservación,
            presentación y evaluación física de las piezas.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Selectiva y apreciativa;
            las valora como objetos dignos de conservación cuidadosa y
            contemplación ordenada.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Promueve sensibilidad por la
            calidad material, el cuidado de las colecciones y la importancia de
            preservar adecuadamente los ejemplares.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil contribuye a mantener altos estándares de conservación y
            a valorar la dimensión material y estética de las piezas. Su enfoque
            ayuda a recordar que la preservación física también forma parte de la
            responsabilidad cultural del coleccionismo.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Aunque su atención principal no siempre se dirige al estudio
            histórico profundo, este perfil puede evolucionar hacia formas más
            analíticas e investigativas cuando la apreciación de la calidad se
            complementa con interés por el contexto, la procedencia y la
            significación de las piezas.
          </p>
        </section>
      </div>
    </section>
  );
}