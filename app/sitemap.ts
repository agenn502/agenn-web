import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const BASE_URL = "https://agenn-web.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  const paginasEstaticas: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: ahora,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/academia`,
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/publicaciones`,
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/revista`,
      lastModified: ahora,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/revista/numeros`,
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/revista/autores`,
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/revista/acerca`,
      lastModified: ahora,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/revista/normas`,
      lastModified: ahora,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contacto`,
      lastModified: ahora,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  try {
    const { data: numeros, error: numerosError } =
      await supabaseServer
        .from("revistas")
        .select("id,anio,numero,slug,fecha_publicacion")
        .eq("estado", "PUBLICADA")
        .order("anio", { ascending: false })
        .order("numero", { ascending: false });

    if (numerosError) {
      console.error(
        "No fue posible obtener los números para sitemap:",
        numerosError.message
      );

      return paginasEstaticas;
    }

    if (!numeros || numeros.length === 0) {
      return paginasEstaticas;
    }

    const numerosSitemap: MetadataRoute.Sitemap =
      numeros.map((numero) => ({
        url: `${BASE_URL}/revista/${numero.anio}/${numero.numero}`,
        lastModified: numero.fecha_publicacion
          ? new Date(numero.fecha_publicacion)
          : ahora,
        changeFrequency: "yearly",
        priority: 0.9,
      }));

    const idsRevistas = numeros.map((numero) =>
      Number(numero.id)
    );

    const { data: articulos, error: articulosError } =
      await supabaseServer
        .from("revista_articulos")
        .select("revista_id,localizador")
        .in("revista_id", idsRevistas);

    if (articulosError) {
      console.error(
        "No fue posible obtener los artículos para sitemap:",
        articulosError.message
      );

      return [
        ...paginasEstaticas,
        ...numerosSitemap,
      ];
    }

    const numeroPorId = new Map(
      numeros.map((numero) => [
        Number(numero.id),
        numero,
      ])
    );

    const articulosSitemap: MetadataRoute.Sitemap = [];

    for (const articulo of articulos || []) {
      const numero = numeroPorId.get(
        Number(articulo.revista_id)
      );

      if (!numero || !articulo.localizador) {
        continue;
      }

      articulosSitemap.push({
        url: `${BASE_URL}/revista/${numero.anio}/${numero.numero}/${articulo.localizador}`,
        lastModified: numero.fecha_publicacion
          ? new Date(numero.fecha_publicacion)
          : ahora,
        changeFrequency: "yearly",
        priority: 0.8,
      });
    }

    return [
      ...paginasEstaticas,
      ...numerosSitemap,
      ...articulosSitemap,
    ];
  } catch (error) {
    console.error(
      "Error al generar sitemap.xml:",
      error
    );

    return paginasEstaticas;
  }
}