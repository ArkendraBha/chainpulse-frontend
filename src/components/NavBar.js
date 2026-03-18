"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ activeCoin, onSelect }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/",             label: "Home"        },
    { href: "/app",          label: "Dashboard"   },
    { href: "/pricing",      label: "Pricing"     },
    { href: "/methodology",  label: "Methodology" },
    { href: "/track-record", label: "Track Record"},
  ];

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/70 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">

          <Link href="/" className="text-white font-semibold tracking-tight">
            ChainPulse Quant
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  pathname === link.href
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
            >
              Go Pro
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden mt-4 space-y-2 pb-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-2 py-2 text-sm rounded-lg transition-colors ${
                  pathname === link.href
                    ? "text-white bg-white/5"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="block bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold text-center mt-2"
            >
              Go Pro
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}