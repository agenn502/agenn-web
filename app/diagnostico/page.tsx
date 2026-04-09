"use client";

import { useEffect, useState } from "react";

type OpenState = Record<string, boolean>;

const STORAGE_KEY = "agenn_tree_state_single_open";

const styles = {
  treeBox: {
    background: "#fff",
    border: "1px solid #ddd4c7",
    borderRadius: "12px",
    padding: "1rem",
  },
  node: {
    margin: "0.8rem 0",
  },
  question: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    background: "#f8f5ef",
    border: "1px solid #ddd4c7",
    borderLeft: "6px solid #6b4f2a",
    borderRadius: "10px",
    padding: "0.9rem 1rem",
    cursor: "pointer",
    lineHeight: 1.6,
  } as React.CSSProperties,
  toggleBtn: {
    minWidth: "36px",
    height: "36px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#6b4f2a",
    color: "white",
    fontSize: "1.3rem",
    fontWeight: "bold",
    borderRadius: "8px",
    flexShrink: 0,
  } as React.CSSProperties,
  children1: {
    marginLeft: "28px",
    paddingLeft: "14px",
    borderLeft: "3px solid #d6c3a1",
    marginTop: "10px",
  },
  children2: {
    marginLeft: "28px",
    paddingLeft: "14px",
    borderLeft: "3px solid #c2a673",
    marginTop: "10px",
  },
  option: {
    margin: "10px 0",
  },
  optionLink: {
    display: "block",
    background: "#fffdf7",
    border: "1px solid #ddd4c7",
    borderLeft: "6px solid #b08a3c",
    borderRadius: "8px",
    padding: "10px 12px",
    lineHeight: 1.6,
    textDecoration: "none",
    color: "#1f1f1f",
  } as React.CSSProperties,
};

