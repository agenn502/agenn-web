"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useParams } from "next/navigation";
import html2canvas from "html2canvas";

type TextoCertificado = {
  nivel: string;
  origen: string;

  nombreNivel: string;

  institucion: string[];

  autoridad: string;

  otorgamiento: string;

  textoAntesNivel: string;

  justificacion: string[];

  leyendaOrigen: string;
};

type Certificado = {
  id: string;
  registro: string;
  codigoMiembro: string;
  nombre: string;

  nivel:
    | "NOV"
    | "INV"
    | "NUM";

  origenAcreditacion:
    | "FORMACION"
    | "RECONOCIMIENTO";

  fechaEmision: string;
  estado: string;
  createdAt: string;

  texto: TextoCertificado;

  plantilla: string;
  esPropietario: boolean;
};

export default function CertificadoDetallePage() {
  const params = useParams();

  const registro = String(
    params?.registro || ""
  ).trim();

  const certificadoRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    certificado,
    setCertificado,
  ] =
    useState<Certificado | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    plantillaDisponible,
    setPlantillaDisponible,
  ] = useState(true);

  const [
    generandoImagen,
    setGenerandoImagen,
  ] = useState(false);

  const [
    compartiendo,
    setCompartiendo,
  ] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        setError("");

        const stored =
          localStorage.getItem(
            "user"
          );

        if (!stored) {
          window.location.href =
            "/login";
          return;
        }

        const user =
          JSON.parse(stored);

        const response =
          await fetch(
            `/api/certificados/${encodeURIComponent(
              registro
            )}`,
            {
              headers: {
                "x-user-codigo":
                  user.codigo,
              },
              cache:
                "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ||
              "No fue posible cargar el certificado."
          );
        }

        setCertificado(
          result.certificado
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el certificado."
        );
      } finally {
        setLoading(false);
      }
    };

    if (registro) {
      cargar();
    }
  }, [registro]);

  const formatearFecha = (
    fecha: string
  ) => {
    try {
      return new Intl.DateTimeFormat(
        "es-GT",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(
        new Date(fecha)
      );
    } catch {
      return fecha;
    }
  };

  const esperarImagenes =
    async (
      elemento: HTMLElement
    ) => {
      const imagenes =
        Array.from(
          elemento.querySelectorAll(
            "img"
          )
        );

      await Promise.all(
        imagenes.map(
          (imagen) =>
            new Promise<void>(
              (resolve) => {
                if (
                  imagen.complete
                ) {
                  resolve();
                  return;
                }

                imagen.onload =
                  () =>
                    resolve();

                imagen.onerror =
                  () =>
                    resolve();
              }
            )
        )
      );
    };

  const generarCanvas =
    async () => {
      if (
        !certificadoRef.current
      ) {
        throw new Error(
          "No fue posible preparar el certificado."
        );
      }

      await esperarImagenes(
        certificadoRef.current
      );

      return await html2canvas(
        certificadoRef.current,
        {
          /*
           * El certificado base ya mide
           * exactamente 1467 x 1072 px.
           *
           * Scale 2 genera una copia
           * de gran resolución para
           * compartir o imprimir.
           */
          scale: 2,

          backgroundColor:
            "#ffffff",

          useCORS: true,

          logging: false,
        }
      );
    };

  const descargarJPG =
    async () => {
      if (!certificado) {
        return;
      }

      setGenerandoImagen(true);
      setError("");

      try {
        const canvas =
          await generarCanvas();

        const dataUrl =
          canvas.toDataURL(
            "image/jpeg",
            0.96
          );

        const enlace =
          document.createElement(
            "a"
          );

        enlace.href =
          dataUrl;

        enlace.download =
          `${certificado.registro}.jpg`;

        document.body.appendChild(
          enlace
        );

        enlace.click();

        document.body.removeChild(
          enlace
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible generar la imagen del certificado."
        );
      } finally {
        setGenerandoImagen(
          false
        );
      }
    };

  const compartirCertificado =
    async () => {
      if (!certificado) {
        return;
      }

      setCompartiendo(true);
      setError("");

      try {
        const canvas =
          await generarCanvas();

        const blob =
          await new Promise<Blob | null>(
            (resolve) => {
              canvas.toBlob(
                resolve,
                "image/jpeg",
                0.96
              );
            }
          );

        if (!blob) {
          throw new Error(
            "No fue posible preparar la imagen para compartir."
          );
        }

        const archivo =
          new File(
            [blob],
            `${certificado.registro}.jpg`,
            {
              type:
                "image/jpeg",
            }
          );

        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({
            files: [
              archivo,
            ],
          })
        ) {
          await navigator.share({
            title:
              "Certificado AGENN",

            text:
              `Certificado ${certificado.registro} emitido por la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.`,

            files: [
              archivo,
            ],
          });

          return;
        }

        const url =
          URL.createObjectURL(
            blob
          );

        const enlace =
          document.createElement(
            "a"
          );

        enlace.href =
          url;

        enlace.download =
          `${certificado.registro}.jpg`;

        document.body.appendChild(
          enlace
        );

        enlace.click();

        document.body.removeChild(
          enlace
        );

        URL.revokeObjectURL(
          url
        );

        alert(
          "Este navegador no permite compartir directamente la imagen. El certificado fue descargado como JPG para que pueda compartirlo manualmente."
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "No fue posible compartir el certificado."
        );
      } finally {
        setCompartiendo(
          false
        );
      }
    };

  if (loading) {
    return (
      <div>
        Cargando certificado...
      </div>
    );
  }

  if (
    error &&
    !certificado
  ) {
    return (
      <div
        style={{
          color:
            "#8b2f2f",

          background:
            "#f8ecec",

          border:
            "1px solid #ebc8c8",

          borderRadius:
            "10px",

          padding:
            "1rem",
        }}
      >
        {error}
      </div>
    );
  }

  if (!certificado) {
    return null;
  }

  const fechaTexto =
    formatearFecha(
      certificado.fechaEmision
    );

  const fuenteClasica =
    `"Cinzel", Georgia, "Times New Roman", serif`;

  return (
    <div
      style={{
        maxWidth:
          "1500px",

        margin:
          "0 auto",
      }}
    >
      <h1
        style={{
          marginTop: 0,

          marginBottom:
            "1.5rem",
        }}
      >
        Certificado
      </h1>

      {error && (
        <div
          style={{
            marginBottom:
              "1rem",

            color:
              "#8b2f2f",

            background:
              "#f8ecec",

            border:
              "1px solid #ebc8c8",

            borderRadius:
              "10px",

            padding:
              "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          overflowX:
            "auto",

          paddingBottom:
            "1rem",
        }}
      >
        <div
          ref={
            certificadoRef
          }
          style={{
            position:
              "relative",

            /*
             * RESOLUCIÓN EXACTA
             */
            width:
              "1467px",

            height:
              "1072px",

            margin:
              "0 auto",

            background:
              "white",

            boxShadow:
              "0 4px 20px rgba(0,0,0,0.12)",

            overflow:
              "hidden",
          }}
        >
          {plantillaDisponible && (
            <img
              src={
                certificado.plantilla
              }
              alt=""
              onError={() =>
                setPlantillaDisponible(
                  false
                )
              }
              style={{
                position:
                  "absolute",

                inset: 0,

                width:
                  "1467px",

                height:
                  "1072px",

                objectFit:
                  "fill",

                pointerEvents:
                  "none",
              }}
            />
          )}

          {/* =================================================
              INSTITUCIÓN
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "326px",

              left:
                "200px",

              width:
                "1067px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "35px",

              fontWeight:
                500,

              letterSpacing:
                "1px",

              color:
                "#251d15",

              lineHeight:
                1.15,

              textTransform:
                "uppercase",
            }}
          >
            {certificado.texto.institucion.map(
              (
                linea,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  {linea}
                </div>
              )
            )}
          </div>

          {/* =================================================
              CONSEJO ACADÉMICO
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "425px",

              left:
                "250px",

              width:
                "967px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "23px",

              letterSpacing:
                "0.8px",

              color:
                "#302820",

              textTransform:
                "uppercase",
            }}
          >
            {
              certificado.texto
                .autoridad
            }
          </div>

          {/* =================================================
              OTORGA A
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "466px",

              left:
                "350px",

              width:
                "767px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "22px",

              letterSpacing:
                "1px",

              color:
                "#302820",
            }}
          >
            {
              certificado.texto
                .otorgamiento
            }
          </div>

          {/* =================================================
              NOMBRE
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "509px",

              left:
                "170px",

              width:
                "1127px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "48px",

              fontWeight:
                700,

              letterSpacing:
                "1.5px",

              color:
                "#251d15",

              lineHeight:
                1.1,

              whiteSpace:
                "nowrap",
            }}
          >
            {certificado.nombre}
          </div>

          {/* =================================================
              ACREDITA COMO
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "586px",

              left:
                "250px",

              width:
                "967px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "22px",

              letterSpacing:
                "0.8px",

              color:
                "#302820",
            }}
          >
            {
              certificado.texto
                .textoAntesNivel
            }
          </div>

          {/* =================================================
              NIVEL
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "628px",

              left:
                "150px",

              width:
                "1167px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                certificado.nivel ===
                "INV"
                  ? "47px"
                  : "49px",

              fontWeight:
                700,

              letterSpacing:
                "2px",

              color:
                "#3b2817",

              whiteSpace:
                "nowrap",
            }}
          >
            {
              certificado.texto
                .nombreNivel
            }
          </div>

          {/* =================================================
              JUSTIFICACIÓN
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "697px",

              left:
                "190px",

              width:
                "1087px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "19px",

              letterSpacing:
                "0.6px",

              color:
                "#302820",

              lineHeight:
                1.42,

              textTransform:
                "uppercase",
            }}
          >
            {certificado.texto.justificacion.map(
              (
                linea,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  {linea}
                </div>
              )
            )}
          </div>

          {/* =================================================
              TIPO DE ACREDITACIÓN
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "773px",

              left:
                "230px",

              width:
                "1007px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "20px",

              fontWeight:
                600,

              letterSpacing:
                "0.8px",

              color:
                "#302820",

              textTransform:
                "uppercase",
            }}
          >
            {
              certificado.texto
                .leyendaOrigen
            }
          </div>

          {/* =================================================
              FECHA
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "827px",

              left:
                "300px",

              width:
                "867px",

              textAlign:
                "center",

              fontFamily:
                fuenteClasica,

              fontSize:
                "18px",

              color:
                "#302820",
            }}
          >
            Emitido en Guatemala,
            el {fechaTexto}.
          </div>

          {/* =================================================
              REGISTRO
              Última línea elevada aprox. 1 cm respecto
              de la distribución anterior.
              ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top:
                "860px",

              left:
                "300px",

              width:
                "867px",

              textAlign:
                "center",

              fontFamily:
                "Arial, sans-serif",

              fontSize:
                "16px",

              color:
                "#504a44",

              letterSpacing:
                "0.5px",
            }}
          >
            Registro institucional:{" "}
            <strong>
              {
                certificado
                  .registro
              }
            </strong>
          </div>

          {/* =================================================
              CERTIFICADO ANULADO
              ================================================= */}

          {certificado.estado !==
            "vigente" && (
            <div
              style={{
                position:
                  "absolute",

                inset: 0,

                display:
                  "grid",

                placeItems:
                  "center",

                pointerEvents:
                  "none",
              }}
            >
              <div
                style={{
                  transform:
                    "rotate(-25deg)",

                  fontSize:
                    "100px",

                  fontWeight:
                    800,

                  color:
                    "rgba(140,0,0,0.18)",

                  border:
                    "8px solid rgba(140,0,0,0.18)",

                  padding:
                    "0.15em 0.4em",

                  textTransform:
                    "uppercase",
                }}
              >
                {
                  certificado
                    .estado
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ACCIONES
          ===================================================== */}

      <div
        style={{
          display:
            "flex",

          gap:
            "0.8rem",

          flexWrap:
            "wrap",

          marginTop:
            "1.25rem",
        }}
      >
        <button
          type="button"
          disabled={
            generandoImagen ||
            compartiendo
          }
          onClick={
            descargarJPG
          }
          style={{
            background:
              "#6b6f1a",

            color:
              "white",

            border:
              "none",

            borderRadius:
              "8px",

            padding:
              "0.85rem 1.2rem",

            cursor:
              generandoImagen ||
              compartiendo
                ? "not-allowed"
                : "pointer",

            fontWeight:
              700,

            opacity:
              generandoImagen ||
              compartiendo
                ? 0.7
                : 1,
          }}
        >
          {generandoImagen
            ? "Generando JPG..."
            : "Descargar como JPG"}
        </button>

        <button
          type="button"
          disabled={
            generandoImagen ||
            compartiendo
          }
          onClick={
            compartirCertificado
          }
          style={{
            background:
              "#4d371c",

            color:
              "white",

            border:
              "none",

            borderRadius:
              "8px",

            padding:
              "0.85rem 1.2rem",

            cursor:
              generandoImagen ||
              compartiendo
                ? "not-allowed"
                : "pointer",

            fontWeight:
              700,

            opacity:
              generandoImagen ||
              compartiendo
                ? 0.7
                : 1,
          }}
        >
          {compartiendo
            ? "Preparando..."
            : "Compartir certificado"}
        </button>
      </div>

      <div
        style={{
          marginTop:
            "1.5rem",

          background:
            "white",

          border:
            "1px solid #ddd4c7",

          borderRadius:
            "12px",

          padding:
            "1rem 1.25rem",
        }}
      >
        <p
          style={{
            margin:
              "0.2rem 0",
          }}
        >
          <strong>
            Registro:
          </strong>{" "}
          {
            certificado.registro
          }
        </p>

        <p
          style={{
            margin:
              "0.2rem 0",
          }}
        >
          <strong>
            Fecha de emisión:
          </strong>{" "}
          {fechaTexto}
        </p>

        <p
          style={{
            margin:
              "0.2rem 0",
          }}
        >
          <strong>
            Estado:
          </strong>{" "}
          {
            certificado.estado
          }
        </p>
      </div>
    </div>
  );
}