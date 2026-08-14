import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ProgresoRow = {
  user_codigo: string;
  unidad_slug: string;
  porcentaje: number | null;
  completada: boolean | null;
};

function calcularPromedio(
  filas: ProgresoRow[],
  unidadesEsperadas: string[]
): number {
  if (unidadesEsperadas.length === 0) return 0;

  const mapa = new Map<string, number>();

  filas.forEach((fila) => {
    mapa.set(
      fila.unidad_slug,
      Number.isFinite(Number(fila.porcentaje))
        ? Number(fila.porcentaje)
        : 0
    );
  });

  const suma = unidadesEsperadas.reduce(
    (acc, unidad) => acc + (mapa.get(unidad) || 0),
    0
  );

  return Math.round(suma / unidadesEsperadas.length);
}

export async function GET(req: NextRequest) {
  try {
    const codigoSolicitante = String(
      req.headers.get("x-user-codigo") || ""
    )
      .trim()
      .toUpperCase();

    if (!codigoSolicitante) {
      return NextResponse.json(
        {
          ok: false,
          error: "No fue posible identificar al usuario.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 1. Obtener usuario solicitante
    // ---------------------------------------------------------

    const { data: usuario, error: usuarioError } =
      await supabaseServer
        .from("users")
        .select("codigo,nivel,nombre,consejo")
        .eq("codigo", codigoSolicitante)
        .maybeSingle();

    if (usuarioError || !usuario) {
      return NextResponse.json(
        {
          ok: false,
          error: "Usuario no autorizado.",
        },
        { status: 403 }
      );
    }

    const nivelSolicitante = String(usuario.nivel || "")
      .trim()
      .toUpperCase();

    // ---------------------------------------------------------
    // 2. Obtener estado académico del solicitante
    // ---------------------------------------------------------

    const {
      data: miembroSolicitante,
      error: miembroSolicitanteError,
    } = await supabaseServer
      .from("miembros")
      .select(
        `
        codigo,
        estado_academico,
        origen_acreditacion
        `
      )
      .eq("codigo", codigoSolicitante)
      .maybeSingle();

    if (miembroSolicitanteError) {
      throw new Error(miembroSolicitanteError.message);
    }

    const estadoAcademicoSolicitante =
      miembroSolicitante?.estado_academico
        ? String(miembroSolicitante.estado_academico)
            .trim()
            .toUpperCase()
        : null;

    // ---------------------------------------------------------
    // 3. Determinar niveles visibles
    // ---------------------------------------------------------

    let visibles: string[] = [];

    switch (nivelSolicitante) {
      case "NUM":
        visibles = ["NUM", "INV", "NOV", "ASP"];
        break;

      case "INV":
        if (estadoAcademicoSolicitante === "ACREDITADO") {
          /*
           * Un Investigador acreditado puede consultar también
           * el Directorio de Académicos Numerarios.
           */
          visibles = ["NUM", "INV", "NOV", "ASP"];
        } else {
          visibles = ["INV", "NOV", "ASP"];
        }
        break;

      case "NOV":
        visibles = ["NOV", "ASP"];
        break;

      case "ASP":
        visibles = ["ASP"];
        break;

      default:
        visibles = [];
    }

    if (visibles.length === 0) {
      return NextResponse.json({
        ok: true,
        miembros: [],
      });
    }

    // ---------------------------------------------------------
    // 4. Obtener miembros visibles
    // ---------------------------------------------------------

    const { data: miembros, error: miembrosError } =
      await supabaseServer
        .from("miembros")
        .select(
          `
          id,
          codigo,
          nombre,
          nivel,
          foto_url,
          fecha_nacimiento,
          profesion,
          bio,
          estado_academico,
          origen_acreditacion
          `
        )
        .in("nivel", visibles)
        .order("codigo", { ascending: true });

    if (miembrosError) {
      throw new Error(miembrosError.message);
    }

    // ---------------------------------------------------------
    // 5. Separar códigos por nivel
    // ---------------------------------------------------------

    const codigosASP = (miembros || [])
      .filter((m) => m.nivel === "ASP")
      .map((m) => m.codigo);

    const codigosNOV = (miembros || [])
      .filter((m) => m.nivel === "NOV")
      .map((m) => m.codigo);

    /*
     * Solo necesitamos progreso para INV que todavía están
     * en formación.
     *
     * Los acreditados ya no dependen de progreso_inv.
     */
    const codigosINVFormacion = (miembros || [])
      .filter(
        (m) =>
          m.nivel === "INV" &&
          String(m.estado_academico || "")
            .trim()
            .toUpperCase() !== "ACREDITADO"
      )
      .map((m) => m.codigo);

    // ---------------------------------------------------------
    // 6. Consultar progresos
    // ---------------------------------------------------------

    const [aspResult, novResult, invResult] =
      await Promise.all([
        codigosASP.length > 0
          ? supabaseServer
              .from("progreso_aspirante")
              .select(
                "user_codigo,unidad_slug,porcentaje,completada"
              )
              .in("user_codigo", codigosASP)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        codigosNOV.length > 0
          ? supabaseServer
              .from("progreso_novicio")
              .select(
                "user_codigo,unidad_slug,porcentaje,completada"
              )
              .in("user_codigo", codigosNOV)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        codigosINVFormacion.length > 0
          ? supabaseServer
              .from("progreso_inv")
              .select(
                "user_codigo,unidad_slug,porcentaje,completada"
              )
              .in(
                "user_codigo",
                codigosINVFormacion
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

    if (aspResult.error) {
      throw new Error(aspResult.error.message);
    }

    if (novResult.error) {
      throw new Error(novResult.error.message);
    }

    if (invResult.error) {
      throw new Error(invResult.error.message);
    }

    const progresoASP =
      (aspResult.data || []) as ProgresoRow[];

    const progresoNOV =
      (novResult.data || []) as ProgresoRow[];

    const progresoINV =
      (invResult.data || []) as ProgresoRow[];

    // ---------------------------------------------------------
    // 7. Unidades esperadas
    // ---------------------------------------------------------

    const unidadesNOV = [
      "introductorio",
      "unidad-1",
      "unidad-2",
      "unidad-3",
      "unidad-4",
      "unidad-5",
      "unidad-6",
      "unidad-7",
      "unidad-8",
      "unidad-9",
      "unidad-10",
    ];

    const unidadesINV = [
      "unidad-1",
      "unidad-2",
      "unidad-3",
      "unidad-4",
      "unidad-5",
      "unidad-6",
      "unidad-7",
      "unidad-8",
      "unidad-9",
      "unidad-10",
    ];

    // ---------------------------------------------------------
    // 8. Calcular avance
    // ---------------------------------------------------------

    const miembrosConAvance = (miembros || []).map(
      (miembro) => {
        let avanceAcademico = 0;

        const estadoAcademico =
          miembro.estado_academico
            ? String(miembro.estado_academico)
                .trim()
                .toUpperCase()
            : null;

        if (miembro.nivel === "ASP") {
          const fila = progresoASP.find(
            (p) =>
              p.user_codigo === miembro.codigo &&
              p.unidad_slug === "introductorio"
          );

          avanceAcademico = Number(
            fila?.porcentaje || 0
          );
        }

        if (miembro.nivel === "NOV") {
          const filas = progresoNOV.filter(
            (p) =>
              p.user_codigo === miembro.codigo
          );

          avanceAcademico = calcularPromedio(
            filas,
            unidadesNOV
          );
        }

        if (
          miembro.nivel === "INV" &&
          estadoAcademico === "ACREDITADO"
        ) {
          /*
           * No significa que cursó el 100 % de las unidades.
           * Significa que su estado académico ya es acreditado.
           *
           * La página distinguirá visualmente este caso y no
           * mostrará una barra falsa de progreso.
           */
          avanceAcademico = 100;
        } else if (miembro.nivel === "INV") {
          const filas = progresoINV.filter(
            (p) =>
              p.user_codigo === miembro.codigo
          );

          avanceAcademico = calcularPromedio(
            filas,
            unidadesINV
          );
        }

        return {
          ...miembro,
          estado_academico:
            estadoAcademico,

          origen_acreditacion:
            miembro.origen_acreditacion
              ? String(
                  miembro.origen_acreditacion
                )
                  .trim()
                  .toUpperCase()
              : null,

          avanceAcademico,
        };
      }
    );

    return NextResponse.json({
      ok: true,

      solicitante: {
        codigo: codigoSolicitante,
        nivel: nivelSolicitante,
        estado_academico:
          estadoAcademicoSolicitante,
      },

      miembros: miembrosConAvance,
    });
  } catch (error) {
    console.error(
      "Error en /api/directorio:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el directorio.",
      },
      { status: 500 }
    );
  }
}