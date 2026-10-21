
import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/authSession";

export async function POST() {
  try {
    await cerrarSesion();

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cerrar la sesión",
      },
      { status: 500 }
    );
  }
}
