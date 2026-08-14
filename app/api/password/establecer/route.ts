import {
  createHash,
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

function validarPassword(
  password: string
) {
  if (password.length < 8) {
    return "La contraseña debe contener al menos 8 caracteres.";
  }

  if (
    !/[A-Za-z]/.test(password)
  ) {
    return "La contraseña debe contener al menos una letra.";
  }

  if (
    !/[0-9]/.test(password)
  ) {
    return "La contraseña debe contener al menos un número.";
  }

  return null;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const tokenReal = String(
      body.token || ""
    ).trim();

    const password = String(
      body.password || ""
    );

    if (
      !tokenReal ||
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan datos para establecer la contraseña.",
        },
        { status: 400 }
      );
    }

    const errorPassword =
      validarPassword(
        password
      );

    if (errorPassword) {
      return NextResponse.json(
        {
          ok: false,
          error:
            errorPassword,
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 1. Convertir token recibido a hash
    // -------------------------------------------------------

    const tokenHash =
      hashToken(tokenReal);

    // -------------------------------------------------------
    // 2. Buscar token
    // -------------------------------------------------------

    const {
      data: registro,
      error: registroError,
    } = await supabaseServer
      .from("password_tokens")
      .select(
        `
        id,
        codigo,
        tipo,
        estado,
        fecha_creacion,
        fecha_vencimiento,
        fecha_utilizacion
        `
      )
      .eq(
        "token",
        tokenHash
      )
      .maybeSingle();

    if (registroError) {
      throw new Error(
        registroError.message
      );
    }

    if (!registro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace no es válido.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 3. Verificar estado
    // -------------------------------------------------------

    if (
      registro.estado ===
      "utilizado"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este enlace ya fue utilizado.",
        },
        { status: 409 }
      );
    }

    if (
      registro.estado ===
      "vencido"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este enlace ha vencido.",
        },
        { status: 410 }
      );
    }

    if (
      registro.estado !==
      "pendiente"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este enlace ya no está disponible.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // 4. Verificar vencimiento
    // -------------------------------------------------------

    const ahora =
      new Date();

    const vencimiento =
      new Date(
        registro.fecha_vencimiento
      );

    if (
      vencimiento.getTime() <
      ahora.getTime()
    ) {
      await supabaseServer
        .from(
          "password_tokens"
        )
        .update({
          estado:
            "vencido",
        })
        .eq(
          "id",
          registro.id
        );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Este enlace ha vencido.",
        },
        { status: 410 }
      );
    }

    // -------------------------------------------------------
    // 5. Verificar usuario
    // -------------------------------------------------------

    const {
      data: usuario,
      error: usuarioError,
    } = await supabaseServer
      .from("users")
      .select(
        "codigo,nombre,nivel"
      )
      .eq(
        "codigo",
        registro.codigo
      )
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
            "No se encontró la cuenta asociada a este enlace.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 6. Establecer contraseña
    // -------------------------------------------------------
    //
    // IMPORTANTE:
    //
    // Tu sistema actual utiliza users.password directamente
    // en el login. Por eso guardamos aquí la contraseña con
    // el mecanismo compatible con la arquitectura actual.
    //
    // Más adelante podemos migrar todo users.password a hash
    // sin mezclar esa migración con este cambio.
    // -------------------------------------------------------

    const {
      error:
        passwordError,
    } = await supabaseServer
      .from("users")
      .update({
        password,
      })
      .eq(
        "codigo",
        registro.codigo
      );

    if (passwordError) {
      throw new Error(
        passwordError.message
      );
    }

    // -------------------------------------------------------
    // 7. Consumir token
    // -------------------------------------------------------

    const fechaUtilizacion =
      new Date().toISOString();

    const {
      error:
        utilizarError,
    } = await supabaseServer
      .from("password_tokens")
      .update({
        estado:
          "utilizado",

        fecha_utilizacion:
          fechaUtilizacion,
      })
      .eq(
        "id",
        registro.id
      );

    if (utilizarError) {
      throw new Error(
        utilizarError.message
      );
    }

    // -------------------------------------------------------
    // 8. Invalidar cualquier otro token pendiente
    //    del mismo tipo para esta cuenta
    // -------------------------------------------------------

    await supabaseServer
      .from("password_tokens")
      .update({
        estado:
          "vencido",
      })
      .eq(
        "codigo",
        registro.codigo
      )
      .eq(
        "tipo",
        registro.tipo
      )
      .eq(
        "estado",
        "pendiente");

    return NextResponse.json({
      ok: true,

      mensaje:
        registro.tipo ===
        "crear"
          ? "Su contraseña fue creada correctamente."
          : "Su contraseña fue actualizada correctamente.",

      codigo:
        registro.codigo,

      nombre:
        usuario.nombre,

      nivel:
        usuario.nivel,
    });
  } catch (error) {
    console.error(
      "Error en /api/password/establecer:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No fue posible establecer la contraseña.",
      },
      { status: 500 }
    );
  }
}