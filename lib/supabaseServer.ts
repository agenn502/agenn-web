import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const esperar = (milisegundos: number) =>
  new Promise((resolve) => setTimeout(resolve, milisegundos));

const fetchConReintentos: typeof fetch = async (input, init) => {
  const metodo = String(init?.method || "GET").toUpperCase();
  const esLectura = metodo === "GET" || metodo === "HEAD";
  const intentos = esLectura ? 3 : 1;

  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      const respuesta = await fetch(input, init);

      const estadoReintentable =
        respuesta.status === 408 ||
        respuesta.status === 429 ||
        respuesta.status === 500 ||
        respuesta.status === 502 ||
        respuesta.status === 503 ||
        respuesta.status === 504;

      if (!esLectura || !estadoReintentable || intento === intentos) {
        return respuesta;
      }
    } catch (error) {
      if (!esLectura || intento === intentos) throw error;
    }

    await esperar(250 * intento);
  }

  throw new Error("No fue posible completar la consulta a Supabase.");
};

export const supabaseServer = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchConReintentos,
    },
  }
);
