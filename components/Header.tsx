"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setOpen(false);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    { href: "/", label: "Inicio", key: "inicio" },
    { href: "/academia", label: "La Academia", key: "academia" },
    { href: "/publicaciones", label: "Publicaciones", key: "publicaciones" },
    { href: "/enlaces", label: "Enlaces", key: "enlaces" },
    { href: "/miembro", label: "Afiliación", key: "afiliacion" },
    { href: "/diagnostico", label: "Perfil numismático", key: "perfil" },
    { href: "/contacto", label: "Contacto", key: "contacto" },
  ];

  const desktopLinkStyle = (key: string): React.CSSProperties => ({
    color: "white",
    textDecoration: "none",
    paddingBottom: "4px",
    borderBottom:
      hovered === key
        ? "2px solid rgba(255,255,255,0.85)"
        : "2px solid transparent",
    transition: "border-color 0.2s ease, opacity 0.2s ease",
    opacity: hovered === null || hovered === key ? 1 : 0.88,
  });

  return (
    <header
      style={{
        backgroundColor: "#4f5f2f",
        borderBottom: "1px solid #3e4b24",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        padding: "1.2rem 0",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? "0.6rem" : "1rem",
          position: "relative",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            gap: isMobile ? "0.2rem" : "0.6rem",
            textDecoration: "none",
          }}
        >
          <img
            src="/logo-agenn.png"
            alt="AGENN"
            style={{
              width: isMobile ? "100px" : "72px",
              height: "auto",
              display: "block",
              objectFit: "contain",
              filter: "drop-shadow(0 0 6px rgba(255,255,255,0.75))",
            }}
          />

          <span
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: isMobile ? "1.1rem" : "1.2rem",
              letterSpacing: "0.06em",
            }}
          >
            AGENN
          </span>
        </Link>

        {isMobile ? (
          <>
            <button
              onClick={() => setOpen(!open)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Abrir menú"
            >
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  width: "24px",
                }}
              >
                <span style={{ height: "2.5px", background: "white" }} />
                <span style={{ height: "2.5px", background: "white" }} />
                <span style={{ height: "2.5px", background: "white" }} />
              </span>
            </button>

            {open && (
              <nav
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  left: 0,
                  backgroundColor: "#4f5f2f",
                  border: "1px solid #3e4b24",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                }}
              >
                {menuItems.map((item, index) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    style={{
                      color: "white",
                      textDecoration: "none",
                      display: "block",
                      textAlign: "center",
                      padding: "0.9rem",
                      borderBottom:
                        index === menuItems.length - 1
                          ? "none"
                          : "1px solid rgba(255,255,255,0.08)",
                    }}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </>
        ) : (
          <nav
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                style={desktopLinkStyle(item.key)}
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered(null)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}