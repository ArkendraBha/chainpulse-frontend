"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX"];
const REFRESH_INTERVAL = 60_000;

// -------------------------
// TOKEN MANAGEMENT
// -------------------------

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_token");
}

function saveToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cp_token", token);
}

// -------------------------
// HELPERS
// -------------------------

function getRegimeColor(label) {
  if (!label) return "text-gray-400";
  if (label.includes("Strong Risk-On")) return "text-emerald-400";
  if (label.includes("Risk-On")) return "text-green-400";
  if (label.includes("Strong Risk-Off")) return "text-red-500";
  if (label.includes("Risk-Off")) return "text-red-400";
  return "text-yellow-400";
}

function getRiskColor(value) {
  if (value > 70) return "text-red-400";
  if (value > 45) return "text-yellow-400";
  return "text-green-400";
}

function getExposureColor(value) {
  if (value > 60) return "text-emerald-400";
  if (value > 35) return "text-yellow-400";
  return "text-red-400";
}

function ProgressBar({ value, color }) {
  const colorMap = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    purple: "bg-purple-500",
  };
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${colorMap[color] || "bg-white"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// -------------------------
// BLURRED PRO STAT CARD
// -------------------------

function StatCard({ label, value, suffix = "%", colorClass, barColor, hint, locked }) {
  if (locked) {
    return (
      <div className="border border-zinc-800 p-6 space-y-2 relative overflow-hidden">
        <div className="text-xs text-gray-500 uppercase tracking-widest">{label}</div>
        <div className="text-3xl font-semibold text-gray-800 blur-sm select-none">
          00.0
        </div>
        <ProgressBar value={50} color="green" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Pro
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 p-6 space-y-2">
      <div className="text-xs text-gray-500 uppercase tracking-widest">{label}</div>
      <div className={`text-3xl font-semibold ${colorClass}`}>
        {value}{suffix}
      </div>
      {barColor && <ProgressBar value={parseFloat(value)} color={barColor} />}
      {hint && <div className="text-xs text-gray-600 pt-1">{hint}</div>}
    </div>
  );
}

// -------------------------
// PRO UPGRADE MODAL
// -------------------------

function ProModal({ onClose }) {
  const handleCheckout = async () => {
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-zinc-950 border border-zinc-700 max-w-md w-full p-10 space-y-6 relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-xs text-gray-500 uppercase tracking-widest">
          ChainPulse Pro
        </div>

        <h2 className="text-2xl font-semibold leading-tight">
          Unlock Full Regime Analytics
        </h2>

        <p className="text-gray-400 text-sm">
          You are seeing basic regime data. Pro unlocks the full picture —
          survival modeling, hazard rate, coherence index, trend maturity,
          and real-time shift alerts.
        </p>

        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            Survival probability and hazard rate
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            Coherence index and trend maturity score
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            Strength percentile ranking
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            Real-time shift alerts via email
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            Morning regime brief delivered daily
          </li>
        </ul>

        <div className="pt-2 space-y-3">
          <button
            onClick={handleCheckout}
            className="w-full bg-white text-black py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors"
          >
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

// -------------------------
// MATURITY GAUGE
// -------------------------

function MaturityGauge({ value, locked }) {
  if (locked) {
    return (
      <div className="border border-zinc-800 p-6 space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-widest">
          Trend Maturity Score
        </div>
        <div className="text-3xl font-semibold text-gray-800 blur-sm select-none">
          00.0
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div className="h-2 rounded-full bg-zinc-700 w-1/2" />
        </div>
        <div className="text-xs text-gray-600">Pro required</div>
      </div>
    );
  }

  const maturityLabel =
    value > 75 ? "Overextended" :
    value > 50 ? "Mature" :
    value > 25 ? "Developing" :
    "Early Stage";

  const maturityColor =
    value > 75 ? "text-red-400" :
    value > 50 ? "text-yellow-400" :
    value > 25 ? "text-blue-400" :
    "text-emerald-400";

  const barColor =
    value > 75 ? "red" :
    value > 50 ? "yellow" :
    "blue";

  return (
    <div className="border border-zinc-800 p-6 space-y-3">
      <div className="text-xs text-gray-500 uppercase tracking-widest">
        Trend Maturity Score
      </div>
      <div className="flex items-end gap-3">
        <div className={`text-3xl font-semibold ${maturityColor}`}>
          {value}%
        </div>
        <div className={`text-sm pb-1 ${maturityColor}`}>
          {maturityLabel}
        </div>
      </div>
      <ProgressBar value={value} color={barColor} />
      <div className="text-xs text-gray-600">
        0% = fresh regime · 100% = overextended
      </div>
    </div>
  );
}

// -------------------------
// MAIN DASHBOARD
// -------------------------

export default function Dashboard() {
  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const [curveData, setCurveData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [overview, setOverview] = useState([]);
  const [coin, setCoin] = useState("BTC");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [proSuccess, setProSuccess] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [token, setToken] = useState(null);

  // Read token from URL or localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const successParam = params.get("success");

    if (urlToken) {
      saveToken(urlToken);
      setToken(urlToken);
      // Clean URL
      window.history.replaceState({}, "", "/app");
    } else {
      const stored = getToken();
      if (stored) setToken(stored);
    }

    if (successParam === "true") {
      setProSuccess(true);
    }
  }, []);

  const fetchData = useCallback(async (selectedCoin, currentToken) => {
    try {
      const headers = {};
      if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
      }

      const [latestRes, statsRes, curveRes, historyRes, overviewRes] =
        await Promise.all([
          fetch(`${BACKEND}/latest?coin=${selectedCoin}`, { headers }),
          fetch(`${BACKEND}/statistics-gated?coin=${selectedCoin}`, { headers }),
          fetch(`${BACKEND}/survival-curve?coin=${selectedCoin}`, { headers }),
          fetch(`${BACKEND}/regime-history?coin=${selectedCoin}&limit=48`, { headers }),
          fetch(`${BACKEND}/market-overview`, { headers }),
        ]);

      const [latestData, statsData, curveRaw, historyRaw, overviewRaw] =
        await Promise.all([
          latestRes.json(),
          statsRes.json(),
          curveRes.json(),
          historyRes.json(),
          overviewRes.json(),
        ]);

      setLatest(latestData);
      setStats(statsData);
      setCurveData(curveRaw.data || []);
      setHistoryData(historyRaw.data || []);
      setOverview(overviewRaw.data || []);
      setLastUpdated(new Date());

      // Show modal if not pro — delay 2s for UX
      if (statsData?.pro_required && !currentToken) {
        setTimeout(() => setShowProModal(true), 2000);
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
    const interval = setInterval(() => fetchData(coin, token), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [coin, token, fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        <div className="text-sm">Loading Regime Model...</div>
      </div>
    );
  }

  if (!latest || latest.message || !stats || stats.message) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-gray-400">
        <div className="text-center space-y-3">
          <div>No regime data available yet.</div>
          <div className="text-sm text-gray-600">
            The model is initializing. Check back in a few minutes.
          </div>
        </div>
      </div>
    );
  }

  const isPro = !stats.pro_required;
  const exposure = stats.exposure_recommendation_percent ?? 0;
  const shiftRisk = stats.regime_shift_risk_percent ?? 0;
  const survival = stats.survival_probability_percent;
  const hazard = stats.hazard_percent;
  const percentile = stats.percentile_rank_percent;
  const coherence = stats.coherence ?? latest.coherence;
  const maturity = stats.trend_maturity_score;
  const regimeAge = stats.current_regime_age_hours ?? 0;

  const confidenceTier =
    exposure > 60 ? "Aggressive" :
    exposure > 30 ? "Balanced" :
    "Defensive";

  const regimeColorClass = getRegimeColor(latest.label);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">

      {/* PRO MODAL */}
      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}

      <div className="max-w-6xl mx-auto space-y-10">

        {/* PRO SUCCESS */}
        {proSuccess && (
          <div className="border border-emerald-700 bg-emerald-950 text-emerald-300 px-6 py-4 rounded-md text-sm">
            ✓ Pro access activated. Welcome to ChainPulse Pro.
          </div>
        )}

        {/* FREE TIER BANNER */}
        {!isPro && (
          <div
            className="border border-zinc-700 bg-zinc-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => setShowProModal(true)}
          >
            <div className="space-y-1">
              <div className="text-sm text-white font-medium">
                You are viewing free tier data
              </div>
              <div className="text-xs text-gray-500">
                Survival modeling, hazard rate, coherence and maturity score are locked.
              </div>
            </div>
            <button className="bg-white text-black px-5 py-2 rounded-md text-sm font-semibold whitespace-nowrap hover:bg-gray-100 transition-colors">
              Unlock Pro
            </button>
          </div>
        )}

        {/* SHIFT RISK ALERT */}
        {shiftRisk > 70 && (
          <div className="border border-red-700 bg-red-950 px-6 py-5 text-red-300 space-y-1">
            <div className="font-semibold text-sm">
              ⚠ Regime Deterioration Alert — {coin}
            </div>
            <div className="text-xs text-red-400">
              Shift risk elevated to {shiftRisk}%. Consider reducing exposure.
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Regime Allocation Model</h1>
            {lastUpdated && (
              <div className="text-xs text-gray-600 mt-1">
                Updated {lastUpdated.toLocaleTimeString()} · Refreshes every 60s
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

        {/* EXPOSURE HERO */}
        <div className="border border-zinc-800 p-10 text-center space-y-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            Recommended Exposure
          </div>
          <div className={`text-7xl font-semibold ${getExposureColor(exposure)}`}>
            {exposure}%
          </div>
          <div className={`text-xl font-medium ${regimeColorClass}`}>
            {latest.label}
          </div>
          <div className="text-sm text-gray-500">
            {confidenceTier} Regime · Active {regimeAge.toFixed(1)}h
          </div>
          <ProgressBar
            value={exposure}
            color={exposure > 60 ? "emerald" : exposure > 35 ? "yellow" : "red"}
          />
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <StatCard
            label="Survival Probability"
            value={isPro ? survival : "??"}
            colorClass={isPro ? getRiskColor(100 - survival) : "text-gray-700"}
            barColor={isPro ? (survival > 60 ? "green" : survival > 40 ? "yellow" : "red") : "green"}
            hint="Probability the current regime continues"
            locked={!isPro}
          />

          <StatCard
            label="Regime Shift Risk"
            value={shiftRisk}
            colorClass={getRiskColor(shiftRisk)}
            barColor={shiftRisk > 70 ? "red" : shiftRisk > 45 ? "yellow" : "green"}
            hint="Composite deterioration indicator"
            locked={false}
          />

          <StatCard
            label="Hazard Rate"
            value={isPro ? hazard : "??"}
            colorClass={isPro ? getRiskColor(hazard) : "text-gray-700"}
            barColor={isPro ? (hazard > 70 ? "red" : hazard > 45 ? "yellow" : "green") : "green"}
            hint="Statistical failure risk vs historical norm"
            locked={!isPro}
          />

          <StatCard
            label="Coherence Index"
            value={isPro ? coherence : "??"}
            colorClass={isPro ? (coherence > 60 ? "text-emerald-400" : "text-yellow-400") : "text-gray-700"}
            barColor={isPro ? (coherence > 60 ? "green" : "yellow") : "green"}
            hint="Directional alignment across timeframes"
            locked={!isPro}
          />

          <StatCard
            label="Strength Percentile"
            value={isPro ? percentile : "??"}
            colorClass={isPro ? "text-blue-400" : "text-gray-700"}
            barColor="blue"
            hint="Relative to historical observations"
            locked={!isPro}
          />

          <StatCard
            label="Regime Score"
            value={latest.score?.toFixed(1)}
            suffix=""
            colorClass={regimeColorClass}
            hint="Composite momentum-volatility score"
            locked={false}
          />

        </div>

        {/* TREND MATURITY — FULL WIDTH */}
        <MaturityGauge value={isPro ? maturity : null} locked={!isPro} />

        {/* REGIME HISTORY CHART */}
        {historyData.length > 0 && (
          <div className="border border-zinc-800 p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">
                Regime Score History — {coin}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                48-hour composite momentum signal
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 11 }} />
                <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 11 }} domain={[-100, 100]} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                  labelStyle={{ color: "#71717a" }}
                  itemStyle={{ color: "#22c55e" }}
                />
                <ReferenceLine y={0} stroke="#27272a" />
                <ReferenceLine y={35} stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={-35} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.4} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SURVIVAL CURVE — PRO ONLY */}
        <div className={`border border-zinc-800 p-8 space-y-6 relative ${!isPro ? "overflow-hidden" : ""}`}>
          <div>
            <h2 className="text-lg font-semibold">
              Regime Survival Curve — {coin}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Probability the current regime persists over time
            </p>
          </div>

          <div className={!isPro ? "blur-sm pointer-events-none" : ""}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={curveData}>
                <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 11 }} />
                <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                  labelStyle={{ color: "#71717a" }}
                />
                <Line type="monotone" dataKey="survival" stroke="#22c55e" strokeWidth={2} dot={false} name="Survival %" />
                <Line type="monotone" dataKey="hazard" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Hazard %" />
                <ReferenceLine x={Math.round(regimeAge)} stroke="#ffffff" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {!isPro && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={() => setShowProModal(true)}
            >
              <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
                <div className="text-sm font-medium">Survival Curve — Pro Only</div>
                <div className="text-xs text-gray-500">
                  See exactly where your regime is on the survival curve
                </div>
                <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold mt-2">
                  Unlock Pro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MULTI-COIN OVERVIEW */}
        {overview.length > 0 && (
          <div className="border border-zinc-800 p-8 space-y-6">
            <h2 className="text-lg font-semibold">Market Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {overview.map((item) => (
                <button
                  key={item.coin}
                  onClick={() => setCoin(item.coin)}
                  className={`border p-4 text-center transition-colors ${
                    coin === item.coin ? "border-white" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-semibold text-sm">{item.coin}</div>
                  <div className={`text-xs mt-1 ${getRegimeColor(item.label)}`}>
                    {item.label}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {item.score?.toFixed(1)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* REGIME INTERPRETATION */}
        <div className="border border-zinc-800 p-8 space-y-4">
          <h2 className="text-base font-semibold text-gray-300">
            Regime Interpretation
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              Regime Age:{" "}
              <span className="text-white">{regimeAge.toFixed(1)}h</span>
            </div>
            <div>
              4h Momentum:{" "}
              <span className={latest.momentum_4h >= 0 ? "text-green-400" : "text-red-400"}>
                {latest.momentum_4h?.toFixed(2)}%
              </span>
            </div>
            <div>
              24h Momentum:{" "}
              <span className={latest.momentum_24h >= 0 ? "text-green-400" : "text-red-400"}>
                {latest.momentum_24h?.toFixed(2)}%
              </span>
            </div>
            <div>
              Volatility:{" "}
              <span className="text-white">{latest.volatility?.toFixed(2)}</span>
            </div>
          </div>

          {hazard > 60 && isPro && (
            <div className="text-red-400 text-sm pt-2">
              ⚠ Elevated deterioration risk — statistical hazard above 60%.
            </div>
          )}
          {survival > 70 && isPro && (
            <div className="text-green-400 text-sm pt-2">
              ✓ Regime persistence remains statistically strong.
            </div>
          )}
        </div>

        {/* PRO UPSELL — shown only to free users */}
        {!isPro && (
          <div
            className="border border-zinc-700 p-10 text-center space-y-6 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => setShowProModal(true)}
          >
            <div className="text-xs text-gray-500 uppercase tracking-widest">
              ChainPulse Pro
            </div>
            <h3 className="text-2xl font-semibold">
              Unlock Full Regime Analytics
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Survival curve, hazard rate, coherence index, trend maturity score,
              real-time shift alerts, daily morning brief.
            </p>
            <div className="text-gray-300 text-sm">
              \$29/month · Designed for traders managing \$5k+
            </div>
            <div className="text-gray-500 text-xs">
              Average user avoids 1–2 poor entries per month.
              At \$5k+ managed, that covers the cost many times over.
            </div>
            <button className="bg-white text-black px-8 py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors">
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