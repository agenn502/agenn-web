import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { obtenerPermisosBiblioteca } from "@/lib/bibliotecaPermisos";

export async function GET(req: NextRequest) {
  try {
    const permisos = await obtenerPermisosBiblioteca(req);
    if (!permisos?.puedeDesignar) {
      return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    }

    const [miembrosResultado, gestoresResultado] = await Promise.all([
      supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nivel")
        .order("nombre", { ascending: true }),
      supabaseServer
        .from("biblioteca_gestores")
        .select("id,miembro_id,fecha_inicio")
        .eq("activo", true)
        .order("fecha_inicio", { ascending: true }),
    ]);

    if (miembrosResultado.error) throw new Error(miembrosResultado.error.message);
    if (gestoresResultado.error) throw new Error(gestoresResultado.error.message);

    const miembros = miembrosResultado.data || [];
    const gestores = (gestoresResultado.data || []).map((gestor) => ({
      ...gestor,
      miembro: miembros.find((miembro) => Number(miembro.id) === Number(gestor.miembro_id)) || null,
    }));

    return NextResponse.json({ ok: true, miembros, gestores });
  } catch (error) {
    console.error("Error en GET /api/biblioteca/gestores:", error);
    return NextResponse.json({ ok: false, error: "No fue posible cargar responsables." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const permisos = await obtenerPermisosBiblioteca(req);
    if (!permisos?.puedeDesignar) {
      return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    }

    const body = await req.json();
    const miembroId = Number(body.miembro_id);
    if (!Number.isInteger(miembroId) || miembroId <= 0) {
      return NextResponse.json({ ok: false, error: "Seleccione un miembro válido." }, { status: 400 });
    }

    const { data: existente, error: existenteError } = await supabaseServer
      .from("biblioteca_gestores")
      .select("id")
      .eq("miembro_id", miembroId)
      .eq("activo", true)
      .maybeSingle();
    if (existenteError) throw new Error(existenteError.message);
    if (existente) {
      return NextResponse.json({ ok: false, error: "Ese miembro ya es gestor." }, { status: 409 });
    }

    const { error } = await supabaseServer.from("biblioteca_gestores").insert({
      miembro_id: miembroId,
      designado_por_miembro_id: permisos.miembroId,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, message: "Responsable designado." });
  } catch (error) {
    console.error("Error en POST /api/biblioteca/gestores:", error);
    return NextResponse.json({ ok: false, error: "No fue posible designar al responsable." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const permisos = await obtenerPermisosBiblioteca(req);
    if (!permisos?.puedeDesignar) {
      return NextResponse.json({ ok: false, error: "Acceso no autorizado." }, { status: 403 });
    }

    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "Designación no válida." }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("biblioteca_gestores")
      .update({ activo: false, fecha_fin: new Date().toISOString() })
      .eq("id", id)
      .eq("activo", true);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, message: "Responsabilidad finalizada." });
  } catch (error) {
    console.error("Error en DELETE /api/biblioteca/gestores:", error);
    return NextResponse.json({ ok: false, error: "No fue posible retirar al responsable." }, { status: 500 });
  }
}