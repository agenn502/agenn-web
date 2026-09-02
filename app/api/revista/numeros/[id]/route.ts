import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function normalizarCodigo(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

async function obtenerEditor(req: NextRequest) {
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

  if (miembroError) throw new Error(miembroError.message);
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

  if (ceError) throw new Error(ceError.message);
  if (!ce) {
    return {
      ok: false as const,
      status: 403,
      error: "El usuario no pertenece actualmente al Consejo Editorial.",
    };
  }

  if (!["DIRECTOR", "EDITOR"].includes(String(ce.rol || "").toUpperCase())) {
    return {
      ok: false as const,
      status: 403,
      error:
        "Su rol dentro del Consejo Editorial no permite administrar números de Revista AGENN.",
    };
  }

  return { ok: true as const, miembro, ce };
}

async function obtenerId(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function obtenerNumero(id: number) {
  const { data, error } = await supabaseServer
    .from("revistas")
    .select(
      `
      id, volumen, numero, anio, mes_publicacion, titulo, subtitulo,
      portada_url, editorial, estado, fecha_publicacion,
      slug, created_at, updated_at
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await obtenerId(context);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "El número solicitado no es válido." },
        { status: 400 },
      );
    }

    const solicitante = await obtenerEditor(req);
    if (!solicitante.ok) {
      return NextResponse.json(
        { ok: false, error: solicitante.error },
        { status: solicitante.status },
      );
    }

    const numero = await obtenerNumero(id);
    if (!numero) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el número de Revista AGENN." },
        { status: 404 },
      );
    }

    const { data: articulosBase, error: articulosError } = await supabaseServer
      .from("revista_articulos")
      .select(
        "id,revista_id,manuscrito_id,version_id,seccion,orden,localizador,created_at",
      )
      .eq("revista_id", id)
      .order("orden", { ascending: true });

    if (articulosError) throw new Error(articulosError.message);

    const articulos = articulosBase || [];
    const manuscritoIds = articulos.map((a: any) => Number(a.manuscrito_id));
    const versionIds = articulos.map((a: any) => Number(a.version_id));

    let manuscritosAsignados: any[] = [];
    let versionesAsignadas: any[] = [];

    if (manuscritoIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("manuscritos_editoriales")
        .select(
          "id,autor_miembro_id,titulo_actual,tipo_contenido,origen,estado,tema",
        )
        .in("id", manuscritoIds);
      if (error) throw new Error(error.message);
      manuscritosAsignados = data || [];
    }

    if (versionIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("manuscrito_versiones")
        .select(
          "id,manuscrito_id,numero_version,titulo,contenido,imagen_url,fuente_imagen,created_at",
        )
        .in("id", versionIds);
      if (error) throw new Error(error.message);
      versionesAsignadas = data || [];
    }

    const autorIdsAsignados = [
      ...new Set(
        manuscritosAsignados
          .map((m: any) => Number(m.autor_miembro_id))
          .filter(Boolean),
      ),
    ];
    let autoresAsignados: any[] = [];

    if (autorIdsAsignados.length > 0) {
      const { data, error } = await supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nombre_citacion,nivel")
        .in("id", autorIdsAsignados);
      if (error) throw new Error(error.message);
      autoresAsignados = data || [];
    }

    let imagenesAsignadas: any[] = [];

    if (versionIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("manuscrito_imagenes")
        .select(
          "id,manuscrito_id,version_id,storage_path,url,titulo,fuente,orden,created_at,updated_at",
        )
        .in("version_id", versionIds)
        .order("orden", { ascending: true });

      if (error) throw new Error(error.message);
      imagenesAsignadas = data || [];
    }

    const imagenesPorVersion = new Map<number, any[]>();

    for (const imagen of imagenesAsignadas) {
      const versionId = Number(imagen.version_id);
      const lista = imagenesPorVersion.get(versionId) || [];
      lista.push(imagen);
      imagenesPorVersion.set(versionId, lista);
    }

    const manuscritoPorId = new Map(
      manuscritosAsignados.map((m: any) => [Number(m.id), m]),
    );
    const versionPorId = new Map(
      versionesAsignadas.map((v: any) => [Number(v.id), v]),
    );
    const autorPorId = new Map(
      autoresAsignados.map((a: any) => [Number(a.id), a]),
    );

    const articulosCompletos = articulos.map((a: any) => {
      const manuscrito = manuscritoPorId.get(Number(a.manuscrito_id));
      const version = versionPorId.get(Number(a.version_id));
      const autor = manuscrito
        ? autorPorId.get(Number(manuscrito.autor_miembro_id))
        : null;
      return {
        ...a,
        manuscrito: manuscrito ? { ...manuscrito, autor: autor || null } : null,
        version: version
          ? {
              ...version,
              imagenes: imagenesPorVersion.get(Number(version.id)) || [],
            }
          : null,
      };
    });

    const { data: avalados, error: avaladosError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select(
        "id,autor_miembro_id,titulo_actual,tipo_contenido,origen,estado,tema,fecha_aval,updated_at",
      )
      .eq("estado", "AVALADO")
      .order("fecha_aval", { ascending: true });

    if (avaladosError) throw new Error(avaladosError.message);

    const avaladosLista = avalados || [];
    const avaladoIds = avaladosLista.map((m: any) => Number(m.id));
    let yaAsignadosGlobal: any[] = [];

    if (avaladoIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("revista_articulos")
        .select("manuscrito_id")
        .in("manuscrito_id", avaladoIds);
      if (error) throw new Error(error.message);
      yaAsignadosGlobal = data || [];
    }

    const asignadosSet = new Set(
      yaAsignadosGlobal.map((a: any) => Number(a.manuscrito_id)),
    );
    const publicablesBase = avaladosLista.filter(
      (m: any) => !asignadosSet.has(Number(m.id)),
    );
    const publicableIds = publicablesBase.map((m: any) => Number(m.id));

    let versionesPublicables: any[] = [];
    if (publicableIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("manuscrito_versiones")
        .select("id,manuscrito_id,numero_version,titulo,created_at")
        .in("manuscrito_id", publicableIds)
        .order("numero_version", { ascending: false });
      if (error) throw new Error(error.message);
      versionesPublicables = data || [];
    }

    const ultimaVersionPorManuscrito = new Map<number, any>();
    for (const version of versionesPublicables) {
      const manuscritoId = Number(version.manuscrito_id);
      if (!ultimaVersionPorManuscrito.has(manuscritoId)) {
        ultimaVersionPorManuscrito.set(manuscritoId, version);
      }
    }

    const autorIdsPublicables = [
      ...new Set(
        publicablesBase
          .map((m: any) => Number(m.autor_miembro_id))
          .filter(Boolean),
      ),
    ];
    let autoresPublicables: any[] = [];
    if (autorIdsPublicables.length > 0) {
      const { data, error } = await supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nombre_citacion,nivel")
        .in("id", autorIdsPublicables);
      if (error) throw new Error(error.message);
      autoresPublicables = data || [];
    }

    const autorPublicablePorId = new Map(
      autoresPublicables.map((a: any) => [Number(a.id), a]),
    );
    const publicables = publicablesBase.map((m: any) => ({
      ...m,
      autor: autorPublicablePorId.get(Number(m.autor_miembro_id)) || null,
      version: ultimaVersionPorManuscrito.get(Number(m.id)) || null,
    }));

    return NextResponse.json({
      ok: true,
      numero,
      consejo_editorial: {
        miembro_id: solicitante.miembro.id,
        codigo: solicitante.miembro.codigo,
        nombre: solicitante.miembro.nombre,
        rol: solicitante.ce.rol,
      },
      articulos: articulosCompletos,
      publicables,
    });
  } catch (error) {
    console.error("Error GET /api/revista/numeros/[id]:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el número.",
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
        { ok: false, error: "El número solicitado no es válido." },
        { status: 400 },
      );
    }

    const solicitante = await obtenerEditor(req);
    if (!solicitante.ok) {
      return NextResponse.json(
        { ok: false, error: solicitante.error },
        { status: solicitante.status },
      );
    }

    const numero = await obtenerNumero(id);
    if (!numero) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el número." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const accion = String(body.accion || "")
      .trim()
      .toUpperCase();

    if (numero.estado === "PUBLICADA" && accion !== "DESPUBLICAR") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este número ya fue publicado y no puede modificarse desde esta pantalla.",
        },
        { status: 409 },
      );
    }

    if (accion === "ACTUALIZAR_NUMERO") {
      const volumen = Number(body.volumen);
      const numeroValor = Number(body.numero);
      const anio = Number(body.anio);
      const mesPublicacion = Number(body.mes_publicacion);

      if (
        !Number.isInteger(volumen) ||
        volumen < 1 ||
        !Number.isInteger(numeroValor) ||
        numeroValor < 1 ||
        !Number.isInteger(anio) ||
        anio < 2000 ||
        !Number.isInteger(mesPublicacion) ||
        mesPublicacion < 1 ||
        mesPublicacion > 12
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Volumen, número, mes  y año deben contener valores válidos.",
          },
          { status: 400 },
        );
      }

      const titulo = String(body.titulo || "").trim();
      const subtitulo = String(body.subtitulo || "").trim();
      const editorial = String(body.editorial || "").trim();
      const slug = `volumen-${volumen}-numero-${numeroValor}-${anio}`;

      const { error } = await supabaseServer
        .from("revistas")
        .update({
          volumen,
          numero: numeroValor,
          anio,
          mes_publicacion: mesPublicacion,
          titulo: titulo || null,
          subtitulo: subtitulo || null,
          editorial: editorial || null,
          slug,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (accion === "ASIGNAR") {
      const manuscritoId = Number(body.manuscrito_id);
      if (!Number.isInteger(manuscritoId) || manuscritoId <= 0) {
        return NextResponse.json(
          { ok: false, error: "El manuscrito indicado no es válido." },
          { status: 400 },
        );
      }

      const { data, error: asignarError } = await supabaseServer.rpc(
        "revista_asignar_manuscrito",
        {
          p_revista_id: id,
          p_manuscrito_id: manuscritoId,
          p_actor_miembro_id: solicitante.miembro.id,
        },
      );

      if (asignarError) {
        // Si la respuesta se perdió después del commit, verificamos el resultado
        // para no mostrar un error falso ni intentar una segunda incorporación.
        const { data: incorporado } = await supabaseServer
          .from("revista_articulos")
          .select("localizador,version_id")
          .eq("revista_id", id)
          .eq("manuscrito_id", manuscritoId)
          .maybeSingle();

        if (incorporado) {
          return NextResponse.json({
            ok: true,
            localizador: incorporado.localizador,
            recuperado: true,
          });
        }

        throw new Error(asignarError.message);
      }

      return NextResponse.json({ ok: true, ...(data || {}) });
    }

    if (accion === "ACTUALIZAR_ARTICULO") {
      const articuloId = Number(body.articulo_id);
      const orden = Number(body.orden);
      const seccion = String(body.seccion || "").trim();

      if (
        !Number.isInteger(articuloId) ||
        articuloId <= 0 ||
        !Number.isInteger(orden) ||
        orden < 1
      ) {
        return NextResponse.json(
          { ok: false, error: "El artículo u orden indicados no son válidos." },
          { status: 400 },
        );
      }

      const { error } = await supabaseServer
        .from("revista_articulos")
        .update({ seccion: seccion || "Ensayos", orden })
        .eq("id", articuloId)
        .eq("revista_id", id);

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (accion === "QUITAR") {
      const articuloId = Number(body.articulo_id);
      if (!Number.isInteger(articuloId) || articuloId <= 0) {
        return NextResponse.json(
          { ok: false, error: "El artículo indicado no es válido." },
          { status: 400 },
        );
      }

      const { data: articulo, error: articuloError } = await supabaseServer
        .from("revista_articulos")
        .select("id,manuscrito_id")
        .eq("id", articuloId)
        .eq("revista_id", id)
        .maybeSingle();

      if (articuloError) throw new Error(articuloError.message);
      if (!articulo) {
        return NextResponse.json(
          {
            ok: false,
            error: "No se encontró el artículo dentro de este número.",
          },
          { status: 404 },
        );
      }

      const { error: eliminarError } = await supabaseServer
        .from("revista_articulos")
        .delete()
        .eq("id", articuloId);

      if (eliminarError) throw new Error(eliminarError.message);

      const { error: restaurarError } = await supabaseServer
        .from("manuscritos_editoriales")
        .update({ estado: "AVALADO", updated_at: new Date().toISOString() })
        .eq("id", articulo.manuscrito_id);

      if (restaurarError) throw new Error(restaurarError.message);

      const { error: eventoError } = await supabaseServer
        .from("manuscrito_eventos")
        .insert({
          manuscrito_id: articulo.manuscrito_id,
          version_id: null,
          tipo: "RETIRO_REVISTA",
          mensaje: `Retirado del número en preparación Vol. ${numero.volumen || "—"}, Núm. ${numero.numero} (${numero.anio}). El manuscrito vuelve al Banco de publicables.`,
          actor_miembro_id: solicitante.miembro.id,
        });

      if (eventoError) throw new Error(eventoError.message);
      return NextResponse.json({ ok: true });
    }
    if (accion === "PUBLICAR" || accion === "DESPUBLICAR") {
      const estadoEsperado =
        accion === "PUBLICAR" ? "PUBLICADA" : "EN_PREPARACION";
      const { data, error: cambioError } = await supabaseServer.rpc(
        "revista_cambiar_publicacion",
        {
          p_revista_id: id,
          p_actor_miembro_id: solicitante.miembro.id,
          p_publicar: accion === "PUBLICAR",
        },
      );

      if (cambioError) {
        // Si la respuesta se perdió después del commit, confirmamos el estado.
        const { data: comprobacion } = await supabaseServer
          .from("revistas")
          .select("estado,fecha_publicacion,slug")
          .eq("id", id)
          .maybeSingle();

        if (comprobacion?.estado === estadoEsperado) {
          return NextResponse.json({
            ok: true,
            estado: comprobacion.estado,
            fecha_publicacion: comprobacion.fecha_publicacion,
            slug: comprobacion.slug,
            recuperado: true,
          });
        }

        throw new Error(cambioError.message);
      }

      return NextResponse.json({
        ok: true,
        ...(data || {}),
        slug: numero.slug,
      });
    }
    return NextResponse.json(
      { ok: false, error: "La acción solicitada no es válida." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error PATCH /api/revista/numeros/[id]:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el número.",
      },
      { status: 500 },
    );
  }
}