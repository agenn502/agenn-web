"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PerfilFinal from "@/components/PerfilFinal";

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
};

export default function DiagnosticoPage() {
  const [open, setOpen] = useState<OpenState>({});
  const searchParams = useSearchParams();
  const modoAdmision = searchParams.get("origen") === "admision";

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
          No constituye una clasificación definitiva. En el contexto del proceso
          de admisión, el resultado sirve para conocer el punto de partida del
          solicitante, pero no determina por sí solo su ingreso ni el nivel que le
          será asignado.
        </p>

        {modoAdmision && (
          <div
            style={{
              background: "#eef6e9",
              border: "1px solid #cfe3c4",
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <strong>Proceso de admisión</strong>
            <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
              Al identificar el perfil con el que más se relaciona, aparecerá la
              opción para continuar con la solicitud de ingreso a la Academia.
            </p>
          </div>
        )}

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
                              <PerfilFinal
                                codigo="A"
                                nombre="Comerciante Profesional"
                                href="/perfiles/pa-com-pro"
                                texto="4. Actúo con criterios éticos y transparencia"
                                modoAdmision={modoAdmision}
                              />
                            </div>

                            <div style={styles.option}>
                              <PerfilFinal
                                codigo="B"
                                nombre="Operador Comercial No Ético de Alto Conocimiento"
                                href="/perfiles/pb-com-noet"
                                texto="4'. No mantengo criterios éticos consistentes"
                                modoAdmision={modoAdmision}
                              />
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
                              <PerfilFinal
                                codigo="A2"
                                nombre="Comerciante con Orientación Académica"
                                href="/perfiles/pa2-com-ac"
                                texto="5. Mantengo coherencia ética entre actividad comercial y conocimiento"
                                modoAdmision={modoAdmision}
                              />
                            </div>

                            <div style={styles.option}>
                              <PerfilFinal
                                codigo="B2"
                                nombre="Operador de Doble Rol Académico-Comercial No Ético"
                                href="/perfiles/pb2-com-doble"
                                texto="5'. No mantengo coherencia ética entre prestigio intelectual y práctica comercial"
                                modoAdmision={modoAdmision}
                              />
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
                        <PerfilFinal
                          codigo="C"
                          nombre="Comerciante en Formación"
                          href="/perfiles/pc-com-form"
                          texto="6. Me encuentro en un proceso genuino de aprendizaje"
                          modoAdmision={modoAdmision}
                        />
                      </div>

                      <div style={styles.option}>
                        <PerfilFinal
                          codigo="D"
                          nombre="Vendedor No Especializado"
                          href="/perfiles/pd-com-noesp"
                          texto="6'. No poseo formación ni especialización en el área"
                          modoAdmision={modoAdmision}
                        />
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
                        <PerfilFinal
                          codigo="E"
                          nombre="Numismático Especializado"
                          href="/perfiles/pe-acad-esp"
                          texto="8. Trabajo de forma especializada en un campo delimitado"
                          modoAdmision={modoAdmision}
                        />
                      </div>

                      <div style={styles.option}>
                        <PerfilFinal
                          codigo="F"
                          nombre="Investigador de Enfoque Amplio"
                          href="/perfiles/pf-acad-amp"
                          texto="8'. Mantengo un interés investigativo amplio y comparativo"
                          modoAdmision={modoAdmision}
                        />
                      </div>
                    </div>
                  )}
                </div>

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
                              <PerfilFinal
                                codigo="G"
                                nombre="Coleccionista Orientado a la Calidad"
                                href="/perfiles/pg-col-cal"
                                texto="10. Valoro especialmente la calidad y conservación de las piezas"
                                modoAdmision={modoAdmision}
                              />
                            </div>

                            <div style={styles.option}>
                              <PerfilFinal
                                codigo="H"
                                nombre="Coleccionista Orientado a la Completitud"
                                href="/perfiles/ph-col-comp"
                                texto="10'. Valoro especialmente la completitud de series o conjuntos"
                                modoAdmision={modoAdmision}
                              />
                            </div>
                          </div>
                        )}
                      </div>

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
                              <PerfilFinal
                                codigo="I"
                                nombre="Coleccionista en Desarrollo"
                                href="/perfiles/pi-trans-des"
                                texto="11. Reconozco que debería ordenar, orientar o desarrollar mejor mi colección"
                                modoAdmision={modoAdmision}
                              />
                            </div>

                            <div style={styles.option}>
                              <PerfilFinal
                                codigo="J"
                                nombre="Acumulador No Sistemático"
                                href="/perfiles/pj-trans-acum"
                                texto="11'. Mantengo una relación libre, espontánea y no sistemática con las piezas"
                                modoAdmision={modoAdmision}
                              />
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
            También puede consultar la <a href="/perfiles">guía completa de perfiles</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
