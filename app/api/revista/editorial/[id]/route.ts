import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function normalizarCodigo(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

async function obtenerMiembroCE(req: NextRequest) {
  const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));

  if (!codigo) {
    return {
      ok: false as const,
      status: 401,
      error: "No se indicó el código del usuario.",
    };
  }

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError) {
    throw new Error(miembroError.message);
  }

  if (!miembro) {
    return {
      ok: false as const,
      status: 401,
      error: "No se encontró el miembro.",
    };
  }

  const { data: ce, error: ceError } = await supabaseServer
    .from("consejo_editorial_miembros")
    .select("id,rol,activo")
    .eq("miembro_id", miembro.id)
    .eq("activo", true)
    .maybeSingle();

  if (ceError) {
    throw new Error(ceError.message);
  }

  if (!ce) {
    return {
      ok: false as const,
      status: 403,
      error: "El usuario no pertenece actualmente al Consejo Editorial.",
    };
  }

  return {
    ok: true as const,
    miembro,
    ce,
  };
}

async function obtenerId(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

// ============================================================
// GET
// ============================================================

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await obtenerId(context);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "El manuscrito solicitado no es válido.",
        },
        { status: 400 },
      );
    }

    const solicitante = await obtenerMiembroCE(req);

    if (!solicitante.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: solicitante.error,
        },
        { status: solicitante.status },
      );
    }

    const { data: manuscrito, error: manuscritoError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select(
        `
          id,
          ensayo_id,
          autor_miembro_id,
          origen,
          tipo_contenido,
          estado,
          titulo_actual,
          contenido_actual,
          imagen_url_actual,
          fuente_imagen_actual,
          tema,
          fecha_ingreso,
          fecha_aval,
          avalado_por,
          created_at,
          updated_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (manuscritoError) {
      throw new Error(manuscritoError.message);
    }

    if (!manuscrito) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró el manuscrito.",
        },
        { status: 404 },
      );
    }

    // Autor
    const { data: autor, error: autorError } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre,nivel")
      .eq("id", manuscrito.autor_miembro_id)
      .maybeSingle();

    if (autorError) {
      throw new Error(autorError.message);
    }

    // Versiones
    const { data: versiones, error: versionesError } = await supabaseServer
      .from("manuscrito_versiones")
      .select(
        `
          id,
          manuscrito_id,
          numero_version,
          titulo,
          contenido,
          imagen_url,
          fuente_imagen,
          enviado_por,
          nota_autor,
          created_at
        `,
      )
      .eq("manuscrito_id", id)
      .order("numero_version", {
        ascending: false,
      });

    if (versionesError) {
      throw new Error(versionesError.message);
    }

    // Imágenes de la versión actual
    const versionActual = (versiones || [])[0] || null;

    let imagenes: any[] = [];

    if (versionActual?.id) {
      const { data, error } = await supabaseServer
        .from("manuscrito_imagenes")
        .select("id,version_id,url,titulo,fuente,orden")
        .eq("version_id", versionActual.id)
        .order("orden", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      imagenes = data || [];
    }

    // Eventos
    const { data: eventos, error: eventosError } = await supabaseServer
      .from("manuscrito_eventos")
      .select(
        `
          id,
          manuscrito_id,
          version_id,
          tipo,
          mensaje,
          actor_miembro_id,
          created_at
        `,
      )
      .eq("manuscrito_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (eventosError) {
      throw new Error(eventosError.message);
    }

    // Identificar actores del historial
    const actorIds = [
      ...new Set(
        (eventos || [])
          .map((evento: any) => Number(evento.actor_miembro_id))
          .filter(Boolean),
      ),
    ];

    let actores: any[] = [];

    if (actorIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("miembros")
        .select("id,codigo,nombre")
        .in("id", actorIds);

      if (error) {
        throw new Error(error.message);
      }

      actores = data || [];
    }

    const actoresPorId = new Map(
      actores.map((actor: any) => [Number(actor.id), actor]),
    );

    const eventosConActor = (eventos || []).map((evento: any) => ({
      ...evento,
      actor: evento.actor_miembro_id
        ? actoresPorId.get(Number(evento.actor_miembro_id)) || null
        : null,
    }));

    return NextResponse.json({
      ok: true,

      consejo_editorial: {
        miembro_id: solicitante.miembro.id,
        codigo: solicitante.miembro.codigo,
        nombre: solicitante.miembro.nombre,
        rol: solicitante.ce.rol,
      },

      manuscrito: {
        ...manuscrito,
        autor: autor || null,
      },

      versiones: versiones || [],
      imagenes,
      eventos: eventosConActor,
    });
  } catch (error) {
    console.error("Error GET /api/revista/editorial/[id]:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el manuscrito.",
      },
      { status: 500 },
    );
  }
}

// ============================================================
// PATCH: decisiones editoriales
// ============================================================

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await obtenerId(context);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "El manuscrito solicitado no es válido.",
        },
        { status: 400 },
      );
    }

    const solicitante = await obtenerMiembroCE(req);

    if (!solicitante.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: solicitante.error,
        },
        { status: solicitante.status },
      );
    }

    const body = await req.json();

    const accion = String(body.accion || "")
      .trim()
      .toUpperCase();

    const mensaje = String(body.mensaje || "").trim();

    const { data: manuscrito, error: manuscritoError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select(
        "id,estado,autor_miembro_id,titulo_actual,contenido_actual,imagen_url_actual,fuente_imagen_actual",
      )
      .eq("id", id)
      .maybeSingle();

    if (manuscritoError) {
      throw new Error(manuscritoError.message);
    }

    if (!manuscrito) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró el manuscrito.",
        },
        { status: 404 },
      );
    }

    const { data: versionActual, error: versionError } = await supabaseServer
      .from("manuscrito_versiones")
      .select("id,numero_version")
      .eq("manuscrito_id", id)
      .order("numero_version", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      throw new Error(versionError.message);
    }

    const accionesTransaccionales = new Set([
      "SELECCIONAR",
      "CORRECCIONES",
      "AVALAR",
      "DESCARTAR",
    ]);

    if (accionesTransaccionales.has(accion)) {
      let decisionData: any = null;
      let decisionError: { message: string } | null = null;

      // La función es atómica e idempotente. Si Supabase ejecuta la decisión
      // pero pierde la respuesta, puede repetirse sin duplicar el evento.
      for (let intento = 0; intento < 3; intento += 1) {
        const resultado = await supabaseServer.rpc(
          "revista_decision_editorial",
          {
            p_manuscrito_id: id,
            p_actor_miembro_id: solicitante.miembro.id,
            p_accion: accion,
            p_mensaje: mensaje || null,
          },
        );

        decisionData = resultado.data;
        decisionError = resultado.error;

        if (!decisionError) break;

        if (
          !/fetch failed|network|timeout|timed out/i.test(decisionError.message)
        ) {
          break;
        }

        if (intento < 2) await esperar(400 * 2 ** intento);
      }

      if (decisionError) throw new Error(decisionError.message);

      const decision = Array.isArray(decisionData)
        ? decisionData[0]
        : decisionData;

      if (!decision?.estado_nuevo || !decision?.evento_id) {
        throw new Error("Supabase no confirmó la decisión editorial.");
      }

      return NextResponse.json({
        ok: true,
        estado: decision.estado_nuevo,
        evento_id: Number(decision.evento_id),
      });
    }

    // --------------------------------------------------------
    // EDICIÓN EDITORIAL
    // Crea una nueva versión sin destruir la anterior.
    // Se permite desde EN_REVISION en adelante, incluso
    // después del aval o de la publicación.
    // --------------------------------------------------------

    if (accion === "EDICION_EDITORIAL") {
      const estadosPermitidos = [
        "EN_REVISION",
        "REENVIADO",
        "AVALADO",
        "ASIGNADO",
        "PUBLICADO",
      ];

      if (!estadosPermitidos.includes(manuscrito.estado)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El manuscrito no se encuentra en una etapa que permita edición editorial.",
          },
          { status: 409 },
        );
      }

      const titulo = String(body.titulo || "").trim();
      const contenido = String(body.contenido || "").trim();
      const notaEditorial = String(body.nota_editorial || "").trim();

      if (!titulo || !contenido) {
        return NextResponse.json(
          {
            ok: false,
            error: "La edición editorial debe conservar título y contenido.",
          },
          { status: 400 },
        );
      }

      if (!versionActual) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No existe una versión previa sobre la cual registrar la edición editorial.",
          },
          { status: 409 },
        );
      }

      const numeroVersion = Number(versionActual.numero_version || 0) + 1;
      const ahora = new Date().toISOString();

      // Crear la nueva versión editorial.
      const { data: nuevaVersion, error: nuevaVersionError } =
        await supabaseServer
          .from("manuscrito_versiones")
          .insert({
            manuscrito_id: id,
            numero_version: numeroVersion,
            titulo,
            contenido,
            imagen_url: manuscrito.imagen_url_actual || null,
            fuente_imagen: manuscrito.fuente_imagen_actual || null,
            enviado_por: solicitante.miembro.id,
            nota_autor: notaEditorial
              ? `Ajuste editorial: ${notaEditorial}`
              : "Ajuste editorial del Consejo Editorial.",
          })
          .select("id,numero_version")
          .single();

      if (nuevaVersionError) {
        throw new Error(nuevaVersionError.message);
      }

      // Copiar las imágenes de la versión anterior a la nueva versión.
      const { data: imagenesPrevias, error: imagenesPreviasError } =
        await supabaseServer
          .from("manuscrito_imagenes")
          .select("id,storage_path,url,titulo,fuente,orden")
          .eq("version_id", versionActual.id)
          .order("orden", { ascending: true });

      if (imagenesPreviasError) {
        throw new Error(imagenesPreviasError.message);
      }

      let contenidoRemapeado = contenido;

      if ((imagenesPrevias || []).length > 0) {
        const filasNuevas = (imagenesPrevias || []).map((imagen: any) => ({
          manuscrito_id: id,
          version_id: nuevaVersion.id,
          storage_path: imagen.storage_path || null,
          url: imagen.url,
          titulo: imagen.titulo || "",
          fuente: imagen.fuente || "",
          orden: imagen.orden || 0,
        }));

        const { data: imagenesNuevas, error: copiarImagenesError } =
          await supabaseServer
            .from("manuscrito_imagenes")
            .insert(filasNuevas)
            .select("id,url,orden");

        if (copiarImagenesError) {
          throw new Error(copiarImagenesError.message);
        }

        // Cada imagen copiada recibe un ID nuevo. Reemplazamos en el
        // contenido los marcadores antiguos por los IDs de la nueva versión.
        const anteriores = imagenesPrevias || [];
        const nuevas = imagenesNuevas || [];

        anteriores.forEach((anterior: any, index: number) => {
          const nueva = nuevas[index];
          if (!nueva) return;

          contenidoRemapeado = contenidoRemapeado.replaceAll(
            `[[IMAGEN:${anterior.id}]]`,
            `[[IMAGEN:${nueva.id}]]`,
          );
        });

        const { error: actualizarVersionError } = await supabaseServer
          .from("manuscrito_versiones")
          .update({ contenido: contenidoRemapeado })
          .eq("id", nuevaVersion.id);

        if (actualizarVersionError) {
          throw new Error(actualizarVersionError.message);
        }
      }

      // La versión nueva pasa a ser la versión vigente.
      // El estado NO cambia: si estaba AVALADO, ASIGNADO o PUBLICADO,
      // conserva ese estado y la versión anterior permanece intacta.
      const { error: actualizarManuscritoError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({
          titulo_actual: titulo,
          contenido_actual: contenidoRemapeado,
          updated_at: ahora,
        })
        .eq("id", id);

      if (actualizarManuscritoError) {
        throw new Error(actualizarManuscritoError.message);
      }

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: id,
          version_id: nuevaVersion.id,
          tipo: "EDICION_EDITORIAL",
          mensaje:
            notaEditorial ||
            `El Consejo Editorial realizó un ajuste editorial y generó la versión ${numeroVersion}.`,
          actor_miembro_id: solicitante.miembro.id,
        });

      if (eventoError) {
        throw new Error(eventoError.message);
      }

      return NextResponse.json({
        ok: true,
        numero_version: numeroVersion,
        version_id: nuevaVersion.id,
      });
    }

    // --------------------------------------------------------
    // SELECCIONAR PARA REVISIÓN
    // CANDIDATO -> EN_REVISION
    // --------------------------------------------------------

    if (accion === "SELECCIONAR") {
      if (manuscrito.estado !== "CANDIDATO") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Solo un manuscrito candidato puede seleccionarse para revisión.",
          },
          { status: 409 },
        );
      }

      const { error: updateError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({
          estado: "EN_REVISION",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: id,
          version_id: versionActual?.id || null,
          tipo: "SELECCION",
          mensaje:
            mensaje ||
            "El Consejo Editorial seleccionó el manuscrito para iniciar revisión editorial.",
          actor_miembro_id: solicitante.miembro.id,
        });

      if (eventoError) {
        throw new Error(eventoError.message);
      }

      return NextResponse.json({ ok: true });
    }

    // --------------------------------------------------------
    // SOLICITAR CORRECCIONES
    // EN_REVISION / REENVIADO -> CORRECCIONES
    // --------------------------------------------------------

    if (accion === "CORRECCIONES") {
      if (
        manuscrito.estado !== "EN_REVISION" &&
        manuscrito.estado !== "REENVIADO"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El manuscrito no se encuentra en una etapa que permita solicitar correcciones.",
          },
          { status: 409 },
        );
      }

      if (!mensaje) {
        return NextResponse.json(
          {
            ok: false,
            error: "Debe escribir las observaciones que recibirá el autor.",
          },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({
          estado: "CORRECCIONES",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: id,
          version_id: versionActual?.id || null,
          tipo: "CORRECCIONES_SOLICITADAS",
          mensaje,
          actor_miembro_id: solicitante.miembro.id,
        });

      if (eventoError) {
        throw new Error(eventoError.message);
      }

      return NextResponse.json({ ok: true });
    }

    // --------------------------------------------------------
    // AVALAR
    // EN_REVISION / REENVIADO -> AVALADO
    // --------------------------------------------------------

    if (accion === "AVALAR") {
      if (
        manuscrito.estado !== "EN_REVISION" &&
        manuscrito.estado !== "REENVIADO"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El manuscrito no se encuentra en una etapa que permita otorgar aval editorial.",
          },
          { status: 409 },
        );
      }

      const ahora = new Date().toISOString();

      const { error: updateError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({
          estado: "AVALADO",
          fecha_aval: ahora,
          avalado_por: solicitante.miembro.id,
          updated_at: ahora,
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: id,
          version_id: versionActual?.id || null,
          tipo: "AVAL",
          mensaje:
            mensaje ||
            "El Consejo Editorial otorgó aval al manuscrito para su eventual publicación en Revista AGENN.",
          actor_miembro_id: solicitante.miembro.id,
        });

      if (eventoError) {
        throw new Error(eventoError.message);
      }

      return NextResponse.json({ ok: true });
    }

    // --------------------------------------------------------
    // DESCARTAR
    // --------------------------------------------------------

    if (accion === "DESCARTAR") {
      if (
        manuscrito.estado === "AVALADO" ||
        manuscrito.estado === "ASIGNADO" ||
        manuscrito.estado === "PUBLICADO"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Este manuscrito ya alcanzó una etapa que no permite descartarlo mediante esta acción.",
          },
          { status: 409 },
        );
      }

      if (!mensaje) {
        return NextResponse.json(
          {
            ok: false,
            error: "Debe indicar el motivo de la decisión editorial.",
          },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({
          estado: "DESCARTADO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: id,
          version_id: versionActual?.id || null,
          tipo: "DESCARTE",
          mensaje,
          actor_miembro_id: solicitante.miembro.id,
        });

      if (eventoError) {
        throw new Error(eventoError.message);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "La acción editorial solicitada no es válida.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error PATCH /api/revista/editorial/[id]:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible registrar la decisión editorial.",
      },
      { status: 500 },
    );
  }
}