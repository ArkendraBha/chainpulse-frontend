"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// ─── Tier config ───────────────────────────────────────────────
const TIER_CONFIG = {
  pro: {
    label: "Pro",
    dot: "bg-emerald-400",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  institutional: {
    label: "Institutional",
    dot: "bg-purple-400",
    border: "border-purple-500/25",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  essential: {
    label: "Essential",
    dot: "bg-blue-400",
    border: "border-blue-500/25",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  free: {
    label: "Free",
    dot: "bg-zinc-400",
    border: "border-zinc-500/25",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
  },
};

// ─── Tier Badge Component ──────────────────────────────────────
function TierBadge({ tier, subscriptionStatus }) {
  if (!tier) return null;

  const normalizedTier = tier.toLowerCase();
  const config = TIER_CONFIG[normalizedTier] || TIER_CONFIG.free;

  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const label =
    normalizedTier === "free"
      ? config.label
      : isActive
      ? `${config.label} Active`
      : `${config.label} Inactive`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.border} ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}

// ─── Nav Actions (right side) ──────────────────────────────────
function NavActions({ tier, subscriptionStatus }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("cp_token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cp_token");
    localStorage.removeItem("cp_email");
    localStorage.removeItem("cp_token_created");
    localStorage.removeItem("cplastvisit");
    localStorage.removeItem("cptourv2");
    Object.keys(localStorage)
      .filter((k) => k.startsWith("cpdashboard"))
      .forEach((k) => localStorage.removeItem(k));
    document.cookie = "cp_token=; path=/; max-age=0";
    window.location.href = "/";
  };

  if (isLoggedIn) {
    return (
      <>
  // ── Fetch user status on mount ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("cp_token");
    setIsLoggedIn(!!token);

    if (!token) {
      setTier(null);
      setSubscriptionStatus(null);
      return;
    }

    let cancelled = false;

    async function fetchUserStatus() {
      try {
        const data = await apiClient("/user-status");
        if (cancelled) return;

        const userTier = (data.tier || "free").toLowerCase();
        setTier(userTier);
        setSubscriptionStatus(data.subscription_status || null);
      } catch (err) {
        if (cancelled) return;
        console.error("NavBar: failed to fetch user status", err);
        setTier("free");
        setSubscriptionStatus(null);
      }
    }

    fetchUserStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Logout handler ────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("cp_token");
    localStorage.removeItem("cp_email");
    localStorage.removeItem("cp_token_created");
    localStorage.removeItem("cplastvisit");
    localStorage.removeItem("cptourv2");
    Object.keys(localStorage)
      .filter((k) => k.startsWith("cpdashboard"))
      .forEach((k) => localStorage.removeItem(k));
    document.cookie = "cp_token=; path=/; max-age=0";
    window.location.href = "/";
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/app", label: "Dashboard" },
    { href: "/pricing", label: "Pricing" },
    { href: "/methodology", label: "Methodology" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              ChainPulse
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === href
                    ? "text-white bg-white/8"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <NavActions
              tier={tier}
              subscriptionStatus={subscriptionStatus}
            />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
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
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 py-4 space-y-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  pathname === href
                    ? "text-white bg-white/8"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/5 space-y-2">
              {/* Mobile tier badge */}
              {isLoggedIn && (
                <div className="flex items-center gap-2 px-4 py-1">
                  <TierBadge
                    tier={tier}
                    subscriptionStatus={subscriptionStatus}
                  />
                </div>
              )}

              {isLoggedIn ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="block px-4 py-2.5 text-sm text-zinc-500 hover:text-white transition-colors text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/pricing"
                  onClick={() => setMenuOpen(false)}
                  className="block bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold text-center"
                >
                  Start free trial
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}