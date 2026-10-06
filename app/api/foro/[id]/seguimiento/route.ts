import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const codigo = (r: NextRequest) => String(r.headers.get("x-user-codigo") || "").trim().toUpperCase();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const c = codigo(request);
    if (!c) return NextResponse.json({ ok:false,error:"Sesión no válida." },{status:401});
    const body = await request.json().catch(() => ({}));
    if (body.seguir === false) {
      const { error } = await supabaseServer.from("foro_seguimientos").delete().eq("tema_id",id).eq("codigo_miembro",c);
      if (error) throw error;
      return NextResponse.json({ok:true,siguiendo:false});
    }
    const { error } = await supabaseServer.from("foro_seguimientos").upsert({tema_id:id,codigo_miembro:c},{onConflict:"tema_id,codigo_miembro"});
    if (error) throw error;
    return NextResponse.json({ok:true,siguiendo:true});
  } catch(e) { return NextResponse.json({ok:false,error:e instanceof Error?e.message:"No fue posible actualizar el seguimiento."},{status:500}); }
}
