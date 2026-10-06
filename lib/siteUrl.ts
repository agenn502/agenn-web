const SITIO_PUBLICO_POR_DEFECTO = "https://agenn-web.vercel.app";

export function obtenerSitioPublico() {
  const configuradoServidor = String(process.env.SITE_URL || "").trim();
  const configuradoPublico = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const vercelProduccion = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();

  const esLocal = (valor: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(valor);

  const esValido = (valor: string) => {
    if (!valor || esLocal(valor)) return false;
    try {
      const url = new URL(valor);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  };

  let sitio = esValido(configuradoServidor)
    ? configuradoServidor
    : esValido(configuradoPublico)
      ? configuradoPublico
      : "";

  // Los enlaces enviados por correo nunca deben apuntar a localhost.
  if (!sitio) {
    sitio = vercelProduccion
      ? `https://${vercelProduccion.replace(/^https?:\/\//i, "")}`
      : SITIO_PUBLICO_POR_DEFECTO;
  }

  return sitio.replace(/\/+$/, "");
}
