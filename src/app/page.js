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

function getRegimeBg(label) {
  if (!label) return "border-white/5 bg-white/2";
  if (label.includes("Strong Risk-On")) return "border-emerald-800/50 bg-emerald-950/30";
  if (label.includes("Risk-On")) return "border-green-800/40 bg-green-950/20";
  if (label.includes("Strong Risk-Off")) return "border-red-800/50 bg-red-950/30";
  if (label.includes("Risk-Off")) return "border-red-900/40 bg-red-950/20";
  return "border-yellow-900/40 bg-yellow-950/20";
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [emailError, setEmailError] = useState("");

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
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative px-6 pt-20 pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          {/* Label */}
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-1.5 rounded-full text-xs text-zinc-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Regime-Based Exposure Intelligence
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Know when to press.<br />
            <span className="text-zinc-500">Know when to stand down.</span>
          </h1>

          {/* Sub */}
          <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Statistical survival modeling for crypto swing traders. Quantify regime persistence, shift probability, and optimal exposure — in real time.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/app"
              className="bg-white text-black px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-all hover:-translate-y-[1px] hover:shadow-xl hover:shadow-white/10"
            >
              View Live Regime →
            </Link>
            <Link
              href="/methodology"
              className="border border-white/10 bg-white/5 px-8 py-3.5 rounded-xl text-zinc-300 text-sm font-medium hover:bg-white/8 hover:border-white/15 transition-all"
            >
              Read Methodology
            </Link>
          </div>

          {/* Trust line */}
          <div className="text-xs text-zinc-700 pt-2">
            Live Binance data · Survival modeling · No financial advice
          </div>
        </div>
      </section>

      {/* ── LIVE SNAPSHOT ── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className={`border rounded-2xl p-8 transition-all duration-700 ${getRegimeBg(label)}`}>
            {liveData ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Live BTC Regime</div>
                    <div className={`text-4xl font-bold tracking-tight ${getRegimeColor(label)}`}>{label}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 border border-white/5 bg-black/20 px-3 py-1.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Shift Risk",
                      value: shiftRisk != null ? `${shiftRisk}%` : "—",
                      color: shiftRisk > 70 ? "text-red-400" : shiftRisk > 45 ? "text-yellow-400" : "text-emerald-400",
                      hint: "Deterioration probability",
                    },
                    {
                      label: "Coherence",
                      value: typeof coherence === "number" ? `${coherence.toFixed(1)}%` : "—",
                      color: "text-white",
                      hint: "Signal strength",
                    },
                    {
                      label: "Regime",
                      value: label ?? "—",
                      color: getRegimeColor(label),
                      hint: "Current state",
                    },
                  ].map(({ label: l, value, color, hint }) => (
                    <div key={l} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{l}</div>
                      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                      <div className="text-[10px] text-zinc-600">{hint}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-600">Exposure modeling + full analytics available in dashboard</div>
                  <Link href="/app" className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                    Open dashboard →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                  <div className="text-sm text-zinc-500">Connecting to regime model...</div>
                </div>
                <div className="space-y-2">
                  {[80, 60, 70].map((w, i) => (
                    <div key={i} className="h-3 bg-zinc-900 rounded animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">How it works</div>
            <h2 className="text-3xl font-semibold tracking-tight">From raw data to regime directive</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                n: "01",
                title: "Regime Classification",
                desc: "Multi-timeframe momentum and volatility scoring classifies market state in real time across macro, trend, and execution layers.",
              },
              {
                n: "02",
                title: "Coherence Measurement",
                desc: "Directional alignment across timeframes distinguishes strong trends from transitional noise. High coherence = high conviction.",
              },
              {
                n: "03",
                title: "Survival Modeling",
                desc: "Historical regime durations generate conditional survival probabilities. How much statistical life remains in this trend?",
              },
              {
                n: "04",
                title: "Deployment Output",
                desc: "A single allocation recommendation calibrated to regime strength, persistence, hazard rate, and alignment.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="border border-white/5 bg-white/[0.015] rounded-2xl p-6 space-y-3 hover:border-white/10 transition-colors">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">{n}</div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Who it's for</div>
            <h2 className="text-3xl font-semibold tracking-tight">Built for traders managing real capital</h2>
            <p className="text-zinc-500 text-sm max-w-xl mx-auto leading-relaxed">
              ChainPulse is built for crypto swing traders managing $5,000 to $250,000+. If you are allocating real capital and making sizing decisions, this is your framework.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: "📊",
                title: "Swing traders",
                desc: "Holding positions for 2–30 days who need to know when to press size and when to stand down.",
              },
              {
                icon: "⚖️",
                title: "Active allocators",
                desc: "Managing a crypto portfolio across multiple assets who want a systematic exposure framework.",
              },
              {
                icon: "🛡️",
                title: "Risk-conscious operators",
                desc: "Traders who have experienced late-stage overexposure and want a statistical system to prevent recurrence.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="border border-white/5 bg-white/[0.015] rounded-2xl p-6 space-y-3 hover:border-white/10 transition-colors">
                <div className="text-2xl">{icon}</div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEMS ── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">Most traders increase risk at the wrong time</h2>
            <p className="text-zinc-500 text-sm max-w-xl mx-auto">ChainPulse quantifies regime persistence so deployment is calibrated to probability — not emotion.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                label: "Late-Stage Overexposure",
                desc: "Sizing up when momentum is mature and deterioration is already statistically underway.",
                color: "text-red-400",
                border: "border-red-900/30",
              },
              {
                label: "Early Exit Bias",
                desc: "Reducing exposure in regimes that remain statistically persistent — leaving significant return on the table.",
                color: "text-yellow-400",
                border: "border-yellow-900/30",
              },
              {
                label: "Ignoring Deterioration",
                desc: "Holding full size through hazard escalation because there is no objective signal to act on.",
                color: "text-orange-400",
                border: "border-orange-900/30",
              },
            ].map(({ label, desc, color, border }) => (
              <div key={label} className={`border ${border} bg-white/[0.01] rounded-2xl p-6 space-y-2`}>
                <div className={`text-sm font-semibold ${color}`}>{label}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">What you get</div>
            <h2 className="text-3xl font-semibold tracking-tight">Every tool for regime-aware trading</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: "⚡", title: "Live Regime Stack",       desc: "Macro, trend, and execution timeframes updated hourly from live Binance data." },
              { icon: "🎯", title: "Decision Engine",          desc: "One systematic directive per session — Increase, Maintain, Trim, Defensive, or Risk-Off." },
              { icon: "📈", title: "Survival Modeling",        desc: "Conditional probability the current regime persists based on historical durations." },
              { icon: "🛡️", title: "Hazard Rate",              desc: "Instantaneous failure risk vs historical norms. Spikes before price breaks." },
              { icon: "🤖", title: "AI Regime Analyst",        desc: "Plain-English narrative explaining current conditions and what to do about them." },
              { icon: "🔬", title: "Setup Quality Engine",     desc: "Entry timing, chase risk, exhaustion detection, and optimal entry zones." },
              { icon: "📉", title: "Backtesting Engine",       desc: "Historical strategy performance across regime conditions — 5 strategies, up to 365 days." },
              { icon: "🧮", title: "Monte Carlo VaR",          desc: "10,000-simulation risk modeling to quantify exactly what's at stake." },
              { icon: "📊", title: "Kelly Criterion",          desc: "Mathematically optimal position sizing based on your win rate and edge." },
              { icon: "🧠", title: "Behavioral Tracking",      desc: "Discipline score, streak tracking, mistake replay, and edge profile by regime." },
              { icon: "🔗", title: "On-Chain Metrics",         desc: "Funding rates, open interest, and leverage positioning to front-run sentiment." },
              { icon: "⚙️", title: "API & Webhooks",           desc: "Programmatic access and automated alerts for institutional workflows." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 border border-white/5 bg-white/[0.015] rounded-xl p-5 hover:border-white/10 transition-colors">
                <span className="text-xl shrink-0">{icon}</span>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING BRIDGE ── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="border border-white/8 bg-white/[0.02] rounded-2xl p-10 text-center space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              One avoided drawdown pays for years of Pro
            </h2>
            <p className="text-zinc-500 text-sm max-w-xl mx-auto leading-relaxed">
              For traders managing $5,000+, a single avoided 3% over-exposure event saves $150 — more than four months of Essential at $29/month billed annually.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {[
                { tier: "Essential", price: "$29", color: "text-blue-400",    border: "border-blue-500/30"   },
                { tier: "Pro",       price: "$59", color: "text-white",       border: "border-white/20",      badge: "Popular" },
                { tier: "Institution", price: "$119", color: "text-purple-400", border: "border-purple-500/30" },
              ].map(({ tier, price, color, border, badge }) => (
                <div key={tier} className={`border ${border} rounded-xl p-4 text-center space-y-1 relative`}>
                  {badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {badge}
                    </div>
                  )}
                  <div className={`text-xs font-semibold uppercase tracking-widest ${color}`}>{tier}</div>
                  <div className="text-xl font-bold text-white">{price}<span className="text-xs text-zinc-500 font-normal">/mo</span></div>
                  <div className="text-[9px] text-zinc-600">billed annually</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/pricing"
                className="bg-white text-black px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-all hover:-translate-y-[1px] hover:shadow-lg"
              >
                View all plans
              </Link>
              <Link
                href="/app"
                className="border border-white/10 px-8 py-3.5 rounded-xl text-zinc-400 text-sm hover:border-white/20 hover:text-white transition-all"
              >
                Try free first
              </Link>
            </div>
            <div className="text-[10px] text-zinc-700">7-day free trial · Cancel anytime · No credit card required</div>
          </div>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ── */}
      <section className="px-6 pb-24">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Get the daily regime brief</h2>
            <p className="text-zinc-500 text-sm">Regime verdict, shift risk, and directive — every morning. Free.</p>
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
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm focus:outline-none focus:border-white/25 placeholder-zinc-600"
                />
                <button
                  onClick={handleSubscribe}
                  className="bg-white text-black px-5 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-colors whitespace-nowrap"
                >
                  Subscribe
                </button>
              </div>
              {emailError && <div className="text-xs text-red-400">{emailError}</div>}
              <div className="text-[10px] text-zinc-700">No spam. Unsubscribe anytime.</div>
            </div>
          ) : (
            <div className="border border-emerald-800 bg-emerald-950/40 text-emerald-400 px-6 py-4 rounded-xl text-sm">
              ✓ You're subscribed. Check your inbox to confirm.
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white">ChainPulse</span>
          </div>
          <div className="flex gap-6 text-xs text-zinc-600">
            <Link href="/app"          className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <Link href="/pricing"      className="hover:text-zinc-400 transition-colors">Pricing</Link>
            <Link href="/methodology"  className="hover:text-zinc-400 transition-colors">Methodology</Link>
          </div>
          <div className="text-[10px] text-zinc-700">Not financial advice. Manage your own risk.</div>
        </div>
      </footer>
    </main>
  );
}
