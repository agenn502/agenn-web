"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEMAS_ENSAYO_U1 } from "@/content/proceso_inv/temas_ensayo_u1";
import { nombreNivel, colorNivel } from "@/lib/niveles";

type Miembro = {
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
  url_social: string | null;
  estado: string | null;
  estado_revision: string | null;
  observaciones_revision: string | null;
  evidencia_validada: boolean | null;
  estado_difusion: string | null;
  observaciones_difusion: string | null;
};

export default function EnsayoUnidad1Page() {
  const [tema, setTema] = useState("");
  const [titulo, setTitulo] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenUrlExistente, setImagenUrlExistente] = useState("");
  const [fuenteImagen, setFuenteImagen] = useState("");
  const [contenido, setContenido] = useState("");

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [ensayoId, setEnsayoId] = useState<number | null>(null);
  const [slugEnsayo, setSlugEnsayo] = useState("");
  const [estadoEnsayo, setEstadoEnsayo] = useState("borrador");
  const [estadoRevision, setEstadoRevision] = useState("");
  const [observacionesRevision, setObservacionesRevision] = useState("");
  const [estadoDifusion, setEstadoDifusion] = useState("");
  const [observacionesDifusion, setObservacionesDifusion] = useState("");
  const [urlSocial, setUrlSocial] = useState("");
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
        .select("codigo,nombre,nivel")
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
        .eq("unidad_slug", "unidad-1")
        .in("estado", ["borrador", "publicado"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ensayoError) {
        console.error("Error cargando ensayo:", ensayoError);
      }

      if (ensayoData) {
        const ensayo = ensayoData as Ensayo;

        setEnsayoId(ensayo.id);
        setTema(ensayo.tema || "");
        setTitulo(ensayo.titulo || "");
        setSlugEnsayo(ensayo.slug || "");
        setContenido(ensayo.contenido || "");
        setImagenUrlExistente(ensayo.imagen_url || "");
        setFuenteImagen(ensayo.fuente_imagen || "");
        setUrlSocial(ensayo.url_social || "");
        setEstadoEnsayo(ensayo.estado || "borrador");
        setEstadoRevision(ensayo.estado_revision || "");
        setObservacionesRevision(ensayo.observaciones_revision || "");
        setEstadoDifusion(ensayo.estado_difusion || "");
        setObservacionesDifusion(ensayo.observaciones_difusion || "");
      }

      const { data: progresoUnidad } = await supabase
        .from("progreso_inv")
        .select("completada")
        .eq("user_codigo", miembroData.codigo)
        .eq("unidad_slug", "unidad-1")
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

    return `AGENN-INV-U1-${miembro?.codigo || "USER"}-${random}`;
  };

  const subirImagen = async () => {
    if (!imagen || !miembro) return null;

    const nombreArchivo =
      `unidad-1/${miembro.codigo}-u1.jpg`;

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
      if (!imagen && !imagenUrlExistente) {
        alert("Debe seleccionar una imagen.");
        return false;
      }

      if (!fuenteImagen.trim()) {
        alert("Debe indicar la fuente de la imagen.");
        return false;
      }

      if (contenido.length < 3000) {
        alert("El ensayo debe tener al menos 3,000 caracteres.");
        return false;
      }
    }

    return true;
  };

  const guardarEnsayo = async (enviarRevision = false) => {
    if (!miembro || guardando) return;

    if (!validarContenido(enviarRevision)) return;

    if (
      enviarRevision &&
      !confirm(
        "¿Está seguro de que desea enviar el ensayo al Consejo Académico? Mientras esté en revisión no podrá editarlo."
      )
    ) {
      return;
    }

    setGuardando(true);

    try {
      const nuevaImagenUrl = await subirImagen();

      const slug =
        slugEnsayo ||
        `${generarSlug(titulo)}-${miembro.codigo.toLowerCase()}-u1`;

      const ahora = new Date().toISOString();

      const payload: Record<string, unknown> = {
        titulo: titulo.trim(),
        slug,
        autor_nombre: miembro.nombre,
        autor_codigo: miembro.codigo,
        nivel: miembro.nivel,
        proceso: "INV",
        unidad_slug: "unidad-1",
        tema,
        fuente_imagen: fuenteImagen.trim() || null,
        contenido,
        estado: enviarRevision
          ? "publicado"
          : estadoEnsayo === "publicado"
          ? "publicado"
          : "borrador",
        updated_at: ahora,
      };

      if (!ensayoId) {
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

          url_social: null,
          fecha_evidencia: null,
          evidencia_validada: false,

          estado_difusion: null,
          observaciones_difusion: null,
          difusion_revisada_por: null,
          fecha_revision_difusion: null,
        });
      }

      let guardado;

      if (ensayoId) {
        const { data, error } = await supabase
          .from("ensayos")
          .update(payload)
          .eq("id", ensayoId)
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

      setEnsayoId(guardado.id);
      setSlugEnsayo(guardado.slug || slug);

      setImagenUrlExistente(
        guardado.imagen_url ||
          nuevaImagenUrl ||
          imagenUrlExistente
      );

      setImagen(null);

      if (enviarRevision) {
        setEstadoEnsayo("publicado");
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
          .eq("unidad_slug", "unidad-1");

        alert(
          "Ensayo enviado al Consejo Académico para revisión."
        );

        window.location.href = "/miembros/proceso_inv";
        return;
      }

      alert(
        "Borrador guardado correctamente. Puede continuar trabajando más adelante."
      );
    } catch (err: any) {
      alert(
        "Error al guardar el ensayo: " + err.message
      );
    } finally {
      setGuardando(false);
    }
  };

  const guardarEvidencia = async () => {
    if (!miembro || !ensayoId) return;

    if (estadoRevision !== "aprobado") {
      alert(
        "El ensayo debe ser aprobado académicamente antes de divulgarlo."
      );
      return;
    }

    if (!urlSocial.trim()) {
      alert("Ingrese el enlace de la publicación.");
      return;
    }

    if (
      !urlSocial.startsWith("http://") &&
      !urlSocial.startsWith("https://")
    ) {
      alert(
        "Ingrese un enlace válido que comience con http:// o https://"
      );
      return;
    }

    const ahora = new Date().toISOString();

    const { error } = await supabase
      .from("ensayos")
      .update({
        url_social: urlSocial.trim(),
        fecha_evidencia: ahora,
        evidencia_validada: false,

        estado_difusion: "pendiente",
        observaciones_difusion: null,
        difusion_revisada_por: null,
        fecha_revision_difusion: null,

        updated_at: ahora,
      })
      .eq("id", ensayoId);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("progreso_inv")
      .update({
        porcentaje: 75,
        completada: false,
        fecha_actualizacion: ahora,
      })
      .eq("user_codigo", miembro.codigo)
      .eq("unidad_slug", "unidad-1");

    alert(
      "Su evidencia de difusión fue enviada al Consejo Académico para la aprobación final de la unidad."
    );

    window.location.href = "/miembros/proceso_inv";
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

  const difusionPendiente =
    estadoDifusion === "pendiente";

  const correccionesDifusion =
    estadoDifusion === "correcciones" ||
    estadoDifusion === "rechazado";

  const difusionAprobada =
    estadoDifusion === "aprobado" ||
    unidadCompletada;

  const puedeEditar =
    !unidadCompletada &&
    !revisionPendiente &&
    !aprobadoAcademicamente;

  if (loading) {
    return <p>Cargando información del miembro...</p>;
  }

  if (unidadCompletada || difusionAprobada) {
    return (
      <div style={{ maxWidth: "900px" }}>
        <h1>Ensayo de la Unidad 1</h1>

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
            El Consejo Académico aprobó el ensayo y
            validó su difusión. La Unidad 1 ha sido
            completada y puede continuar con la
            siguiente unidad del Nivel Investigador.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Ensayo de la Unidad 1</h1>

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
          Puede desarrollar su ensayo en varias sesiones.
        </strong>
        <br />
        Utilice <strong>Guardar borrador</strong> para
        conservar su avance y regresar posteriormente.
        Seleccione{" "}
        <strong>Enviar ensayo a revisión</strong>{" "}
        únicamente cuando considere que el trabajo está
        finalizado. Una vez enviado, quedará pendiente de
        revisión por el Consejo Académico y no podrá
        editarlo hasta que exista una resolución.
      </div>

      {ensayoId && (
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
            ⏳ Ensayo pendiente de revisión académica
          </h3>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            El ensayo fue enviado al Consejo Académico.
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
            ⚠ Ensayo devuelto para correcciones
          </h3>

          <p style={{ lineHeight: 1.7 }}>
            El Consejo Académico solicita realizar ajustes
            antes de aprobar el ensayo. Puede editar
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

      {aprobadoAcademicamente && (
        <div
          style={{
            background: "#eef7ea",
            border: "1px solid #b9d7ad",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            ✓ Ensayo aprobado académicamente
          </h3>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            El Consejo Académico aprobó su ensayo. El
            siguiente paso es divulgarlo y enviar la
            evidencia de esa publicación para la
            aprobación final de la unidad.
          </p>
        </div>
      )}

      {difusionPendiente && (
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
            ⏳ Evidencia pendiente de aprobación final
          </h3>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            Su evidencia de difusión fue enviada al
            Consejo Académico. La unidad se completará
            cuando dicha evidencia sea validada.
          </p>
        </div>
      )}

      {correccionesDifusion && (
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
            ⚠ Debe corregir la evidencia de difusión
          </h3>

          <p style={{ lineHeight: 1.7 }}>
            El Consejo Académico encontró un inconveniente
            con la evidencia presentada. Puede corregir el
            enlace y enviarlo nuevamente.
          </p>

          {observacionesDifusion && (
            <div
              style={{
                background: "white",
                border: "1px solid #e0caca",
                borderRadius: "8px",
                padding: "0.75rem",
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
              }}
            >
              <strong>
                Observaciones del Consejo:
              </strong>
              <br />
              {observacionesDifusion}
            </div>
          )}
        </div>
      )}

      <p style={{ lineHeight: 1.8 }}>
        Para completar esta unidad deberá elaborar un
        ensayo académico basado en uno de los temas
        propuestos, someterlo a revisión del Consejo
        Académico y, una vez aprobado, divulgarlo y
        presentar la evidencia correspondiente.
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
          <strong>Tema del ensayo *</strong>
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

          {TEMAS_ENSAYO_U1.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <label>
          <strong>Título del ensayo *</strong>
        </label>

        <input
          type="text"
          value={titulo}
          disabled={!puedeEditar}
          onChange={(e) =>
            setTitulo(e.target.value)
          }
          placeholder="Ingrese el título de su ensayo"
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            marginBottom: "1.5rem",
          }}
        />

        <label>
          <strong>Imagen *</strong>
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
              alt="Imagen guardada del ensayo"
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
          <strong>Fuente de la imagen *</strong>
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
          <strong>Contenido del ensayo *</strong>
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
          placeholder="Redacte aquí su ensayo..."
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
              caracteres >= 3000
                ? "green"
                : "#666",
            fontWeight: 600,
          }}
        >
          {caracteres.toLocaleString()} / 3,000
          caracteres mínimos
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
                guardarEnsayo(false)
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
                guardarEnsayo(true)
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
              Enviar ensayo a revisión
            </button>
          </div>
        )}

        {aprobadoAcademicamente &&
          slugEnsayo && (
            <div
              style={{
                marginTop: "2rem",
                padding: "1rem",
                border:
                  "1px solid #b9d7ad",
                borderRadius: "10px",
                background: "#eef7ea",
              }}
            >
              <h3>
                Divulgación del ensayo aprobado
              </h3>

              <p style={{ lineHeight: 1.7 }}>
                Publique o comparta este ensayo en
                alguna de sus redes sociales, grupo
                especializado, foro o blog. Después
                abra la publicación, seleccione la
                opción de compartir, copie su enlace
                y péguelo en la sección de evidencia.
              </p>

              <input
                type="text"
                readOnly
                value={`${window.location.origin}/ensayos/${slugEnsayo}`}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                }}
              />

			<div
			  style={{
				marginTop: "1rem",
				paddingTop: "1rem",
				borderTop: "1px solid #d7ddcf",
			  }}
			>
			  <p
				style={{
				  marginTop: 0,
				  marginBottom: "0.8rem",
				  fontWeight: 700,
				}}
			  >
				Comparta su ensayo
			  </p>

			  <p
				style={{
				  fontSize: "0.9rem",
				  lineHeight: 1.6,
				  color: "#555",
				}}
			  >
				Seleccione la red en la que desea divulgar su ensayo.
				La red social se abrirá en una nueva ventana para que
				realice la publicación. Después de publicarlo, copie el
				enlace de <strong>su publicación</strong> y regrese a
				AGENN para pegarlo como evidencia de difusión.
			  </p>

			  <div
				style={{
				  display: "flex",
				  gap: "0.75rem",
				  flexWrap: "wrap",
				  alignItems: "center",
				  marginTop: "1rem",
				}}
			  >
				{/* COPIAR ENLACE */}
				<button
				  type="button"
				  title="Copiar enlace del ensayo"
				  aria-label="Copiar enlace del ensayo"
				  onClick={async () => {
					await navigator.clipboard.writeText(
					  `${window.location.origin}/ensayos/${slugEnsayo}`
					);

					alert("Enlace del ensayo copiado.");
				  }}
				  style={{
					width: "44px",
					height: "44px",
					borderRadius: "50%",
					border: "1px solid #bbb",
					background: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				  }}
				>
				  <svg
					width="21"
					height="21"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				  >
					<rect x="9" y="9" width="13" height="13" rx="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				  </svg>
				</button>

				{/* FACEBOOK */}
				<button
				  type="button"
				  title="Compartir en Facebook"
				  aria-label="Compartir en Facebook"
				  onClick={() => {
					const url = encodeURIComponent(
					  `${window.location.origin}/ensayos/${slugEnsayo}`
					);

					window.open(
					  `https://www.facebook.com/sharer/sharer.php?u=${url}`,
					  "_blank",
					  "noopener,noreferrer"
					);
				  }}
				  style={{
					width: "44px",
					height: "44px",
					borderRadius: "50%",
					border: "none",
					background: "#1877F2",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				  }}
				>
				  <svg
					width="23"
					height="23"
					viewBox="0 0 24 24"
					fill="currentColor"
				  >
					<path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v9h4v-9h3.5l.5-4h-4V9c0-.7.3-1 1-1z" />
				  </svg>
				</button>

				{/* X */}
				<button
				  type="button"
				  title="Compartir en X"
				  aria-label="Compartir en X"
				  onClick={() => {
					const url = encodeURIComponent(
					  `${window.location.origin}/ensayos/${slugEnsayo}`
					);

					const texto = encodeURIComponent(titulo);

					window.open(
					  `https://twitter.com/intent/tweet?url=${url}&text=${texto}`,
					  "_blank",
					  "noopener,noreferrer"
					);
				  }}
				  style={{
					width: "44px",
					height: "44px",
					borderRadius: "50%",
					border: "none",
					background: "#000",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				  }}
				>
				  <svg
					width="19"
					height="19"
					viewBox="0 0 24 24"
					fill="currentColor"
				  >
					<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
				  </svg>
				</button>

				{/* LINKEDIN */}
				<button
				  type="button"
				  title="Compartir en LinkedIn"
				  aria-label="Compartir en LinkedIn"
				  onClick={() => {
					const url = encodeURIComponent(
					  `${window.location.origin}/ensayos/${slugEnsayo}`
					);

					window.open(
					  `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
					  "_blank",
					  "noopener,noreferrer"
					);
				  }}
				  style={{
					width: "44px",
					height: "44px",
					borderRadius: "50%",
					border: "none",
					background: "#0A66C2",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				  }}
				>
				  <svg
					width="21"
					height="21"
					viewBox="0 0 24 24"
					fill="currentColor"
				  >
					<path d="M5.34 3.5A2.34 2.34 0 1 1 5.34 8.18 2.34 2.34 0 0 1 5.34 3.5ZM3.3 9.7h4.08V22H3.3V9.7Zm6.62 0h3.91v1.68h.06c.54-1.03 1.87-2.12 3.85-2.12 4.12 0 4.88 2.71 4.88 6.23V22h-4.08v-5.77c0-1.38-.03-3.15-1.92-3.15-1.92 0-2.22 1.5-2.22 3.05V22H9.92V9.7Z" />
				  </svg>
				</button>

				{/* REDDIT */}
				<button
				  type="button"
				  title="Compartir en Reddit"
				  aria-label="Compartir en Reddit"
				  onClick={() => {
					const url = encodeURIComponent(
					  `${window.location.origin}/ensayos/${slugEnsayo}`
					);

					const texto = encodeURIComponent(titulo);

					window.open(
					  `https://www.reddit.com/submit?url=${url}&title=${texto}`,
					  "_blank",
					  "noopener,noreferrer"
					);
				  }}
				  style={{
					width: "44px",
					height: "44px",
					borderRadius: "50%",
					border: "none",
					background: "#FF4500",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				  }}
				>
				  <svg
					width="23"
					height="23"
					viewBox="0 0 24 24"
					fill="currentColor"
				  >
					<path d="M20.5 12.1c.1-.3.2-.6.2-.9a2 2 0 1 0-3.4 1.4c-1.4-.9-3.2-1.5-5.2-1.6l1-4.5 3.1.7a1.7 1.7 0 1 0 .3-1.2l-3.8-.8c-.3-.1-.6.1-.7.5L10.9 11c-2 .1-3.8.7-5.2 1.6a2 2 0 1 0-3.4-1.4c0 .3.1.6.2.9C1.5 13 1 14 1 15.1 1 18 5.9 20.4 12 20.4S23 18 23 15.1c0-1.1-.5-2.1-1.5-3ZM7.6 14.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm7.8 4.1c-.9.9-2.1 1.3-3.4 1.3s-2.5-.4-3.4-1.3a.6.6 0 0 1 .8-.9c.7.6 1.6 1 2.6 1s1.9-.4 2.6-1a.6.6 0 1 1 .8.9Zm1-1.3a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />
				  </svg>
				</button>

				{/* INSTAGRAM */}
				<button
				  type="button"
				  title="Copiar enlace y abrir Instagram"
				  aria-label="Copiar enlace y abrir Instagram"
				  onClick={async () => {
					await navigator.clipboard.writeText(
					  `${window.location.origin}/ensayos/${slugEnsayo}`
					);

					window.open(
					  "https://www.instagram.com/",
					  "_blank",
					  "noopener,noreferrer"
					);
				  }}
				  style={{
					width: "44px",
					height: "44px",
					borderRadius: "50%",
					border: "none",
					background:
					  "linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				  }}
				>
				  <svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				  >
					<rect
					  x="3"
					  y="3"
					  width="18"
					  height="18"
					  rx="5"
					/>
					<circle cx="12" cy="12" r="4" />
					<circle
					  cx="17.5"
					  cy="6.5"
					  r="1"
					  fill="currentColor"
					  stroke="none"
					/>
				  </svg>
				</button>
			  </div>
			</div>
            </div>
          )}

        {aprobadoAcademicamente &&
          !difusionPendiente && (
            <div
              style={{
                marginTop: "2rem",
                padding: "1rem",
                border:
                  "1px solid #ddd4c7",
                borderRadius: "10px",
                background: "#f4f1e8",
              }}
            >
              <h3>
                Evidencia de difusión
              </h3>

              <p style={{ lineHeight: 1.7 }}>
                Pegue el enlace de la publicación
                externa donde compartió el ensayo.
                Una vez enviado, el Consejo
                Académico realizará la validación
                final de la unidad.
              </p>

              <input
                type="url"
                value={urlSocial}
                onChange={(e) =>
                  setUrlSocial(e.target.value)
                }
                placeholder="https://..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                }}
              />

              <button
                type="button"
                onClick={guardarEvidencia}
              >
                Enviar evidencia para aprobación final
              </button>
            </div>
          )}
      </div>
    </div>
  );
}  