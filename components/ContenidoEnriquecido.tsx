"use client";

import { useEffect, useRef } from "react";

type Props = {
  html: string;
  className?: string;
};

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>]+)/gi;
const OMITIR = new Set(["A", "SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"]);

function separarPuntuacionFinal(valor: string) {
  let url = valor;
  let cola = "";
  while (/[.,;:!?)]$/.test(url)) {
    cola = url.slice(-1) + cola;
    url = url.slice(0, -1);
  }
  return { url, cola };
}

function convertirUrls(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodos: Text[] = [];
  let actual: Node | null;

  while ((actual = walker.nextNode())) {
    const padre = actual.parentElement;
    if (!padre || OMITIR.has(padre.tagName)) continue;
    if (actual.textContent && URL_RE.test(actual.textContent)) nodos.push(actual as Text);
    URL_RE.lastIndex = 0;
  }

  for (const nodo of nodos) {
    const texto = nodo.textContent || "";
    const frag = document.createDocumentFragment();
    let ultimo = 0;
    URL_RE.lastIndex = 0;

    for (const match of texto.matchAll(URL_RE)) {
      const inicio = match.index ?? 0;
      const bruto = match[0];
      const { url, cola } = separarPuntuacionFinal(bruto);

      if (inicio > ultimo) frag.append(document.createTextNode(texto.slice(ultimo, inicio)));

      const a = document.createElement("a");
      a.href = url.startsWith("www.") ? `https://${url}` : url;
      a.textContent = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.overflowWrap = "anywhere";
      a.style.wordBreak = "break-word";
      frag.append(a);

      if (cola) frag.append(document.createTextNode(cola));
      ultimo = inicio + bruto.length;
    }

    if (ultimo < texto.length) frag.append(document.createTextNode(texto.slice(ultimo)));
    nodo.replaceWith(frag);
  }
}

export default function ContenidoEnriquecido({ html, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) convertirUrls(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        maxWidth: "100%",
        minWidth: 0,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
