import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function obtenerMiembroCE(request: NextRequest) {
  const codigo = String(
    request.headers.get("x-user-codigo") || ""
  )
    .trim()
    .toUpperCase();

  if (!codigo) {
    return null;
  }

  const { data: miembro } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!miembro) {
    return null;
  }

  const { data: ce } = await supabaseServer
    .from("consejo_editorial_miembros")
    .select("miembro_id,rol,activo")
    .eq("miembro_id", miembro.id)
    .eq("activo", true)
    .maybeSingle();

  if (!ce) {
    return null;
  }

  return {
    miembro,
    ce,
  };
}

/* =========================================================
   GET
   Listar números
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const solicitante =
      await obtenerMiembroCE(request);

    if (!solicitante) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No tiene autorización para administrar Revista AGENN.",
        },
        { status: 403 }
      );
    }

    const { data: numeros, error } =
      await supabaseServer
        .from("revistas")
        .select(`
          id,
          volumen,
          numero,
          anio,
		  mes_publicacion,
          titulo,
          subtitulo,
          portada_url,
          editorial,
          estado,
          fecha_publicacion,
          slug,
          created_at,
          updated_at
        `)
        .order("anio", {
          ascending: false,
        })
        .order("numero", {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      numeros: numeros || [],
      consejo_editorial: {
        codigo:
          solicitante.miembro.codigo,
        nombre:
          solicitante.miembro.nombre,
        rol: solicitante.ce.rol,
      },
    });
  } catch (error) {
    console.error(
      "Error GET /api/revista/numeros:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar los números de la revista.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   Crear número
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const solicitante =
      await obtenerMiembroCE(request);

    if (!solicitante) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No tiene autorización para crear números de Revista AGENN.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const volumen = Number(body.volumen);
    const numero = Number(body.numero);
    const anio = Number(body.anio);
	const mesPublicacion = Number(body.mes_publicacion);

    const titulo = String(
      body.titulo || ""
    ).trim();

    const subtitulo = String(
      body.subtitulo || ""
    ).trim();

    if (
      !Number.isInteger(volumen) ||
      volumen < 1 ||
      !Number.isInteger(numero) ||
      numero < 1 ||
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
            "Volumen, número, mes y año deben contener valores válidos.",
        },
        { status: 400 }
      );
    }

    /*
     * Slug estable del número.
     * Ejemplo:
     * volumen-1-numero-1-2026
     */
    const slug =
      `volumen-${volumen}-numero-${numero}-${anio}`;

    const { data: existente } =
      await supabaseServer
        .from("revistas")
        .select("id")
        .eq("anio", anio)
        .eq("numero", numero)
        .maybeSingle();

    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Ya existe el número ${numero} correspondiente al año ${anio}.`,
        },
        { status: 409 }
      );
    }

    const { data: nuevo, error } =
      await supabaseServer
        .from("revistas")
        .insert({
          volumen,
          numero,
          anio,
		  mes_publicacion: mesPublicacion,
          titulo: titulo || null,
          subtitulo: subtitulo || null,
          slug,
          estado: "BORRADOR",
        })
        .select(`
          id,
          volumen,
          numero,
          anio,
		  mes_publicacion,
          titulo,
          subtitulo,
          estado,
          slug,
          created_at
        `)
        .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      numero: nuevo,
    });
  } catch (error) {
    console.error(
      "Error POST /api/revista/numeros:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible crear el número.",
      },
      { status: 500 }
    );
  }
}