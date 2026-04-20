"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const FOUNDER_EMAILS = ["arkendra.bhattacharya@gmail.com"];

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("cp_token") : null;
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
// TIER BADGE
// ─────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const map = {
    free:          "border-zinc-700/60 text-zinc-500",
    essential:     "border-blue-700/40 text-blue-400 bg-blue-950/30",
    pro:           "border-emerald-700/40 text-emerald-400 bg-emerald-950/30",
    institutional: "border-purple-700/40 text-purple-400 bg-purple-950/30",
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${
        map[tier] || map.free
      }`}
    >
      {tier || "free"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "text-emerald-400", loading }) {
  return (
    <div
      className="rounded-xl border border-zinc-800/60 p-5 space-y-1"
      style={{ backgroundColor: "#111113" }}
    >
      <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
        {label}
      </div>
      {loading ? (
        <div className="h-8 w-20 rounded skeleton-shimmer" />
      ) : (
        <div className={`text-3xl font-bold ${color}`}>{value ?? "—"}</div>
      )}
      {sub && !loading && (
        <div className="text-[10px] text-zinc-600">{sub}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// USER ROW
// ─────────────────────────────────────────────────────────
function UserRow({ user, onTierChange, onDelete }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [selectedTier, setSelectedTier] = useState(user.tier || "free");

  const handleTier = async (newTier) => {
    if (newTier === selectedTier) return;
    setSaving(true);
    try {
      await onTierChange(user.email, newTier);
      setSelectedTier(newTier);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(user.email);
    } finally {
      setDeleting(false);
      setConfirmDel(false);
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
    <tr className="border-b border-zinc-800/30 hover:bg-white/[0.015] transition-colors group">
      {/* Email */}
      <td className="px-4 py-3">
        <span className="text-sm text-zinc-200 font-mono truncate max-w-[220px] block">
          {user.email}
        </span>
      </td>

      {/* Name */}
      <td className="px-4 py-3 text-sm text-zinc-500">
        {user.name || <span className="text-zinc-700">—</span>}
      </td>

      {/* Current Tier */}
      <td className="px-4 py-3">
        <TierBadge tier={selectedTier} />
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-[11px] text-zinc-600">{joined}</td>

      {/* Discipline */}
      <td className="px-4 py-3 text-sm text-zinc-500">
        {user.discipline_score != null ? (
          <span
            className={
              user.discipline_score >= 70
                ? "text-emerald-400"
                : user.discipline_score >= 40
                ? "text-yellow-400"
                : "text-red-400"
            }
          >
            {user.discipline_score}
          </span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>

      {/* Change Tier */}
      <td className="px-4 py-3">
        <select
          value={selectedTier}
          onChange={(e) => handleTier(e.target.value)}
          disabled={saving}
          className="bg-zinc-900 border border-zinc-700/60 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          {["free", "essential", "pro", "institutional"].map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        {saving && (
          <span className="ml-2 text-[10px] text-zinc-500 animate-pulse">
            saving…
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            disabled={deleting}
            className="text-[11px] text-rose-500/70 hover:text-rose-400 border border-rose-500/20 hover:border-rose-400/40 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
          >
            Delete
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-lg disabled:opacity-40"
            >
              {deleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              className="text-[11px] text-zinc-500 border border-zinc-700 px-2.5 py-1 rounded-lg"
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
// MAIN
// ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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
  const searchDebounce = useRef(null);

  // Quick upgrade
  const [quickEmail, setQuickEmail] = useState("");
  const [quickTier, setQuickTier] = useState("pro");
  const [quickMsg, setQuickMsg] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  // Regime snapshot
  const [regimeData, setRegimeData] = useState(null);

  // ── Auth ──
  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/app"); return; }

    adminFetch("/admin/me")
      .then((d) => {
        if (d.role === "admin") setAuthorized(true);
        else router.push("/app");
      })
      .catch(() => router.push("/app"))
      .finally(() => setChecking(false));
  }, [router]);

  // ── Load Stats ──
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const d = await adminFetch("/admin/stats");
      setStats(d);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Load Users ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        limit: LIMIT,
        offset: page * LIMIT,
      });
      if (search) params.set("search", search);
      if (tierFilter !== "all") params.set("tier", tierFilter);
      const d = await adminFetch(`/admin/users?${params}`);
      setUsers(d.users || []);
      setTotal(d.total || 0);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setUsersLoading(false);
    }
  }, [page, search, tierFilter]);

  // ── Load Regime ──
  const loadRegime = useCallback(async () => {
    try {
      const d = await adminFetch("/dashboard?coin=BTC");
      setRegimeData(d);
    } catch {}
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadStats();
    loadRegime();
  }, [authorized, loadStats, loadRegime]);

  // Debounce search
  useEffect(() => {
    if (!authorized) return;
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(0);
      loadUsers();
    }, 320);
    return () => clearTimeout(searchDebounce.current);
  }, [search, tierFilter, page, authorized, loadUsers]);

  // ── Handlers ──
  const handleTierChange = async (email, tier) => {
    await adminFetch(
      `/admin/users/set-tier?email=${encodeURIComponent(email)}&tier=${tier}`,
      { method: "POST" }
    );
    await loadStats();
  };

  const handleDelete = async (email) => {
    await adminFetch(`/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    setUsers((p) => p.filter((u) => u.email !== email));
    setTotal((t) => t - 1);
    await loadStats();
  };

  const handleQuickUpgrade = async () => {
    if (!quickEmail.trim()) return;
    setQuickLoading(true);
    setQuickMsg("Upgrading…");
    try {
      await adminFetch(
        `/admin/users/set-tier?email=${encodeURIComponent(
          quickEmail.trim()
        )}&tier=${quickTier}`,
        { method: "POST" }
      );
      setQuickMsg(`✓ ${quickEmail.trim()} → ${quickTier}`);
      setQuickEmail("");
      loadStats();
      loadUsers();
    } catch (e) {
      setQuickMsg(`✗ ${e.message}`);
    } finally {
      setQuickLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ── Loading / Auth guards ──
  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#080809" }}
      >
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!authorized) return null;

  const mrr =
    stats
      ? (stats.essential || 0) * 39 +
        (stats.pro || 0) * 79 +
        (stats.institutional || 0) * 149
      : 0;

  return (
    <main
      className="min-h-screen text-white pb-20"
      style={{ backgroundColor: "#080809" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-md"
        style={{ backgroundColor: "rgba(8,8,9,0.92)" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              ChainPulse
            </span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
              Admin
            </span>
          </div>
          <a
            href="/app"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800 px-3 py-1.5 rounded-lg"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Page Title ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
              Founder Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ChainPulse Admin
          </h1>
          <p className="text-sm text-zinc-600">
            User management · Tier control · Revenue overview
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total Users"
            value={stats?.total_users ?? 0}
            color="text-white"
            loading={statsLoading}
          />
          <StatCard
            label="Free"
            value={stats?.free ?? 0}
            color="text-zinc-400"
            loading={statsLoading}
          />
          <StatCard
            label="Essential"
            value={stats?.essential ?? 0}
            sub="$39/mo each"
            color="text-blue-400"
            loading={statsLoading}
          />
          <StatCard
            label="Pro"
            value={stats?.pro ?? 0}
            sub="$79/mo each"
            color="text-emerald-400"
            loading={statsLoading}
          />
          <StatCard
            label="Institutional"
            value={stats?.institutional ?? 0}
            sub="$149/mo each"
            color="text-purple-400"
            loading={statsLoading}
          />
          <StatCard
            label="Est. MRR"
            value={`$${mrr.toLocaleString()}`}
            color="text-emerald-400"
            loading={statsLoading}
          />
        </div>

        {/* ── Live Regime ── */}
        {regimeData?.stack && !regimeData.stack.incomplete && (
          <div
            className="rounded-2xl border border-white/5 p-5"
            style={{ backgroundColor: "#0f0f10" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                  Live BTC Regime
                </div>
                <div
                  className={`text-xl font-bold ${
                    regimeData.stack.execution?.label?.includes("Risk-Off")
                      ? "text-red-400"
                      : regimeData.stack.execution?.label?.includes("Risk-On")
                      ? "text-emerald-400"
                      : "text-yellow-400"
                  }`}
                >
                  {regimeData.stack.execution?.label ?? "—"}
                </div>
              </div>
              <div className="flex gap-5">
                {[
                  {
                    l: "Shift Risk",
                    v: `${regimeData.stack.shiftrisk ?? "—"}%`,
                    c: "text-red-400",
                  },
                  {
                    l: "Exposure",
                    v: `${regimeData.stack.exposure ?? "—"}%`,
                    c: "text-emerald-400",
                  },
                  {
                    l: "Alignment",
                    v: `${regimeData.stack.alignment ?? "—"}%`,
                    c: "text-blue-400",
                  },
                ].map(({ l, v, c }) => (
                  <div key={l} className="text-center">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
                      {l}
                    </div>
                    <div className={`text-lg font-bold ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 border border-white/5 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Upgrade ── */}
        <div
          className="rounded-2xl border border-white/5 p-5 space-y-3"
          style={{ backgroundColor: "#0f0f10" }}
        >
          <div className="text-sm font-semibold text-zinc-300">
            Quick Tier Upgrade
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={quickEmail}
              onChange={(e) => setQuickEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickUpgrade()}
              placeholder="user@email.com"
              className="flex-1 min-w-52 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-500 placeholder-zinc-700"
            />
            <select
              value={quickTier}
              onChange={(e) => setQuickTier(e.target.value)}
              className="bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-500"
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
              {quickLoading ? "Upgrading…" : "Apply"}
            </button>
            {quickMsg && (
              <span
                className={`text-xs ${
                  quickMsg.startsWith("✓")
                    ? "text-emerald-400"
                    : quickMsg.startsWith("✗")
                    ? "text-rose-400"
                    : "text-zinc-400"
                }`}
              >
                {quickMsg}
              </span>
            )}
          </div>
        </div>

        {/* ── User Table ── */}
        <div
          className="rounded-2xl border border-white/5 overflow-hidden"
          style={{ backgroundColor: "#0f0f10" }}
        >
          {/* Controls */}
          <div className="p-4 border-b border-zinc-800/40 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-300">Users</h2>
              <span className="text-xs text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
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
                  placeholder="Search email or name…"
                  className="bg-zinc-900 border border-zinc-700/60 text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-52 focus:outline-none focus:border-zinc-500 placeholder-zinc-700"
                />
              </div>

              {/* Tier Filter */}
              <div className="flex gap-1">
                {["all", "free", "essential", "pro", "institutional"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTierFilter(t);
                        setPage(0);
                      }}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg capitalize transition-colors ${
                        tierFilter === t
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>

              {/* Refresh */}
              <button
                onClick={loadUsers}
                aria-label="Refresh users"
                className="text-zinc-600 hover:text-zinc-400 border border-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors text-xs"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/30">
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
                    <tr key={i} className="border-b border-zinc-800/20">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div
                            className="h-4 rounded skeleton-shimmer"
                            style={{ width: `${60 + Math.random() * 30}%` }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-zinc-700 text-sm"
                    >
                      {search || tierFilter !== "all"
                        ? "No users match your filters."
                        : "No users yet. The /admin/users endpoint may need to be configured."}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <UserRow
                      key={u.email}
                      user={u}
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
            <div className="p-4 border-t border-zinc-800/30 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                Showing {page * LIMIT + 1}–
                {Math.min((page + 1) * LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-600 px-2 py-1.5">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Founder Self-Access ── */}
        <div
          className="rounded-2xl border border-emerald-900/20 p-5 space-y-3"
          style={{ backgroundColor: "rgba(16,185,129,0.03)" }}
        >
          <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
            Founder Direct Access
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            To give your own account permanent Institutional access, run this
            once in your database:
          </p>
          <pre
            className="text-[11px] text-emerald-400/70 font-mono rounded-xl p-4 overflow-x-auto"
            style={{ backgroundColor: "#0a0a0b" }}
          >
            {`UPDATE users SET tier = 'institutional'
WHERE email = 'arkendra.bhattacharya@gmail.com';`}
          </pre>
          <p className="text-[10px] text-zinc-700">
            Or use the Quick Upgrade panel above to promote any user instantly.
          </p>
        </div>

      </div>
    </main>
  );
}
