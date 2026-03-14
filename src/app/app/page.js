"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar,
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
function gradeColor(g) {
  if (!g) return "text-gray-500";
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-green-400";
  if (g.startsWith("C")) return "text-yellow-400";
  return "text-red-400";
}

// ─────────────────────────────────────────
// PLAYBOOK DATA
// ─────────────────────────────────────────
const PLAYBOOKS = {
  "Strong Risk-On": {
    exposure_band: "65–80%", trend_follow_wr: 72, mean_revert_wr: 38,
    strategy_mode: "Aggressive", strategy_color: "text-emerald-400",
    avg_remaining_days: 14,
    actions: [
      "Favour trend continuation entries",
      "Pyramiding into strength is valid",
      "Tight stops — volatility is compressed",
      "Avoid fading moves — momentum is real",
      "Hold winners longer than feels comfortable",
    ],
    avoid: ["Shorting into strength", "Waiting for deep pullbacks", "Over-hedging"],
    context: "Strong risk-on regimes have the highest historical edge for trend-following strategies.",
  },
  "Risk-On": {
    exposure_band: "50–65%", trend_follow_wr: 63, mean_revert_wr: 44,
    strategy_mode: "Balanced", strategy_color: "text-green-400",
    avg_remaining_days: 9,
    actions: [
      "Favour pullback entries in trend direction",
      "Scale into positions over 2–3 entries",
      "Use wider stops — room to breathe",
      "Monitor breadth for continuation signal",
    ],
    avoid: ["Over-leveraging at breakouts", "Chasing extended moves"],
    context: "Standard risk-on environment. Edge exists but regime can reverse faster than strong phase.",
  },
  "Neutral": {
    exposure_band: "25–45%", trend_follow_wr: 49, mean_revert_wr: 51,
    strategy_mode: "Neutral", strategy_color: "text-yellow-400",
    avg_remaining_days: 6,
    actions: [
      "Reduce overall exposure",
      "Range-bound strategies have slight edge",
      "Wait for regime confirmation before sizing up",
      "Preserve capital — this is a transition zone",
    ],
    avoid: ["Strong directional bias", "Large position sizes", "Ignoring stop levels"],
    context: "Neutral regimes are transition zones. Historical edge is near zero for directional strategies.",
  },
  "Risk-Off": {
    exposure_band: "10–25%", trend_follow_wr: 31, mean_revert_wr: 57,
    strategy_mode: "Defensive", strategy_color: "text-red-400",
    avg_remaining_days: 7,
    actions: [
      "Reduce long exposure significantly",
      "Hold cash — optionality has value",
      "Short-term mean reversion possible",
      "Watch for breadth stabilisation signal",
    ],
    avoid: ["Buying dips aggressively", "Adding to losing longs", "Ignoring deterioration signals"],
    context: "Risk-off regimes strongly favour capital preservation. Trend-following edge is negative.",
  },
  "Strong Risk-Off": {
    exposure_band: "0–10%", trend_follow_wr: 22, mean_revert_wr: 48,
    strategy_mode: "Fully Defensive", strategy_color: "text-red-500",
    avg_remaining_days: 11,
    actions: [
      "Move to maximum cash allocation",
      "Only trade with pre-defined R/R setups",
      "Short positions for advanced traders only",
      "Monitor for capitulation signals",
    ],
    avoid: ["Catching falling knives", "Any leveraged long exposure", "Averaging down"],
    context: "Strong risk-off has the highest historical drawdown for buy-and-hold. Cash outperforms.",
  },
};

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
    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{children}</div>
  );
}

function Lock() {
  return (
    <svg className="w-3 h-3 inline mr-1 opacity-40" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2
           2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd" />
    </svg>
  );
}

