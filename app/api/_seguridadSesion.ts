import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/authSession";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Barrera de compatibilidad: conserva x-user-codigo para el codigo existente,
 * pero NUNCA lo acepta como identidad sin comprobar la cookie firmada.
 * Se comprueba el estado actual del miembro en cada peticion.
 */
export async function validarIdentidadCabecera(
  request: NextRequest,
  permitirSinCabecera = false
): Promise<NextResponse | null> {
  if (permitirSinCabecera && !request.headers.get("x-user-codigo")) {
    return null;
  }
  const sesion = await obtenerSesion();
  if (!sesion) {
    return NextResponse.json(
      { ok: false, error: "Sesión inexistente o vencida. Ingrese nuevamente." },
      { status: 401 }
    );
  }

  const codigoDeclarado = String(
    request.headers.get("x-user-codigo") || ""
  ).trim().toUpperCase();

  if (!codigoDeclarado || codigoDeclarado !== sesion.codigo) {
    return NextResponse.json(
      { ok: false, error: "La identidad solicitada no coincide con la sesión." },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseServer
    .from("users")
    .select("estado_miembro")
    .eq("codigo", sesion.codigo)
    .maybeSingle();

  if (error) {
    console.error("Error verificando estado de sesión:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo verificar la sesión." },
      { status: 503 }
    );
  }

  if (!data || String(data.estado_miembro || "").trim().toUpperCase() !== "ACTIVO") {
    return NextResponse.json(
      { ok: false, error: "Membresía inactiva o no autorizada." },
      { status: 403 }
    );
  }

  return null;
}
