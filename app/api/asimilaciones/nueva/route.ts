import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Modalidad = "NOV" | "INV_FORMACION" | "INV_ACREDITADO" | "NUM";

function nivelEsperado(modalidad: Modalidad) {
  if (modalidad === "NOV") return "NOV";
  if (modalidad === "NUM") return "NUM";
  return "INV";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tipoPropuesta = String(body.tipoPropuesta || "INCORPORACION").trim().toUpperCase();
    const modalidad = String(body.modalidadIncorporacion || "").trim().toUpperCase() as Modalidad;
    const justificacion = String(body.justificacion || "").trim();
    const proponenteCodigo = String(body.proponenteCodigo || "").trim().toUpperCase();
    const miembroCodigo = body.miembroCodigo ? String(body.miembroCodigo).trim().toUpperCase() : null;

    if (!justificacion || !proponenteCodigo || !["INCORPORACION", "PROMOCION_EXTRAORDINARIA"].includes(tipoPropuesta)) {
      return NextResponse.json({ ok: false, error: "Faltan datos obligatorios." }, { status: 400 });
    }
    if (!["NOV", "INV_FORMACION", "INV_ACREDITADO", "NUM"].includes(modalidad)) {
      return NextResponse.json({ ok: false, error: "La modalidad indicada no es válida." }, { status: 400 });
    }
    if (tipoPropuesta === "PROMOCION_EXTRAORDINARIA" && modalidad === "INV_FORMACION") {
      return NextResponse.json({ ok: false, error: "La Promoción extraordinaria no utiliza la modalidad INV en formación." }, { status: 400 });
    }

    const { data: proponente, error: proponenteError } = await supabaseServer
      .from("users").select("codigo,consejo,estado_miembro").eq("codigo", proponenteCodigo).maybeSingle();
    if (proponenteError || !proponente) return NextResponse.json({ ok: false, error: "No fue posible identificar al miembro proponente." }, { status: 404 });
    const esConsejo = proponente.consejo === true || proponente.consejo === "true" || proponente.consejo === "TRUE" || proponente.consejo === 1;
    if (!esConsejo || String(proponente.estado_miembro || "").toUpperCase() !== "ACTIVO") {
      return NextResponse.json({ ok: false, error: "Esta acción es exclusiva del Consejo Académico activo." }, { status: 403 });
    }

    const nivel = nivelEsperado(modalidad);
    if (String(body.nivelPropuesto || "").toUpperCase() !== nivel) {
      return NextResponse.json({ ok: false, error: "El nivel propuesto no coincide con la modalidad seleccionada." }, { status: 400 });
    }

    if (tipoPropuesta === "PROMOCION_EXTRAORDINARIA") {
      if (!miembroCodigo) return NextResponse.json({ ok: false, error: "Debe seleccionar al miembro que será promovido." }, { status: 400 });
      const { data: miembro, error: miembroError } = await supabaseServer
        .from("miembros").select("codigo,nombre,nivel,estado_academico,correo").eq("codigo", miembroCodigo).maybeSingle();
      if (miembroError || !miembro) return NextResponse.json({ ok: false, error: "No se encontró al miembro seleccionado." }, { status: 404 });

      const rango: Record<string, number> = { ASP: 0, NOV: 1, INV: 2, NUM: 3 };
      const mismoInvSinAcreditar = miembro.nivel === "INV" && modalidad === "INV_ACREDITADO" && String(miembro.estado_academico || "") !== "ACREDITADO";
      if (!mismoInvSinAcreditar && (rango[nivel] ?? -1) <= (rango[String(miembro.nivel || "").toUpperCase()] ?? -1)) {
        return NextResponse.json({ ok: false, error: "La Promoción extraordinaria debe conducir a una situación académica superior a la actual." }, { status: 409 });
      }

      const { error } = await supabaseServer.from("asimilaciones").insert({
        tipo_propuesta: "PROMOCION_EXTRAORDINARIA", miembro_codigo: miembro.codigo,
        nombre: miembro.nombre, sexo: null, correo: miembro.correo || null, telefono: null,
        nivel_propuesto: nivel, modalidad_incorporacion: modalidad,
        justificacion, proponente_codigo: proponenteCodigo,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mensaje: "La propuesta de Promoción extraordinaria fue registrada correctamente." });
    }

    const nombre = String(body.nombre || "").trim();
    const sexo = String(body.sexo || "").trim().toUpperCase();
    if (!nombre || !["M", "F"].includes(sexo)) return NextResponse.json({ ok: false, error: "Debe indicar nombre y sexo de la persona propuesta." }, { status: 400 });

    const { error } = await supabaseServer.from("asimilaciones").insert({
      tipo_propuesta: "INCORPORACION", miembro_codigo: null, nombre, sexo,
      correo: body.correo ? String(body.correo).trim().toLowerCase() : null,
      telefono: body.telefono ? String(body.telefono).trim() : null,
      nivel_propuesto: nivel, modalidad_incorporacion: modalidad,
      justificacion, proponente_codigo: proponenteCodigo,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, mensaje: "La propuesta de incorporación fue registrada correctamente." });
  } catch (error) {
    console.error("Error en /api/asimilaciones/nueva:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error inesperado." }, { status: 500 });
  }
}
