import type { Metadata } from "next";
import RevistaHeader from "../../components/revista/RevistaHeader";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: {
    default: "Revista AGENN",
    template: "%s | Revista AGENN",
  },
  description:
    "Publicación académica de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.",
  openGraph: {
    title: "Revista AGENN",
    description:
      "Investigación y difusión de los estudios numismáticos y notafílicos.",
    url: "https://agenn-web.vercel.app/revista",
    siteName: "Revista AGENN",
    locale: "es_GT",
    type: "website",
  },
};

export default function RevistaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RevistaHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}