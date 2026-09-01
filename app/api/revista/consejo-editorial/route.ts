import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RolCE = "DIRECTOR" | "EDITOR" | "MIEMBRO";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

function esRolValido(valor: unknown): valor is RolCE {
  return valor === "DIRECTOR" || valor === "EDITOR" || valor === "MIEMBRO";
}

async function obtenerSolicitante(req: NextRequest) {
  const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));

  if (!codigo) {
    return { ok: false as const, status: 401, error: "No se indicó el código del usuario." };
  }

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel,estado_academico")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError || !miembro) {
    return { ok: false as const, status: 401, error: "No se encontró el miembro solicitante." };
  }

  const { data: registroCE, error: ceError } = await supabaseServer
    .from("consejo_editorial_miembros")
    .select("id,rol,activo")
    .eq("miembro_id", miembro.id)
    .eq("activo", true)
    .maybeSingle();

  if (ceError) throw new Error(ceError.message);

  return { ok: true as const, miembro, registroCE };
}

function puedePertenecerAlCE(miembro: { nivel: string | null; estado_academico: string | null }) {
  const nivel = String(miembro.nivel || "").trim().toUpperCase();
  const estado = String(miembro.estado_academico || "").trim().toUpperCase();

  return nivel === "NUM" || (nivel === "INV" && estado === "ACREDITADO");
}

