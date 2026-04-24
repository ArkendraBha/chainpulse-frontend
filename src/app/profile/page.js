"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("cp_token") : null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/app");
      return;
    }

    fetch(`${BACKEND}/user-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setUser(d);
        setLoading(false);
      })
      .catch(() => {
        router.push("/app");
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("cp_token");
    localStorage.removeItem("cp_email");
    localStorage.removeItem("cp_token_created");
    localStorage.removeItem("cplastvisit");
    localStorage.removeItem("cplasttoast");
    localStorage.removeItem("cptourv2");
    // Clear all dashboard caches
    Object.keys(localStorage)
      .filter((k) => k.startsWith("cpdashboard"))
      .forEach((k) => localStorage.removeItem(k));
    // Clear auth cookie
    document.cookie = "cp_token=; path=/; max-age=0";
    router.push("/");
  };

  const TIER_STYLES = {
    free:          { color: "text-zinc-400",   border: "border-zinc-700",   bg: ""                      },
    essential:     { color: "text-blue-400",   border: "border-blue-700/40",  bg: "bg-blue-950/20"      },
    pro:           { color: "text-emerald-400",border: "border-emerald-700/40",bg: "bg-emerald-950/20"  },
    institutional: { color: "text-purple-400", border: "border-purple-700/40", bg: "bg-purple-950/20"   },
  };

  const tier = user?.tier || "free";
  const ts = TIER_STYLES[tier] || TIER_STYLES.free;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#080809" }}>
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen py-16 px-6" style={{ backgroundColor: "#080809" }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Account</h1>
            <p className="text-sm text-zinc-600 mt-1">Manage your ChainPulse subscription</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>

        {/* Tier card */}
        <div
          className={`rounded-2xl border ${ts.border} ${ts.bg} p-6 space-y-4`}
          style={{ backgroundColor: ts.bg ? undefined : "#0f0f10" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Current Plan</div>
              <div className={`text-2xl font-bold capitalize ${ts.color}`}>
                {tier === "free" ? "Free" : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </div>
            </div>
            <span className={`text-[10px] px-3 py-1 rounded-full border font-semibold uppercase tracking-wide ${ts.color} ${ts.border} ${ts.bg}`}>
              {user?.is_pro ? "Active" : "Free Tier"}
            </span>
          </div>

          {!user?.is_pro && (
            <a
              href="/pricing"
              className="block w-full text-center bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              Upgrade to Essential — $29/mo
            </a>
          )}

          {user?.is_pro && tier !== "institutional" && (
            <a
              href="/pricing"
              className="block w-full text-center border border-white/10 text-zinc-400 py-2.5 rounded-xl text-sm hover:border-white/20 hover:text-white transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              Upgrade Plan
            </a>
          )}
        </div>

        {/* Account details */}
        <div className="rounded-2xl border border-white/5 p-6 space-y-4" style={{ backgroundColor: "#0f0f10" }}>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Account Details</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-zinc-500">Email</span>
              <span className="text-sm text-zinc-300 font-mono">{user?.email || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-zinc-500">Subscription</span>
              <span className={`text-sm font-medium capitalize ${user?.is_pro ? "text-emerald-400" : "text-zinc-500"}`}>
                {user?.is_pro ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-zinc-500">Plan</span>
              <span className={`text-sm font-semibold capitalize ${ts.color}`}>{tier}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl border border-white/5 p-6 space-y-3" style={{ backgroundColor: "#0f0f10" }}>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4">Actions</div>

          <a
            href="/app"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Open Dashboard</span>
            <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <button
            onClick={() => {
              fetch(`${BACKEND}/request-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user?.email }),
              });
              alert("A fresh login link has been sent to your email.");
            }}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Refresh Login Link</span>
            <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <a
            href="[billing.stripe.com](https://billing.stripe.com/p/login/test)"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Manage Billing</span>
            <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-rose-500/10 hover:border-rose-500/30 transition-colors group"
            style={{ backgroundColor: "rgba(239,68,68,0.03)" }}
          >
            <span className="text-sm text-rose-500/70 group-hover:text-rose-400 transition-colors">Sign Out</span>
            <svg className="w-4 h-4 text-rose-500/40 group-hover:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-900/20 p-6 space-y-3" style={{ backgroundColor: "rgba(239,68,68,0.03)" }}>
          <div className="text-[10px] text-red-500/50 uppercase tracking-widest">Support</div>
          <p className="text-xs text-zinc-600">
            To cancel your subscription, manage billing above or email{" "}
            <a href="mailto:support@chainpulse.pro" className="text-zinc-400 hover:text-white">
              support@chainpulse.pro
            </a>
          </p>
        </div>

      </div>
    </main>
  );
}
