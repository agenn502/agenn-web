import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

async function obtenerEditor(request: NextRequest) {
  const codigo = normalizarCodigo(request.headers.get("x-user-codigo"));

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

  const { data: consejo, error: consejoError } = await supabaseServer
    .from("consejo_editorial_miembros")
    .select("id,rol,activo")
    .eq("miembro_id", miembro.id)
    .eq("activo", true)
    .maybeSingle();

  if (consejoError) throw new Error(consejoError.message);
  if (!consejo) {
    return {
      ok: false as const,
      status: 403,
      error: "El usuario no pertenece actualmente al Consejo Editorial.",
    };
  }

  if (!["DIRECTOR", "EDITOR"].includes(String(consejo.rol || "").toUpperCase())) {
    return {
      ok: false as const,
      status: 403,
      error: "Su rol no permite administrar el Banco de ensayos.",
    };
  }

  return { ok: true as const, miembro, consejo };
}

export async function GET(request: NextRequest) {
  try {
    const solicitante = await obtenerEditor(request);

    if (!solicitante.ok) {
      return NextResponse.json(
        { ok: false, error: solicitante.error },
        { status: solicitante.status }
      );
    }

    const { data: avalados, error: avaladosError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select(`
        id,
        autor_miembro_id,
        titulo_actual,
        tipo_contenido,
        origen,
        estado,
        tema,
        fecha_aval,
        updated_at
      `)
      .eq("estado", "AVALADO")
      .order("fecha_aval", { ascending: true });

    if (avaladosError) throw new Error(avaladosError.message);
    if (!avalados?.length) {
      return NextResponse.json({ ok: true, publicables: [] });
    }

    const manuscritoIds = avalados.map((manuscrito) => Number(manuscrito.id));

    const { data: asignaciones, error: asignacionesError } = await supabaseServer
      .from("revista_articulos")
      .select("manuscrito_id")
      .in("manuscrito_id", manuscritoIds);

    if (asignacionesError) throw new Error(asignacionesError.message);

    const asignados = new Set(
      (asignaciones || []).map((asignacion) => Number(asignacion.manuscrito_id))
    );
    const disponibles = avalados.filter(
      (manuscrito) => !asignados.has(Number(manuscrito.id))
    );

    if (!disponibles.length) {
      return NextResponse.json({ ok: true, publicables: [] });
    }

    const disponiblesIds = disponibles.map((manuscrito) => Number(manuscrito.id));
    const autorIds = [
      ...new Set(
        disponibles
          .map((manuscrito) => Number(manuscrito.autor_miembro_id))
          .filter(Boolean)
      ),
    ];

    const versionesPromesa = supabaseServer
      .from("manuscrito_versiones")
      .select("id,manuscrito_id,numero_version,titulo,created_at")
      .in("manuscrito_id", disponiblesIds)
      .order("numero_version", { ascending: false });

    const autoresPromesa = autorIds.length
      ? supabaseServer
          .from("miembros")
          .select("id,codigo,nombre,nivel")
          .in("id", autorIds)
      : Promise.resolve({ data: [], error: null });

    const [versionesResultado, autoresResultado] = await Promise.all([
      versionesPromesa,
      autoresPromesa,
    ]);

    if (versionesResultado.error) {
      throw new Error(versionesResultado.error.message);
    }
    if (autoresResultado.error) {
      throw new Error(autoresResultado.error.message);
    }

    const ultimaVersionPorManuscrito = new Map<number, unknown>();

    for (const version of versionesResultado.data || []) {
      const manuscritoId = Number(version.manuscrito_id);
      if (!ultimaVersionPorManuscrito.has(manuscritoId)) {
        ultimaVersionPorManuscrito.set(manuscritoId, version);
      }
    }

    const autorPorId = new Map(
      (autoresResultado.data || []).map((autor) => [Number(autor.id), autor])
    );

    const publicables = disponibles.map((manuscrito) => ({
      ...manuscrito,
      autor: autorPorId.get(Number(manuscrito.autor_miembro_id)) || null,
      version: ultimaVersionPorManuscrito.get(Number(manuscrito.id)) || null,
    }));

    return NextResponse.json({
      ok: true,
      publicables,
      consejo_editorial: {
        codigo: solicitante.miembro.codigo,
        nombre: solicitante.miembro.nombre,
        rol: solicitante.consejo.rol,
      },
    });
  } catch (error) {
    console.error("Error GET /api/revista/banco:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el Banco de ensayos.",
      },
      { status: 500 }
    );
  }
}