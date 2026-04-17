import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ppjgsiwjwugspgwqljsb.supabase.co";
const supabaseKey = "sb_publishable_GdfOoWUpdQVbHth-qboRsg_q6cVN8D2";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const codigo = String(body?.codigo || "").trim().toUpperCase();
    const password = String(body?.password || "").trim();

    if (!codigo || !password) {
      return NextResponse.json(
        { ok: false, error: "Ingresa tu código y contraseña" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      console.error("Error consultando users:", error);
      return NextResponse.json(
        { ok: false, error: "No se pudo consultar usuarios" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "No existe un usuario con ese código" },
        { status: 401 }
      );
    }

    const passwordGuardada = String(data.password || "").trim();

    if (passwordGuardada !== password) {
      return NextResponse.json(
        { ok: false, error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    const valorConsejo = data.consejo ?? data.Consejo ?? false;

    const userToStore = {
      codigo: String(data.codigo || "").trim().toUpperCase(),
      nivel: String(data.nivel || "").trim().toUpperCase(),
      nombre: String(data.nombre || "").trim(),
      consejo:
        valorConsejo === true ||
        valorConsejo === "true" ||
        valorConsejo === "TRUE" ||
        valorConsejo === 1,
    };

    return NextResponse.json({
      ok: true,
      user: userToStore,
    });
  } catch (err) {
    console.error("Error inesperado en /api/login:", err);

    return NextResponse.json(
      { ok: false, error: "Ocurrió un error inesperado al iniciar sesión" },
      { status: 500 }
    );
  }
}