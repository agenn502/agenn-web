import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const codigoUsuario = String(
      request.headers.get("x-user-codigo") || ""
    )
      .trim()
      .toUpperCase();

    if (!codigoUsuario) {
      return NextResponse.json(
        {
          ok: false,
          error: "No fue posible identificar al usuario.",
        },
        { status: 401 }
      );
    }

    const { data: usuario, error: usuarioError } = await supabaseServer
      .from("users")
      .select("codigo,nombre,consejo")
      .eq("codigo", codigoUsuario)
      .maybeSingle();

    if (usuarioError || !usuario) {
      return NextResponse.json(
        {
          ok: false,
          error: "Usuario no encontrado.",
        },
        { status: 404 }
      );
    }

    const esConsejo =
      usuario.consejo === true ||
      usuario.consejo === "true" ||
      usuario.consejo === "TRUE" ||
      usuario.consejo === 1;

    if (!esConsejo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Esta sección es exclusiva del Consejo Académico.",
        },
        { status: 403 }
      );
    }

    const { data: propuestas, error: propuestasError } = await supabaseServer
      .from("asimilaciones")
      .select(
        `
        id,
        fecha_propuesta,
        estado,
        nivel_propuesto,
        nombre,
        correo,
        telefono,
        justificacion,
        proponente_codigo,
        votos_favor,
        votos_contra,
        votos_emitidos,
        resultado,
        fecha_resolucion,
        observaciones,
        fecha_envio_invitacion,
        invitacion_enviada_por,
        fecha_aceptacion,
        fecha_incorporacion,
        codigo_asignado
        `
      )
      .order("fecha_propuesta", { ascending: false });

    if (propuestasError) {
      throw new Error(propuestasError.message);
    }

    const { data: miembrosConsejo, error: consejoError } = await supabaseServer
      .from("users")
      .select("codigo,nombre,nivel,consejo")
      .eq("consejo", true)
      .order("codigo", { ascending: true });

    if (consejoError) {
      throw new Error(consejoError.message);
    }

    const totalConsejo = miembrosConsejo?.length || 0;

    const codigosUsuarios = [
      ...new Set([
        ...(propuestas || [])
          .map((propuesta) => propuesta.proponente_codigo)
          .filter(Boolean),

        ...(propuestas || [])
          .map((propuesta) => propuesta.invitacion_enviada_por)
          .filter(Boolean),

        ...(miembrosConsejo || [])
          .map((miembro) => miembro.codigo)
          .filter(Boolean),
      ]),
    ];

    let usuariosPorCodigo = new Map<
      string,
      {
        codigo: string;
        nombre: string;
        nivel: string;
      }
    >();

    if (codigosUsuarios.length > 0) {
      const { data: usuarios, error: usuariosError } = await supabaseServer
        .from("users")
        .select("codigo,nombre,nivel")
        .in("codigo", codigosUsuarios);

      if (usuariosError) {
        throw new Error(usuariosError.message);
      }

      usuariosPorCodigo = new Map(
        (usuarios || []).map((item) => [
          item.codigo,
          {
            codigo: item.codigo,
            nombre: item.nombre,
            nivel: item.nivel,
          },
        ])
      );
    }

    const idsPropuestas = (propuestas || []).map(
      (propuesta) => propuesta.id
    );

    let votos: {
      id: number;
      asimilacion_id: number;
      consejero_codigo: string;
      voto: string;
      comentario: string | null;
      fecha_voto: string;
    }[] = [];

    if (idsPropuestas.length > 0) {
      const { data: votosData, error: votosError } = await supabaseServer
        .from("asimilaciones_votos")
        .select(
          `
          id,
          asimilacion_id,
          consejero_codigo,
          voto,
          comentario,
          fecha_voto
          `
        )
        .in("asimilacion_id", idsPropuestas)
        .order("fecha_voto", { ascending: true });

      if (votosError) {
        throw new Error(votosError.message);
      }

      votos = votosData || [];
    }

    const asimilaciones = (propuestas || []).map((propuesta) => {
      const datosProponente = usuariosPorCodigo.get(
        propuesta.proponente_codigo
      );

      const datosEnviadoPor = propuesta.invitacion_enviada_por
        ? usuariosPorCodigo.get(propuesta.invitacion_enviada_por)
        : null;

      const votosPropuesta = votos.filter(
        (voto) => voto.asimilacion_id === propuesta.id
      );

      const votosDetallados = votosPropuesta.map((voto) => {
        const datosConsejero = usuariosPorCodigo.get(
          voto.consejero_codigo
        );

        return {
          id: voto.id,
          consejero_codigo: voto.consejero_codigo,
          consejero_nombre:
            datosConsejero?.nombre || voto.consejero_codigo,
          voto: voto.voto,
          comentario: voto.comentario,
          fecha_voto: voto.fecha_voto,
        };
      });

      const miVoto =
        votosDetallados.find(
          (voto) => voto.consejero_codigo === codigoUsuario
        ) || null;

      const votosFavor = votosPropuesta.filter(
        (voto) => voto.voto === "favor"
      ).length;

      const votosContra = votosPropuesta.filter(
        (voto) => voto.voto === "contra"
      ).length;

      const votosEmitidos = votosPropuesta.length;

      return {
        ...propuesta,

        proponente_nombre:
          datosProponente?.nombre || propuesta.proponente_codigo,

        proponente_nivel:
          datosProponente?.nivel || null,

        invitacion_enviada_por_nombre:
          datosEnviadoPor?.nombre ||
          propuesta.invitacion_enviada_por ||
          null,

        total_consejo: totalConsejo,

        votos_favor: votosFavor,
        votos_contra: votosContra,
        votos_emitidos: votosEmitidos,

        votos: votosDetallados,

        mi_voto: miVoto,

        puede_votar:
          propuesta.estado === "pendiente" && miVoto === null,
      };
    });

    return NextResponse.json({
      ok: true,

      usuario: {
        codigo: usuario.codigo,
        nombre: usuario.nombre,
      },

      totalConsejo,

      asimilaciones,
    });
  } catch (error) {
    console.error(
      "Error en /api/asimilaciones:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar las propuestas de incorporación.",
      },
      { status: 500 }
    );
  }
}