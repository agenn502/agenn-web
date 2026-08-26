import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarConsejo(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) return false;

  const { data } = await supabaseServer
    .from("users")
    .select("consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  const valor = data?.consejo;

  return (
    valor === true ||
    valor === "true" ||
    valor === "TRUE" ||
    valor === 1
  );
}

export async function GET(req: NextRequest) {
  if (!(await validarConsejo(req))) {
    return NextResponse.json(
      {
        ok: false,
        error: "Acceso no autorizado.",
      },
      { status: 403 }
    );
  }

  const [
    { count: candidatos, error: candidatosError },
    { count: investigadores, error: investigadoresError },
    { count: asimilaciones, error: asimilacionesError },
  ] = await Promise.all([
    supabaseServer
      .from("candidatos")
      .select("*", { count: "exact", head: true })
      .in("estado", ["pendiente", "reenviada"]),

    supabaseServer
	  .from("ensayos")
	  .select("*", { count: "exact", head: true })
	  .eq("estado", "publicado")
	  .or(
		"estado_revision.eq.pendiente,estado_difusion.eq.pendiente"
	  ),

    supabaseServer
      .from("asimilaciones")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
  ]);

  if (
    candidatosError ||
    investigadoresError ||
    asimilacionesError
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          candidatosError?.message ||
          investigadoresError?.message ||
          asimilacionesError?.message,
      },
      { status: 500 }
    );
  }

  const conteos = {
    candidatos: candidatos || 0,
    aspirantes: 0,
    novicios: 0,
    investigadores: investigadores || 0,
    asimilaciones: asimilaciones || 0,
  };

  return NextResponse.json({
    ok: true,
    conteos,
    total: Object.values(conteos).reduce(
      (suma, valor) => suma + valor,
      0
    ),
  });
}