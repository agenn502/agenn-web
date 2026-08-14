import {
  createHash,
  randomBytes,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import {
  enviarCorreo,
  plantillaCorreo,
} from "@/lib/email";

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const codigo = String(
      body.codigo || ""
    )
      .trim()
      .toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe indicar su código institucional.",
        },
        { status: 400 }
      );
    }

    const {
      data: usuario,
      error: usuarioError,
    } = await supabaseServer
      .from("users")
      .select(
        "codigo,nombre,nivel,correo"
      )
      .eq("codigo", codigo)
      .maybeSingle();

    if (usuarioError) {
      throw new Error(
        usuarioError.message
      );
    }

    /*
     * No revelamos si el código existe o no.
     * Esto evita que alguien utilice el formulario
     * para comprobar qué códigos están registrados.
     */
    if (
      !usuario ||
      !usuario.correo
    ) {
      return NextResponse.json({
        ok: true,
        mensaje:
          "Si el código corresponde a una cuenta con correo registrado, recibirá un enlace para restablecer su contraseña.",
      });
    }

    // Invalidar recuperaciones anteriores pendientes

    const {
      error: invalidarError,
    } = await supabaseServer
      .from("password_tokens")
      .update({
        estado: "vencido",
      })
      .eq("codigo", codigo)
      .eq("tipo", "restablecer")
      .eq("estado", "pendiente");

    if (invalidarError) {
      throw new Error(
        invalidarError.message
      );
    }

    // Generar token seguro

    const tokenReal =
      randomBytes(32).toString(
        "hex"
      );

    const tokenHash =
      hashToken(tokenReal);

    const vencimiento =
      new Date();

    vencimiento.setHours(
      vencimiento.getHours() + 24
    );

    const {
      error: tokenError,
    } = await supabaseServer
      .from("password_tokens")
      .insert({
        codigo,
        token: tokenHash,
        tipo: "restablecer",
        estado: "pendiente",
        fecha_creacion:
          new Date().toISOString(),
        fecha_vencimiento:
          vencimiento.toISOString(),
        fecha_utilizacion:
          null,
      });

    if (tokenError) {
      throw new Error(
        tokenError.message
      );
    }

    const sitio = process.env.NEXT_PUBLIC_SITE_URL;

		if (!sitio) {
		  throw new Error(
			"NEXT_PUBLIC_SITE_URL no está configurada."
		  );
		}

    const enlace =
      `${sitio}/crear-password?token=${encodeURIComponent(
        tokenReal
      )}`;

    const correoResultado =
      await enviarCorreo({
        para: usuario.correo,

        asunto:
          "AGENN | Restablecer contraseña",

        html:
          plantillaCorreo(`
            <p>
              Estimado(a)
              <strong>${usuario.nombre}</strong>:
            </p>

            <p>
              Recibimos una solicitud para restablecer la contraseña
              asociada a su cuenta de la Academia Guatemalteca de
              Estudios Numismáticos y Notafílicos.
            </p>

            <div
              style="
                background:#faf8f3;
                border-left:5px solid #6b6f1a;
                padding:16px;
                margin:22px 0;
                line-height:1.8;
              "
            >
              <strong>Código institucional:</strong>
              ${usuario.codigo}
            </div>

            <p>
              Puede crear una nueva contraseña mediante el siguiente
              enlace seguro:
            </p>

            <p
              style="
                text-align:center;
                margin:30px 0;
              "
            >
              <a
                href="${enlace}"
                style="
                  display:inline-block;
                  background:#6b6f1a;
                  color:white;
                  text-decoration:none;
                  padding:13px 22px;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                Restablecer mi contraseña
              </a>
            </p>

            <p
              style="
                color:#666;
                font-size:14px;
                line-height:1.7;
              "
            >
              Este enlace es personal, puede utilizarse una sola vez
              y tendrá una vigencia de 24 horas.
            </p>

            <p
              style="
                color:#666;
                font-size:14px;
                line-height:1.7;
              "
            >
              Si no encuentra este mensaje en su bandeja de entrada,
              revise también las carpetas de Spam o Correo no deseado.
            </p>

            <p>
              Si usted no solicitó este cambio, puede ignorar este
              mensaje. Su contraseña actual continuará funcionando.
            </p>

            <p>
              <strong>Consejo Académico</strong><br>
              Academia Guatemalteca de Estudios Numismáticos y
              Notafílicos
            </p>
          `),
      });

    return NextResponse.json({
      ok: true,

      mensaje:
        "Si el código corresponde a una cuenta con correo registrado, recibirá un enlace para restablecer su contraseña.",

      correo:
        correoResultado,
    });
  } catch (error) {
    console.error(
      "Error en /api/password/recuperar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible procesar la recuperación de contraseña.",
      },
      { status: 500 }
    );
  }
}