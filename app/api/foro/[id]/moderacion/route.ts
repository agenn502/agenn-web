import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function esConsejo(codigo:string) {
  const { data, error } = await supabaseServer.from("users").select("consejo,estado_miembro").eq("codigo",codigo).maybeSingle();
  if (error || !data) return false;
  return data.consejo === true && !["SUSPENDIDO","RETIRADO","EXPULSADO"].includes(String(data.estado_miembro||"").toUpperCase());
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params; const codigo=String(request.headers.get("x-user-codigo")||"").trim().toUpperCase();
    if (!codigo || !(await esConsejo(codigo))) return NextResponse.json({ok:false,error:"Esta acción corresponde al Consejo Académico."},{status:403});
    const body=await request.json();
    if (typeof body.fijado !== "boolean") return NextResponse.json({ok:false,error:"Acción inválida."},{status:400});
    const {data,error}=await supabaseServer.from("foro_temas").update({fijado:body.fijado,updated_at:new Date().toISOString()}).eq("id",id).select("id,fijado").single();
    if(error) throw error; return NextResponse.json({ok:true,tema:data});
  } catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"No fue posible actualizar la discusión."},{status:500});}
}
