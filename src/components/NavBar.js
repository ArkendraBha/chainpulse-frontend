"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/app", label: "Dashboard" },
    { href: "/pricing", label: "Pricing" },
    { href: "/methodology", label: "Methodology" },
  ];

  return (
    <nav className="bg-black border-b border-zinc-800 px-8 py-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">

        {/* LOGO */}
        <Link href="/" className="text-white font-semibold tracking-tight">
          ChainPulse Quant
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-white"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="bg-white text-black px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Go Pro
          </Link>
        </div>

        {/* MOBILE HAMBURGER */}
        <button
          className="md:hidden text-gray-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden border-t border-zinc-800 mt-4 pt-4 pb-2 space-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block text-sm px-2 py-1 transition-colors ${
                pathname === link.href
                  ? "text-white"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            onClick={() => setMenuOpen(false)}
            className="block bg-white text-black px-4 py-2 rounded-md text-sm font-semibold text-center mt-2"
          >
            Go Pro
          </Link>
        </div>
      )}

    </nav>
  );
}