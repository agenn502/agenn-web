"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Plantilla = { id:number; nombre:string; archivo:string; vigente_desde:string; activa:boolean; created_at:string };
type User = { codigo:string; administrador?: boolean | string | number };

export default function PlantillasCertificadosPage() {
  const [plantillas,setPlantillas]=useState<Plantilla[]>([]);
  const [nombre,setNombre]=useState("");
  const [archivo,setArchivo]=useState<File|null>(null);
  const [cargando,setCargando]=useState(true);
  const [procesando,setProcesando]=useState(false);
  const [error,setError]=useState("");
  const [mensaje,setMensaje]=useState("");
  const usuario=():User|null=>{ try { const s=localStorage.getItem("user"); return s?JSON.parse(s):null; } catch { return null; } };

  const cargar=async()=>{
    const u=usuario(); if(!u?.codigo){setError("No fue posible identificar al usuario.");setCargando(false);return;}
    try { const r=await fetch("/api/administracion/plantillas-certificados",{headers:{"x-user-codigo":u.codigo},cache:"no-store"}); const j=await r.json(); if(!r.ok||!j.ok) throw new Error(j.error||"No fue posible cargar las plantillas."); setPlantillas(j.plantillas||[]); }
    catch(e){setError(e instanceof Error?e.message:"No fue posible cargar las plantillas.");} finally{setCargando(false);}
  };
  useEffect(()=>{cargar();},[]);

  const subir=async(e:React.FormEvent)=>{
    e.preventDefault(); const u=usuario(); if(!u?.codigo||!archivo||!nombre.trim()) return;
    setProcesando(true);setError("");setMensaje("");
    try { const fd=new FormData();fd.append("nombre",nombre.trim());fd.append("archivo",archivo); const r=await fetch("/api/administracion/plantillas-certificados",{method:"POST",headers:{"x-user-codigo":u.codigo},body:fd});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"No fue posible guardar la plantilla.");setNombre("");setArchivo(null);setMensaje("Plantilla guardada. Todavía no está activa; puede revisarla y activarla cuando corresponda.");await cargar(); }
    catch(e){setError(e instanceof Error?e.message:"No fue posible guardar la plantilla.");}finally{setProcesando(false);}
  };

  const activar=async(p:Plantilla)=>{
    if(!confirm(`¿Activar “${p.nombre}” para todos los certificados nuevos? Los certificados ya emitidos conservarán su plantilla histórica.`))return;
    const u=usuario();if(!u?.codigo)return;setProcesando(true);setError("");setMensaje("");
    try{const r=await fetch("/api/administracion/plantillas-certificados",{method:"PATCH",headers:{"Content-Type":"application/json","x-user-codigo":u.codigo},body:JSON.stringify({id:p.id})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"No fue posible activar la plantilla.");setMensaje(j.mensaje||"Plantilla activada.");await cargar();}
    catch(e){setError(e instanceof Error?e.message:"No fue posible activar la plantilla.");}finally{setProcesando(false);}
  };

  if(cargando)return <p>Cargando plantillas de certificados...</p>;
  return <section><div style={{maxWidth:1100,margin:"0 auto"}}>
    <Link href="/miembros/administracion" style={{color:"#526b5c"}}>← Volver a Administración</Link>
    <h1 style={{marginBottom:"0.4rem"}}>Plantillas de certificados</h1>
    <p style={{color:"#555",lineHeight:1.65}}>Cada certificado queda vinculado permanentemente a la plantilla vigente al momento de su emisión. Cambiar la plantilla vigente solo afecta certificados nuevos.</p>
    {error&&<div style={{padding:"0.9rem",background:"#fff2f2",border:"1px solid #c98b8b",borderRadius:8,margin:"1rem 0"}}>{error}</div>}
    {mensaje&&<div style={{padding:"0.9rem",background:"#f1f8f3",border:"1px solid #9fc0a6",borderRadius:8,margin:"1rem 0"}}>{mensaje}</div>}

    <form onSubmit={subir} style={{background:"white",border:"1px solid #ddd4c7",borderRadius:12,padding:"1rem",margin:"1.5rem 0"}}>
      <h2 style={{marginTop:0,fontSize:"1.15rem"}}>Agregar nueva plantilla</h2>
      <p style={{fontSize:"0.9rem",color:"#666"}}>Suba la imagen terminada con las firmas correspondientes. Guardarla no la activa automáticamente.</p>
      <div style={{display:"grid",gridTemplateColumns:"minmax(220px,1fr) minmax(260px,1fr) auto",gap:"0.75rem",alignItems:"end"}}>
        <label>Nombre institucional<br/><input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. CA 4 firmas - 2027" required style={{width:"100%",padding:"0.7rem",marginTop:"0.3rem"}}/></label>
        <label>Imagen de plantilla<br/><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setArchivo(e.target.files?.[0]||null)} required style={{width:"100%",padding:"0.55rem",marginTop:"0.3rem"}}/></label>
        <button disabled={procesando} type="submit" style={{padding:"0.75rem 1rem",border:0,borderRadius:8,background:"#526b5c",color:"white",fontWeight:700}}>{procesando?"Guardando...":"Guardar plantilla"}</button>
      </div>
    </form>

    <div style={{display:"grid",gap:"1rem"}}>{plantillas.map(p=><article key={p.id} style={{display:"grid",gridTemplateColumns:"220px 1fr auto",gap:"1rem",alignItems:"center",background:"white",border:p.activa?"2px solid #526b5c":"1px solid #ddd4c7",borderRadius:12,padding:"1rem"}}>
      <img src={p.archivo} alt={p.nombre} style={{width:"100%",maxHeight:150,objectFit:"contain",border:"1px solid #eee"}}/>
      <div><div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap"}}><strong>{p.nombre}</strong>{p.activa&&<span style={{background:"#e5f1e8",color:"#315b3a",padding:"0.2rem 0.55rem",borderRadius:999,fontSize:"0.78rem",fontWeight:700}}>VIGENTE</span>}</div><div style={{fontSize:"0.85rem",color:"#666",marginTop:"0.4rem"}}>Vigente desde: {new Date(p.vigente_desde).toLocaleString("es-GT")}</div><a href={p.archivo} target="_blank" rel="noreferrer" style={{fontSize:"0.85rem",color:"#526b5c"}}>Ver imagen completa</a></div>
      <div>{!p.activa&&<button disabled={procesando} onClick={()=>activar(p)} style={{padding:"0.65rem 0.9rem",border:"1px solid #526b5c",borderRadius:8,background:"white",color:"#526b5c",fontWeight:700}}>Activar plantilla</button>}</div>
    </article>)}</div>
    {plantillas.length===0&&<p>No hay plantillas registradas.</p>}
  </div></section>;
}
