"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "Inicio", key: "inicio" },
    { href: "/academia", label: "La Academia", key: "academia" },
    { href: "/publicaciones", label: "Publicaciones", key: "publicaciones" },
    { href: "/enlaces", label: "Enlaces", key: "enlaces" },
    { href: "/miembro", label: "Afiliación", key: "afiliacion" },
    { href: "/diagnostico", label: "Perfil numismático", key: "perfil" },
    { href: "/contacto", label: "Contacto", key: "contacto" },
  ];

  return (
    <header className="site-header-custom">
      <div className="container header-inner">
        <Link href="/" className="brand-link">
          <img
            src="/logo-agenn.png"
            alt="AGENN"
            className="brand-logo"
          />
          <span className="brand-name">AGENN</span>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          className="hamburger-button"
          aria-label="Abrir menú"
          type="button"
        >
          <span className="hamburger-lines">
            <span />
            <span />
            <span />
          </span>
        </button>

        <nav className={`desktop-nav ${open ? "mobile-open" : ""}`}>
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="header-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}