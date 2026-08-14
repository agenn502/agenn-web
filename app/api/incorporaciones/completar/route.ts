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

function nombreNivel(nivel: string) {
  if (nivel === "INV") {
    return "Académico Investigador";
  }

  if (nivel === "NUM") {
    return "Académico Numerario";
  }

  return nivel;
}

function nombreModalidad(
  modalidad: string | null
) {
  if (modalidad === "INV_FORMACION") {
    return "Académico Investigador — en formación";
  }

  if (modalidad === "INV_ACREDITADO") {
    return "Académico Investigador acreditado";
  }

  if (modalidad === "NUM") {
    return "Académico Numerario";
  }

  return "";
}

async function siguienteCodigo(
  prefijo: "INV" | "NUM"
) {
  const [
    {
      data: usuarios,
      error: usersError,
    },
    {
      data: miembros,
      error: miembrosError,
    },
  ] = await Promise.all([
    supabaseServer
      .from("users")
      .select("codigo")
      .like(
        "codigo",
        `${prefijo}%`
      ),

    supabaseServer
      .from("miembros")
      .select("codigo")
      .like(
        "codigo",
        `${prefijo}%`
      ),
  ]);

  if (usersError) {
    throw new Error(
      usersError.message
    );
  }

  if (miembrosError) {
    throw new Error(
      miembrosError.message
    );
  }

  const usados =
    new Set<number>();

  [
    ...(usuarios || []),
    ...(miembros || []),
  ].forEach((fila) => {
    const coincidencia =
      String(
        fila.codigo || ""
      ).match(
        new RegExp(
          `^${prefijo}(\\d+)$`
        )
      );

    if (coincidencia) {
      usados.add(
        Number(
          coincidencia[1]
        )
      );
    }
  });

  let numero = 1;

  while (
    usados.has(numero)
  ) {
    numero += 1;
  }

  if (numero > 9999) {
    throw new Error(
      `No hay códigos ${prefijo} disponibles.`
    );
  }

  return `${prefijo}${String(
    numero
  ).padStart(4, "0")}`;
}

