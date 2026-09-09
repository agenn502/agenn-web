"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEMAS_TRABAJOS_INV } from "@/content/proceso_inv/temas_trabajos_inv";
import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";
import { nombreNivel, colorNivel } from "@/lib/niveles";

const REGLA_UNIDAD = obtenerReglaTrabajoInv("unidad-2")!;
const TEMAS_UNIDAD = TEMAS_TRABAJOS_INV["unidad-2"] || [];

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

export default function TrabajoUnidad2Page() {
  const [tema, setTema] = useState("");
  const [titulo, setTitulo] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenUrlExistente, setImagenUrlExistente] = useState("");
  const [fuenteImagen, setFuenteImagen] = useState("");
  const [contenido, setContenido] = useState("");

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

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
        .eq("unidad_slug", "unidad-2")
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
        .eq("unidad_slug", "unidad-2")
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

  const caracteres = contenido.length;
  const palabras = contenido.trim()
    ? contenido.trim().split(/\s+/).filter(Boolean).length
    : 0;

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

    return `AGENN-INV-U2-${miembro?.codigo || "USER"}-${random}`;
  };

  const subirImagen = async () => {
    if (!imagen || !miembro) return null;

    const nombreArchivo =
      `unidad-2/${miembro.codigo}-u2.jpg`;

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
          `El análisis breve debe tener al menos ${REGLA_UNIDAD.caracteresMinimos.toLocaleString("es-GT")} caracteres.`
        );
        return false;
      }

      if (palabras < REGLA_UNIDAD.palabrasMinimas) {
        alert(
          `El análisis breve debe tener al menos ${REGLA_UNIDAD.palabrasMinimas.toLocaleString("es-GT")} palabras.`
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
        "¿Está seguro de que desea enviar el análisis breve al Consejo Académico? Mientras esté en revisión no podrá editarlo."
      )
    ) {
      return;
    }

    setGuardando(true);

    try {
      const nuevaImagenUrl = await subirImagen();

      const slug =
        slugTrabajo ||
        `${generarSlug(titulo)}-${miembro.codigo.toLowerCase()}-u2`;

      const ahora = new Date().toISOString();

      const payload: Record<string, unknown> = {
        titulo: titulo.trim(),
        slug,
        autor_nombre: miembro.nombre,
        autor_codigo: miembro.codigo,
        nivel: miembro.nivel,
        proceso: "INV",
        unidad_slug: "unidad-2",
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
          .eq("unidad_slug", "unidad-2");

        alert(
          "Análisis breve enviado al Consejo Académico para revisión."
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

  const insertarFormato = (
    antes: string,
    despues = ""
  ) => {
    const textarea = document.getElementById(
      "contenido-ensayo"
    ) as HTMLTextAreaElement | null;

    if (!textarea) return;

    const inicio = textarea.selectionStart;
    const fin = textarea.selectionEnd;

    const seleccionado =
      contenido.substring(inicio, fin);

    const nuevoTexto =
      contenido.substring(0, inicio) +
      antes +
      seleccionado +
      despues +
      contenido.substring(fin);

    setContenido(nuevoTexto);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        inicio + antes.length,
        fin + antes.length
      );
    }, 0);
  };

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
        <h1>Análisis breve de la Unidad 2</h1>

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
            La Unidad 2 ha sido completada y puede continuar
            con la siguiente unidad del Nivel Investigador.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Análisis breve de la Unidad 2</h1>

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
        <strong>
          Puede desarrollar su análisis breve en varias sesiones.
        </strong>
        <br />
        Utilice <strong>Guardar borrador</strong> para
        conservar su avance y regresar posteriormente.
        Seleccione{" "}
        <strong>Enviar análisis breve a revisión</strong>{" "}
        únicamente cuando considere que el trabajo está
        finalizado. Una vez enviado, quedará pendiente de
        revisión por el Consejo Académico y no podrá
        editarlo hasta que exista una resolución.
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
            ⏳ Análisis breve pendiente de revisión académica
          </h3>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            El análisis breve fue enviado al Consejo Académico.
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
            ⚠ Análisis breve devuelto para correcciones
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
        Para completar esta unidad deberá elaborar un análisis breve
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
        <strong>Tema del análisis breve *</strong>
        </label>

        <select
          value={tema}
          disabled={!puedeEditar}
          onChange={(e) => setTema(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <option value="">
            Seleccione un tema
          </option>

          {TEMAS_UNIDAD.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <label>
          <strong>Título del análisis breve *</strong>
        </label>

        <input
          type="text"
          value={titulo}
          disabled={!puedeEditar}
          onChange={(e) =>
            setTitulo(e.target.value)
          }
          placeholder="Ingrese el título de su análisis breve"
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
          <strong>Contenido del análisis breve *</strong>
        </label>

        {puedeEditar && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() =>
                insertarFormato("**", "**")
              }
            >
              Negrita
            </button>

            <button
              type="button"
              onClick={() =>
                insertarFormato("*", "*")
              }
            >
              Cursiva
            </button>

            <button
              type="button"
              onClick={() =>
                insertarFormato("- ")
              }
            >
              Viñeta
            </button>

            <button
              type="button"
              onClick={() =>
                insertarFormato("1. ")
              }
            >
              Lista numerada
            </button>
          </div>
        )}

        <textarea
          id="contenido-ensayo"
          value={contenido}
          disabled={!puedeEditar}
          onChange={(e) =>
            setContenido(e.target.value)
          }
          placeholder="Redacte aquí su análisis breve..."
          rows={18}
          style={{
            width: "100%",
            padding: "1rem",
            marginTop: "0.5rem",
          }}
        />

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
              disabled={guardando}
              onClick={() =>
                guardarTrabajo(true)
              }
              style={{
                background: "#6b6f1a",
                color: "white",
                border: 0,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                cursor: guardando
                  ? "wait"
                  : "pointer",
              }}
            >
              Enviar análisis breve a revisión
            </button>
          </div>
        )}

      </div>
    </div>
  );
} 
