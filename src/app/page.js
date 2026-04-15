"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

function getRegimeColor(label) {
  if (!label) return "text-zinc-400";
  if (label.includes("Strong Risk-On")) return "text-emerald-400";
  if (label.includes("Risk-On")) return "text-green-400";
  if (label.includes("Strong Risk-Off")) return "text-red-500";
  if (label.includes("Risk-Off")) return "text-red-400";
  return "text-yellow-400";
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND}/latest?coin=BTC`).then((r) => r.json()),
      fetch(`${BACKEND}/statistics?coin=BTC`).then((r) => r.json()),
    ])
      .then(([latest, stats]) => {
        if (latest && !latest.message && stats && !stats.message) {
          setLiveData({ latest, stats });
        }
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    try {
      await fetch(`${BACKEND}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
    } catch {
      setEmailError("Something went wrong. Please try again.");
    }
  };

  const label = liveData?.latest?.label;
  const shiftRisk = liveData?.stats?.regime_shift_risk_percent;
  const coherence = liveData?.latest?.coherence;

  return (
    <main className="min-h-screen text-white overflow-x-hidden relative" style={{ backgroundColor: "#080809" }}>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">

        {/* Grid pattern background */}
        <div
          className="absolute inset-0 bg-grid-pattern"
          style={{
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />

        {/* Primary emerald glow — top center */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1000px",
            height: "600px",
            background: "radial-gradient(ellipse at center, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Blue secondary glow — top right */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "5%",
            right: "-10%",
            width: "600px",
            height: "500px",
            background: "radial-gradient(ellipse at center, rgba(59,130,246,0.10) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />

        {/* Red ambient — bottom left for regime tension */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "0%",
            left: "-5%",
            width: "500px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center space-y-8 z-10">
          <div className="inline-flex items-center gap-2.5 border border-white/8 rounded-full px-4 py-1.5 text-xs text-zinc-500 uppercase tracking-widest backdrop-blur-sm" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Regime Intelligence · Not Price Prediction
          </div>

          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-semibold leading-none"
            style={{ letterSpacing: "-0.03em" }}
          >
            Allocate capital<br />
            <span style={{ color: "#52525b" }}>with precision.</span>
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-light">
            ChainPulse models regime persistence, hazard rates, and survival probability
            so swing traders know exactly how much capital to deploy — and when to stand down.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-black transition-all hover:-translate-y-[1px] hover:shadow-2xl"
              style={{
                backgroundColor: "#10b981",
                boxShadow: "0 0 30px rgba(16,185,129,0.3)",
              }}
            >
              View Live Regime
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-medium text-zinc-400 border border-white/8 hover:border-white/15 hover:text-white transition-all backdrop-blur-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              Read Methodology
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 text-xs text-zinc-700 pt-2">
            {["Live Binance data", "Survival modeling", "7 assets tracked", "No price prediction"].map((t) => (
              <span key={t} className="hidden sm:block">{t}</span>
            ))}
          </div>
        </div>

        {/* Hero mockup */}
        <div className="relative w-full max-w-5xl mx-auto mt-16 z-10">
          <div
            className="rounded-2xl overflow-hidden border border-white/6"
            style={{
              backgroundColor: "#0d0d0e",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 120px rgba(0,0,0,0.9), 0 0 100px rgba(16,185,129,0.08)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5" style={{ backgroundColor: "#111113" }}>
              <div className="flex gap-1.5">
                {["#3f3f46","#3f3f46","#3f3f46"].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex-1 flex justify-center">
                <div className="text-[10px] text-zinc-600 border border-white/5 rounded-md px-3 py-0.5 backdrop-blur-sm">
                  chainpulse.pro/app
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Ticker */}
              <div className="flex gap-2 overflow-hidden">
                {[
                  { coin: "BTC", price: "$71,840", change: "+1.34%", pos: true },
                  { coin: "ETH", price: "$2,207", change: "+1.07%", pos: true },
                  { coin: "SOL", price: "$82.46", change: "+1.08%", pos: true },
                  { coin: "BNB", price: "$601.30", change: "+1.67%", pos: true },
                  { coin: "AVAX", price: "$9.19", change: "+2.34%", pos: true },
                  { coin: "LINK", price: "$8.81", change: "+1.03%", pos: true },
                ].map(({ coin, price, change, pos }) => (
                  <div key={coin} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <span className="text-xs font-semibold text-white">{coin}</span>
                    <span className="text-xs text-zinc-500 font-mono">{price}</span>
                    <span className={`text-xs font-medium ${pos ? "text-emerald-400" : "text-red-400"}`}>{change}</span>
                  </div>
                ))}
              </div>

              {/* Regime bar */}
              <div className="rounded-xl border border-red-900/40 p-5" style={{ background: "linear-gradient(to right, rgba(239,68,68,0.08), transparent)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Current Regime</div>
                    <div className="text-3xl font-bold text-red-400 tracking-tight">Strong Risk-Off</div>
                    <div className="text-xs text-zinc-600">0.0h active · 100% aligned</div>
                  </div>
                  <div className="flex gap-4">
                    {[
                      { label: "Exposure", value: "5%", color: "text-red-400" },
                      { label: "Shift Risk", value: "71.6%", color: "text-red-400" },
                      { label: "Hazard", value: "68%", color: "text-orange-400" },
                      { label: "Survival", value: "34%", color: "text-yellow-400" },
                    ].map(({ label: l, value, color }) => (
                      <div key={l} className="text-center space-y-1">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{l}</div>
                        <div className={`text-lg font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Directive</div>
                    <div className="text-base font-bold text-red-400">DEFENSIVE</div>
                    <div className="text-xs text-zinc-600">Score: 18/100</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {[
                    { label: "Macro (1D)", regime: "Strong Risk-Off", cls: "border-red-800/60 bg-red-950/30 text-red-400" },
                    { label: "Trend (4H)", regime: "Strong Risk-Off", cls: "border-red-800/60 bg-red-950/30 text-red-400" },
                    { label: "Execution (1H)", regime: "Risk-Off", cls: "border-red-900/40 bg-red-950/20 text-red-400" },
                  ].map(({ label: l, regime, cls }) => (
                    <div key={l} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${cls}`}>
                      <span className="text-zinc-500">{l}</span>
                      <span className="font-medium">{regime}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { label: "Survival", value: "34%", color: "text-yellow-400" },
                  { label: "Shift Risk", value: "71.6%", color: "text-red-400" },
                  { label: "Hazard", value: "68%", color: "text-orange-400" },
                  { label: "Coherence", value: "83%", color: "text-emerald-400" },
                  { label: "Percentile", value: "91st", color: "text-blue-400" },
                  { label: "Exec Score", value: "−21.7", color: "text-red-400" },
                ].map(({ label: l, value, color }) => (
                  <div key={l} className="rounded-lg p-3 space-y-1 border border-white/5" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{l}</div>
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Screenshot bottom glow */}
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative px-6 py-28 overflow-hidden">
        {/* Background treatment */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.03) 50%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0 bg-dot-pattern"
          style={{
            maskImage: "radial-gradient(ellipse 60% 80% at 50% 50%, black 20%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 80% at 50% 50%, black 20%, transparent 100%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto space-y-16 z-10">
          <div className="text-center space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Framework</div>
            <h2 className="text-4xl font-semibold tracking-tight">From data to directive</h2>
            <p className="text-zinc-500 text-sm max-w-lg mx-auto leading-relaxed">
              Four analytical layers. One systematic output.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-px overflow-hidden rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {[
              { n: "01", title: "Regime Classification", desc: "Multi-timeframe momentum and volatility scoring classifies market state across macro, trend, and execution layers.", accent: "rgba(16,185,129,0.08)" },
              { n: "02", title: "Coherence Measurement", desc: "Alignment across timeframes distinguishes high-conviction regimes from transitional noise.", accent: "rgba(59,130,246,0.06)" },
              { n: "03", title: "Survival Modeling", desc: "Historical regime durations generate conditional persistence probabilities.", accent: "rgba(168,85,247,0.06)" },
              { n: "04", title: "Exposure Output", desc: "A single allocation recommendation calibrated to strength, persistence, hazard rate, and alignment.", accent: "rgba(245,158,11,0.06)" },
            ].map(({ n, title, desc, accent }) => (
              <div key={n} className="p-8 space-y-4 transition-colors hover:brightness-110" style={{ backgroundColor: "#080809" }}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono text-zinc-600 border border-white/5"
                  style={{ backgroundColor: accent }}
                >
                  {n}
                </div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <p className="text-xs text-zinc-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE SNAPSHOT ── */}
      <section className="relative px-6 py-20 overflow-hidden">
        {/* Centered glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(16,185,129,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto space-y-6 z-10">
          <div className="text-center space-y-2">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Live</div>
            <h2 className="text-3xl font-semibold tracking-tight">Current BTC regime state</h2>
          </div>

          <div
            className="rounded-2xl border p-8"
            style={{
              backgroundColor: "#0f0f10",
              borderColor: label?.includes("Risk-Off")
                ? "rgba(239,68,68,0.2)"
                : label?.includes("Risk-On")
                ? "rgba(16,185,129,0.2)"
                : "rgba(255,255,255,0.06)",
              boxShadow: label?.includes("Risk-Off")
                ? "0 0 60px rgba(239,68,68,0.06)"
                : label?.includes("Risk-On")
                ? "0 0 60px rgba(16,185,129,0.08)"
                : "none",
            }}
          >
            {liveData ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Execution Regime</div>
                    <div className={`text-4xl font-bold tracking-tight ${getRegimeColor(label)}`}>{label}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 border border-white/5 px-3 py-1.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Shift Risk", value: shiftRisk != null ? `${shiftRisk}%` : "—", color: shiftRisk > 70 ? "text-red-400" : shiftRisk > 45 ? "text-yellow-400" : "text-emerald-400", hint: "Deterioration probability" },
                    { label: "Coherence", value: typeof coherence === "number" ? `${coherence.toFixed(1)}%` : "—", color: "text-white", hint: "Signal alignment" },
                    { label: "Regime", value: label ?? "—", color: getRegimeColor(label), hint: "Current classification" },
                  ].map(({ label: l, value, color, hint }) => (
                    <div key={l} className="space-y-1">
                      <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{l}</div>
                      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                      <div className="text-[10px] text-zinc-700">{hint}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="text-xs text-zinc-700">Exposure recommendation and directive available in dashboard</div>
                  <Link href="/app" className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                    Open dashboard
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
                  <div className="text-sm text-zinc-600">Connecting to regime model...</div>
                </div>
                <div className="space-y-2">
                  {[80, 55, 70].map((w, i) => (
                    <div key={i} className="h-3 rounded skeleton-shimmer" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="relative px-6 py-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.03) 50%, transparent 100%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto space-y-12 z-10">
          <div className="text-center space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Who it's for</div>
            <h2 className="text-4xl font-semibold tracking-tight">Built for traders managing real capital</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: "↗",
                title: "Swing traders",
                desc: "Holding positions 2–30 days. Need to know when to press size and when to stand down.",
                glow: "rgba(16,185,129,0.08)",
              },
              {
                icon: "⊕",
                title: "Active allocators",
                desc: "Managing $25k–$500k+ across multiple assets. Want a systematic exposure framework.",
                glow: "rgba(59,130,246,0.06)",
              },
              {
                icon: "◎",
                title: "Risk-conscious operators",
                desc: "Traders who have experienced late-stage overexposure and want a statistical system.",
                glow: "rgba(168,85,247,0.06)",
              },
            ].map(({ icon, title, desc, glow }) => (
              <div
                key={title}
                className="p-7 rounded-2xl border border-white/5 space-y-4 hover:border-white/10 transition-colors relative overflow-hidden"
                style={{ backgroundColor: "#0f0f10" }}
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
                    transform: "translate(30%, -30%)",
                  }}
                />
                <div className="text-xl text-zinc-500 font-mono relative z-10">{icon}</div>
                <div className="text-sm font-semibold text-white relative z-10">{title}</div>
                <p className="text-xs text-zinc-600 leading-relaxed relative z-10">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT IT MEASURES ── */}
      <section className="relative px-6 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.04) 30%, rgba(16,185,129,0.04) 70%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 100%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto space-y-12 z-10">
          <div className="space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Core signals</div>
            <h2 className="text-4xl font-semibold tracking-tight">Everything the model measures</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: "Exposure allocation", desc: "How much capital belongs in this regime state" },
              { label: "Hazard rate", desc: "Instantaneous regime failure risk vs historical baseline" },
              { label: "Survival probability", desc: "Conditional persistence given current regime age" },
              { label: "Regime alignment", desc: "Coherence across macro, trend, and execution timeframes" },
              { label: "Shift risk", desc: "Composite deterioration signal across all leading indicators" },
              { label: "Regime maturity", desc: "Early / Mid / Late / Overextended lifecycle position" },
              { label: "Kelly-optimal sizing", desc: "Mathematically optimal position size for your edge" },
              { label: "Monte Carlo risk", desc: "Forward distribution of outcomes across 10,000 simulated paths" },
              { label: "Structural instability", desc: "Internal damage signals that precede visible breakdown" },
              { label: "Behavioral discipline", desc: "Systematic tracking of deviation from model recommendations" },
              { label: "Alpha drag", desc: "Estimated return cost of behavioral leaks vs model adherence" },
              { label: "Transition probability", desc: "Statistical likelihood of movement to each adjacent regime" },
            ].map(({ label: l, desc }) => (
              <div
                key={l}
                className="flex items-start gap-4 p-5 rounded-xl border border-white/5 hover:border-emerald-500/15 transition-colors group"
                style={{ backgroundColor: "#0f0f10" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 mt-1.5 shrink-0 group-hover:bg-emerald-400 transition-colors" />
                <div>
                  <div className="text-sm font-medium text-white">{l}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING BRIDGE ── */}
      <section className="relative px-6 py-24 overflow-hidden">
        {/* Diagonal gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.04) 0%, transparent 40%, rgba(168,85,247,0.04) 100%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto space-y-10 z-10">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              One avoided drawdown pays for years of Essential
            </h2>
            <p className="text-zinc-500 text-sm max-w-xl mx-auto leading-relaxed">
              For traders managing $5,000+, a single avoided 3% over-exposure event
              saves $150 — more than four months of Essential at $29/month billed annually.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { tier: "Free", price: "$0", identity: "Regime Awareness", tagline: "You know what's happening.", color: "text-zinc-400", border: "border-white/6", bg: "rgba(255,255,255,0.01)", glow: "none" },
              { tier: "Essential", price: "$29", identity: "Exposure Control", tagline: "You know what to do.", color: "text-blue-400", border: "border-blue-500/20", bg: "rgba(59,130,246,0.04)", glow: "0 0 40px rgba(59,130,246,0.08)" },
              { tier: "Pro", price: "$59", identity: "Strategic Edge", tagline: "You know before others.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "rgba(16,185,129,0.06)", glow: "0 0 40px rgba(16,185,129,0.12)", badge: "Popular", badgeColor: "#10b981" },
              { tier: "Institutional", price: "$119", identity: "Infrastructure Layer", tagline: "You run the system.", color: "text-purple-400", border: "border-purple-500/20", bg: "rgba(168,85,247,0.04)", glow: "0 0 40px rgba(168,85,247,0.08)" },
            ].map(({ tier, price, identity, tagline, color, border, bg, glow, badge, badgeColor }) => (
              <div
                key={tier}
                className={`relative rounded-2xl border ${border} p-5 space-y-3`}
                style={{ backgroundColor: bg, boxShadow: glow }}
              >
                {badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-black whitespace-nowrap z-10"
                    style={{ backgroundColor: badgeColor, boxShadow: `0 0 20px ${badgeColor}60` }}
                  >
                    {badge}
                  </div>
                )}
                <div className={`text-[10px] uppercase tracking-widest font-semibold ${color}`}>{tier}</div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-white tracking-tight">{price}</span>
                  <span className="text-zinc-600 text-xs pb-1">/mo</span>
                </div>
                <div>
                  <div className={`text-xs font-semibold ${color}`}>{identity}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{tagline}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-zinc-700">Annual billing · 7-day free trial · Cancel anytime</div>
            <Link
              href="/pricing"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors border border-white/8 px-5 py-2.5 rounded-xl hover:border-white/15"
              style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              View all plans
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ── */}
      <section className="relative px-6 py-24 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(16,185,129,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-lg mx-auto text-center space-y-6 z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Daily regime brief</h2>
            <p className="text-zinc-600 text-sm">Current regime state, shift risk, and directive — every morning. Free.</p>
          </div>

          {!subscribed ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-700 border border-white/8 focus:outline-none focus:border-emerald-500/40 transition-colors"
                  style={{ backgroundColor: "#111113" }}
                />
                <button
                  onClick={handleSubscribe}
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-black transition-all hover:-translate-y-[1px] hover:shadow-lg"
                  style={{ backgroundColor: "#10b981", boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}
                >
                  Subscribe
                </button>
              </div>
              {emailError && <div className="text-xs text-red-400">{emailError}</div>}
              <div className="text-[10px] text-zinc-700">No spam. Unsubscribe anytime.</div>
            </div>
          ) : (
            <div className="border border-emerald-900/40 rounded-xl px-6 py-4 text-emerald-400 text-sm" style={{ backgroundColor: "rgba(16,185,129,0.06)" }}>
              ✓ Subscribed. Check your inbox to confirm.
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative px-6 py-10 border-t border-white/4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">ChainPulse</span>
          </div>
          <div className="flex gap-6 text-xs text-zinc-700">
            <Link href="/app" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Pricing</Link>
            <Link href="/methodology" className="hover:text-zinc-400 transition-colors">Methodology</Link>
          </div>
          <div className="text-[10px] text-zinc-800">Not financial advice. Manage your own risk.</div>
        </div>
      </footer>
    </main>
  );
}
