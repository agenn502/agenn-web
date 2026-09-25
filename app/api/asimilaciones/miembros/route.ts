import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const codigo = String(request.headers.get("x-user-codigo") || "").trim().toUpperCase();
    if (!codigo) return NextResponse.json({ ok: false, error: "No fue posible identificar al usuario." }, { status: 401 });

    const { data: solicitante, error: solicitanteError } = await supabaseServer
      .from("users").select("codigo,consejo,estado_miembro").eq("codigo", codigo).maybeSingle();
    if (solicitanteError || !solicitante) return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });

    const esConsejo = solicitante.consejo === true || solicitante.consejo === "true" || solicitante.consejo === "TRUE" || solicitante.consejo === 1;
    if (!esConsejo || String(solicitante.estado_miembro || "").toUpperCase() !== "ACTIVO") {
      return NextResponse.json({ ok: false, error: "Esta acción es exclusiva del Consejo Académico activo." }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre,nivel,estado_academico,origen_acreditacion,correo")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);

    const codigos = (data || []).map((m) => m.codigo).filter(Boolean);
    let estados = new Map<string, string>();
    if (codigos.length) {
      const { data: users, error: usersError } = await supabaseServer
        .from("users").select("codigo,estado_miembro").in("codigo", codigos);
      if (usersError) throw new Error(usersError.message);
      estados = new Map((users || []).map((u) => [u.codigo, String(u.estado_miembro || "ACTIVO")]));
    }

    const miembros = (data || [])
      .filter((m) => String(estados.get(m.codigo) || "ACTIVO").toUpperCase() === "ACTIVO")
      .map((m) => ({ ...m, estado_miembro: estados.get(m.codigo) || "ACTIVO" }));

    return NextResponse.json({ ok: true, miembros });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No fue posible cargar los miembros." }, { status: 500 });
  }
}
