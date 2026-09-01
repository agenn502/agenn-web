import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sobre la revista",
  description:
    "Propósito, periodicidad y alcance editorial de Revista AGENN.",
};

export default function AcercaRevistaPage() {
  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <p className={styles.etiqueta}>Identidad editorial</p>
        <h1>Sobre la revista</h1>

        <div className={styles.linea} aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <p>
          Revista AGENN es la publicación académica y divulgativa de la
          Academia Guatemalteca de Estudios Numismáticos y Notafílicos.
        </p>
      </header>

      <main className={styles.contenido}>
        <section className={styles.presentacion}>
          <p>
            La revista constituye un espacio para investigar, interpretar y
            divulgar el patrimonio numismático, notafílico y exonúmico. Por
            medio de sus páginas, los miembros de AGENN comparten trabajos que
            contribuyen al conocimiento de las monedas, billetes, medallas,
            fichas y otros objetos vinculados con la historia monetaria.
          </p>

          <p>
            Su atención se dirige especialmente a Guatemala, sin excluir
            estudios regionales, comparativos o interdisciplinarios que ayuden
            a comprender estos bienes como testimonios históricos, artísticos,
            económicos, políticos y sociales.
          </p>
        </section>

        <section className={styles.datosClave}>
          <article>
            <span>01</span>
            <h2>Periodicidad</h2>
            <p>
              Publicación cuatrimestral, con tres números programados cada año.
            </p>
          </article>

          <article>
            <span>02</span>
            <h2>Acceso</h2>
            <p>
              Consulta digital orientada a investigadores, coleccionistas,
              estudiantes y público interesado.
            </p>
          </article>

          <article>
            <span>03</span>
            <h2>Autoría</h2>
            <p>
              Trabajos elaborados por miembros de la Academia y vinculados con
              sus áreas de estudio.
            </p>
          </article>
        </section>

        <section className={styles.bloque}>
          <div className={styles.numero}>I</div>
          <div>
            <h2>Propósito</h2>
            <p>
              Promover la producción y circulación de conocimiento riguroso
              sobre numismática, notafilia y exonumia; estimular nuevas líneas
              de investigación; preservar la memoria documental y material, y
              acercar los resultados de estos estudios a públicos diversos.
            </p>
          </div>
        </section>

        <section className={styles.bloque}>
          <div className={styles.numero}>II</div>
          <div>
            <h2>Contenidos</h2>
            <p>
              Revista AGENN publica ensayos, investigaciones, estudios
              monográficos y otros aportes académicos relacionados con las
              disciplinas cultivadas por la Academia. Cada número puede
              organizar sus trabajos en secciones de acuerdo con la naturaleza
              y temática de las contribuciones seleccionadas.
            </p>
          </div>
        </section>

        <section className={styles.bloque}>
          <div className={styles.numero}>III</div>
          <div>
            <h2>Proceso editorial</h2>
            <p>
              Los manuscritos siguen un proceso interno de presentación,
              revisión, corrección y aval antes de incorporarse al banco de
              trabajos publicables. El Consejo Editorial selecciona los textos
              que integrarán cada número y conserva la versión aprobada para
              garantizar la integridad de la publicación.
            </p>
          </div>
        </section>

        <section className={styles.cierre}>
          <p className={styles.lema}>
            Scientia · Traditio · Memoria
          </p>
          <h2>Conocimiento que trasciende, impacto que transforma</h2>
          <p>
            Cada número busca convertir el estudio especializado en una forma
            de preservar, comprender y compartir la memoria histórica.
          </p>

          <Link href="/revista/numeros">Explorar los números</Link>
        </section>
      </main>
    </div>
  );
}