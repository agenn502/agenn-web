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

export default function EnsayoUnidad1Page() {
  const [tema, setTema] = useState("");
  const [titulo, setTitulo] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [fuenteImagen, setFuenteImagen] = useState("");
  const [contenido, setContenido] = useState("");

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlSocial, setUrlSocial] = useState("");
  const [publicado, setPublicado] = useState(false);

  const [estadoRevision, setEstadoRevision] = useState("");
  const [observacionesRevision, setObservacionesRevision] = useState("");
  const [slugEnsayo, setSlugEnsayo] = useState("");
  const [unidadCompletada, setUnidadCompletada] = useState(false);

  useEffect(() => {
    const cargarMiembro = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(stored);

      const { data, error } = await supabase
        .from("miembros")
        .select("codigo, nombre, nivel")
        .eq("codigo", user.codigo)
        .maybeSingle();

      if (error || !data) {
        alert("No se pudo cargar la información del miembro.");
        setLoading(false);
        return;
      }

      setMiembro(data as Miembro);

      const { data: ensayoExistente } = await supabase
        .from("ensayos")
        .select("*")
        .eq("autor_codigo", data.codigo)
        .eq("unidad_slug", "unidad-1")
        .in("estado", ["borrador", "publicado"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ensayoExistente) {
        setTema(ensayoExistente.tema || "");
        setTitulo(ensayoExistente.titulo || "");
        setContenido(ensayoExistente.contenido || "");
        setFuenteImagen(ensayoExistente.fuente_imagen || "");
        setUrlSocial(ensayoExistente.url_social || "");
        setEstadoRevision(ensayoExistente.estado_revision || "");
        setObservacionesRevision(
          ensayoExistente.observaciones_revision || ""
        );

        if (ensayoExistente.estado === "publicado") {
          setPublicado(true);
        }
      }
	  setSlugEnsayo(ensayoExistente.slug || "");
      setLoading(false);
	  const { data: progresoUnidad } = await supabase
		  .from("progreso_inv")
		  .select("completada")
		  .eq("user_codigo", data.codigo)
		  .eq("unidad_slug", "unidad-1")
		  .maybeSingle();

		if (progresoUnidad?.completada) {
		  setUnidadCompletada(true);
		}
    };

    cargarMiembro();
  }, []);

  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };

      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(maxWidth / img.width, 1);

        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen."));
              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          0.75
        );
      };

      img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));

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
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AGENN-INV-U1-${miembro?.codigo || "USER"}-${random}`;
  };

  const subirImagen = async () => {
    if (!imagen || !miembro) return null;

    const nombreArchivo = `unidad-1/${miembro.codigo}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("ensayos")
      .upload(nombreArchivo, imagen, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("ensayos")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  };

  const guardarEnsayo = async (estado: "borrador" | "publicado") => {
    if (!miembro) return;

    if (!tema || !titulo || !contenido) {
      alert("Complete tema, título y contenido.");
      return;
    }

    if (estado === "publicado") {
      if (!imagen && !publicado) {
        alert("Debe seleccionar una imagen.");
        return;
      }

      if (!fuenteImagen.trim()) {
        alert("Debe indicar la fuente de la imagen.");
        return;
      }

      if (contenido.length < 3000) {
        alert("El ensayo debe tener al menos 3,000 caracteres.");
        return;
      }
    }

    try {
      const imagenUrl = await subirImagen();
      const slug = `${generarSlug(titulo)}-${miembro.codigo.toLowerCase()}-u1`;
	  setSlugEnsayo(slug);
      const payload: any = {
        titulo,
        slug,
        autor_nombre: miembro.nombre,
        autor_codigo: miembro.codigo,
        nivel: miembro.nivel,
        proceso: "INV",
        unidad_slug: "unidad-1",
        tema,
        fuente_imagen: fuenteImagen,
        contenido,
        codigo_verificacion: generarCodigoVerificacion(),
        estado,
        updated_at: new Date().toISOString(),
      };

      if (imagenUrl) {
        payload.imagen_url = imagenUrl;
      }

      if (estado === "publicado") {
        payload.estado_revision = null;
        payload.observaciones_revision = null;
        payload.evidencia_validada = false;
        payload.url_social = null;
        payload.fecha_evidencia = null;
        payload.revisado_por = null;
        payload.fecha_revision = null;
      }

      const { error } = await supabase.from("ensayos").upsert([payload], {
        onConflict: "slug",
      });

      if (error) throw new Error(error.message);

      if (estado === "publicado") {
        await supabase
          .from("progreso_inv")
          .update({
            porcentaje: 50,
            completada: false,
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq("user_codigo", miembro.codigo)
          .eq("unidad_slug", "unidad-1");

        setPublicado(true);
        setEstadoRevision("");
        setObservacionesRevision("");
        setUrlSocial("");

        alert("Ensayo publicado correctamente.");
        window.location.href = "/miembros/proceso_inv/unidad-1/ensayo";
      } else {
        alert("Borrador guardado correctamente.");
      }
    } catch (err: any) {
      alert("Error al guardar el ensayo: " + err.message);
    }
  };

  const guardarEvidencia = async () => {
    if (!miembro) return;

    if (!urlSocial.trim()) {
      alert("Ingrese el enlace de la publicación.");
      return;
    }

    if (
      !urlSocial.startsWith("http://") &&
      !urlSocial.startsWith("https://")
    ) {
      alert("Ingrese un enlace válido que comience con http:// o https://");
      return;
    }

    const { error: ensayoError } = await supabase
      .from("ensayos")
      .update({
        url_social: urlSocial.trim(),
        evidencia_validada: false,
        estado_revision: "pendiente",
        observaciones_revision: null,
        fecha_evidencia: new Date().toISOString(),
      })
      .eq("autor_codigo", miembro.codigo)
      .eq("unidad_slug", "unidad-1")
      .eq("estado", "publicado");

    if (ensayoError) {
      alert(ensayoError.message);
      return;
    }

    alert("Tu evidencia fue enviada al Consejo Académico para revisión.");
    window.location.href = "/miembros/proceso_inv";
  };

  const insertarFormato = (antes: string, despues = "") => {
    const textarea = document.getElementById(
      "contenido-ensayo"
    ) as HTMLTextAreaElement | null;

    if (!textarea) return;

    const inicio = textarea.selectionStart;
    const fin = textarea.selectionEnd;
    const seleccionado = contenido.substring(inicio, fin);

    const nuevoTexto =
      contenido.substring(0, inicio) +
      antes +
      seleccionado +
      despues +
      contenido.substring(fin);

    setContenido(nuevoTexto);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(inicio + antes.length, fin + antes.length);
    }, 0);
  };

  if (loading) return <p>Cargando información del miembro...</p>;
  
  if (unidadCompletada) {
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Ensayo de la Unidad 1</h1>

      <div
        style={{
          background: "#eef7ea",
          border: "1px solid #b9d7ad",
          borderRadius: "10px",
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>✅ Unidad completada</h3>

        <p style={{ lineHeight: 1.7, marginBottom: 0 }}>
          Esta unidad ya fue aprobada por el Consejo Académico.
          Puede continuar con la siguiente unidad del proceso de ascenso.
        </p>
      </div>
    </div>
  );
}
  
  return (
    <div style={{ maxWidth: "900px" }}>
      <h1>Ensayo de la Unidad 1</h1>
	  {unidadCompletada && (
		  <div
			style={{
			  background: "#eef7ea",
			  border: "1px solid #b9d7ad",
			  borderRadius: "10px",
			  padding: "1rem",
			  marginBottom: "1rem",
			}}
		  >
			<h3 style={{ marginTop: 0 }}>Unidad completada</h3>
			<p style={{ marginBottom: 0, lineHeight: 1.7 }}>
			  Esta unidad ya fue aprobada por el Consejo Académico. Puede continuar con
			  la siguiente unidad del proceso de ascenso.
			</p>
		  </div>
		)}
      {titulo && (
        <div
          style={{
            background: "#eef7ea",
            border: "1px solid #b9d7ad",
            padding: "0.75rem",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          Se ha cargado automáticamente un ensayo guardado anteriormente.
        </div>
      )}

      {estadoRevision === "rechazado" && (
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
            ⚠️ Ensayo devuelto para corrección
          </h3>

          <p style={{ lineHeight: 1.7 }}>
            El Consejo Académico revisó su evidencia y encontró aspectos que
            deben corregirse antes de aprobar esta unidad.
          </p>

          <div
            style={{
              background: "white",
              border: "1px solid #e0caca",
              borderRadius: "8px",
              padding: "0.75rem",
              marginTop: "0.75rem",
            }}
          >
            <strong>Observaciones del Consejo:</strong>

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

          <p
            style={{
              marginTop: "0.75rem",
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            Corrija el ensayo y elimine la publicación que hizo en la red social.
			Al haber hecho las correcciones y publicado nuevamente el ensayo en la
			plataforma, publíquelo otra vez en la red social para poder pegar el
			nuevo enlace de evidencia.
          </p>
        </div>
      )}

      <p style={{ lineHeight: 1.8 }}>
        Para completar esta unidad deberá redactar y publicar un ensayo
        académico basado en uno de los temas propuestos.
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
          onChange={(e) => setTema(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <option value="">Seleccione un tema</option>

          {TEMAS_ENSAYO_U1.map((item) => (
            <option key={item} value={item}>
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
          onChange={(e) => setTitulo(e.target.value)}
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

        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];

            if (!file) {
              setImagen(null);
              return;
            }

            const imagenComprimida = await comprimirImagen(file);
            setImagen(imagenComprimida);
          }}
          style={{
            width: "100%",
            marginTop: "0.5rem",
            marginBottom: "1rem",
          }}
        />

        {imagen && (
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Imagen optimizada: {(imagen.size / 1024).toFixed(1)} KB
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
          Si la imagen es suya, escriba en la fuente:
          <strong> "Imagen propia"</strong>. Si no, indique la referencia
          (autor, año) o el enlace desde donde fue obtenida.
        </p>

        <label>
          <strong>Fuente de la imagen *</strong>
        </label>

        <input
          type="text"
          value={fuenteImagen}
          onChange={(e) => setFuenteImagen(e.target.value)}
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

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={() => insertarFormato("**", "**")}>
            Negrita
          </button>

          <button type="button" onClick={() => insertarFormato("*", "*")}>
            Cursiva
          </button>

          <button type="button" onClick={() => insertarFormato("- ")}>
            Viñeta
          </button>

          <button type="button" onClick={() => insertarFormato("1. ")}>
            Lista numerada
          </button>
        </div>

        <textarea
          id="contenido-ensayo"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
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
            color: caracteres >= 3000 ? "green" : "#666",
            fontWeight: 600,
          }}
        >
          {caracteres.toLocaleString()} / 3,000 caracteres mínimos
        </div>

		{publicado && estadoRevision !== "rechazado" && slugEnsayo && (
		  <div
			style={{
			  marginTop: "2rem",
			  padding: "1rem",
			  border: "1px solid #b9d7ad",
			  borderRadius: "10px",
			  background: "#eef7ea",
			}}
		  >
			<h3>Compartir ensayo publicado</h3>

			<p style={{ lineHeight: 1.7 }}>
			  Copie el enlace público del ensayo y publíquelo en una red social, grupo
			  especializado, foro o blog. Luego copie el enlace de esa publicación y
			  péguelo abajo como evidencia de difusión.
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

			<button
			  type="button"
			  onClick={() => {
				navigator.clipboard.writeText(
				  `${window.location.origin}/ensayos/${slugEnsayo}`
				);
				alert("Enlace del ensayo copiado.");
			  }}
			>
			  Copiar enlace del ensayo
			</button>
		  </div>
		)}
		
        {publicado && estadoRevision !== "rechazado" && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "10px",
              background: "#f4f1e8",
            }}
          >
            <h3>Evidencia de difusión</h3>

            <p style={{ lineHeight: 1.7 }}>
              Publique el ensayo en una red social, grupo especializado, foro o
              blog y pegue aquí el enlace.
            </p>

            <input
              type="url"
              value={urlSocial}
              onChange={(e) => setUrlSocial(e.target.value)}
              placeholder="https://..."
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "1rem",
              }}
            />

            <button type="button" onClick={guardarEvidencia}>
              Enviar evidencia para revisión
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <button type="button" onClick={() => guardarEnsayo("borrador")}>
            Guardar borrador
          </button>

          <button type="button" onClick={() => guardarEnsayo("publicado")}>
            Publicar ensayo
          </button>
        </div>
      </div>
    </div>
  );
}