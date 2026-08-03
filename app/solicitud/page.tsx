"use client";

import { Suspense, FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEPARTAMENTOS,
  MUNICIPIOS_POR_DEPARTAMENTO,
} from "@/content/catalogos/municipiosGuatemala";

const PERFILES: Record<string, string> = {
  A: "Comerciante profesional",
  A2: "Comerciante con orientación académica",
  B: "Operador comercial no ético de alto conocimiento",
  B2: "Operador de doble rol académico-comercial no ético",
  C: "Comerciante en formación",
  D: "Vendedor no especializado",
  E: "Numismático especializado",
  F: "Investigador de enfoque amplio",
  G: "Coleccionista orientado a la calidad",
  H: "Coleccionista orientado a la completitud",
  I: "Coleccionista en desarrollo",
  J: "Acumulador no sistemático",
};

const FOTO_MAX_BYTES = 100 * 1024;

async function comprimirFotografia(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No fue posible leer la imagen."));
    reader.readAsDataURL(file);
  });

  const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("El formato de la imagen no pudo procesarse."));
    img.src = dataUrl;
  });

  let ancho = imagen.width;
  let alto = imagen.height;
  const ladoMaximo = 900;

  if (ancho > ladoMaximo || alto > ladoMaximo) {
    const escala = Math.min(ladoMaximo / ancho, ladoMaximo / alto);
    ancho = Math.round(ancho * escala);
    alto = Math.round(alto * escala);
  }

  const convertir = (width: number, height: number, calidad: number) =>
    new Promise<Blob>((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const contexto = canvas.getContext("2d");
      if (!contexto) {
        reject(new Error("No fue posible preparar la fotografía."));
        return;
      }

      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, width, height);
      contexto.drawImage(imagen, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No fue posible procesar la fotografía."));
        },
        "image/jpeg",
        calidad
      );
    });

  let calidad = 0.82;
  let blob = await convertir(ancho, alto, calidad);

  while (blob.size > FOTO_MAX_BYTES && calidad > 0.42) {
    calidad -= 0.08;
    blob = await convertir(ancho, alto, calidad);
  }

  while (blob.size > FOTO_MAX_BYTES && ancho > 360 && alto > 360) {
    ancho = Math.round(ancho * 0.85);
    alto = Math.round(alto * 0.85);
    blob = await convertir(ancho, alto, 0.55);
  }

  if (blob.size > FOTO_MAX_BYTES) {
    throw new Error(
      "No fue posible procesar la fotografía seleccionada. Intente con otra imagen."
    );
  }

  const nombreBase = file.name.replace(/\.[^/.]+$/, "");
  return new File([blob], `${nombreBase}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

const INTERESES = [
  "Monedas",
  "Billetes",
  "Monedas y billetes",
  "Medallas",
  "Fichas",
  "Condecoraciones",
  "Historia monetaria",
  "Otro",
];

const NIVELES_ACADEMICOS = [
  "Educación primaria",
  "Educación media",
  "Diversificado",
  "Estudiante universitario",
  "Técnico universitario",
  "Licenciatura",
  "Maestría",
  "Doctorado",
  "Otro",
];

function SolicitudContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [perfil, setPerfil] = useState("");
  const [intereses, setIntereses] = useState<string[]>([]);
  const [poseeColeccion, setPoseeColeccion] = useState("");
  const [participaComunidad, setParticipaComunidad] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [fotografiaComprimida, setFotografiaComprimida] =
    useState<File | null>(null);
  const [estadoFotografia, setEstadoFotografia] = useState("");
  const [vistaPreviaFotografia, setVistaPreviaFotografia] = useState("");

  useEffect(() => {
    const perfilQuery = (searchParams.get("perfil") || "").toUpperCase();

    if (PERFILES[perfilQuery]) {
      setPerfil(perfilQuery);
      return;
    }

    const guardado = sessionStorage.getItem("agenn_perfil_resultado");

    if (!guardado) return;

    try {
      const resultado = JSON.parse(guardado);
      const codigo = String(resultado?.codigo || "").toUpperCase();
      if (PERFILES[codigo]) setPerfil(codigo);
    } catch {
      sessionStorage.removeItem("agenn_perfil_resultado");
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (vistaPreviaFotografia) {
        URL.revokeObjectURL(vistaPreviaFotografia);
      }
    };
  }, [vistaPreviaFotografia]);

  const alternarInteres = (interes: string) => {
    setIntereses((actuales) =>
      actuales.includes(interes)
        ? actuales.filter((item) => item !== interes)
        : [...actuales, interes]
    );
  };

  const enviarSolicitud = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!perfil || !PERFILES[perfil]) {
      setError("Debe identificar o seleccionar su perfil numismático.");
      return;
    }

    if (intereses.length === 0) {
      setError("Seleccione al menos un interés numismático o notafílico.");
      return;
    }

    setEnviando(true);

    try {
      if (!fotografiaComprimida) {
        throw new Error("Debe seleccionar una fotografía válida.");
      }

      const formData = new FormData(event.currentTarget);
      formData.delete("fotografia");
      formData.append("fotografia", fotografiaComprimida);
      formData.set("perfil_codigo", perfil);
      formData.set("perfil_nombre", PERFILES[perfil]);
      formData.set("pais", "Guatemala");
      formData.set("intereses", JSON.stringify(intereses));
      formData.set("posee_coleccion", poseeColeccion);
      formData.set("participa_comunidad", participaComunidad);

      const response = await fetch("/api/candidatos", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No fue posible enviar la solicitud.");
      }

      sessionStorage.removeItem("agenn_perfil_resultado");
      router.push(
        `/solicitud-recibida?codigo=${encodeURIComponent(result.codigo)}`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado."
      );
      setEnviando(false);
    }
  };

  const campo = {
    width: "100%",
    padding: "0.8rem",
    border: "1px solid #cfc5b7",
    borderRadius: "8px",
    fontSize: "1rem",
    marginTop: "0.35rem",
  } as const;

  const bloque = {
    background: "white",
    border: "1px solid #ddd4c7",
    borderRadius: "12px",
    padding: "1.25rem",
    marginTop: "1.25rem",
  } as const;

  return (
    <section className="section">
      <div className="container content-page" style={{ maxWidth: "980px" }}>
        <h1>Solicitud de ingreso a la AGENN</h1>

        <p>
          Complete la información con datos verdaderos. La Academia utilizará
          estos datos únicamente para estudiar su solicitud, comunicarse con
          usted y, en caso de aprobación, crear su expediente de miembro.
        </p>

        <p>
          No solicitamos una dirección exacta. Únicamente se requiere la
          ubicación general de su residencia.
        </p>

        <form onSubmit={enviarSolicitud} encType="multipart/form-data">
          <div style={bloque}>
            <h2 style={{ marginTop: 0 }}>1. Perfil numismático</h2>

            <label>
              Perfil obtenido en el diagnóstico
              <select
                value={perfil}
                onChange={(event) => setPerfil(event.target.value)}
                required
                style={campo}
              >
                <option value="">Seleccione su perfil</option>
                {Object.entries(PERFILES).map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>
                    Perfil {codigo} — {nombre}
                  </option>
                ))}
              </select>
            </label>

            <p style={{ color: "#666", marginBottom: 0 }}>
              El perfil es orientativo y no determina por sí solo el nivel de
              ingreso. La decisión corresponde al Consejo Académico.
            </p>
          </div>

          <div style={bloque}>
            <h2 style={{ marginTop: 0 }}>2. Datos personales</h2>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              <label>
                Nombres
                <input name="nombres" required style={campo} />
              </label>

              <label>
                Apellidos
                <input name="apellidos" required style={campo} />
              </label>

              <label>
                Fecha de nacimiento
                <input
                  type="date"
                  name="fecha_nacimiento"
                  required
                  style={campo}
                />
              </label>

              <label>
                Correo electrónico
                <input type="email" name="correo" required style={campo} />
              </label>

              <label>
                Teléfono o WhatsApp
                <input name="telefono" style={campo} />
              </label>

              <label>
                Profesión u oficio
                <input name="profesion_oficio" required style={campo} />
              </label>

              <label>
                Institución o lugar de trabajo
                <input name="institucion_trabajo" style={campo} />
              </label>

              <label>
                Nivel académico
                <select name="nivel_academico" required style={campo}>
                  <option value="">Seleccione su nivel académico</option>
                  {NIVELES_ACADEMICOS.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "block", marginTop: "1rem" }}>
              Fotografía real y reciente
              <input
                type="file"
                name="fotografia"
                accept="image/jpeg,image/png,image/webp"
                required
                style={campo}
                onChange={async (event) => {
                  const archivo = event.target.files?.[0];
                  setError("");
                  setFotografiaComprimida(null);
                  setEstadoFotografia("");

                  if (vistaPreviaFotografia) {
                    URL.revokeObjectURL(vistaPreviaFotografia);
                    setVistaPreviaFotografia("");
                  }

                  if (!archivo) return;

                  try {
                    const comprimida = await comprimirFotografia(archivo);
                    setFotografiaComprimida(comprimida);
                    setVistaPreviaFotografia(URL.createObjectURL(comprimida));
                    setEstadoFotografia("✓ Fotografía lista para enviarse.");
                  } catch {
                    event.target.value = "";
                    setFotografiaComprimida(null);
                    setVistaPreviaFotografia("");
                    setEstadoFotografia("");
                    setError(
                      "No fue posible procesar la fotografía seleccionada. Intente con otra imagen."
                    );
                  }
                }}
              />
            </label>

            {vistaPreviaFotografia && (
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                  padding: "1rem",
                  border: "1px solid #cfe3c4",
                  borderRadius: "10px",
                  background: "#f7fbf5",
                }}
              >
                <img
                  src={vistaPreviaFotografia}
                  alt="Vista previa de la fotografía seleccionada"
                  style={{
                    width: "130px",
                    height: "160px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: "1px solid #cfc5b7",
                    background: "white",
                  }}
                />

                <p
                  style={{
                    color: "#2f5f24",
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {estadoFotografia}
                </p>
              </div>
            )}
          </div>

          <div style={bloque}>
            <h2 style={{ marginTop: 0 }}>3. Ubicación domiciliar</h2>

            <p style={{ color: "#666" }}>
              Indique únicamente su ubicación general. No se solicita dirección
              exacta.
            </p>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              <label>
                Departamento
                <select
                  name="departamento"
                  value={departamento}
                  onChange={(event) => {
                    setDepartamento(event.target.value);
                    setMunicipio("");
                  }}
                  required
                  style={campo}
                >
                  <option value="">Seleccione un departamento</option>
                  {DEPARTAMENTOS.map((nombreDepartamento) => (
                    <option
                      key={nombreDepartamento}
                      value={nombreDepartamento}
                    >
                      {nombreDepartamento}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Municipio
                <select
                  name="municipio"
                  value={municipio}
                  onChange={(event) => setMunicipio(event.target.value)}
                  required
                  disabled={!departamento}
                  style={{
                    ...campo,
                    background: departamento ? "white" : "#f0ede7",
                    cursor: departamento ? "pointer" : "not-allowed",
                  }}
                >
                  <option value="">
                    {departamento
                      ? "Seleccione un municipio"
                      : "Seleccione primero un departamento"}
                  </option>
                  {(MUNICIPIOS_POR_DEPARTAMENTO[departamento] || []).map(
                    (nombreMunicipio) => (
                      <option key={nombreMunicipio} value={nombreMunicipio}>
                        {nombreMunicipio}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Comunidad, zona, colonia, barrio, aldea u otro
                <input name="comunidad" style={campo} />
              </label>
            </div>
          </div>

          <div style={bloque}>
            <h2 style={{ marginTop: 0 }}>
              4. Experiencia e intereses numismáticos
            </h2>

            <p>Seleccione uno o varios intereses:</p>

            <div
              style={{
                display: "grid",
                gap: "0.65rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              {INTERESES.map((interes) => (
                <label key={interes} style={{ lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={intereses.includes(interes)}
                    onChange={() => alternarInteres(interes)}
                  />{" "}
                  {interes}
                </label>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                marginTop: "1rem",
              }}
            >
              <label>
                Otro interés, si corresponde
                <input name="interes_otro" style={campo} />
              </label>

              <label>
                Años aproximados de experiencia
                <input
                  type="number"
                  name="experiencia_anios"
                  min="0"
                  style={campo}
                />
              </label>

              <label>
                ¿Posee una colección?
                <select
                  value={poseeColeccion}
                  onChange={(event) => setPoseeColeccion(event.target.value)}
                  required
                  style={campo}
                >
                  <option value="">Seleccione</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>

              <label>
                ¿Participa en una asociación, grupo o comunidad?
                <select
                  value={participaComunidad}
                  onChange={(event) => setParticipaComunidad(event.target.value)}
                  required
                  style={campo}
                >
                  <option value="">Seleccione</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>

            <label style={{ display: "block", marginTop: "1rem" }}>
              Asociación, grupo o comunidad en la que participa
              <input name="comunidad_numismatica" style={campo} />
            </label>

            <label style={{ display: "block", marginTop: "1rem" }}>
              Áreas, períodos o piezas de especial interés
              <textarea name="areas_interes" rows={4} style={campo} />
            </label>
          </div>

          <div style={bloque}>
            <h2 style={{ marginTop: 0 }}>5. Motivación</h2>

            <label style={{ display: "block" }}>
              ¿Cómo conoció la AGENN?
              <input name="como_conocio_agenn" required style={campo} />
            </label>

            <label style={{ display: "block", marginTop: "1rem" }}>
              ¿Por qué desea ingresar a la Academia?
              <textarea
                name="motivacion"
                required
                minLength={80}
                rows={6}
                style={campo}
              />
            </label>

            <label style={{ display: "block", marginTop: "1rem" }}>
              ¿Qué espera aprender o desarrollar dentro de la Academia?
              <textarea
                name="expectativas_aprendizaje"
                rows={5}
                style={campo}
              />
            </label>
          </div>

          <div style={bloque}>
            <h2 style={{ marginTop: 0 }}>6. Declaraciones</h2>

            <label style={{ display: "block", lineHeight: 1.7 }}>
              <input
                type="checkbox"
                name="acepta_proceso_formativo"
                value="true"
                required
              />{" "}
              Comprendo la naturaleza académica de la AGENN y acepto participar
              en el proceso formativo que se me asigne.
            </label>

            <label
              style={{ display: "block", marginTop: "0.75rem", lineHeight: 1.7 }}
            >
              <input
                type="checkbox"
                name="acepta_tratamiento_datos"
                value="true"
                required
              />{" "}
              Autorizo el uso de estos datos para gestionar mi solicitud y mi
              eventual incorporación como miembro.
            </label>

            <label
              style={{ display: "block", marginTop: "0.75rem", lineHeight: 1.7 }}
            >
              <input
                type="checkbox"
                name="declara_informacion_veraz"
                value="true"
                required
              />{" "}
              Declaro que la información proporcionada es verdadera.
            </label>
          </div>

          {error && (
            <p style={{ color: "#8b2f2f", fontWeight: 700 }}>{error}</p>
          )}

          <button
            type="submit"
            className="button primary"
            disabled={enviando || !perfil}
            style={{ marginTop: "1.5rem", opacity: enviando ? 0.7 : 1 }}
          >
            {enviando ? "Enviando solicitud..." : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </section>
  );
}
export default function SolicitudPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container content-page">
            <p>Cargando solicitud...</p>
          </div>
        </section>
      }
    >
      <SolicitudContenido />
    </Suspense>
  );
}