"use client";

import { ClipboardEvent as ReactClipboardEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEMAS_TRABAJOS_INV } from "@/content/proceso_inv/temas_trabajos_inv";
import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";
import { nombreNivel, colorNivel } from "@/lib/niveles";

const REGLA_UNIDAD = obtenerReglaTrabajoInv("unidad-6")!;
const TEMAS_UNIDAD = TEMAS_TRABAJOS_INV["unidad-6"] || [];
const PREFIJO_HTML_ENRIQUECIDO = "<!--AGENN_RICH_HTML_V1-->";

function escaparHtml(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function contenidoAHtml(contenido: string) {
  if (contenido.trimStart().startsWith(PREFIJO_HTML_ENRIQUECIDO)) {
    return contenido.trimStart().slice(PREFIJO_HTML_ENRIQUECIDO.length);
  }
  return contenido
    .replace(/\r/g, "")
    .split("\n")
    .filter((linea) => linea.trim())
    .map((linea) => `<p>${escaparHtml(linea).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>")}</p>`)
    .join("");
}

function limpiarHtml(editor: HTMLElement) {
  const copia = editor.cloneNode(true) as HTMLElement;
  copia.querySelectorAll("script,style,link,meta,iframe,object,embed,form,input,button,textarea,select,img").forEach((nodo) => nodo.remove());
  copia.querySelectorAll<HTMLElement>("*").forEach((elemento) => {
    elemento.style.removeProperty("font-family");
    elemento.style.removeProperty("line-height");
    elemento.style.removeProperty("text-align");
    Array.from(elemento.style).forEach((propiedad) => {
      if (propiedad.toLowerCase().startsWith("mso-")) elemento.style.removeProperty(propiedad);
    });
    elemento.removeAttribute("class");
    elemento.removeAttribute("face");
    if (!elemento.getAttribute("style")?.trim()) elemento.removeAttribute("style");
  });
  return copia.innerHTML.trim();
}


type Miembro = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
};

type Ensayo = {
  id: number;
  tema: string | null;
  titulo: string;
  slug: string;
  contenido: string;
  imagen_url: string | null;
  fuente_imagen: string | null;
  estado: string | null;
  estado_revision: string | null;
  observaciones_revision: string | null;
};

