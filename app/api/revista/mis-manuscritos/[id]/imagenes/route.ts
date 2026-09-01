import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function esErrorTransitorio(mensaje: string) {
  return /fetch failed|network|timeout|timed out|socket|econnreset/i.test(
    mensaje,
  );
}

function normalizarCodigo(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

async function obtenerId(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function obtenerAutorEditable(req: NextRequest, manuscritoId: number) {
  const codigo = normalizarCodigo(req.headers.get("x-user-codigo"));

  if (!codigo) {
    return {
      ok: false as const,
      status: 401,
      error: "No se indicó el código del usuario.",
    };
  }

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError) throw new Error(miembroError.message);

  if (!miembro) {
    return {
      ok: false as const,
      status: 401,
      error: "No se encontró el miembro.",
    };
  }

  const { data: manuscrito, error: manuscritoError } = await supabaseServer
    .from("manuscritos_editoriales")
    .select("id,autor_miembro_id,estado")
    .eq("id", manuscritoId)
    .eq("autor_miembro_id", miembro.id)
    .maybeSingle();

  if (manuscritoError) throw new Error(manuscritoError.message);

  if (!manuscrito) {
    return {
      ok: false as const,
      status: 404,
      error: "No se encontró un manuscrito de su autoría.",
    };
  }

  if (!["BORRADOR", "CORRECCIONES"].includes(manuscrito.estado)) {
    return {
      ok: false as const,
      status: 409,
      error:
        "Las imágenes solo pueden modificarse mientras el manuscrito es un borrador o se atienden correcciones editoriales.",
    };
  }

  return { ok: true as const, miembro, manuscrito };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const manuscritoId = await obtenerId(context);

    if (!manuscritoId) {
      return NextResponse.json(
        { ok: false, error: "El manuscrito solicitado no es válido." },
        { status: 400 },
      );
    }

    const acceso = await obtenerAutorEditable(req, manuscritoId);

    if (!acceso.ok) {
      return NextResponse.json(
        { ok: false, error: acceso.error },
        { status: acceso.status },
      );
    }

    const body = await req.json();
    const accion = String(body.accion || "")
      .trim()
      .toUpperCase();

    if (accion === "PREPARAR") {
      const { count, error: countError } = await supabaseServer
        .from("manuscrito_imagenes")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("manuscrito_id", manuscritoId)
        .is("version_id", null);

      if (countError) throw new Error(countError.message);

      if ((count || 0) > 0) {
        return NextResponse.json({
          ok: true,
          preparado: false,
        });
      }

      const { data: ultimaVersion, error: versionError } = await supabaseServer
        .from("manuscrito_versiones")
        .select("id")
        .eq("manuscrito_id", manuscritoId)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError) throw new Error(versionError.message);

      if (!ultimaVersion) {
        return NextResponse.json({
          ok: true,
          preparado: false,
        });
      }

      const { data: imagenes, error: imagenesError } = await supabaseServer
        .from("manuscrito_imagenes")
        .select("storage_path,url,titulo,fuente,orden")
        .eq("manuscrito_id", manuscritoId)
        .eq("version_id", ultimaVersion.id)
        .order("orden", { ascending: true });

      if (imagenesError) throw new Error(imagenesError.message);

      if ((imagenes || []).length > 0) {
        const { error: insertarError } = await supabaseServer
          .from("manuscrito_imagenes")
          .insert(
            (imagenes || []).map((imagen: any) => ({
              manuscrito_id: manuscritoId,
              version_id: null,
              storage_path: imagen.storage_path || null,
              url: imagen.url,
              titulo: imagen.titulo || "",
              fuente: imagen.fuente || "",
              orden: imagen.orden,
            })),
          );

        if (insertarError) throw new Error(insertarError.message);
      }

      return NextResponse.json({
        ok: true,
        preparado: true,
      });
    }

    if (accion === "ACTUALIZAR") {
      const imagenId = Number(body.imagen_id);
      const titulo = String(body.titulo || "").trim();
      const fuente = String(body.fuente || "").trim();

      if (!Number.isInteger(imagenId) || imagenId <= 0) {
        return NextResponse.json(
          { ok: false, error: "La imagen seleccionada no es válida." },
          { status: 400 },
        );
      }

      const { error } = await supabaseServer
        .from("manuscrito_imagenes")
        .update({
          titulo,
          fuente,
          updated_at: new Date().toISOString(),
        })
        .eq("id", imagenId)
        .eq("manuscrito_id", manuscritoId)
        .is("version_id", null);

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "La acción solicitada no es válida." },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "Error PATCH /api/revista/mis-manuscritos/[id]/imagenes:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar las imágenes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const manuscritoId = await obtenerId(context);

    if (!manuscritoId) {
      return NextResponse.json(
        { ok: false, error: "El manuscrito solicitado no es válido." },
        { status: 400 },
      );
    }

    const acceso = await obtenerAutorEditable(req, manuscritoId);

    if (!acceso.ok) {
      return NextResponse.json(
        { ok: false, error: acceso.error },
        { status: acceso.status },
      );
    }

    const formData = await req.formData();
    const archivo = formData.get("archivo");
    const titulo = String(formData.get("titulo") || "").trim();
    const fuente = String(formData.get("fuente") || "").trim();

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No se recibió una imagen válida." },
        { status: 400 },
      );
    }

    if (
      archivo.type !== "image/jpeg" &&
      archivo.type !== "image/png" &&
      archivo.type !== "image/webp"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "La imagen debe estar en formato JPG, PNG o WEBP.",
        },
        { status: 400 },
      );
    }

    if (archivo.size > 220 * 1024) {
      return NextResponse.json(
        { ok: false, error: "La imagen supera el límite editorial de 220 KB." },
        { status: 400 },
      );
    }

    const { data: ultimaOrden } = await supabaseServer
      .from("manuscrito_imagenes")
      .select("orden")
      .eq("manuscrito_id", manuscritoId)
      .is("version_id", null)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    const orden = Number(ultimaOrden?.orden || 0) + 1;

    const nombreSeguro =
      archivo.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .slice(-80) || "imagen.jpg";

    const storagePath = `revista/manuscrito-${manuscritoId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${nombreSeguro}`;

    const buffer = Buffer.from(await archivo.arrayBuffer());

    let uploadError: { message: string } | null = null;

    // La ruta permanece igual durante todos los intentos. Con upsert, si
    // Supabase recibió el archivo pero se perdió la respuesta, el reintento
    // confirma la misma imagen en vez de generar un archivo huérfano.
    for (let intento = 0; intento < 4; intento += 1) {
      const resultado = await supabaseServer.storage
        .from("ensayos")
        .upload(storagePath, buffer, {
          contentType: archivo.type,
          upsert: true,
          cacheControl: "3600",
        });

      uploadError = resultado.error;
      if (!uploadError) break;

      if (!esErrorTransitorio(uploadError.message) || intento === 3) break;
      await esperar(450 * 2 ** intento);
    }

    if (uploadError && esErrorTransitorio(uploadError.message)) {
      const ultimoSeparador = storagePath.lastIndexOf("/");
      const carpeta = storagePath.slice(0, ultimoSeparador);
      const nombreArchivo = storagePath.slice(ultimoSeparador + 1);
      const comprobacion = await supabaseServer.storage
        .from("ensayos")
        .list(carpeta, { search: nombreArchivo, limit: 2 });

      if (
        !comprobacion.error &&
        comprobacion.data?.some((item) => item.name === nombreArchivo)
      ) {
        uploadError = null;
      }
    }

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabaseServer.storage
      .from("ensayos")
      .getPublicUrl(storagePath);

    const url = publicData.publicUrl;

    let creada: any = null;
    let insertError: { message: string } | null = null;

    for (let intento = 0; intento < 4; intento += 1) {
      const resultado = await supabaseServer
        .from("manuscrito_imagenes")
        .insert({
          manuscrito_id: manuscritoId,
          version_id: null,
          storage_path: storagePath,
          url,
          titulo,
          fuente,
          orden,
        })
        .select(
          "id,manuscrito_id,version_id,storage_path,url,titulo,fuente,orden,created_at,updated_at",
        )
        .single();

      creada = resultado.data;
      insertError = resultado.error;
      if (!insertError) break;

      if (!esErrorTransitorio(insertError.message)) break;

      // La inserción pudo completarse aunque se perdiera su respuesta.
      const comprobacion = await supabaseServer
        .from("manuscrito_imagenes")
        .select(
          "id,manuscrito_id,version_id,storage_path,url,titulo,fuente,orden,created_at,updated_at",
        )
        .eq("manuscrito_id", manuscritoId)
        .eq("storage_path", storagePath)
        .maybeSingle();

      if (comprobacion.data) {
        creada = comprobacion.data;
        insertError = null;
        break;
      }

      if (intento < 3) await esperar(450 * 2 ** intento);
    }

    if (insertError) {
      await supabaseServer.storage.from("ensayos").remove([storagePath]);

      throw new Error(insertError.message);
    }

    return NextResponse.json({
      ok: true,
      imagen: creada,
    });
  } catch (error) {
    console.error(
      "Error POST /api/revista/mis-manuscritos/[id]/imagenes:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible subir la imagen.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const manuscritoId = await obtenerId(context);

    if (!manuscritoId) {
      return NextResponse.json(
        { ok: false, error: "El manuscrito solicitado no es válido." },
        { status: 400 },
      );
    }

    const acceso = await obtenerAutorEditable(req, manuscritoId);

    if (!acceso.ok) {
      return NextResponse.json(
        { ok: false, error: acceso.error },
        { status: acceso.status },
      );
    }

    const body = await req.json();
    const imagenId = Number(body.imagen_id);

    if (!Number.isInteger(imagenId) || imagenId <= 0) {
      return NextResponse.json(
        { ok: false, error: "La imagen seleccionada no es válida." },
        { status: 400 },
      );
    }

    let imagen: { id: number; storage_path: string | null } | null = null;
    let imagenError: { message: string } | null = null;

    for (let intento = 0; intento < 4; intento += 1) {
      const resultado = await supabaseServer
        .from("manuscrito_imagenes")
        .select("id,storage_path")
        .eq("id", imagenId)
        .eq("manuscrito_id", manuscritoId)
        .is("version_id", null)
        .maybeSingle();

      imagen = resultado.data;
      imagenError = resultado.error;
      if (!imagenError) break;
      if (!esErrorTransitorio(imagenError.message) || intento === 3) break;
      await esperar(350 * 2 ** intento);
    }

    if (imagenError) throw new Error(imagenError.message);

    if (!imagen) {
      return NextResponse.json({ ok: true, ya_eliminada: true });
    }

    let deleteError: { message: string } | null = null;

    for (let intento = 0; intento < 4; intento += 1) {
      const resultado = await supabaseServer
        .from("manuscrito_imagenes")
        .delete()
        .eq("id", imagenId)
        .eq("manuscrito_id", manuscritoId)
        .is("version_id", null);

      deleteError = resultado.error;
      if (!deleteError) break;
      if (!esErrorTransitorio(deleteError.message)) break;

      // La eliminación pudo completarse aunque se perdiera la respuesta.
      const comprobacion = await supabaseServer
        .from("manuscrito_imagenes")
        .select("id")
        .eq("id", imagenId)
        .eq("manuscrito_id", manuscritoId)
        .is("version_id", null)
        .maybeSingle();

      if (!comprobacion.error && !comprobacion.data) {
        deleteError = null;
        break;
      }

      if (intento < 3) await esperar(350 * 2 ** intento);
    }

    if (deleteError) throw new Error(deleteError.message);

    if (imagen.storage_path) {
      const { count, error: referenciasError } = await supabaseServer
        .from("manuscrito_imagenes")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("storage_path", imagen.storage_path);

      if (!referenciasError && (count || 0) === 0) {
        await supabaseServer.storage
          .from("ensayos")
          .remove([imagen.storage_path]);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Error DELETE /api/revista/mis-manuscritos/[id]/imagenes:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible eliminar la imagen.",
      },
      { status: 500 },
    );
  }
}
