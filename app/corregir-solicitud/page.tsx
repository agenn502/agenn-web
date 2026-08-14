"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PERFILES: Record<string, string> = {
  A: "Comerciante profesional", A2: "Comerciante con orientación académica",
  B: "Operador comercial no ético de alto conocimiento", B2: "Operador de doble rol académico-comercial no ético",
  C: "Comerciante en formación", D: "Vendedor no especializado", E: "Numismático especializado",
  F: "Investigador de enfoque amplio", G: "Coleccionista orientado a la calidad",
  H: "Coleccionista orientado a la completitud", I: "Coleccionista en desarrollo", J: "Acumulador no sistemático",
};
const INTERESES = ["Monedas","Billetes","Monedas y billetes","Medallas","Fichas","Condecoraciones","Historia monetaria","Otro"];
const NIVELES = ["Educación primaria","Educación media","Diversificado","Estudiante universitario","Técnico universitario","Licenciatura","Maestría","Doctorado","Otro"];
const FOTO_MAX_BYTES = 100 * 1024;

async function comprimirFotografia(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error("No fue posible leer la imagen.")); r.readAsDataURL(file); });
  const imagen = await new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error("No fue posible procesar la imagen.")); i.src = dataUrl; });
  let ancho = imagen.width, alto = imagen.height; const escala = Math.min(1, 900 / Math.max(ancho, alto)); ancho = Math.round(ancho * escala); alto = Math.round(alto * escala);
  const convertir = (calidad: number) => new Promise<Blob>((resolve, reject) => { const c = document.createElement("canvas"); c.width = ancho; c.height = alto; const x = c.getContext("2d"); if (!x) return reject(new Error("No fue posible preparar la fotografía.")); x.fillStyle = "#fff"; x.fillRect(0,0,ancho,alto); x.drawImage(imagen,0,0,ancho,alto); c.toBlob((b) => b ? resolve(b) : reject(new Error("No fue posible procesar la fotografía.")), "image/jpeg", calidad); });
  let calidad = .82, blob = await convertir(calidad); while (blob.size > FOTO_MAX_BYTES && calidad > .4) { calidad -= .08; blob = await convertir(calidad); }
  if (blob.size > FOTO_MAX_BYTES) throw new Error("No fue posible procesar la fotografía seleccionada. Intente con otra imagen.");
  return new File([blob], "fotografia.jpg", { type: "image/jpeg" });
}