export default function TrabajoUnidad1Page() {
  const [tema, setTema] = useState("");
  const [titulo, setTitulo] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenUrlExistente, setImagenUrlExistente] = useState("");
  const [fuenteImagen, setFuenteImagen] = useState("");
  const [contenido, setContenido] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const rangoRef = useRef<Range | null>(null);

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [revisandoPreliminar, setRevisandoPreliminar] = useState(false);
  const [revisionPreliminar, setRevisionPreliminar] = useState<any | null>(null);
  const [firmaRevisionLista, setFirmaRevisionLista] = useState("");
  const [errorRevisionPreliminar, setErrorRevisionPreliminar] = useState("");

  const [trabajoId, setTrabajoId] = useState<number | null>(null);
  const [slugTrabajo, setSlugTrabajo] = useState("");
  const [estadoRevision, setEstadoRevision] = useState("");
  const [observacionesRevision, setObservacionesRevision] = useState("");
  const [unidadCompletada, setUnidadCompletada] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(stored);

      const { data: miembroData, error: miembroError } = await supabase
        .from("miembros")
        .select("id,codigo,nombre,nivel")
        .eq("codigo", user.codigo)
        .maybeSingle();

      if (miembroError || !miembroData) {
        alert("No se pudo cargar la información del miembro.");
        setLoading(false);
        return;
      }

      setMiembro(miembroData as Miembro);

      const { data: ensayoData, error: ensayoError } = await supabase
        .from("ensayos")
        .select("*")
        .eq("autor_codigo", miembroData.codigo)
        .eq("unidad_slug", "unidad-6")
        .in("estado", ["borrador", "en_revision", "correcciones", "publicado"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ensayoError) {
        console.error("Error cargando ensayo:", ensayoError);
      }

      if (ensayoData) {
        const ensayo = ensayoData as Ensayo;

        setTrabajoId(ensayo.id);
        setTema(ensayo.tema || "");
        setTitulo(ensayo.titulo || "");
        setSlugTrabajo(ensayo.slug || "");
        setContenido(ensayo.contenido || "");
        setImagenUrlExistente(ensayo.imagen_url || "");
        setFuenteImagen(ensayo.fuente_imagen || "");
        setEstadoRevision(ensayo.estado_revision || "");
        setObservacionesRevision(ensayo.observaciones_revision || "");
      }

      const { data: progresoUnidad } = await supabase
        .from("progreso_inv")
        .select("completada")
        .eq("user_codigo", miembroData.codigo)
        .eq("unidad_slug", "unidad-6")
        .maybeSingle();

      setUnidadCompletada(Boolean(progresoUnidad?.completada));
      setLoading(false);
    };

    cargar();
  }, []);

  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };

      img.onload = async () => {
        try {
          const MAX_BYTES = 100 * 1024;

          const crearBlob = (
            anchoMaximo: number,
            calidadJpeg: number
          ): Promise<Blob> => {
            return new Promise((resolveBlob, rejectBlob) => {
              const escala = Math.min(anchoMaximo / img.width, 1);

              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(img.width * escala));
              canvas.height = Math.max(1, Math.round(img.height * escala));

              const ctx = canvas.getContext("2d");

              if (!ctx) {
                rejectBlob(new Error("No se pudo procesar la imagen."));
                return;
              }

              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    rejectBlob(new Error("No se pudo comprimir la imagen."));
                    return;
                  }

                  resolveBlob(blob);
                },
                "image/jpeg",
                calidadJpeg
              );
            });
          };

          let anchoMaximo = 1200;
          let calidad = 0.82;
          let blob = await crearBlob(anchoMaximo, calidad);

          while (blob.size > MAX_BYTES && calidad > 0.46) {
            calidad = Math.max(0.46, calidad - 0.08);
            blob = await crearBlob(anchoMaximo, calidad);
          }

          while (blob.size > MAX_BYTES && anchoMaximo > 600) {
            anchoMaximo -= 100;
            calidad = Math.max(calidad, 0.5);
            blob = await crearBlob(anchoMaximo, calidad);
          }

          while (blob.size > MAX_BYTES && calidad > 0.3) {
            calidad = Math.max(0.3, calidad - 0.05);
            blob = await crearBlob(anchoMaximo, calidad);
          }

          if (blob.size > MAX_BYTES) {
            reject(
              new Error(
                "No fue posible reducir la imagen a menos de 100 KB. Pruebe con una imagen de menor tamaño o complejidad."
              )
            );
            return;
          }

          resolve(
            new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            )
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () =>
        reject(new Error("No se pudo cargar la imagen."));

      reader.onerror = () =>
        reject(new Error("No se pudo leer la imagen."));

      reader.readAsDataURL(file);
    });
  };

  const textoPlano = typeof document !== "undefined"
    ? (() => {
        const temporal = document.createElement("div");
        temporal.innerHTML = contenidoAHtml(contenido);
        return (temporal.textContent || "").replace(/\s+/g, " ").trim();
      })()
    : "";
  const caracteres = textoPlano.length;
  const palabras = textoPlano ? textoPlano.split(/\s+/).filter(Boolean).length : 0;
  const revisionListaVigente =
    revisionPreliminar?.estado === "LISTO_PARA_REMITIR" &&
    firmaRevisionLista !== "";

  const generarSlug = (texto: string) =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const generarCodigoVerificacion = () => {
    const random = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    return `AGENN-INV-U6-${miembro?.codigo || "USER"}-${random}`;
  };

  const subirImagen = async () => {
    if (!imagen || !miembro) return null;

    const nombreArchivo =
      `unidad-6/${miembro.codigo}-u6.jpg`;

    const { error } = await supabase.storage
      .from("ensayos")
      .upload(nombreArchivo, imagen, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("ensayos")
      .getPublicUrl(nombreArchivo);

    return `${data.publicUrl}?v=${Date.now()}`;
  };

  const validarContenido = (paraRevision: boolean) => {
    if (!tema || !titulo.trim() || !contenido.trim()) {
      alert("Complete tema, título y contenido.");
      return false;
    }

    if (paraRevision) {
      if ((imagen || imagenUrlExistente) && !fuenteImagen.trim()) {
        alert("Debe indicar la fuente de la imagen.");
        return false;
      }

      if (contenido.length < REGLA_UNIDAD.caracteresMinimos) {
        alert(
          `La nota de investigación debe tener al menos ${REGLA_UNIDAD.caracteresMinimos.toLocaleString("es-GT")} caracteres.`
        );
        return false;
      }

      if (palabras < REGLA_UNIDAD.palabrasMinimas) {
        alert(
          `La nota de investigación debe tener al menos ${REGLA_UNIDAD.palabrasMinimas.toLocaleString("es-GT")} palabras.`
        );
        return false;
      }
    }

    return true;
  };

  const guardarTrabajo = async (enviarRevision = false) => {
    if (!miembro || guardando) return;

    if (!validarContenido(enviarRevision)) return;

    if (
      enviarRevision &&
      !confirm(
        "¿Está seguro de que desea enviar la nota de investigación al Consejo Académico? Mientras esté en revisión no podrá editarlo."
      )
    ) {
      return;
    }

    setGuardando(true);

    try {
      const nuevaImagenUrl = await subirImagen();

      const slug =
        slugTrabajo ||
        `${generarSlug(titulo)}-${miembro.codigo.toLowerCase()}-u6`;

      const ahora = new Date().toISOString();

      const payload: Record<string, unknown> = {
        titulo: titulo.trim(),
        slug,
        autor_nombre: miembro.nombre,
        autor_codigo: miembro.codigo,
        nivel: miembro.nivel,
        proceso: "INV",
        unidad_slug: "unidad-6",
        origen_ensayo: "FORMACION",
        autor_miembro_id: miembro.id,
        tipo_trabajo: REGLA_UNIDAD.tipo,
        numero_palabras: palabras,
        numero_caracteres: caracteres,
        tema,
        fuente_imagen: fuenteImagen.trim() || null,
        contenido,
        estado: enviarRevision
          ? "en_revision"
          : estadoRevision === "correcciones"
          ? "correcciones"
          : "borrador",
        updated_at: ahora,
      };

      if (!trabajoId) {
        payload.codigo_verificacion =
          generarCodigoVerificacion();
      }

      if (nuevaImagenUrl) {
        payload.imagen_url = nuevaImagenUrl;
      }

      if (enviarRevision) {
        Object.assign(payload, {
          estado_revision: "pendiente",
          observaciones_revision: null,
          revisado_por: null,
          fecha_revision: null,

        });
      }

      let guardado;

      if (trabajoId) {
        const { data, error } = await supabase
          .from("ensayos")
          .update(payload)
          .eq("id", trabajoId)
          .select(
            "id,slug,imagen_url,estado,estado_revision"
          )
          .single();

        if (error) throw new Error(error.message);

        guardado = data;
      } else {
        const { data, error } = await supabase
          .from("ensayos")
          .insert(payload)
          .select(
            "id,slug,imagen_url,estado,estado_revision"
          )
          .single();

        if (error) throw new Error(error.message);

        guardado = data;
      }

      setTrabajoId(guardado.id);
      setSlugTrabajo(guardado.slug || slug);

      setImagenUrlExistente(
        guardado.imagen_url ||
          nuevaImagenUrl ||
          imagenUrlExistente
      );

      setImagen(null);

      if (enviarRevision) {
        setEstadoRevision("pendiente");
        setObservacionesRevision("");

        await supabase
          .from("progreso_inv")
          .update({
            porcentaje: 50,
            completada: false,
            fecha_actualizacion: ahora,
          })
          .eq("user_codigo", miembro.codigo)
          .eq("unidad_slug", "unidad-6");

        alert(
          "Nota de investigación enviada al Consejo Académico para revisión."
        );

        window.location.href = "/miembros/proceso_inv";
        return;
      }

      alert(
        "Borrador guardado correctamente. Puede continuar trabajando más adelante."
      );
    } catch (err: any) {
      alert(
        "Error al guardar el trabajo: " + err.message
      );
    } finally {
      setGuardando(false);
    }
  };

  const solicitarRevisionPreliminar = async () => {
    if (revisandoPreliminar || guardando) return;
    if (!validarContenido(true)) return;

    await guardarTrabajo(false);

    setRevisandoPreliminar(true);
    setRevisionPreliminar(null);
    setFirmaRevisionLista("");
    setErrorRevisionPreliminar("");

    try {
      const contenidoPlano = editorRef.current?.innerText?.trim() || textoPlano;
      const firmaEnviada = JSON.stringify([tema.trim(), titulo.trim(), contenidoPlano.replace(/\s+/g, " " ).trim()]);

      const respuesta = await fetch("/api/inv/revision-preliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidad: "Unidad 6",
          tipoTrabajo: REGLA_UNIDAD.tipo || "Nota de investigación",
          tema,
          titulo: titulo.trim(),
          consigna: `Elabore una nota de investigación basado en uno de los temas propuestos de la Unidad 6. El trabajo debe desarrollar el tema con claridad, argumentación y sustento, y cumplir al menos ${REGLA_UNIDAD.palabrasMinimas.toLocaleString("es-GT")} palabras y ${REGLA_UNIDAD.caracteresMinimos.toLocaleString("es-GT")} caracteres.`,
          criterios: "Valore el cumplimiento de la consigna, la estructura y argumentación, el uso de fuentes y evidencias, la precisión conceptual y las afirmaciones que requieran respaldo o verificación.",
          contenido: contenidoPlano,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok || !datos?.ok || !datos?.revision) {
        throw new Error(
          datos?.error ||
            "La revisión preliminar no está disponible en este momento. Su borrador permanece guardado. Inténtelo nuevamente en unos minutos."
        );
      }

      setRevisionPreliminar(datos.revision);
      if (datos.revision.estado === "LISTO_PARA_REMITIR") {
        setFirmaRevisionLista(firmaEnviada);
      }
    } catch (error: any) {
      setErrorRevisionPreliminar(
        error?.message ||
          "La revisión preliminar no está disponible en este momento. Su borrador permanece guardado. Inténtelo nuevamente en unos minutos."
      );
    } finally {
      setRevisandoPreliminar(false);
    }
  };

  const sincronizarEditor = () => {
    if (!editorRef.current) return;
    setContenido(`${PREFIJO_HTML_ENRIQUECIDO}${limpiarHtml(editorRef.current)}`);
    if (firmaRevisionLista) setFirmaRevisionLista("");
  };

  const guardarRango = () => {
    const editor = editorRef.current;
    const seleccion = window.getSelection();
    if (!editor || !seleccion || seleccion.rangeCount === 0) return;
    const rango = seleccion.getRangeAt(0);
    if (editor.contains(rango.commonAncestorContainer)) rangoRef.current = rango.cloneRange();
  };

  const ejecutarComando = (comando: string) => {
    editorRef.current?.focus();
    document.execCommand(comando, false);
    sincronizarEditor();
  };

  const aplicarTamanoFuente = (tamano: string) => {
    const editor = editorRef.current;
    const rango = rangoRef.current;
    if (!editor || !rango || rango.collapsed) return;
    editor.focus();
    const seleccion = window.getSelection();
    if (!seleccion || !editor.contains(rango.commonAncestorContainer)) return;
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
    document.execCommand("fontSize", false, "7");
    editor.querySelectorAll<HTMLElement>('font[size="7"]').forEach((elemento) => {
      elemento.removeAttribute("size");
      elemento.style.fontSize = tamano;
    });
    sincronizarEditor();
  };

  const manejarPegado = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const texto = event.clipboardData.getData("text/plain");
    if (!html) {
      document.execCommand("insertText", false, texto);
      sincronizarEditor();
      return;
    }
    const plantilla = document.createElement("template");
    plantilla.innerHTML = html;
    plantilla.content.querySelectorAll("script,style,link,meta,iframe,object,embed,form,input,button,textarea,select,img").forEach((nodo) => nodo.remove());
    plantilla.content.querySelectorAll<HTMLElement>("*").forEach((elemento) => {
      elemento.style.removeProperty("font-size");
      elemento.style.removeProperty("font-family");
      elemento.style.removeProperty("line-height");
      elemento.style.removeProperty("text-align");
      Array.from(elemento.style).forEach((propiedad) => {
        if (propiedad.toLowerCase().startsWith("mso-")) elemento.style.removeProperty(propiedad);
      });
      elemento.removeAttribute("face");
      elemento.removeAttribute("size");
      elemento.removeAttribute("class");
      if (!elemento.getAttribute("style")?.trim()) elemento.removeAttribute("style");
    });
    document.execCommand("insertHTML", false, plantilla.innerHTML);
    sincronizarEditor();
  };

  useEffect(() => {
    if (!loading && editorRef.current) editorRef.current.innerHTML = contenidoAHtml(contenido);
  }, [loading, trabajoId]);

  const revisionPendiente =
    estadoRevision === "pendiente";

  const correccionesAcademicas =
    estadoRevision === "correcciones" ||
    estadoRevision === "rechazado";

  const aprobadoAcademicamente =
    estadoRevision === "aprobado";

  const puedeEditar =
    !unidadCompletada &&
    !revisionPendiente &&
    !aprobadoAcademicamente;

  if (loading) {
    return <p>Cargando información del miembro...</p>;
  }

  if (unidadCompletada || aprobadoAcademicamente) {
    return (
      <div style={{ maxWidth: "900px" }}>
        <h1>Nota de investigación de la Unidad 6</h1>

        <div
          style={{
            background: "#eef7ea",
            border: "1px solid #b9d7ad",
            borderRadius: "10px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            ✓ Unidad completada
          </h3>

          <p
            style={{
              lineHeight: 1.7,
              marginBottom: 0,
            }}
          >
            El Consejo Académico aprobó el trabajo escrito.
            La Unidad 6 ha sido completada y puede continuar
            con la siguiente unidad del Nivel Investigador.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Nota de investigación de la Unidad 6</h1>

      <div
        style={{
          background: "#fff8e5",
          border: "1px solid #e0c46c",
          borderRadius: "10px",
          padding: "1rem",
          marginBottom: "1rem",
          lineHeight: 1.75,
        }}
      >
        <strong>Recomendación para elaborar su análisis</strong>
        <p style={{ marginBottom: "0.65rem" }}>
          Se recomienda redactar inicialmente su trabajo en Microsoft Word o en otro procesador de textos. Así podrá trabajar con mayor comodidad y conservar una copia personal.
        </p>
        <p style={{ marginBottom: "0.65rem" }}>
          Cuando considere que el texto está terminado, cópielo y péguelo en el editor de AGENN. El texto normal se mostrará a <strong>18 px</strong>, justificado y con el espaciado establecido. Utilice la barra de edición para aplicar negrita, cursiva, listas o tamaños especiales. Para un título dentro del texto, utilice <strong>24 px y negrita</strong>.
        </p>
        <p style={{ marginBottom: 0 }}>
          Utilice <strong>Guardar borrador</strong> para conservar su avance. Envíe el análisis a revisión únicamente cuando esté finalizado; mientras se encuentre en revisión no podrá editarlo hasta que exista una resolución.
        </p>
      </div>

      {trabajoId && (
        <div
          style={{
            background: "#eef7ea",
            border: "1px solid #b9d7ad",
            padding: "0.75rem",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          Se ha cargado automáticamente el trabajo
          guardado anteriormente.
        </div>
      )}

      {revisionPendiente && (
        <div
          style={{
            background: "#fff8e5",
            border: "1px solid #e0c46c",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            ⏳ Nota de investigación pendiente de revisión académica
          </h3>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            La nota de investigación fue enviada al Consejo Académico.
            Mientras se encuentre en revisión puede
            consultarlo, pero no editarlo.
          </p>
        </div>
      )}

      {correccionesAcademicas && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#7a1f1f",
            }}
          >
            ⚠ Nota de investigación devuelta para correcciones
          </h3>

          <p style={{ lineHeight: 1.7 }}>
            El Consejo Académico solicita realizar ajustes
            antes de aprobar el trabajo. Puede editar
            nuevamente su trabajo y enviarlo otra vez a
            revisión.
          </p>

          {observacionesRevision && (
            <div
              style={{
                background: "white",
                border: "1px solid #e0caca",
                borderRadius: "8px",
                padding: "0.75rem",
              }}
            >
              <strong>
                Observaciones del Consejo:
              </strong>

              <div
                style={{
                  marginTop: "0.5rem",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                }}
              >
                {observacionesRevision}
              </div>
            </div>
          )}
        </div>
      )}


      <p style={{ lineHeight: 1.8 }}>
        Para completar esta unidad deberá elaborar una nota de investigación
        basado en uno de los temas propuestos y someterlo a revisión
        del Consejo Académico. La aprobación del trabajo completará
        la unidad al 100 %.
      </p>

      {miembro && (
        <div
          style={{
            background: "#f4f1e8",
            border: "1px solid #ddd4c7",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <strong>Autor:</strong> {miembro.nombre}
          <br />

          <strong>Código:</strong> {miembro.codigo}
          <br />

          <strong>Nivel:</strong>{" "}
          <span
            style={{
              color: colorNivel(miembro.nivel),
              fontWeight: 700,
            }}
          >
            {nombreNivel(miembro.nivel)}
          </span>
        </div>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.5rem",
          marginTop: "1.5rem",
        }}
      >
        <label>
        <strong>Tema dla nota de investigación *</strong>
        </label>

        <input
          type="text"
          list="temas-sugeridos-inv"
          value={tema}
          disabled={!puedeEditar}
          onChange={(e) => { setTema(e.target.value); if (firmaRevisionLista) setFirmaRevisionLista(""); }}
          placeholder="Seleccione una sugerencia o escriba un tema propio"
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            marginBottom: "0.35rem",
          }}
        />

        <datalist id="temas-sugeridos-inv">
          {TEMAS_UNIDAD.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <p
          style={{
            marginTop: 0,
            marginBottom: "1.5rem",
            color: "#665c50",
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}
        >
          Puede elegir una sugerencia o proponer un tema propio relacionado con la unidad.
        </p>

        <label>
          <strong>Título dla nota de investigación *</strong>
        </label>

        <input
          type="text"
          value={titulo}
          disabled={!puedeEditar}
          onChange={(e) => {
            setTitulo(e.target.value);
            if (firmaRevisionLista) setFirmaRevisionLista("");
          }}
          placeholder="Ingrese el título de su nota de investigación"
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            marginBottom: "1.5rem",
          }}
        />

        <label>
          <strong>Imagen (opcional)</strong>
        </label>

        {imagenUrlExistente && (
          <div
            style={{
              marginTop: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <img
              src={imagenUrlExistente}
              alt="Imagen guardada del trabajo"
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "320px",
                borderRadius: "8px",
                objectFit: "contain",
              }}
            />

            <p
              style={{
                fontSize: "0.85rem",
                color: "#666",
              }}
            >
              Imagen guardada actualmente. Seleccione
              otra solamente si desea reemplazarla.
            </p>
          </div>
        )}

        {puedeEditar && (
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file =
                e.target.files?.[0];

              if (!file) {
                setImagen(null);
                return;
              }

              try {
                const imagenComprimida =
                  await comprimirImagen(file);

                setImagen(imagenComprimida);
              } catch (error: any) {
                alert(error.message);
              }
            }}
            style={{
              width: "100%",
              marginTop: "0.5rem",
              marginBottom: "1rem",
            }}
          />
        )}

        {imagen && (
          <p
            style={{
              fontSize: "0.85rem",
              color: "#666",
            }}
          >
            Nueva imagen optimizada:{" "}
            {(imagen.size / 1024).toFixed(1)} KB
          </p>
        )}

        <p
          style={{
            fontSize: "0.9rem",
            color: "#666",
            lineHeight: 1.6,
            marginBottom: "0.75rem",
          }}
        >
          Si la imagen es suya, escriba en la fuente:{" "}
          <strong>"Imagen propia"</strong>. Si no,
          indique la referencia (autor, año) o el enlace
          desde donde fue obtenida.
        </p>

        <label>
          <strong>Fuente de la imagen</strong>
        </label>

        <input
          type="text"
          value={fuenteImagen}
          disabled={!puedeEditar}
          onChange={(e) =>
            setFuenteImagen(e.target.value)
          }
          placeholder="Imagen propia / Autor, año / URL"
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            marginBottom: "1.5rem",
          }}
        />

        <label>
          <strong>Contenido dla nota de investigación *</strong>
        </label>

        <div
          style={{
            marginTop: "0.5rem",
            border: "1px solid #aaa",
            borderRadius: "8px",
            overflow: "hidden",
            background: "white",
          }}
        >
          {puedeEditar && (
            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                flexWrap: "wrap",
                padding: "0.5rem",
                background: "#eee9df",
                borderBottom: "1px solid #aaa",
                position: "relative",
                zIndex: 2,
                boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
              }}
            >
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => ejecutarComando("bold")} style={{ fontWeight: 800 }}>B</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => ejecutarComando("italic")} style={{ fontStyle: "italic" }}>I</button>
              <select
                defaultValue=""
                onMouseDown={() => guardarRango()}
                onChange={(e) => { aplicarTamanoFuente(e.target.value); e.currentTarget.value = ""; }}
                aria-label="Tamaño de fuente"
              >
                <option value="" disabled>Tamaño de fuente</option>
                <option value="18px">18 px — texto normal</option>
                <option value="24px">24 px — título</option>
              </select>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => ejecutarComando("insertUnorderedList")}>• Lista</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => ejecutarComando("insertOrderedList")}>1. Lista</button>
            </div>
          )}

        <style jsx>{`
          .editor-inv { text-align: justify; }
          .editor-inv :global(p), .editor-inv :global(div), .editor-inv :global(li), .editor-inv :global(blockquote) { text-align: justify !important; }
          .editor-inv :global(p) { margin: 0 0 1rem 0; }
          .editor-inv :global(ul), .editor-inv :global(ol) { margin: 0 0 1rem 1.5rem; }
          .editor-inv :global(strong), .editor-inv :global(b) { font-weight: 700; }
        `}</style>

        <div
          id="contenido-ensayo"
          ref={editorRef}
          className="editor-inv"
          contentEditable={puedeEditar}
          suppressContentEditableWarning
          onInput={sincronizarEditor}
          onPaste={puedeEditar ? manejarPegado : undefined}
          onMouseUp={guardarRango}
          onKeyUp={guardarRango}
          onBlur={sincronizarEditor}
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: "62vh",
            minHeight: "420px",
            maxHeight: "720px",
            overflowY: "auto",
            padding: "1rem",
            lineHeight: 1.85,
            border: "none",
            borderRadius: 0,
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "18px",
            background: puedeEditar ? "white" : "#f7f7f7",
            outline: "none",
            textAlign: "justify",
          }}
        />
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            color:
              caracteres >= REGLA_UNIDAD.caracteresMinimos
                ? "green"
                : "#666",
            fontWeight: 600,
          }}
        >
          {palabras.toLocaleString()} /{" "}
          {REGLA_UNIDAD.palabrasMinimas.toLocaleString("es-GT")} palabras mínimas ·{" "}
          {caracteres.toLocaleString()} /{" "}
          {REGLA_UNIDAD.caracteresMinimos.toLocaleString("es-GT")} caracteres mínimos
        </div>

        {errorRevisionPreliminar && (
          <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #d8b4a0", borderRadius: "10px", background: "#fff5f0", lineHeight: 1.7 }}>
            {errorRevisionPreliminar}
          </div>
        )}

        {revisionPreliminar && (
          <div style={{ marginTop: "1.25rem", padding: "1.25rem", border: "1px solid #b9cfc5", borderRadius: "10px", background: "#f4faf7", lineHeight: 1.75 }}>
            <h3 style={{ marginTop: 0 }}>Revisión preliminar del trabajo</h3>
            <p>{revisionPreliminar.sintesis}</p>
            <p><strong>Cumplimiento de la consigna:</strong> {revisionPreliminar.cumplimientoConsigna}</p>
            <p><strong>Estructura y argumentación:</strong> {revisionPreliminar.estructuraArgumentacion}</p>
            <p><strong>Fuentes y evidencias:</strong> {revisionPreliminar.fuentesEvidencias}</p>
            <p><strong>Precisión conceptual:</strong> {revisionPreliminar.precisionConceptual}</p>

            {Array.isArray(revisionPreliminar.aspectosFortalecer) && revisionPreliminar.aspectosFortalecer.length > 0 && (
              <>
                <strong>Aspectos que conviene fortalecer:</strong>
                <ul>{revisionPreliminar.aspectosFortalecer.map((item: string, i: number) => <li key={`fortalecer-${i}`}>{item}</li>)}</ul>
              </>
            )}

            {Array.isArray(revisionPreliminar.afirmacionesRequierenRespaldo) && revisionPreliminar.afirmacionesRequierenRespaldo.length > 0 && (
              <>
                <strong>Afirmaciones que requieren respaldo o verificación:</strong>
                <ul>{revisionPreliminar.afirmacionesRequierenRespaldo.map((item: string, i: number) => <li key={`respaldo-${i}`}>{item}</li>)}</ul>
              </>
            )}

            <div style={{ marginTop: "1rem", padding: "0.9rem", borderRadius: "8px", background: revisionPreliminar.estado === "LISTO_PARA_REMITIR" ? "#e8f5e9" : "#fff8e5" }}>
              <strong>Conclusión de la revisión:</strong> {revisionPreliminar.recomendacionFinal}
            </div>

            {revisionPreliminar.estado === "REQUIERE_AJUSTES" && (
              <p style={{ marginBottom: 0, fontWeight: 600 }}>
                Aplique los cambios sugeridos, guarde el borrador y vuelva a solicitar la revisión preliminar. Puede repetir este proceso tantas veces como sea necesario hasta que el trabajo reúna los elementos necesarios para ser remitido al Consejo Académico.
              </p>
            )}

            {revisionListaVigente && (
              <p style={{ marginBottom: 0, fontWeight: 700, color: "#355f52" }}>
                Ya puede solicitar el aval del Consejo Académico.
              </p>
            )}
            <p style={{ marginBottom: 0, marginTop: "0.8rem", fontSize: "0.92rem", color: "#555" }}>
              Esta revisión tiene carácter orientativo. La valoración y resolución académica final corresponden exclusivamente al Consejo Académico.
            </p>
          </div>
        )}

        {puedeEditar && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={guardando}
              onClick={() =>
                guardarTrabajo(false)
              }
            >
              {guardando
                ? "Guardando..."
                : "Guardar borrador"}
            </button>

            <button
              type="button"
              disabled={guardando || revisandoPreliminar}
              onClick={solicitarRevisionPreliminar}
              style={{
                background: "#355f52",
                color: "white",
                border: 0,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                cursor: guardando || revisandoPreliminar ? "wait" : "pointer",
              }}
            >
              {revisandoPreliminar ? "Realizando revisión..." : "Solicitar revisión preliminar"}
            </button>

            {revisionListaVigente && (
              <button
                type="button"
                disabled={guardando || revisandoPreliminar}
                onClick={() => guardarTrabajo(true)}
                style={{
                  background: "#6b6f1a",
                  color: "white",
                  border: 0,
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  cursor: guardando || revisandoPreliminar ? "wait" : "pointer",
                }}
              >
                Solicitar aval del Consejo Académico
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