export async function POST(
  request: NextRequest
) {
  let codigoNuevo = "";

  let usuarioCreado =
    false;

  let miembroCreado =
    false;

  let tokenPasswordCreado =
    false;

  try {
    const body =
      await request.json();

    const token = String(
      body.token || ""
    ).trim();

    const nombre = String(
      body.nombre || ""
    ).trim();

    const correo = String(
      body.correo || ""
    )
      .trim()
      .toLowerCase();

    const telefono =
      body.telefono
        ? String(
            body.telefono
          ).trim()
        : null;

    const profesion =
      body.profesion
        ? String(
            body.profesion
          ).trim()
        : null;

    const bio =
      body.bio
        ? String(
            body.bio
          ).trim()
        : null;

    const fechaNacimiento =
      body.fechaNacimiento
        ? String(
            body.fechaNacimiento
          ).trim()
        : null;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace de incorporación no contiene un token válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !nombre ||
      !correo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe indicar su nombre completo y correo electrónico.",
        },
        {
          status: 400,
        }
      );
    }

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        correo
      );

    if (!correoValido) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El correo electrónico no tiene un formato válido.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // 1. Buscar invitación
    // -------------------------------------------------------

    const {
      data: invitacion,
      error:
        invitacionError,
    } = await supabaseServer
      .from(
        "incorporaciones_invitaciones"
      )
      .select(
        `
        id,
        asimilacion_id,
        correo,
        estado,
        fecha_vencimiento,
        fecha_aceptacion,
        fecha_utilizacion
        `
      )
      .eq(
        "token",
        token
      )
      .maybeSingle();

    if (
      invitacionError
    ) {
      throw new Error(
        invitacionError.message
      );
    }

    if (!invitacion) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La invitación no existe o el enlace no es válido.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // 2. Verificar vigencia
    // -------------------------------------------------------

    const ahora =
      new Date();

    const vencimiento =
      new Date(
        invitacion.fecha_vencimiento
      );

    if (
      vencimiento.getTime() <
      ahora.getTime()
    ) {
      if (
        invitacion.estado !==
        "utilizada"
      ) {
        await supabaseServer
          .from(
            "incorporaciones_invitaciones"
          )
          .update({
            estado:
              "vencida",
          })
          .eq(
            "id",
            invitacion.id
          );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta invitación ha vencido.",
        },
        {
          status: 410,
        }
      );
    }

    // -------------------------------------------------------
    // 3. Evitar doble incorporación
    // -------------------------------------------------------

    if (
      invitacion.estado ===
      "utilizada"
    ) {
      const {
        data:
          incorporacionExistente,
      } = await supabaseServer
        .from(
          "asimilaciones"
        )
        .select(
          "codigo_asignado"
        )
        .eq(
          "id",
          invitacion.asimilacion_id
        )
        .maybeSingle();

      return NextResponse.json({
        ok: true,
        yaCompletada:
          true,
        codigo:
          incorporacionExistente
            ?.codigo_asignado ||
          null,
      });
    }

    if (
      invitacion.estado !==
      "aceptada"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe aceptar primero la invitación antes de completar su incorporación.",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------------
    // 4. Obtener expediente aprobado
    // -------------------------------------------------------

    const {
      data: incorporacion,
      error:
        incorporacionError,
    } = await supabaseServer
      .from("asimilaciones")
      .select(
        `
        id,
        nombre,
        sexo,
        correo,
        telefono,
        nivel_propuesto,
        modalidad_incorporacion,
        estado,
        fecha_aceptacion,
        fecha_incorporacion,
        codigo_asignado
        `
      )
      .eq(
        "id",
        invitacion.asimilacion_id
      )
      .maybeSingle();

    if (
      incorporacionError ||
      !incorporacion
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró el expediente de incorporación.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      incorporacion.codigo_asignado
    ) {
      return NextResponse.json({
        ok: true,
        yaCompletada:
          true,
        codigo:
          incorporacion.codigo_asignado,
      });
    }

    const modalidad =
      incorporacion.modalidad_incorporacion;

    if (
      ![
        "INV_FORMACION",
        "INV_ACREDITADO",
        "NUM",
      ].includes(modalidad)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La modalidad de incorporación no está definida correctamente.",
        },
        {
          status: 409,
        }
      );
    }

    const nivel:
      | "INV"
      | "NUM" =
      modalidad === "NUM"
        ? "NUM"
        : "INV";

    // -------------------------------------------------------
    // 5. Estado académico
    // -------------------------------------------------------

    const estadoAcademico =
      modalidad ===
      "INV_ACREDITADO"
        ? "ACREDITADO"
        : modalidad ===
          "INV_FORMACION"
        ? "EN_FORMACION"
        : null;

    const origenAcreditacion =
      modalidad ===
      "INV_ACREDITADO"
        ? "RECONOCIMIENTO"
        : null;

    // -------------------------------------------------------
    // 6. Generar código
    // -------------------------------------------------------

    codigoNuevo =
      await siguienteCodigo(
        nivel
      );

    // -------------------------------------------------------
    // 7. Verificar código
    // -------------------------------------------------------

    const {
      data:
        codigoYaExistente,
      error:
        codigoExistenteError,
    } = await supabaseServer
      .from("users")
      .select("codigo")
      .eq(
        "codigo",
        codigoNuevo
      )
      .maybeSingle();

    if (
      codigoExistenteError
    ) {
      throw new Error(
        codigoExistenteError.message
      );
    }

    if (
      codigoYaExistente
    ) {
      throw new Error(
        "El código institucional generado ya está en uso. Intente nuevamente."
      );
    }

    // -------------------------------------------------------
    // 8. Crear usuario SIN contraseña
    // -------------------------------------------------------

    const {
      error:
        usuarioError,
    } = await supabaseServer
      .from("users")
      .insert({
        codigo:
          codigoNuevo,

        /*
         * La cuenta existe, pero todavía
         * no puede iniciar sesión.
         */
        password: null,

        nivel,
        nombre,
        consejo: false,
		correo,
      });

    if (usuarioError) {
      throw new Error(
        usuarioError.message
      );
    }

    usuarioCreado =
      true;

    // -------------------------------------------------------
    // 9. Crear expediente del miembro
    // -------------------------------------------------------

    const {
      error:
        miembroError,
    } = await supabaseServer
      .from("miembros")
      .insert({
        codigo:
          codigoNuevo,

        nombre,

        nivel,

        foto_url:
          null,

        fecha_nacimiento:
          fechaNacimiento,

        profesion,

        bio,

        consejo:
          false,

        publicaciones:
          null,

        estado_academico:
          estadoAcademico,

        origen_acreditacion:
          origenAcreditacion,
      });

    if (miembroError) {
      throw new Error(
        miembroError.message
      );
    }

    miembroCreado =
      true;

    // -------------------------------------------------------
    // 10. Si es INV en formación, iniciar Unidad 1
    // -------------------------------------------------------

    if (
      modalidad ===
      "INV_FORMACION"
    ) {
      const {
        error:
          progresoError,
      } = await supabaseServer
        .from(
          "progreso_inv"
        )
        .upsert(
          {
            user_codigo:
              codigoNuevo,

            unidad_slug:
              "unidad-1",

            completada:
              false,

            porcentaje:
              0,

            respuestas:
              null,

            fecha_actualizacion:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_codigo,unidad_slug",
          }
        );

      if (
        progresoError
      ) {
        throw new Error(
          progresoError.message
        );
      }
    }

    // -------------------------------------------------------
    // 11. Generar enlace para crear contraseña
    // -------------------------------------------------------

    /*
     * Generamos el token aquí directamente.
     *
     * No necesitamos llamar por HTTP a
     * /api/password/crear-token porque ambos routes
     * viven en el mismo servidor.
     */

    const tokenPasswordReal =
      randomBytes(
        32
      ).toString("hex");

    const tokenPasswordHash =
      hashToken(
        tokenPasswordReal
      );

    const fechaToken =
      new Date();

    const fechaVencimientoToken =
      new Date();

    fechaVencimientoToken.setHours(
      fechaVencimientoToken.getHours() +
        24
    );

    const {
      error:
        tokenPasswordError,
    } = await supabaseServer
      .from(
        "password_tokens"
      )
      .insert({
        codigo:
          codigoNuevo,

        /*
         * Guardamos únicamente SHA-256.
         * El token real solo viajará en el correo.
         */
        token:
          tokenPasswordHash,

        tipo:
          "crear",

        estado:
          "pendiente",

        fecha_creacion:
          fechaToken.toISOString(),

        fecha_vencimiento:
          fechaVencimientoToken.toISOString(),

        fecha_utilizacion:
          null,
      });

    if (
      tokenPasswordError
    ) {
      throw new Error(
        tokenPasswordError.message
      );
    }

    tokenPasswordCreado =
      true;

    const sitio = process.env.NEXT_PUBLIC_SITE_URL;

		if (!sitio) {
		  throw new Error(
			"NEXT_PUBLIC_SITE_URL no está configurada."
		  );
		}

    const enlaceCrearPassword =
      `${sitio}/crear-password?token=${encodeURIComponent(
        tokenPasswordReal
      )}`;

    // -------------------------------------------------------
    // 12. Cerrar invitación
    // -------------------------------------------------------

    const fechaIncorporacion =
      new Date().toISOString();

    const {
      error:
        actualizarInvitacionError,
    } = await supabaseServer
      .from(
        "incorporaciones_invitaciones"
      )
      .update({
        estado:
          "utilizada",

        fecha_utilizacion:
          fechaIncorporacion,
      })
      .eq(
        "id",
        invitacion.id
      );

    if (
      actualizarInvitacionError
    ) {
      throw new Error(
        actualizarInvitacionError.message
      );
    }

    // -------------------------------------------------------
    // 13. Actualizar expediente de incorporación
    // -------------------------------------------------------

    const {
      error:
        actualizarIncorporacionError,
    } = await supabaseServer
      .from(
        "asimilaciones"
      )
      .update({
        nombre,
        correo,
        telefono,

        fecha_incorporacion:
          fechaIncorporacion,

        codigo_asignado:
          codigoNuevo,
      })
      .eq(
        "id",
        incorporacion.id
      );

    if (
      actualizarIncorporacionError
    ) {
      throw new Error(
        actualizarIncorporacionError.message
      );
    }

    // -------------------------------------------------------
    // 14. Enviar correo de activación
    // -------------------------------------------------------

    const tratamiento =
      incorporacion.sexo ===
      "F"
        ? "Estimada"
        : "Estimado";

    const modalidadTexto =
      nombreModalidad(
        modalidad
      ) ||
      nombreNivel(
        nivel
      );

    const correoResultado =
      await enviarCorreo({
        para: correo,

        asunto:
          `AGENN | Su incorporación ha sido completada — ${codigoNuevo}`,

        html:
          plantillaCorreo(`
            <p>
              ${tratamiento} <strong>${nombre}</strong>:
            </p>

            <p>
              Nos complace informarle que su incorporación
              a la Academia Guatemalteca de Estudios
              Numismáticos y Notafílicos —AGENN— ha sido
              completada satisfactoriamente.
            </p>

            <div
              style="
                background:#eef6e9;
                border-left:5px solid #6b6f1a;
                padding:18px;
                margin:22px 0;
                line-height:1.8;
              "
            >
              <strong>Modalidad:</strong>
              ${modalidadTexto}<br>

              <strong>Código institucional:</strong>
              ${codigoNuevo}
            </div>

            <p>
              Para activar su acceso al área de miembros,
              deberá crear una contraseña personal mediante
              el siguiente enlace.
            </p>

            <p
              style="
                text-align:center;
                margin:30px 0;
              "
            >
              <a
                href="${enlaceCrearPassword}"
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
                Crear mi contraseña
              </a>
            </p>

            <p
              style="
                color:#666;
                font-size:14px;
                line-height:1.7;
              "
            >
              Por seguridad, este enlace es personal,
              puede utilizarse una sola vez y tendrá una
              vigencia de 24 horas.
            </p>

            <p>
              Después de crear su contraseña podrá ingresar
              utilizando:
            </p>

            <p>
              <strong>Usuario:</strong>
              ${codigoNuevo}
            </p>

            <p>
              <strong>Consejo Académico</strong><br>
              Academia Guatemalteca de Estudios
              Numismáticos y Notafílicos
            </p>
          `),
      });

    // -------------------------------------------------------
    // 15. Respuesta
    // -------------------------------------------------------

    return NextResponse.json({
      ok: true,

      codigo:
        codigoNuevo,

      nivel,

      modalidad,

      estadoAcademico,

      origenAcreditacion,

      requiereCrearPassword:
        true,

      correo:
        correoResultado,

      fechaIncorporacion,

      fechaVencimientoPassword:
        fechaVencimientoToken.toISOString(),
    });
  } catch (error) {
    console.error(
      "Error en /api/incorporaciones/completar:",
      error
    );

    // -------------------------------------------------------
    // Reversión básica
    // -------------------------------------------------------

    if (
      tokenPasswordCreado &&
      codigoNuevo
    ) {
      await supabaseServer
        .from(
          "password_tokens"
        )
        .delete()
        .eq(
          "codigo",
          codigoNuevo
        )
        .eq(
          "tipo",
          "crear"
        )
        .eq(
          "estado",
          "pendiente"
        );
    }

    if (
      miembroCreado &&
      codigoNuevo
    ) {
      await supabaseServer
        .from("miembros")
        .delete()
        .eq(
          "codigo",
          codigoNuevo
        );
    }

    if (
      usuarioCreado &&
      codigoNuevo
    ) {
      await supabaseServer
        .from("users")
        .delete()
        .eq(
          "codigo",
          codigoNuevo
        );
    }

    if (codigoNuevo) {
      await supabaseServer
        .from(
          "progreso_inv"
        )
        .delete()
        .eq(
          "user_codigo",
          codigoNuevo
        );
    }

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No fue posible completar la incorporación.",
      },
      {
        status: 500,
      }
    );
  }
}