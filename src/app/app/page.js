"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";

const BACKEND         = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX", "LINK", "ADA"];
const REFRESH_MS      = 60_000;

// ─────────────────────────────────────────
// TOKEN
// ─────────────────────────────────────────
function getToken()   { return typeof window !== "undefined" ? localStorage.getItem("cp_token") : null; }
function saveToken(t) { if (typeof window !== "undefined") localStorage.setItem("cp_token", t); }

// ─────────────────────────────────────────
// COLOUR HELPERS
// ─────────────────────────────────────────
function regimeText(label) {
  if (!label) return "text-gray-500";
  if (label === "Strong Risk-On")  return "text-emerald-400";
  if (label === "Risk-On")         return "text-green-400";
  if (label === "Strong Risk-Off") return "text-red-500";
  if (label === "Risk-Off")        return "text-red-400";
  return "text-yellow-400";
}
function regimeBorder(label) {
  if (!label) return "border-zinc-800 bg-zinc-900/40";
  if (label === "Strong Risk-On")  return "border-emerald-800 bg-emerald-900/20";
  if (label === "Risk-On")         return "border-green-900  bg-green-900/10";
  if (label === "Strong Risk-Off") return "border-red-800    bg-red-900/30";
  if (label === "Risk-Off")        return "border-red-900    bg-red-900/15";
  return "border-yellow-900 bg-yellow-900/10";
}
function riskColor(v)     { return v > 70 ? "text-red-400" : v > 45 ? "text-yellow-400" : "text-green-400"; }
function exposureColor(v) { return v > 60 ? "text-emerald-400" : v > 35 ? "text-yellow-400" : "text-red-400"; }
function alignColor(v)    { return v >= 80 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }
function dirBadge(d) {
  if (d === "bullish") return "text-green-400 border-green-900 bg-green-900/20";
  if (d === "bearish") return "text-red-400 border-red-900 bg-red-900/20";
  return "text-yellow-400 border-yellow-900 bg-yellow-900/20";
}
function confColor(v) { return v >= 75 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }

// ─────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────
function Bar({ value = 0, cls = "bg-white" }) {
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1 mt-1.5">
      <div
        className={`h-1 rounded-full transition-all duration-700 ${cls}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
function Label({ children }) {
  return (
    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
      {children}
    </div>
  );
}
function Lock() {
  return (
    <svg className="w-3 h-3 inline mr-1 opacity-40" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2
           2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StatCard({ label, value, suffix = "%", color, barCls, hint, locked }) {
  if (locked)
    return (
      <div className="border border-zinc-800 p-5 space-y-2 relative overflow-hidden">
        <Label>{label}</Label>
        <div className="text-3xl font-semibold text-zinc-700 blur-sm select-none">00.0</div>
        <Bar value={50} cls="bg-zinc-700" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Lock />Pro
          </span>
        </div>
      </div>
    );
  return (
    <div className="border border-zinc-800 p-5 space-y-2">
      <Label>{label}</Label>
      <div className={`text-3xl font-semibold ${color}`}>
        {value}{suffix}
      </div>
      {barCls && <Bar value={parseFloat(value) || 0} cls={barCls} />}
      {hint && <div className="text-xs text-gray-600 pt-1">{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME STACK CARD
// ─────────────────────────────────────────
function RegimeStackCard({ stack, isPro, onUnlock }) {
  if (!stack) return null;
  const layers = [
    { label: "Macro",     tf: "1D", data: stack.macro },
    { label: "Trend",     tf: "4H", data: stack.trend },
    { label: "Execution", tf: "1H", data: stack.execution },
  ];
  const alignDesc =
    (stack.alignment || 0) >= 80
      ? "All timeframes agree — high conviction"
      : (stack.alignment || 0) >= 50
      ? "Partial alignment — moderate conviction"
      : "Conflicting timeframes — reduce size";

  return (
    <div className="border border-zinc-800 p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Label>Regime Stack</Label>
          <h2 className="text-xl font-semibold">{stack.coin} Multi-Timeframe</h2>
        </div>
        {stack.direction && (
          <span className={`text-xs px-3 py-1 rounded-full border ${dirBadge(stack.direction)}`}>
            {stack.direction === "bullish"
              ? "↑ Bullish"
              : stack.direction === "bearish"
              ? "↓ Bearish"
              : "→ Mixed"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {layers.map(({ label, tf, data }) => (
          <div
            key={label}
            className={`flex items-center justify-between px-5 py-4 border rounded-sm ${
              data ? regimeBorder(data.label) : "border-zinc-800"
            }`}
          >
            <div className="w-32 shrink-0">
              <span className="text-gray-300 font-medium text-sm">{label}</span>
              <span className="text-gray-600 text-xs ml-1">({tf})</span>
            </div>
            <div
              className={`text-sm font-semibold flex-1 ${
                data ? regimeText(data.label) : "text-gray-600"
              }`}
            >
              {data?.label ?? "—"}
            </div>
            <div className="text-xs text-right w-28 hidden sm:block">
              {isPro && data ? (
                <span className="text-gray-500">Coh. {data.coherence?.toFixed(1)}%</span>
              ) : (
                <span className="text-gray-700 flex items-center justify-end">
                  <Lock />coh.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-800 p-5 space-y-2">
          <Label>Alignment</Label>
          <div className={`text-3xl font-semibold ${alignColor(stack.alignment || 0)}`}>
            {stack.alignment ?? "—"}%
          </div>
          <Bar
            value={stack.alignment || 0}
            cls={
              (stack.alignment || 0) >= 80
                ? "bg-emerald-500"
                : (stack.alignment || 0) >= 50
                ? "bg-yellow-500"
                : "bg-red-500"
            }
          />
          <div className="text-xs text-gray-600">{alignDesc}</div>
        </div>
        <div className="border border-zinc-800 p-5 space-y-2">
          <Label>Recommended Exposure</Label>
          <div className={`text-3xl font-semibold ${exposureColor(stack.exposure || 0)}`}>
            {stack.exposure ?? "—"}%
          </div>
          <Bar
            value={stack.exposure || 0}
            cls={
              (stack.exposure || 0) > 60
                ? "bg-emerald-500"
                : (stack.exposure || 0) > 35
                ? "bg-yellow-500"
                : "bg-red-500"
            }
          />
          <div className="text-xs text-gray-600">Alignment-adjusted</div>
        </div>
      </div>

      {(stack.alignment || 0) < 40 && (
        <div className="border border-yellow-900 bg-yellow-900/10 px-5 py-4 text-yellow-400 text-sm">
          ⚡ Low alignment — timeframes conflict. Reduce position size.
        </div>
      )}

      {isPro && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Survival",   v: stack.survival,   fn: (v) => riskColor(100 - v) },
            { l: "Hazard",     v: stack.hazard,     fn: riskColor },
            { l: "Shift Risk", v: stack.shift_risk, fn: riskColor },
          ].map(({ l, v, fn }) => (
            <div key={l} className="border border-zinc-800 p-4 space-y-1">
              <Label>{l}</Label>
              <div className={`text-xl font-semibold ${fn(v || 0)}`}>{v ?? "—"}%</div>
            </div>
          ))}
        </div>
      )}

      {!isPro && (
        <button
          onClick={onUnlock}
          className="w-full border border-zinc-700 py-3 text-sm text-gray-500
                     hover:border-zinc-500 hover:text-white transition-colors rounded-sm"
        >
          <Lock />Unlock coherence, survival & hazard — Pro
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// CONFIDENCE PANEL
// ─────────────────────────────────────────
function ConfidencePanel({ confidence, isPro, onUnlock }) {
  if (!isPro) {
    return (
      <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
        <Label>Regime Confidence Score</Label>
        <div className="blur-sm select-none space-y-3">
          <div className="text-4xl font-semibold text-zinc-700">72%</div>
          <div className="grid grid-cols-4 gap-3">
            {["alignment","coherence","survival","momentum"].map((k) => (
              <div key={k} className="border border-zinc-800 p-3 space-y-1">
                <div className="text-xs text-gray-700 capitalize">{k}</div>
                <div className="text-lg font-semibold text-zinc-700">—%</div>
                <Bar value={50} cls="bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
            <div className="text-sm font-medium">Confidence Score — Pro Only</div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
              Unlock Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!confidence) return null;
  const { score, label, description, components } = confidence;

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <Label>Regime Confidence Score</Label>
          <div className={`text-4xl font-semibold ${confColor(score)}`}>{score}%</div>
          <div className={`text-sm mt-1 ${confColor(score)}`}>{label}</div>
        </div>
        <div className="text-xs text-gray-500 max-w-xs text-right">{description}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(components || {}).map(([key, val]) => (
          <div key={key} className="border border-zinc-800 p-3 space-y-1">
            <div className="text-xs text-gray-600 capitalize">{key}</div>
            <div className="text-lg font-semibold text-white">{val}%</div>
            <Bar value={val} cls="bg-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// VOLATILITY ENVIRONMENT
// ─────────────────────────────────────────
function VolEnvironment({ env, isPro, onUnlock }) {
  if (!isPro) {
    return (
      <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
        <Label>Volatility & Liquidity Environment</Label>
        <div className="blur-sm select-none grid grid-cols-4 gap-4">
          {["Volatility","Trend Stability","Market Stress","Liquidity"].map((l) => (
            <div key={l} className="border border-zinc-800 p-4 space-y-2">
              <div className="text-xs text-gray-700">{l}</div>
              <div className="text-xl font-semibold text-zinc-700">—</div>
              <Bar value={50} cls="bg-zinc-700" />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
            <div className="text-sm font-medium">Volatility Environment — Pro Only</div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
              Unlock Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!env) return null;

  function envColor(label) {
    if (["Low", "Strong", "Normal"].includes(label))                              return "text-green-400";
    if (["Moderate", "Weak"].includes(label))                                     return "text-yellow-400";
    if (["High","Elevated","Extreme","Thin","Deteriorating"].includes(label))     return "text-red-400";
    return "text-gray-400";
  }

  const items = [
    { label: "Volatility",      value: env.volatility_label, score: env.volatility_score },
    { label: "Trend Stability", value: env.stability_label,  score: env.stability_score  },
    { label: "Market Stress",   value: env.stress_label,     score: env.stress_score     },
    { label: "Liquidity",       value: env.liquidity_label,  score: null                 },
  ];

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Market Conditions</Label>
        <h2 className="text-base font-semibold">Volatility & Liquidity Environment</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(({ label, value, score }) => (
          <div key={label} className="border border-zinc-800 p-4 space-y-2">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-xl font-semibold ${envColor(value)}`}>{value ?? "—"}</div>
            {score != null && (
              <>
                <Bar
                  value={score}
                  cls={score > 70 ? "bg-red-500" : score > 40 ? "bg-yellow-500" : "bg-green-500"}
                />
                <div className="text-xs text-gray-700">{score}%</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME TRANSITION MATRIX
// ─────────────────────────────────────────
function TransitionMatrix({ transitions, isPro, onUnlock }) {
  if (!isPro) {
    return (
      <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
        <Label>Regime Transition Probability</Label>
        <div className="blur-sm select-none space-y-2">
          {["Strong Risk-On","Risk-On","Neutral","Risk-Off","Strong Risk-Off"].map((s) => (
            <div key={s} className="flex items-center gap-4">
              <div className="w-40 text-xs text-gray-600">{s}</div>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-zinc-700"
                  style={{ width: `${Math.random() * 60 + 10}%` }} />
              </div>
              <div className="text-sm text-zinc-700 w-10 text-right">—%</div>
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
            <div className="text-sm font-medium">Transition Matrix — Pro Only</div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
              Unlock Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!transitions?.transitions) return null;
  const { current_state, transitions: probs, data_sufficient, sample_size } = transitions;

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Regime Transition Probability</Label>
        <h2 className="text-base font-semibold">
          Next 24H — Current:{" "}
          <span className={regimeText(current_state)}>{current_state}</span>
        </h2>
        {!data_sufficient && (
          <div className="text-xs text-gray-600 mt-1">
            Estimated · {sample_size} historical transitions
          </div>
        )}
      </div>
      <div className="space-y-3">
        {Object.entries(probs).map(([state, prob]) => (
          <div key={state} className="flex items-center gap-4">
            <div className="w-44 text-xs text-gray-400 shrink-0">{state}</div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${
                    state === current_state
                      ? "bg-white"
                      : state.includes("Risk-On")
                      ? "bg-green-500"
                      : state.includes("Risk-Off")
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }`}
                  style={{ width: `${prob}%` }}
                />
              </div>
              <div className="text-sm font-semibold text-white w-10 text-right">{prob}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PORTFOLIO ALLOCATOR
// ─────────────────────────────────────────
function PortfolioAllocator({ stack, isPro, onUnlock }) {
  const [accountSize,  setAccountSize]  = useState(10000);
  const [strategyMode, setStrategyMode] = useState("balanced");
  const [allocation,   setAllocation]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const calculate = async () => {
    if (!isPro) { onUnlock(); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BACKEND}/portfolio-allocator?account_size=${accountSize}&strategy_mode=${strategyMode}&coin=${stack?.coin || "BTC"}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAllocation(data);
    } catch (e) {
      setError("Failed to calculate allocation. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-zinc-800 p-8 space-y-6">
      <div>
        <Label>Portfolio Exposure Allocator</Label>
        <h2 className="text-base font-semibold">Risk-Adjusted Capital Allocation</h2>
        <p className="text-xs text-gray-500 mt-1">
          Enter your account size. ChainPulse calculates regime-adjusted allocation per strategy mode.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* account size */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Account Size (USD)</div>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 text-white
                       px-4 py-3 rounded-md text-sm focus:outline-none
                       focus:border-zinc-500 transition-colors"
            placeholder="10000"
            min={100}
          />
        </div>

        {/* strategy mode */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Strategy Mode</div>
          <div className="flex gap-2">
            {["conservative", "balanced", "aggressive"].map((m) => (
              <button
                key={m}
                onClick={() => setStrategyMode(m)}
                className={`flex-1 py-3 rounded-md text-xs font-medium capitalize transition-colors ${
                  strategyMode === m
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-gray-400 border border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* calculate */}
        <div className="flex items-end">
          <button
            onClick={calculate}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-md text-sm font-semibold
                       hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Calculating..." : isPro ? "Calculate" : <><Lock />Pro Feature</>}
          </button>
        </div>
      </div>

      {/* strategy mode descriptions */}
      <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
        <div className="border border-zinc-800/50 p-3 rounded-sm space-y-1">
          <div className="text-gray-400 font-medium">Conservative</div>
          <div>Max 40% exposure · heavy cash buffer · prioritises capital preservation</div>
        </div>
        <div className="border border-zinc-800/50 p-3 rounded-sm space-y-1">
          <div className="text-gray-400 font-medium">Balanced</div>
          <div>Regime-scaled 20–70% exposure · equal spot/swing split</div>
        </div>
        <div className="border border-zinc-800/50 p-3 rounded-sm space-y-1">
          <div className="text-gray-400 font-medium">Aggressive</div>
          <div>Up to 90% exposure in strong risk-on · minimal cash reserve</div>
        </div>
      </div>

      {error && (
        <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {allocation && !allocation.error && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Deployed Capital",
                value: `
$$
{allocation.deployed_capital?.toLocaleString()}`,
                color: exposureColor(allocation.adjusted_exposure),
              },
              {
                label: "Spot Allocation",
                value: `
$$
{allocation.spot_allocation?.toLocaleString()}`,
                color: "text-blue-400",
              },
              {
                label: "Swing Allocation",
                value: `
$$
{allocation.swing_allocation?.toLocaleString()}`,
                color: "text-purple-400",
              },
              {
                label: "Cash Reserve",
                value: `
$$
{allocation.cash_reserve?.toLocaleString()}`,
                color: "text-gray-300",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="border border-zinc-800 p-4 space-y-1">
                <div className="text-xs text-gray-500">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="border border-zinc-800/50 px-4 py-3 text-xs text-gray-600 space-x-4">
            <span>Adjusted exposure: <span className="text-gray-400">{allocation.adjusted_exposure}%</span></span>
            <span>Strategy: <span className="text-gray-400 capitalize">{allocation.strategy_mode}</span></span>
            <span>Regime confidence: <span className="text-gray-400">{allocation.confidence}%</span></span>
          </div>
        </div>
      )}

      {!isPro && (
        <div
          className="border border-dashed border-zinc-700 p-6 text-center space-y-2 cursor-pointer
                     hover:border-zinc-500 transition-colors rounded-sm"
          onClick={onUnlock}
        >
          <div className="text-sm text-gray-400">
            <Lock />Portfolio allocator is a Pro feature
          </div>
          <div className="text-xs text-gray-600">
            Unlock exact dollar amounts per regime · spot vs swing split · cash reserve
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// CORRELATION PANEL
// ─────────────────────────────────────────
function CorrelationPanel({ correlation, isPro, onUnlock }) {
  if (!isPro) {
    return (
      <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
        <Label>Cross-Asset Correlation</Label>
        <div className="blur-sm select-none grid grid-cols-3 gap-3">
          {["BTC/ETH","BTC/SOL","ETH/SOL","BTC/BNB","ETH/BNB","SOL/AVAX"].map((p) => (
            <div key={p} className="border border-zinc-800 p-4 space-y-2">
              <div className="text-sm text-zinc-600">{p}</div>
              <div className="text-2xl font-semibold text-zinc-700">0.00</div>
              <Bar value={50} cls="bg-zinc-700" />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
            <div className="text-sm font-medium">Correlation Monitor — Pro Only</div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
              Unlock Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!correlation?.pairs?.length) return null;

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Cross-Asset Correlation</Label>
        <h2 className="text-base font-semibold">Pairwise Return Correlation (24H)</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {correlation.pairs.map(({ pair, correlation: corr, label }) => {
          const abs = Math.abs(corr);
          return (
            <div key={pair} className="border border-zinc-800 p-4 space-y-2">
              <div className="text-sm font-medium text-gray-300">{pair}</div>
              <div
                className={`text-2xl font-semibold ${
                  abs > 0.8
                    ? "text-emerald-400"
                    : abs > 0.5
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {Number(corr).toFixed(2)}
              </div>
              <div className="text-xs text-gray-600">{label}</div>
              <Bar
                value={abs * 100}
                cls={
                  abs > 0.8
                    ? "bg-emerald-500"
                    : abs > 0.5
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }
              />
            </div>
          );
        })}
      </div>
      {correlation.alerts?.map((alert, i) => (
        <div
          key={i}
          className="border border-red-900 bg-red-900/10 px-4 py-3 text-red-400 text-sm"
        >
          ⚠ {alert}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME HEATMAP
// ─────────────────────────────────────────
function RegimeHeatmap({ overview, isPro, onUnlock }) {
  if (!isPro) {
    return (
      <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
        <Label>Regime Heatmap</Label>
        <div className="blur-sm select-none overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-gray-600 pb-2 pr-4 font-normal">Asset</th>
                {["1H", "4H", "1D"].map((tf) => (
                  <th key={tf} className="text-gray-600 pb-2 px-4 font-normal text-center">{tf}</th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              {SUPPORTED_COINS.map((coin) => (
                <tr key={coin}>
                  <td className="pr-4 py-2 font-medium text-zinc-700">{coin}</td>
                  {["1H","4H","1D"].map((tf) => (
                    <td key={tf} className="px-4 py-2 text-center">
                      <span className="px-3 py-1 rounded-sm text-xs bg-zinc-800 text-zinc-700">—</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
            <div className="text-sm font-medium">Regime Heatmap — Pro Only</div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
              Unlock Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!overview?.length) return null;

  function cellStyle(label) {
    if (label === "Strong Risk-On")  return "bg-emerald-900/40 text-emerald-400 border-emerald-900/50";
    if (label === "Risk-On")         return "bg-green-900/30  text-green-400  border-green-900/40";
    if (label === "Strong Risk-Off") return "bg-red-900/40    text-red-400    border-red-900/50";
    if (label === "Risk-Off")        return "bg-red-900/20    text-red-400    border-red-900/30";
    if (label === "Neutral")         return "bg-yellow-900/20 text-yellow-400 border-yellow-900/30";
    return "bg-zinc-900/40 text-gray-600 border-zinc-800";
  }

  function shortLabel(label) {
    if (!label) return "—";
    if (label === "Strong Risk-On")  return "S.R+";
    if (label === "Risk-On")         return "R+";
    if (label === "Strong Risk-Off") return "S.R-";
    if (label === "Risk-Off")        return "R-";
    return "NEU";
  }

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Regime Heatmap</Label>
        <h2 className="text-base font-semibold">Asset × Timeframe Regime Grid</h2>
        <p className="text-xs text-gray-500 mt-1">
          Snapshot of all regimes across every asset and timeframe
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-500 pb-3 pr-6 font-normal uppercase tracking-widest">
                Asset
              </th>
              {[
                { label: "Execution", tf: "1H" },
                { label: "Trend",     tf: "4H" },
                { label: "Macro",     tf: "1D" },
              ].map(({ label, tf }) => (
                <th
                  key={tf}
                  className="text-gray-500 pb-3 px-3 font-normal uppercase tracking-widest text-center"
                >
                  {label} <span className="text-gray-700">({tf})</span>
                </th>
              ))}
              <th className="text-gray-500 pb-3 px-3 font-normal uppercase tracking-widest text-center">
                Align
              </th>
              <th className="text-gray-500 pb-3 px-3 font-normal uppercase tracking-widest text-center">
                Dir
              </th>
            </tr>
          </thead>
          <tbody>
            {overview.map((item) => (
              <tr key={item.coin} className="border-t border-zinc-800/50">
                <td className="pr-6 py-2.5 font-semibold text-white">{item.coin}</td>
                {[item.execution, item.trend, item.macro].map((regime, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-sm border text-xs font-medium ${cellStyle(regime)}`}
                    >
                      {shortLabel(regime)}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-sm font-semibold ${alignColor(item.alignment || 0)}`}>
                    {item.alignment ?? "—"}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${dirBadge(item.direction || "mixed")}`}
                  >
                    {item.direction === "bullish"
                      ? "↑"
                      : item.direction === "bearish"
                      ? "↓"
                      : "→"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* legend */}
      <div className="flex gap-4 flex-wrap pt-2">
        {[
          { label: "S.R+", cls: "bg-emerald-900/40 text-emerald-400 border-emerald-900/50" },
          { label: "R+",   cls: "bg-green-900/30  text-green-400  border-green-900/40"    },
          { label: "NEU",  cls: "bg-yellow-900/20 text-yellow-400 border-yellow-900/30"   },
          { label: "R-",   cls: "bg-red-900/20    text-red-400    border-red-900/30"      },
          { label: "S.R-", cls: "bg-red-900/40    text-red-400    border-red-900/50"      },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-xs px-2 py-0.5 rounded-sm border ${cls}`}>
            {label}
          </span>
        ))}
        <span className="text-xs text-gray-600 ml-2 self-center">
          S = Strong · R+ = Risk-On · R- = Risk-Off · NEU = Neutral
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// RISK EVENTS
// ─────────────────────────────────────────
function RiskEvents({ events }) {
  if (!events?.length) return null;

  function impactStyle(impact) {
    if (impact === "High")   return "text-red-400    border-red-900    bg-red-900/10";
    if (impact === "Medium") return "text-yellow-400 border-yellow-900 bg-yellow-900/10";
    return "text-gray-400 border-zinc-800 bg-zinc-900/20";
  }

  const sorted = [...events].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return (order[a.impact] ?? 2) - (order[b.impact] ?? 2);
  });

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Risk Event Monitor</Label>
        <h2 className="text-base font-semibold">Active Macro Risk Flags</h2>
        <p className="text-xs text-gray-500 mt-1">
          Conditions that may cause regime transitions
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sorted.map((e) => (
          <div
            key={e.name}
            className={`border px-4 py-3 rounded-sm space-y-1.5 ${impactStyle(e.impact)}`}
          >
            <div className="font-medium text-sm">{e.name}</div>
            <div className="text-xs opacity-70">{e.type}</div>
            <div
              className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-block ${impactStyle(e.impact)}`}
            >
              {e.impact} Impact
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME MATURITY
// ─────────────────────────────────────────
function RegimeMaturity({ regimeAge, avgDuration, maturityLabel, isPro, onUnlock }) {
  const maturityPct =
    avgDuration > 0 ? Math.min(100, (regimeAge / avgDuration) * 100) : 0;

  const phaseColor =
    maturityLabel === "Overextended" ? "text-red-400"    :
    maturityLabel === "Late Phase"   ? "text-orange-400" :
    maturityLabel === "Mid Phase"    ? "text-yellow-400" :
    "text-emerald-400";

  const phaseCls =
    maturityLabel === "Overextended" ? "bg-red-500"    :
    maturityLabel === "Late Phase"   ? "bg-orange-500" :
    maturityLabel === "Mid Phase"    ? "bg-yellow-500" :
    "bg-emerald-500";

  if (!isPro) {
    return (
      <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
        <Label>Regime Maturity</Label>
        <div className="blur-sm select-none space-y-3">
          <div className="text-3xl font-semibold text-zinc-700">Mid Phase</div>
          <div className="text-sm text-zinc-700">41h / 63h avg</div>
          <Bar value={65} cls="bg-zinc-700" />
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
            <div className="text-sm font-medium">Regime Maturity — Pro Only</div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
              Unlock Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 p-8 space-y-4">
      <Label>Regime Maturity</Label>
      <div className="flex items-end gap-4">
        <div className={`text-3xl font-semibold ${phaseColor}`}>{maturityLabel ?? "—"}</div>
        <div className="text-sm text-gray-500 pb-1">
          {regimeAge.toFixed(1)}h / {(avgDuration || 0).toFixed(0)}h avg
        </div>
      </div>
      <Bar value={maturityPct} cls={phaseCls} />
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        {["Early Phase", "Mid Phase", "Late Phase", "Overextended"].map((ph) => (
          <div
            key={ph}
            className={`py-1.5 rounded-sm ${
              maturityLabel === ph
                ? "bg-white text-black font-semibold"
                : "text-gray-600 border border-zinc-800"
            }`}
          >
            {ph}
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600">
        0% = regime just started · 100% = statistically overdue for shift
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME HISTORY CHART
// ─────────────────────────────────────────
function RegimeTimeline({ history }) {
  if (!history?.length) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Regime History</Label>
        <h2 className="text-base font-semibold">48H Composite Score</h2>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={history}>
          <defs>
            <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
          <XAxis dataKey="hour" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
          <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} domain={[-100, 100]} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
            labelStyle={{ color: "#71717a" }}
            formatter={(v) => [v?.toFixed(2), "Score"]}
          />
          <ReferenceLine y={0}   stroke="#27272a" />
          <ReferenceLine y={35}  stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={-35} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Area
            type="monotone" dataKey="score"
            stroke="#22c55e" strokeWidth={2}
            fill="url(#hGrad)" dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────
// MARKET BREADTH
// ─────────────────────────────────────────
function BreadthPanel({ breadth }) {
  if (!breadth?.total) return null;
  const { bullish, neutral, bearish, total, breadth_score } = breadth;
  const scoreColor =
    breadth_score > 30  ? "text-green-400"  :
    breadth_score < -30 ? "text-red-400"    :
    "text-yellow-400";
  const participation = Math.round(((bullish + bearish) / total) * 100);
  const trendLabel =
    breadth_score > 60  ? "Strong Participation" :
    breadth_score > 20  ? "Healthy"              :
    breadth_score > -20 ? "Mixed"                :
    breadth_score > -60 ? "Weak"                 :
    "Broad Risk-Off";

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <Label>Market Breadth</Label>
          <h2 className="text-base font-semibold">Trend Participation ({total} assets)</h2>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-semibold ${scoreColor}`}>
            {breadth_score > 0 ? "+" : ""}{breadth_score}
          </div>
          <div className={`text-xs mt-0.5 ${scoreColor}`}>{trendLabel}</div>
        </div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {bullish > 0 && (
          <div className="bg-green-500 transition-all" style={{ width: `${(bullish / total) * 100}%` }} />
        )}
        {neutral > 0 && (
          <div className="bg-yellow-500 transition-all" style={{ width: `${(neutral / total) * 100}%` }} />
        )}
        {bearish > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${(bearish / total) * 100}%` }} />
        )}
      </div>
      <div className="flex gap-6 text-xs">
        <span className="text-green-400">{bullish} bullish</span>
        <span className="text-yellow-400">{neutral} neutral</span>
        <span className="text-red-400">{bearish} bearish</span>
        <span className="text-gray-600 ml-auto">{participation}% trending</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MULTI-ASSET REGIME MAP
// ─────────────────────────────────────────
function RegimeMap({ overview, activeCoin, onSelect }) {
  if (!overview?.length) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <Label>Multi-Asset Regime Map</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {overview.map((item) => (
          <button
            key={item.coin}
            onClick={() => onSelect(item.coin)}
            className={`border p-3 text-left space-y-1.5 transition-colors rounded-sm ${
              item.coin === activeCoin
                ? "border-white"
                : "border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <div className="font-semibold text-sm">{item.coin}</div>
            {[
              { l: "M", v: item.macro },
              { l: "T", v: item.trend },
              { l: "E", v: item.execution },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-center gap-1">
                <span className="text-gray-600 text-xs w-3">{l}</span>
                <span className={`text-xs ${regimeText(v)}`}>
                  {v
                    ? v.replace("Strong ", "S.").replace("Risk-On", "R+").replace("Risk-Off", "R-")
                    : "—"}
                </span>
              </div>
            ))}
            {item.alignment != null && (
              <div className={`text-xs font-medium ${alignColor(item.alignment)}`}>
                {item.alignment}%
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SURVIVAL CURVE
// ─────────────────────────────────────────
function SurvivalCurve({ curve, regimeAge, isPro, onUnlock }) {
  return (
    <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
      <div>
        <Label>Survival Curve</Label>
        <h2 className="text-base font-semibold">Regime Persistence Probability</h2>
        <p className="text-xs text-gray-500 mt-1">
          Probability current regime persists over time · white line = current age
        </p>
      </div>

      <div className={!isPro ? "blur-sm pointer-events-none" : ""}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curve}>
            <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              stroke="#3f3f46"
              tick={{ fill: "#52525b", fontSize: 10 }}
              label={{ value: "Hours", position: "insideRight", fill: "#52525b", fontSize: 10 }}
            />
            <YAxis
              stroke="#3f3f46"
              tick={{ fill: "#52525b", fontSize: 10 }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
              labelStyle={{ color: "#71717a" }}
              formatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
            />
            <Line
              type="monotone" dataKey="survival"
              stroke="#22c55e" strokeWidth={2}
              dot={false} name="Survival %"
            />
            <Line
              type="monotone" dataKey="hazard"
              stroke="#f87171" strokeWidth={1.5}
              strokeDasharray="4 4" dot={false} name="Hazard %"
            />
            <ReferenceLine
              x={Math.round(regimeAge)}
              stroke="#ffffff"
              strokeDasharray="3 3"
              label={{ value: "Now", fill: "#71717a", fontSize: 10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!isPro && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onUnlock}
        >
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-5 text-center space-y-2">
            <div className="text-sm font-medium">Survival Curve — Pro Only</div>
            <div className="text-xs text-gray-500">
              See where your regime sits on the survival curve
            </div>
            <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold mt-1">
              Unlock Pro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// INTERPRETATION PANEL
// ─────────────────────────────────────────
function InterpretationPanel({ stack, latest, isPro }) {
  if (!stack) return null;
  const regimeAge = stack.regime_age_hours ?? 0;
  const hazard    = stack.hazard    ?? 0;
  const survival  = stack.survival  ?? 0;
  const alignment = stack.alignment ?? 0;

  return (
    <div className="border border-zinc-800 p-8 space-y-4">
      <Label>Regime Interpretation</Label>
      <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-400">
        <div>Regime Age: <span className="text-white">{regimeAge.toFixed(1)}h</span></div>
        {latest && (
          <>
            <div>
              4H Momentum:{" "}
              <span className={(latest.momentum_4h || 0) >= 0 ? "text-green-400" : "text-red-400"}>
                {latest.momentum_4h?.toFixed(2) ?? "—"}%
              </span>
            </div>
            <div>
              24H Momentum:{" "}
              <span className={(latest.momentum_24h || 0) >= 0 ? "text-green-400" : "text-red-400"}>
                {latest.momentum_24h?.toFixed(2) ?? "—"}%
              </span>
            </div>
            <div>
              Volatility:{" "}
              <span className="text-white">{latest.volatility?.toFixed(2) ?? "—"}</span>
            </div>
          </>
        )}
      </div>

      {isPro && hazard > 60 && (
        <div className="text-red-400 text-sm pt-1">
          ⚠ Elevated deterioration risk — hazard above 60%.
        </div>
      )}
      {isPro && survival > 70 && (
        <div className="text-green-400 text-sm pt-1">
          ✓ Regime persistence statistically strong.
        </div>
      )}
      {alignment < 40 && (
        <div className="text-yellow-400 text-sm pt-1">
          ⚡ Low alignment — timeframes conflict. Trade smaller.
        </div>
      )}
      {stack.macro?.label?.includes("Risk-Off") &&
       stack.execution?.label?.includes("Risk-On") && (
        <div className="border border-yellow-900 bg-yellow-900/10 px-4 py-3 text-yellow-400 text-sm">
          Counter-trend detected: short-term bullish inside bearish macro.
          Exposure automatically reduced.
        </div>
      )}
      {stack.macro?.label?.includes("Risk-On") &&
       stack.execution?.label?.includes("Risk-Off") && (
        <div className="border border-blue-900 bg-blue-900/10 px-4 py-3 text-blue-400 text-sm">
          Pullback within bullish macro — potential re-entry zone.
          Await execution alignment before adding size.
        </div>
      )}
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: "" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50
                    flex items-center justify-center px-4">
      <div className="bg-zinc-950 border border-zinc-700 max-w-md w-full
                      p-10 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <Label>ChainPulse Pro</Label>
        <h2 className="text-2xl font-semibold leading-tight">
          Unlock Full Regime