export async function GET(req: NextRequest) {
  try {
    const solicitante = await obtenerSolicitante(req);

    if (!solicitante.ok) {
      return NextResponse.json({ ok: false, error: solicitante.error }, { status: solicitante.status });
    }

    if (!solicitante.registroCE) {
      return NextResponse.json(
        { ok: false, error: "El usuario no pertenece al Consejo Editorial." },
        { status: 403 }
      );
    }

    const [
      { data: registros, error: registrosError },
      { data: candidatos, error: candidatosError },
    ] = await Promise.all([
      supabaseServer
        .from("consejo_editorial_miembros")
        .select(`
          id,
          miembro_id,
          rol,
          activo,
          fecha_inicio,
          fecha_fin,
          created_at,
          miembros!consejo_editorial_miembros_miembro_id_fkey (
            codigo,
            nombre,
            nivel,
            estado_academico
          )
        `)
        .order("activo", { ascending: false })
        .order("fecha_inicio", { ascending: false }),

      supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nivel,estado_academico")
        .order("nombre", { ascending: true }),
    ]);

    if (registrosError) throw new Error(registrosError.message);
    if (candidatosError) throw new Error(candidatosError.message);

    const idsActivos = new Set(
      (registros || [])
        .filter((fila: any) => fila.activo === true)
        .map((fila: any) => Number(fila.miembro_id))
    );

    const elegibles = (candidatos || []).filter(
      (fila: any) =>
        puedePertenecerAlCE(fila) &&
        !idsActivos.has(Number(fila.id))
    );

    return NextResponse.json({
      ok: true,
      solicitante: {
        codigo: solicitante.miembro.codigo,
        nombre: solicitante.miembro.nombre,
        rol: solicitante.registroCE.rol,
      },
      registros: registros || [],
      elegibles,
    });
  } catch (error) {
    console.error("Error GET /api/revista/consejo-editorial:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el Consejo Editorial.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const solicitante = await obtenerSolicitante(req);

    if (!solicitante.ok) {
      return NextResponse.json({ ok: false, error: solicitante.error }, { status: solicitante.status });
    }

    if (!solicitante.registroCE || solicitante.registroCE.rol !== "DIRECTOR") {
      return NextResponse.json(
        { ok: false, error: "Solo el Director del Consejo Editorial puede incorporar miembros." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const miembroId = Number(body.miembro_id);
    const rol = normalizarCodigo(body.rol);

    if (!Number.isInteger(miembroId) || miembroId <= 0) {
      return NextResponse.json(
        { ok: false, error: "El miembro seleccionado no es válido." },
        { status: 400 }
      );
    }

    if (!esRolValido(rol)) {
      return NextResponse.json(
        { ok: false, error: "El rol debe ser DIRECTOR, EDITOR o MIEMBRO." },
        { status: 400 }
      );
    }

    const { data: miembro, error: miembroError } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre,nivel,estado_academico")
      .eq("id", miembroId)
      .maybeSingle();

    if (miembroError || !miembro) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el miembro seleccionado." },
        { status: 404 }
      );
    }

    if (!puedePertenecerAlCE(miembro)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El Consejo Editorial solo puede estar integrado por Numerarios o Investigadores acreditados.",
        },
        { status: 409 }
      );
    }

    const { data: activoExistente, error: activoError } = await supabaseServer
      .from("consejo_editorial_miembros")
      .select("id")
      .eq("miembro_id", miembroId)
      .eq("activo", true)
      .maybeSingle();

    if (activoError) throw new Error(activoError.message);

    if (activoExistente) {
      return NextResponse.json(
        { ok: false, error: "El miembro ya pertenece actualmente al Consejo Editorial." },
        { status: 409 }
      );
    }

    const { data: creado, error: crearError } = await supabaseServer
      .from("consejo_editorial_miembros")
      .insert({
        miembro_id: miembroId,
        rol,
        activo: true,
        fecha_inicio: new Date().toISOString(),
        fecha_fin: null,
      })
      .select("id")
      .single();

    if (crearError) throw new Error(crearError.message);

    return NextResponse.json({ ok: true, id: creado.id });
  } catch (error) {
    console.error("Error POST /api/revista/consejo-editorial:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible incorporar al miembro.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const solicitante = await obtenerSolicitante(req);

    if (!solicitante.ok) {
      return NextResponse.json({ ok: false, error: solicitante.error }, { status: solicitante.status });
    }

    if (!solicitante.registroCE || solicitante.registroCE.rol !== "DIRECTOR") {
      return NextResponse.json(
        { ok: false, error: "Solo el Director del Consejo Editorial puede modificar integrantes y roles." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = Number(body.id);
    const accion = String(body.accion || "").trim().toUpperCase();

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { ok: false, error: "El registro editorial no es válido." },
        { status: 400 }
      );
    }

    const { data: registro, error: registroError } = await supabaseServer
      .from("consejo_editorial_miembros")
      .select("id,miembro_id,rol,activo")
      .eq("id", id)
      .maybeSingle();

    if (registroError || !registro) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el registro del Consejo Editorial." },
        { status: 404 }
      );
    }

    if (accion === "CAMBIAR_ROL") {
      const rol = normalizarCodigo(body.rol);

      if (!esRolValido(rol)) {
        return NextResponse.json(
          { ok: false, error: "El rol debe ser DIRECTOR, EDITOR o MIEMBRO." },
          { status: 400 }
        );
      }

      if (!registro.activo) {
        return NextResponse.json(
          { ok: false, error: "No se puede cambiar el rol de un integrante inactivo." },
          { status: 409 }
        );
      }

      const { error } = await supabaseServer
        .from("consejo_editorial_miembros")
        .update({ rol })
        .eq("id", id);

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true });
    }

    if (accion === "RETIRAR") {
      if (!registro.activo) {
        return NextResponse.json({ ok: true });
      }

      if (
        Number(registro.miembro_id) === Number(solicitante.miembro.id) &&
        registro.rol === "DIRECTOR"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El Director no puede retirarse a sí mismo. Designe primero a otro Director.",
          },
          { status: 409 }
        );
      }

      const { error } = await supabaseServer
        .from("consejo_editorial_miembros")
        .update({
          activo: false,
          fecha_fin: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "La acción solicitada no es válida." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error PATCH /api/revista/consejo-editorial:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible modificar el Consejo Editorial.",
      },
      { status: 500 }
    );
  }
}
