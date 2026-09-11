import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ValorConsejo = boolean | string | number | null | undefined;

function esValorVerdadero(valor: ValorConsejo) {
  return (
    valor === true ||
    valor === 1 ||
    valor === "1" ||
    valor === "true" ||
    valor === "TRUE"
  );
}

export async function obtenerPermisosBiblioteca(req: NextRequest) {
  const codigo = String(req.headers.get("x-user-codigo") || "")
    .trim()
    .toUpperCase();

  if (!codigo) return null;

  const { data: usuario, error: usuarioError } = await supabaseServer
    .from("users")
    .select("codigo,nivel,nombre,consejo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (usuarioError || !usuario) return null;

  const { data: miembro, error: miembroError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel")
    .eq("codigo", codigo)
    .maybeSingle();

  if (miembroError || !miembro) return null;

  const [ceResultado, gestorResultado] = await Promise.all([
    supabaseServer
      .from("consejo_editorial_miembros")
      .select("id,rol")
      .eq("miembro_id", miembro.id)
      .eq("activo", true)
      .maybeSingle(),
    supabaseServer
      .from("biblioteca_gestores")
      .select("id")
      .eq("miembro_id", miembro.id)
      .eq("activo", true)
      .maybeSingle(),
  ]);

  if (ceResultado.error) throw new Error(ceResultado.error.message);
  if (gestorResultado.error) throw new Error(gestorResultado.error.message);

  const esConsejoAcademico = esValorVerdadero(usuario.consejo);
  const esConsejoEditorial = Boolean(ceResultado.data);
  const esGestor = Boolean(gestorResultado.data);

  return {
    codigo,
    miembroId: Number(miembro.id),
    nombre: miembro.nombre,
    nivel: miembro.nivel,
    esConsejoAcademico,
    esConsejoEditorial,
    esGestor,
    puedeGestionar: esConsejoAcademico || esConsejoEditorial || esGestor,
    puedeAprobar: esConsejoAcademico || esConsejoEditorial,
    puedeDesignar: esConsejoAcademico || esConsejoEditorial,
  };
}