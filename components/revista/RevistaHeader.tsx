"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./RevistaHeader.module.css";

const enlaces = [
  { href: "/revista", texto: "Inicio", icono: "⌂" },
  { href: "/revista/numeros", texto: "Números", icono: "▤" },
  { href: "/revista/autores", texto: "Autores", icono: "♟" },
  { href: "/revista/acerca", texto: "Sobre la revista", icono: "✒" },
  { href: "/revista/buscar", texto: "Buscar", icono: "⌕" },
];

export default function RevistaHeader() {
  const pathname = usePathname();

  const esActivo = (href: string) => {
    if (href === "/revista") {
      return pathname === "/revista";
    }

    return pathname.startsWith(href);
  };

  return (
    <header className={styles.header}>
      <div className={styles.franjaSuperior}>
        <div className={styles.franjaContenido}>
          <span className={styles.lema}>
            <span className={styles.pluma}>✒</span>
            SCIENTIA · TRADITIO · MEMORIA
          </span>

          <span className={styles.nombreAcademia}>
            ACADEMIA GUATEMALTECA DE ESTUDIOS NUMISMÁTICOS Y NOTAFÍLICOS
          </span>
        </div>
      </div>

      <div className={styles.masthead}>
        <div className={styles.logoContenedor}>
          <Image
            src="/logo-agenn.png"
            alt="Academia Guatemalteca de Estudios Numismáticos y Notafílicos"
            width={330}
            height={330}
            priority
            className={styles.logo}
          />
        </div>

        <div className={styles.separador} aria-hidden="true" />

        <div className={styles.tituloContenedor}>
          <div className={styles.subtitulo}>
            <span />
            PUBLICACIÓN ACADÉMICA
            <span />
          </div>

          <Link href="/revista" className={styles.enlaceTitulo}>
            <span className={styles.revista}>REVISTA</span>
            <span className={styles.agenn}>AGENN</span>
          </Link>

          <div className={styles.lineaDecorativa}>
            <span />
            <i />
            <span />
          </div>

          <p className={styles.frase}>
            CONOCIMIENTO QUE TRASCIENDE, IMPACTO QUE TRANSFORMA
          </p>
        </div>

        <div className={styles.globoContenedor} aria-hidden="true">
          <Image
            src="/globe.svg"
            alt=""
            width={360}
            height={360}
            className={styles.globo}
          />
        </div>
      </div>

      <nav className={styles.navegacion} aria-label="Navegación de la revista">
        <div className={styles.menu}>
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`${styles.opcion} ${
                esActivo(enlace.href) ? styles.activa : ""
              }`}
            >
              <span className={styles.icono} aria-hidden="true">
                {enlace.icono}
              </span>
              <span>{enlace.texto}</span>
            </Link>
          ))}

          <a
            href="https://agenn-web.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.opcion}
          >
            <span className={styles.icono} aria-hidden="true">
              ↗
            </span>
            <span>AGENN</span>
          </a>
        </div>
      </nav>
    </header>
  );
}