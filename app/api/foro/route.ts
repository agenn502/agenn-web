import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const codigo = (r: NextRequest) => String(r.headers.get("x-user-codigo") || "").trim().toUpperCase();

export async function GET(request: NextRequest) {
  try {
    const q = String(request.nextUrl.searchParams.get("q") || "").trim();
    let query = supabaseServer.from("foro_temas").select("id,titulo,contenido,categoria,autor_codigo,autor_nombre,created_at,updated_at,cerrado,fijado,foro_respuestas(id),foro_imagenes(id,ruta)").order("fijado", { ascending: false }).order("updated_at", { ascending: false }).limit(100);
    if (q) query = query.or(`titulo.ilike.%${q}%,contenido.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, temas: data || [] });
  } catch (e) { return NextResponse.json({ ok:false,error:e instanceof Error?e.message:"No fue posible cargar el foro."},{status:500}); }
}

export async function POST(request: NextRequest) {
  try {
    const autorCodigo=codigo(request); if(!autorCodigo) return NextResponse.json({ok:false,error:"Sesión no válida."},{status:401});
    const body=await request.json(); const titulo=String(body.titulo||"").trim(); const contenido=String(body.contenido||"").trim(); const categoria=String(body.categoria||"General").trim();
    if(titulo.length<8 || contenido.length<20) return NextResponse.json({ok:false,error:"El título o el contenido son demasiado breves."},{status:400});
    const {data:m,error:me}=await supabaseServer.from("miembros").select("nombre").eq("codigo",autorCodigo).maybeSingle(); if(me||!m) return NextResponse.json({ok:false,error:"Miembro no encontrado."},{status:404});
    const {data,error}=await supabaseServer.from("foro_temas").insert({titulo,contenido,categoria,autor_codigo:autorCodigo,autor_nombre:m.nombre}).select("*").single(); if(error) throw error;
    await supabaseServer.from("foro_seguimientos").upsert({tema_id:data.id,codigo_miembro:autorCodigo});
    return NextResponse.json({ok:true,tema:data});
  } catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"No fue posible crear la discusión."},{status:500});}
}
