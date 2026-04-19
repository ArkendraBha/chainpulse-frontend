"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

const FOUNDER_EMAILS = [
  "arkendra.bhattacharya@gmail.com" // Replace with your actual email
];

// ─────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("cptoken") : null;
}

async function adminFetch(path, opts = {}) {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${BACKEND}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 403) throw new Error("Not authorized");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "text-emerald-400" }) {
  return (
    <div
      className="rounded-xl border border-zinc-800/60 p-5 space-y-1"
      style={{ backgroundColor: "#111113" }}
    >
      <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value ?? "—"}</div>
      {sub && <div className="text-xs text-zinc-600">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TIER BADGE
// ─────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const styles = {
    free: "border-zinc-700 text-zinc-400",
    essential: "border-blue-700/60 text-blue-400 bg-blue-950/30",
    pro: "border-emerald-700/60 text-emerald-400 bg-emerald-950/30",
    institutional: "border-purple-700/60 text-purple-400 bg-purple-950/30",
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide ${
        styles[tier] || styles.free
      }`}
    >
      {tier}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// USER ROW
// ─────────────────────────────────────────────────────────
function UserRow({ user, onTierChange, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(user.tier || "free");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleTierChange = async (newTier) => {
    setLoading(true);
    try {
      await onTierChange(user.email, newTier);
      setSelectedTier(newTier);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(user.email);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <tr className="border-b border-zinc-800/40 hover:bg-white/[0.015] transition-colors">
      <td className="px-4 py-3 text-sm text-zinc-200 font-mono max-w-[200px] truncate">
        {user.email}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {user.name || "—"}
      </td>
      <td className="px-4 py-3">
        <TierBadge tier={user.tier || "free"} />
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500">{joined}</td>
      <td className="px-4 py-3 text-xs text-zinc-500">
        {user.discipline_score != null ? `${user.discipline_score}` : "—"}
      </td>
      <td className="px-4 py-3">
        <select
          value={selectedTier}
          onChange={(e) => handleTierChange(e.target.value)}
          disabled={loading}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
        >
          {["free", "essential", "pro", "institutional"].map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={loading}
            className="text-xs text-rose-500 hover:text-rose-400 border border-rose-500/30 hover:border-rose-400/50 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
          >
            Delete
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-xs text-rose-400 border border-rose-500/50 px-2 py-1 rounded-lg disabled:opacity-40"
            >
              {loading ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-zinc-400 border border-zinc-600 px-2 py-1 rounded-lg"
            >
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  // Quick upgrade
  const [quickEmail, setQuickEmail] = useState("");
  const [quickTier, setQuickTier] = useState("essential");
  const [quickStatus, setQuickStatus] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  // Regime data
  const [regimeData, setRegimeData] = useState(null);

  // ── Authorization check ──
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/app?admin_redirect=true");
      return;
    }
    // Verify token by checking user info
    adminFetch("/user-info", {})
      .then((data) => {
        if (FOUNDER_EMAILS.includes(data.email)) {
          setAuthorized(true);
        } else {
          router.push("/app");
        }
      })
      .catch(() => {
        // Fallback: try to check via dashboard endpoint
        adminFetch("/dashboard?coin=BTC")
          .then((data) => {
            // If we can access it, we're logged in — check tier
            if (data.stack?.tier === "institutional" || FOUNDER_EMAILS.length === 0) {
              setAuthorized(true);
            } else {
              router.push("/app");
            }
          })
          .catch(() => router.push("/app"));
      })
      .finally(() => setChecking(false));
  }, [router]);

  // ── Load stats ──
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminFetch("/admin/stats");
      setStats(data);
    } catch {
      // Fallback: compute from users
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Load users ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        limit: LIMIT,
        offset: page * LIMIT,
      });
      if (search) params.set("search", search);
      if (tierFilter !== "all") params.set("tier", tierFilter);

      const data = await adminFetch(`/admin/users?${params}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      // Endpoint may not exist — show empty state
      setUsers([]);
      setTotal(0);
    } finally {
      setUsersLoading(false);
    }
  }, [search, tierFilter, page]);

  // ── Load regime overview ──
  const loadRegimeData = useCallback(async () => {
    try {
      const data = await adminFetch("/dashboard?coin=BTC");
      setRegimeData(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadStats();
    loadUsers();
    loadRegimeData();
  }, [authorized, loadStats, loadUsers, loadRegimeData]);

  // Search debounce
  useEffect(() => {
    if (!authorized) return;
    const t = setTimeout(() => {
      setPage(0);
      loadUsers();
    }, 350);
    return () => clearTimeout(t);
  }, [search, tierFilter, authorized, loadUsers]);

  // ── Tier change ──
  const handleTierChange = async (email, tier) => {
    await adminFetch(
      `/admin/users/set-tier?email=${encodeURIComponent(email)}&tier=${tier}`,
      { method: "POST" }
    );
    await loadStats();
  };

  // ── Delete user ──
  const handleDelete = async (email) => {
    await adminFetch(`/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    setUsers((prev) => prev.filter((u) => u.email !== email));
    setTotal((t) => t - 1);
    await loadStats();
  };

  // ── Quick upgrade ──
  const handleQuickUpgrade = async () => {
    if (!quickEmail.trim()) return;
    setQuickLoading(true);
    setQuickStatus("Upgrading...");
    try {
      await adminFetch(
        `/admin/users/set-tier?email=${encodeURIComponent(quickEmail.trim())}&tier=${quickTier}`,
        { method: "POST" }
      );
      setQuickStatus(`✓ ${quickEmail.trim()} → ${quickTier}`);
      setQuickEmail("");
      await loadStats();
      await loadUsers();
    } catch (e) {
      setQuickStatus(`✗ ${e.message}`);
    } finally {
      setQuickLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ── Self-upgrade (founder access) ──
  const grantSelfAccess = async () => {
    const token = getToken();
    if (!token) return;
    // Decode email from JWT
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const email = payload.sub || payload.email;
      if (email) {
        await handleTierChange(email, "institutional");
        setQuickStatus(`✓ Self-access granted to ${email}`);
      }
    } catch {
      setQuickStatus("✗ Could not decode token — use quick upgrade instead");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#080809" }}>
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  const tier_labels = {
    free: { color: "text-zinc-400", bg: "bg-zinc-800" },
    essential: { color: "text-blue-400", bg: "bg-blue-900/40" },
    pro: { color: "text-emerald-400", bg: "bg-emerald-900/40" },
    institutional: { color: "text-purple-400", bg: "bg-purple-900/40" },
  };

  return (
    <main
      className="min-h-screen text-white pb-20"
      style={{ backgroundColor: "#080809" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-md"
        style={{ backgroundColor: "rgba(8,8,9,0.9)" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white">ChainPulse</span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500 uppercase tracking-widest">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/app"
              className="text-xs text-zinc-500 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-lg"
            >
              ← Dashboard
            </a>
            <button
              onClick={grantSelfAccess}
              className="text-xs text-emerald-400 border border-emerald-700/40 bg-emerald-950/20 px-3 py-1.5 rounded-lg hover:bg-emerald-950/40 transition-colors"
            >
              Grant Self Access
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Page title ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
              Founder Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">ChainPulse Admin</h1>
          <p className="text-sm text-zinc-500">
            User management · Tier control · Revenue overview
          </p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800/60 p-5 h-24 skeleton-shimmer"
              />
            ))
          ) : (
            <>
              <StatCard
                label="Total Users"
                value={stats?.total_users ?? 0}
                color="text-white"
              />
              <StatCard
                label="Free"
                value={stats?.free ?? 0}
                color="text-zinc-400"
              />
              <StatCard
                label="Essential"
                value={stats?.essential ?? 0}
                sub="$39/mo each"
                color="text-blue-400"
              />
              <StatCard
                label="Pro"
                value={stats?.pro ?? 0}
                sub="$79/mo each"
                color="text-emerald-400"
              />
              <StatCard
                label="Institutional"
                value={stats?.institutional ?? 0}
                sub="$149/mo each"
                color="text-purple-400"
              />
              <StatCard
                label="Est. MRR"
                value={`$${((stats?.essential || 0) * 39 + (stats?.pro || 0) * 79 + (stats?.institutional || 0) * 149).toLocaleString()}`}
                color="text-emerald-400"
              />
            </>
          )}
        </div>

        {/* ── Live Regime Widget ── */}
        {regimeData?.stack && (
          <div
            className="rounded-2xl border border-white/6 p-5"
            style={{ backgroundColor: "#0f0f10" }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                  Live BTC Regime
                </div>
                <div className="text-xl font-bold text-white">
                  {regimeData.stack.execution?.label ?? "—"}
                </div>
              </div>
              <div className="flex gap-4 text-center">
                {[
                  { l: "Shift Risk", v: `${regimeData.stack.shiftrisk ?? "—"}%`, c: "text-red-400" },
                  { l: "Exposure", v: `${regimeData.stack.exposure ?? "—"}%`, c: "text-emerald-400" },
                  { l: "Alignment", v: `${regimeData.stack.alignment ?? "—"}%`, c: "text-blue-400" },
                ].map(({ l, v, c }) => (
                  <div key={l}>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{l}</div>
                    <div className={`text-lg font-bold ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 border border-white/5 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Upgrade ── */}
        <div
          className="rounded-2xl border border-white/6 p-5 space-y-3"
          style={{ backgroundColor: "#0f0f10" }}
        >
          <div className="text-sm font-semibold text-zinc-300">Quick Tier Upgrade</div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={quickEmail}
              onChange={(e) => setQuickEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickUpgrade()}
              placeholder="arkendra.bhattacharya@gmail.com"
              className="flex-1 min-w-48 bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder-zinc-700"
            />
            <select
              value={quickTier}
              onChange={(e) => setQuickTier(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-500"
            >
              {["free", "essential", "pro", "institutional"].map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={handleQuickUpgrade}
              disabled={quickLoading || !quickEmail.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {quickLoading ? "Upgrading..." : "Apply"}
            </button>
            {quickStatus && (
              <span
                className={`text-xs ${
                  quickStatus.startsWith("✓")
                    ? "text-emerald-400"
                    : quickStatus.startsWith("✗")
                    ? "text-rose-400"
                    : "text-zinc-400"
                }`}
              >
                {quickStatus}
              </span>
            )}
          </div>
        </div>

        {/* ── User Table ── */}
        <div
          className="rounded-2xl border border-white/6 overflow-hidden"
          style={{ backgroundColor: "#0f0f10" }}
        >
          {/* Table header controls */}
          <div className="p-4 border-b border-zinc-800/40 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-300">Users</h2>
              <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                {total}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search email or name..."
                  className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-52 focus:outline-none focus:border-zinc-500 placeholder-zinc-700"
                />
              </div>

              {/* Tier filter */}
              <div className="flex gap-1">
                {["all", "free", "essential", "pro", "institutional"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTierFilter(t);
                      setPage(0);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg capitalize transition-colors ${
                      tierFilter === t
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={loadUsers}
                className="text-xs text-zinc-500 hover:text-white border border-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/40">
                  {[
                    "Email",
                    "Name",
                    "Tier",
                    "Joined",
                    "Discipline",
                    "Change Tier",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-800/40">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-zinc-800 rounded skeleton-shimmer" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-zinc-600 text-sm"
                    >
                      {search || tierFilter !== "all"
                        ? "No users match your filters."
                        : "No users found. The /admin/users endpoint may not be configured yet."}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user.email}
                      user={user}
                      onTierChange={handleTierChange}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-800/40 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of{" "}
                {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-500 px-2 py-1.5">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Backend Setup Notice ── */}
        <div
          className="rounded-2xl border border-yellow-900/30 p-5 space-y-3"
          style={{ backgroundColor: "rgba(234,179,8,0.04)" }}
        >
          <div className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">
            Backend Setup Required
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            The admin UI requires these FastAPI endpoints to be added to your backend:
          </p>
          <div className="space-y-1 font-mono text-xs">
            {[
              ["GET", "/admin/stats", "Returns total_users, free, essential, pro, institutional, mrr"],
              ["GET", "/admin/users", "Accepts: search, tier, limit, offset. Returns: {users, total}"],
              ["POST", "/admin/users/set-tier", "Params: email, tier. Updates user tier."],
              ["DELETE", "/admin/users/{email}", "Deletes user by email."],
            ].map(([method, path, desc]) => (
              <div key={path} className="flex gap-3 items-start">
                <span
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    method === "GET"
                      ? "bg-blue-900/40 text-blue-400"
                      : method === "POST"
                      ? "bg-emerald-900/40 text-emerald-400"
                      : "bg-rose-900/40 text-rose-400"
                  }`}
                >
                  {method}
                </span>
                <span className="text-zinc-400">{path}</span>
                <span className="text-zinc-600 hidden md:block">— {desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">
            Add <code className="text-zinc-400">FOUNDER_EMAILS = ["arkendra.bhattacharya@gmail.com"]</code> in your
            backend and gate all /admin routes to that list.
          </p>
        </div>

        {/* ── Founder Self-Access ── */}
        <div
          className="rounded-2xl border border-emerald-900/20 p-5 space-y-3"
          style={{ backgroundColor: "rgba(16,185,129,0.03)" }}
        >
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Founder Access — Direct DB Override
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            If the admin endpoints are not yet configured, add this to your FastAPI backend to give
            yourself permanent Institutional access:
          </p>
          <pre
            className="text-[11px] text-emerald-400/70 font-mono rounded-xl p-4 overflow-x-auto"
            style={{ backgroundColor: "#0a0a0b" }}
          >
{`FOUNDER_EMAILS = ["arkendra.bhattacharya@gmail.com"]

def get_effective_tier(user):
    if user.email in FOUNDER_EMAILS:
        return "institutional"
    return user.tier

# Or run directly in your database:
# UPDATE users SET tier = 'institutional'
# WHERE email = 'arkendra.bhattacharya@gmail.com';`}
          </pre>
        </div>

      </div>
    </main>
  );
}
