import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type OrigenMantenimiento = "vercel" | "manual";

function obtenerSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseSecret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY."
    );
  }

  return createClient(supabaseUrl, supabaseSecret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function validarAcceso(request: NextRequest): boolean {
  /*
   * En desarrollo local permitimos ejecutar la ruta directamente.
   * En producción exigimos el CRON_SECRET configurado en Vercel.
   */
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${cronSecret}`;
}

async function ejecutarMantenimiento(origen: OrigenMantenimiento) {
  const inicio = Date.now();
  const supabase = obtenerSupabaseAdmin();

  const errores: string[] = [];
  let consultasRealizadas = 0;

  let totalMiembros: number | null = null;
  let totalCandidatos: number | null = null;
  let totalEnsayos: number | null = null;
  let candidatosPendientes: number | null = null;
  let ensayosPendientes: number | null = null;
  let bucketOk = false;

  /*
   * 1. Contar miembros.
   */
  {
    const { count, error } = await supabase
      .from("miembros")
      .select("*", { count: "exact", head: true });

    consultasRealizadas += 1;

    if (error) {
      errores.push(`miembros: ${error.message}`);
    } else {
      totalMiembros = count ?? 0;
    }
  }

  /*
   * 2. Contar todos los candidatos.
   */
  {
    const { count, error } = await supabase
      .from("candidatos")
      .select("*", { count: "exact", head: true });

    consultasRealizadas += 1;

    if (error) {
      errores.push(`candidatos: ${error.message}`);
    } else {
      totalCandidatos = count ?? 0;
    }
  }

  /*
   * 3. Contar candidatos que requieren atención.
   */
  {
    const { count, error } = await supabase
      .from("candidatos")
      .select("*", { count: "exact", head: true })
      .in("estado", ["pendiente", "reenviada"]);

    consultasRealizadas += 1;

    if (error) {
      errores.push(`candidatos pendientes: ${error.message}`);
    } else {
      candidatosPendientes = count ?? 0;
    }
  }

  /*
   * 4. Contar todos los ensayos.
   */
  {
    const { count, error } = await supabase
      .from("ensayos")
      .select("*", { count: "exact", head: true });

    consultasRealizadas += 1;

    if (error) {
      errores.push(`ensayos: ${error.message}`);
    } else {
      totalEnsayos = count ?? 0;
    }
  }

  /*
   * 5. Contar ensayos pendientes de revisión.
   */
  {
    const { count, error } = await supabase
      .from("ensayos")
      .select("*", { count: "exact", head: true })
      .eq("estado_revision", "pendiente");

    consultasRealizadas += 1;

    if (error) {
      errores.push(`ensayos pendientes: ${error.message}`);
    } else {
      ensayosPendientes = count ?? 0;
    }
  }

  /*
   * 6. Comprobar que exista el bucket privado de candidatos.
   */
  {
    const { data, error } = await supabase.storage.listBuckets();

    consultasRealizadas += 1;

    if (error) {
      errores.push(`storage: ${error.message}`);
    } else {
      bucketOk =
        data?.some((bucket) => bucket.id === "candidatos-fotos") ?? false;

      if (!bucketOk) {
        errores.push("No se encontró el bucket candidatos-fotos.");
      }
    }
  }

  /*
   * 7. Actualizar la tabla histórica de ping.
   */
  {
    const { error } = await supabase
      .from("mantenimiento_ping")
      .upsert(
        {
          id: 1,
          ultimo_ping: new Date().toISOString(),
          origen:
            origen === "vercel"
              ? "vercel-administrador-automatico"
              : "manual-administrador-automatico",
        },
        {
          onConflict: "id",
        }
      );

    consultasRealizadas += 1;

    if (error) {
      errores.push(`mantenimiento_ping: ${error.message}`);
    }
  }

  /*
   * El correo se considera configurado si existen las dos variables.
   * No enviamos un correo durante cada mantenimiento.
   */
  const correoOk = Boolean(
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  );

  if (!correoOk) {
    errores.push("Correo institucional todavía no configurado.");
  }

  const duracionMs = Date.now() - inicio;

  const estado =
    errores.length === 0
      ? "correcto"
      : errores.length <= 2
        ? "advertencia"
        : "error";

  const mensaje =
    estado === "correcto"
      ? "Mantenimiento ejecutado correctamente."
      : estado === "advertencia"
        ? "Mantenimiento ejecutado con advertencias."
        : "Mantenimiento ejecutado con errores.";

  const detalle = {
    supabase: true,
    storage: bucketOk,
    correo_configurado: correoOk,
    candidatos_pendientes: candidatosPendientes,
    ensayos_pendientes: ensayosPendientes,
    errores,
  };

  /*
   * 8. Registrar la ejecución en la bitácora.
   */
  const { error: logError } = await supabase
    .from("mantenimiento_log")
    .insert({
      origen,
      estado,
      duracion_ms: duracionMs,
      consultas_realizadas: consultasRealizadas + 1,
      miembros: totalMiembros,
      candidatos: totalCandidatos,
      ensayos: totalEnsayos,
      bucket_ok: bucketOk,
      correo_ok: correoOk,
      mensaje,
      detalle,
    });

  if (logError) {
    errores.push(`mantenimiento_log: ${logError.message}`);
  }

  return {
    ok: estado !== "error",
    estado,
    fecha: new Date().toISOString(),
    origen,
    duracion_ms: Date.now() - inicio,
    consultas_realizadas: consultasRealizadas + 1,
    resultados: {
      miembros: totalMiembros,
      candidatos: totalCandidatos,
      candidatos_pendientes: candidatosPendientes,
      ensayos: totalEnsayos,
      ensayos_pendientes: ensayosPendientes,
      bucket_candidatos_fotos: bucketOk,
      correo_configurado: correoOk,
    },
    errores,
  };
}

export async function GET(request: NextRequest) {
  if (!validarAcceso(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Acceso no autorizado.",
      },
      { status: 401 }
    );
  }

  try {
    const origen: OrigenMantenimiento =
      request.headers.get("user-agent")?.includes("vercel-cron") ||
      request.headers.get("x-vercel-cron") === "1"
        ? "vercel"
        : "manual";

    const resultado = await ejecutarMantenimiento(origen);

    return NextResponse.json(resultado, {
      status: resultado.ok ? 200 : 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        estado: "error",
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido durante el mantenimiento.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}