export default function DiagnosticoPage() {
  const [open, setOpen] = useState<OpenState>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOpen(JSON.parse(saved));
      } catch {
        setOpen({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  }, [open]);

  function setBranch(activeId: string, siblings: string[]) {
    setOpen((prev) => {
      const next = { ...prev };
      const isCurrentlyOpen = !!prev[activeId];

      siblings.forEach((id) => {
        next[id] = false;
      });

      next[activeId] = !isCurrentlyOpen;
      return next;
    });
  }

  function resetTree() {
    setOpen({});
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section className="section">
      <div className="container content-page">
        <h1>Exploración de perfil numismático</h1>

        <p>
          La presente herramienta tiene carácter orientativo y formativo. Su
          propósito es ayudar a reconocer distintas formas de relación con la
          numismática y la notafilia, ya sea desde el comercio, el estudio, la
          colección o una aproximación inicial no sistemática.
        </p>

        <p>
          No constituye un mecanismo formal de ingreso a la Academia ni una
          clasificación definitiva, sino una guía de autoorientación basada en
          una clave dicotómica.
        </p>

        <p style={{ fontStyle: "italic", marginBottom: "1.5rem" }}>
          A continuación encontrará pares de opciones. Seleccione, en cada caso,
          aquella con la que más se identifique, hasta llegar a un perfil
          numismático o notafílico orientativo.
        </p>

        <p style={{ marginBottom: "1.5rem" }}>
          <button className="button secondary" onClick={resetTree}>
            Reiniciar árbol
          </button>
        </p>

        <div style={styles.treeBox}>
          {/* NIVEL 1 */}
          <div style={styles.node}>
            <div
              style={styles.question}
              onClick={() => setBranch("n1", ["n1", "n7"])}
            >
              <span>
                <strong>1.</strong> Mi actividad principal en relación con
                monedas y/o billetes es la compra y venta con fines económicos.
              </span>
              <span style={styles.toggleBtn}>{open["n1"] ? "−" : "+"}</span>
            </div>

            {open["n1"] && (
              <div style={styles.children1}>
                {/* NIVEL 2 */}
                <div style={styles.node}>
                  <div
                    style={styles.question}
                    onClick={() => setBranch("n2", ["n2", "n6"])}
                  >
                    <span>
                      <strong>2.</strong> Poseo conocimiento técnico profundo
                      sobre las piezas que manejo.
                    </span>
                    <span style={styles.toggleBtn}>{open["n2"] ? "−" : "+"}</span>
                  </div>

                  {open["n2"] && (
                    <div style={styles.children2}>
                      {/* NIVEL 3 */}
                      <div style={styles.node}>
                        <div
                          style={styles.question}
                          onClick={() => setBranch("n3", ["n3", "n5"])}
                        >
                          <span>
                            <strong>3.</strong> Mi motivación es exclusivamente
                            comercial.
                          </span>
                          <span style={styles.toggleBtn}>{open["n3"] ? "−" : "+"}</span>
                        </div>

                        {open["n3"] && (
                          <div style={styles.children2}>
                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pa-com-pro">
                                <strong>4.</strong> Actúo con criterios éticos y
                                transparencia →{" "}
                                <strong>
                                  <em>Perfil A:</em> Comerciante Profesional
                                </strong>
                              </a>
                            </div>

                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pb-com-noet">
                                <strong>4'.</strong> No mantengo criterios éticos
                                consistentes →{" "}
                                <strong>
                                  <em>Perfil B:</em> Operador Comercial No Ético
                                  de Alto Conocimiento
                                </strong>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={styles.node}>
                        <div
                          style={styles.question}
                          onClick={() => setBranch("n5", ["n3", "n5"])}
                        >
                          <span>
                            <strong>3'.</strong> Mi motivación no es solo
                            comercial; también incluye estudio, investigación o
                            difusión del conocimiento.
                          </span>
                          <span style={styles.toggleBtn}>{open["n5"] ? "−" : "+"}</span>
                        </div>

                        {open["n5"] && (
                          <div style={styles.children2}>
                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pa2-com-ac">
                                <strong>5.</strong> Mantengo coherencia ética
                                entre actividad comercial y conocimiento →{" "}
                                <strong>
                                  <em>Perfil A2:</em> Comerciante con Orientación
                                  Académica
                                </strong>
                              </a>
                            </div>

                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pb2-com-doble">
                                <strong>5'.</strong> No mantengo coherencia ética
                                entre prestigio intelectual y práctica comercial →{" "}
                                <strong>
                                  <em>Perfil B2:</em> Operador de Doble Rol
                                  Académico-Comercial No Ético
                                </strong>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.node}>
                  <div
                    style={styles.question}
                    onClick={() => setBranch("n6", ["n2", "n6"])}
                  >
                    <span>
                      <strong>2'.</strong> Mi conocimiento es limitado o se
                      encuentra en formación.
                    </span>
                    <span style={styles.toggleBtn}>{open["n6"] ? "−" : "+"}</span>
                  </div>

                  {open["n6"] && (
                    <div style={styles.children2}>
                      <div style={styles.option}>
                        <a style={styles.optionLink} href="/perfiles/pc-com-form">
                          <strong>6.</strong> Me encuentro en un proceso genuino
                          de aprendizaje →{" "}
                          <strong>
                            <em>Perfil C:</em> Comerciante en Formación
                          </strong>
                        </a>
                      </div>

                      <div style={styles.option}>
                        <a style={styles.optionLink} href="/perfiles/pd-com-noesp">
                          <strong>6'.</strong> No poseo formación ni especialización
                          en el área →{" "}
                          <strong>
                            <em>Perfil D:</em> Vendedor No Especializado
                          </strong>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NIVEL 1' */}
          <div style={styles.node}>
            <div
              style={styles.question}
              onClick={() => setBranch("n7", ["n1", "n7"])}
            >
              <span>
                <strong>1'.</strong> Mi relación con monedas y/o billetes no es
                principalmente comercial, o bien el intercambio es ocasional y
                secundario.
              </span>
              <span style={styles.toggleBtn}>{open["n7"] ? "−" : "+"}</span>
            </div>

            {open["n7"] && (
              <div style={styles.children1}>
                {/* NIVEL 7 */}
                <div style={styles.node}>
                  <div
                    style={styles.question}
                    onClick={() => setBranch("n8", ["n8", "n9"])}
                  >
                    <span>
                      <strong>7.</strong> Mi motivación principal es la
                      investigación y el conocimiento histórico.
                    </span>
                    <span style={styles.toggleBtn}>{open["n8"] ? "−" : "+"}</span>
                  </div>

                  {open["n8"] && (
                    <div style={styles.children2}>
                      <div style={styles.option}>
                        <a style={styles.optionLink} href="/perfiles/pe-acad-esp">
                          <strong>8.</strong> Trabajo de forma especializada en un
                          campo delimitado →{" "}
                          <strong>
                            <em>Perfil E:</em> Numismático Especializado
                          </strong>
                        </a>
                      </div>

                      <div style={styles.option}>
                        <a style={styles.optionLink} href="/perfiles/pf-acad-amp">
                          <strong>8'.</strong> Mantengo un interés investigativo
                          amplio y comparativo →{" "}
                          <strong>
                            <em>Perfil F:</em> Investigador de Enfoque Amplio
                          </strong>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* NIVEL 7' */}
                <div style={styles.node}>
                  <div
                    style={styles.question}
                    onClick={() => setBranch("n9", ["n8", "n9"])}
                  >
                    <span>
                      <strong>7'.</strong> Mi motivación principal es reunir,
                      conservar o disfrutar las piezas, más que investigarlas.
                    </span>
                    <span style={styles.toggleBtn}>{open["n9"] ? "−" : "+"}</span>
                  </div>

                  {open["n9"] && (
                    <div style={styles.children2}>
                      {/* NIVEL 9 */}
                      <div style={styles.node}>
                        <div
                          style={styles.question}
                          onClick={() => setBranch("n10", ["n10", "n11"])}
                        >
                          <span>
                            <strong>9.</strong> Tengo un plan de colección
                            definido.
                          </span>
                          <span style={styles.toggleBtn}>{open["n10"] ? "−" : "+"}</span>
                        </div>

                        {open["n10"] && (
                          <div style={styles.children2}>
                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pg-col-cal">
                                <strong>10.</strong> Valoro especialmente la
                                calidad y conservación de las piezas →{" "}
                                <strong>
                                  <em>Perfil G:</em> Coleccionista Orientado a la
                                  Calidad
                                </strong>
                              </a>
                            </div>

                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/ph-col-comp">
                                <strong>10'.</strong> Valoro especialmente la
                                completitud de series o conjuntos →{" "}
                                <strong>
                                  <em>Perfil H:</em> Coleccionista Orientado a la
                                  Completitud
                                </strong>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* NIVEL 9' */}
                      <div style={styles.node}>
                        <div
                          style={styles.question}
                          onClick={() => setBranch("n11", ["n10", "n11"])}
                        >
                          <span>
                            <strong>9'.</strong> No tengo todavía un plan de
                            colección definido.
                          </span>
                          <span style={styles.toggleBtn}>{open["n11"] ? "−" : "+"}</span>
                        </div>

                        {open["n11"] && (
                          <div style={styles.children2}>
                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pi-trans-des">
                                <strong>11.</strong> Reconozco que debería ordenar,
                                orientar o desarrollar mejor mi colección →{" "}
                                <strong>
                                  <em>Perfil I:</em> Coleccionista en Desarrollo
                                </strong>
                              </a>
                            </div>

                            <div style={styles.option}>
                              <a style={styles.optionLink} href="/perfiles/pj-trans-acum">
                                <strong>11'.</strong> Mantengo una relación libre,
                                espontánea y no sistemática con las piezas →{" "}
                                <strong>
                                  <em>Perfil J:</em> Acumulador No Sistemático
                                </strong>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <p>
            También podés consultar la{" "}
            <a href="/perfiles">guía completa de perfiles</a>.
          </p>
        </div>
      </div>
    </section>
  );
}