"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Cropper from "react-easy-crop";
import { getCroppedImg, Area } from "@/app/lib/cropImage";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean;
};

export default function BiografiaPage() {
  const [user, setUser] = useState<User | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [nivel, setNivel] = useState("");
  const [profesion, setProfesion] = useState("");
  const [bio, setBio] = useState("");
  const [publicaciones, setPublicaciones] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [imagenTemporal, setImagenTemporal] = useState("");
  const [mostrarEditor, setMostrarEditor] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const usuario = JSON.parse(stored) as User;
      setUser(usuario);

      const codigoUsuario = String(usuario.codigo || "").trim().toUpperCase();

      const { data, error } = await supabase
        .from("miembros")
        .select("*")
        .eq("codigo", codigoUsuario)
        .maybeSingle();

      if (error) {
        alert("Error al cargar la biografía: " + error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setCodigo(data.codigo || "");
        setNombre(data.nombre || "");
        setNivel(data.nivel || "");
        setProfesion(data.profesion || "");
        setBio(data.bio || "");
        setPublicaciones(data.publicaciones || "");
        setFotoUrl(data.foto_url || "");
        setFechaNacimiento(data.fecha_nacimiento || "");
      } else {
        const nuevoRegistro = {
          codigo: codigoUsuario,
          nombre: String(usuario.nombre || "").trim(),
          nivel: String(usuario.nivel || "").trim().toUpperCase(),
          profesion: "",
          bio: "",
          publicaciones: "",
          foto_url: "",
          fecha_nacimiento: null,
        };

        const { error: upsertError } = await supabase
          .from("miembros")
          .upsert([nuevoRegistro], { onConflict: "codigo" });

        if (upsertError) {
          alert("No se pudo crear la ficha del miembro: " + upsertError.message);
          setLoading(false);
          return;
        }

        setCodigo(codigoUsuario);
        setNombre(String(usuario.nombre || "").trim());
        setNivel(String(usuario.nivel || "").trim().toUpperCase());
        setProfesion("");
        setBio("");
        setPublicaciones("");
        setFotoUrl("");
        setFechaNacimiento("");
      }

      setLoading(false);
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    if (!mostrarEditor || !editorRef.current) return;

    const updateSize = () => {
      if (!editorRef.current) return;
      const rect = editorRef.current.getBoundingClientRect();
      setCropSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(editorRef.current);

    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [mostrarEditor]);

  const guardarCambios = async () => {
    if (!user) return;

    setGuardando(true);

    const { error } = await supabase
      .from("miembros")
      .update({
        nombre,
        profesion,
        bio,
        publicaciones,
        foto_url: fotoUrl,
        fecha_nacimiento: fechaNacimiento || null,
      })
      .eq("codigo", user.codigo);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("Cambios guardados");
    }

    setGuardando(false);
  };

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const manejarSeleccionFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setImagenTemporal(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSize(null);
    setMostrarEditor(true);
  };

  const guardarFotoRecortada = async () => {
    if (!user || !imagenTemporal || !croppedAreaPixels) return;

    try {
      setSubiendoFoto(true);

      const croppedBlob = await getCroppedImg(imagenTemporal, croppedAreaPixels);
      const nombreArchivo = `${user.codigo}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("miembros-fotos")
        .upload(nombreArchivo, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        alert("Error al subir la foto: " + uploadError.message);
        setSubiendoFoto(false);
        return;
      }

      const { data } = supabase.storage
        .from("miembros-fotos")
        .getPublicUrl(nombreArchivo);

      const publicUrl = data.publicUrl;

      setFotoUrl(publicUrl);

      const { error: updateError } = await supabase
        .from("miembros")
        .update({ foto_url: publicUrl })
        .eq("codigo", user.codigo);

      if (updateError) {
        alert(
          "La foto subió, pero no se pudo guardar en la base de datos: " +
            updateError.message
        );
      } else {
        alert("Foto guardada correctamente");
        setMostrarEditor(false);
        setImagenTemporal("");
      }
    } catch (error) {
      alert("No se pudo recortar la imagen");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const nombreNivel: Record<string, string> = {
    NUM: "Académico Numerario",
    INV: "Académico Investigador",
    NOV: "Académico Novicio",
    ASP: "Aspirante",
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
        Biografía personal
      </h1>

      <p>
        <strong>Código:</strong> {codigo}
      </p>
      <p>
        <strong>Nivel:</strong> {nombreNivel[nivel] || nivel}
      </p>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <div
          style={{
            position: "relative",
            width: 220,
            aspectRatio: "818 / 1082",
            background: "#eee",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <img
            src={fotoUrl || "/placeholder-miembro.jpg"}
            alt="Foto"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
          <img
            src="/marcos/marco-miembro.png"
            alt="Marco"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <input type="file" accept="image/*" onChange={manejarSeleccionFoto} />
        </div>
      </div>

      {mostrarEditor && (
        <div
          style={{
            marginBottom: 24,
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "16px",
            background: "white",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Ajustar fotografía</h2>

          <div
            ref={editorRef}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "360px",
              aspectRatio: "818 / 1082",
              margin: "0 auto",
              background: "#222",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
              }}
            >
              <Cropper
                image={imagenTemporal}
                crop={crop}
                zoom={zoom}
                aspect={818 / 1082}
                cropSize={cropSize ?? undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
                restrictPosition={false}
                classes={{
                  cropAreaClassName: "crop-area-hidden",
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.45)",
                pointerEvents: "none",
                zIndex: 15,
              }}
            />

            <img
              src="/marcos/marco-miembro.png"
              alt="Marco guía"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                zIndex: 20,
              }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label>
              Zoom:
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: "100%", marginTop: 8 }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              onClick={guardarFotoRecortada}
              disabled={subiendoFoto}
              style={{
                background: "#6b6f1a",
                color: "#fff",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                borderRadius: "6px",
              }}
            >
              {subiendoFoto ? "Guardando foto..." : "Guardar foto"}
            </button>

            <button
              onClick={() => {
                setMostrarEditor(false);
                setImagenTemporal("");
              }}
              style={{
                background: "#ccc",
                color: "#222",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                borderRadius: "6px",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label>Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Fecha de nacimiento</label>
        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Profesión</label>
        <input
          value={profesion}
          onChange={(e) => setProfesion(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Biografía</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ width: "100%", padding: 8, minHeight: 120, marginTop: 4 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Publicaciones (una por línea)</label>
        <textarea
          value={publicaciones}
          onChange={(e) => setPublicaciones(e.target.value)}
          style={{ width: "100%", padding: 8, minHeight: 120, marginTop: 4 }}
        />
      </div>

      <button
        onClick={guardarCambios}
        disabled={guardando}
        style={{
          background: "#6b6f1a",
          color: "#fff",
          padding: "10px 20px",
          border: "none",
          cursor: "pointer",
          borderRadius: "6px",
        }}
      >
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}