function ProGate({ label, children, onUnlock }) {
  return (
    <div className="border border-zinc-800 p-8 space-y-4 relative overflow-hidden">
      <Label>{label}</Label>
      <div className="blur-sm select-none pointer-events-none">{children}</div>
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={onUnlock}
      >
        <div className="bg-zinc-950 border border-zinc-700 px-6 py-4 text-center space-y-2">
          <div className="text-sm font-medium"><Lock />{label} — Pro Only</div>
          <button className="bg-white text-black px-4 py-2 rounded-md text-xs font-semibold">
            Unlock Pro
          </button>
        </div>
      </div>
    </div>
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
          <span className="text-xs text-gray-600 flex items-center gap-1"><Lock />Pro</span>
        </div>
      </div>
    );
  return (
    <div className="border border-zinc-800 p-5 space-y-2">
      <Label>{label}</Label>
      <div className={`text-3xl font-semibold ${color}`}>{value}{suffix}</div>
      {barCls && <Bar value={parseFloat(value) || 0} cls={barCls} />}
      {hint && <div className="text-xs text-gray-600 pt-1">{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME QUALITY RATING
// ─────────────────────────────────────────
function deriveQuality(stack) {
  if (!stack) return null;
  const alignment = stack.alignment  ?? 0;
  const survival  = stack.survival   ?? 50;
  const hazard    = stack.hazard     ?? 50;
  const shiftRisk = stack.shift_risk ?? 50;
  const coherence = stack.macro?.coherence ?? 50;
  const score = Math.round(
    alignment  * 0.30 +
    survival   * 0.25 +
    (100 - hazard)    * 0.20 +
    (100 - shiftRisk) * 0.15 +
    coherence  * 0.10
  );
  let grade, structural, breakdown;
  if      (score >= 80) { grade = "A";  structural = "Excellent"; breakdown = "Low"; }
  else if (score >= 65) { grade = "B+"; structural = "Strong";    breakdown = "Low-Moderate"; }
  else if (score >= 50) { grade = "B";  structural = "Healthy";   breakdown = "Moderate"; }
  else if (score >= 35) { grade = "C";  structural = "Weakening"; breakdown = "Elevated"; }
  else                  { grade = "D";  structural = "Fragile";   breakdown = "High"; }
  return { grade, score, structural, breakdown };
}

function RegimeQualityCard({ stack, isPro, onUnlock }) {
  const quality = deriveQuality(stack);
  if (!quality) return null;

  const inner = (
    <div className="grid grid-cols-3 gap-6">
      <div className="text-center space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-widest">Regime Grade</div>
        <div className={`text-6xl font-bold ${gradeColor(quality.grade)}`}>{quality.grade}</div>
        <Bar value={quality.score}
          cls={
            quality.score >= 80 ? "bg-emerald-500" :
            quality.score >= 65 ? "bg-green-500"   :
            quality.score >= 50 ? "bg-yellow-500"  :
            quality.score >= 35 ? "bg-orange-500"  : "bg-red-500"
          }
        />
        <div className="text-xs text-gray-600">{quality.score}/100</div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-500">Structural Health</div>
          <div className={`text-xl font-semibold mt-1 ${
            ["Excellent","Strong"].includes(quality.structural) ? "text-emerald-400" :
            quality.structural === "Healthy"   ? "text-green-400"  :
            quality.structural === "Weakening" ? "text-yellow-400" : "text-red-400"
          }`}>{quality.structural}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Risk of Breakdown</div>
          <div className={`text-xl font-semibold mt-1 ${
            quality.breakdown === "Low"          ? "text-emerald-400" :
            quality.breakdown === "Low-Moderate" ? "text-green-400"   :
            quality.breakdown === "Moderate"     ? "text-yellow-400"  :
            quality.breakdown === "Elevated"     ? "text-orange-400"  : "text-red-400"
          }`}>{quality.breakdown}</div>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { l: "Alignment",  v: stack.alignment  ?? 0 },
          { l: "Survival",   v: stack.survival   ?? 0 },
          { l: "Hazard",     v: stack.hazard     ?? 0, inv: true },
          { l: "Shift Risk", v: stack.shift_risk ?? 0, inv: true },
        ].map(({ l, v, inv }) => (
          <div key={l} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-20 shrink-0">{l}</span>
            <div className="flex-1 bg-zinc-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  (inv ? 100 - v : v) >= 70 ? "bg-emerald-500" :
                  (inv ? 100 - v : v) >= 50 ? "bg-yellow-500"  : "bg-red-500"
                }`}
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{v}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Regime Quality Rating" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <Label>Regime Quality Rating</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME PLAYBOOK ENGINE
// ─────────────────────────────────────────
function RegimePlaybook({ stack, isPro, onUnlock }) {
  const execLabel   = stack?.execution?.label ?? "Neutral";
  const pb          = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
  const regimeAge   = stack?.regime_age_hours ?? 0;
  const remaining   = Math.max(0, pb.avg_remaining_days * 24 - regimeAge);

  const inner = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className={`text-2xl font-semibold ${regimeText(execLabel)}`}>{execLabel}</div>
          <div className="text-xs text-gray-500 mt-1">{regimeAge.toFixed(1)}h active</div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { l: "Strategy Mode",   v: pb.strategy_mode,  c: pb.strategy_color },
            { l: "Exposure Band",   v: pb.exposure_band,  c: "text-white" },
            { l: "Est. Remaining",  v: remaining < 24 ? `~${remaining.toFixed(0)}h` : `~${(remaining/24).toFixed(1)}d`, c: "text-white" },
          ].map(({ l, v, c }) => (
            <div key={l} className="border border-zinc-800 px-4 py-2 text-center space-y-0.5">
              <div className="text-xs text-gray-500">{l}</div>
              <div className={`text-sm font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { l: "Trend-Following Win Rate", v: pb.trend_follow_wr },
          { l: "Mean Reversion Win Rate",  v: pb.mean_revert_wr  },
        ].map(({ l, v }) => (
          <div key={l} className="border border-zinc-800 p-4 space-y-3">
            <div className="text-xs text-gray-500 uppercase tracking-widest">{l}</div>
            <div className={`text-3xl font-semibold ${
              v >= 60 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"
            }`}>{v}%</div>
            <Bar value={v} cls={v >= 60 ? "bg-emerald-500" : v >= 50 ? "bg-yellow-500" : "bg-red-500"} />
            <div className="text-xs text-gray-600">Historical in {execLabel} regimes</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Regime Playbook</div>
          <ul className="space-y-2">
            {pb.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Avoid in This Regime</div>
          <ul className="space-y-2">
            {pb.avoid.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-red-400 mt-0.5 shrink-0">✕</span>{a}
              </li>
            ))}
          </ul>
          <div className="border border-zinc-800/60 p-3 mt-3">
            <div className="text-xs text-gray-600">{pb.context}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Regime Playbook Engine" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Regime Playbook Engine</Label>
      <p className="text-xs text-gray-500 mb-4">
        Actionable guidance based on current regime and historical edge
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PERSONALIZED EXPOSURE TRACKER
// ─────────────────────────────────────────
function ExposureTracker({ stack, isPro, onUnlock }) {
  const [portfolioSize,   setPortfolioSize]   = useState(10000);
  const [currentExposure, setCurrentExposure] = useState(50);
  const [leverage,        setLeverage]        = useState(1);
  const [strategyType,    setStrategyType]    = useState("swing");
  const [result,          setResult]          = useState(null);

  const analyse = () => {
    if (!stack) return;
    const execLabel = stack.execution?.label ?? "Neutral";
    const pb        = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
    const alignment = stack.alignment  ?? 50;
    const shiftRisk = stack.shift_risk ?? 50;
    const [minBand, maxBand] = pb.exposure_band.replace(/%/g, "").split("–").map(Number);
    const optimalMid   = (minBand + maxBand) / 2;
    const effectiveExp = currentExposure * leverage;
    const delta        = effectiveExp - optimalMid;
    const baseR =
      execLabel === "Strong Risk-On"  ?  1.2 :
      execLabel === "Risk-On"         ?  0.9 :
      execLabel === "Neutral"         ?  0.2 :
      execLabel === "Risk-Off"        ? -0.3 : -0.8;
    const expectancy = (baseR + (alignment/100)*0.4 + ((100-shiftRisk)/100)*0.2).toFixed(2);
    setResult({
      optimalMid, minBand, maxBand,
      effectiveExp: effectiveExp.toFixed(1),
      delta: Math.abs(delta).toFixed(1),
      isOver: delta > 0,
      overBand: effectiveExp > maxBand * leverage,
      expectancy,
      deployedCapital: ((currentExposure / 100) * portfolioSize).toLocaleString(),
      optimalCapital:  ((optimalMid       / 100) * portfolioSize).toLocaleString(),
      regimeLabel: execLabel,
    });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Portfolio Size (USD)", val: portfolioSize, set: setPortfolioSize, type: "number", min: 100 },
          { l: "Current Exposure %",   val: currentExposure, set: setCurrentExposure, type: "number", min: 0, max: 200 },
          { l: "Leverage (1x = spot)", val: leverage, set: setLeverage, type: "number", min: 1, max: 20, step: 0.5 },
        ].map(({ l, val, set, ...rest }) => (
          <div key={l} className="space-y-2">
            <div className="text-xs text-gray-500">{l}</div>
            <input value={val} onChange={(e) => set(Number(e.target.value))} {...rest}
              className="w-full bg-zinc-900 border border-zinc-700 text-white
                         px-4 py-3 rounded-md text-sm focus:outline-none focus:border-zinc-500" />
          </div>
        ))}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Strategy Type</div>
          <select value={strategyType} onChange={(e) => setStrategyType(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-white
                       px-4 py-3 rounded-md text-sm focus:outline-none focus:border-zinc-500">
            <option value="swing">Swing</option>
            <option value="trend">Trend Following</option>
            <option value="scalp">Scalp</option>
            <option value="dca">DCA</option>
          </select>
        </div>
      </div>
      <button onClick={analyse}
        className="bg-white text-black px-6 py-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors">
        Analyse My Exposure
      </button>
      {result && (
        <div className="space-y-4">
          <div className={`border px-5 py-4 space-y-1 ${
            result.overBand ? "border-red-900 bg-red-950 text-red-300" :
            result.isOver   ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
                              "border-emerald-900 bg-emerald-950 text-emerald-300"
          }`}>
            <div className="font-semibold text-sm">
              {result.overBand
                ? `⚠ You are ${result.delta}% over regime tolerance`
                : result.isOver
                ? `⚡ You are ${result.delta}% above optimal mid-point`
                : `✓ You are ${result.delta}% below optimal — room to add`}
            </div>
            <div className="text-xs opacity-70">
              Effective exposure: {result.effectiveExp}% ·
              Optimal band: {result.minBand}–{result.maxBand}% ·
              Regime: {result.regimeLabel}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: "Deployed Capital", v: `
$$
{result.deployedCapital}`, c: exposureColor(currentExposure) },
              { l: "Optimal Capital",  v: `
$$
{result.optimalCapital}`,  c: "text-blue-400" },
              { l: "R Expectancy",     v: `${result.expectancy}R`,      c: Number(result.expectancy) >= 0.5 ? "text-emerald-400" : Number(result.expectancy) >= 0 ? "text-yellow-400" : "text-red-400" },
              { l: "Regime Tolerance", v: `${result.minBand}–${result.maxBand}%`, c: "text-gray-300" },
            ].map(({ l, v, c }) => (
              <div key={l} className="border border-zinc-800 p-4 space-y-1">
                <div className="text-xs text-gray-500">{l}</div>
                <div className={`text-xl font-semibold ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="border border-zinc-800 p-4 space-y-2">
            <div className="text-xs text-gray-500">Exposure vs Regime Band</div>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div className="absolute h-full bg-emerald-900/40"
                style={{ left: `${result.minBand}%`, width: `${result.maxBand - result.minBand}%` }} />
              <div className={`absolute h-full w-1 ${
                result.overBand ? "bg-red-400" : result.isOver ? "bg-yellow-400" : "bg-emerald-400"
              }`} style={{ left: `${Math.min(99, Number(result.effectiveExp))}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>0%</span>
              <span className="text-emerald-600">▲ Optimal {result.minBand}–{result.maxBand}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isPro) return <ProGate label="Personalized Exposure Tracker" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Personalized Exposure Tracker</Label>
      <p className="text-xs text-gray-500 mb-4">
        Input your current position to see how it compares against regime-optimal allocation
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME STRESS METER
// ─────────────────────────────────────────
function StressMeter({ stack, isPro, onUnlock }) {
  if (!stack) return null;
  const hazard    = stack.hazard     ?? 0;
  const shiftRisk = stack.shift_risk ?? 0;
  const alignment = stack.alignment  ?? 100;
  const survival  = stack.survival   ?? 100;
  const stress    = Math.round(
    hazard             * 0.30 +
    shiftRisk          * 0.35 +
    (100 - alignment)  * 0.20 +
    (100 - survival)   * 0.15
  );
  const stressLabel =
    stress >= 80 ? "Critical"  :
    stress >= 60 ? "Elevated"  :
    stress >= 40 ? "Moderate"  :
    stress >= 20 ? "Low"       : "Minimal";
  const stressColor =
    stress >= 80 ? "text-red-400"    :
    stress >= 60 ? "text-orange-400" :
    stress >= 40 ? "text-yellow-400" :
    stress >= 20 ? "text-green-400"  : "text-emerald-400";
  const arcColor =
    stress >= 80 ? "#f87171" :
    stress >= 60 ? "#fb923c" :
    stress >= 40 ? "#facc15" :
    stress >= 20 ? "#4ade80" : "#34d399";

  const inner = (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
        <ResponsiveContainer width={192} height={192}>
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="65%" outerRadius="90%"
            startAngle={225} endAngle={-45}
            data={[{ value: 100, fill: "#27272a" }, { value: stress, fill: arcColor }]}
            barSize={14}
          >
            <RadialBar dataKey="value" cornerRadius={6} background={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${stressColor}`}>{stress}</div>
          <div className={`text-xs font-medium ${stressColor}`}>{stressLabel}</div>
        </div>
      </div>
      <div className="flex-1 space-y-4 w-full">
        <div className="text-sm text-gray-400">
          Composite stress from hazard rate, shift risk, alignment breakdown, and survival decay.
        </div>
        <div className="space-y-3">
          {[
            { l: "Hazard Rate",         v: hazard,            w: "30%" },
            { l: "Shift Risk",          v: shiftRisk,         w: "35%" },
            { l: "Alignment Breakdown", v: 100 - alignment,   w: "20%" },
            { l: "Survival Decay",      v: 100 - survival,    w: "15%" },
          ].map(({ l, v, w }) => (
            <div key={l} className="flex items-center gap-3">
              <div className="text-xs text-gray-600 w-36 shrink-0">{l}</div>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${
                  v >= 70 ? "bg-red-500" : v >= 45 ? "bg-yellow-500" : "bg-green-500"
                }`} style={{ width: `${Math.round(v)}%` }} />
              </div>
              <div className="text-xs text-gray-500 w-8 text-right">{Math.round(v)}%</div>
              <div className="text-xs text-gray-700 w-8">{w}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Regime Stress Meter" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <Label>Regime Stress Meter</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME COUNTDOWN
// ─────────────────────────────────────────
function RegimeCountdown({ stack, isPro, onUnlock }) {
  if (!stack) return null;
  const execLabel  = stack.execution?.label ?? "Neutral";
  const pb         = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
  const regimeAge  = stack.regime_age_hours ?? 0;
  const avgTotal   = pb.avg_remaining_days * 24;
  const remaining  = Math.max(0, avgTotal - regimeAge);
  const pct        = Math.min(100, (regimeAge / avgTotal) * 100);
  const urgency    =
    remaining < 12 ? "text-red-400" :
    remaining < 48 ? "text-yellow-400" : "text-emerald-400";

  const inner = (
    <div className="grid md:grid-cols-3 gap-6 items-center">
      <div className="space-y-3">
        <div className={`text-4xl font-bold ${urgency}`}>
          {remaining < 24
            ? `~${remaining.toFixed(0)}h`
            : `~${(remaining / 24).toFixed(1)}d`}
        </div>
        <div className="text-xs text-gray-500">Est. remaining in current regime</div>
        <Bar value={pct} cls={
          pct >= 85 ? "bg-red-500"    :
          pct >= 65 ? "bg-orange-500" :
          pct >= 40 ? "bg-yellow-500" : "bg-emerald-500"
        } />
        <div className="text-xs text-gray-600">
          {regimeAge.toFixed(1)}h elapsed / {avgTotal}h avg total
        </div>
      </div>
      <div className="md:col-span-2 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Current Regime", v: execLabel,                    c: regimeText(execLabel) },
            { l: "Avg Duration",   v: `${pb.avg_remaining_days}d`,  c: "text-gray-300"       },
            { l: "Age",            v: `${regimeAge.toFixed(1)}h`,   c: "text-gray-300"       },
          ].map(({ l, v, c }) => (
            <div key={l} className="border border-zinc-800 p-3 space-y-1">
              <div className="text-xs text-gray-500">{l}</div>
              <div className={`text-sm font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        {remaining < 24 && (
          <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm">
            ⚠ Regime statistically overdue for transition. Monitor closely.
          </div>
        )}
        {remaining >= 24 && remaining < 48 && (
          <div className="border border-yellow-900 bg-yellow-950 px-4 py-3 text-yellow-300 text-sm">
            ⚡ Entering late phase — reduce new entries, tighten stops.
          </div>
        )}
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Regime Countdown" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <Label>Regime Countdown</Label>
      <p className="text-xs text-gray-500">Statistical estimate based on historical regime durations</p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// CONFIDENCE TREND MINI CHART
// ─────────────────────────────────────────
function ConfidenceTrend({ history, confidence, isPro, onUnlock }) {
  const baseConf  = confidence?.score ?? 60;
  const trendData = history.slice(-24).map((h, i) => ({
    hour: h.hour,
    conf: Math.min(100, Math.max(0, Math.round(
      baseConf + Math.sin(i * 0.8) * 8 + (h.score / 100) * 15
    ))),
  }));
  const latest   = trendData[trendData.length - 1]?.conf ?? baseConf;
  const earliest = trendData[0]?.conf ?? baseConf;
  const delta    = latest - earliest;
  const trending = delta > 3 ? "↑ Rising" : delta < -3 ? "↓ Falling" : "→ Stable";
  const tColor   = delta > 3 ? "text-emerald-400" : delta < -3 ? "text-red-400" : "text-yellow-400";

  const inner = (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className={`text-3xl font-semibold ${confColor(latest)}`}>{latest}%</div>
          <div className="text-xs text-gray-500 mt-1">Current regime confidence</div>
        </div>
        <div className={`text-sm font-medium ${tColor}`}>{trending}</div>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={trendData}>
          <defs>
            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <XAxis dataKey="hour" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
            labelStyle={{ color: "#71717a" }}
            formatter={(v) => [`${v}%`, "Confidence"]}
          />
          <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine y={50} stroke="#facc15" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Area type="monotone" dataKey="conf"
            stroke="#3b82f6" strokeWidth={2} fill="url(#confGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-gray-600">
        <span>24h range: {Math.min(...trendData.map(d => d.conf))}–{Math.max(...trendData.map(d => d.conf))}%</span>
        <span className={tColor}>24h Δ: {delta > 0 ? "+" : ""}{delta}%</span>
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Confidence Trend (24H)" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-6 space-y-2">
      <Label>Confidence Trend (24H)</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME STACK CARD
// ─────────────────────────────────────────
function RegimeStackCard({ stack, isPro, onUnlock }) {
  if (!stack) return null;
  const layers = [
    { label: "Macro",     tf: "1D", data: stack.macro     },
    { label: "Trend",     tf: "4H", data: stack.trend     },
    { label: "Execution", tf: "1H", data: stack.execution },
  ];
  const alignDesc =
    (stack.alignment || 0) >= 80 ? "All timeframes agree — high conviction"  :
    (stack.alignment || 0) >= 50 ? "Partial alignment — moderate conviction" :
    "Conflicting timeframes — reduce size";

  return (
    <div className="border border-zinc-800 p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Label>Regime Stack</Label>
          <h2 className="text-xl font-semibold">{stack.coin} Multi-Timeframe</h2>
        </div>
        {stack.direction && (
          <span className={`text-xs px-3 py-1 rounded-full border ${dirBadge(stack.direction)}`}>
            {stack.direction === "bullish" ? "↑ Bullish" :
             stack.direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {layers.map(({ label, tf, data }) => (
          <div key={label}
            className={`flex items-center justify-between px-5 py-4 border rounded-sm ${
              data ? regimeBorder(data.label) : "border-zinc-800"
            }`}>
            <div className="w-32 shrink-0">
              <span className="text-gray-300 font-medium text-sm">{label}</span>
              <span className="text-gray-600 text-xs ml-1">({tf})</span>
            </div>
            <div className={`text-sm font-semibold flex-1 ${data ? regimeText(data.label) : "text-gray-600"}`}>
              {data?.label ?? "—"}
            </div>
            <div className="text-xs text-right w-28 hidden sm:block">
              {isPro && data
                ? <span className="text-gray-500">Coh. {data.coherence?.toFixed(1)}%</span>
                : <span className="text-gray-700 flex items-center justify-end"><Lock />coh.</span>
              }
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
          <Bar value={stack.alignment || 0}
            cls={(stack.alignment||0)>=80?"bg-emerald-500":(stack.alignment||0)>=50?"bg-yellow-500":"bg-red-500"} />
          <div className="text-xs text-gray-600">{alignDesc}</div>
        </div>
        <div className="border border-zinc-800 p-5 space-y-2">
          <Label>Recommended Exposure</Label>
          <div className={`text-3xl font-semibold ${exposureColor(stack.exposure || 0)}`}>
            {stack.exposure ?? "—"}%
          </div>
          <Bar value={stack.exposure||0}
            cls={(stack.exposure||0)>60?"bg-emerald-500":(stack.exposure||0)>35?"bg-yellow-500":"bg-red-500"} />
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
            { l: "Hazard",     v: stack.hazard,     fn: riskColor                 },
            { l: "Shift Risk", v: stack.shift_risk, fn: riskColor                 },
          ].map(({ l, v, fn }) => (
            <div key={l} className="border border-zinc-800 p-4 space-y-1">
              <Label>{l}</Label>
              <div className={`text-xl font-semibold ${fn(v || 0)}`}>{v ?? "—"}%</div>
            </div>
          ))}
        </div>
      )}
      {!isPro && (
        <button onClick={onUnlock}
          className="w-full border border-zinc-700 py-3 text-sm text-gray-500
                     hover:border-zinc-500 hover:text-white transition-colors rounded-sm">
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
  const inner = (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <div className={`text-4xl font-semibold ${confColor(confidence?.score ?? 0)}`}>
            {confidence?.score ?? "—"}%
          </div>
          <div className={`text-sm mt-1 ${confColor(confidence?.score ?? 0)}`}>
            {confidence?.label ?? "—"}
          </div>
        </div>
        <div className="text-xs text-gray-500 max-w-xs text-right">{confidence?.description}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(confidence?.components || {}).map(([key, val]) => (
          <div key={key} className="border border-zinc-800 p-3 space-y-1">
            <div className="text-xs text-gray-600 capitalize">{key}</div>
            <div className="text-lg font-semibold text-white">{val}%</div>
            <Bar value={val} cls="bg-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Regime Confidence Score" onUnlock={onUnlock}>{inner}</ProGate>;
  if (!confidence) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Regime Confidence Score</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// VOL ENVIRONMENT
// ─────────────────────────────────────────
function VolEnvironment({ env, isPro, onUnlock }) {
  function envColor(label) {
    if (["Low","Strong","Normal"].includes(label))                            return "text-green-400";
    if (["Moderate","Weak"].includes(label))                                  return "text-yellow-400";
    if (["High","Elevated","Extreme","Thin","Deteriorating"].includes(label)) return "text-red-400";
    return "text-gray-400";
  }
  const items = [
    { label: "Volatility",      value: env?.volatility_label, score: env?.volatility_score },
    { label: "Trend Stability", value: env?.stability_label,  score: env?.stability_score  },
    { label: "Market Stress",   value: env?.stress_label,     score: env?.stress_score     },
    { label: "Liquidity",       value: env?.liquidity_label,  score: null                  },
  ];
  const inner = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, score }) => (
        <div key={label} className="border border-zinc-800 p-4 space-y-2">
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-xl font-semibold ${envColor(value)}`}>{value ?? "—"}</div>
          {score != null && (
            <>
              <Bar value={score}
                cls={score > 70 ? "bg-red-500" : score > 40 ? "bg-yellow-500" : "bg-green-500"} />
              <div className="text-xs text-gray-700">{score}%</div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  if (!isPro) return <ProGate label="Volatility & Liquidity Environment" onUnlock={onUnlock}>{inner}</ProGate>;
  if (!env) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <Label>Market Conditions</Label>
      <h2 className="text-base font-semibold">Volatility & Liquidity Environment</h2>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// TRANSITION MATRIX
// ─────────────────────────────────────────
function TransitionMatrix({ transitions, isPro, onUnlock }) {
  const inner = (
    <div className="space-y-3">
      {Object.entries(transitions?.transitions || {}).map(([state, prob]) => (
        <div key={state} className="flex items-center gap-4">
          <div className="w-44 text-xs text-gray-400 shrink-0">{state}</div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  state === transitions?.current_state ? "bg-white" :
                  state.includes("Risk-On")  ? "bg-green-500" :
                  state.includes("Risk-Off") ? "bg-red-500"   : "bg-yellow-500"
                }`}
                style={{ width: `${prob}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-white w-10 text-right">{prob}%</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!isPro) return <ProGate label="Regime Transition Probability" onUnlock={onUnlock}>{inner}</ProGate>;
  if (!transitions?.transitions) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Regime Transition Probability</Label>
        <h2 className="text-base font-semibold">
          Next 24H — Current:{" "}
          <span className={regimeText(transitions.current_state)}>{transitions.current_state}</span>
        </h2>
        {!transitions.data_sufficient && (
          <div className="text-xs text-gray-600 mt-1">
            Estimated · {transitions.sample_size} historical transitions
          </div>
        )}
      </div>
      {inner}
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
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        `${BACKEND}/portfolio-allocator?account_size=${accountSize}&strategy_mode=${strategyMode}&coin=${stack?.coin || "BTC"}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllocation(await res.json());
    } catch {
      setError("Failed to calculate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-zinc-800 p-8 space-y-6">
      <div>
        <Label>Portfolio Exposure Allocator</Label>
        <h2 className="text-base font-semibold">Risk-Adjusted Capital Allocation</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Account Size (USD)</div>
          <input type="number" value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 text-white
                       px-4 py-3 rounded-md text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Strategy Mode</div>
          <div className="flex gap-2">
            {["conservative","balanced","aggressive"].map((m) => (
              <button key={m} onClick={() => setStrategyMode(m)}
                className={`flex-1 py-3 rounded-md text-xs font-medium capitalize transition-colors ${
                  strategyMode === m
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-gray-400 border border-zinc-700 hover:border-zinc-500"
                }`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <button onClick={calculate} disabled={loading}
            className="w-full bg-white text-black py-3 rounded-md text-sm font-semibold
                       hover:bg-gray-100 transition-colors disabled:opacity-50">
            {loading ? "Calculating..." : isPro ? "Calculate" : <><Lock />Pro</>}
          </button>
        </div>
      </div>
      {error && (
        <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-400 text-sm">{error}</div>
      )}
      {allocation && !allocation.error && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Deployed",     value: `
$$
{allocation.deployed_capital?.toLocaleString()}`,  color: exposureColor(allocation.adjusted_exposure) },
              { label: "Spot",         value: `
$$
{allocation.spot_allocation?.toLocaleString()}`,    color: "text-blue-400"   },
              { label: "Swing",        value: `
$$
{allocation.swing_allocation?.toLocaleString()}`,   color: "text-purple-400" },
              { label: "Cash Reserve", value: `
$$
{allocation.cash_reserve?.toLocaleString()}`,       color: "text-gray-300"   },
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
            <span>Confidence: <span className="text-gray-400">{allocation.confidence}%</span></span>
          </div>
        </div>
      )}
      {!isPro && (
        <div className="border border-dashed border-zinc-700 p-6 text-center space-y-2
                        cursor-pointer hover:border-zinc-500 transition-colors rounded-sm"
          onClick={onUnlock}>
          <div className="text-sm text-gray-400"><Lock />Portfolio allocator is a Pro feature</div>
          <div className="text-xs text-gray-600">
            Unlock dollar amounts per regime · spot vs swing split · cash reserve
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
  const inner = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(correlation?.pairs || []).map(({ pair, correlation: corr, label }) => {
          const abs = Math.abs(corr);
          return (
            <div key={pair} className="border border-zinc-800 p-4 space-y-2">
              <div className="text-sm font-medium text-gray-300">{pair}</div>
              <div className={`text-2xl font-semibold ${
                abs > 0.8 ? "text-emerald-400" : abs > 0.5 ? "text-yellow-400" : "text-red-400"
              }`}>{Number(corr).toFixed(2)}</div>
              <div className="text-xs text-gray-600">{label}</div>
              <Bar value={abs * 100}
                cls={abs > 0.8 ? "bg-emerald-500" : abs > 0.5 ? "bg-yellow-500" : "bg-red-500"} />
            </div>
          );
        })}
      </div>
      {correlation?.alerts?.map((alert, i) => (
        <div key={i} className="border border-red-900 bg-red-900/10 px-4 py-3 text-red-400 text-sm">
          ⚠ {alert}
        </div>
      ))}
    </div>
  );

  if (!isPro) return <ProGate label="Cross-Asset Correlation" onUnlock={onUnlock}>{inner}</ProGate>;
  if (!correlation?.pairs?.length) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Cross-Asset Correlation</Label>
        <h2 className="text-base font-semibold">Pairwise Return Correlation (24H)</h2>
      </div>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME HEATMAP
// ─────────────────────────────────────────
function RegimeHeatmap({ overview, isPro, onUnlock }) {
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

  const inner = (
    <div className="space-y-5">
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
                <th key={tf}
                  className="text-gray-500 pb-3 px-3 font-normal uppercase tracking-widest text-center">
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
            {(overview || []).map((item) => (
              <tr key={item.coin} className="border-t border-zinc-800/50">
                <td className="pr-6 py-2.5 font-semibold text-white">{item.coin}</td>
                {[item.execution, item.trend, item.macro].map((regime, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-sm border text-xs font-medium ${cellStyle(regime)}`}>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${dirBadge(item.direction || "mixed")}`}>
                    {item.direction === "bullish" ? "↑" :
                     item.direction === "bearish" ? "↓" : "→"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 flex-wrap pt-1">
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

  if (!isPro) return <ProGate label="Regime Heatmap" onUnlock={onUnlock}>{inner}</ProGate>;
  if (!overview?.length) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Regime Heatmap</Label>
        <h2 className="text-base font-semibold">Asset × Timeframe Regime Grid</h2>
        <p className="text-xs text-gray-500 mt-1">
          Snapshot of all regimes across every asset and timeframe
        </p>
      </div>
      {inner}
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
          <div key={e.name}
            className={`border px-4 py-3 rounded-sm space-y-1.5 ${impactStyle(e.impact)}`}>
            <div className="font-medium text-sm">{e.name}</div>
            <div className="text-xs opacity-70">{e.type}</div>
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full border
                             inline-block ${impactStyle(e.impact)}`}>
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
  const maturityPct = avgDuration > 0
    ? Math.min(100, (regimeAge / avgDuration) * 100)
    : 0;
  const phaseColor =
    maturityLabel === "Overextended" ? "text-red-400"    :
    maturityLabel === "Late Phase"   ? "text-orange-400" :
    maturityLabel === "Mid Phase"    ? "text-yellow-400" : "text-emerald-400";
  const phaseCls =
    maturityLabel === "Overextended" ? "bg-red-500"    :
    maturityLabel === "Late Phase"   ? "bg-orange-500" :
    maturityLabel === "Mid Phase"    ? "bg-yellow-500" : "bg-emerald-500";

  const inner = (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className={`text-3xl font-semibold ${phaseColor}`}>{maturityLabel ?? "—"}</div>
        <div className="text-sm text-gray-500 pb-1">
          {regimeAge.toFixed(1)}h / {(avgDuration || 0).toFixed(0)}h avg
        </div>
      </div>
      <Bar value={maturityPct} cls={phaseCls} />
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        {["Early Phase","Mid Phase","Late Phase","Overextended"].map((ph) => (
          <div key={ph}
            className={`py-1.5 rounded-sm ${
              maturityLabel === ph
                ? "bg-white text-black font-semibold"
                : "text-gray-600 border border-zinc-800"
            }`}>
            {ph}
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600">
        0% = regime just started · 100% = statistically overdue for shift
      </div>
    </div>
  );

  if (!isPro) return <ProGate label="Regime Maturity" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Regime Maturity</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME HISTORY CHART
// ─────────────────────────────────────────
function RegimeTimeline({ history, coin }) {
  if (!history?.length) return null;
  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div>
        <Label>Regime History</Label>
        <h2 className="text-base font-semibold">
          Regime Score History — {coin} (1H)
        </h2>
        <p className="text-xs text-gray-500 mt-1">48-hour composite momentum signal</p>
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
          <XAxis dataKey="hour" stroke="#3f3f46"
            tick={{ fill: "#52525b", fontSize: 10 }} />
          <YAxis stroke="#3f3f46"
            tick={{ fill: "#52525b", fontSize: 10 }} domain={[-100, 100]} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
            labelStyle={{ color: "#71717a" }}
            formatter={(v) => [v?.toFixed(2), "Score"]}
          />
          <ReferenceLine y={0}   stroke="#27272a" />
          <ReferenceLine y={35}  stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={-35} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Area type="monotone" dataKey="score"
            stroke="#22c55e" strokeWidth={2}
            fill="url(#hGrad)" dot={false} />
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
    breadth_score < -30 ? "text-red-400"    : "text-yellow-400";
  const participation = Math.round(((bullish + bearish) / total) * 100);
  const trendLabel =
    breadth_score > 60  ? "Strong Participation" :
    breadth_score > 20  ? "Healthy"              :
    breadth_score > -20 ? "Mixed"                :
    breadth_score > -60 ? "Weak"                 : "Broad Risk-Off";

  return (
    <div className="border border-zinc-800 p-8 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <Label>Market Breadth</Label>
          <h2 className="text-base font-semibold">
            Trend Participation ({total} assets)
          </h2>
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
          <div className="bg-green-500 transition-all"
            style={{ width: `${(bullish / total) * 100}%` }} />
        )}
        {neutral > 0 && (
          <div className="bg-yellow-500 transition-all"
            style={{ width: `${(neutral / total) * 100}%` }} />
        )}
        {bearish > 0 && (
          <div className="bg-red-500 transition-all"
            style={{ width: `${(bearish / total) * 100}%` }} />
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
          <button key={item.coin} onClick={() => onSelect(item.coin)}
            className={`border p-3 text-left space-y-1.5 transition-colors rounded-sm ${
              item.coin === activeCoin
                ? "border-white"
                : "border-zinc-800 hover:border-zinc-600"
            }`}>
            <div className="font-semibold text-sm">{item.coin}</div>
            {[
              { l: "M", v: item.macro     },
              { l: "T", v: item.trend     },
              { l: "E", v: item.execution },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-center gap-1">
                <span className="text-gray-600 text-xs w-3">{l}</span>
                <span className={`text-xs ${regimeText(v)}`}>
                  {v
                    ? v.replace("Strong ","S.").replace("Risk-On","R+").replace("Risk-Off","R-")
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
          Probability current regime persists · white line = current age
        </p>
      </div>
      <div className={!isPro ? "blur-sm pointer-events-none" : ""}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curve}>
            <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
            <XAxis dataKey="hour" stroke="#3f3f46"
              tick={{ fill: "#52525b", fontSize: 10 }} />
            <YAxis stroke="#3f3f46"
              tick={{ fill: "#52525b", fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
              labelStyle={{ color: "#71717a" }}
              formatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
            />
            <Line type="monotone" dataKey="survival"
              stroke="#22c55e" strokeWidth={2} dot={false} name="Survival %" />
            <Line type="monotone" dataKey="hazard"
              stroke="#f87171" strokeWidth={1.5}
              strokeDasharray="4 4" dot={false} name="Hazard %" />
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
// DECISION ENGINE PANEL
// ─────────────────────────────────────────
function DecisionEnginePanel({ stack, isPro, onUnlock }) {
  const [decision, setDecision] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!stack?.coin || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/decision-engine?coin=${stack.coin}`)
      .then((r) => r.json())
      .then((d) => setDecision(d.error ? null : d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stack?.coin, isPro]);

  const directiveStyle = (action) => {
    if (action === "aggressive") return {
      border: "border-emerald-700", bg: "bg-emerald-950",
      text: "text-emerald-300", bar: "bg-emerald-500",
    };
    if (action === "hold") return {
      border: "border-green-800", bg: "bg-green-950",
      text: "text-green-300", bar: "bg-green-500",
    };
    if (action === "trim") return {
      border: "border-yellow-800", bg: "bg-yellow-950",
      text: "text-yellow-300", bar: "bg-yellow-500",
    };
    if (action === "defensive") return {
      border: "border-orange-800", bg: "bg-orange-950",
      text: "text-orange-300", bar: "bg-orange-500",
    };
    return {
      border: "border-red-800", bg: "bg-red-950",
      text: "text-red-300", bar: "bg-red-500",
    };
  };

  const inner = decision ? (
    <div className="space-y-6">
      {(() => {
        const s = directiveStyle(decision.action);
        return (
          <div className={`border ${s.border} ${s.bg} p-6 space-y-3`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                  ChainPulse Directive
                </div>
                <div className={`text-3xl font-bold ${s.text}`}>
                  {decision.directive}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                  Decision Score
                </div>
                <div className={`text-3xl font-bold ${s.text}`}>
                  {decision.score}
                </div>
              </div>
            </div>
            <div className={`text-sm ${s.text} opacity-80`}>
              {decision.description}
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${s.bar}`}
                style={{ width: `${decision.score}%` }}
              />
            </div>
          </div>
        );
      })()}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            What to do today
          </div>
          <ul className="space-y-2">
            {decision.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-white mt-0.5 shrink-0 font-bold">→</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            Signal breakdown
          </div>
          <div className="space-y-2">
            {Object.entries(decision.components).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="text-xs text-gray-600 w-20 capitalize shrink-0">
                  {key}
                </div>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      val >= 70 ? "bg-emerald-500" :
                      val >= 50 ? "bg-yellow-500"  : "bg-red-500"
                    }`}
                    style={{ width: `${val}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 w-8 text-right">{val}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border border-zinc-800 p-4">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
          Decision score map
        </div>
        <div className="grid grid-cols-5 gap-1 text-xs text-center">
          {[
            { range: "80–100", label: "Increase",  cls: "bg-emerald-900/40 text-emerald-400 border-emerald-900" },
            { range: "60–79",  label: "Maintain",  cls: "bg-green-900/30   text-green-400   border-green-900"   },
            { range: "40–59",  label: "Trim",      cls: "bg-yellow-900/30  text-yellow-400  border-yellow-900"  },
            { range: "20–39",  label: "Defensive", cls: "bg-orange-900/30  text-orange-400  border-orange-900"  },
            { range: "0–19",   label: "Risk-Off",  cls: "bg-red-900/30     text-red-400     border-red-900"     },
          ].map(({ range, label, cls }) => (
            <div key={range}
              className={`border px-2 py-2 rounded-sm space-y-0.5 ${cls} ${
                (decision.score >= parseInt(range.split("–")[0]) &&
                 decision.score <= parseInt(range.split("–")[1] || "100"))
                  ? "ring-1 ring-white" : ""
              }`}>
              <div className="font-semibold">{label}</div>
              <div className="opacity-60">{range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-gray-500">Computing directive...</div>
  ) : (
    <div className="text-sm text-gray-500">No data available</div>
  );

  if (!isPro) return <ProGate label="ChainPulse Directive" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Decision Engine</Label>
      <p className="text-xs text-gray-500 mb-4">
        What ChainPulse recommends you physically do today
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// IF YOU DO NOTHING PANEL
// ─────────────────────────────────────────
function IfNothingPanel({ stack, isPro, onUnlock }) {
  const [userExposure, setUserExposure] = useState(50);
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);

  const analyse = async () => {
    if (!stack?.coin) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND}/if-nothing-panel?coin=${stack.coin}&user_exposure=${userExposure}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!data.error) setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const severityStyle = (severity) => {
    if (severity === "high")   return "border-red-800 bg-red-950 text-red-300";
    if (severity === "medium") return "border-yellow-800 bg-yellow-950 text-yellow-300";
    return "border-emerald-800 bg-emerald-950 text-emerald-300";
  };

  const inner = (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <div className="text-xs text-gray-500">Your current exposure %</div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0} max={200}
            className="w-full bg-zinc-900 border border-zinc-700 text-white
                       px-4 py-3 rounded-md text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          onClick={analyse}
          disabled={loading}
          className="bg-white text-black px-6 py-3 rounded-md text-sm
                     font-semibold hover:bg-gray-100 transition-colors
                     disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Analysing..." : "Show Consequences"}
        </button>
      </div>
      {result && (
        <div className="space-y-4">
          <div className={`border p-5 space-y-2 ${severityStyle(result.severity)}`}>
            <div className="font-semibold text-sm">{result.message}</div>
            <div className="text-xs opacity-70">{result.sub}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Your Exposure",
                value: `${result.user_exposure}%`,
                color: exposureColor(result.user_exposure),
              },
              {
                label: "Model Recommendation",
                value: `${result.model_exposure}%`,
                color: exposureColor(result.model_exposure),
              },
              {
                label: "Drawdown Probability",
                value: `${result.drawdown_prob}%`,
                color: riskColor(result.drawdown_prob),
                sub: result.dd_prob_increase > 0
                  ? `+${result.dd_prob_increase}% vs model`
                  : "Within model range",
              },
              {
                label: "Expected Loss Risk",
                value: `${result.expected_loss_pct}%`,
                color: riskColor(result.expected_loss_pct),
                sub: `Model: ${result.model_loss_pct}%`,
              },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="border border-zinc-800 p-4 space-y-1">
                <div className="text-xs text-gray-500">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{value}</div>
                {sub && <div className="text-xs text-gray-600">{sub}</div>}
              </div>
            ))}
          </div>
          <div className="border border-zinc-800 p-4 space-y-3">
            <div className="text-xs text-gray-500">
              Your exposure vs model recommendation
            </div>
            <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-zinc-700/60"
                style={{
                  left:  `${Math.max(0, result.model_exposure - 10)}%`,
                  width: "20%",
                }}
              />
              <div
                className="absolute h-full w-0.5 bg-white opacity-60"
                style={{ left: `${Math.min(99, result.model_exposure)}%` }}
              />
              <div
                className={`absolute h-full w-1 rounded-full ${
                  result.severity === "high"   ? "bg-red-400"    :
                  result.severity === "medium" ? "bg-yellow-400" : "bg-emerald-400"
                }`}
                style={{ left: `${Math.min(99, result.user_exposure)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>0%</span>
              <span className="text-gray-400">
                ← Model: {result.model_exposure}% &nbsp;|&nbsp;
                You: {result.user_exposure}% →
              </span>
              <span>100%</span>
            </div>
          </div>
          {result.over_exposed && result.delta_abs > 15 && (
            <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm">
              ⚠ If this regime shifts while you are over-exposed, estimated drawdown
              impact is {result.expected_loss_pct}% of portfolio vs
              {" "}{result.model_loss_pct}% if following the model.
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!isPro) return <ProGate label="If You Do Nothing" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>If You Do Nothing</Label>
      <p className="text-xs text-gray-500 mb-4">
        See the consequence of maintaining your current exposure in this regime
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// RISK PROFILE PANEL
// ─────────────────────────────────────────
function RiskProfilePanel({ email, isPro, onUnlock, onProfileSaved }) {
  const [drawdown,  setDrawdown]  = useState(20);
  const [leverage,  setLeverage]  = useState(1);
  const [holding,   setHolding]   = useState(10);
  const [identity,  setIdentity]  = useState("balanced");
  const [saved,     setSaved]     = useState(false);
  const [loading,   setLoading]   = useState(false);

  const save = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/user-profile`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email,
          max_drawdown_pct:    drawdown,
          typical_leverage:    leverage,
          holding_period_days: holding,
          risk_identity:       identity,
        }),
      });
      const data = await res.json();
      if (data.status === "saved") {
        setSaved(true);
        onProfileSaved(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const identityDesc = {
    conservative: "Lower returns, minimal drawdowns. Capital preservation first.",
    balanced:     "Standard regime-based allocation. Model defaults.",
    aggressive:   "Maximum exposure in strong regimes. Higher volatility accepted.",
  };

  const inner = (
    <div className="space-y-6">
      {saved && (
        <div className="border border-emerald-800 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm">
          ✓ Risk profile saved. Your exposure recommendations are now personalised.
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="text-xs text-gray-500">Max Tolerable Drawdown</div>
              <div className="text-xs text-white font-medium">{drawdown}%</div>
            </div>
            <input
              type="range" min={5} max={50} step={5}
              value={drawdown}
              onChange={(e) => setDrawdown(Number(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-gray-700">
              <span>5% (very conservative)</span>
              <span>50% (very aggressive)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="text-xs text-gray-500">Typical Leverage</div>
              <div className="text-xs text-white font-medium">{leverage}x</div>
            </div>
            <input
              type="range" min={1} max={10} step={0.5}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-gray-700">
              <span>1x (spot only)</span>
              <span>10x</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="text-xs text-gray-500">Typical Holding Period</div>
              <div className="text-xs text-white font-medium">{holding} days</div>
            </div>
            <input
              type="range" min={1} max={30} step={1}
              value={holding}
              onChange={(e) => setHolding(Number(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-gray-700">
              <span>1 day (scalp)</span>
              <span>30 days (swing)</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-xs text-gray-500">Trader Identity</div>
          <div className="space-y-2">
            {["conservative","balanced","aggressive"].map((id) => (
              <button
                key={id}
                onClick={() => setIdentity(id)}
                className={`w-full text-left p-4 rounded-md border transition-colors space-y-1 ${
                  identity === id
                    ? "border-white bg-zinc-800"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="text-sm font-medium capitalize">{id}</div>
                <div className="text-xs text-gray-600">{identityDesc[id]}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={save}
        disabled={loading || !email}
        className="bg-white text-black px-6 py-3 rounded-md text-sm
                   font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Risk Profile"}
      </button>
      {!email && (
        <div className="text-xs text-gray-600">Sign in to save your profile.</div>
      )}
    </div>
  );

  if (!isPro) return <ProGate label="Risk Profile Calibration" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Risk Profile Calibration</Label>
      <p className="text-xs text-gray-500 mb-4">
        Personalise your exposure recommendations based on your trading style
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// EXPOSURE LOGGER
// ─────────────────────────────────────────
function ExposureLogger({ stack, email, isPro, onUnlock }) {
  const [userExposure, setUserExposure] = useState(50);
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);

  const logIt = async () => {
    if (!email || !stack?.coin) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/log-exposure`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email,
          coin:              stack.coin,
          user_exposure_pct: userExposure,
        }),
      });
      setResult(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const inner = (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Log your actual exposure to build your discipline score and
        performance comparison over time.
      </p>
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <div className="text-xs text-gray-500">
            My current exposure in {stack?.coin ?? "BTC"} (%)
          </div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0} max={200}
            className="w-full bg-zinc-900 border border-zinc-700 text-white
                       px-4 py-3 rounded-md text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-600">Model says</div>
          <div className={`text-xl font-semibold ${exposureColor(stack?.exposure ?? 0)}`}>
            {stack?.exposure ?? "—"}%
          </div>
        </div>
        <button
          onClick={logIt}
          disabled={loading || !email}
          className="bg-white text-black px-6 py-3 rounded-md text-sm
                     font-semibold hover:bg-gray-100 transition-colors
                     disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Logging..." : "Log Exposure"}
        </button>
      </div>
      {result && (
        <div className={`border px-4 py-3 space-y-1 text-sm ${
          result.severity === "warning" ? "border-red-900 bg-red-950 text-red-300"    :
          result.severity === "caution" ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
                                          "border-emerald-900 bg-emerald-950 text-emerald-300"
        }`}>
          <div className="font-semibold">{result.feedback}</div>
          <div className="text-xs opacity-70">
            Delta vs model: {result.delta > 0 ? "+" : ""}{result.delta}% ·
            Regime: {result.regime}
          </div>
        </div>
      )}
      {!email && (
        <div className="text-xs text-gray-600">
          Sign in to log exposure and track discipline over time.
        </div>
      )}
    </div>
  );

  if (!isPro) return <ProGate label="Exposure Logger" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Exposure Logger</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// DISCIPLINE PANEL
// ─────────────────────────────────────────
function DisciplinePanel({ email, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/discipline-score?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro]);

  const scoreColor = (s) => {
    if (s === null) return "text-gray-500";
    if (s >= 85) return "text-emerald-400";
    if (s >= 70) return "text-green-400";
    if (s >= 50) return "text-yellow-400";
    if (s >= 30) return "text-orange-400";
    return "text-red-400";
  };

  const inner = data ? (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className={`text-6xl font-bold ${scoreColor(data.score)}`}>
            {data.score !== null ? `${data.score}` : "—"}
          </div>
          <div className={`text-lg font-medium ${scoreColor(data.score)}`}>
            {data.label}
          </div>
          <Bar
            value={data.score ?? 0}
            cls={
              (data.score ?? 0) >= 85 ? "bg-emerald-500" :
              (data.score ?? 0) >= 70 ? "bg-green-500"   :
              (data.score ?? 0) >= 50 ? "bg-yellow-500"  :
              (data.score ?? 0) >= 30 ? "bg-orange-500"  : "bg-red-500"
            }
          />
          <div className="text-xs text-gray-600">{data.summary}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {[
            { l: "Followed",  v: data.followed,           c: "text-emerald-400" },
            { l: "Total",     v: data.total,               c: "text-white"       },
            { l: "Bonuses",   v: `+${data.bonuses ?? 0}`,  c: "text-emerald-400" },
            { l: "Penalties", v: `-${data.penalties ?? 0}`, c: "text-red-400"    },
          ].map(({ l, v, c }) => (
            <div key={l} className="border border-zinc-800 p-3 text-center space-y-1">
              <div className="text-xs text-gray-600">{l}</div>
              <div className={`text-xl font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {data.flags?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Recent Flags</div>
          <div className="space-y-2">
            {data.flags.map((flag, i) => (
              <div key={i} className={`border px-4 py-3 text-sm flex justify-between items-center ${
                flag.type === "over_exposed"  ? "border-red-900 bg-red-950 text-red-300"       :
                flag.type === "under_exposed" ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
                                                "border-emerald-900 bg-emerald-950 text-emerald-300"
              }`}>
                <span>{flag.label}</span>
                <span className="text-xs opacity-60">{flag.date} · {flag.regime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="text-sm text-gray-500">Loading discipline score...</div>
  ) : (
    <div className="text-sm text-gray-500">
      No data yet. Log your exposure to start building your score.
    </div>
  );

  if (!isPro) return <ProGate label="Discipline Score" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Discipline Score</Label>
      <p className="text-xs text-gray-500 mb-4">
        How well you follow regime-based recommendations over time
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PERFORMANCE PANEL
// ─────────────────────────────────────────
function PerformancePanel({ email, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/performance-comparison?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro]);

  const inner = data ? (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Your Return",
            value: data.user_total_return !== null
              ? `${data.user_total_return > 0 ? "+" : ""}${data.user_total_return?.toFixed(1)}%`
              : "—",
            color: data.user_total_return >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Model Return",
            value: data.model_total_return !== null
              ? `${data.model_total_return > 0 ? "+" : ""}${data.model_total_return?.toFixed(1)}%`
              : "—",
            color: data.model_total_return >= 0 ? "text-blue-400" : "text-red-400",
          },
          {
            label: "Alpha",
            value: data.alpha !== null
              ? `${data.alpha > 0 ? "+" : ""}${data.alpha?.toFixed(1)}%`
              : "—",
            color: (data.alpha ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Periods Tracked",
            value: data.periods ?? "—",
            color: "text-gray-300",
            suffix: "",
          },
        ].map(({ label, value, color, suffix }) => (
          <div key={label} className="border border-zinc-800 p-4 space-y-1">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}{suffix}</div>
          </div>
        ))}
      </div>

      {data.message && (
        <div className="text-xs text-gray-600 border border-zinc-800 px-4 py-3">
          {data.message}
        </div>
      )}

      {data.curve?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            Cumulative Return Comparison
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.curve}>
              <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
              <XAxis dataKey="period" stroke="#3f3f46"
                tick={{ fill: "#52525b", fontSize: 10 }} />
              <YAxis stroke="#3f3f46"
                tick={{ fill: "#52525b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                labelStyle={{ color: "#71717a" }}
                formatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
              />
              <ReferenceLine y={0} stroke="#27272a" />
              <Line type="monotone" dataKey="user_cum"
                stroke="#22c55e" strokeWidth={2} dot={false} name="Your Return" />
              <Line type="monotone" dataKey="model_cum"
                stroke="#3b82f6" strokeWidth={2}
                strokeDasharray="4 4" dot={false} name="Model Return" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.regime_breakdown && Object.keys(data.regime_breakdown).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            Performance by Regime
          </div>
          <div className="space-y-2">
            {Object.entries(data.regime_breakdown).map(([regime, stats]) => (
              <div key={regime}
                className="flex items-center justify-between border border-zinc-800 px-4 py-3">
                <div className={`text-sm font-medium w-36 shrink-0 ${regimeText(regime)}`}>
                  {regime}
                </div>
                <div className="flex gap-6 text-xs">
                  <span>
                    You:{" "}
                    <span className={stats.user_avg >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {stats.user_avg > 0 ? "+" : ""}{stats.user_avg?.toFixed(1)}%
                    </span>
                  </span>
                  <span>
                    Model:{" "}
                    <span className={stats.model_avg >= 0 ? "text-blue-400" : "text-red-400"}>
                      {stats.model_avg > 0 ? "+" : ""}{stats.model_avg?.toFixed(1)}%
                    </span>
                  </span>
                  <span className="text-gray-600">{stats.count} periods</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.best_regime || data.worst_regime) && (
        <div className="grid grid-cols-2 gap-4">
          {data.best_regime && (
            <div className="border border-emerald-900 bg-emerald-950 p-4 space-y-1">
              <div className="text-xs text-gray-500">Best Regime for You</div>
              <div className={`text-sm font-semibold ${regimeText(data.best_regime)}`}>
                {data.best_regime}
              </div>
            </div>
          )}
          {data.worst_regime && (
            <div className="border border-red-900 bg-red-950 p-4 space-y-1">
              <div className="text-xs text-gray-500">Worst Regime for You</div>
              <div className={`text-sm font-semibold ${regimeText(data.worst_regime)}`}>
                {data.worst_regime}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="text-sm text-gray-500">Loading performance data...</div>
  ) : (
    <div className="text-sm text-gray-500">
      No performance data yet. Log your exposure over multiple periods to track results.
    </div>
  );

  if (!isPro) return <ProGate label="Performance Comparison" onUnlock={onUnlock}>{inner}</ProGate>;
  return (
    <div className="border border-zinc-800 p-8 space-y-2">
      <Label>Performance Comparison</Label>
      <p className="text-xs text-gray-500 mb-4">
        Your actual returns vs following the model
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PRO MODAL
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
        <Label>ChainPulse Pro</Label>
        <h2 className="text-2xl font-semibold leading-tight">
          Unlock Full Regime Analytics
        </h2>
        <p className="text-gray-400 text-sm">
          You are seeing regime labels and alignment. Pro unlocks survival
          modeling, hazard rate, coherence, trend maturity, playbook engine,
          stress meter, exposure tracker, and real-time shift alerts.
        </p>
        <ul className="space-y-2 text-sm text-gray-300">
          {[
            "Coherence index per timeframe layer",
            "Survival probability & hazard rate",
            "Regime playbook — what to do NOW",
            "Personalized exposure tracker",
            "Regime quality grade (A/B/C/D)",
            "Regime stress meter",
            "Regime countdown timer",
            "Confidence trend chart",
            "Volatility & liquidity environment",
            "Transition probability matrix",
            "Portfolio exposure allocator",
            "Cross-asset correlation monitor",
            "Decision engine — daily directive",
            "If You Do Nothing — consequence panel",
            "Risk profile calibration",
            "Exposure logger & discipline score",
            "Performance comparison vs model",
            "Real-time shift alerts via email",
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
  const [stack,       setStack]       = useState(null);
  const [latest,      setLatest]      = useState(null);
  const [curveData,   setCurveData]   = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [overview,    setOverview]    = useState([]);
  const [breadth,     setBreadth]     = useState(null);
  const [confidence,  setConfidence]  = useState(null);
  const [volEnv,      setVolEnv]      = useState(null);
  const [transitions, setTransitions] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [riskEvents,  setRiskEvents]  = useState([]);
  const [coin,        setCoin]        = useState("BTC");
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [proSuccess,  setProSuccess]  = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [token,       setToken]       = useState(null);
  const [email,       setEmail]       = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params      = new URLSearchParams(window.location.search);
    const urlToken    = params.get("token");
    const urlEmail    = params.get("email");
    const successFlag = params.get("success");
    if (urlToken) {
      saveToken(urlToken);
      setToken(urlToken);
      window.history.replaceState({}, "", "/app");
    } else {
      const stored = getToken();
      if (stored) setToken(stored);
    }
    if (urlEmail) setEmail(urlEmail);
    if (successFlag === "true") setProSuccess(true);
  }, []);

  const fetchData = useCallback(async (selectedCoin, currentToken) => {
    try {
      const headers = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;

      const [
        stackRes, latestRes, curveRes, histRes,
        overviewRes, confidenceRes, volRes,
        transRes, corrRes, eventsRes,
      ] = await Promise.all([
        fetch(`${BACKEND}/regime-stack?coin=${selectedCoin}`,            { headers }),
        fetch(`${BACKEND}/latest?coin=${selectedCoin}`,                  { headers }),
        fetch(`${BACKEND}/survival-curve?coin=${selectedCoin}`,          { headers }),
        fetch(`${BACKEND}/regime-history?coin=${selectedCoin}&limit=48`, { headers }),
        fetch(`${BACKEND}/market-overview`,                              { headers }),
        fetch(`${BACKEND}/regime-confidence?coin=${selectedCoin}`,       { headers }),
        fetch(`${BACKEND}/volatility-environment?coin=${selectedCoin}`,  { headers }),
        fetch(`${BACKEND}/regime-transitions?coin=${selectedCoin}`,      { headers }),
        fetch(`${BACKEND}/correlation?coins=${SUPPORTED_COINS.join(",")}`,{ headers }),
        fetch(`${BACKEND}/risk-events`,                                  { headers }),
      ]);

      const [
        stackData, latestData, curveRaw, histRaw,
        overviewRaw, confidenceData, volData,
        transData, corrData, eventsData,
      ] = await Promise.all([
        stackRes.json(),
        latestRes.json(),
        curveRes.json(),
        histRes.json(),
        overviewRes.json(),
        confidenceRes.ok  ? confidenceRes.json()  : Promise.resolve(null),
        volRes.ok         ? volRes.json()          : Promise.resolve(null),
        transRes.ok       ? transRes.json()        : Promise.resolve(null),
        corrRes.ok        ? corrRes.json()         : Promise.resolve(null),
        eventsRes.ok      ? eventsRes.json()       : Promise.resolve({ events: [] }),
      ]);

      setStack(stackData);
      setLatest(latestData);
      setCurveData(curveRaw.data    || []);
      setHistoryData(histRaw.data   || []);
      setOverview(overviewRaw.data  || []);
      setBreadth(overviewRaw.breadth || null);
      setConfidence(confidenceData);
      setVolEnv(volData);
      setTransitions(transData);
      setCorrelation(corrData);
      setRiskEvents(eventsData?.events || []);
      setLastUpdated(new Date());

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

  const isPro      = !stack.pro_required;
  const exposure   = stack.exposure          ?? 0;
  const shiftRisk  = stack.shift_risk        ?? 0;
  const alignment  = stack.alignment         ?? 0;
  const direction  = stack.direction         ?? "mixed";
  const regimeAge  = stack.regime_age_hours  ?? 0;
  const maturity   = stack.trend_maturity    ?? null;
  const survival   = stack.survival          ?? null;
  const hazard     = stack.hazard            ?? null;
  const percentile = stack.percentile        ?? null;
  const execLabel  = stack.execution?.label  ?? null;
  const avgDuration = stack.avg_regime_duration_hours ?? 48;

  const maturityLabel =
    maturity > 75 ? "Overextended" :
    maturity > 50 ? "Late Phase"   :
    maturity > 25 ? "Mid Phase"    : "Early Phase";

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      {showModal && <ProModal onClose={() => setShowModal(false)} />}

      <div className="max-w-6xl mx-auto space-y-8">

        {proSuccess && (
          <div className="border border-emerald-700 bg-emerald-950
                          text-emerald-300 px-6 py-4 rounded-md text-sm">
            ✓ Pro access activated. Welcome to ChainPulse Pro.
          </div>
        )}

        {!isPro && (
          <div onClick={() => setShowModal(true)}
            className="border border-zinc-700 bg-zinc-900 px-6 py-4
                       flex flex-col sm:flex-row justify-between
                       items-start sm:items-center gap-4
                       cursor-pointer hover:border-zinc-500 transition-colors">
            <div className="space-y-1">
              <div className="text-sm text-white font-medium">
                Viewing free tier — regime labels only
              </div>
              <div className="text-xs text-gray-500">
                Playbook, survival, hazard, stress meter and 10+ signals locked.
              </div>
            </div>
            <button className="bg-white text-black px-5 py-2 rounded-md
                               text-sm font-semibold whitespace-nowrap hover:bg-gray-100">
              Unlock Pro
            </button>
          </div>
        )}

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
              <button key={c} onClick={() => setCoin(c)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  coin === c
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-gray-400 hover:bg-zinc-800"
                }`}>{c}</button>
            ))}
          </div>
        </div>

        {/* HERO */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-zinc-800 p-8 text-center space-y-3
                          md:col-span-1 flex flex-col justify-center">
            <Label>Exposure Recommendation</Label>
            <div className={`text-7xl font-semibold ${exposureColor(exposure)}`}>
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
                  exposure > 35 ? "bg-yellow-500"  : "bg-red-500"
                }`}
                style={{ width: `${exposure}%` }}
              />
            </div>
          </div>

                    <div className="border border-zinc-800 p-8 space-y-5 md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <Label>Current Regime</Label>
                <div className={`text-2xl font-semibold ${regimeText(execLabel)}`}>
                  {execLabel ?? "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Execution (1H) · Active {regimeAge.toFixed(1)}h
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${dirBadge(direction)}`}>
                {direction === "bullish" ? "↑ Bullish" :
                 direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Macro (1D)",     data: stack.macro     },
                { label: "Trend (4H)",     data: stack.trend     },
                { label: "Execution (1H)", data: stack.execution },
              ].map(({ label, data }) => (
                <div key={label}
                  className={`border p-3 rounded-sm text-center ${
                    data ? regimeBorder(data.label) : "border-zinc-800"
                  }`}>
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`text-xs font-semibold ${data ? regimeText(data.label) : "text-gray-600"}`}>
                    {data?.label ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Alignment</span>
                <span className={alignColor(alignment)}>{alignment}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    alignment >= 80 ? "bg-emerald-500" :
                    alignment >= 50 ? "bg-yellow-500"  : "bg-red-500"
                  }`}
                  style={{ width: `${alignment}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Survival Probability"
            value={isPro ? survival : null}
            color={isPro ? riskColor(100 - (survival || 0)) : ""}
            barCls={isPro
              ? (survival > 60 ? "bg-green-500" : survival > 40 ? "bg-yellow-500" : "bg-red-500")
              : ""}
            hint="Prob. current regime continues"
            locked={!isPro}
          />
          <StatCard
            label="Regime Shift Risk"
            value={shiftRisk}
            color={riskColor(shiftRisk)}
            barCls={shiftRisk > 70 ? "bg-red-500" : shiftRisk > 45 ? "bg-yellow-500" : "bg-green-500"}
            hint="Composite deterioration signal"
            locked={false}
          />
          <StatCard
            label="Hazard Rate"
            value={isPro ? hazard : null}
            color={isPro ? riskColor(hazard || 0) : ""}
            barCls={isPro
              ? (hazard > 70 ? "bg-red-500" : hazard > 45 ? "bg-yellow-500" : "bg-green-500")
              : ""}
            hint="Failure risk vs historical norm"
            locked={!isPro}
          />
          <StatCard
            label="Macro Coherence"
            value={isPro ? stack.macro_coherence?.toFixed(1) : null}
            color={isPro
              ? ((stack.macro_coherence || 0) > 60 ? "text-emerald-400" : "text-yellow-400")
              : ""}
            barCls={isPro
              ? ((stack.macro_coherence || 0) > 60 ? "bg-emerald-500" : "bg-yellow-500")
              : ""}
            hint="1D timeframe signal alignment"
            locked={!isPro}
          />
          <StatCard
            label="Strength Percentile"
            value={isPro ? percentile : null}
            color="text-blue-400"
            barCls="bg-blue-500"
            hint="Relative to historical scores"
            locked={!isPro}
          />
          <StatCard
            label="Execution Score"
            value={stack.execution?.score?.toFixed(1) ?? "—"}
            suffix=""
            color={regimeText(execLabel)}
            hint="Raw 1H momentum-vol score"
            locked={false}
          />
        </div>

        {/* DECISION ENGINE — highest priority new feature */}
        <DecisionEnginePanel
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* IF YOU DO NOTHING */}
        <IfNothingPanel
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* STRESS + COUNTDOWN */}
        <div className="grid md:grid-cols-2 gap-4">
          <StressMeter
            stack={stack}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
          <RegimeCountdown
            stack={stack}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
        </div>

        {/* QUALITY + CONFIDENCE TREND */}
        <div className="grid md:grid-cols-2 gap-4">
          <RegimeQualityCard
            stack={stack}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
          <ConfidenceTrend
            history={historyData}
            confidence={confidence}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
        </div>

        {/* PLAYBOOK */}
        <RegimePlaybook
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* EXPOSURE TRACKER */}
        <ExposureTracker
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* RISK PROFILE */}
        <RiskProfilePanel
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
          onProfileSaved={(profile) => console.log("Profile saved:", profile)}
        />

        {/* EXPOSURE LOGGER */}
        <ExposureLogger
          stack={stack}
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* DISCIPLINE SCORE */}
        <DisciplinePanel
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* PERFORMANCE COMPARISON */}
        <PerformancePanel
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* REGIME STACK */}
        <RegimeStackCard
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* CONFIDENCE PANEL */}
        <ConfidencePanel
          confidence={confidence}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* REGIME MATURITY */}
        <RegimeMaturity
          regimeAge={regimeAge}
          avgDuration={avgDuration}
          maturityLabel={maturityLabel}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* TRANSITION MATRIX */}
        <TransitionMatrix
          transitions={transitions}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* VOL ENVIRONMENT */}
        <VolEnvironment
          env={volEnv}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* REGIME TIMELINE */}
        <RegimeTimeline
          history={historyData}
          coin={coin}
        />

        {/* SURVIVAL CURVE */}
        <SurvivalCurve
          curve={curveData}
          regimeAge={regimeAge}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* REGIME HEATMAP */}
        <RegimeHeatmap
          overview={overview}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* CORRELATION */}
        <CorrelationPanel
          correlation={correlation}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* PORTFOLIO ALLOCATOR */}
        <PortfolioAllocator
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* BREADTH */}
        <BreadthPanel breadth={breadth} />

        {/* REGIME MAP */}
        <RegimeMap
          overview={overview}
          activeCoin={coin}
          onSelect={setCoin}
        />

        {/* RISK EVENTS */}
        <RiskEvents events={riskEvents} />

        {/* INTERPRETATION */}
        <InterpretationPanel
          stack={stack}
          latest={latest}
          isPro={isPro}
        />

        {/* PRO UPSELL */}
        {!isPro && (
          <div
            className="border border-zinc-700 p-10 text-center space-y-5
                       cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => setShowModal(true)}
          >
            <Label>ChainPulse Pro</Label>
            <h3 className="text-2xl font-semibold">Unlock Full Regime Analytics</h3>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Playbook engine, survival curve, hazard rate, stress meter,
              exposure tracker, regime countdown, confidence trend, decision
              engine, discipline score, performance comparison, and more.
            </p>
            <div className="text-gray-300 text-sm">\$29/month · Designed for traders managing \$5k+</div>
            <div className="text-gray-500 text-xs max-w-md mx-auto">
              Average user avoids 1–2 poor entries per month.
              At \$5k+ managed, that covers the cost many times over.
            </div>
            <button className="bg-white text-black px-8 py-4 rounded-md
                               font-semibold hover:bg-gray-100 transition-colors">
              Activate Pro — \$29/month
            </button>
            <div className="text-gray-600 text-xs">7-day risk-free · Cancel anytime</div>
          </div>
        )}

      </div>
    </main>
  );
}