import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function normalizarCodigo(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

function slugificar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function puedeParticipar(codigo: string) {
  return codigo.startsWith("INV") || codigo.startsWith("NUM");
}

const TIPOS_CONTENIDO = new Set([
  "ENSAYO",
  "ARTICULO",
  "ESTUDIO",
  "NOTA_INVESTIGACION",
  "NOTA_BREVE",
  "RESENA",
]);

export async function GET(req: NextRequest) {
  try {
    const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));

    if (!codigo) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se indicó el código del usuario.",
        },
        { status: 401 },
      );
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
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró el miembro.",
        },
        { status: 404 },
      );
    }

    const { data: manuscritos, error: manuscritosError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select(
        `
          id,
          ensayo_id,
          origen,
          tipo_contenido,
          estado,
          titulo_actual,
          tema,
          fecha_ingreso,
          fecha_aval,
          created_at,
          updated_at
        `,
      )
      .eq("autor_miembro_id", miembro.id)
      .order("updated_at", {
        ascending: false,
      });

    if (manuscritosError) {
      throw new Error(manuscritosError.message);
    }

    const ids = (manuscritos || []).map((m: any) => Number(m.id));

    let versiones: any[] = [];

    if (ids.length > 0) {
      const { data, error } = await supabaseServer
        .from("manuscrito_versiones")
        .select("id,manuscrito_id,numero_version,created_at")
        .in("manuscrito_id", ids)
        .order("numero_version", {
          ascending: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      versiones = data || [];
    }

    const ultimaVersion = new Map<number, any>();

    for (const version of versiones) {
      const manuscritoId = Number(version.manuscrito_id);

      if (!ultimaVersion.has(manuscritoId)) {
        ultimaVersion.set(manuscritoId, version);
      }
    }

    const resultado = (manuscritos || []).map((manuscrito: any) => {
      const version = ultimaVersion.get(Number(manuscrito.id));

      return {
        ...manuscrito,
        version_actual: version?.numero_version || null,
      };
    });

    return NextResponse.json({
      ok: true,

      miembro: {
        id: miembro.id,
        codigo: miembro.codigo,
        nombre: miembro.nombre,
        nivel: miembro.nivel,
      },

      manuscritos: resultado,
    });
  } catch (error) {
    console.error("Error GET /api/revista/mis-manuscritos:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar sus manuscritos.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let ensayoId: number | null = null;
  let manuscritoId: number | null = null;

  try {
    const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "No se indicó el código del usuario." },
        { status: 401 },
      );
    }

    const { data: miembro, error: miembroError } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre,nivel")
      .eq("codigo", codigo)
      .maybeSingle();

    if (miembroError) throw new Error(miembroError.message);

    if (!miembro) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el miembro." },
        { status: 401 },
      );
    }

    if (!puedeParticipar(normalizarCodigo(miembro.codigo))) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta opción está disponible únicamente para Investigadores acreditados y miembros Numerarios.",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const solicitudId = String(body?.solicitud_id || "")
      .trim()
      .toLowerCase();
    const titulo = String(body?.titulo || "").trim();
    const tipoContenido = String(body?.tipo_contenido || "ENSAYO")
      .trim()
      .toUpperCase();
    const temaId = Number(body?.tema_id);
    const subtemaId = body?.subtema_id ? Number(body.subtema_id) : null;
    const periodoId = body?.periodo_id ? Number(body.periodo_id) : null;
    const anioInicio = body?.anio_inicio ? Number(body.anio_inicio) : null;
    const anioFin = body?.anio_fin ? Number(body.anio_fin) : null;
    const temasSecundarios = [
      ...new Set(
        (Array.isArray(body?.temas_secundarios) ? body.temas_secundarios : [])
          .map(Number)
          .filter((id: number) => Number.isInteger(id) && id > 0),
      ),
    ].filter((id) => id !== temaId);
    const palabrasClave = [
      ...new Set(
        (Array.isArray(body?.palabras_clave) ? body.palabras_clave : [])
          .map((palabra: unknown) => String(palabra || "").trim())
          .filter(Boolean),
      ),
    ].slice(0, 12);

    if (titulo.length < 10 || titulo.length > 250) {
      return NextResponse.json(
        {
          ok: false,
          error: "El título debe contener entre 10 y 250 caracteres.",
        },
        { status: 400 },
      );
    }

    if (!TIPOS_CONTENIDO.has(tipoContenido)) {
      return NextResponse.json(
        { ok: false, error: "Seleccione un tipo de contenido válido." },
        { status: 400 },
      );
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        solicitudId,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se recibió un identificador válido para el borrador.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(temaId) || temaId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Seleccione un tema principal." },
        { status: 400 },
      );
    }

    if (
      anioInicio !== null &&
      (!Number.isInteger(anioInicio) || anioInicio < 1 || anioInicio > 2200)
    ) {
      return NextResponse.json(
        { ok: false, error: "El año inicial no es válido." },
        { status: 400 },
      );
    }

    if (
      anioFin !== null &&
      (!Number.isInteger(anioFin) || anioFin < 1 || anioFin > 2200)
    ) {
      return NextResponse.json(
        { ok: false, error: "El año final no es válido." },
        { status: 400 },
      );
    }

    if (anioInicio !== null && anioFin !== null && anioInicio > anioFin) {
      return NextResponse.json(
        { ok: false, error: "El año inicial no puede ser posterior al final." },
        { status: 400 },
      );
    }

    const { data: temaPrincipal, error: temaError } = await supabaseServer
      .from("revista_temas")
      .select("id,nombre")
      .eq("id", temaId)
      .eq("activo", true)
      .maybeSingle();

    if (temaError) throw new Error(temaError.message);
    if (!temaPrincipal) {
      return NextResponse.json(
        {
          ok: false,
          error: "El tema principal seleccionado no está disponible.",
        },
        { status: 400 },
      );
    }

    if (subtemaId) {
      const { data: subtema, error: subtemaError } = await supabaseServer
        .from("revista_subtemas")
        .select("id")
        .eq("id", subtemaId)
        .eq("tema_id", temaId)
        .eq("activo", true)
        .maybeSingle();

      if (subtemaError) throw new Error(subtemaError.message);
      if (!subtema) {
        return NextResponse.json(
          { ok: false, error: "El subtema no corresponde al tema principal." },
          { status: 400 },
        );
      }
    }

    if (periodoId) {
      const { data: periodo, error: periodoError } = await supabaseServer
        .from("revista_periodos")
        .select("id")
        .eq("id", periodoId)
        .eq("activo", true)
        .maybeSingle();

      if (periodoError) throw new Error(periodoError.message);
      if (!periodo) {
        return NextResponse.json(
          { ok: false, error: "El período seleccionado no está disponible." },
          { status: 400 },
        );
      }
    }

    if (temasSecundarios.length > 0) {
      const { data: secundariosValidos, error: secundariosError } =
        await supabaseServer
          .from("revista_temas")
          .select("id")
          .in("id", temasSecundarios)
          .eq("activo", true);

      if (secundariosError) throw new Error(secundariosError.message);
      if ((secundariosValidos || []).length !== temasSecundarios.length) {
        return NextResponse.json(
          {
            ok: false,
            error: "Uno de los temas secundarios no está disponible.",
          },
          { status: 400 },
        );
      }
    }

    const codigoVerificacion = randomUUID().toUpperCase();
    const slug = `${slugificar(titulo) || "ensayo"}-${Date.now().toString(36)}`;

    const { data: manuscritoExistente, error: existenteError } =
      await supabaseServer
        .from("manuscritos_editoriales")
        .select("id,ensayo_id")
        .eq("solicitud_id", solicitudId)
        .eq("autor_miembro_id", miembro.id)
        .maybeSingle();

    if (existenteError) throw new Error(existenteError.message);

    if (manuscritoExistente) {
      manuscritoId = Number(manuscritoExistente.id);
      ensayoId = Number(manuscritoExistente.ensayo_id);
    }

    if (!ensayoId) {
      const { data: ensayoExistente, error: ensayoExistenteError } =
        await supabaseServer
          .from("ensayos")
          .select("id")
          .eq("solicitud_id", solicitudId)
          .eq("autor_miembro_id", miembro.id)
          .maybeSingle();

      if (ensayoExistenteError) {
        throw new Error(ensayoExistenteError.message);
      }

      ensayoId = ensayoExistente ? Number(ensayoExistente.id) : null;
    }

    if (!ensayoId) {
      const { data: ensayo, error: ensayoError } = await supabaseServer
        .from("ensayos")
        .insert({
          solicitud_id: solicitudId,
          titulo,
          slug,
          autor_nombre: miembro.nombre,
          autor_codigo: miembro.codigo,
          nivel: miembro.nivel,
          proceso: "REVISTA",
          unidad_slug: "revista",
          contenido: "",
          codigo_verificacion: codigoVerificacion,
          estado: "borrador",
          tema: temaPrincipal.nombre,
          tema_id: temaId,
          subtema_id: subtemaId,
          periodo_id: periodoId,
          anio_inicio: anioInicio,
          anio_fin: anioFin,
          palabras_clave: palabrasClave,
          evidencia_validada: false,
          seleccionado_revista: false,
          origen_ensayo: "REVISTA",
          autor_miembro_id: miembro.id,
        })
        .select("id")
        .single();

      if (ensayoError) throw new Error(ensayoError.message);
      ensayoId = Number(ensayo.id);
    }

    if (!manuscritoId) {
      const { data: manuscrito, error: manuscritoError } = await supabaseServer
        .from("manuscritos_editoriales")
        .insert({
          solicitud_id: solicitudId,
          ensayo_id: ensayoId,
          autor_miembro_id: miembro.id,
          origen: "PROPUESTA_AUTOR",
          tipo_contenido: tipoContenido,
          estado: "BORRADOR",
          titulo_actual: titulo,
          contenido_actual: "",
          tema: temaPrincipal.nombre,
          tema_id: temaId,
          subtema_id: subtemaId,
          periodo_id: periodoId,
          anio_inicio: anioInicio,
          anio_fin: anioFin,
          palabras_clave: palabrasClave,
        })
        .select("id")
        .single();

      if (manuscritoError) throw new Error(manuscritoError.message);
      manuscritoId = Number(manuscrito.id);
    }

    if (temasSecundarios.length > 0) {
      const { error: temasSecundariosError } = await supabaseServer
        .from("manuscrito_temas_secundarios")
        .upsert(
          temasSecundarios.map((temaSecundarioId) => ({
            manuscrito_id: manuscritoId,
            tema_id: temaSecundarioId,
          })),
          {
            onConflict: "manuscrito_id,tema_id",
            ignoreDuplicates: true,
          },
        );

      if (temasSecundariosError) {
        throw new Error(temasSecundariosError.message);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        manuscrito_id: manuscritoId,
        estado: "BORRADOR",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error POST /api/revista/mis-manuscritos:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible crear el borrador.",
      },
      { status: 500 },
    );
  }
}