function CorregirSolicitudContenido() {
  const params = useSearchParams(); const router = useRouter(); const token = params.get("token") || "";
  const [datos, setDatos] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [enviando, setEnviando] = useState(false);
  const [foto, setFoto] = useState<File | null>(null); const [fotoPreview, setFotoPreview] = useState<string | null>(null); const [intereses, setIntereses] = useState<string[]>([]);

  useEffect(() => { (async () => { try { const r = await fetch(`/api/candidatos/correccion?token=${encodeURIComponent(token)}`, { cache: "no-store" }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error); setDatos(j.candidato); setIntereses(j.candidato.intereses || []); setFotoPreview(j.candidato.foto_firmada || null); } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar la solicitud."); } finally { setLoading(false); } })(); }, [token]);
  const campo = { width: "100%", padding: ".8rem", border: "1px solid #cfc5b7", borderRadius: 8, marginTop: ".35rem" } as const;
  const bloque = { background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1.25rem", marginTop: "1.25rem" } as const;
  const set = (campo: string, valor: any) => setDatos((d: any) => ({ ...d, [campo]: valor }));

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setEnviando(true); setError("");
    try { const fd = new FormData(e.currentTarget); fd.set("token", token); fd.set("perfil_nombre", PERFILES[datos.perfil_codigo]); fd.set("intereses", JSON.stringify(intereses)); fd.set("posee_coleccion", String(datos.posee_coleccion)); fd.set("participa_comunidad", String(datos.participa_comunidad)); if (foto) fd.set("fotografia", foto); else fd.delete("fotografia");
      const r = await fetch("/api/candidatos/correccion", { method: "POST", body: fd }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error); router.push(`/solicitud-recibida?codigo=${encodeURIComponent(j.codigo)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible reenviar la solicitud."); setEnviando(false); }
  };

  if (loading) return <section className="section"><div className="container">Cargando expediente...</div></section>;
  if (error && !datos) return <section className="section"><div className="container"><h1>No fue posible abrir la solicitud</h1><p style={{color:"#8b2f2f"}}>{error}</p></div></section>;

  return <section className="section"><div className="container content-page" style={{maxWidth:980}}><h1>Corrección de solicitud {datos.codigo}</h1>
    <div style={{...bloque,background:"#fff8e5"}}><strong>Observaciones del Consejo Académico</strong><p style={{whiteSpace:"pre-wrap"}}>{datos.observaciones_candidato}</p></div>
    <form onSubmit={enviar}>
      <div style={bloque}><h2>Perfil y datos personales</h2><label>Perfil<select name="perfil_codigo" value={datos.perfil_codigo} onChange={e=>set("perfil_codigo",e.target.value)} style={campo}>{Object.entries(PERFILES).map(([c,n])=><option key={c} value={c}>Perfil {c} — {n}</option>)}</select></label>
      <div style={{display:"grid",gap:"1rem",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",marginTop:"1rem"}}>
      {[['nombres','Nombres'],['apellidos','Apellidos'],['fecha_nacimiento','Fecha de nacimiento'],['correo','Correo electrónico'],['telefono','Teléfono o WhatsApp'],['profesion_oficio','Profesión u oficio'],['institucion_trabajo','Institución o trabajo'],['departamento','Departamento'],['municipio','Municipio'],['comunidad','Comunidad, zona o barrio']].map(([k,l])=><label key={k}>{l}<input type={k==='fecha_nacimiento'?'date':k==='correo'?'email':'text'} name={k} value={datos[k] || ''} onChange={e=>set(k,e.target.value)} required={['nombres','apellidos','fecha_nacimiento','correo','profesion_oficio','departamento','municipio'].includes(k)} style={campo}/></label>)}
      <label>Nivel académico<select name="nivel_academico" value={datos.nivel_academico || ''} onChange={e=>set('nivel_academico',e.target.value)} required style={campo}>{NIVELES.map(n=><option key={n}>{n}</option>)}</select></label></div>
      <label style={{display:"block",marginTop:"1rem"}}>Reemplazar fotografía (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" style={campo} onChange={async e=>{const f=e.target.files?.[0]; if(!f)return; try{const c=await comprimirFotografia(f); setFoto(c); setFotoPreview(URL.createObjectURL(c));}catch(err){setError(err instanceof Error?err.message:"No fue posible procesar la fotografía.");}}}/></label>{fotoPreview&&<img src={fotoPreview} alt="Fotografía" style={{width:150,height:150,objectFit:"cover",borderRadius:10,marginTop:"1rem"}}/>}</div>
      <div style={bloque}><h2>Experiencia e intereses</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:".5rem"}}>{INTERESES.map(i=><label key={i}><input type="checkbox" checked={intereses.includes(i)} onChange={()=>setIntereses(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}/> {i}</label>)}</div>
      <div style={{display:"grid",gap:"1rem",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",marginTop:"1rem"}}><label>Otro interés<input name="interes_otro" value={datos.interes_otro||''} onChange={e=>set('interes_otro',e.target.value)} style={campo}/></label><label>Años de experiencia<input type="number" min="0" name="experiencia_anios" value={datos.experiencia_anios??''} onChange={e=>set('experiencia_anios',e.target.value)} style={campo}/></label><label>¿Posee colección?<select value={String(datos.posee_coleccion)} onChange={e=>set('posee_coleccion',e.target.value==='true')} style={campo}><option value="true">Sí</option><option value="false">No</option></select></label><label>¿Participa en comunidad?<select value={String(datos.participa_comunidad)} onChange={e=>set('participa_comunidad',e.target.value==='true')} style={campo}><option value="true">Sí</option><option value="false">No</option></select></label></div>
      {[['comunidad_numismatica','Asociación, grupo o comunidad'],['areas_interes','Áreas o piezas de interés'],['como_conocio_agenn','¿Cómo conoció la AGENN?'],['motivacion','¿Por qué desea ingresar?'],['expectativas_aprendizaje','¿Qué espera aprender?']].map(([k,l])=><label key={k} style={{display:"block",marginTop:"1rem"}}>{l}<textarea name={k} value={datos[k]||''} onChange={e=>set(k,e.target.value)} required={['como_conocio_agenn','motivacion'].includes(k)} rows={k==='motivacion'?6:4} style={campo}/></label>)}</div>
      {error&&<p style={{color:"#8b2f2f",fontWeight:700}}>{error}</p>}<button className="button primary" disabled={enviando} style={{marginTop:"1.5rem"}}>{enviando?"Reenviando...":"Reenviar solicitud corregida"}</button>
    </form></div></section>;
}
export default function CorregirSolicitudPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div
            className="container content-page"
            style={{ maxWidth: "980px" }}
          >
            <p>Cargando solicitud...</p>
          </div>
        </section>
      }
    >
      <CorregirSolicitudContenido />
    </Suspense>
  );
}