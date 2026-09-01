"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const esRevistaPublica =
    pathname === "/revista" || pathname.startsWith("/revista/");

  const esVistaPreviaRevista =
    pathname.startsWith("/miembros/revista/numeros/") &&
    (pathname.includes("/vista-previa") ||
      pathname.includes("/articulos/"));

  const esRevista = esRevistaPublica || esVistaPreviaRevista;

  if (esRevista) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
    </>
  );
}