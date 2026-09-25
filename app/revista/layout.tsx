import type { Metadata } from "next";
import RevistaHeader from "../../components/revista/RevistaHeader";
import Footer from "../../components/Footer";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: {
    default: "Revista AGENN",
    template: "%s | Revista AGENN",
  },
  description:
    "Publicación académica de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.",
};

export default function RevistaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={styles.soloPantallaImpresion}>
        <RevistaHeader />
      </div>
      <main>{children}</main>
      <div className={styles.soloPantallaImpresion}>
        <Footer />
      </div>
    </>
  );
}
