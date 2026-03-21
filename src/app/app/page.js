"use client";
import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX", "LINK", "ADA"];
const REFRESH_MS = 60_000;

// ─────────────────────────────────────────
// TOKEN
// ─────────────────────────────────────────
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("cp_token") : null; }
function saveToken(t) { if (typeof window !== "undefined") localStorage.setItem("cp_token", t); }

// ─────────────────────────────────────────
// COLOUR HELPERS
// ─────────────────────────────────────────
function regimeText(label) {
  if (!label) return "text-zinc-400";
  if (label === "Strong Risk-On") return "text-emerald-400";
  if (label === "Risk-On") return "text-green-400";
  if (label === "Strong Risk-Off") return "text-red-500";
  if (label === "Risk-Off") return "text-red-400";
  return "text-yellow-400";
}
function regimeBorder(label) {
  if (!label) return "border-white/5 bg-zinc-950/40";
  if (label === "Strong Risk-On") return "border-emerald-800 bg-emerald-900/20";
  if (label === "Risk-On") return "border-green-900 bg-green-900/10";
  if (label === "Strong Risk-Off") return "border-red-800 bg-red-900/20 border border-red-700/40/30";
  if (label === "Risk-Off") return "border-red-900 bg-red-900/20 border border-red-700/40/15";
  return "border-yellow-900 bg-yellow-900/10";
}
function riskColor(v) { return v > 70 ? "text-red-400" : v > 45 ? "text-yellow-400" : "text-green-400"; }
function exposureColor(v) { return v > 60 ? "text-emerald-400" : v > 35 ? "text-yellow-400" : "text-red-400"; }
function alignColor(v) { return v >= 80 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }
function dirBadge(d) {
  if (d === "bullish") return "text-green-400 border-green-900 bg-green-900/20";
  if (d === "bearish") return "text-red-400 border-red-900 bg-red-900/20 border border-red-700/40/20";
  return "text-yellow-400 border-yellow-900 bg-yellow-900/20";
}
function confColor(v) { return v >= 75 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }
function gradeColor(g) {
  if (!g) return "text-zinc-400";
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
    strategy_mode: "Aggressive Continuation", strategy_color: "text-emerald-400",
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
    strategy_mode: "Balanced Exposure", strategy_color: "text-green-400",
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
    strategy_mode: "Capital Preservation", strategy_color: "text-yellow-400",
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
    strategy_mode: "Risk Reduction Protocol", strategy_color: "text-red-400",
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
    strategy_mode: "Capital Preservation Phase", strategy_color: "text-red-500",
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
    <div className="w-full bg-white/4 rounded-full h-[3px] mt-2">
      <div
        className={`h-[3px] rounded-full transition-all duration-700 ${cls}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em] mb-2">
      {children}
    </div>
  );
}

function Lock() {
  return (
    <svg className="w-3 h-3 inline mr-1 opacity-40" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

// ─────────────────────────────────────────
// PRO GATE
// ─────────────────────────────────────────
function ProGate({ label, consequence, children, onUnlock }) {
  return (
    // FIX: removed overflow-hidden, added min-h so overlay has room
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 p-8 space-y-4 relative rounded-lg min-h-[160px]">
      <Label>{label}</Label>
      <div className="blur-sm select-none pointer-events-none opacity-30 max-h-32 overflow-hidden">
        {children}
      </div>
      {/* FIX: use fixed positioning so it's never clipped by parent */}
      <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg overflow-hidden">
        <div className="
          bg-zinc-950/98 border border-white/10
          px-8 py-6 text-center space-y-3 w-full mx-4
          rounded-xl shadow-2xl shadow-black/50
          backdrop-blur-sm
        ">
          <div className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
            <Lock />{label}
          </div>
          {consequence && (
            <div className="text-xs text-zinc-500 leading-relaxed">{consequence}</div>
          )}
          <button
            onClick={onUnlock}
            className="
              w-full bg-white text-black px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-[1px] transition-all5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-[1px] transition-all4 py-2.5 rounded-lg
              text-xs font-semibold hover:bg-zinc-100
              transition-colors shadow-sm
            "
          >
            Unlock — $39/month
          </button>
          <div className="text-xs text-zinc-700">7-day risk-free · Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
function StatCard({ label, value, suffix = "%", color, barCls, hint, locked, consequence, onUnlock }) {
  if (locked)
    return (
      <div
        className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2 relative overflow-hidden cursor-pointer group"
        onClick={onUnlock}
      >
        <Label>{label}</Label>
        <div className="text-3xl font-semibold text-zinc-800 blur-sm select-none tabular-nums">
          00.0
        </div>
        <Bar value={50} cls="bg-zinc-800" />
        {hint && <div className="text-xs text-zinc-800 blur-sm select-none">{hint}</div>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <div className="text-center space-y-1 px-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1 justify-center">
              <Lock />Pro
            </span>
            {consequence && (
              <div className="text-xs text-zinc-600 max-w-[140px] text-center leading-relaxed">
                {consequence}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  return (
    <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
      <Label>{label}</Label>
      <div className={`text-3xl font-semibold tabular-nums ${color}`}>
        {value}{suffix}
      </div>
      {barCls && <Bar value={parseFloat(value) || 0} cls={barCls} />}
      {hint && <div className="text-xs text-zinc-600 pt-1">{hint}</div>}
    </div>
  );
}
// ─────────────────────────────────────────
// TODAY'S VERDICT
// ─────────────────────────────────────────
function TodaysVerdict({ stack, decision, isPro, onUnlock }) {
  const execLabel = stack?.execution?.label ?? "Neutral";
  const shiftRisk = stack?.shift_risk ?? 0;
  const alignment = stack?.alignment ?? 0;
  const exposure  = stack?.exposure  ?? 0;

  const verdictStyle = () => {
    if (!isPro) return { border: "border-zinc-700", bg: "bg-zinc-950/50", text: "text-gray-300", dot: "bg-gray-500" };
    if (decision?.action === "aggressive") return { border: "border-emerald-800", bg: "bg-emerald-950/60", text: "text-emerald-300", dot: "bg-emerald-400" };
    if (decision?.action === "hold")       return { border: "border-green-800",   bg: "bg-green-950/60",   text: "text-green-300",   dot: "bg-green-400"   };
    if (decision?.action === "trim")       return { border: "border-yellow-800",  bg: "bg-yellow-950/60",  text: "text-yellow-300",  dot: "bg-yellow-400"  };
    if (decision?.action === "defensive")  return { border: "border-orange-800",  bg: "bg-orange-950/60",  text: "text-orange-300",  dot: "bg-orange-400"  };
    return { border: "border-red-800", bg: "bg-red-950/60", text: "text-red-300", dot: "bg-red-400" };
  };

  const s = verdictStyle();

  return (
    <div className={`border ${s.border} ${s.bg} px-6 py-5`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse shrink-0`} />
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-widest mb-0.5">
              Today's Regime Verdict — {stack?.coin ?? "BTC"}
            </div>
            {isPro && decision ? (
              <div className={`text-lg font-semibold ${s.text}`}>
                {decision.directive}
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-400 flex items-center gap-2">
                <Lock />
                <span>Unlock to see today's directive</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {isPro && decision ? (
            <>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Decision Score</div>
                <div className={`text-xl font-bold ${s.text}`}>{decision.score}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Exposure</div>
                <div className={`text-xl font-bold ${exposureColor(exposure)}`}>{exposure}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Shift Risk</div>
                <div className={`text-xl font-bold ${riskColor(shiftRisk)}`}>{shiftRisk}%</div>
              </div>
            </>
          ) : (
            <button
              onClick={onUnlock}
              className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Unlock Pro — $39/mo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FREE TIER BANNER
// ─────────────────────────────────────────
function FreeTierBanner({ onUnlock }) {
  return (
    <div className="border border-zinc-700 bg-zinc-950/80 px-6 py-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="text-sm text-white font-medium">
            You are viewing regime context only
          </div>
          <div className="text-xs text-zinc-400">
            Without exposure modeling and survival analysis, you are trading without a risk framework.
          </div>
        </div>
        <button
          onClick={onUnlock}
          className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-gray-100 transition-colors shrink-0"
        >
          Unlock Full System — $39/mo
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SHIFT RISK ALERT
// ─────────────────────────────────────────
function ShiftRiskAlert({ shiftRisk, coin, isPro, onUnlock }) {
  if (!isPro) return null;
  if (shiftRisk <= 60) return null;

  const severity = shiftRisk > 80 ? "critical" : shiftRisk > 70 ? "elevated" : "moderate";
  const style =
    severity === "critical" ? "border-red-600 bg-red-950 text-red-200"   :
    severity === "elevated" ? "border-red-800 bg-red-950 text-red-300"   :
                              "border-orange-800 bg-orange-950 text-orange-300";

  return (
    <div className={`border ${style} px-6 py-5 space-y-1`}>
      <div className="font-semibold text-sm flex items-center gap-2">
        <span>⚠</span>
        <span>
          {severity === "critical" ? "Critical" : severity === "elevated" ? "Elevated" : "Moderate"} Regime Deterioration — {coin}
        </span>
        <span className="ml-auto text-lg font-bold">{shiftRisk}%</span>
      </div>
      <div className="text-xs opacity-70">
        {severity === "critical"
          ? "Multiple deterioration signals active. Immediate exposure reduction recommended."
          : severity === "elevated"
          ? "Shift risk elevated. Consider reducing exposure and tightening stops."
          : "Early deterioration detected. Monitor closely before adding new positions."}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME QUALITY RATING
// ─────────────────────────────────────────
function deriveQuality(stack) {
  if (!stack) return null;
  const alignment  = stack.alignment        ?? 0;
  const survival   = stack.survival         ?? 50;
  const hazard     = stack.hazard           ?? 50;
  const shiftRisk  = stack.shift_risk       ?? 50;
  const coherence  = stack.macro?.coherence ?? 50;
  const score = Math.round(
    alignment  * 0.30 +
    survival   * 0.25 +
    (100 - hazard)     * 0.20 +
    (100 - shiftRisk)  * 0.15 +
    coherence  * 0.10
  );
  let grade, structural, breakdown;
  if (score >= 80) { grade = "A";  structural = "Excellent";  breakdown = "Low";           }
  else if (score >= 65) { grade = "B+"; structural = "Strong";     breakdown = "Low-Moderate"; }
  else if (score >= 50) { grade = "B";  structural = "Healthy";    breakdown = "Moderate";     }
  else if (score >= 35) { grade = "C";  structural = "Weakening";  breakdown = "Elevated";     }
  else                  { grade = "D";  structural = "Fragile";     breakdown = "High";         }
  return { grade, score, structural, breakdown };
}

function RegimeQualityCard({ stack, isPro, onUnlock }) {
  const quality = deriveQuality(stack);
  if (!quality) return null;

  const inner = (
    <div className="grid grid-cols-3 gap-6">
      <div className="text-center space-y-2">
        <div className="text-xs text-zinc-400 uppercase tracking-widest">Regime Grade</div>
        <div className={`text-6xl font-bold ${gradeColor(quality.grade)}`}>{quality.grade}</div>
        <Bar
          value={quality.score}
          cls={
            quality.score >= 80 ? "bg-emerald-500" :
            quality.score >= 65 ? "bg-green-500"   :
            quality.score >= 50 ? "bg-yellow-500"  :
            quality.score >= 35 ? "bg-orange-500"  : "bg-red-500"
          }
        />
        <div className="text-xs text-zinc-500">{quality.score}/100</div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs text-zinc-400">Structural Health</div>
          <div className={`text-xl font-semibold mt-1 ${
            ["Excellent","Strong"].includes(quality.structural) ? "text-emerald-400" :
            quality.structural === "Healthy"   ? "text-green-400"  :
            quality.structural === "Weakening" ? "text-yellow-400" : "text-red-400"
          }`}>
            {quality.structural}
          </div>
        </div>
        <div>
          {/* FIX: was incorrectly showing quality.structural for both fields */}
          <div className="text-xs text-zinc-400">Breakdown Risk</div>
          <div className={`text-xl font-semibold mt-1 ${
            quality.breakdown === "Low"          ? "text-emerald-400" :
            quality.breakdown === "Low-Moderate" ? "text-green-400"   :
            quality.breakdown === "Moderate"     ? "text-yellow-400"  :
            quality.breakdown === "Elevated"     ? "text-orange-400"  : "text-red-400"
          }`}>
            {quality.breakdown}
          </div>
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
            <span className="text-xs text-zinc-500 w-20 shrink-0">{l}</span>
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

  if (!isPro) return (
    <ProGate
      label="Regime Quality Rating"
      consequence="Without quality scoring, you cannot distinguish a strong regime from a fragile one."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <Label>Regime Quality Rating</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME PLAYBOOK ENGINE
// ─────────────────────────────────────────
function RegimePlaybook({ stack, isPro, onUnlock }) {
  const execLabel = stack?.execution?.label ?? "Neutral";
  const pb        = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
  const regimeAge = stack?.regime_age_hours ?? 0;
  const remaining = Math.max(0, pb.avg_remaining_days * 24 - regimeAge);

  const inner = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className={`text-2xl font-semibold ${regimeText(execLabel)}`}>{execLabel}</div>
          <div className="text-xs text-zinc-400 mt-1">{regimeAge.toFixed(1)}h active</div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { l: "Strategy Mode",   v: pb.strategy_mode, c: pb.strategy_color },
            { l: "Exposure Band",   v: pb.exposure_band, c: "text-white"       },
            {
              l: "Est. Remaining",
              v: remaining < 24
                ? `~${remaining.toFixed(0)}h`
                : `~${(remaining / 24).toFixed(1)}d`,
              c: "text-white",
            },
          ].map(({ l, v, c }) => (
            <div key={l} className="border border-white/5 px-4 py-2 text-center space-y-0.5">
              <div className="text-xs text-zinc-400">{l}</div>
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
          <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">{l}</div>
            <div className={`text-3xl font-semibold ${
              v >= 60 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"
            }`}>{v}%</div>
            <Bar value={v} cls={v >= 60 ? "bg-emerald-500" : v >= 50 ? "bg-yellow-500" : "bg-red-500"} />
            <div className="text-xs text-zinc-500">Historical in {execLabel} regimes</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Regime Protocol</div>
          <ul className="space-y-2">
            {pb.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Avoid in This Regime</div>
          <ul className="space-y-2">
            {pb.avoid.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-red-400 mt-0.5 shrink-0">✕</span>{a}
              </li>
            ))}
          </ul>
          <div className="border border-white/5/60 p-3 mt-3">
            <div className="text-xs text-zinc-500">{pb.context}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Regime Playbook Engine"
      consequence="Without a playbook, you are applying the same strategy regardless of regime conditions."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Regime Playbook Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Actionable protocol based on current regime and historical edge
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PERSONALIZED EXPOSURE TRACKER
// ─────────────────────────────────────────
function ExposureTracker({ stack, isPro, onUnlock }) {
  const [portfolioSize,    setPortfolioSize]    = useState(10000);
  const [currentExposure,  setCurrentExposure]  = useState(50);
  const [leverage,         setLeverage]         = useState(1);
  const [strategyType,     setStrategyType]     = useState("swing");
  const [result,           setResult]           = useState(null);

  const analyse = () => {
    if (!stack) return;
    const execLabel   = stack.execution?.label ?? "Neutral";
    const pb          = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
    const alignment   = stack.alignment  ?? 50;
    const shiftRisk   = stack.shift_risk ?? 50;
    const [minBand, maxBand] = pb.exposure_band.replace(/%/g, "").split("–").map(Number);
    const optimalMid  = (minBand + maxBand) / 2;
    const effectiveExp = currentExposure * leverage;
    const delta       = effectiveExp - optimalMid;
    const baseR =
      execLabel === "Strong Risk-On" ?  1.2 :
      execLabel === "Risk-On"        ?  0.9 :
      execLabel === "Neutral"        ?  0.2 :
      execLabel === "Risk-Off"       ? -0.3 : -0.8;
    const expectancy = (baseR + (alignment / 100) * 0.4 + ((100 - shiftRisk) / 100) * 0.2).toFixed(2);

    setResult({
      optimalMid,
      minBand,
      maxBand,
      effectiveExp: effectiveExp.toFixed(1),
      delta:        Math.abs(delta).toFixed(1),
      isOver:       delta > 0,
      overBand:     effectiveExp > maxBand,   // FIX: removed erroneous * leverage
      expectancy,
      deployedCapital: ((currentExposure / 100) * portfolioSize).toLocaleString(),
      optimalCapital:  ((optimalMid      / 100) * portfolioSize).toLocaleString(),
      regimeLabel:     execLabel,
    });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Portfolio Size (USD)",  val: portfolioSize,   set: setPortfolioSize,   type: "number", min: 100                       },
          { l: "Current Exposure %",    val: currentExposure, set: setCurrentExposure, type: "number", min: 0,   max: 200              },
          { l: "Leverage (1x = spot)",  val: leverage,        set: setLeverage,        type: "number", min: 1,   max: 20,   step: 0.5  },
        ].map(({ l, val, set, ...rest }) => (
          <div key={l} className="space-y-2">
            <div className="text-xs text-zinc-400">{l}</div>
            <input
              value={val}
              onChange={(e) => set(Number(e.target.value))}
              {...rest}
              className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
            />
          </div>
        ))}
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Strategy Type</div>
          <select
            value={strategyType}
            onChange={(e) => setStrategyType(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="swing">Swing</option>
            <option value="trend">Trend Following</option>
            <option value="scalp">Scalp</option>
            <option value="dca">DCA</option>
          </select>
        </div>
      </div>

      <button
        onClick={analyse}
        className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
      >
        Analyse My Exposure
      </button>

      {result && (
        <div className="space-y-4">
          <div className={`border px-5 py-4 space-y-1 ${
            result.overBand ? "border-red-900 bg-red-950 text-red-300"        :
            result.isOver   ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
                              "border-emerald-900 bg-emerald-950 text-emerald-300"
          }`}>
            <div className="font-semibold text-sm">
              {result.overBand
                ? `⚠ Exposure ${result.delta}% above regime tolerance`
                : result.isOver
                ? `⚡ ${result.delta}% above optimal mid-point`
                : `✓ ${result.delta}% below optimal — capacity to add`}
            </div>
            <div className="text-xs opacity-70">
              Effective exposure: {result.effectiveExp}% · Optimal band: {result.minBand}–{result.maxBand}% · Regime: {result.regimeLabel}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: "Deployed Capital",  v: `
$$
{result.deployedCapital}`, c: exposureColor(currentExposure) },
              { l: "Optimal Capital",   v: `
$$
{result.optimalCapital}`,  c: "text-blue-400"                },
              {
                l: "R Expectancy",
                v: `${result.expectancy}R`,
                c: Number(result.expectancy) >= 0.5 ? "text-emerald-400" :
                   Number(result.expectancy) >= 0   ? "text-yellow-400"  : "text-red-400",
              },
              { l: "Regime Tolerance",  v: `${result.minBand}–${result.maxBand}%`, c: "text-gray-300" },
            ].map(({ l, v, c }) => (
              <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
                <div className="text-xs text-zinc-400">{l}</div>
                <div className={`text-xl font-semibold ${c}`}>{v}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400">Exposure vs Regime Band</div>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              {/* optimal band highlight */}
              <div
                className="absolute h-full bg-emerald-900/40"
                style={{
                  left:  `${result.minBand}%`,
                  width: `${result.maxBand - result.minBand}%`,
                }}
              />
              {/* current exposure marker — FIX: cast effectiveExp to Number */}
              <div
                className={`absolute h-full w-1 ${
                  result.overBand ? "bg-red-400" : result.isOver ? "bg-yellow-400" : "bg-emerald-400"
                }`}
                style={{ left: `${Math.min(99, Number(result.effectiveExp))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0%</span>
              <span className="text-emerald-600">▲ Optimal {result.minBand}–{result.maxBand}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Exposure Calibration Engine"
      consequence="Without exposure calibration, you cannot know if your position size is regime-appropriate."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Exposure Calibration Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Compare your current position size against regime-optimal allocation
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
  const hazard    = stack.hazard    ?? 0;
  const shiftRisk = stack.shift_risk ?? 0;
  const alignment = stack.alignment ?? 100;
  const survival  = stack.survival  ?? 100;

  const stress = Math.round(
    hazard     * 0.30 +
    shiftRisk  * 0.35 +
    (100 - alignment) * 0.20 +
    (100 - survival)  * 0.15
  );

  const stressLabel =
    stress >= 80 ? "Critical" :
    stress >= 60 ? "Elevated" :
    stress >= 40 ? "Moderate" :
    stress >= 20 ? "Low"      : "Minimal";

  const stressColor =
    stress >= 80 ? "text-red-400"     :
    stress >= 60 ? "text-orange-400"  :
    stress >= 40 ? "text-yellow-400"  :
    stress >= 20 ? "text-green-400"   : "text-emerald-400";

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
            { l: "Hazard Rate",           v: hazard,              w: "30%" },
            { l: "Shift Risk",            v: shiftRisk,           w: "35%" },
            { l: "Alignment Breakdown",   v: 100 - alignment,     w: "20%" },
            { l: "Survival Decay",        v: 100 - survival,      w: "15%" },
          ].map(({ l, v, w }) => (
            <div key={l} className="flex items-center gap-3">
              <div className="text-xs text-zinc-500 w-36 shrink-0">{l}</div>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    v >= 70 ? "bg-red-500" : v >= 45 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.round(v)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-400 w-8 text-right">{Math.round(v)}%</div>
              <div className="text-xs text-gray-700 w-8">{w}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Regime Stress Meter"
      consequence="Stress meter identifies regime breakdown before it appears in price."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
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
  const execLabel = stack.execution?.label ?? "Neutral";
  const pb        = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
  const regimeAge = stack.regime_age_hours ?? 0;
  const avgTotal  = pb.avg_remaining_days * 24;
  const remaining = Math.max(0, avgTotal - regimeAge);
  const pct       = Math.min(100, (regimeAge / avgTotal) * 100);

  const urgency =
    remaining < 12 ? "text-red-400"     :
    remaining < 48 ? "text-yellow-400"  : "text-emerald-400";

  const inner = (
    <div className="grid md:grid-cols-3 gap-6 items-center">
      <div className="space-y-3">
        <div className={`text-4xl font-bold ${urgency}`}>
          {remaining < 24
            ? `~${remaining.toFixed(0)}h`
            : `~${(remaining / 24).toFixed(1)}d`}
        </div>
        <div className="text-xs text-zinc-400">Est. remaining in current regime</div>
        <Bar
          value={pct}
          cls={
            pct >= 85 ? "bg-red-500"     :
            pct >= 65 ? "bg-orange-500"  :
            pct >= 40 ? "bg-yellow-500"  : "bg-emerald-500"
          }
        />
        <div className="text-xs text-zinc-500">
          {regimeAge.toFixed(1)}h elapsed / {avgTotal}h avg total
        </div>
      </div>

      <div className="md:col-span-2 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Current Regime", v: execLabel,               c: regimeText(execLabel) },
            { l: "Avg Duration",   v: `${pb.avg_remaining_days}d`, c: "text-gray-300"   },
            { l: "Age",            v: `${regimeAge.toFixed(1)}h`,  c: "text-gray-300"   },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
              <div className="text-xs text-zinc-400">{l}</div>
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

  if (!isPro) return (
    <ProGate
      label="Regime Countdown Timer"
      consequence="Without regime duration modeling, you cannot anticipate transition windows."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <Label>Regime Countdown Timer</Label>
      <p className="text-xs text-zinc-400">Statistical estimate based on historical regime durations</p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// CONFIDENCE TREND
// ─────────────────────────────────────────
function ConfidenceTrend({ history, confidence, isPro, onUnlock }) {
  const baseConf = confidence?.score ?? 60;
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
          <div className="text-xs text-zinc-400 mt-1">Current regime confidence</div>
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
          <Area type="monotone" dataKey="conf" stroke="#3b82f6" strokeWidth={2} fill="url(#confGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex gap-4 text-xs text-zinc-500">
        <span>24h range: {Math.min(...trendData.map(d => d.conf))}–{Math.max(...trendData.map(d => d.conf))}%</span>
        <span className={tColor}>24h Δ: {delta > 0 ? "+" : ""}{delta}%</span>
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Confidence Trend (24H)"
      consequence="Confidence trend shows whether regime conviction is building or deteriorating."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-6 space-y-2">
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
    (stack.alignment || 0) >= 80 ? "All timeframes agree — high conviction"       :
    (stack.alignment || 0) >= 50 ? "Partial alignment — moderate conviction"       :
                                   "Conflicting timeframes — reduce size";

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Label>Regime Stack</Label>
          <h2 className="text-xl font-semibold">{stack.coin} Multi-Timeframe Analysis</h2>
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
          <div
            key={label}
            className={`flex items-center justify-between px-5 py-4 border rounded-sm ${
              data ? regimeBorder(data.label) : "border-white/5"
            }`}
          >
            <div className="w-32 shrink-0">
              <span className="text-gray-300 font-medium text-sm">{label}</span>
              <span className="text-zinc-500 text-xs ml-1">({tf})</span>
            </div>
            <div className={`text-sm font-semibold flex-1 ${data ? regimeText(data.label) : "text-zinc-500"}`}>
              {data?.label ?? "—"}
            </div>
            <div className="text-xs text-right w-28 hidden sm:block">
              {isPro && data
                ? <span className="text-zinc-400">Coherence {data.coherence?.toFixed(1)}%</span>
                : <span className="text-gray-700 flex items-center justify-end cursor-pointer" onClick={onUnlock}><Lock />Pro</span>
              }
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <Label>Alignment</Label>
          <div className={`text-3xl font-semibold ${alignColor(stack.alignment || 0)}`}>
            {stack.alignment ?? "—"}%
          </div>
          <Bar
            value={stack.alignment || 0}
            cls={
              (stack.alignment || 0) >= 80 ? "bg-emerald-500" :
              (stack.alignment || 0) >= 50 ? "bg-yellow-500"  : "bg-red-500"
            }
          />
          <div className="text-xs text-zinc-500">{alignDesc}</div>
        </div>

        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <Label>Recommended Exposure</Label>
          {isPro ? (
            <>
              <div className={`text-3xl font-semibold ${exposureColor(stack.exposure || 0)}`}>
                {stack.exposure ?? "—"}%
              </div>
              <Bar
                value={stack.exposure || 0}
                cls={
                  (stack.exposure || 0) > 60 ? "bg-emerald-500" :
                  (stack.exposure || 0) > 35 ? "bg-yellow-500"  : "bg-red-500"
                }
              />
              <div className="text-xs text-zinc-500">Alignment-adjusted recommendation</div>
            </>
          ) : (
            <div className="space-y-2 cursor-pointer" onClick={onUnlock}>
              <div className="text-3xl font-semibold text-zinc-700 blur-sm select-none">00%</div>
              <div className="text-xs text-gray-700 flex items-center gap-1"><Lock />Pro only</div>
            </div>
          )}
        </div>
      </div>

      {isPro && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Survival",   v: stack.survival,   fn: (v) => riskColor(100 - v) },
            { l: "Hazard",     v: stack.hazard,     fn: riskColor                 },
            { l: "Shift Risk", v: stack.shift_risk, fn: riskColor                 },
          ].map(({ l, v, fn }) => (
            <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
              <Label>{l}</Label>
              <div className={`text-xl font-semibold ${fn(v || 0)}`}>{v ?? "—"}%</div>
            </div>
          ))}
        </div>
      )}

      {!isPro && (
        <button
          onClick={onUnlock}
          className="w-full border border-zinc-700 py-3 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors rounded-sm"
        >
          <Lock />Unlock coherence, survival, hazard & exposure — Pro
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
        <div className="text-xs text-zinc-400 max-w-xs text-right">{confidence?.description}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(confidence?.components || {}).map(([key, val]) => (
          <div key={key} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
            <div className="text-xs text-zinc-500 capitalize">{key}</div>
            <div className="text-lg font-semibold text-white">{val}%</div>
            <Bar value={val} cls="bg-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Regime Confidence Score"
      consequence="Confidence score determines appropriate position sizing for this regime."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  if (!confidence) return null;
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
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
    if (["Low","Strong","Normal"].includes(label))                        return "text-green-400";
    if (["Moderate","Weak"].includes(label))                              return "text-yellow-400";
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
        <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
          <div className="text-xs text-zinc-400">{label}</div>
          <div className={`text-xl font-semibold ${envColor(value)}`}>{value ?? "—"}</div>
          {score != null && (
            <>
              <Bar value={score} cls={score > 70 ? "bg-red-500" : score > 40 ? "bg-yellow-500" : "bg-green-500"} />
              <div className="text-xs text-gray-700">{score}%</div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Volatility & Liquidity Environment"
      consequence="Volatility environment determines stop placement and position sizing precision."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  if (!env) return null;
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
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
                  state === transitions?.current_state ? "bg-white"      :
                  state.includes("Risk-On")            ? "bg-green-500"  :
                  state.includes("Risk-Off")           ? "bg-red-500"    : "bg-yellow-500"
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

  if (!isPro) return (
    <ProGate
      label="Regime Transition Probability"
      consequence="Transition probabilities show where the regime is statistically likely to move next."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  if (!transitions?.transitions) return null;
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <div>
        <Label>Regime Transition Probability</Label>
        <h2 className="text-base font-semibold">
          Next Transition — Current:{" "}
          <span className={regimeText(transitions.current_state)}>{transitions.current_state}</span>
        </h2>
        {!transitions.data_sufficient && (
          <div className="text-xs text-zinc-500 mt-1">
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
  const [accountSize,   setAccountSize]   = useState(10000);
  const [strategyMode,  setStrategyMode]  = useState("balanced");
  const [allocation,    setAllocation]    = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  const calculate = async () => {
    if (!isPro) { onUnlock(); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BACKEND}/portfolio-allocator?account_size=${accountSize}&strategy_mode=${strategyMode}&coin=${stack?.coin || "BTC"}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllocation(await res.json());
    } catch {
      setError("Calculation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-6">
      <div>
        <Label>Portfolio Exposure Allocator</Label>
        <h2 className="text-base font-semibold">Risk-Adjusted Capital Allocation</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size (USD)</div>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Strategy Mode</div>
          <div className="flex gap-2">
            {["conservative", "balanced", "aggressive"].map((m) => (
              <button
                key={m}
                onClick={() => setStrategyMode(m)}
                className={`flex-1 py-3 rounded-xl text-xs font-medium capitalize transition-colors ${
                  strategyMode === m
                    ? "bg-white text-black"
                    : "bg-zinc-950 text-gray-400 border border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={calculate}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Calculating..." : isPro ? "Calculate Allocation" : <><Lock />Pro Only</>}
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
{allocation.deployed_capital?.toLocaleString()}`, color: exposureColor(allocation.adjusted_exposure) },
              { label: "Spot",         value: `
$$
{allocation.spot_allocation?.toLocaleString()}`,  color: "text-blue-400"   },
              { label: "Swing",        value: `
$$
{allocation.swing_allocation?.toLocaleString()}`, color: "text-purple-400" },
              { label: "Cash Reserve", value: `
$$
{allocation.cash_reserve?.toLocaleString()}`,     color: "text-gray-300"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
                <div className="text-xs text-zinc-400">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="border border-white/5/50 px-4 py-3 text-xs text-zinc-500 space-x-4">
            <span>Adjusted exposure: <span className="text-gray-400">{allocation.adjusted_exposure}%</span></span>
            <span>Strategy: <span className="text-gray-400 capitalize">{allocation.strategy_mode}</span></span>
            <span>Confidence: <span className="text-gray-400">{allocation.confidence}%</span></span>
          </div>
        </div>
      )}

      {!isPro && (
        <div
          className="border border-dashed border-zinc-700 p-6 text-center space-y-2 cursor-pointer hover:border-zinc-500 transition-colors rounded-sm"
          onClick={onUnlock}
        >
          <div className="text-sm text-gray-400"><Lock />Portfolio allocator requires Pro</div>
          <div className="text-xs text-zinc-500">
            Unlock deployed capital · spot vs swing split · cash reserve calculation
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
            <div key={pair} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-gray-300">{pair}</div>
              <div className={`text-2xl font-semibold ${
                abs > 0.8 ? "text-emerald-400" : abs > 0.5 ? "text-yellow-400" : "text-red-400"
              }`}>
                {Number(corr).toFixed(2)}
              </div>
              <div className="text-xs text-zinc-500">{label}</div>
              <Bar
                value={abs * 100}
                cls={abs > 0.8 ? "bg-emerald-500" : abs > 0.5 ? "bg-yellow-500" : "bg-red-500"}
              />
            </div>
          );
        })}
      </div>
      {correlation?.alerts?.map((alert, i) => (
        <div key={i} className="border border-red-900 bg-red-900/20 border border-red-700/40/10 px-4 py-3 text-red-400 text-sm">
          ⚠ {alert}
        </div>
      ))}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Cross-Asset Correlation Monitor"
      consequence="Correlation breakdown between assets is an early warning of regime stress."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  if (!correlation?.pairs?.length) return null;
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <div>
        <Label>Cross-Asset Correlation Monitor</Label>
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
    if (label === "Risk-On")         return "bg-green-900/30 text-green-400 border-green-900/40";
    if (label === "Strong Risk-Off") return "bg-red-900/20 border border-red-700/40/40 text-red-400 border-red-900/50";
    if (label === "Risk-Off")        return "bg-red-900/20 border border-red-700/40/20 text-red-400 border-red-900/30";
    if (label === "Neutral")         return "bg-yellow-900/20 text-yellow-400 border-yellow-900/30";
    return "bg-zinc-950/40 text-zinc-500 border-white/5";
  }
  function shortLabel(label) {
    if (!label)                      return "—";
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
              <th className="text-left text-zinc-400 pb-3 pr-6 font-normal uppercase tracking-widest">Asset</th>
              {[
                { label: "Execution", tf: "1H" },
                { label: "Trend",     tf: "4H" },
                { label: "Macro",     tf: "1D" },
              ].map(({ label, tf }) => (
                <th key={tf} className="text-zinc-400 pb-3 px-3 font-normal uppercase tracking-widest text-center">
                  {label} <span className="text-gray-700">({tf})</span>
                </th>
              ))}
              <th className="text-zinc-400 pb-3 px-3 font-normal uppercase tracking-widest text-center">Align</th>
              <th className="text-zinc-400 pb-3 px-3 font-normal uppercase tracking-widest text-center">Dir</th>
            </tr>
          </thead>
          <tbody>
            {(overview || []).map((item) => (
              <tr key={item.coin} className="border-t border-white/5/50">
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
                    {item.direction === "bullish" ? "↑" : item.direction === "bearish" ? "↓" : "→"}
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
          { label: "R+",   cls: "bg-green-900/30 text-green-400 border-green-900/40"       },
          { label: "NEU",  cls: "bg-yellow-900/20 text-yellow-400 border-yellow-900/30"    },
          { label: "R-",   cls: "bg-red-900/20 border border-red-700/40/20 text-red-400 border-red-900/30"             },
          { label: "S.R-", cls: "bg-red-900/20 border border-red-700/40/40 text-red-400 border-red-900/50"             },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-xs px-2 py-0.5 rounded-sm border ${cls}`}>{label}</span>
        ))}
        <span className="text-xs text-zinc-500 ml-2 self-center">
          S = Strong · R+ = Risk-On · R- = Risk-Off · NEU = Neutral
        </span>
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Regime Heatmap"
      consequence="Heatmap shows regime alignment across all assets simultaneously."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  if (!overview?.length) return null;
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <div>
        <Label>Regime Heatmap</Label>
        <h2 className="text-base font-semibold">Asset × Timeframe Regime Grid</h2>
        <p className="text-xs text-zinc-400 mt-1">Full regime snapshot across every asset and timeframe</p>
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
    if (impact === "High")   return "text-red-400 border-red-900 bg-red-900/20 border border-red-700/40/10";
    if (impact === "Medium") return "text-yellow-400 border-yellow-900 bg-yellow-900/10";
    return "text-gray-400 border-white/5 bg-zinc-950/20";
  }

  const sorted = [...events].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return (order[a.impact] ?? 2) - (order[b.impact] ?? 2);
  });

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <div>
        <Label>Risk Event Monitor</Label>
        <h2 className="text-base font-semibold">Active Macro Risk Flags</h2>
        <p className="text-xs text-zinc-400 mt-1">Conditions that may trigger regime transitions</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sorted.map((e) => (
          <div key={e.name} className={`border px-4 py-3 rounded-sm space-y-1.5 ${impactStyle(e.impact)}`}>
            <div className="font-medium text-sm">{e.name}</div>
            <div className="text-xs opacity-70">{e.type}</div>
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-block ${impactStyle(e.impact)}`}>
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
  const maturityPct = avgDuration > 0 ? Math.min(100, (regimeAge / avgDuration) * 100) : 0;

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
        <div className="text-sm text-zinc-400 pb-1">
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
                : "text-zinc-500 border border-white/5"
            }`}
          >
            {ph}
          </div>
        ))}
      </div>
      <div className="text-xs text-zinc-500">
        0% = regime just started · 100% = statistically overdue for transition
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Regime Maturity"
      consequence="Regime maturity tells you how much statistical life remains in the current trend."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
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
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <div>
        <Label>Regime Score History</Label>
        <h2 className="text-base font-semibold">{coin} 48H Momentum Signal</h2>
        <p className="text-xs text-zinc-400 mt-1">Composite regime score over time</p>
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
          <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} fill="url(#hGrad)" dot={false} />
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
    breadth_score >  30 ? "text-green-400"  :
    breadth_score < -30 ? "text-red-400"    : "text-yellow-400";

  const trendLabel =
    breadth_score >  60 ? "Strong Participation" :
    breadth_score >  20 ? "Healthy"               :
    breadth_score > -20 ? "Mixed"                  :
    breadth_score > -60 ? "Weak"                   : "Broad Risk-Off";

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
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
          <div className="bg-green-500 transition-all"  style={{ width: `${(bullish  / total) * 100}%` }} />
        )}
        {neutral > 0 && (
          <div className="bg-yellow-500 transition-all" style={{ width: `${(neutral  / total) * 100}%` }} />
        )}
        {bearish > 0 && (
          <div className="bg-red-500 transition-all"    style={{ width: `${(bearish  / total) * 100}%` }} />
        )}
      </div>
      <div className="flex gap-6 text-xs">
        <span className="text-green-400">{bullish} bullish</span>
        <span className="text-yellow-400">{neutral} neutral</span>
        <span className="text-red-400">{bearish} bearish</span>
        <span className="text-zinc-500 ml-auto">
          {Math.round(((bullish + bearish) / total) * 100)}% trending
        </span>
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
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5">
      <Label>Multi-Asset Regime Map</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {overview.map((item) => (
          <button
            key={item.coin}
            onClick={() => onSelect(item.coin)}
            className={`border p-3 text-left space-y-1.5 transition-colors rounded-sm ${
              item.coin === activeCoin ? "border-white" : "border-white/5 hover:border-zinc-600"
            }`}
          >
            <div className="font-semibold text-sm">{item.coin}</div>
            {[
              { l: "M", v: item.macro     },
              { l: "T", v: item.trend     },
              { l: "E", v: item.execution },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-center gap-1">
                <span className="text-zinc-500 text-xs w-3">{l}</span>
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
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-4 relative overflow-hidden">
      <div>
        <Label>Survival Curve</Label>
        <h2 className="text-base font-semibold">Regime Persistence Probability</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Probability current regime persists · white line = current age
        </p>
      </div>
      <div className={!isPro ? "blur-sm pointer-events-none" : ""}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curve}>
            <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
            <XAxis dataKey="hour" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
            <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
              labelStyle={{ color: "#71717a" }}
              formatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
            />
            <Line type="monotone" dataKey="survival" stroke="#22c55e" strokeWidth={2} dot={false} name="Survival %" />
            <Line type="monotone" dataKey="hazard"   stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Hazard %" />
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
          <div className="bg-zinc-950 border border-zinc-700 px-6 py-5 text-center space-y-3">
            <div className="text-sm font-medium">Survival Curve</div>
            <div className="text-xs text-zinc-400 max-w-xs">
              Without survival modeling, you cannot quantify regime decay probability.
            </div>
            <button className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-4 py-2.5 rounded-xl text-xs font-semibold">
              Unlock Pro — $39/month
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
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-4">
      <Label>Signal Interpretation</Label>
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
              Volatility: <span className="text-white">{latest.volatility?.toFixed(2) ?? "—"}</span>
            </div>
          </>
        )}
      </div>
      {isPro && hazard > 60 && (
        <div className="text-red-400 text-sm pt-1">
          ⚠ Elevated hazard above 60% — deterioration risk is statistically significant.
        </div>
      )}
      {isPro && survival > 70 && (
        <div className="text-green-400 text-sm pt-1">
          ✓ Regime persistence statistically strong at current age.
        </div>
      )}
      {alignment < 40 && (
        <div className="text-yellow-400 text-sm pt-1">
          ⚡ Low alignment — timeframes in conflict. Reduce position size.
        </div>
      )}
      {stack.macro?.label?.includes("Risk-Off") && stack.execution?.label?.includes("Risk-On") && (
        <div className="border border-yellow-900 bg-yellow-900/10 px-4 py-3 text-yellow-400 text-sm">
          Counter-trend detected: short-term bullish inside bearish macro. Exposure automatically reduced.
        </div>
      )}
      {stack.macro?.label?.includes("Risk-On") && stack.execution?.label?.includes("Risk-Off") && (
        <div className="border border-blue-900 bg-blue-900/10 px-4 py-3 text-blue-400 text-sm">
          Pullback within bullish macro — potential re-entry zone. Await execution alignment before adding size.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// DECISION ENGINE PANEL
// ─────────────────────────────────────────
function DecisionEnginePanel({ stack, isPro, onUnlock, onDecisionLoaded }) {
  const [decision, setDecision] = useState(null);
  const [loading,  setLoading]  = useState(false);

  // FIX: wrap onDecisionLoaded in useCallback at call site; here we stabilise
  // the effect by only depending on primitive values
  useEffect(() => {
    if (!stack?.coin || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/decision-engine?coin=${stack.coin}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setDecision(d);
          if (onDecisionLoaded) onDecisionLoaded(d);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stack?.coin, isPro]); // eslint-disable-line react-hooks/exhaustive-deps

  const directiveStyle = (action) => {
    if (action === "aggressive") return { border: "border-emerald-700", bg: "bg-emerald-950", text: "text-emerald-300", bar: "bg-emerald-500" };
    if (action === "hold")       return { border: "border-green-800",   bg: "bg-green-950",   text: "text-green-300",   bar: "bg-green-500"   };
    if (action === "trim")       return { border: "border-yellow-800",  bg: "bg-yellow-950",  text: "text-yellow-300",  bar: "bg-yellow-500"  };
    if (action === "defensive")  return { border: "border-orange-800",  bg: "bg-orange-950",  text: "text-orange-300",  bar: "bg-orange-500"  };
    return { border: "border-red-800", bg: "bg-red-950", text: "text-red-300", bar: "bg-red-500" };
  };

  const inner = decision ? (
    <div className="space-y-6">
      {(() => {
        const s = directiveStyle(decision.action);
        return (
          <div className={`border ${s.border} ${s.bg} p-6 space-y-3`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">ChainPulse Directive</div>
                <div className={`text-3xl font-bold ${s.text}`}>{decision.directive}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Decision Score</div>
                <div className={`text-3xl font-bold ${s.text}`}>{decision.score}</div>
              </div>
            </div>
            <div className={`text-sm ${s.text} opacity-80`}>{decision.description}</div>
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
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Recommended Actions</div>
          <ul className="space-y-2">
            {(decision?.actions || []).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-white mt-0.5 shrink-0 font-bold">→</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Signal Breakdown</div>
          <div className="space-y-2">
            {Object.entries(decision?.components || {}).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="text-xs text-zinc-500 w-20 capitalize shrink-0">{key}</div>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      val >= 70 ? "bg-emerald-500" : val >= 50 ? "bg-yellow-500" : "bg-red-500"
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

      <div className="bg-white/2 border border-white/5 rounded-lg p-4">
        <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Decision Score Map</div>
        <div className="grid grid-cols-5 gap-1 text-xs text-center">
          {[
            { range: "80–100", label: "Increase",  cls: "bg-emerald-900/40 text-emerald-400 border-emerald-900" },
            { range: "60–79",  label: "Maintain",  cls: "bg-green-900/30 text-green-400 border-green-900"       },
            { range: "40–59",  label: "Trim",       cls: "bg-yellow-900/30 text-yellow-400 border-yellow-900"   },
            { range: "20–39",  label: "Defensive",  cls: "bg-orange-900/30 text-orange-400 border-orange-900"   },
            { range: "0–19",   label: "Risk-Off",   cls: "bg-red-900/20 border border-red-700/40/30 text-red-400 border-red-900"            },
          ].map(({ range, label, cls }) => {
            const [lo, hi] = range.split("–").map(Number);
            const active   = decision.score >= lo && decision.score <= (hi || 100);
            return (
              <div
                key={range}
                className={`border px-2 py-2 rounded-sm space-y-0.5 ${cls} ${active ? "ring-1 ring-white" : ""}`}
              >
                <div className="font-semibold">{label}</div>
                <div className="opacity-60">{range}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Computing directive...</div>
  ) : (
    <div className="text-sm text-zinc-400">Insufficient data</div>
  );

  if (!isPro) return (
    <ProGate
      label="Decision Engine"
      consequence="Without the decision engine, you have no systematic directive for today's session."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Decision Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Systematic directive based on all regime signals — updated every hour
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
          <div className="text-xs text-zinc-400">Your current exposure %</div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0}
            max={200}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          onClick={analyse}
          disabled={loading}
          className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
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
                sub:   result.dd_prob_increase > 0
                  ? `+${result.dd_prob_increase}% vs model`
                  : "Within model range",
              },
              {
                label: "Expected Loss Risk",
                value: `${result.expected_loss_pct}%`,
                color: riskColor(result.expected_loss_pct),
                sub:   `Model: ${result.model_loss_pct}%`,
              },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
                <div className="text-xs text-zinc-400">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{value}</div>
                {sub && <div className="text-xs text-zinc-500">{sub}</div>}
              </div>
            ))}
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="text-xs text-zinc-400">Your exposure vs model recommendation</div>
            <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
              {/* model band */}
              <div
                className="absolute h-full bg-zinc-700/60"
                style={{
                  left:  `${Math.max(0, result.model_exposure - 10)}%`,
                  width: "20%",
                }}
              />
              {/* model midpoint */}
              <div
                className="absolute h-full w-0.5 bg-white opacity-60"
                style={{ left: `${Math.min(99, result.model_exposure)}%` }}
              />
              {/* user marker */}
              <div
                className={`absolute h-full w-1 rounded-full ${
                  result.severity === "high"   ? "bg-red-400"     :
                  result.severity === "medium" ? "bg-yellow-400"  : "bg-emerald-400"
                }`}
                style={{ left: `${Math.min(99, result.user_exposure)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0%</span>
              <span className="text-gray-400">
                ← Model: {result.model_exposure}%&nbsp;&nbsp;|&nbsp;&nbsp;You: {result.user_exposure}% →
              </span>
              <span>100%</span>
            </div>
          </div>

          {result.over_exposed && result.delta_abs > 15 && (
            <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm">
              ⚠ If this regime shifts while you are over-exposed, estimated drawdown impact is{" "}
              {result.expected_loss_pct}% of portfolio vs {result.model_loss_pct}% if following the model.
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Consequence Simulator"
      consequence="See exactly what happens to your portfolio if you ignore regime signals."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Consequence Simulator</Label>
      <p className="text-xs text-zinc-400 mb-4">
        The cost of maintaining your current exposure in this regime
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PNL IMPACT ESTIMATOR
// ─────────────────────────────────────────
function PnLImpactEstimator({ stack, isPro, onUnlock }) {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [userExposure,  setUserExposure]  = useState(50);
  const [result,        setResult]        = useState(null);

  const estimate = () => {
    if (!stack) return;
    const modelExposure = stack.exposure   ?? 50;
    const hazard        = stack.hazard     ?? 30;
    const shiftRisk     = stack.shift_risk ?? 30;
    const survival      = stack.survival   ?? 70;
    const execLabel     = stack.execution?.label ?? "Neutral";

    const expectedMoveUp   = execLabel.includes("Risk-On")  ? 0.08 :
                             execLabel === "Neutral"         ? 0.03 : 0.01;
    const expectedMoveDown = execLabel.includes("Risk-Off") ? 0.12 :
                             execLabel === "Neutral"         ? 0.05 : 0.03;

    const upProb   = survival / 100;
    const downProb = (hazard + shiftRisk) / 200;

    const userUpPnL    = portfolioSize * (userExposure  / 100) * expectedMoveUp;
    const modelUpPnL   = portfolioSize * (modelExposure / 100) * expectedMoveUp;
    const userDownPnL  = portfolioSize * (userExposure  / 100) * expectedMoveDown * -1;
    const modelDownPnL = portfolioSize * (modelExposure / 100) * expectedMoveDown * -1;

    const userEV  = upProb * userUpPnL  + downProb * userDownPnL;
    const modelEV = upProb * modelUpPnL + downProb * modelDownPnL;

    setResult({
      userEV:       Math.round(userEV),
      modelEV:      Math.round(modelEV),
      evDelta:      Math.round(userEV - modelEV),
      userUpPnL:    Math.round(userUpPnL),
      modelUpPnL:   Math.round(modelUpPnL),
      userDownPnL:  Math.round(userDownPnL),
      modelDownPnL: Math.round(modelDownPnL),
      upProb:       Math.round(upProb   * 100),
      downProb:     Math.round(downProb * 100),
      modelExposure,
      execLabel,
    });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Portfolio Size (USD)</div>
          <input
            type="number"
            value={portfolioSize}
            onChange={(e) => setPortfolioSize(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Your Current Exposure %</div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0}
            max={200}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      <button
        onClick={estimate}
        className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
      >
        Estimate PnL Impact
      </button>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`border p-5 space-y-2 ${
              result.userEV >= 0 ? "border-emerald-900 bg-emerald-950" : "border-red-900 bg-red-950"
            }`}>
              <div className="text-xs text-zinc-400">Your Expected Value</div>
              <div className={`text-3xl font-bold ${result.userEV >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {result.userEV >= 0 ? "+" : ""}{result.userEV.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400">At {userExposure}% exposure</div>
            </div>
            <div className={`border p-5 space-y-2 ${
              result.modelEV >= 0 ? "border-blue-900 bg-blue-950" : "border-white/5 bg-zinc-950"
            }`}>
              <div className="text-xs text-zinc-400">Model Expected Value</div>
              <div className={`text-3xl font-bold ${result.modelEV >= 0 ? "text-blue-300" : "text-gray-300"}`}>
                {result.modelEV >= 0 ? "+" : ""}{result.modelEV.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400">At {result.modelExposure}% exposure</div>
            </div>
          </div>

          {result.evDelta !== 0 && (
            <div className={`border px-4 py-3 text-sm ${
              result.evDelta < 0
                ? "border-red-900 bg-red-950 text-red-300"
                : "border-emerald-900 bg-emerald-950 text-emerald-300"
            }`}>
              {result.evDelta < 0
                ? `⚠ Your exposure reduces expected value by 
$$
{Math.abs(result.evDelta).toLocaleString()} vs model.`
                : `✓ Your exposure increases expected value by
$$
{result.evDelta.toLocaleString()} vs model.`}
            </div>
          )}

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Scenario Breakdown</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="text-zinc-400">Upside ({result.upProb}% probability)</div>
                <div className="flex gap-3">
                  <span className="text-emerald-400">You: +${result.userUpPnL.toLocaleString()}</span>
                  <span className="text-blue-400">Model: +${result.modelUpPnL.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-zinc-400">Downside ({result.downProb}% probability)</div>
                <div className="flex gap-3">
                  <span className="text-red-400">You: -${Math.abs(result.userDownPnL).toLocaleString()}</span>
                  <span className="text-orange-400">Model: -${Math.abs(result.modelDownPnL).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-700 border-t border-white/5 pt-2">
              Based on {result.execLabel} regime · probabilities derived from survival and hazard modeling
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="PnL Impact Estimator"
      consequence="Without PnL modeling you cannot quantify the expected value of your exposure decision."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>PnL Impact Estimator</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Expected value of your current exposure vs model recommendation
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// DRAWDOWN SIMULATOR
// ─────────────────────────────────────────
function DrawdownSimulator({ stack, isPro, onUnlock }) {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [userExposure,  setUserExposure]  = useState(50);
  const [result,        setResult]        = useState(null);

  const simulate = () => {
    if (!stack) return;
    const modelExposure = stack.exposure ?? 50;
    const scenarios = [
      { label: "Moderate", pct: 10, color: "text-yellow-400", barCls: "bg-yellow-500" },
      { label: "Severe",   pct: 20, color: "text-orange-400", barCls: "bg-orange-500" },
      { label: "Extreme",  pct: 30, color: "text-red-400",    barCls: "bg-red-500"    },
    ];
    const results = scenarios.map(({ label, pct, color, barCls }) => {
      const userLoss  = (userExposure  / 100) * (pct / 100) * portfolioSize;
      const modelLoss = (modelExposure / 100) * (pct / 100) * portfolioSize;
      const saving    = userLoss - modelLoss;
      return {
        label, pct, color, barCls,
        userLoss:   Math.round(userLoss),
        modelLoss:  Math.round(modelLoss),
        saving:     Math.round(saving),
        userPct:    ((userLoss  / portfolioSize) * 100).toFixed(1),
        modelPct:   ((modelLoss / portfolioSize) * 100).toFixed(1),
        savingPct:  ((saving    / portfolioSize) * 100).toFixed(1),
      };
    });
    setResult({ scenarios: results, modelExposure });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Portfolio Size (USD)</div>
          <input
            type="number"
            value={portfolioSize}
            onChange={(e) => setPortfolioSize(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Your Current Exposure %</div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0}
            max={200}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      <button
        onClick={simulate}
        className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
      >
        Run Drawdown Scenarios
      </button>

      {result && (
        <div className="space-y-4">
          <div className="border border-white/5 px-4 py-3 text-xs text-zinc-400">
            <span>Model recommendation: <span className="text-gray-300">{result.modelExposure}%</span></span>
            <span className="mx-3">·</span>
            <span>Your exposure: <span className="text-gray-300">{userExposure}%</span></span>
            <span className="mx-3">·</span>
            <span>Portfolio: <span className="text-gray-300">${portfolioSize.toLocaleString()}</span></span>
          </div>
          {result.scenarios.map(({ label, pct, color, barCls, userLoss, modelLoss, saving, userPct, modelPct, savingPct }) => (
            <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className={`text-lg font-semibold ${color}`}>
                    {label} Drawdown — {pct}% price decline
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">Simulated portfolio impact</div>
                </div>
                {saving > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Model saves you</div>
                    <div className="text-lg font-semibold text-emerald-400">${saving.toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-400">Your loss</div>
                  <div className={`text-2xl font-semibold ${color}`}>-${userLoss.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">-{userPct}% of portfolio</div>
                  <Bar value={Number(userPct)} cls={barCls} />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-400">Model loss</div>
                  <div className="text-2xl font-semibold text-gray-300">-${modelLoss.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">-{modelPct}% of portfolio</div>
                  <Bar value={Number(modelPct)} cls="bg-zinc-500" />
                </div>
              </div>
              {saving > 0 && (
                <div className="border border-emerald-900 bg-emerald-950 px-3 py-2 text-emerald-300 text-xs">
                  Following the model saves ${saving.toLocaleString()} ({savingPct}%) in this scenario.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Drawdown Simulator"
      consequence="Without drawdown simulation you cannot quantify the real cost of your current exposure."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Drawdown Simulator</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Three drawdown scenarios at your exposure vs model recommendation
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        if (onProfileSaved) onProfileSaved(data);
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
          ✓ Risk profile saved. Exposure recommendations are now personalised.
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          {[
            {
              l: "Max Tolerable Drawdown", val: drawdown, set: setDrawdown,
              min: 5, max: 50, step: 5,
              fmt: (v) => `${v}%`,
              left: "5% (conservative)", right: "50% (aggressive)",
            },
            {
              l: "Typical Leverage", val: leverage, set: setLeverage,
              min: 1, max: 10, step: 0.5,
              fmt: (v) => `${v}x`,
              left: "1x (spot)", right: "10x",
            },
            {
              l: "Typical Holding Period", val: holding, set: setHolding,
              min: 1, max: 30, step: 1,
              fmt: (v) => `${v} days`,
              left: "1 day (scalp)", right: "30 days (swing)",
            },
          ].map(({ l, val, set, min, max, step, fmt, left, right }) => (
            <div key={l} className="space-y-2">
              <div className="flex justify-between">
                <div className="text-xs text-zinc-400">{l}</div>
                <div className="text-xs text-white font-medium">{fmt(val)}</div>
              </div>
              <input
                type="range"
                min={min} max={max} step={step} value={val}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-xs text-gray-700">
                <span>{left}</span><span>{right}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">Trader Identity</div>
          <div className="space-y-2">
            {["conservative", "balanced", "aggressive"].map((id) => (
              <button
                key={id}
                onClick={() => setIdentity(id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors space-y-1 ${
                  identity === id
                    ? "border-white bg-zinc-800"
                    : "border-white/5 hover:border-zinc-600"
                }`}
              >
                <div className="text-sm font-medium capitalize">{id}</div>
                <div className="text-xs text-zinc-500">{identityDesc[id]}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={save}
        disabled={loading || !email}
        className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Risk Profile"}
      </button>
      {!email && <div className="text-xs text-zinc-500">Sign in to save your profile.</div>}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Risk Profile Calibration"
      consequence="Without a risk profile, exposure recommendations cannot be personalised to your capital."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Risk Profile Calibration</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Personalise exposure recommendations to your trading style and capital
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          coin:               stack.coin,
          user_exposure_pct:  userExposure,
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
      <p className="text-xs text-zinc-400">
        Log your actual exposure to build your discipline score and performance tracking over time.
      </p>
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <div className="text-xs text-zinc-400">
            My current exposure in {stack?.coin ?? "BTC"} (%)
          </div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0}
            max={200}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-zinc-500">Model says</div>
          <div className={`text-xl font-semibold ${exposureColor(stack?.exposure ?? 0)}`}>
            {stack?.exposure ?? "—"}%
          </div>
        </div>
        <button
          onClick={logIt}
          disabled={loading || !email}
          className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Logging..." : "Log Exposure"}
        </button>
      </div>
      {result && (
        <div className={`border px-4 py-3 space-y-1 text-sm ${
          result.severity === "warning" ? "border-red-900 bg-red-950 text-red-300"         :
          result.severity === "caution" ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
                                          "border-emerald-900 bg-emerald-950 text-emerald-300"
        }`}>
          <div className="font-semibold">{result.feedback}</div>
          <div className="text-xs opacity-70">
            Delta vs model: {result.delta > 0 ? "+" : ""}{result.delta}% · Regime: {result.regime}
          </div>
        </div>
      )}
      {!email && (
        <div className="text-xs text-zinc-500">
          Sign in to log exposure and track discipline over time.
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Exposure Logger"
      consequence="Without logging, you cannot build a discipline score or track your performance vs the model."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Exposure Logger</Label>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// STREAK TRACKER
// ─────────────────────────────────────────
function StreakTracker({ email, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/discipline-score?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro]);

  const streak = data?.followed ?? 0;
  const total  = data?.total    ?? 0;

  const streakColor =
    streak >= 7 ? "text-emerald-400" :
    streak >= 3 ? "text-yellow-400"  : "text-red-400";

  const streakLabel =
    streak >= 10 ? "Elite Discipline"   :
    streak >= 7  ? "Strong Streak"      :
    streak >= 3  ? "Building Momentum"  :
    streak >= 1  ? "Getting Started"    : "No streak yet";

  const inner = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="space-y-2 shrink-0">
        <div className={`text-6xl font-bold ${streakColor}`}>{streak}</div>
        <div className={`text-sm font-medium ${streakColor}`}>{streakLabel}</div>
        <div className="text-xs text-zinc-500">consecutive aligned sessions</div>
      </div>
      <div className="flex-1 space-y-3 w-full">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-sm border transition-all ${
                i < streak
                  ? "bg-emerald-500 border-emerald-400"
                  : "bg-zinc-800 border-zinc-700"
              }`}
            />
          ))}
          {total === 0 && (
            <div className="text-xs text-zinc-500">
              Log your exposure to start building a streak.
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="text-xs text-zinc-500">
            {streak}/{total} sessions · Last 20 shown
          </div>
        )}
        {streak >= 7 && (
          <div className="border border-emerald-800 bg-emerald-950 px-3 py-2 text-emerald-300 text-xs">
            ✓ Consistent discipline — regime-aligned trader
          </div>
        )}
        {streak === 0 && total > 0 && (
          <div className="border border-red-900 bg-red-950 px-3 py-2 text-red-300 text-xs">
            ⚠ Last session deviated from model — refocus on protocol
          </div>
        )}
      </div>
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Discipline Streak"
      consequence="Streak tracking creates daily accountability and reduces impulsive deviation."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Discipline Streak</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Consecutive sessions where your exposure aligned with regime recommendation
      </p>
      {loading
        ? <div className="text-sm text-zinc-400">Loading streak...</div>
        : inner
      }
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
    if (s === null) return "text-zinc-400";
    if (s >= 85)   return "text-emerald-400";
    if (s >= 70)   return "text-green-400";
    if (s >= 50)   return "text-yellow-400";
    if (s >= 30)   return "text-orange-400";
    return "text-red-400";
  };

  const inner = data ? (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className={`text-6xl font-bold ${scoreColor(data.score)}`}>
            {data.score !== null ? `${data.score}` : "—"}
          </div>
          <div className={`text-lg font-medium ${scoreColor(data.score)}`}>{data.label}</div>
          <Bar
            value={data.score ?? 0}
            cls={
              (data.score ?? 0) >= 85 ? "bg-emerald-500" :
              (data.score ?? 0) >= 70 ? "bg-green-500"   :
              (data.score ?? 0) >= 50 ? "bg-yellow-500"  :
              (data.score ?? 0) >= 30 ? "bg-orange-500"  : "bg-red-500"
            }
          />
          <div className="text-xs text-zinc-500">{data.summary}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {[
            { l: "Followed", v: data.followed,               c: "text-emerald-400" },
            { l: "Total",    v: data.total,                   c: "text-white"       },
            { l: "Bonuses",  v: `+${data.bonuses  ?? 0}`,    c: "text-emerald-400" },
            { l: "Penalties",v: `-${data.penalties ?? 0}`,    c: "text-red-400"     },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-3 text-center space-y-1">
              <div className="text-xs text-zinc-500">{l}</div>
              <div className={`text-xl font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {data.flags?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Recent Flags</div>
          <div className="space-y-2">
            {data.flags.map((flag, i) => (
              <div
                key={i}
                className={`border px-4 py-3 text-sm flex justify-between items-center ${
                  flag.type === "penalty"
                    ? "border-red-900 bg-red-950 text-red-300"
                    : "border-emerald-900 bg-emerald-950 text-emerald-300"
                }`}
              >
                <span>{flag.label}</span>
                <span className="text-xs opacity-60">{flag.date} · {flag.regime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Loading discipline score...</div>
  ) : (
    <div className="text-sm text-zinc-400">
      No data yet. Log your exposure to start building your discipline score.
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Discipline Score"
      consequence="Without discipline tracking, you cannot identify the patterns that are costing you money."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Discipline Score</Label>
      <p className="text-xs text-zinc-400 mb-4">
        How consistently you follow regime-based risk protocols
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// MISTAKE REPLAY PANEL
// ─────────────────────────────────────────
function MistakeReplayPanel({ email, coin, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/mistake-replay?email=${encodeURIComponent(email)}&coin=${coin}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, coin, isPro]);

  const severityStyle = (s) => {
    if (s === "high")   return "border-red-800 bg-red-950 text-red-300";
    if (s === "medium") return "border-orange-800 bg-orange-950 text-orange-300";
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  };

  const inner = data?.replays?.length > 0 ? (
    <div className="space-y-3">
      {data.replays.map((replay, i) => (
        <div key={i} className={`border p-5 space-y-3 ${severityStyle(replay.severity)}`}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="text-sm font-semibold">{replay.message}</div>
              <div className="text-xs opacity-70 mt-0.5">
                {replay.date} · {replay.regime}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 capitalize ${
              replay.severity === "high"   ? "border-red-700 text-red-300"       :
              replay.severity === "medium" ? "border-orange-700 text-orange-300" :
                                             "border-yellow-700 text-yellow-300"
            }`}>
              {replay.severity}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="text-zinc-400">Your Exposure</div>
              <div className={`font-semibold ${exposureColor(replay.user_exp)}`}>
                {replay.user_exp}%
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-zinc-400">Model Said</div>
              <div className={`font-semibold ${exposureColor(replay.model_exp)}`}>
                {replay.model_exp}%
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-zinc-400">Delta</div>
              <div className={`font-semibold ${replay.delta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {replay.delta > 0 ? "+" : ""}{replay.delta}%
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-3">
            <div>
              <span className="text-zinc-400">Hazard at time: </span>
              <span className={riskColor(replay.signals_at_time?.hazard ?? 0)}>
                {replay.signals_at_time?.hazard ?? "—"}%
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Shift risk: </span>
              <span className={riskColor(replay.signals_at_time?.shift_risk ?? 0)}>
                {replay.signals_at_time?.shift_risk ?? "—"}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Analysing deviation history...</div>
  ) : (
    <div className="text-sm text-zinc-400">
      {data?.count === 0
        ? "No significant deviations detected. Discipline is strong."
        : "Log exposure over time to generate mistake replay analysis."}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Mistake Replay Engine"
      consequence="Mistake replay identifies the exact conditions where your decisions cost you money."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Mistake Replay Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Sessions where you deviated from the model during elevated risk conditions
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PERFORMANCE PANEL
// ─────────────────────────────────────────
function PerformancePanel({ email, coin, token, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(
      `${BACKEND}/performance-comparison?email=${encodeURIComponent(email)}&coin=${coin}`,
      { headers }
    )
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, coin, isPro, token]);

  const inner = data ? (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Your Return",
            value: data.user_total_return !== null
              ? `${(data.user_total_return ?? 0) > 0 ? "+" : ""}${data.user_total_return?.toFixed(1)}%`
              : "—",
            color: (data.user_total_return ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Model Return",
            value: data.model_total_return !== null
              ? `${(data.model_total_return ?? 0) > 0 ? "+" : ""}${data.model_total_return?.toFixed(1)}%`
              : "—",
            color: (data.model_total_return ?? 0) >= 0 ? "text-blue-400" : "text-red-400",
          },
          {
            label: "Alpha vs Model",
            value: data.alpha !== null
              ? `${(data.alpha ?? 0) > 0 ? "+" : ""}${data.alpha?.toFixed(1)}%`
              : "—",
            color: (data.alpha ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Periods Tracked",
            value: data.periods ?? "—",
            color: "text-gray-300",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
            <div className="text-xs text-zinc-400">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {data.message && (
        <div className="text-xs text-zinc-500 border border-white/5 px-4 py-3">
          {data.message}
        </div>
      )}

      {data.curve?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Cumulative Return Comparison
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.curve}>
              <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
              <XAxis dataKey="period" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
              <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                labelStyle={{ color: "#71717a" }}
                formatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
              />
              <ReferenceLine y={0} stroke="#27272a" />
              <Line type="monotone" dataKey="user_cum"  stroke="#22c55e" strokeWidth={2} dot={false} name="Your Return"  />
              <Line type="monotone" dataKey="model_cum" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Model Return" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.regime_breakdown && Object.keys(data.regime_breakdown).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Performance by Regime
          </div>
          <div className="space-y-2">
            {Object.entries(data.regime_breakdown).map(([regime, stats]) => (
              <div key={regime} className="flex items-center justify-between border border-white/5 px-4 py-3">
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
                  <span className="text-zinc-500">{stats.count} periods</span>
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
              <div className="text-xs text-zinc-400">Best Regime for You</div>
              <div className={`text-sm font-semibold ${regimeText(data.best_regime)}`}>
                {data.best_regime}
              </div>
            </div>
          )}
          {data.worst_regime && (
            <div className="border border-red-900 bg-red-950 p-4 space-y-1">
              <div className="text-xs text-zinc-400">Worst Regime for You</div>
              <div className={`text-sm font-semibold ${regimeText(data.worst_regime)}`}>
                {data.worst_regime}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Loading performance data...</div>
  ) : (
    <div className="text-sm text-zinc-400">
      No performance data yet. Log your exposure over multiple periods to begin tracking.
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Performance Comparison"
      consequence="Without performance tracking, you cannot measure whether your decisions are adding or destroying alpha."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Performance Comparison</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Your actual returns vs following the model — compounded over time
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// EDGE PROFILE PANEL
// ─────────────────────────────────────────
function EdgeProfilePanel({ email, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    fetch(`${BACKEND}/edge-profile?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro]);

  const perfColor = (perf) => {
    if (perf === "Strong") return "text-emerald-400";
    if (perf === "Good")   return "text-green-400";
    if (perf === "Weak")   return "text-yellow-400";
    return "text-red-400";
  };

  const inner = !data ? (
    loading
      ? <div className="text-sm text-zinc-400">Building your edge profile...</div>
      : <div className="text-sm text-zinc-400">Log exposure across multiple sessions to unlock your edge profile.</div>
  ) : !data.ready ? (
    <div className="space-y-3">
      <div className="border border-white/5 px-4 py-3 text-sm text-zinc-400">
        {data.message}
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1">
        <div
          className="h-1 bg-blue-500 rounded-full transition-all"
          style={{ width: `${((data.entry_count ?? 0) / 5) * 100}%` }}
        />
      </div>
      <div className="text-xs text-zinc-500">
        {data.entry_count ?? 0} / 5 entries to unlock
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {data.best_regime && (
          <div className="border border-emerald-900 bg-emerald-950 p-4 space-y-1">
            <div className="text-xs text-zinc-400">Your Best Regime</div>
            <div className={`text-base font-semibold ${regimeText(data.best_regime)}`}>
              {data.best_regime}
            </div>
            <div className="text-xs text-zinc-400">Strongest historical edge</div>
          </div>
        )}
        {data.worst_regime && (
          <div className="border border-red-900 bg-red-950 p-4 space-y-1">
            <div className="text-xs text-zinc-400">Your Worst Regime</div>
            <div className={`text-base font-semibold ${regimeText(data.worst_regime)}`}>
              {data.worst_regime}
            </div>
            <div className="text-xs text-zinc-400">Underperforms here historically</div>
          </div>
        )}
      </div>

      {data.profile && Object.keys(data.profile).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Performance by Regime
          </div>
          <div className="space-y-2">
            {Object.entries(data.profile).map(([regime, stats]) => (
              <div key={regime} className="border border-white/5 px-4 py-3 flex items-center justify-between gap-4">
                <div className={`text-sm font-medium w-36 shrink-0 ${regimeText(regime)}`}>
                  {regime}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{stats.count} sessions</span>
                    <span>WR: {stats.win_rate}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        stats.avg_return >= 2   ? "bg-emerald-500" :
                        stats.avg_return >= 0.5 ? "bg-green-500"   :
                        stats.avg_return >= -1  ? "bg-yellow-500"  : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, 50 + stats.avg_return * 10))}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className={`text-sm font-semibold ${
                    stats.avg_return >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {stats.avg_return > 0 ? "+" : ""}{stats.avg_return}%
                  </div>
                  <div className={`text-xs ${perfColor(stats.performance)}`}>
                    {stats.performance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Personalised Recommendations
          </div>
          {data.recommendations.map((rec, i) => (
            <div key={i} className="border border-white/5 px-4 py-3 text-sm text-gray-300 flex items-start gap-2">
              <span className="text-blue-400 shrink-0 mt-0.5">→</span>
              {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Edge Profile"
      consequence="Without an edge profile you cannot identify which regimes you consistently outperform in."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Edge Profile</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Your historical performance breakdown by regime type
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// WEEKLY REPORT PANEL
// ─────────────────────────────────────────
function WeeklyReportPanel({ email, coin, isPro, onUnlock }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    Promise.all([
      fetch(`${BACKEND}/discipline-score?email=${encodeURIComponent(email)}`).then((r) => r.json()),
      fetch(`${BACKEND}/performance-comparison?email=${encodeURIComponent(email)}&coin=${coin}`).then((r) => r.json()),
    ])
      .then(([discipline, performance]) => setData({ discipline, performance }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, coin, isPro]);

  const inner = data ? (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Discipline Score",
            value: data.discipline?.score !== null ? `${data.discipline?.score}` : "—",
            suffix: "",
            color: data.discipline?.score >= 70 ? "text-emerald-400" :
                   data.discipline?.score >= 50 ? "text-yellow-400"  : "text-red-400",
            sub: data.discipline?.label ?? "—",
          },
          {
            label: "Your Return",
            value: data.performance?.user_total_return !== null
              ? `${(data.performance?.user_total_return ?? 0) > 0 ? "+" : ""}${data.performance?.user_total_return?.toFixed(1)}`
              : "—",
            suffix: data.performance?.user_total_return !== null ? "%" : "",
            color:  (data.performance?.user_total_return ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
            sub: "This period",
          },
          {
            label: "Model Return",
            value: data.performance?.model_total_return !== null
              ? `${(data.performance?.model_total_return ?? 0) > 0 ? "+" : ""}${data.performance?.model_total_return?.toFixed(1)}`
              : "—",
            suffix: data.performance?.model_total_return !== null ? "%" : "",
            color:  "text-blue-400",
            sub: "If followed model",
          },
          {
            label: "Alpha",
            value: data.performance?.alpha !== null
              ? `${(data.performance?.alpha ?? 0) > 0 ? "+" : ""}${data.performance?.alpha?.toFixed(1)}`
              : "—",
            suffix: data.performance?.alpha !== null ? "%" : "",
            color:  (data.performance?.alpha ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
            sub: "vs model",
          },
        ].map(({ label, value, suffix, color, sub }) => (
          <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
            <div className="text-xs text-zinc-400">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}{suffix}</div>
            <div className="text-xs text-zinc-500">{sub}</div>
          </div>
        ))}
      </div>

      {data.discipline?.flags?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Notable Events This Period
          </div>
          {data.discipline.flags.slice(0, 5).map((flag, i) => (
            <div
              key={i}
              className={`border px-4 py-2.5 text-xs flex justify-between items-center ${
                flag.type === "penalty"
                  ? "border-red-900 bg-red-950/50 text-red-300"
                  : "border-emerald-900 bg-emerald-950/50 text-emerald-300"
              }`}
            >
              <span>{flag.label}</span>
              <span className="opacity-60">{flag.date} · {flag.regime}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border border-white/5 px-4 py-3 text-xs text-zinc-400 space-y-1">
        <div className="font-medium text-gray-400">Period Summary</div>
        <div>
          {data.performance?.message ?? "Log more sessions to generate a full weekly summary."}
        </div>
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Loading weekly report...</div>
  ) : (
    <div className="text-sm text-zinc-400">
      No report data yet. Log exposure to generate your weekly summary.
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Weekly Performance Report"
      consequence="Weekly reports show whether your discipline is improving or deteriorating over time."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Weekly Performance Report</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Discipline score, returns, and notable events from this period
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// PORTFOLIO HEALTH SCORE
// ─────────────────────────────────────────
function PortfolioHealthScore({ stack, email, isPro, onUnlock }) {
  const [disciplineData, setDisciplineData] = useState(null);

  useEffect(() => {
    if (!email || !isPro) return;
    fetch(`${BACKEND}/discipline-score?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDisciplineData(d); })
      .catch(console.error);
  }, [email, isPro]);

  const regimeQuality    = deriveQuality(stack);
  const disciplineScore  = disciplineData?.score ?? null;
  const exposureDelta    = Math.abs((stack?.exposure ?? 50) - 50);
  const exposureAlign    = Math.max(0, 100 - exposureDelta * 1.5);

  const healthScore = disciplineScore !== null && regimeQuality
    ? Math.round(
        regimeQuality.score * 0.40 +
        disciplineScore     * 0.35 +
        exposureAlign       * 0.25
      )
    : regimeQuality
    ? regimeQuality.score
    : null;

  const healthColor =
    healthScore === null ? "text-zinc-400"    :
    healthScore >= 80    ? "text-emerald-400" :
    healthScore >= 60    ? "text-green-400"   :
    healthScore >= 40    ? "text-yellow-400"  :
    healthScore >= 20    ? "text-orange-400"  : "text-red-400";

  const healthLabel =
    healthScore === null ? "Insufficient data" :
    healthScore >= 80    ? "Optimal"           :
    healthScore >= 60    ? "Healthy"           :
    healthScore >= 40    ? "Moderate Risk"     :
    healthScore >= 20    ? "Elevated Risk"     : "High Risk";

  const healthBarCls =
    healthScore === null ? "bg-zinc-700"    :
    healthScore >= 80    ? "bg-emerald-500" :
    healthScore >= 60    ? "bg-green-500"   :
    healthScore >= 40    ? "bg-yellow-500"  :
    healthScore >= 20    ? "bg-orange-500"  : "bg-red-500";

  const components = [
    { label: "Regime Quality",      value: regimeQuality?.score ?? null, weight: "40%", hint: regimeQuality?.structural ?? "—"             },
    { label: "Discipline Score",    value: disciplineScore,               weight: "35%", hint: disciplineData?.label ?? "Log exposure to unlock" },
    { label: "Exposure Alignment",  value: Math.round(exposureAlign),    weight: "25%", hint: "vs regime recommendation"                    },
  ];

  const inner = (
    <div className="space-y-6">
      <div className="flex items-center gap-8">
        <div className="text-center space-y-2 shrink-0">
          <div className={`text-6xl font-bold ${healthColor}`}>{healthScore ?? "—"}</div>
          <div className={`text-sm font-medium ${healthColor}`}>{healthLabel}</div>
          <Bar value={healthScore ?? 0} cls={healthBarCls} />
          <div className="text-xs text-zinc-500">Portfolio Health</div>
        </div>
        <div className="flex-1 space-y-4">
          {components.map(({ label, value, weight, hint }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <div className="flex gap-3">
                  <span className="text-gray-700">{weight}</span>
                  <span className={
                    value === null ? "text-zinc-500"  :
                    value >= 70   ? "text-emerald-400" :
                    value >= 50   ? "text-yellow-400"  : "text-red-400"
                  }>
                    {value !== null ? `${value}%` : "—"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    value === null ? "bg-zinc-700"    :
                    value >= 70   ? "bg-emerald-500" :
                    value >= 50   ? "bg-yellow-500"  : "bg-red-500"
                  }`}
                  style={{ width: `${value ?? 0}%` }}
                />
              </div>
              <div className="text-xs text-gray-700">{hint}</div>
            </div>
          ))}
        </div>
      </div>
      {healthScore !== null && healthScore < 40 && (
        <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm">
          ⚠ Portfolio health is low. Review regime quality and exposure alignment before adding positions.
        </div>
      )}
      {healthScore !== null && healthScore >= 80 && (
        <div className="border border-emerald-900 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm">
          ✓ Portfolio health is optimal. Conditions are favourable for disciplined position sizing.
        </div>
      )}
    </div>
  );

  if (!isPro) return (
    <ProGate
      label="Portfolio Health Score"
      consequence="Without a health score you have no single metric to assess your overall trading posture."
      onUnlock={onUnlock}
    >
      {inner}
    </ProGate>
  );
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-2">
      <Label>Portfolio Health Score</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Composite score across regime quality, discipline, and exposure alignment
      </p>
      {inner}
    </div>
  );
}

// ─────────────────────────────────────────
// EMAIL CAPTURE
// ─────────────────────────────────────────
function EmailCapture({ onEmailSet }) {
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState(null);

  const submit = async () => {
    const email = input.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await fetch(`${BACKEND}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("cp_email", email);
      }
      onEmailSet(email);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="border border-emerald-800 bg-emerald-950 px-6 py-4 text-emerald-300 text-sm">
        ✓ Daily regime brief confirmed. Check your inbox.
      </div>
    );
  }

  return (
    <div className="border border-zinc-700 bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] px-6 py-5 space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium text-white">Get the daily regime brief</div>
        <div className="text-xs text-zinc-400">
          Regime verdict, shift risk, and directive — delivered every morning. Free.
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="your@email.com"
          className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "..." : "Get Brief"}
        </button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// ADVANCED ANALYTICS
// ─────────────────────────────────────────
function AdvancedAnalytics({ children, isPro }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full border border-white/5 px-6 py-4 flex justify-between items-center hover:border-zinc-600 transition-colors"
      >
        <div className="text-left space-y-0.5">
          <div className="text-sm font-medium text-white">Advanced Analytics</div>
          <div className="text-xs text-zinc-400">
            Correlation · Heatmap · Transition matrix · Timeline · Breadth · Risk events
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {!isPro && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Lock />Some require Pro
            </span>
          )}
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// PRO MODAL 
// ─────────────────────────────────────────
function ProModal({ onClose }) {
  const [billingCycle, setBillingCycle] = useState("annual");
  const [loading,      setLoading]      = useState(false);

  const checkout = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ billing_cycle: billingCycle }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/8 rounded-2xl max-w-md w-full p-8 space-y-6 relative shadow-2xl shadow-black/50">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="space-y-2 pr-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Label>ChainPulse Pro</Label>
          </div>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight">
            Trade with a systematic risk framework
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Survival modeling, hazard rate, and a daily directive — so you always know your exposure.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`py-3 rounded-xl text-sm font-medium border transition-all ${
              billingCycle === "monthly"
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-400 border-white/10 hover:border-white/20"
            }`}
          >
            <div>Monthly</div>
            <div className="text-xs font-normal opacity-70">$39/mo</div>
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`py-3 rounded-xl text-sm font-medium border transition-all relative ${
              billingCycle === "annual"
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-400 border-white/10 hover:border-white/20"
            }`}
          >
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
              SAVE 26%
            </div>
            <div>Annual</div>
            <div className="text-xs font-normal opacity-70">$29/mo · $348/yr</div>
          </button>
        </div>

        {/* Features (short list) */}
        <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-3">
          {[
            { icon: "→", text: "Daily Directive — what to do today" },
            { icon: "→", text: "Exposure % — regime-adjusted sizing" },
            { icon: "→", text: "Survival + Hazard — persistence modeling" },
            { icon: "→", text: "Drawdown + PnL simulation" },
            { icon: "→", text: "Discipline score + mistake replay" },
            { icon: "→", text: "All 7 assets · Real-time alerts" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-zinc-300">
              <span className="text-emerald-400 shrink-0">{icon}</span>
              {text}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={checkout}
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-zinc-100 hover:-translate-y-[1px] transition-all disabled:opacity-50 text-sm shadow-lg"
          >
            {loading
              ? "Redirecting..."
              : billingCycle === "annual"
              ? "Start Pro — $348/year"
              : "Start Pro — $39/month"}
          </button>
          <div className="text-center text-zinc-600 text-xs">
            7-day risk-free evaluation · Cancel anytime · Instant access
          </div>
        </div>

        {/* Trust */}
        <div className="border-t border-white/5 pt-4 text-center">
          <div className="text-xs text-zinc-600">
            For swing traders managing $5,000+
          </div>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────
// LIVE PRICE TICKER
// ─────────────────────────────────────────
function LivePriceTicker({ activeCoin, onCoinSelect }) {
  const [prices,  setPrices]  = useState({});
  const [changes, setChanges] = useState({});
  const [prev,    setPrev]    = useState({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = SUPPORTED_COINS.map((c) => `${c}USDT`);
        const res  = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
        );
        const data = await res.json();
        const p = {}, ch = {};
        data.forEach((item) => {
          const coin = item.symbol.replace("USDT", "");
          p[coin]  = parseFloat(item.lastPrice);
          ch[coin] = parseFloat(item.priceChangePercent);
        });
        setPrev(prices);
        setPrices(p);
        setChanges(ch);
      } catch (err) {
        console.error("Price fetch error:", err);
      }
    };
    fetchPrices();
    const iv = setInterval(fetchPrices, 30_000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (price) => {
    if (!price) return "—";
    if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (price >= 1)    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5 flex-wrap">
      {SUPPORTED_COINS.map((coin) => {
        const price    = prices[coin];
        const change   = changes[coin];
        const isPos    = (change ?? 0) >= 0;
        const isActive = coin === activeCoin;
        const flash    = prev[coin] && price && price !== prev[coin];

        return (
          <button
            key={coin}
            onClick={() => onCoinSelect?.(coin)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shrink-0
              border
              ${isActive
                ? "bg-white/8 border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10"
              }
              ${flash ? "animate-pulse" : ""}
            `}
          >
            <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-300"}`}>
              {coin}
            </span>
            <span className="text-xs text-zinc-400 tabular-nums font-mono">
              ${fmt(price)}
            </span>
            {change !== undefined && (
              <span className={`text-xs font-medium tabular-nums ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                {isPos ? "+" : ""}{change?.toFixed(2)}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// SITE HEADER
// ─────────────────────────────────────────
function SiteHeader({ coin, onCoinSelect, isPro, onUnlock }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      {/* ── Top row: brand + nav + CTA ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14 gap-6">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-6 h-6 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              ChainPulse
            </span>
            <span className="text-xs text-zinc-600 hidden sm:block">Quant</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Home",        href: "/"            },
              { label: "Dashboard",   href: "/app"         },
              { label: "Pricing",     href: "/pricing"     },
              { label: "Methodology", href: "/methodology" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/4"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            {isPro ? (
              <span className="text-xs text-emerald-400 border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 rounded-xl">
                Pro Active
              </span>
            ) : (
              <button
                onClick={onUnlock}
                className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors shadow-sm"
              >
                Go Pro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: coin market pills ── */}
      <div className="border-t border-white/4 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <LivePriceTicker activeCoin={coin} onCoinSelect={onCoinSelect} />
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────
// PRO INTELLIGENCE PREVIEW
// ─────────────────────────────────────────
function ProIntelligencePreview({ onUnlock }) {
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label>Pro Intelligence</Label>
          <h2 className="text-lg font-semibold">
            8 analytics panels locked
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Unlock the full regime intelligence stack
          </p>
        </div>
        <button
          onClick={onUnlock}
          className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-100 hover:-translate-y-[1px] transition-all shrink-0 shadow-sm"
        >
          Unlock Pro — $39/mo
        </button>
      </div>

      {/* Blurred preview */}
      <div className="relative rounded-lg overflow-hidden">
        <div className="blur-md pointer-events-none opacity-40 space-y-3 p-4 bg-white/2 border border-white/5 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            {["Decision Engine", "Survival Curve", "Stress Meter"].map((l) => (
              <div key={l} className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="text-xs text-zinc-500">{l}</div>
                <div className="text-2xl font-semibold text-emerald-400">
                  {l === "Decision Engine" ? "Hold" : l === "Survival Curve" ? "74%" : "32"}
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div className="h-1 rounded-full bg-emerald-500" style={{ width: "74%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Regime Countdown", "PnL Impact", "Drawdown Simulator", "Edge Profile"].map((l) => (
              <div key={l} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-300">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/50 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-sm text-zinc-400">
              Full regime intelligence suite
            </div>
            <ul className="text-xs text-zinc-500 space-y-1.5">
              {[
                "Decision Engine — today's directive",
                "Survival + Hazard modeling",
                "Drawdown + PnL simulation",
                "Discipline score + mistake replay",
                "Edge profile + weekly reports",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 justify-center">
                  <span className="text-emerald-500">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={onUnlock}
              className="mt-2 bg-white text-black px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-[1px] transition-all5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-[1px] transition-all6 py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              Unlock Pro — $39/month
            </button>
            <div className="text-xs text-zinc-700">
              7-day risk-free · Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TODAY PANEL
// ─────────────────────────────────────────
function TodayPanel({ stack, decision, isPro, onUnlock }) {
  if (!stack) return null;
  const execLabel = stack.execution?.label ?? "—";
  const exposure  = stack.exposure   ?? 0;
  const shiftRisk = stack.shift_risk ?? 0;
  const regimeAge = stack.regime_age_hours ?? 0;

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <Label>Today at a glance</Label>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Regime */}
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Regime</div>
          <div className={`text-lg font-semibold ${regimeText(execLabel)}`}>
            {execLabel}
          </div>
          <div className="text-xs text-zinc-600">{regimeAge.toFixed(1)}h active</div>
        </div>

        {/* Exposure */}
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Exposure</div>
          {isPro ? (
            <div className={`text-lg font-semibold tabular-nums ${exposureColor(exposure)}`}>
              {exposure}%
            </div>
          ) : (
            <div className="text-lg font-semibold text-zinc-700 blur-sm select-none">
              00%
            </div>
          )}
          <div className="text-xs text-zinc-600">recommended</div>
        </div>

        {/* Shift Risk */}
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Shift Risk</div>
          {isPro ? (
            <div className={`text-lg font-semibold tabular-nums ${riskColor(shiftRisk)}`}>
              {shiftRisk}%
            </div>
          ) : (
            <div className="text-lg font-semibold text-zinc-700 blur-sm select-none">
              00%
            </div>
          )}
          <div className="text-xs text-zinc-600">deterioration signal</div>
        </div>

        {/* Directive */}
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Directive</div>
          {isPro && decision ? (
            <div className="text-lg font-semibold text-white">
              {decision.directive}
            </div>
          ) : (
            <button
              onClick={onUnlock}
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
            >
              <Lock />Unlock
            </button>
          )}
          <div className="text-xs text-zinc-600">today's action</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MARKET TICKER — was missing, caused crash
// ─────────────────────────────────────────
function MarketTicker() {
  const [prices,  setPrices]  = useState({});
  const [changes, setChanges] = useState({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = SUPPORTED_COINS.map((c) => `${c}USDT`);
        const res  = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
        );
        const data = await res.json();
        const p = {}, ch = {};
        data.forEach((item) => {
          const coin = item.symbol.replace("USDT", "");
          p[coin]  = parseFloat(item.lastPrice);
          ch[coin] = parseFloat(item.priceChangePercent);
        });
        setPrices(p);
        setChanges(ch);
      } catch (err) {
        console.error("MarketTicker fetch error:", err);
      }
    };

    fetchPrices();
    const iv = setInterval(fetchPrices, 30_000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (price) => {
    if (!price) return "—";
    if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (price >= 1)    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  return (
    <div className="flex gap-6 overflow-x-auto scrollbar-hide flex-wrap">
      {SUPPORTED_COINS.map((coin) => {
        const price  = prices[coin];
        const change = changes[coin];
        const isPos  = (change ?? 0) >= 0;

        return (
          <div key={coin} className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-zinc-300">
              {coin}
            </span>
            <span className="text-xs text-zinc-400 tabular-nums font-mono">
              ${fmt(price)}
            </span>
            {change !== undefined && (
              <span className={`text-xs font-medium tabular-nums ${
                isPos ? "text-emerald-400" : "text-red-400"
              }`}>
                {isPos ? "+" : ""}{change?.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })}
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
  const [confidence,   setConfidence]   = useState(null);
  const [volEnv,       setVolEnv]       = useState(null);
  const [transitions,  setTransitions]  = useState(null);
  const [correlation,  setCorrelation]  = useState(null);
  const [riskEvents,   setRiskEvents]   = useState([]);
  const [decision,     setDecision]     = useState(null);
  const [coin,         setCoin]         = useState("BTC");
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [proSuccess,   setProSuccess]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [token,        setToken]        = useState(null);
  const [email,        setEmail]        = useState("");

  // ── Init token + email from URL / localStorage ──
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

    if (urlEmail) {
      setEmail(urlEmail);
    } else {
      const storedEmail = localStorage.getItem("cp_email");
      if (storedEmail) setEmail(storedEmail);
    }

    if (successFlag === "true") setProSuccess(true);
  }, []);
  const safeFetch = async (url, options = {}, fallback = null) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
  console.error("Fetch failed:", url, res.status);
  throw new Error("Fetch failed");
}
      return await res.json();
    } catch {
      return fallback;
    }
  };

  // ── Data fetch ──
  const fetchData = useCallback(async (selectedCoin, currentToken) => {
  try {
    const headers = {};
    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    }

    const res = await fetch(
      `${BACKEND}/dashboard?coin=${selectedCoin}`,
      { headers }
    );

    if (!res.ok) {
      console.error("Dashboard fetch failed:", res.status);
      throw new Error("Fetch failed");
    }

    const data = await res.json();

    setStack(data.stack || null);
    setLatest(data.latest || null);
    setCurveData(data.curve || []);
    setHistoryData(data.history || []);
    setOverview(data.overview || []);
    setBreadth(data.breadth || null);
    setConfidence(data.confidence || null);
    setVolEnv(data.volEnv || null);
    setTransitions(data.transitions || null);
    setCorrelation(data.correlation || null);
    setRiskEvents(data.events || []);

    setLastUpdated(new Date());

  } catch (err) {
    console.error("Dashboard fetch error:", err);
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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-zinc-400">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        <div className="text-sm">Initialising Regime Model...</div>
      </div>
    );
  }

  // ── No data state ──
  if (!stack || stack.message) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-gray-400">
        <div className="text-center space-y-3">
          <div>No regime data available yet.</div>
          <div className="text-sm text-zinc-500">
            Model is initialising. Run /update-all to seed data.
          </div>
        </div>
      </div>
    );
  }

  // ── Derived state ──
  const isPro       = !stack.pro_required;
  const exposure    = stack.exposure          ?? 0;
  const shiftRisk   = stack.shift_risk        ?? 0;
  const alignment   = stack.alignment         ?? 0;
  const direction   = stack.direction         ?? "mixed";
  const regimeAge   = stack.regime_age_hours  ?? 0;
  const maturity    = stack.trend_maturity    ?? null;
  const survival    = stack.survival          ?? null;
  const hazard      = stack.hazard            ?? null;
  const percentile  = stack.percentile        ?? null;
  const execLabel   = stack.execution?.label  ?? null;
  const avgDuration = stack.avg_regime_duration_hours ?? 48;

  const maturityLabel =
    maturity > 75 ? "Overextended" :
    maturity > 50 ? "Late Phase"   :
    maturity > 25 ? "Mid Phase"    : "Early Phase";

  return (
    <main className="min-h-screen bg-black text-white">
      {showModal && <ProModal onClose={() => setShowModal(false)} />}
{/* Bottom row: ticker */}
<div className="border-t border-white/5 bg-zinc-950/30 backdrop-blur-md">
  <div className="max-w-7xl mx-auto px-6 py-3">
    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2">
      <LivePriceTicker
  activeCoin={coin}
  onCoinSelect={setCoin}
/>
    </div>
  </div>
</div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* ── Pro success banner ── */}
        {proSuccess && (
          <div className="border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 px-5 py-3.5 rounded-lg text-sm flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            Pro access activated. Welcome to ChainPulse.
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-1.5">
              ChainPulse
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Regime Intelligence System
            </h1>
            {lastUpdated && (
              <div className="text-xs text-zinc-600 mt-1 tabular-nums">
                Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 60s
              </div>
            )}
          </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
            {[
              { label: "Data", value: "Binance" },
              { label: "Refresh", value: "Hourly" },
              { label: "Assets", value: "7 tracked" },
              { label: "Model", value: "Survival + Hazard" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white/2 border border-white/5 rounded-xl px-3 py-1.5 flex items-center gap-2"
              >
                <span className="text-zinc-600">{label}:</span>
                <span className="text-zinc-300 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TODAY'S VERDICT ── */}
        <TodaysVerdict
          stack={stack}
          decision={decision}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />
        
         {/* ── TODAY PANEL ── */}
        <TodayPanel
          stack={stack}
          decision={decision}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />


        {/* ── Free tier banner ── */}
        {!isPro && (
          <FreeTierBanner onUnlock={() => setShowModal(true)} />
        )}

        {/* ── Shift risk alert ── */}
        <ShiftRiskAlert
          shiftRisk={shiftRisk}
          coin={coin}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── HERO GRID ── */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Exposure hero */}
          <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 text-center space-y-3 flex flex-col justify-center">
            <Label>Exposure Recommendation</Label>
            {isPro ? (
              <>
                <div className={`text-7xl font-semibold ${exposureColor(exposure)}`}>
                  {exposure}%
                </div>
                <div className="text-xs text-zinc-400">
                  {alignment >= 80 ? "High conviction"      :
                   alignment >= 50 ? "Moderate conviction"  : "Low conviction"}
                </div>
                <Bar
                  value={exposure}
                  cls={
                    exposure > 60 ? "bg-emerald-500" :
                    exposure > 35 ? "bg-yellow-500"  : "bg-red-500"
                  }
                />
              </>
            ) : (
              <>
                <div
                  className="text-7xl font-semibold text-zinc-700 blur-sm select-none cursor-pointer"
                  onClick={() => setShowModal(true)}
                >
                  00%
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1 justify-center"
                >
                  <Lock />Unlock exposure — Pro
                </button>
                <Bar value={50} cls="bg-zinc-700" />
              </>
            )}
          </div>

          {/* Regime context */}
          <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl p-8 space-y-5 md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <Label>Current Regime</Label>
                <div className={`text-2xl font-semibold ${regimeText(execLabel)}`}>
                  {execLabel ?? "—"}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Execution (1H) · Active {regimeAge.toFixed(1)}h
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${dirBadge(direction)}`}>
                {direction === "bullish" ? "↑ Bullish" :
                 direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
              </span>
            </div>

            {/* Timeframe stack mini */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Macro (1D)",     data: stack.macro     },
                { label: "Trend (4H)",     data: stack.trend     },
                { label: "Execution (1H)", data: stack.execution },
              ].map(({ label, data }) => (
                <div
                  key={label}
                  className={`border p-3 rounded-sm text-center ${
                    data ? regimeBorder(data.label) : "border-white/5"
                  }`}
                >
                  <div className="text-xs text-zinc-400 mb-1">{label}</div>
                  <div className={`text-xs font-semibold ${data ? regimeText(data.label) : "text-zinc-500"}`}>
                    {data?.label ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Alignment bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Timeframe Alignment</span>
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
              <div className="text-xs text-zinc-500">
                {alignment >= 80 ? "All timeframes agree — high conviction"     :
                 alignment >= 50 ? "Partial alignment — moderate conviction"    :
                                   "Conflicting timeframes — reduce position size"}
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Survival Probability"
            value={isPro ? survival : null}
            color={isPro ? riskColor(100 - (survival || 0)) : ""}
            barCls={isPro ? (survival > 60 ? "bg-green-500" : survival > 40 ? "bg-yellow-500" : "bg-red-500") : ""}
            hint="Probability current regime continues"
            locked={!isPro}
            consequence="Survival probability quantifies regime decay risk."
            onUnlock={() => setShowModal(true)}
          />
          <StatCard
            label="Regime Shift Risk"
            value={isPro ? shiftRisk : null}
            color={isPro ? riskColor(shiftRisk) : ""}
            barCls={isPro ? (shiftRisk > 70 ? "bg-red-500" : shiftRisk > 45 ? "bg-yellow-500" : "bg-green-500") : ""}
            hint="Composite deterioration signal"
            locked={!isPro}
            consequence="Shift risk identifies breakdown probability before price moves."
            onUnlock={() => setShowModal(true)}
          />
          <StatCard
            label="Hazard Rate"
            value={isPro ? hazard : null}
            color={isPro ? riskColor(hazard || 0) : ""}
            barCls={isPro ? (hazard > 70 ? "bg-red-500" : hazard > 45 ? "bg-yellow-500" : "bg-green-500") : ""}
            hint="Failure risk vs historical norm"
            locked={!isPro}
            consequence="Hazard rate measures how fragile this regime is vs history."
            onUnlock={() => setShowModal(true)}
          />
          <StatCard
            label="Macro Coherence"
            value={isPro ? stack.macro_coherence?.toFixed(1) : null}
            color={isPro ? ((stack.macro_coherence || 0) > 60 ? "text-emerald-400" : "text-yellow-400") : ""}
            barCls={isPro ? ((stack.macro_coherence || 0) > 60 ? "bg-emerald-500" : "bg-yellow-500") : ""}
            hint="1D timeframe signal strength"
            locked={!isPro}
            consequence="Coherence measures whether the signal is strong or noisy."
            onUnlock={() => setShowModal(true)}
          />
          <StatCard
            label="Strength Percentile"
            value={isPro ? percentile : null}
            color="text-blue-400"
            barCls="bg-blue-500"
            hint="Relative to historical scores"
            locked={!isPro}
            consequence="Percentile rank shows how extreme the current regime is historically."
            onUnlock={() => setShowModal(true)}
          />
          <StatCard
            label="Execution Score"
            value={stack.execution?.score?.toFixed(1) ?? "—"}
            suffix=""
            color={regimeText(execLabel)}
            hint="Raw 1H momentum-vol composite"
            locked={false}
          />
        </div>

        {/* ── PORTFOLIO HEALTH SCORE ── */}
        <PortfolioHealthScore
          stack={stack}
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── DECISION ENGINE ── */}
        <DecisionEnginePanel
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
          onDecisionLoaded={setDecision}
        />

        {/* ── CONSEQUENCE SIMULATOR ── */}
        <IfNothingPanel
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── PNL IMPACT ESTIMATOR ── */}
        <PnLImpactEstimator
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── DRAWDOWN SIMULATOR ── */}
        <DrawdownSimulator
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── PRO INTELLIGENCE PREVIEW (free users only) ── */}
        {!isPro && (
          <ProIntelligencePreview onUnlock={() => setShowModal(true)} />
        )}

        {/* ── STRESS + COUNTDOWN ── */}
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

        {/* ── QUALITY + CONFIDENCE TREND ── */}
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

        {/* ── PLAYBOOK ── */}
        <RegimePlaybook
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── EXPOSURE TRACKER ── */}
        <ExposureTracker
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── RISK PROFILE ── */}
        <RiskProfilePanel
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
          onProfileSaved={(profile) => console.log("Profile saved:", profile)}
        />

        {/* ── EXPOSURE LOGGER ── */}
        <ExposureLogger
          stack={stack}
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── STREAK TRACKER ── */}
        <StreakTracker
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── DISCIPLINE SCORE ── */}
        <DisciplinePanel
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── MISTAKE REPLAY ── */}
        <MistakeReplayPanel
          email={email}
          coin={coin}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── PERFORMANCE COMPARISON ── */}
        <PerformancePanel
          email={email}
          coin={coin}
          token={token}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── EDGE PROFILE ── */}
        <EdgeProfilePanel
          email={email}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── WEEKLY REPORT ── */}
        <WeeklyReportPanel
          email={email}
          coin={coin}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── REGIME STACK DETAIL ── */}
        <RegimeStackCard
          stack={stack}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── CONFIDENCE PANEL ── */}
        <ConfidencePanel
          confidence={confidence}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── REGIME MATURITY ── */}
        <RegimeMaturity
          regimeAge={regimeAge}
          avgDuration={avgDuration}
          maturityLabel={maturityLabel}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── VOL ENVIRONMENT ── */}
        <VolEnvironment
          env={volEnv}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── SURVIVAL CURVE ── */}
        <SurvivalCurve
          curve={curveData}
          regimeAge={regimeAge}
          isPro={isPro}
          onUnlock={() => setShowModal(true)}
        />

        {/* ── SIGNAL INTERPRETATION ── */}
        <InterpretationPanel
          stack={stack}
          latest={latest}
          isPro={isPro}
        />

        {/* ── EMAIL CAPTURE ── */}
        {!email && (
          <EmailCapture onEmailSet={setEmail} />
        )}

        {/* ── ADVANCED ANALYTICS — collapsed ── */}
        <AdvancedAnalytics isPro={isPro}>
          <TransitionMatrix
            transitions={transitions}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
          <RegimeHeatmap
            overview={overview}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
          <CorrelationPanel
            correlation={correlation}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
          <PortfolioAllocator
            stack={stack}
            isPro={isPro}
            onUnlock={() => setShowModal(true)}
          />
          <BreadthPanel breadth={breadth} />
          <RegimeMap
            overview={overview}
            activeCoin={coin}
            onSelect={setCoin}
          />
          <RegimeTimeline
            history={historyData}
            coin={coin}
          />
          <RiskEvents events={riskEvents} />
        </AdvancedAnalytics>

        {/* ── PRO UPSELL FOOTER ── */}
        {!isPro && (
          <div
            className="border border-zinc-700 p-10 text-center space-y-6 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => setShowModal(true)}
          >
            <div>
              <Label>ChainPulse Pro</Label>
              <h3 className="text-2xl font-semibold mt-2">
                Avoid one late-cycle breakdown.
That alone pays for this.
              </h3>
              <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed mt-3">
                Exposure modeling, survival analysis, hazard rate, decision engine,
                discipline tracking, drawdown simulation, PnL impact estimation,
                and real-time alerts. Everything you need to trade with a
                systematic risk framework.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              {[
                { icon: "→", label: "Daily Directive",      desc: "Decision engine tells you what to do"  },
                { icon: "→", label: "Survival Modeling",    desc: "Quantify regime decay probability"      },
                { icon: "→", label: "Discipline Score",     desc: "Track protocol adherence over time"     },
                { icon: "→", label: "Drawdown Simulation",  desc: "Model loss at any price decline"        },
                { icon: "→", label: "PnL Impact Estimator", desc: "Expected value of your exposure"        },
                { icon: "→", label: "Edge Profile",         desc: "Your best and worst regime types"       },
                { icon: "→", label: "Regime Playbook",      desc: "Protocol for current conditions"        },
                { icon: "→", label: "Real-time Alerts",     desc: "Shift alerts direct to your inbox"      },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1 text-left">
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <span className="text-emerald-400">{icon}</span>
                    {label}
                  </div>
                  <div className="text-xs text-zinc-500">{desc}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-center gap-6 text-sm">
                <div className="border border-zinc-700 px-5 py-3 space-y-0.5">
                  <div className="text-white font-semibold">$39 / month</div>
                  <div className="text-xs text-zinc-500">Billed monthly</div>
                </div>
                <div className="border border-zinc-500 px-5 py-3 space-y-0.5 relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                    Save 26%
                  </div>
                  <div className="text-white font-semibold">$29 / month</div>
                  <div className="text-xs text-zinc-500">Billed annually — $348</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-10 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm"
                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              >
                Start Using Full Regime Intelligence
              </button>
              <div className="text-zinc-500 text-xs">
                7-day risk-free evaluation · Cancel anytime · Instant access
              </div>
              <div className="text-gray-700 text-xs">
                For swing traders managing $5,000+
              </div>
            </div>
          </div>
        )}

        {/* ── PRO FOOTER — logged in ── */}
        {isPro && (
          <div className="border border-white/5 px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">ChainPulse Pro</div>
              <div className="text-sm text-gray-400">
                Full regime intelligence active · All signals live
              </div>
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span>Auto-refresh: 60s</span>
              <span>·</span>
              <span>7 assets tracked</span>
              <span>·</span>
              <span>3 timeframes</span>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
          