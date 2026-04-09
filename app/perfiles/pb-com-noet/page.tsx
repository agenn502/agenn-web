export default function PerfilBPage() {
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
          <h1>Perfil B</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            Operador Comercial No Ético de Alto Conocimiento
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Se trata de una persona con conocimiento técnico profundo sobre
            monedas, billetes y sus contextos, pero que utiliza ese conocimiento
            de manera contraria a la ética académica y comercial. Su saber no
            está orientado al esclarecimiento, la formación ni la preservación
            del patrimonio, sino a la obtención de ventaja mediante prácticas
            engañosas, opacas o perjudiciales para otros actores del medio.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>
              Posee conocimientos sólidos sobre autenticidad, rareza, mercado,
              procedencia y valor de las piezas.
            </li>
            <li>
              Utiliza la asimetría de información para obtener beneficios
              desproporcionados o inducir a error.
            </li>
            <li>
              Puede manipular descripciones, contextos o valoraciones según le
              convenga.
            </li>
            <li>
              Tiende a desenvolverse en entornos de escasa transparencia.
            </li>
            <li>
              Emplea el conocimiento como recurso de control, no como bien
              compartido.
            </li>
            <li>
              Su conducta erosiona la confianza en el medio numismático.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>

          <p>
            <strong>Motivación:</strong> Obtener el mayor beneficio posible,
            incluso cuando ello implique desinformar, ocultar o aprovecharse de
            la falta de formación de otras personas.
          </p>

          <p>
            <strong>Conocimiento:</strong> Alto y funcional; conoce bien el
            campo, pero orienta ese saber a fines utilitarios y no a la
            construcción de una práctica responsable.
          </p>

          <p>
            <strong>Relación con las piezas:</strong> Predominantemente
            instrumental. Las piezas son vistas como objetos de rentabilidad
            antes que como documentos históricos o culturales.
          </p>

          <p>
            <strong>Rol en la comunidad:</strong> Distorsiona el mercado,
            debilita la confianza y contribuye a la confusión entre saber técnico
            y autoridad moral.
          </p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Este perfil no aporta positivamente al ecosistema numismático.
            Antes bien, representa uno de los mayores riesgos para su
            consolidación ética e intelectual, pues demuestra que el conocimiento
            sin integridad puede convertirse en un factor de descomposición del
            mercado y de deterioro de la confianza entre coleccionistas,
            investigadores y comerciantes.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            La existencia de este perfil subraya la necesidad de fortalecer la
            formación crítica, la documentación rigurosa, la validación entre
            pares y los principios éticos dentro del ámbito numismático y
            notafílico. No basta con saber: también es indispensable responder
            con responsabilidad ante el conocimiento que se posee.
          </p>
        </section>
      </div>
    </section>
  );
}