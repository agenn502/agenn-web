import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function usuarioActivo(codigoRaw: string) {
  const codigo = String(codigoRaw || "").trim().toUpperCase();
  if (!codigo) return null;

  const { data, error } = await supabaseServer
    .from("users")
    .select("codigo,nombre,nivel,consejo,estado_miembro")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;

  if (
    String(data.estado_miembro || "")
      .trim()
      .toUpperCase() !== "ACTIVO"
  ) {
    return null;
  }

  return data;
}

export async function GET(req: NextRequest) {
  try {
    const usuario = await usuarioActivo(
      req.headers.get("x-user-codigo") || ""
    );

    if (!usuario) {
      return NextResponse.json(
        { ok: false, error: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    const vista = String(
      req.nextUrl.searchParams.get("vista") || "recibidos"
    ).toLowerCase();

    if (vista === "destinatarios") {
      const { data, error } = await supabaseServer
        .from("users")
        .select("codigo,nombre,nivel,consejo,estado_miembro")
        .eq("estado_miembro", "ACTIVO")
        .neq("codigo", usuario.codigo)
        .order("nombre", { ascending: true });

      if (error) throw new Error(error.message);

      return NextResponse.json({
        ok: true,
        destinatarios: data || [],
      });
    }

    const columna =
      vista === "enviados"
        ? "remitente_codigo"
        : "destinatario_codigo";

    const { data: mensajes, error } = await supabaseServer
      .from("mensajes_internos")
      .select(
        "id,remitente_codigo,destinatario_codigo,asunto,cuerpo,leido_at,created_at"
      )
      .eq(columna, usuario.codigo)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const codigos: string[] = [
      ...new Set<string>(
        (mensajes || [])
          .flatMap((m: any) => [
            String(m.remitente_codigo || ""),
            String(m.destinatario_codigo || ""),
          ])
          .filter((codigo: string) => Boolean(codigo))
      ),
    ];

    const nombres = new Map<string, string>();

    if (codigos.length) {
      const { data: personas, error: personasError } =
        await supabaseServer
          .from("users")
          .select("codigo,nombre")
          .in("codigo", codigos);

      if (personasError) {
        throw new Error(personasError.message);
      }

      for (const p of personas || []) {
        nombres.set(String(p.codigo), String(p.nombre || p.codigo));
      }
    }

    const resultado = (mensajes || []).map((m: any) => ({
      ...m,
      remitente_nombre:
        nombres.get(String(m.remitente_codigo)) ||
        m.remitente_codigo,
      destinatario_nombre:
        nombres.get(String(m.destinatario_codigo)) ||
        m.destinatario_codigo,
    }));

    return NextResponse.json({
      ok: true,
      mensajes: resultado,
    });
  } catch (error) {
    console.error("Error en /api/mensajes GET:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar los mensajes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const remitente = await usuarioActivo(
      req.headers.get("x-user-codigo") || ""
    );

    if (!remitente) {
      return NextResponse.json(
        { ok: false, error: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const asunto = String(body.asunto || "").trim();
    const cuerpo = String(body.cuerpo || "").trim();

    const recibidos: unknown[] = Array.isArray(
      body.destinatarios_codigos
    )
      ? body.destinatarios_codigos
      : body.destinatario_codigo
        ? [body.destinatario_codigo]
        : [];

    const codigosNormalizados: string[] = recibidos
      .map((x: unknown) =>
        String(x || "")
          .trim()
          .toUpperCase()
      )
      .filter((codigo: string) => Boolean(codigo));

    const codigos: string[] = [
      ...new Set<string>(codigosNormalizados),
    ].filter(
      (codigo: string) =>
        codigo !== String(remitente.codigo).toUpperCase()
    );

    if (!codigos.length || !asunto || !cuerpo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seleccione al menos un destinatario y complete asunto y mensaje.",
        },
        { status: 400 }
      );
    }

    if (asunto.length > 180) {
      return NextResponse.json(
        {
          ok: false,
          error: "El asunto no puede exceder 180 caracteres.",
        },
        { status: 400 }
      );
    }

    if (cuerpo.length > 12000) {
      return NextResponse.json(
        {
          ok: false,
          error: "El mensaje es demasiado extenso.",
        },
        { status: 400 }
      );
    }

    const { data: activos, error: activosError } =
      await supabaseServer
        .from("users")
        .select("codigo")
        .in("codigo", codigos)
        .eq("estado_miembro", "ACTIVO");

    if (activosError) {
      throw new Error(activosError.message);
    }

    const validos = new Set<string>(
      (activos || []).map((x: any) =>
        String(x.codigo || "").toUpperCase()
      )
    );

    const invalidos: string[] = codigos.filter(
      (codigo: string) => !validos.has(codigo)
    );

    if (invalidos.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Uno o más destinatarios ya no están disponibles.",
        },
        { status: 409 }
      );
    }

    const filas = codigos.map(
      (destinatario_codigo: string) => ({
        remitente_codigo: remitente.codigo,
        destinatario_codigo,
        asunto,
        cuerpo,
      })
    );

    const { data, error } = await supabaseServer
      .from("mensajes_internos")
      .insert(filas)
      .select("id,destinatario_codigo,created_at");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      cantidad: data?.length || filas.length,
      mensajes: data || [],
    });
  } catch (error) {
    console.error("Error en /api/mensajes POST:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible enviar el mensaje.",
      },
      { status: 500 }
    );
  }
}
