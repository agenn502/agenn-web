"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "Inicio", key: "inicio" },
    { href: "/academia", label: "La Academia", key: "academia" },
    { href: "/publicaciones", label: "Publicaciones", key: "publicaciones" },
    { href: "/revista", label: "Revista", key: "revista" },
    { href: "/enlaces", label: "Enlaces", key: "enlaces" },
    { href: "/miembro", label: "Afiliación", key: "afiliacion" },
    { href: "/diagnostico", label: "Perfil numismático", key: "perfil" },
    { href: "/contacto", label: "Contacto", key: "contacto" },
    { href: "/login", label: "🔒 Ingreso miembros", key: "login" },
  ];

  return (
    <header className="site-header-custom">
      <div className="container header-inner">
        <Link href="/" className="brand-link" onClick={() => setOpen(false)}>
          <img src="/logo-agenn.png" alt="AGENN" className="brand-logo" />
          <span className="brand-name">AGENN</span>
        </Link>

        <button
          onClick={() => setOpen((estado) => !estado)}
          className="hamburger-button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          type="button"
        >
          <span className="hamburger-lines">
            <span />
            <span />
            <span />
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Navegación principal">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="header-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {open && (
        <nav className="mobile-nav-panel" aria-label="Navegación móvil">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="mobile-nav-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}