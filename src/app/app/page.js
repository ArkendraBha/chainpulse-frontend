"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";

const BACKEND         = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX"];
const REFRESH_MS      = 60_000;

// ─────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_token");
}
function saveToken(t) {
  if (typeof window !== "undefined") localStorage.setItem("cp_token", t);
}

// ─────────────────────────────────────────
// COLOUR HELPERS
// ─────────────────────────────────────────

function regimeTextColor(label) {
  if (!label) return "text-gray-500";
  if (label === "Strong Risk-On")  return "text-emerald-400";
  if (label === "Risk-On")         return "text-green-400";
  if (label === "Strong Risk-Off") return "text-red-500";
  if (label === "Risk-Off")        return "text-red-400";
  return "text-yellow-400";
}

function regimeBorderBg(label) {
  if (!label) return "border-zinc-800 bg-zinc-900/40";
  if (label === "Strong Risk-On")  return "border-emerald-800 bg-emerald-900/20";
  if (label === "Risk-On")         return "border-green-900  bg-green-900/10";
  if (label === "Strong Risk-Off") return "border-red-800    bg-red-900/30";
  if (label === "Risk-Off")        return "border-red-900    bg-red-900/15";
  return "border-yellow-900 bg-yellow-900/10";
}

function riskTextColor(v) {
  if (v > 70) return "text-red-400";
  if (v > 45) return "text-yellow-400";
  return "text-green-400";
}

function exposureTextColor(v) {
  if (v > 60) return "text-emerald-400";
  if (v > 35) return "text-yellow-400";
  return "text-red-400";
}

function alignmentTextColor(v) {
  if (v >= 80) return "text-emerald-400";
  if (v >= 50) return "text-yellow-400";
  return "text-red-400";
}

function directionBadge(direction) {
  if (direction === "bullish")
    return "text-green-400 border-green-900 bg-green-900/20";
  if (direction === "bearish")
    return "text-red-400 border-red-900 bg-red-900/20";
  return "text-yellow-400 border-yellow-900 bg-yellow-900/20";
}

// ─────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────

