import { NextResponse } from "next/server";
import { enviarCorreo, plantillaCorreo } from "@/lib/email";

export async function GET() {
  const resultado = await enviarCorreo({
    para: "gero_perez@yahoo.com",
    asunto: "Prueba de correo - Plataforma AGENN",
    html: plantillaCorreo(`
      <p>Estimado Gerónimo:</p>

      <p>Si está leyendo este mensaje, significa que la plataforma <strong>AGENN</strong> ha enviado correctamente su primer correo institucional.</p>

      <p>A partir de este momento la plataforma podrá enviar automáticamente:</p>

      <ul>
        <li>Notificaciones de aprobación.</li>
        <li>Solicitudes de corrección.</li>
        <li>Mensajes de bienvenida.</li>
      </ul>

      <p><em>Scientia, Traditio et Memoria.</em></p>
    `),
  });

  return NextResponse.json(resultado);
}