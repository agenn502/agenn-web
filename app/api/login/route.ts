import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const codigo = String(body?.codigo || "")
      .trim()
      .toUpperCase();

    const password = String(body?.password || "").trim();

    if (!codigo || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ingresa tu código y contraseña",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 1. Buscar usuario
    // ---------------------------------------------------------

    const { data, error } = await supabaseServer
      .from("users")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      console.error("Error consultando users:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo consultar usuarios",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "No existe un usuario con ese código",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. Validar contraseña
    // ---------------------------------------------------------

    const passwordGuardada = String(
      data.password || ""
    ).trim();

    if (passwordGuardada !== password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Contraseña incorrecta",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 3. Obtener expediente del miembro
    // ---------------------------------------------------------

    const {
      data: miembro,
      error: miembroError,
    } = await supabaseServer
      .from("miembros")
      .select(
        "codigo,estado_academico,origen_acreditacion"
      )
      .eq("codigo", codigo)
      .maybeSingle();

    if (miembroError) {
      console.error(
        "Error consultando miembros:",
        miembroError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo consultar el expediente del miembro",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 4. Determinar estado académico
    // ---------------------------------------------------------

    const nivel = String(data.nivel || "")
      .trim()
      .toUpperCase();

    let estadoAcademico: string | null = null;
    let origenAcreditacion: string | null = null;

    if (nivel === "INV") {
      /*
       * Compatibilidad con investigadores existentes:
       *
       * Si todavía no tienen estado_academico,
       * se consideran EN_FORMACION.
       */
      estadoAcademico = miembro?.estado_academico
        ? String(miembro.estado_academico)
            .trim()
            .toUpperCase()
        : "EN_FORMACION";

      /*
       * El origen solo se establece cuando existe.
       *
       * RECONOCIMIENTO:
       * acreditación otorgada por el Consejo Académico.
       *
       * FORMACION:
       * acreditación obtenida al completar el proceso
       * formativo del Nivel Investigador.
       */
      origenAcreditacion =
        miembro?.origen_acreditacion
          ? String(miembro.origen_acreditacion)
              .trim()
              .toUpperCase()
          : null;
    } else {
      if (miembro?.estado_academico) {
        estadoAcademico = String(
          miembro.estado_academico
        )
          .trim()
          .toUpperCase();
      }

      if (miembro?.origen_acreditacion) {
        origenAcreditacion = String(
          miembro.origen_acreditacion
        )
          .trim()
          .toUpperCase();
      }
    }

    // ---------------------------------------------------------
    // 5. Consejo Académico
    // ---------------------------------------------------------

    const valorConsejo =
      data.consejo ?? data.Consejo ?? false;

    // ---------------------------------------------------------
    // 6. Usuario que guardará el navegador
    // ---------------------------------------------------------

    const userToStore = {
      codigo: String(data.codigo || "")
        .trim()
        .toUpperCase(),

      nivel,

      nombre: String(data.nombre || "").trim(),

      consejo:
        valorConsejo === true ||
        valorConsejo === "true" ||
        valorConsejo === "TRUE" ||
        valorConsejo === 1,

      estado_academico: estadoAcademico,

      origen_acreditacion: origenAcreditacion,
    };

    return NextResponse.json({
      ok: true,
      user: userToStore,
    });
  } catch (err) {
    console.error(
      "Error inesperado en /api/login:",
      err
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Ocurrió un error inesperado al iniciar sesión",
      },
      { status: 500 }
    );
  }
}