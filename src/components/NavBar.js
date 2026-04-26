"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// ─── Tier config ───────────────────────────────────────────────
const TIER_CONFIG = {
  pro: {
    label: "Pro Active",
    dot: "bg-emerald-400",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  institutional: {
    label: "Institutional Active",
    dot: "bg-purple-400",
    border: "border-purple-500/25",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  essential: {
    label: "Essential Active",
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

// Tiers that get WebSocket live streaming
const WS_ELIGIBLE_TIERS = ["pro", "institutional"];

// ─── Tier Badge Component ──────────────────────────────────────
function TierBadge({ tier, subscriptionStatus }) {
  // Only show badge for logged-in users with a known tier
  if (!tier) return null;

  const normalizedTier = tier.toLowerCase();
  const config = TIER_CONFIG[normalizedTier] || TIER_CONFIG.free;

  // Only show "Active" suffix if subscription is actually active
  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const label =
    normalizedTier === "free"
      ? config.label
      : isActive
      ? config.label
      : `${normalizedTier.charAt(0).toUpperCase() + normalizedTier.slice(1)} Inactive`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.border} ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}

// ─── WebSocket Status Indicator ────────────────────────────────
function WsIndicator({ wsStatus }) {
  // wsStatus: "connected" | "reconnecting" | "disconnected" | null
  if (!wsStatus || wsStatus === "disconnected") return null;

  if (wsStatus === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Live
      </span>
    );
  }

  if (wsStatus === "reconnecting") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Reconnecting…
      </span>
    );
  }

  return null;
}

// ─── Nav Actions (right side) ──────────────────────────────────
function NavActions({ tier, subscriptionStatus, wsStatus }) {
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
        <WsIndicator wsStatus={wsStatus} />
        <TierBadge tier={tier} subscriptionStatus={subscriptionStatus} />
        <Link
          href="/profile"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Account
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          Logout
        </button>
      </>
    );
  }

  return (
    <Link
      href="/pricing"
      className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-zinc-100 transition-all hover:-translate-y-[1px] hover:shadow-lg"
    >
      Start free trial
    </Link>
  );
}

// ─── Main NavBar ───────────────────────────────────────────────
export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // User status state
  const [tier, setTier] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // WebSocket state — only used for WS-eligible tiers
  const [wsStatus, setWsStatus] = useState(null); // null | "connected" | "reconnecting" | "disconnected"
  const wsRef = useRef(null);
  const wsReconnectTimer = useRef(null);
  const wsReconnectAttempts = useRef(0);
  const MAX_WS_RECONNECT_ATTEMPTS = 5;

  // ── Fetch user status on mount ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("cp_token");
    setIsLoggedIn(!!token);

    if (!token) {
      setTier(null);
      setSubscriptionStatus(null);
      setWsStatus(null);
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
        // On error, default to free — don't show Pro badge
        setTier("free");
        setSubscriptionStatus(null);
      }
    }

    fetchUserStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── WebSocket connection — only for eligible tiers ────────────
  const connectWebSocket = useCallback(() => {
    // Guard: only connect for pro/institutional
    if (!WS_ELIGIBLE_TIERS.includes(tier)) {
      setWsStatus(null);
      return;
    }

    const token = localStorage.getItem("cp_token");
    if (!token) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      "wss://your-backend.onrender.com/ws/prices";

    setWsStatus("reconnecting");

    try {
      const ws = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        wsReconnectAttempts.current = 0;
      };

      ws.onclose = () => {
        wsRef.current = null;

        // Only attempt reconnect if tier is still eligible
        if (wsReconnectAttempts.current < MAX_WS_RECONNECT_ATTEMPTS) {
          setWsStatus("reconnecting");
          const delay = Math.min(
            1000 * 2 ** wsReconnectAttempts.current,
            30000
          );
          wsReconnectTimer.current = setTimeout(() => {
            wsReconnectAttempts.current += 1;
            connectWebSocket();
          }, delay);
        } else {
          setWsStatus("disconnected");
        }
      };

      ws.onerror = () => {
        // onerror is always followed by onclose, so let onclose handle reconnect
      };
    } catch (err) {
      console.error("NavBar: WebSocket connection error", err);
      setWsStatus("disconnected");
    }
  }, [tier]);

  useEffect(() => {
    // Only start WS when tier is known and eligible
    if (tier && WS_ELIGIBLE_TIERS.includes(tier)) {
      connectWebSocket();
    } else {
      // Not eligible — tear down any existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus(null);
    }

    return () => {
      // Cleanup on unmount or tier change
      clearTimeout(wsReconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [tier, connectWebSocket]);

  // ── Logout handler ────────────────────────────────────────────
  const handleLogout = () => {
    // Close WebSocket before clearing tokens
    clearTimeout(wsReconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
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
              wsStatus={wsStatus}
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
              {/* Mobile tier badge + WS indicator */}
              {isLoggedIn && (
                <div className="flex items-center gap-2 px-4 py-1">
                  <WsIndicator wsStatus={wsStatus} />
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