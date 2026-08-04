import nodemailer from "nodemailer";

const usuario = process.env.GMAIL_USER;
const appPassword = process.env.GMAIL_APP_PASSWORD;

export type ResultadoCorreo = {
  enviado: boolean;
  error?: string;
};

export async function enviarCorreo(params: {
  para: string;
  asunto: string;
  html: string;
}): Promise<ResultadoCorreo> {
  if (!usuario || !appPassword) {
    return {
      enviado: false,
      error: "Faltan GMAIL_USER o GMAIL_APP_PASSWORD en las variables de entorno.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: usuario,
        pass: appPassword,
      },
    });

	await transporter.verify();
	
    await transporter.sendMail({
      from: `"Academia Guatemalteca de Estudios Numismáticos y Notafílicos" <${usuario}>`,
      to: params.para,
      subject: params.asunto,
      html: params.html,
    });

    return { enviado: true };
  } catch (error) {
    return {
      enviado: false,
      error: error instanceof Error ? error.message : "No fue posible enviar el correo.",
    };
  }
}

export function plantillaCorreo(contenido: string) {
  return `
  <div style="font-family:Georgia,'Times New Roman',serif;background:#f7f4ee;padding:24px;color:#1f1f1f">
    <div style="max-width:680px;margin:auto;background:white;border:1px solid #ddd4c7;border-radius:12px;overflow:hidden">
      <div style="background:#4f5f2f;color:white;padding:24px;text-align:center">
        <h2 style="margin:0">Academia Guatemalteca de Estudios Numismáticos y Notafílicos</h2>
        <p style="margin:8px 0 0;font-style:italic">Scientia, Traditio et Memoria</p>
      </div>
      <div style="padding:28px;line-height:1.7">${contenido}</div>
      <div style="padding:18px 28px;background:#f8f5ef;color:#555;font-size:13px;text-align:center">
        Este mensaje fue generado por la plataforma oficial de la AGENN.
      </div>
    </div>
  </div>`;
}
