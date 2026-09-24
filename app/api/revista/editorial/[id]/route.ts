import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

    // Al reenviar una nueva versión, los mismos dos revisores vuelven a
    // recibirla. Se abre una nueva ronda y los avales de la ronda anterior
    // permanecen únicamente en el historial.
    if (manuscrito.estado === "REENVIADO") {
      const { data: previas, error: previasError } = await supabaseServer
        .from("revision_asignaciones")
        .select("ronda")
        .eq("ambito", "REVISTA")
        .eq("objeto_id", id);
      if (previasError) throw new Error(previasError.message);
      if ((previas || []).length > 0) {
        const nuevaRonda = Math.max(...(previas || []).map((x: any) => Number(x.ronda || 1))) + 1;
        const ahora = new Date().toISOString();
        const { error: resetError } = await supabaseServer
          .from("revision_asignaciones")
          .update({ estado: "PENDIENTE", ronda: nuevaRonda, motivo_codigo: null, observaciones: null, fecha_decision: null, updated_at: ahora })
          .eq("ambito", "REVISTA")
          .eq("objeto_id", id);
        if (resetError) throw new Error(resetError.message);
        const { error: estadoError } = await supabaseServer
          .from("manuscritos_editoriales")
          .update({ estado: "EN_REVISION", updated_at: ahora })
          .eq("id", id);
        if (estadoError) throw new Error(estadoError.message);
        manuscrito.estado = "EN_REVISION";
      }
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

    // Imágenes de la versión vigente.
    //
    // No devolvemos indiscriminadamente todas las imágenes históricas del
    // manuscrito porque varias versiones pueden apuntar al mismo archivo/URL.
    // El editor identifica una figura por su URL; si recibe todas las copias,
    // Array.find() puede elegir el ID más antiguo (por ejemplo, 10 en lugar de
    // 76) y volver a grabarlo en el contenido de una nueva versión.
    const versionActual = (versiones || [])[0] || null;

    let imagenes: any[] = [];

    if (versionActual?.id) {
      const contenidoVersionActual = String(versionActual.contenido || "");
      const idsImagenesActuales = new Set<number>();

      for (const coincidencia of contenidoVersionActual.matchAll(
        /\[\[IMAGEN:(\d+)\]\]/g,
      )) {
        idsImagenesActuales.add(Number(coincidencia[1]));
      }

      for (const coincidencia of contenidoVersionActual.matchAll(
        /data-agenn-imagen-id=["'](\d+)["']/g,
      )) {
        idsImagenesActuales.add(Number(coincidencia[1]));
      }

      let consultaImagenes = supabaseServer
        .from("manuscrito_imagenes")
        .select("id,version_id,url,titulo,fuente,orden")
        .eq("manuscrito_id", id);

      if (idsImagenesActuales.size > 0) {
        // La fuente de verdad son los IDs realmente citados por la versión.
        consultaImagenes = consultaImagenes.in("id", [...idsImagenesActuales]);
      } else {
        // Compatibilidad con versiones antiguas sin marcadores explícitos.
        consultaImagenes = consultaImagenes.eq("version_id", versionActual.id);
      }

      const { data, error } = await consultaImagenes.order("orden", {
        ascending: true,
      });

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

    const { data: posiblesAutores, error: autoresElegiblesError } =
      await supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nivel,estado_academico")
        .in("nivel", ["INV", "NUM"])
        .order("nombre", { ascending: true });

    if (autoresElegiblesError) {
      throw new Error(autoresElegiblesError.message);
    }

    const autoresElegibles = (posiblesAutores || []).filter(
      (persona: any) =>
        persona.nivel === "NUM" ||
        (persona.nivel === "INV" && persona.estado_academico === "ACREDITADO"),
    );

    const { data: asignacionesRevision, error: asignacionesError } = await supabaseServer
      .from("revision_asignaciones")
      .select("id,revisor_miembro_id,estado,ronda,motivo_codigo,observaciones,fecha_decision")
      .eq("ambito", "REVISTA")
      .eq("objeto_id", id);
    if (asignacionesError) throw new Error(asignacionesError.message);

    const idsRevisores = [...new Set((asignacionesRevision || []).map((a: any) => Number(a.revisor_miembro_id)).filter(Boolean))];
    let nombresRevisores: any[] = [];
    if (idsRevisores.length > 0) {
      const { data, error } = await supabaseServer.from("miembros").select("id,codigo,nombre").in("id", idsRevisores);
      if (error) throw new Error(error.message);
      nombresRevisores = data || [];
    }
    const revisoresPorId = new Map(nombresRevisores.map((r: any) => [Number(r.id), r]));
    const revisores = (asignacionesRevision || []).map((a: any) => ({ ...a, revisor: revisoresPorId.get(Number(a.revisor_miembro_id)) || null }));
    const miRevision = revisores.find((a: any) => Number(a.revisor_miembro_id) === Number(solicitante.miembro.id)) || null;

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
      autores_elegibles: autoresElegibles,
      revision: {
        asignada: miRevision,
        revisores,
        avales: revisores.filter((r: any) => r.estado === "AVALADO").length,
        requeridos: 2,
      },
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
        "id,estado,autor_miembro_id,tipo_contenido,titulo_actual,contenido_actual,imagen_url_actual,fuente_imagen_actual",
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

    const accionesRevision = new Set(["CORRECCIONES", "AVALAR"]);

    if (accion === "SELECCIONAR") {
      return NextResponse.json(
        { ok: false, error: "La asignación de revisores ahora es automática." },
        { status: 409 },
      );
    }

    if (accion === "DESCARTAR") {
      return NextResponse.json(
        { ok: false, error: "Un solo revisor no puede descartar definitivamente el manuscrito. Utilice una devolución para correcciones." },
        { status: 409 },
      );
    }

    if (accionesRevision.has(accion)) {
      if (Number(manuscrito.autor_miembro_id) === Number(solicitante.miembro.id)) {
        return NextResponse.json({ ok: false, error: "No puede revisar ni avalar una contribución de su propia autoría." }, { status: 403 });
      }

      const { data: asignacion, error: asignacionError } = await supabaseServer
        .from("revision_asignaciones")
        .select("id,estado,ronda")
        .eq("ambito", "REVISTA")
        .eq("objeto_id", id)
        .eq("revisor_miembro_id", solicitante.miembro.id)
        .maybeSingle();
      if (asignacionError) throw new Error(asignacionError.message);
      if (!asignacion) {
        return NextResponse.json({ ok: false, error: "Este manuscrito no fue asignado a usted para revisión." }, { status: 403 });
      }
      if (manuscrito.estado !== "EN_REVISION") {
        return NextResponse.json({ ok: false, error: "El manuscrito no se encuentra actualmente en revisión." }, { status: 409 });
      }

      const ahora = new Date().toISOString();

      if (accion === "CORRECCIONES") {
        const motivoCodigo = String(body.motivo_codigo || "OTRAS_CORRECCIONES").trim().toUpperCase();
        const textosRapidos: Record<string, string> = {
          ORTOGRAFIA_GRAMATICA: "El trabajo se devuelve para corregir aspectos de ortografía o gramática antes de continuar con la revisión editorial.",
          CITACION_INADECUADA: "El trabajo se devuelve porque la citación de las fuentes requiere corrección antes de continuar con la revisión editorial.",
          REFERENCIAS_APA: "El trabajo se devuelve porque las referencias bibliográficas no cumplen las normas APA requeridas.",
        };
        const observaciones = textosRapidos[motivoCodigo] || mensaje;
        if (!observaciones) return NextResponse.json({ ok: false, error: "Debe indicar las correcciones solicitadas." }, { status: 400 });

        const { error: esperaError } = await supabaseServer.from("revision_asignaciones")
          .update({ estado: "ESPERANDO_REENVIO", updated_at: ahora })
          .eq("ambito", "REVISTA").eq("objeto_id", id);
        if (esperaError) throw new Error(esperaError.message);
        const { error: devError } = await supabaseServer.from("revision_asignaciones")
          .update({ estado: "DEVUELTO", motivo_codigo: motivoCodigo, observaciones, fecha_decision: ahora, updated_at: ahora })
          .eq("id", asignacion.id);
        if (devError) throw new Error(devError.message);

        const { error: histError } = await supabaseServer.from("revision_historial").insert({
          ambito: "REVISTA", objeto_id: id, revisor_miembro_id: solicitante.miembro.id, ronda: Number(asignacion.ronda || 1), accion: "DEVOLUCION", motivo_codigo: motivoCodigo, observaciones,
        });
        if (histError) throw new Error(histError.message);

        const { error: estadoError } = await supabaseServer.from("manuscritos_editoriales")
          .update({ estado: "CORRECCIONES", updated_at: ahora }).eq("id", id);
        if (estadoError) throw new Error(estadoError.message);
        const { error: eventoError } = await supabaseServer.from("manuscrito_eventos").insert({
          manuscrito_id: id, version_id: versionActual?.id || null, tipo: "CORRECCIONES_SOLICITADAS", mensaje: observaciones, actor_miembro_id: solicitante.miembro.id,
        });
        if (eventoError) throw new Error(eventoError.message);
        return NextResponse.json({ ok: true, estado: "CORRECCIONES", avales: 0, requeridos: 2 });
      }

      const { error: avalError } = await supabaseServer.from("revision_asignaciones")
        .update({ estado: "AVALADO", motivo_codigo: null, observaciones: null, fecha_decision: ahora, updated_at: ahora })
        .eq("id", asignacion.id);
      if (avalError) throw new Error(avalError.message);
      const { error: histError } = await supabaseServer.from("revision_historial").insert({
        ambito: "REVISTA", objeto_id: id, revisor_miembro_id: solicitante.miembro.id, ronda: Number(asignacion.ronda || 1), accion: "AVAL", motivo_codigo: null, observaciones: mensaje || null,
      });
      if (histError) throw new Error(histError.message);
      const { error: eventoError } = await supabaseServer.from("manuscrito_eventos").insert({
        manuscrito_id: id, version_id: versionActual?.id || null, tipo: "AVAL", mensaje: mensaje || "Aval editorial otorgado por uno de los revisores asignados.", actor_miembro_id: solicitante.miembro.id,
      });
      if (eventoError) throw new Error(eventoError.message);

      const { data: avales, error: contarError } = await supabaseServer.from("revision_asignaciones")
        .select("id").eq("ambito", "REVISTA").eq("objeto_id", id).eq("estado", "AVALADO");
      if (contarError) throw new Error(contarError.message);
      const totalAvales = (avales || []).length;
      if (totalAvales < 2) return NextResponse.json({ ok: true, estado: "EN_REVISION", avales: totalAvales, requeridos: 2 });

      const { error: finalError } = await supabaseServer.from("manuscritos_editoriales")
        .update({ estado: "AVALADO", fecha_aval: ahora, avalado_por: solicitante.miembro.id, updated_at: ahora }).eq("id", id);
      if (finalError) throw new Error(finalError.message);
      return NextResponse.json({ ok: true, estado: "AVALADO", avales: 2, requeridos: 2 });
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
      const tipoContenido = String(
        body.tipo_contenido || manuscrito.tipo_contenido || "",
      )
        .trim()
        .toUpperCase();

      const tiposPermitidos = new Set([
        "ARTICULO",
        "ENSAYO",
        "NOTA_INVESTIGACION",
        "NOTA_BREVE",
        "ESTUDIO",
        "RESENA",
      ]);

      if (!titulo || !contenido) {
        return NextResponse.json(
          {
            ok: false,
            error: "La edición editorial debe conservar título y contenido.",
          },
          { status: 400 },
        );
      }

      if (!tiposPermitidos.has(tipoContenido)) {
        return NextResponse.json(
          {
            ok: false,
            error: "El tipo de publicación seleccionado no es válido.",
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
      const tipoAnterior = String(manuscrito.tipo_contenido || "");

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

      // Copiar a la nueva versión las imágenes que el contenido realmente cita.
      // IMPORTANTE: no dependemos únicamente de version_id. Una edición anterior
      // puede conservar en el HTML el ID de una imagen creada en una versión más
      // antigua. En ese caso, buscar solo por versionActual.id deja la nueva
      // versión sin imagen y produce el mensaje "Imagen editorial no disponible".
      const idsImagenesCitadas = new Set<number>();

      for (const coincidencia of contenido.matchAll(/\[\[IMAGEN:(\d+)\]\]/g)) {
        idsImagenesCitadas.add(Number(coincidencia[1]));
      }

      for (const coincidencia of contenido.matchAll(
        /data-agenn-imagen-id=["'](\d+)["']/g,
      )) {
        idsImagenesCitadas.add(Number(coincidencia[1]));
      }

      let imagenesPrevias: any[] = [];

      if (idsImagenesCitadas.size > 0) {
        const { data, error } = await supabaseServer
          .from("manuscrito_imagenes")
          .select("id,storage_path,url,titulo,fuente,orden")
          .eq("manuscrito_id", id)
          .in("id", [...idsImagenesCitadas])
          .order("orden", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        imagenesPrevias = data || [];
      } else {
        // Compatibilidad con manuscritos antiguos cuyo contenido no conserva
        // todavía un marcador explícito, pero sí tiene imágenes en la versión.
        const { data, error } = await supabaseServer
          .from("manuscrito_imagenes")
          .select("id,storage_path,url,titulo,fuente,orden")
          .eq("manuscrito_id", id)
          .eq("version_id", versionActual.id)
          .order("orden", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        imagenesPrevias = data || [];
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
        // Relacionamos las imagenes por "orden" y actualizamos las DOS
        // referencias que usa el contenido enriquecido.
        const anteriores = [...(imagenesPrevias || [])].sort(
          (a: any, b: any) => Number(a.orden || 0) - Number(b.orden || 0),
        );
        const nuevas = [...(imagenesNuevas || [])].sort(
          (a: any, b: any) => Number(a.orden || 0) - Number(b.orden || 0),
        );

        anteriores.forEach((anterior: any) => {
          const nueva = nuevas.find(
            (imagen: any) =>
              Number(imagen.orden || 0) === Number(anterior.orden || 0),
          );

          if (!nueva) return;

          contenidoRemapeado = contenidoRemapeado.replaceAll(
            `[[IMAGEN:${anterior.id}]]`,
            `[[IMAGEN:${nueva.id}]]`,
          );

          const patronDataId = new RegExp(
            `data-agenn-imagen-id=(["'])${anterior.id}\\1`,
            "g",
          );

          contenidoRemapeado = contenidoRemapeado.replace(
            patronDataId,
            (_coincidencia, comilla: string) =>
              `data-agenn-imagen-id=${comilla}${nueva.id}${comilla}`,
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
          tipo_contenido: tipoContenido,
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
            [
              tipoAnterior !== tipoContenido
                ? `Reclasificación de ${tipoAnterior} a ${tipoContenido}.`
                : "",
              notaEditorial,
            ]
              .filter(Boolean)
              .join(" ") ||
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