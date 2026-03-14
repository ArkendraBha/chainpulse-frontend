"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX"];
const REFRESH_INTERVAL = 60_000; // 60 seconds

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

function StatCard({ label, value, suffix = "%", colorClass, barColor, hint }) {
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

  const fetchData = useCallback(async (selectedCoin) => {
    try {
      const [latestRes, statsRes, curveRes, historyRes, overviewRes] = await Promise.all([
        fetch(`${BACKEND}/latest?coin=${selectedCoin}`),
        fetch(`${BACKEND}/statistics?coin=${selectedCoin}`),
        fetch(`${BACKEND}/survival-curve?coin=${selectedCoin}`),
        fetch(`${BACKEND}/regime-history?coin=${selectedCoin}&limit=48`),
        fetch(`${BACKEND}/market-overview`),
      ]);

      const [latestData, statsData, curveRaw, historyRaw, overviewRaw] = await Promise.all([
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
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(coin);
    const interval = setInterval(() => fetchData(coin), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [coin, fetchData]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") setProSuccess(true);
    }
  }, []);

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
      console.error("Checkout error:", err);
    }
  };

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="text-center space-y-3">
          <div>No data available yet.</div>
          <div className="text-sm text-gray-600">
            The model is initializing. Check back shortly.
          </div>
        </div>
      </div>
    );
  }

  const exposure = stats.exposure_recommendation_percent ?? 0;
  const shiftRisk = stats.regime_shift_risk_percent ?? 0;
  const survival = stats.survival_probability_percent ?? 0;
  const hazard = stats.hazard_percent ?? 0;
  const percentile = stats.percentile_rank_percent ?? 0;
  const regimeAge = stats.current_regime_age_hours ?? 0;
  const coherence = latest.coherence ?? 0;

  const confidenceTier =
    exposure > 60 ? "Aggressive" : exposure > 30 ? "Balanced" : "Defensive";

  const regimeColorClass = getRegimeColor(latest.label);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* PRO SUCCESS BANNER */}
        {proSuccess && (
          <div className="border border-emerald-700 bg-emerald-950 text-emerald-300 px-6 py-4 rounded-md text-sm">
            ✓ Pro access activated. Welcome to ChainPulse Pro.
          </div>
        )}

        {/* SHIFT RISK ALERT */}
        {shiftRisk > 70 && (
          <div className="border border-red-700 bg-red-950 px-6 py-5 text-red-300 space-y-1">
            <div className="font-semibold">⚠ Regime Deterioration Alert — {coin}</div>
            <div className="text-sm text-red-400">
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
                Updated {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 60s
              </div>
            )}
          </div>

          {/* COIN SELECTOR */}
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
            value={survival}
            colorClass={getRiskColor(100 - survival)}
            barColor={survival > 60 ? "green" : survival > 40 ? "yellow" : "red"}
            hint="Probability the current regime continues"
          />
          <StatCard
            label="Regime Shift Risk"
            value={shiftRisk}
            colorClass={getRiskColor(shiftRisk)}
            barColor={shiftRisk > 70 ? "red" : shiftRisk > 45 ? "yellow" : "green"}
            hint="Composite deterioration indicator"
          />
          <StatCard
            label="Hazard Rate"
            value={hazard}
            colorClass={getRiskColor(hazard)}
            barColor={hazard > 70 ? "red" : hazard > 45 ? "yellow" : "green"}
            hint="Statistical failure risk vs historical norm"
          />
          <StatCard
            label="Coherence Index"
            value={coherence}
            colorClass={coherence > 60 ? "text-emerald-400" : "text-yellow-400"}
            barColor={coherence > 60 ? "green" : "yellow"}
            hint="Directional alignment strength"
          />
          <StatCard
            label="Strength Percentile"
            value={percentile}
            colorClass="text-blue-400"
            barColor="blue"
            hint="Relative to historical observations"
          />
          <StatCard
            label="Regime Score"
            value={latest.score?.toFixed(1)}
            suffix=""
            colorClass={regimeColorClass}
            hint="Composite momentum-volatility score"
          />
        </div>

        {/* REGIME HISTORY CHART */}
        {historyData.length > 0 && (
          <div className="border border-zinc-800 p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Regime Score History — {coin}</h2>
              <p className="text-xs text-gray-500 mt-1">48-hour composite momentum signal</p>
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
                <XAxis
                  dataKey="hour"
                  stroke="#3f3f46"
                  tick={{ fill: "#52525b", fontSize: 11 }}
                />
                <YAxis
                  stroke="#3f3f46"
                  tick={{ fill: "#52525b", fontSize: 11 }}
                  domain={[-100, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: 4,
                  }}
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

        {/* SURVIVAL CURVE */}
        <div className="border border-zinc-800 p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Regime Survival Curve — {coin}</h2>
            <p className="text-xs text-gray-500 mt-1">
              Probability the current regime persists. White line = current age.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={curveData}>
              <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                stroke="#3f3f46"
                tick={{ fill: "#52525b", fontSize: 11 }}
                label={{ value: "Hours", position: "insideBottomRight", fill: "#52525b", fontSize: 11 }}
              />
              <YAxis
                stroke="#3f3f46"
                tick={{ fill: "#52525b", fontSize: 11 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 4,
                }}
                labelStyle={{ color: "#71717a" }}
              />
              <Line
                type="monotone"
                dataKey="survival"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Survival %"
              />
              <Line
                type="monotone"
                dataKey="hazard"
                stroke="#f87171"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
                name="Hazard %"
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

        {/* MULTI-COIN OVERVIEW */}
        {overview.length > 0 && (
          <div className="border border-zinc-800 p-8 space-y-6">
            <h2 className="text-lg font-semibold">Market Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {overview.map((item) => (
                <button
                  key={item.coin}
                  onClick={() => setCoin(item.coin)}
                  className={`border p-4 text-center transition-colors cursor-pointer ${
                    coin === item.coin
                      ? "border-white"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-semibold">{item.coin}</div>
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
              Regime Age: <span className="text-white">{regimeAge.toFixed(1)}h</span>
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

          {hazard > 60 && (
            <div className="text-red-400 text-sm pt-2">
              ⚠ Elevated deterioration risk — statistical hazard above 60%.
            </div>
          )}
          {survival > 70 && (
            <div className="text-green-400 text-sm pt-2">
              ✓ Regime persistence remains statistically strong.
            </div>
          )}
          {coherence < 30 && (
            <div className="text-yellow-400 text-sm pt-2">
              ⚡ Low coherence — conflicting signals across timeframes.
            </div>
          )}
        </div>

        {/* PRO UPSELL */}
        <div className="border border-zinc-700 p-10 text-center space-y-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            ChainPulse Pro
          </div>
          <h3 className="text-2xl font-semibold">
            Get Regime Shift Alerts Before They Hit
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto">
            Pro subscribers receive real-time email alerts when shift risk
            exceeds 70%, weekly regime reports, and full multi-asset analytics.
          </p>
          <button
            onClick={handleCheckout}
            className="bg-white text-black px-8 py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors"
          >
            Activate Pro — \$29/month
          </button>
          <div className="text-gray-600 text-xs">
            7-day risk-free. Cancel anytime.
          </div>
        </div>

      </div>
    </main>
  );
}