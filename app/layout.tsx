import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SiteChrome from "../components/SiteChrome";

export const metadata: Metadata = {
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const analyticsActivo =
    process.env.NODE_ENV === "production" && Boolean(gaId);

  return (
    <html lang="es">
      <body>
        <SiteChrome>{children}</SiteChrome>

        {analyticsActivo && gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}