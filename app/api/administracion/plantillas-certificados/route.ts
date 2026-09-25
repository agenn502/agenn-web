import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function validarAdministrador(req: NextRequest) {
  const codigo = (req.headers.get("x-user-codigo") || "").trim().toUpperCase();
  if (!codigo) return false;
  const { data, error } = await supabaseServer
    .from("users")
    .select("administrador,estado_miembro")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error || !data) return false;
  const administrador = data.administrador === true || data.administrador === "true" || data.administrador === "TRUE" || data.administrador === 1;
  return administrador && String(data.estado_miembro || "").trim().toUpperCase() === "ACTIVO";
}

export async function GET(req: NextRequest) {
  if (!(await validarAdministrador(req))) return NextResponse.json({ ok:false, error:"Acceso no autorizado." }, { status:403 });
  const { data, error } = await supabaseServer
    .from("certificado_plantillas")
    .select("id,nombre,archivo,vigente_desde,activa,created_at")
    .order("created_at", { ascending:false });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, plantillas:data || [] });
}

export async function POST(req: NextRequest) {
  if (!(await validarAdministrador(req))) return NextResponse.json({ ok:false, error:"Acceso no autorizado." }, { status:403 });
  try {
    const form = await req.formData();
    const nombre = String(form.get("nombre") || "").trim();
    const archivo = form.get("archivo");
    if (!nombre) return NextResponse.json({ ok:false, error:"Debe indicar un nombre para la plantilla." }, { status:400 });
    if (!(archivo instanceof File) || archivo.size === 0) return NextResponse.json({ ok:false, error:"Debe seleccionar una imagen." }, { status:400 });
    const permitidos = ["image/png","image/jpeg","image/webp"];
    if (!permitidos.includes(archivo.type)) return NextResponse.json({ ok:false, error:"La plantilla debe ser PNG, JPG o WEBP." }, { status:400 });
    if (archivo.size > 8 * 1024 * 1024) return NextResponse.json({ ok:false, error:"La imagen no puede exceder 8 MB." }, { status:400 });

    const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const seguro = nombre.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "plantilla";
    const storagePath = `certificados/plantillas/${Date.now()}-${seguro}.${ext}`;
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const { error: uploadError } = await supabaseServer.storage.from("ensayos").upload(storagePath, buffer, { contentType:archivo.type, upsert:false, cacheControl:"31536000" });
    if (uploadError) throw new Error(uploadError.message);
    const { data: publicData } = supabaseServer.storage.from("ensayos").getPublicUrl(storagePath);
    const url = publicData.publicUrl;

    const { data, error } = await supabaseServer
      .from("certificado_plantillas")
      .insert({ nombre, archivo:url, activa:false })
      .select("id,nombre,archivo,vigente_desde,activa,created_at")
      .single();
    if (error) {
      await supabaseServer.storage.from("ensayos").remove([storagePath]);
      throw new Error(error.message);
    }
    return NextResponse.json({ ok:true, plantilla:data });
  } catch (err) {
    return NextResponse.json({ ok:false, error:err instanceof Error ? err.message : "No fue posible guardar la plantilla." }, { status:500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await validarAdministrador(req))) return NextResponse.json({ ok:false, error:"Acceso no autorizado." }, { status:403 });
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!Number.isFinite(id)) return NextResponse.json({ ok:false, error:"Plantilla inválida." }, { status:400 });
    const { data: objetivo, error: objetivoError } = await supabaseServer.from("certificado_plantillas").select("id,nombre,activa").eq("id",id).maybeSingle();
    if (objetivoError || !objetivo) return NextResponse.json({ ok:false, error:"No se encontró la plantilla." }, { status:404 });
    if (objetivo.activa) return NextResponse.json({ ok:true, mensaje:"La plantilla ya está activa." });

    const { error: desactivarError } = await supabaseServer.from("certificado_plantillas").update({ activa:false }).eq("activa",true);
    if (desactivarError) throw new Error(desactivarError.message);
    const { error: activarError } = await supabaseServer.from("certificado_plantillas").update({ activa:true, vigente_desde:new Date().toISOString() }).eq("id",id);
    if (activarError) throw new Error(activarError.message);
    return NextResponse.json({ ok:true, mensaje:`${objetivo.nombre} es ahora la plantilla vigente.` });
  } catch (err) {
    return NextResponse.json({ ok:false, error:err instanceof Error ? err.message : "No fue posible activar la plantilla." }, { status:500 });
  }
}
