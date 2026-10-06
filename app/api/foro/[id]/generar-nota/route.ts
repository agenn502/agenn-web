import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Resultado = { borrador:any; proveedor:string; modelo:string };
const AUTOR = "Consejo Editorial de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos";
function slugificar(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)}
async function miembroCA(codigo:string){
  const {data:u}=await supabaseServer.from("users").select("consejo,estado_miembro").eq("codigo",codigo).maybeSingle();
  if(!u || u.consejo!==true || ["SUSPENDIDO","RETIRADO","EXPULSADO"].includes(String(u.estado_miembro||"").toUpperCase())) return null;
  const {data:m}=await supabaseServer.from("miembros").select("id,codigo,nombre,nivel").eq("codigo",codigo).maybeSingle(); return m;
}
function promptForo(tema:any,respuestas:any[],temas:any[]){
  const catalogo=temas.map(t=>`${t.id}: ${t.nombre}`).join("\n");
  const hilo=[`TÍTULO: ${tema.titulo}`,`CATEGORÍA: ${tema.categoria}`,`PLANTEAMIENTO DE ${tema.autor_nombre}:\n${tema.contenido}`,...respuestas.map((r,i)=>`INTERVENCIÓN ${i+1} — ${r.autor_nombre}:\n${r.contenido}`)].join("\n\n");
  return `Usted prepara un PRIMER BORRADOR de Nota breve para Revista AGENN a partir de una discusión interna del Foro AGENN.\n\nREGLAS OBLIGATORIAS:\n- Use EXCLUSIVAMENTE la información contenida en el hilo. No investigue, complete ni introduzca datos externos.\n- No convierta hipótesis en hechos. Distinga evidencia aportada, interpretaciones, discrepancias y preguntas abiertas.\n- No mencione como autores de la Nota a los participantes del foro ni atribuya la autoría a quien solicitó el borrador.\n- La autoría institucional será gestionada por el sistema como Consejo Editorial; no la escriba dentro del cuerpo.\n- Puede indicar de forma sobria que la nota se originó en una discusión del Foro AGENN, sin enumerar participantes.\n- Redacte un texto narrativo, claro y prudente, apto para que un editor humano lo revise y modifique.\n- No invente bibliografía. Si el hilo menciona fuentes identificables, puede mencionarlas en el cuerpo tal como aparecen, pero no fabrique referencias incompletas.\n- Elija el tema editorial más apropiado EXCLUSIVAMENTE entre el catálogo proporcionado.\n\nCATÁLOGO DE TEMAS:\n${catalogo}\n\nHILO:\n${hilo}\n\nDevuelva exclusivamente JSON con: titulo (string), contenido (string), tema_id (integer), nota_editorial (string breve sobre incertidumbres o aspectos que el editor debe revisar).`;
}
async function gemini(prompt:string):Promise<Resultado>{
  const key=process.env.GEMINI_API_KEY; const modelo=process.env.GEMINI_MODEL||"gemini-3.6-flash"; if(!key) throw new Error("GEMINI_NO_CONFIGURADO");
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:modelo,input:prompt,response_format:{type:"text",mime_type:"application/json"}}),cache:"no-store"});
  const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(`GEMINI_${r.status}`);
  const texto=d?.outputs?.map((x:any)=>x?.text||x?.content?.text||"").join("")||d?.output?.text||d?.text||""; if(!texto) throw new Error("GEMINI_SIN_CONTENIDO");
  return {borrador:JSON.parse(texto.replace(/^```json\s*|\s*```$/g,"")),proveedor:"gemini",modelo};
}
async function groq(prompt:string):Promise<Resultado>{
  const key=process.env.GROQ_API_KEY; const modelo=process.env.GROQ_MODEL||"openai/gpt-oss-120b"; if(!key) throw new Error("GROQ_NO_CONFIGURADO");
  const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:modelo,messages:[{role:"system",content:"Redacte el borrador editorial solicitado y devuelva exclusivamente JSON válido."},{role:"user",content:prompt}],response_format:{type:"json_object"}}),cache:"no-store"});
  const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(`GROQ_${r.status}`); const t=d?.choices?.[0]?.message?.content; if(!t) throw new Error("GROQ_SIN_CONTENIDO"); return {borrador:JSON.parse(t),proveedor:"groq",modelo};
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params; const codigo=String(request.headers.get("x-user-codigo")||"").trim().toUpperCase(); const miembro=await miembroCA(codigo);
    if(!miembro) return NextResponse.json({ok:false,error:"Solo el Consejo Académico puede solicitar un borrador editorial a partir de una discusión."},{status:403});
    const [{data:tema,error:te},{data:respuestas,error:re},{data:temas,error:ca}]=await Promise.all([
      supabaseServer.from("foro_temas").select("id,titulo,contenido,categoria,autor_nombre").eq("id",id).single(),
      supabaseServer.from("foro_respuestas").select("id,autor_nombre,contenido,created_at").eq("tema_id",id).order("created_at",{ascending:true}),
      supabaseServer.from("revista_temas").select("id,nombre").eq("activo",true).order("orden",{ascending:true})]);
    if(te||!tema) return NextResponse.json({ok:false,error:"No se encontró la discusión."},{status:404}); if(re) throw re; if(ca||!temas?.length) throw ca||new Error("No hay temas editoriales activos.");
    const prompt=promptForo(tema,respuestas||[],temas); let resultado:Resultado;
    try{resultado=await gemini(prompt)}catch{try{resultado=await groq(prompt)}catch{return NextResponse.json({ok:false,error:"La generación del borrador no está disponible temporalmente. Inténtelo nuevamente en unos minutos."},{status:503})}}
    const titulo=String(resultado.borrador?.titulo||"").trim(); const contenido=String(resultado.borrador?.contenido||"").trim(); const temaId=Number(resultado.borrador?.tema_id);
    const temaEditorial=temas.find((t:any)=>Number(t.id)===temaId); if(titulo.length<10||!contenido||!temaEditorial) return NextResponse.json({ok:false,error:"El borrador generado no reunió la estructura necesaria. Inténtelo nuevamente."},{status:502});
    const solicitudId=randomUUID(); const codigoVerificacion=randomUUID().toUpperCase(); const slug=`${slugificar(titulo)||"nota-breve"}-${Date.now().toString(36)}`;
    const {data:ensayo,error:ee}=await supabaseServer.from("ensayos").insert({solicitud_id:solicitudId,titulo,slug,autor_nombre:AUTOR,autor_codigo:miembro.codigo,nivel:miembro.nivel,proceso:"REVISTA",unidad_slug:"revista",contenido,codigo_verificacion:codigoVerificacion,estado:"borrador",tema:temaEditorial.nombre,tema_id:temaId,evidencia_validada:false,seleccionado_revista:false,origen_ensayo:"REVISTA",autor_miembro_id:miembro.id}).select("id").single(); if(ee) throw ee;
    const {data:manuscrito,error:me}=await supabaseServer.from("manuscritos_editoriales").insert({solicitud_id:solicitudId,ensayo_id:ensayo.id,autor_miembro_id:miembro.id,origen:"PROPUESTA_AUTOR",tipo_contenido:"NOTA_BREVE",flujo_editorial:"COMPLETO",tipo_autoria:"CONSEJO_EDITORIAL",autor_corporativo:AUTOR,mostrar_referencia:true,edicion_ce_permitida:false,estado:"BORRADOR",titulo_actual:titulo,contenido_actual:contenido,tema:temaEditorial.nombre,tema_id:temaId}).select("id").single(); if(me){await supabaseServer.from("ensayos").delete().eq("id",ensayo.id);throw me;}
    const {error:de}=await supabaseServer.from("foro_derivaciones_editoriales").insert({tema_id:id,manuscrito_id:manuscrito.id,solicitante_miembro_id:miembro.id,solicitante_codigo:miembro.codigo,proveedor_ia:resultado.proveedor,modelo_ia:resultado.modelo,nota_editorial:String(resultado.borrador?.nota_editorial||"").trim()||null}); if(de) throw de;
    return NextResponse.json({ok:true,manuscrito_id:manuscrito.id,titulo,nota_editorial:resultado.borrador?.nota_editorial||null});
  }catch(e){console.error("Error generando Nota breve desde Foro:",e);return NextResponse.json({ok:false,error:e instanceof Error?e.message:"No fue posible generar el borrador."},{status:500});}
}