function ProgressBar({ value = 0, colorClass = "bg-white" }) {
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1 mt-1.5">
      <div
        className={`h-1 rounded-full transition-all duration-700 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 inline mr-1 opacity-50"
      fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2
           2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd" />
    </svg>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────
// STAT CARD  (with blur/lock)
// ─────────────────────────────────────────

function StatCard({ label, value, suffix = "%", colorClass, barColorClass, hint, locked }) {
  if (locked) {
    return (
      <div className="border border-zinc-800 p-5 space-y-2 relative overflow-hidden">
        <SectionLabel>{label}</SectionLabel>
        <div className="text-3xl font-semibold text-zinc-700 blur-sm select-none">
          00.0
        </div>
        <ProgressBar value={50} colorClass="bg-zinc-700" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <LockIcon />Pro
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-zinc-800 p-5 space-y-2">
      <SectionLabel>{label}</SectionLabel>
      <div className={`text-3xl font-semibold ${colorClass}`}>
        {value}{suffix}
      </div>
      {barColorClass && (
        <ProgressBar value={parseFloat(value) || 0} colorClass={barColorClass} />
      )}
      {hint && <div className="text-xs text-gray-600 pt-1">{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// TREND MATURITY GAUGE
// ─────────────────────────────────────────

function MaturityGauge({ value, locked }) {
  if (locked) {
    return (
      <div className="border border-zinc-800 p-5 space-y-2 relative overflow-hidden">
        <SectionLabel>Trend Maturity</SectionLabel>
        <div className="text-3xl font-semibold text-zinc-700 blur-sm select-none">00.0</div>
        <ProgressBar value={50} colorClass="bg-zinc-700" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <LockIcon />Pro
          </span>
        </div>
      </div>
    );
  }

  const matLabel =
    value > 75 ? "Overextended" :
    value > 50 ? "Mature" :
    value > 25 ? "Developing" : "Early Stage";

  const color =
    value > 75 ? "text-red-400" :
    value > 50 ? "text-yellow-400" :
    value > 25 ? "text-blue-400" : "text-emerald-400";

  const bar =
    value > 75 ? "bg-red-500" :
    value > 50 ? "bg-yellow-500" : "bg-blue-500";

  return (
    <div className="border border-zinc-800 p-5 space-y-2">
      <SectionLabel>Trend Maturity</SectionLabel>
      <div className="flex items-end gap-3">
        <div className={`text-3xl font-semibold ${color}`}>{value}%</div>
        <div className={`text-sm pb-0.5 ${color}`}>{matLabel}</div>
      </div>
      <ProgressBar value={value} colorClass={bar} />
      <div className="text-xs text-gray-600">0% = fresh · 100% = overextended</div>
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME STACK CARD  (the centrepiece)
// ─────────────────────────────────────────

function RegimeStackCard({ stack, isPro, onUnlock }) {
  if (!stack) return null;

  const layers = [
    { key: "macro",     label: "Macro",     tf: "1D", data: stack.macro },
    { key: "trend",     label: "Trend",     tf: "4H", data: stack.trend },
    { key: "execution", label: "Execution", tf: "1H", data: stack.execution },
  ];

  const alignDesc =
    (stack.alignment || 0) >= 80 ? "All timeframes agree — high conviction" :
    (stack.alignment || 0) >= 50 ? "Partial alignment — moderate conviction" :
    "Conflicting timeframes — reduce size";

  return (
    <div className="border border-zinc-800 p-8 space-y-6">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <SectionLabel>Regime Stack</SectionLabel>
          <h2 className="text-xl font-semibold">
            {stack.coin} Multi-Timeframe Analysis
          </h2>
        </div>
        {stack.direction && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${directionBadge(stack.direction)}`}>
            {stack.direction === "bullish" ? "↑ Bullish" :
             stack.direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
          </span>
        )}
      </div>

      {/* ── three layers ── */}
      <div className="space-y-2">
        {layers.map(({ key, label, tf, data }) => (
          <div
            key={key}
            className={`flex items-center justify-between px-5 py-4 border rounded-sm ${
              data ? regimeBorderBg(data.label) : "border-zinc-800 bg-zinc-900/40"
            }`}
          >
            {/* left — timeframe label */}
            <div className="w-36 shrink-0">
              <span className="text-gray-300 font-medium text-sm">{label}</span>
              <span className="text-gray-600 text-xs ml-1">({tf})</span>
            </div>

            {/* centre — regime label */}
            <div className={`text-sm font-semibold flex-1 ${data ? regimeTextColor(data.label) : "text-gray-600"}`}>
              {data ? data.label : "—"}
            </div>

            {/* right — coherence (Pro only) */}
            <div className="text-xs text-gray-600 hidden sm:block w-28 text-right">
              {isPro && data
                ? `Coherence ${data.coherence?.toFixed(1) ?? "—"}%`
                : <span className="flex items-center justify-end gap-1"><LockIcon />coherence</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* ── alignment + exposure ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Alignment */}
        <div className="border border-zinc-800 p-5 space-y-2">
          <SectionLabel>Alignment</SectionLabel>
          <div className={`text-3xl font-semibold ${alignmentTextColor(stack.alignment || 0)}`}>
            {stack.alignment ?? "—"}%
          </div>
          <ProgressBar
            value={stack.alignment || 0}
            colorClass={
              (stack.alignment || 0) >= 80 ? "bg-emerald-500" :
              (stack.alignment || 0) >= 50 ? "bg-yellow-500" : "bg-red-500"
            }
          />
          <div className="text-xs text-gray-600">{alignDesc}</div>
        </div>

        {/* Recommended Exposure */}
        <div className="border border-zinc-800 p-5 space-y-2">
          <SectionLabel>Recommended Exposure</SectionLabel>
          <div className={`text-3xl font-semibold ${exposureTextColor(stack.exposure || 0)}`}>
            {stack.exposure ?? "—"}%
          </div>
          <ProgressBar
            value={stack.exposure || 0}
            colorClass={
              (stack.exposure || 0) > 60 ? "bg-emerald-500" :
              (stack.exposure || 0) > 35 ? "bg-yellow-500" : "bg-red-500"
            }
          />
          <div className="text-xs text-gray-600">Alignment-adjusted exposure</div>
        </div>
      </div>

      {/* ── conflict warning ── */}
      {(stack.alignment || 0) < 40 && (
        <div className="border border-yellow-900 bg-yellow-900/10 px-5 py-4 text-yellow-400 text-sm">
          ⚡ Low alignment — macro and execution timeframes are conflicting.
          Short-term moves may be counter-trend. Reduce size.
        </div>
      )}

      {/* ── Pro stat strip ── */}
      {isPro && (
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="border border-zinc-800 p-4 space-y-1">
            <SectionLabel>Survival</SectionLabel>
            <div className={`text-xl font-semibold ${riskTextColor(100 - (stack.survival || 0))}`}>
              {stack.survival ?? "—"}%
            </div>
          </div>
          <div className="border border-zinc-800 p-4 space-y-1">
            <SectionLabel>Hazard Rate</SectionLabel>
            <div className={`text-xl font-semibold ${riskTextColor(stack.hazard || 0)}`}>
              {stack.hazard ?? "—"}%
            </div>
          </div>
          <div className="border border-zinc-800 p-4 space-y-1">
            <SectionLabel>Shift Risk</SectionLabel>
            <div className={`text-xl font-semibold ${riskTextColor(stack.shift_risk || 0)}`}>
              {stack.shift_risk ?? "—"}%
            </div>
          </div>
        </div>
      )}

      {/* ── unlock CTA for free users ── */}
      {!isPro && (
        <button
          onClick={onUnlock}
          className="w-full border border-zinc-700 py-3 text-sm text-gray-400
                     hover:border-zinc-500 hover:text-white transition-colors rounded-sm"
        >
          <LockIcon />
          Unlock coherence, survival and hazard data — Pro
        </button>
      )}

    </div>
  );
}

// ─────────────────────────────────────────
// MARKET BREADTH BAR
// ─────────────────────────────────────────

function BreadthBar({ breadth }) {
  if (!breadth || !breadth.total) return null;
  const { bullish, neutral, bearish, total, breadth_score } = breadth;
  const bPct  = Math.round((bullish / total) * 100);
  const nPct  = Math.round((neutral / total) * 100);
  const brPct = Math.round((bearish / total) * 100);

  const scoreColor =
    breadth_score > 30 ? "text-green-400" :
    breadth_score < -30 ? "text-red-400" : "text-yellow-400";

  return (
    <div className="border border-zinc-800 p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <SectionLabel>Market Breadth</SectionLabel>
          <div className="text-sm text-gray-400">
            Macro regime alignment across all tracked assets
          </div>
        </div>
        <div className={`text-2xl font-semibold ${scoreColor}`}>
          {breadth_score > 0 ? "+" : ""}{breadth_score}
        </div>
      </div>

      {/* stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {bPct > 0 && (
          <div className="bg-green-500 transition-all" style={{ width: `${bPct}%` }} />
        )}
        {nPct > 0 && (
          <div className="bg-yellow-500 transition-all" style={{ width: `${nPct}%` }} />
        )}
        {brPct > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${brPct}%` }} />
        )}
      </div>

      <div className="flex gap-6 text-xs text-gray-500">
        <span className="text-green-400">{bullish} bullish</span>
        <span className="text-yellow-400">{neutral} neutral</span>
        <span className="text-red-400">{bearish} bearish</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MULTI-ASSET REGIME MAP
// ─────────────────────────────────────────

function RegimeMap({ overview, activeCoin, onSelect }) {
  if (!overview.length) return null;
  return (
    <div className="border border-zinc-800 p-6 space-y-4">
      <SectionLabel>Multi-Asset Regime Map</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {overview.map((item) => (
          <button
            key={item.coin}
            onClick={() => onSelect(item.coin)}
            className={`border p-4 text-left space-y-2 transition-colors rounded-sm ${
              item.coin === activeCoin
                ? "border-white"
                : "border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <div className="font-semibold text-sm">{item.coin}</div>

            {/* three regime rows */}
            <div className="space-y-0.5">
              {[
                { label: "M", value: item.macro },
                { label: "T", value: item.trend },
                { label: "E", value: item.execution },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-gray-600 text-xs w-3">{label}</span>
                  <span className={`text-xs ${regimeTextColor(value)}`}>
                    {value
                      ? value.replace("Strong ", "S.").replace("Risk-On", "R-On").replace("Risk-Off", "R-Off")
                      : "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* alignment pill */}
            {item.alignment != null && (
              <div className={`text-xs font-medium ${alignmentTextColor(item.alignment)}`}>
                {item.alignment}% aligned
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PRO UPGRADE MODAL
// ─────────────────────────────────────────

function ProModal({ onClose }) {
  const checkout = async () => {
    try {
      const res  = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50
                    flex items-center justify-center px-4">
      <div className="bg-zinc-950 border border-zinc-700 max-w-md w-full
                      p-10 space-y-6 relative">

        <button onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <SectionLabel>ChainPulse Pro</SectionLabel>

        <h2 className="text-2xl font-semibold leading-tight">
          Unlock Full Regime Analytics
        </h2>

        <p className="text-gray-400 text-sm">
          You are seeing regime labels and alignment. Pro unlocks survival
          modeling, hazard rate, coherence per layer, trend maturity,
          and real-time shift alerts.
        </p>

        <ul className="space-y-2 text-sm text-gray-300">
          {[
            "Coherence index per timeframe layer",
            "Survival probability and hazard rate",
            "Trend maturity score",
            "Strength percentile ranking",
            "Real-time shift alerts via email",
            "Daily morning regime brief",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>{f}
            </li>
          ))}
        </ul>

        <div className="space-y-3 pt-2">
          <button onClick={checkout}
            className="w-full bg-white text-black py-4 rounded-md font-semibold
                       hover:bg-gray-100 transition-colors">
            Activate Pro — \$29/month
          </button>
          <div className="text-center text-gray-600 text-xs">
            7-day risk-free · Cancel anytime
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────

export default function Dashboard() {
  const [stack,        setStack]        = useState(null);
  const [latest,       setLatest]       = useState(null);
  const [curveData,    setCurveData]    = useState([]);
  const [historyData,  setHistoryData]  = useState([]);
  const [overview,     setOverview]     = useState([]);
  const [breadth,      setBreadth]      = useState(null);
  const [coin,         setCoin]         = useState("BTC");
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [proSuccess,   setProSuccess]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [token,        setToken]        = useState(null);

  // ── read token from URL or localStorage ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params      = new URLSearchParams(window.location.search);
    const urlToken    = params.get("token");
    const successFlag = params.get("success");

    if (urlToken) {
      saveToken(urlToken);
      setToken(urlToken);
      window.history.replaceState({}, "", "/app");
    } else {
      const stored = getToken();
      if (stored) setToken(stored);
    }
    if (successFlag === "true") setProSuccess(true);
  }, []);

  // ── fetch all data ──
  const fetchData = useCallback(async (selectedCoin, currentToken) => {
    try {
      const headers = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;

      const [stackRes, latestRes, curveRes, histRes, overviewRes] =
        await Promise.all([
          fetch(`${BACKEND}/regime-stack?coin=${selectedCoin}`,            { headers }),
          fetch(`${BACKEND}/latest?coin=${selectedCoin}`,                  { headers }),
          fetch(`${BACKEND}/survival-curve?coin=${selectedCoin}`,          { headers }),
          fetch(`${BACKEND}/regime-history?coin=${selectedCoin}&limit=48`, { headers }),
          fetch(`${BACKEND}/market-overview`,                              { headers }),
        ]);

      const [stackData, latestData, curveRaw, histRaw, overviewRaw] =
        await Promise.all([
          stackRes.json(),
          latestRes.json(),
          curveRes.json(),
          histRes.json(),
          overviewRes.json(),
        ]);

      setStack(stackData);
      setLatest(latestData);
      setCurveData(curveRaw.data   || []);
      setHistoryData(histRaw.data  || []);
      setOverview(overviewRaw.data || []);
      setBreadth(overviewRaw.breadth || null);
      setLastUpdated(new Date());

      // show modal after 2s for free users
      if (stackData?.pro_required && !currentToken) {
        setTimeout(() => setShowModal(true), 2000);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(coin, token);
    const iv = setInterval(() => fetchData(coin, token), REFRESH_MS);
    return () => clearInterval(iv);
  }, [coin, token, fetchData]);

  // ── loading screen ──
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center
                      justify-center gap-4 text-gray-500">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white
                        rounded-full animate-spin" />
        <div className="text-sm">Loading Regime Model...</div>
      </div>
    );
  }

  // ── no data screen ──
  if (!stack || stack.message) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center
                      justify-center gap-4 text-gray-400">
        <div className="text-center space-y-3">
          <div>No regime data available yet.</div>
          <div className="text-sm text-gray-600">
            The model is initializing. Run /update-all to seed data.
          </div>
        </div>
      </div>
    );
  }

  // ── derived values ──
  const isPro      = !stack.pro_required;
  const exposure   = stack.exposure   ?? 0;
  const shiftRisk  = stack.shift_risk ?? 0;
  const alignment  = stack.alignment  ?? 0;
  const direction  = stack.direction  ?? "mixed";
  const regimeAge  = stack.regime_age_hours ?? 0;
  const maturity   = stack.trend_maturity   ?? null;
  const survival   = stack.survival         ?? null;
  const hazard     = stack.hazard           ?? null;
  const percentile = stack.percentile       ?? null;

  // execution label for hero display
  const execLabel = stack.execution?.label ?? null;

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">

      {/* modal */}
      {showModal && <ProModal onClose={() => setShowModal(false)} />}

      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Pro success banner ── */}
        {proSuccess && (
          <div className="border border-emerald-700 bg-emerald-950
                          text-emerald-300 px-6 py-4 rounded-md text-sm">
            ✓ Pro access activated. Welcome to ChainPulse Pro.
          </div>
        )}

        {/* ── free tier banner ── */}
        {!isPro && (
          <div
            onClick={() => setShowModal(true)}
            className="border border-zinc-700 bg-zinc-900 px-6 py-4
                       flex flex-col sm:flex-row justify-between
                       items-start sm:items-center gap-4
                       cursor-pointer hover:border-zinc-500 transition-colors"
          >
            <div className="space-y-1">
              <div className="text-sm text-white font-medium">
                Viewing free tier — regime labels only
              </div>
              <div className="text-xs text-gray-500">
                Coherence, survival, hazard and maturity are locked.
              </div>
            </div>
            <button className="bg-white text-black px-5 py-2 rounded-md
                               text-sm font-semibold whitespace-nowrap
                               hover:bg-gray-100 transition-colors">
              Unlock Pro
            </button>
          </div>
        )}

        {/* ── shift risk alert ── */}
        {shiftRisk > 70 && (
          <div className="border border-red-700 bg-red-950
                          px-6 py-5 text-red-300 space-y-1">
            <div className="font-semibold text-sm">
              ⚠ Regime Deterioration Alert — {coin}
            </div>
            <div className="text-xs text-red-400">
              Shift risk elevated to {shiftRisk}%.
              Consider reducing exposure.
            </div>
          </div>
        )}

        {/* ── header + coin selector ── */}
        <div className="flex flex-col sm:flex-row justify-between
                        items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              Probabilistic Regime Intelligence
            </h1>
            {lastUpdated && (
              <div className="text-xs text-gray-600 mt-1">
                Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 60s
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {SUPPORTED_COINS.map((c) => (
              <button
                key={c}
                onClick={() => setCoin(c)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  coin === c
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-gray-400 hover:bg-zinc-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════
            HERO — exposure + regime stack summary
        ════════════════════════════════════ */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Exposure */}
          <div className="border border-zinc-800 p-8 text-center space-y-3
                          md:col-span-1 flex flex-col justify-center">
            <SectionLabel>Exposure Recommendation</SectionLabel>
            <div className={`text-7xl font-semibold ${exposureTextColor(exposure)}`}>
              {exposure}%
            </div>
            <div className="text-xs text-gray-500">
              {alignment >= 80 ? "High conviction" :
               alignment >= 50 ? "Moderate conviction" : "Low conviction"}
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-700 ${
                  exposure > 60 ? "bg-emerald-500" :
                  exposure > 35 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${exposure}%` }}
              />
            </div>
          </div>

          {/* Regime summary */}
          <div className="border border-zinc-800 p-8 space-y-5 md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <SectionLabel>Current Regime</SectionLabel>
                <div className={`text-2xl font-semibold ${regimeTextColor(execLabel)}`}>
                  {execLabel ?? "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Execution (1H) · Active {regimeAge.toFixed(1)}h
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full
                                border ${directionBadge(direction)}`}>
                {direction === "bullish" ? "↑ Bullish" :
                 direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
              </span>
            </div>

            {/* mini stack summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Macro (1D)", data: stack.macro },
                { label: "Trend (4H)", data: stack.trend },
                { label: "Execution (1H)", data: stack.execution },
              ].map(({ label, data }) => (
                <div key={label}
                  className={`border p-3 rounded-sm text-center ${
                    data ? regimeBorderBg(data.label) : "border-zinc-800"
                  }`}>
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`text-xs font-semibold ${data ? regimeTextColor(data.label) : "text-gray-600"}`}>
                    {data?.label ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* alignment */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Alignment</span>
                <span className={alignmentTextColor(alignment)}>
                  {alignment}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    alignment >= 80 ? "bg-emerald-500" :
                    alignment >= 50 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${alignment}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════
            FULL REGIME STACK CARD
        ════════════════════════════════════ */}
        <RegimeStackCard
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ════════════════════════════════════
            PRO STATS GRID
        ════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <StatCard
            label="Survival Probability"
            value={isPro ? survival : null}
            colorClass={isPro ? riskTextColor(100 - (survival || 0)) : ""}
            barColorClass={isPro
              ? (survival > 60 ? "bg-green-500" : survival > 40 ? "bg-yellow-500" : "bg-red-500")
              : ""}
            hint="Prob. current regime continues"
            locked={!isPro}
          />

          <StatCard
            label="Regime Shift Risk"
            value={shiftRisk}
            colorClass={riskTextColor(shiftRisk)}
            barColorClass={shiftRisk > 70 ? "bg-red-500" : shiftRisk > 45 ? "bg-yellow-500" : "bg-green-500"}
            hint="Composite deterioration signal"
            locked={false}
          />

          <StatCard
            label="Hazard Rate"
            value={isPro ? hazard : null}
            colorClass={isPro ? riskTextColor(hazard || 0) : ""}
            barColorClass={isPro
              ? (hazard > 70 ? "bg-red-500" : hazard > 45 ? "bg-yellow-500" : "bg-green-500")
              : ""}
            hint="Failure risk vs historical norm"
            locked={!isPro}
          />

          <StatCard
            label="Macro Coherence"
            value={isPro ? stack.macro_coherence?.toFixed(1) : null}
            colorClass={isPro
              ? ((stack.macro_coherence || 0) > 60 ? "text-emerald-400" : "text-yellow-400")
              : ""}
            barColorClass={isPro
              ? ((stack.macro_coherence || 0) > 60 ? "bg-emerald-500" : "bg-yellow-500")
              : ""}
            hint="1D timeframe signal alignment"
            locked={!isPro}
          />

          <StatCard
            label="Strength Percentile"
            value={isPro ? percentile : null}
            colorClass="text-blue-400"
            barColorClass="bg-blue-500"
            hint="Relative to historical scores"
            locked={!isPro}
          />

          <StatCard
            label="Execution Score"
            value={stack.execution?.score?.toFixed(1) ?? "—"}
            suffix=""
            colorClass={regimeTextColor(execLabel)}
            hint="Raw 1H momentum-vol score"
            locked={false}
          />

        </div>

        {/* Trend maturity — full width */}
        <MaturityGauge
          value={isPro ? maturity : null}
          locked={!isPro}
        />

        {/* ════════════════════════════════════
            REGIME SCORE HISTORY CHART
        ════════════════════════════════════ */}
        {historyData.length > 0 && (
          <div className="border border-zinc-800 p-8 space-y-4">
            <div>
              <h2 className="text-base font-semibold">
                Regime Score History — {coin} (1H)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                48-hour composite momentum signal
              </p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#3f3f46"
                  tick={{ fill: "#52525b", fontSize: 11 }} />
                <YAxis stroke="#3f3f46"
                  tick={{ fill: "#52525b", fontSize: 11 }} domain={[-100, 100]} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                  labelStyle={{ color: "#71717a" }}
                  itemStyle={{ color: "#22c55e" }}
                />
                <ReferenceLine y={0}   stroke="#27272a" />
                <ReferenceLine y={35}  stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={-35} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="score"
                  stroke="#22c55e" strokeWidth={2}
                  fill="url(#scoreGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ════════════════════════════════════
            SURVIVAL CURVE  (blurred for free)
        ════════════════════════════════════ */}
        <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
          <div>
            <h2 className="text-base font-semibold">
              Regime Survival Curve — {coin}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Probability current regime persists · white line = current age
            </p>
          </div>

          <div className={!isPro ? "blur-sm pointer-events-none" : ""}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={curveData}>
                <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#3f3f46"
                  tick={{ fill: "#52525b", fontSize: 11 }} />
                <YAxis stroke="#3f3f46"
                  tick={{ fill: "#52525b", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                  labelStyle={{ color: "#71717a" }}
                />
                <Line type="monotone" dataKey="survival"
                  stroke="#22c55e" strokeWidth={2} dot={false} name="Survival %" />
                <Line type="monotone" dataKey="hazard"
                  stroke="#f87171" strokeWidth={1.5} dot={false}
                  strokeDasharray="4 4" name="Hazard %" />
                <ReferenceLine
                  x={Math.round(regimeAge)}
                  stroke="#ffffff" strokeDasharray="3 3"
                  label={{ value: "Now", fill: "#71717a", fontSize: 10 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {!isPro && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={() => setShowModal(true)}
            >
              <div className="bg-zinc-950 border border-zinc-700
                              px-6 py-5 text-center space-y-2">
                <div className="text-sm font-medium">Survival Curve — Pro Only</div>
                <div className="text-xs text-gray-500">
                  See where your regime sits on the survival curve
                </div>
                <button className="bg-white text-black px-4 py-2
                                   rounded-md text-xs font-semibold mt-1">
                  Unlock Pro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════
            MARKET BREADTH
        ════════════════════════════════════ */}
        <BreadthBar breadth={breadth} />

        {/* ════════════════════════════════════
            MULTI-ASSET REGIME MAP
        ════════════════════════════════════ */}
        <RegimeMap
          overview={overview}
          activeCoin={coin}
          onSelect={setCoin}
        />

        {/* ════════════════════════════════════
            INTERPRETATION PANEL
        ════════════════════════════════════ */}
        <div className="border border-zinc-800 p-8 space-y-4">
          <h2 className="text-base font-semibold text-gray-300">
            Regime Interpretation
          </h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-400">
            <div>
              Regime Age:{" "}
              <span className="text-white">{regimeAge.toFixed(1)}h</span>
            </div>
            {latest && (
              <>
                <div>
                  4H Momentum:{" "}
                  <span className={(latest.momentum_4h || 0) >= 0
                    ? "text-green-400" : "text-red-400"}>
                    {latest.momentum_4h?.toFixed(2) ?? "—"}%
                  </span>
                </div>
                <div>
                  24H Momentum:{" "}
                  <span className={(latest.momentum_24h || 0) >= 0
                    ? "text-green-400" : "text-red-400"}>
                    {latest.momentum_24h?.toFixed(2) ?? "—"}%
                  </span>
                </div>
                <div>
                  Volatility:{" "}
                  <span className="text-white">
                    {latest.volatility?.toFixed(2) ?? "—"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* contextual messages */}
          {isPro && hazard > 60 && (
            <div className="text-red-400 text-sm pt-2">
              ⚠ Elevated deterioration risk — hazard above 60%.
            </div>
          )}
          {isPro && survival > 70 && (
            <div className="text-green-400 text-sm pt-2">
              ✓ Regime persistence statistically strong.
            </div>
          )}
          {alignment < 40 && (
            <div className="text-yellow-400 text-sm pt-2">
              ⚡ Low alignment — timeframes conflict. Trade smaller.
            </div>
          )}
          {/* conflict detection: short-term bullish inside bearish macro */}
          {stack.macro?.label?.includes("Risk-Off") &&
           stack.execution?.label?.includes("Risk-On") && (
            <div className="border border-yellow-900 bg-yellow-900/10
                            px-4 py-3 text-yellow-400 text-sm mt-2">
              Counter-trend detected: short-term bullish move inside
              bearish macro regime. Exposure automatically reduced.
            </div>
          )}
          {stack.macro?.label?.includes("Risk-On") &&
           stack.execution?.label?.includes("Risk-Off") && (
            <div className="border border-blue-900 bg-blue-900/10
                            px-4 py-3 text-blue-400 text-sm mt-2">
              Pullback within bullish macro — potential re-entry zone.
              Await execution alignment before adding size.
            </div>
          )}
        </div>

        {/* ════════════════════════════════════
            PRO UPSELL  (free users only)
        ════════════════════════════════════ */}
        {!isPro && (
          <div
            className="border border-zinc-700 p-10 text-center space-y-5
                       cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => setShowModal(true)}
          >
            <SectionLabel>ChainPulse Pro</SectionLabel>
            <h3 className="text-2xl font-semibold">
              Unlock Full Regime Analytics
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Survival curve, hazard rate, coherence per layer, trend maturity,
              real-time shift alerts, and daily morning brief.
            </p>
            <div className="text-gray-300 text-sm">
              \$29/month · Designed for traders managing \$5k+
            </div>
            <div className="text-gray-500 text-xs max-w-md mx-auto">
              Average user avoids 1–2 poor entries per month.
              At \$5k+ managed, that covers the cost many times over.
            </div>
            <button className="bg-white text-black px-8 py-4 rounded-md
                               font-semibold hover:bg-gray-100 transition-colors">
              Activate Pro — \$29/month
            </button>
            <div className="text-gray-600 text-xs">
              7-day risk-free · Cancel anytime
            </div>
          </div>
        )}

      </div>
    </main>
  );
}