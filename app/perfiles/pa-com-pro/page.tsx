export default function PerfilPage() {
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
          <h1>Perfil A</h1>
          <h2 style={{ fontStyle: "italic", color: "#6b4f2a" }}>
            El Comerciante Profesional
          </h2>
        </div>

        <p style={{ fontStyle: "italic", color: "#555" }}>
          Este perfil ha sido identificado a partir de la exploración inicial.
        </p>

        <section className="card">
          <h3>Descripción</h3>
          <p>
            Es una persona con conocimiento sólido de las piezas que maneja y que
            ha convertido la compra y venta de monedas o billetes en una actividad
            profesional. Su principal motivación es comercial, pero desarrolla su
            trabajo con criterios éticos, transparencia y respeto por el comprador
            y por el mercado.
          </p>
        </section>

        <section className="card">
          <h3>Rasgos principales</h3>
          <ul>
            <li>Conoce la historia, rareza y valor aproximado de las piezas que ofrece.</li>
            <li>Describe con precisión el estado de conservación, defectos o intervenciones.</li>
            <li>Mantiene una conducta comercial responsable y transparente.</li>
            <li>Rechaza piezas de procedencia dudosa cuando ello compromete su integridad profesional.</li>
            <li>Comprende que la confianza constituye uno de los principales activos del mercado numismático.</li>
          </ul>
        </section>

        <section className="card">
          <h3>Perfil detallado</h3>
          <p><strong>Motivación:</strong> La actividad comercial legítima y sostenible basada en conocimiento técnico.</p>
          <p><strong>Conocimiento:</strong> Sólido y aplicado principalmente a la valoración, descripción y circulación de piezas.</p>
          <p><strong>Relación con las piezas:</strong> Profesional e instrumental, orientada al intercambio responsable.</p>
          <p><strong>Rol en la comunidad:</strong> Intermediario confiable entre piezas, coleccionistas e investigadores.</p>
        </section>

        <section className="card">
          <h3>Valor dentro del ecosistema numismático</h3>
          <p>
            Cumple una función importante en la circulación legítima de materiales
            numismáticos y notafílicos. Cuando actúa con rectitud, fortalece la
            confianza del público y contribuye a un mercado sano y bien informado.
          </p>
        </section>

        <section className="card">
          <h3>Observaciones</h3>
          <p>
            Este perfil puede evolucionar hacia formas más académicas cuando el
            interés comercial se complementa con documentación, investigación y
            difusión del conocimiento.
          </p>
        </section>
      </div>
    </section>
  );
}