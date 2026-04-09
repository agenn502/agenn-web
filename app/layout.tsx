import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "AGENN",
  description:
    "Academia Guatemalteca de Estudios Numismáticos y Notafílicos",

  openGraph: {
    title: "AGENN",
    description:
      "Academia Guatemalteca de Estudios Numismáticos y Notafílicos",
    url: "https://agenn-web.vercel.app",
    siteName: "AGENN",
    images: [
      {
        url: "/preview.jpg",
        width: 512,
        height: 512,
      },
    ],
    locale: "es_GT",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Header />
        <main className="site-main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}