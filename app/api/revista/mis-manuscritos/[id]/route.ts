import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function actualizarConReintentos(
  operacion: () => PromiseLike<{ error: { message: string } | null }>,
) {
  let ultimoError: { message: string } | null = null;

  for (let intento = 0; intento < 3; intento += 1) {
    const resultado = await operacion();
    if (!resultado.error) return resultado;
    ultimoError = resultado.error;

    if (
      !/fetch failed|network|timeout|timed out/i.test(resultado.error.message)
    ) {
      return resultado;
    }

    if (intento < 2) await esperar(300 * 2 ** intento);
  }

  return { error: ultimoError };
}

function normalizarCodigo(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

async function obtenerId(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function obtenerMiembro(req: NextRequest) {
  const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));
  if (!codigo) return null;

  const { data, error } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || null;
}

async function obtenerImagenes(manuscritoId: number, versionId: number | null) {
  let query = supabaseServer
    .from("manuscrito_imagenes")
    .select(
      "id,manuscrito_id,version_id,storage_path,url,titulo,fuente,orden,created_at,updated_at",
    )
    .eq("manuscrito_id", manuscritoId)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });

  query =
    versionId === null
      ? query.is("version_id", null)
      : query.eq("version_id", versionId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await obtenerId(context);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "El manuscrito solicitado no es válido." },
        { status: 400 },
      );
    }

    const miembro = await obtenerMiembro(req);
    if (!miembro) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el miembro." },
        { status: 401 },
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
        created_at,
        updated_at
      `,
      )
      .eq("id", id)
      .eq("autor_miembro_id", miembro.id)
      .maybeSingle();

    if (manuscritoError) throw new Error(manuscritoError.message);

    if (!manuscrito) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró un manuscrito de su autoría con ese identificador.",
        },
        { status: 404 },
      );
    }

    const { data: versiones, error: versionesError } = await supabaseServer
      .from("manuscrito_versiones")
      .select(
        `
        id,
        numero_version,
        titulo,
        contenido,
        imagen_url,
        fuente_imagen,
        nota_autor,
        created_at
      `,
      )
      .eq("manuscrito_id", id)
      .order("numero_version", { ascending: false });

    if (versionesError) throw new Error(versionesError.message);

    const { data: eventos, error: eventosError } = await supabaseServer
      .from("manuscrito_eventos")
      .select(
        `
        id,
        version_id,
        tipo,
        mensaje,
        actor_miembro_id,
        created_at
      `,
      )
      .eq("manuscrito_id", id)
      .order("created_at", { ascending: false });

    if (eventosError) throw new Error(eventosError.message);

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

      if (error) throw new Error(error.message);
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

    const ultimaVersion = (versiones || [])[0] || null;

    const imagenesVersionActual = ultimaVersion
      ? await obtenerImagenes(id, Number(ultimaVersion.id))
      : [];

    const imagenesBorrador = ["BORRADOR", "CORRECCIONES"].includes(
      manuscrito.estado,
    )
      ? await obtenerImagenes(id, null)
      : [];

    return NextResponse.json({
      ok: true,
      miembro: {
        id: miembro.id,
        codigo: miembro.codigo,
        nombre: miembro.nombre,
      },
      manuscrito,
      versiones: versiones || [],
      eventos: eventosConActor,
      imagenes_version_actual: imagenesVersionActual,
      imagenes_borrador: imagenesBorrador,
    });
  } catch (error) {
    console.error("Error GET /api/revista/mis-manuscritos/[id]:", error);

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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await obtenerId(context);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "El manuscrito solicitado no es válido." },
        { status: 400 },
      );
    }

    const miembro = await obtenerMiembro(req);

    if (!miembro) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el miembro." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const accion = String(body.accion || "")
      .trim()
      .toUpperCase();
    const titulo = String(body.titulo || "").trim();
    const contenido = String(body.contenido || "").trim();
    const fuenteImagen = String(body.fuente_imagen || "").trim();
    const notaAutor = String(body.nota_autor || "").trim();

    const { data: manuscrito, error: manuscritoError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select(
        `
        id,
        ensayo_id,
        autor_miembro_id,
        estado,
        titulo_actual,
        contenido_actual,
        imagen_url_actual,
        fuente_imagen_actual
      `,
      )
      .eq("id", id)
      .eq("autor_miembro_id", miembro.id)
      .maybeSingle();

    if (manuscritoError) throw new Error(manuscritoError.message);

    if (!manuscrito) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró un manuscrito editable de su autoría.",
        },
        { status: 404 },
      );
    }

    if (!["BORRADOR", "CORRECCIONES"].includes(manuscrito.estado)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El manuscrito solo puede modificarse mientras es un borrador o cuando el Consejo Editorial ha solicitado correcciones.",
        },
        { status: 409 },
      );
    }

    if (!titulo || !contenido) {
      return NextResponse.json(
        {
          ok: false,
          error: "El manuscrito debe conservar título y contenido.",
        },
        { status: 400 },
      );
    }

    const ahora = new Date().toISOString();

    if (accion === "GUARDAR") {
      const { error } = await actualizarConReintentos(() =>
        supabaseServer
          .from("manuscritos_editoriales")
          .update({
            titulo_actual: titulo,
            contenido_actual: contenido,
            fuente_imagen_actual: fuenteImagen || null,
            updated_at: ahora,
          })
          .eq("id", id),
      );

      if (error) throw new Error(error.message);

      const { error: ensayoError } = await actualizarConReintentos(() =>
        supabaseServer
          .from("ensayos")
          .update({
            titulo,
            contenido,
            fuente_imagen: fuenteImagen || null,
            updated_at: ahora,
          })
          .eq("id", manuscrito.ensayo_id),
      );

      // El manuscrito es el registro principal de trabajo. Si la copia auxiliar
      // en ensayos sufre una interrupción de red, no se informa falsamente que
      // el texto del autor se perdió: el próximo guardado volverá a sincronizarla.
      return NextResponse.json({
        ok: true,
        warning: ensayoError
          ? "El manuscrito quedó guardado; la copia de consulta se sincronizará en el próximo guardado."
          : null,
      });
    }

    const esEnvioInicial =
      accion === "ENVIAR" && manuscrito.estado === "BORRADOR";
    const esReenvio =
      accion === "REENVIAR" && manuscrito.estado === "CORRECCIONES";

    if (esEnvioInicial || esReenvio) {
      let envioData: any = null;
      let envioError: { message: string } | null = null;

      // La función de base de datos es transaccional e idempotente. Por ello es
      // seguro repetir esta única llamada cuando Supabase pierde la respuesta:
      // si la primera terminó, el reintento devuelve la versión ya creada.
      for (let intento = 0; intento < 3; intento += 1) {
        const resultado = await supabaseServer.rpc(
          "revista_enviar_manuscrito",
          {
            p_manuscrito_id: id,
            p_autor_miembro_id: miembro.id,
            p_accion: accion,
            p_titulo: titulo,
            p_contenido: contenido,
            p_fuente_imagen: fuenteImagen || null,
            p_nota_autor: notaAutor || null,
          },
        );

        envioData = resultado.data;
        envioError = resultado.error;

        if (!envioError) break;

        if (
          !/fetch failed|network|timeout|timed out/i.test(envioError.message)
        ) {
          break;
        }

        if (intento < 2) await esperar(400 * 2 ** intento);
      }

      if (envioError) throw new Error(envioError.message);

      const envio = Array.isArray(envioData) ? envioData[0] : envioData;

      if (!envio?.numero_version) {
        throw new Error("Supabase no devolvió la versión enviada.");
      }

      return NextResponse.json({
        ok: true,
        numero_version: Number(envio.numero_version),
      });

      /* Flujo anterior conservado temporalmente como referencia.
      const { data: ultimaVersion, error: ultimaError } = await supabaseServer
        .from("manuscrito_versiones")
        .select("id,numero_version")
        .eq("manuscrito_id", id)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimaError) throw new Error(ultimaError.message);

      const numeroVersion = Number(ultimaVersion?.numero_version || 0) + 1;

      const { data: nuevaVersion, error: versionError } = await supabaseServer
        .from("manuscrito_versiones")
        .insert({
          manuscrito_id: id,
          numero_version: numeroVersion,
          titulo,
          contenido,
          imagen_url: manuscrito.imagen_url_actual,
          fuente_imagen: fuenteImagen || null,
          enviado_por: miembro.id,
          nota_autor: notaAutor || null,
        })
        .select("id")
        .single();

      if (versionError) throw new Error(versionError.message);

      const { data: imagenesBorrador, error: borradorError } =
        await supabaseServer
          .from("manuscrito_imagenes")
          .select("id")
          .eq("manuscrito_id", id)
          .is("version_id", null);

      if (borradorError) throw new Error(borradorError.message);

      if ((imagenesBorrador || []).length > 0) {
        const { error: asignarError } = await supabaseServer
          .from("manuscrito_imagenes")
          .update({
            version_id: nuevaVersion.id,
            updated_at: ahora,
          })
          .eq("manuscrito_id", id)
          .is("version_id", null);

        if (asignarError) throw new Error(asignarError.message);
      } else if (ultimaVersion?.id) {
        const { data: imagenesAnteriores, error: anterioresError } =
          await supabaseServer
            .from("manuscrito_imagenes")
            .select("url,storage_path,titulo,fuente,orden")
            .eq("manuscrito_id", id)
            .eq("version_id", ultimaVersion.id)
            .order("orden", { ascending: true });

        if (anterioresError) throw new Error(anterioresError.message);

        if ((imagenesAnteriores || []).length > 0) {
          const { error: copiarError } = await supabaseServer
            .from("manuscrito_imagenes")
            .insert(
              (imagenesAnteriores || []).map((imagen: any) => ({
                manuscrito_id: id,
                version_id: nuevaVersion.id,
                storage_path: imagen.storage_path || null,
                url: imagen.url,
                titulo: imagen.titulo || "",
                fuente: imagen.fuente || "",
                orden: imagen.orden,
              })),
            );

          if (copiarError) throw new Error(copiarError.message);
        }
      }

      const { data: primeraImagen } = await supabaseServer
        .from("manuscrito_imagenes")
        .select("url,fuente")
        .eq("manuscrito_id", id)
        .eq("version_id", nuevaVersion.id)
        .order("orden", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { error: actualizarError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({
          titulo_actual: titulo,
          contenido_actual: contenido,
          imagen_url_actual:
            primeraImagen?.url || manuscrito.imagen_url_actual || null,
          fuente_imagen_actual: primeraImagen?.fuente || fuenteImagen || null,
          estado: esEnvioInicial ? "CANDIDATO" : "REENVIADO",
          updated_at: ahora,
        })
        .eq("id", id);

      if (actualizarError) throw new Error(actualizarError.message);

      const { error: ensayoActualizarError } = await supabaseServer
        .from("ensayos")
        .update({
          titulo,
          contenido,
          imagen_url:
            primeraImagen?.url || manuscrito.imagen_url_actual || null,
          fuente_imagen: primeraImagen?.fuente || fuenteImagen || null,
          estado: "en_revision_editorial",
          updated_at: ahora,
        })
        .eq("id", manuscrito.ensayo_id);

      if (ensayoActualizarError) {
        throw new Error(ensayoActualizarError.message);
      }

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: id,
          version_id: nuevaVersion.id,
          tipo: esEnvioInicial ? "INGRESO" : "REENVIO",
          mensaje:
            notaAutor ||
            (esEnvioInicial
              ? "El autor envió el manuscrito al Consejo Editorial."
              : `El autor envió la versión ${numeroVersion} del manuscrito para nueva revisión editorial.`),
          actor_miembro_id: miembro.id,
        });

      if (eventoError) throw new Error(eventoError.message);

      return NextResponse.json({
        ok: true,
        numero_version: numeroVersion,
      });
      */
    }

    return NextResponse.json(
      { ok: false, error: "La acción solicitada no es válida." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error PATCH /api/revista/mis-manuscritos/[id]:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el manuscrito.",
      },
      { status: 500 },
    );
  }
}