import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política editorial, acceso abierto y derechos de autor",
  description:
    "Política editorial, acceso abierto, derechos de autor y licencias de Revista AGENN.",
};

const seccion: CSSProperties = { marginTop: "2rem" };
const parrafo: CSSProperties = { textAlign: "justify", lineHeight: 1.75 };

export default function NormasRevistaPage() {
  return (
    <main style={{ width: "min(920px, calc(100% - 32px))", margin: "0 auto", padding: "32px 0 64px" }}>
      <nav style={{ marginBottom: "28px" }}>
        <Link href="/revista/acerca">← Sobre la revista</Link>
      </nav>

      <header style={{ marginBottom: "32px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Revista AGENN
        </p>
        <h1>Política editorial, acceso abierto y derechos de autor</h1>
        <p style={parrafo}>
          Revista AGENN es una publicación académica y divulgativa de la Academia
          Guatemalteca de Estudios Numismáticos y Notafílicos (AGENN), dedicada a
          la investigación y difusión de la numismática, la notafilia, la exonumia
          y disciplinas afines, con especial atención a Guatemala.
        </p>
      </header>

      <section style={seccion}>
        <h2>Entidad editora</h2>
        <p style={parrafo}>
          <strong>Academia Guatemalteca de Estudios Numismáticos y Notafílicos (AGENN)</strong><br />
          Calle Principal No. 8, Colonia Santiago de los Caballeros, zona 0<br />
          Antigua Guatemala, Sacatepéquez, Guatemala<br />
          C. P. 03001
        </p>
        <p style={parrafo}><strong>Lugar de publicación:</strong> Antigua Guatemala, Guatemala.</p>
      </section>

      <section style={seccion}>
        <h2>Periodicidad</h2>
        <p style={parrafo}>
          Revista AGENN es una publicación cuatrimestral, con tres números programados cada año.
        </p>
      </section>

      <section style={seccion}>
        <h2>Acceso abierto</h2>
        <p style={parrafo}>
          Revista AGENN proporciona acceso abierto e inmediato a sus contenidos.
          La consulta de los trabajos publicados no requiere suscripción ni pago.
          Esta política busca favorecer la lectura, circulación, preservación y
          aprovechamiento académico del conocimiento publicado por la revista.
        </p>
      </section>

      <section style={seccion}>
        <h2>Derechos de autor</h2>
        <p style={parrafo}>
          Los autores conservan los derechos de autor sobre sus trabajos y conceden
          a Revista AGENN el derecho de primera publicación. La publicación en la
          revista no transfiere la titularidad de los derechos de autor a AGENN.
        </p>
      </section>

      <section style={seccion}>
        <h2>Licencia de los contenidos</h2>
        <p style={parrafo}>
          Salvo indicación en contrario, los textos originales publicados en Revista
          AGENN se distribuyen bajo la licencia{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noopener noreferrer license">
            Creative Commons Atribución 4.0 Internacional (CC BY 4.0)
          </a>.
        </p>
        <p style={parrafo}>
          Esta licencia permite copiar, redistribuir, adaptar y transformar el
          material para cualquier propósito, incluso comercial, siempre que se
          reconozca adecuadamente la autoría, se identifique a Revista AGENN como
          publicación original, se incluya un enlace a la licencia y se indique si
          se realizaron cambios.
        </p>
      </section>

      <section style={seccion}>
        <h2>Materiales de terceros</h2>
        <p style={parrafo}>
          La licencia CC BY 4.0 no se extiende automáticamente a imágenes,
          fotografías, reproducciones de monedas, billetes, medallas, fichas,
          documentos, portadas de libros u otros materiales de terceros incorporados
          a los trabajos. Estos materiales conservan los derechos, licencias o
          condiciones de uso señalados en sus respectivas fuentes. Cuando un material
          esté sujeto a condiciones distintas, dichas condiciones prevalecen para
          ese material.
        </p>
      </section>

      <section style={seccion}>
        <h2>Atribución recomendada</h2>
        <p style={parrafo}>
          Al reutilizar un trabajo se recomienda identificar al autor, el título del
          trabajo, Revista AGENN, el volumen y número correspondientes, el año de
          publicación y la dirección electrónica del trabajo, además de indicar que
          se encuentra bajo licencia CC BY 4.0 y señalar cualquier modificación realizada.
        </p>
      </section>

      <section style={seccion}>
        <h2>Proceso editorial</h2>
        <p style={parrafo}>
          Los manuscritos siguen un proceso de presentación, revisión, corrección y
          aval antes de su incorporación al banco de trabajos publicables. El Consejo
          Editorial selecciona los trabajos que integran cada número y conserva la
          versión aprobada para garantizar la integridad de la publicación.
        </p>
      </section>

      <section style={seccion}>
        <h2>Conflictos de interés e independencia editorial</h2>
        <p style={parrafo}>
          Los autores, revisores y miembros del Consejo Editorial deberán declarar
          cualquier circunstancia que pueda representar un conflicto de interés en
          relación con un manuscrito presentado a Revista AGENN.
        </p>
        <p style={parrafo}>
          Los integrantes del Consejo Editorial podrán presentar trabajos para su
          publicación en la revista. Cuando un integrante del Consejo figure como
          autor o coautor de una contribución, deberá abstenerse de participar en su
          evaluación, deliberación y decisión editorial. La gestión del manuscrito
          será realizada por los demás integrantes del Consejo Editorial, procurando
          que la valoración del trabajo sea independiente de las funciones editoriales
          desempeñadas por el autor.
        </p>
        <p style={parrafo}>
          La condición de integrante del Consejo Editorial no otorgará preferencia,
          trato diferenciado ni garantía de publicación.
        </p>
      </section>

      <section style={seccion}>
        <h2>Consejo Editorial</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Luis Alberto Rodríguez</li>
          <li>Manfred Morales Osterberg</li>
          <li>Gerónimo E. Pérez Irungaray</li>
        </ul>
      </section>

      <footer style={{ marginTop: "3rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(0,0,0,0.16)" }}>
        <p style={parrafo}>
          Esta política se aplica a Revista AGENN a partir de su primer número,
          Vol. 1, Núm. 1, septiembre de 2026. La política sobre conflictos de
          interés e independencia editorial entra en vigor el 24 de septiembre
          de 2026 y será aplicable a las decisiones editoriales adoptadas a partir
          de esa fecha.
        </p>
        <p><Link href="/revista">Volver a Revista AGENN</Link></p>
      </footer>
    </main>
  );
}