import Link from "next/link";
import styles from "./page.module.css";

export default function RevistaPage() {
  return (
    <div className={styles.portada}>
      <section className={styles.presentacion}>
        <p className={styles.etiqueta}>Publicación académica cuatrimestral</p>

        <h1>Una revista para investigar, interpretar y divulgar</h1>

        <div className={styles.linea} aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <p className={styles.introduccion}>
          <strong>Revista AGENN</strong> es el canal de divulgación académica de
          la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.
          Publicada con periodicidad cuatrimestral —tres números al año—, ofrece
          un espacio para compartir investigaciones, ensayos y estudios
          elaborados por los miembros de la Academia.
        </p>

        <p className={styles.descripcion}>
          Sus páginas están dedicadas al conocimiento, análisis y difusión del
          patrimonio numismático, notafílico y exonúmico, con especial atención
          a Guatemala y a su relación con la historia, el arte, la economía y
          la sociedad. Cada publicación busca acercar el trabajo académico tanto
          a especialistas y coleccionistas como a lectores interesados en
          comprender el significado histórico y cultural de estos objetos.
        </p>

        <div className={styles.acciones}>
          <Link href="/revista/numeros" className={styles.botonPrincipal}>
            Explorar los números
          </Link>

        </div>
      </section>

      <section className={styles.caracteristicas}>
        <article>
          <span>01</span>
          <h2>Periodicidad</h2>
          <p>
            Tres números al año, publicados con frecuencia cuatrimestral.
          </p>
        </article>

        <article>
          <span>02</span>
          <h2>Contenido académico</h2>
          <p>
            Ensayos, investigaciones y estudios elaborados por miembros de
            AGENN.
          </p>
        </article>

        <article>
          <span>03</span>
          <h2>Acceso y divulgación</h2>
          <p>
            Conocimiento especializado presentado para investigadores,
            coleccionistas y público interesado.
          </p>
        </article>
      </section>
    </div>
  );
}