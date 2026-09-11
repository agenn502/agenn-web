import { NextRequest, NextResponse } from "next/server";
import { obtenerPermisosBiblioteca } from "@/lib/bibliotecaPermisos";

export async function GET(req: NextRequest) {
  try {
    const permisos = await obtenerPermisosBiblioteca(req);

    if (!permisos) {
      return NextResponse.json(
        { ok: false, error: "Usuario no autorizado." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true, permisos });
  } catch (error) {
    console.error("Error en GET /api/biblioteca/permisos:", error);
    return NextResponse.json(
      { ok: false, error: "No fue posible comprobar los permisos." },
      { status: 500 },
    );
  }
}
