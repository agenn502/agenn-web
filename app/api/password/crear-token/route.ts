import {
  createHash,
  randomBytes,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(
  request: NextRequest
) {
  try {
    // -------------------------------------------------------
    // 1. Protección interna
    // -------------------------------------------------------
    //
    // Este route NO debe poder ser utilizado libremente
    // desde el navegador, porque permitiría generar enlaces
    // para cambiar la contraseña de otra persona.
    //
    // Posteriormente lo llamarán únicamente nuestros routes
    // internos de:
    //
    // - incorporación
    // - aprobación de candidatos
    // - ascenso
    // -------------------------------------------------------

    const secretoRecibido =
      request.headers.get(
        "x-internal-secret"
      );

    const secretoEsperado =
      process.env.CRON_SECRET;

    if (
      !secretoEsperado ||
      secretoRecibido !==
        secretoEsperado
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Acceso no autorizado.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const codigo = String(
      body.codigo || ""
    )
      .trim()
      .toUpperCase();

    const tipo = String(
      body.tipo || "crear"
    )
      .trim()
      .toLowerCase();

    if (!codigo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe indicarse el código del usuario.",
        },
        { status: 400 }
      );
    }

    if (
      tipo !== "crear" &&
      tipo !== "restablecer"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El tipo de enlace no es válido.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 2. Comprobar que el usuario exista
    // -------------------------------------------------------

    const {
      data: usuario,
      error: usuarioError,
    } = await supabaseServer
      .from("users")
      .select(
        "codigo,nombre,nivel"
      )
      .eq("codigo", codigo)
      .maybeSingle();

    if (usuarioError) {
      throw new Error(
        usuarioError.message
      );
    }

    if (!usuario) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No existe un usuario con ese código.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 3. Invalidar tokens pendientes anteriores
    // -------------------------------------------------------

    const ahora =
      new Date().toISOString();

    const {
      error:
        invalidarError,
    } = await supabaseServer
      .from("password_tokens")
      .update({
        estado: "vencido",
      })
      .eq("codigo", codigo)
      .eq("tipo", tipo)
      .eq("estado", "pendiente");

    if (invalidarError) {
      throw new Error(
        invalidarError.message
      );
    }

    // -------------------------------------------------------
    // 4. Crear token criptográficamente seguro
    // -------------------------------------------------------

    const tokenReal =
      randomBytes(32).toString(
        "hex"
      );

    const tokenHash =
      hashToken(tokenReal);

    /*
     * Vigencia:
     *
     * 24 horas para crear/restablecer contraseña.
     */

    const vencimiento =
      new Date();

    vencimiento.setHours(
      vencimiento.getHours() + 24
    );

    // -------------------------------------------------------
    // 5. Guardar únicamente el hash
    // -------------------------------------------------------

    const {
      error: tokenError,
    } = await supabaseServer
      .from("password_tokens")
      .insert({
        codigo,
        token: tokenHash,
        tipo,
        estado:
          "pendiente",
        fecha_creacion:
          ahora,
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

    // -------------------------------------------------------
    // 6. Construir enlace
    // -------------------------------------------------------

    const sitio =
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const enlace =
      `${sitio}/crear-password?token=${encodeURIComponent(
        tokenReal
      )}`;

    return NextResponse.json({
      ok: true,

      codigo,

      tipo,

      enlace,

      fechaVencimiento:
        vencimiento.toISOString(),
    });
  } catch (error) {
    console.error(
      "Error en /api/password/crear-token:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible generar el enlace de contraseña.",
      },
      { status: 500 }
    );
  }
}