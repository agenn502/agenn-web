import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function normalizarCodigo(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const codigo = normalizarCodigo(
      req.headers.get("x-user-codigo")
    );

    if (!codigo) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se indicó el código del usuario.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 1. Identificar al miembro
    // ---------------------------------------------------------

    const { data: miembro, error: miembroError } =
      await supabaseServer
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
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. Verificar pertenencia activa al Consejo Editorial
    // ---------------------------------------------------------

    const { data: registroCE, error: ceError } =
      await supabaseServer
        .from("consejo_editorial_miembros")
        .select("id,rol,activo")
        .eq("miembro_id", miembro.id)
        .eq("activo", true)
        .maybeSingle();

    if (ceError) {
      throw new Error(ceError.message);
    }

    if (!registroCE) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario no pertenece actualmente al Consejo Editorial.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 3. Cargar manuscritos
    // ---------------------------------------------------------

    const { data: manuscritos, error: manuscritosError } =
      await supabaseServer
        .from("manuscritos_editoriales")
        .select(`
          id,
          ensayo_id,
          autor_miembro_id,
          origen,
          tipo_contenido,
          estado,
          titulo_actual,
          tema,
          fecha_ingreso,
          fecha_aval,
          created_at,
          updated_at
        `)
        .order("fecha_ingreso", {
          ascending: false,
        });

    if (manuscritosError) {
      throw new Error(manuscritosError.message);
    }

    const lista = manuscritos || [];

    // ---------------------------------------------------------
    // 4. Obtener autores
    // ---------------------------------------------------------

    const autorIds = [
      ...new Set(
        lista
          .map((m: any) =>
            Number(m.autor_miembro_id)
          )
          .filter(Boolean)
      ),
    ];

    let autores: any[] = [];

    if (autorIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nivel")
        .in("id", autorIds);

      if (error) {
        throw new Error(error.message);
      }

      autores = data || [];
    }

    const autoresPorId = new Map(
      autores.map((autor: any) => [
        Number(autor.id),
        autor,
      ])
    );

    // ---------------------------------------------------------
    // 5. Obtener última versión de cada manuscrito
    // ---------------------------------------------------------

    const manuscritoIds = lista.map((m: any) =>
      Number(m.id)
    );

    let versiones: any[] = [];

    if (manuscritoIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("manuscrito_versiones")
        .select(
          "id,manuscrito_id,numero_version,created_at"
        )
        .in("manuscrito_id", manuscritoIds)
        .order("numero_version", {
          ascending: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      versiones = data || [];
    }

    const versionPorManuscrito = new Map<
      number,
      any
    >();

    for (const version of versiones) {
      const id = Number(version.manuscrito_id);

      if (!versionPorManuscrito.has(id)) {
        versionPorManuscrito.set(
          id,
          version
        );
      }
    }

    // ---------------------------------------------------------
    // 6. Construir respuesta
    // ---------------------------------------------------------

    const resultado = lista.map(
      (manuscrito: any) => {
        const autor = autoresPorId.get(
          Number(manuscrito.autor_miembro_id)
        );

        const version =
          versionPorManuscrito.get(
            Number(manuscrito.id)
          );

        return {
          ...manuscrito,

          autor: autor
            ? {
                id: autor.id,
                codigo: autor.codigo,
                nombre: autor.nombre,
                nivel: autor.nivel,
              }
            : null,

          version_actual:
            version?.numero_version || null,

          version_id:
            version?.id || null,
        };
      }
    );

    return NextResponse.json({
      ok: true,

      consejo_editorial: {
        miembro_id: miembro.id,
        codigo: miembro.codigo,
        nombre: miembro.nombre,
        rol: registroCE.rol,
      },

      manuscritos: resultado,
    });
  } catch (error) {
    console.error(
      "Error GET /api/revista/editorial:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar la gestión editorial.",
      },
      { status: 500 }
    );
  }
}