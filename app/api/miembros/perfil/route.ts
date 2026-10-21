import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { validarIdentidadCabecera } from "@/app/api/_seguridadSesion";
import { obtenerSesion } from "@/lib/authSession";

export async function POST(req: NextRequest) {
  const denegado = await validarIdentidadCabecera(req);
  if (denegado) return denegado;
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "Sesión vencida." }, { status: 401 });
  try {
    const body = await req.json();

    const codigo = String(body.codigo || "")
      .trim()
      .toUpperCase();

    if (codigo !== sesion.codigo) {
      return NextResponse.json({ ok: false, error: "No puede modificar otro perfil." }, { status: 403 });
    }

    const nombre = String(body.nombre || "").trim();

    const correo = String(body.correo || "")
      .trim()
      .toLowerCase();

    if (!codigo || !nombre || !correo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan el código, el nombre o el correo electrónico del miembro.",
        },
        { status: 400 }
      );
    }

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!correoValido) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El correo electrónico no tiene un formato válido.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("users")
      .update({
        nombre,
        correo,
      })
      .eq("codigo", codigo)
      .select("codigo,nombre,correo")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: `No se encontró el usuario ${codigo} en la tabla users.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el perfil.",
      },
      { status: 500 }
    );
  }
}