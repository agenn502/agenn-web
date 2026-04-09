export default function PerfilDPage() {
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
          <h1>Perfil D</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Vendedor No Especializado
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Corresponde a una persona que participa en la compraventa de monedas,
            billetes u objetos afines sin contar con formación numismática
            suficiente ni con criterios técnicos consolidados. Su relación con
            las piezas es superficial, circunstancial o puramente práctica, y su
            conocimiento suele ser limitado o fragmentario.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Participa en la venta de piezas sin dominio real de su contexto,
              autenticidad o valor especializado.
            </li>
            <li>
              Se guía por impresiones generales, referencias poco precisas o
              supuestos comunes.
            </li>
            <li>
              Puede confundir antigüedad con rareza, o rareza con alto valor
              comercial.
            </li>
            <li>
              Suele operar fuera de círculos especializados o sin contacto
              directo con bibliografía y criterios técnicos.
            </li>
            <li>
              Puede difundir errores o valoraciones incorrectas sin plena
              conciencia de ello.
            </li>
            <li>
              Su intervención en el mercado tiende a ser ocasional o poco
              estructurada.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Obtener un beneficio práctico o vender
            objetos que considera antiguos, curiosos o potencialmente valiosos,
            sin un interés real por el estudio de la disciplina.
          </p>

          <p>
            <strong>Conocimiento:</strong> Bajo o no especializado; carece de
            herramientas suficientes para interpretar con precisión lo que vende.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Funcional y externa; las
            percibe como objetos comerciables antes que como documentos
            históricos o materiales de estudio.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Periférico; su presencia es más
            frecuente en espacios no especializados que en ámbitos propiamente
            numismáticos.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil tiene un valor limitado dentro del ecosistema
            numismático, pero sirve para evidenciar la importancia de la
            formación básica y de la divulgación seria. Su existencia recuerda
            que muchas piezas circulan fuera de contextos especializados y que
            el acceso al conocimiento sigue siendo una necesidad fundamental.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Aunque este perfil no suele aportar de manera estructurada al campo,
            puede evolucionar positivamente si se interesa por aprender y accede
            a herramientas de orientación. La diferencia entre un vendedor no
            especializado y un comerciante en formación suele depender, en gran
            medida, de su apertura al estudio y a la corrección.
          </p>
        </section>
      </div>
    </section>
  );
}