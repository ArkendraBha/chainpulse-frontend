"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

function getRegimeColor(label) {
  if (!label) return "text-gray-400";
  if (label.includes("Strong Risk-On")) return "text-emerald-400";
  if (label.includes("Risk-On")) return "text-green-400";
  if (label.includes("Strong Risk-Off")) return "text-red-500";
  if (label.includes("Risk-Off")) return "text-red-400";
  return "text-yellow-400";
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
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
    if (!email) return;
    try {
      await fetch(`${BACKEND}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
    } catch {
      console.error("Subscription failed");
    }
  };

  const label = liveData?.latest?.label;
  const exposure = liveData?.stats?.exposure_recommendation_percent;
  const shiftRisk = liveData?.stats?.regime_shift_risk_percent;
  const coherence = liveData?.latest?.coherence;

  return (
    <main className="min-h-screen bg-black text-white">

      {/* ── HERO ── */}
      <section className="px-8 py-32 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto text-center space-y-10">

          <div className="text-xs text-gray-500 uppercase tracking-widest">
            Regime-Based Exposure Intelligence
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight">
            Allocate Capital With<br />Regime Awareness
          </h1>

          <p className="text-gray-400 text-xl max-w-3xl mx-auto">
            Statistical survival modeling for swing traders managing real capital.
            Press size when persistence is strong. Stand down before deterioration.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              href="/app"
              className="bg-white text-black px-8 py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              View Live Regime
            </Link>
            <Link
              href="/methodology"
              className="border border-zinc-700 px-8 py-4 rounded-md text-gray-300 hover:border-zinc-500 transition-colors"
            >
              Read Methodology
            </Link>
          </div>

        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="px-8 py-8 border-b border-zinc-900 text-center">
        <div className="text-gray-600 text-xs uppercase tracking-widest">
          Built on live Binance data · Survival modeling · Real capital focus
        </div>
      </section>

      {/* ── LIVE SNAPSHOT ── */}
      <section className="px-8 py-24 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto text-center space-y-8">

          <h2 className="text-3xl font-semibold">Live BTC Regime Snapshot</h2>

          <div className="border border-zinc-800 p-10 space-y-6">
            {liveData ? (
              <>
                <div className="text-2xl font-semibold">
                  BTC Regime:{" "}
                  <span className={getRegimeColor(label)}>{label}</span>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-6">
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-widest">
                      Exposure
                    </div>
                    <div className="text-3xl font-semibold mt-2">
                      {exposure}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-widest">
                      Shift Risk
                    </div>
                    <div
                      className={`text-3xl font-semibold mt-2 ${
                        shiftRisk > 70 ? "text-red-400" : "text-gray-300"
                      }`}
                    >
                      {shiftRisk}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-widest">
                      Coherence
                    </div>
                    <div className="text-3xl font-semibold mt-2">
                      {coherence}%
                    </div>
                  </div>
                </div>

                <div className="text-gray-600 text-xs pt-2">
                  Data refreshes automatically · Full analytics in dashboard
                </div>
              </>
            ) : (
              <div className="space-y-3 py-4">
                <div className="text-gray-500">Connecting to regime model...</div>
                <div className="text-gray-700 text-sm">
                  Live Binance data · Updated hourly
                </div>
              </div>
            )}
          </div>

          <Link
            href="/app"
            className="text-sm text-gray-500 hover:text-white underline transition-colors"
          >
            View full dashboard →
          </Link>

        </div>
      </section>

      {/* ── PAIN SECTION ── */}
      <section className="px-8 py-28 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto space-y-16">

          <h2 className="text-4xl font-semibold text-center">
            Most Traders Increase Risk at the Wrong Time
          </h2>

          <div className="grid md:grid-cols-3 gap-10 text-sm">
            <div className="space-y-3">
              <div className="text-white font-medium">Late-Stage Overexposure</div>
              <p className="text-gray-400">
                Sizing up when momentum is mature and deterioration is already
                statistically underway.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-white font-medium">Early Exit Bias</div>
              <p className="text-gray-400">
                Reducing exposure in regimes that remain statistically
                persistent — leaving significant return on the table.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-white font-medium">Ignoring Deterioration</div>
              <p className="text-gray-400">
                Holding full size through hazard escalation because there is no
                objective signal to act on.
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              ChainPulse quantifies regime persistence so exposure is allocated
              based on probability — not emotion.
            </p>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-8 py-28 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto space-y-16">

          <h2 className="text-4xl font-semibold text-center">
            How ChainPulse Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8 text-sm">
            <div className="space-y-3">
              <div className="text-gray-500 text-xs uppercase tracking-widest">01</div>
              <div className="text-white font-medium">Regime Classification</div>
              <p className="text-gray-400">
                Multi-timeframe momentum and volatility scoring classifies
                market state in real time.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-gray-500 text-xs uppercase tracking-widest">02</div>
              <div className="text-white font-medium">Coherence Measurement</div>
              <p className="text-gray-400">
                Directional alignment across timeframes distinguishes strong
                trends from choppy noise.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-gray-500 text-xs uppercase tracking-widest">03</div>
              <div className="text-white font-medium">Survival Modeling</div>
              <p className="text-gray-400">
                Historical regime durations generate conditional survival
                probabilities for the current state.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-gray-500 text-xs uppercase tracking-widest">04</div>
              <div className="text-white font-medium">Exposure Output</div>
              <p className="text-gray-400">
                A single allocation recommendation calibrated to regime
                strength, persistence, and hazard.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── AUTHORITY METRICS ── */}
      <section className="px-8 py-24 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto space-y-16 text-center">

          <h2 className="text-4xl font-semibold">
            Built on Quantitative Persistence Modeling
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <div className="text-3xl font-semibold">5</div>
              <div className="text-gray-400 text-sm">
                Regime states tracked across BTC, ETH, SOL, BNB, AVAX
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-semibold">4</div>
              <div className="text-gray-400 text-sm">
                Independent statistical signals composited per output
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-semibold">Hourly</div>
              <div className="text-gray-400 text-sm">
                Live Binance data updated continuously
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── PRICING BRIDGE ── */}
      <section className="px-8 py-24 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto text-center space-y-10">

          <h2 className="text-4xl font-semibold">
            One Poorly Timed Position Costs More Than a Year of Pro
          </h2>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            ChainPulse Pro is \$29/month. For traders managing \$5,000+,
            one avoided late-stage overexposure event more than covers the cost.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-sm mt-4">
            <div className="border border-zinc-800 p-6 space-y-2">
              <div className="text-white font-medium">Full Multi-Asset Dashboard</div>
              <p className="text-gray-500">BTC, ETH, SOL, BNB, AVAX regime analytics</p>
            </div>
            <div className="border border-zinc-800 p-6 space-y-2">
              <div className="text-white font-medium">Regime Shift Alerts</div>
              <p className="text-gray-500">Email alerts when deterioration risk exceeds threshold</p>
            </div>
            <div className="border border-zinc-800 p-6 space-y-2">
              <div className="text-white font-medium">Weekly Regime Reports</div>
              <p className="text-gray-500">Concise weekly summary of regime conditions</p>
            </div>
          </div>

          <Link
            href="/pricing"
            className="inline-block bg-white text-black px-8 py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors"
          >
            View Pricing
          </Link>

        </div>
      </section>

      {/* ── EMAIL CAPTURE ── */}
      <section className="px-8 py-24 border-b border-zinc-900">
        <div className="max-w-3xl mx-auto text-center space-y-8">

          <h2 className="text-3xl font-semibold">
            Get the Weekly Regime Snapshot
          </h2>

          <p className="text-gray-400">
            A concise weekly summary of current regime conditions, exposure
            recommendations, and shift risk — free.
          </p>

          {!subscribed ? (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                className="px-4 py-3 bg-zinc-900 border border-zinc-700 text-white rounded-md w-72 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={handleSubscribe}
                className="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors"
              >
                Subscribe Free
              </button>
            </div>
          ) : (
            <div className="border border-emerald-800 bg-emerald-950 text-emerald-400 px-6 py-4 rounded-md text-sm">
              ✓ Confirmation email sent. Check your inbox to activate.
            </div>
          )}

          <div className="pt-2">
            <a
              href={`${BACKEND}/sample-report`}
              target="_blank"
              rel="noreferrer"
              className="text-gray-600 hover:text-gray-400 text-sm underline transition-colors"
            >
              Download sample weekly report (PDF) →
            </a>
          </div>

        </div>
      </section>

      {/* ── METHODOLOGY CTA ── */}
      <section className="px-8 py-24 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto text-center space-y-8">

          <h2 className="text-3xl font-semibold">
            Transparent Methodology
          </h2>

          <p className="text-gray-400 max-w-2xl mx-auto">
            ChainPulse does not predict price direction. It models regime
            persistence. Every input, weighting, and output formula is
            documented and publicly readable.
          </p>

          <Link
            href="/methodology"
            className="inline-block border border-zinc-700 px-8 py-4 rounded-md text-gray-300 hover:border-zinc-500 transition-colors"
          >
            Read Full Methodology
          </Link>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-8 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-gray-600 text-xs">

          <div className="font-medium text-gray-500">ChainPulse Quant</div>

          <div className="flex gap-8">
            <Link href="/app" className="hover:text-gray-400 transition-colors">Dashboard</Link>
            <Link href="/pricing" className="hover:text-gray-400 transition-colors">Pricing</Link>
            <Link href="/methodology" className="hover:text-gray-400 transition-colors">Methodology</Link>
            <Link href="/blog" className="hover:text-gray-400 transition-colors">Blog</Link>
          </div>

          <div>
            Not financial advice. Manage your own risk.
          </div>

        </div>
      </footer>

    </main>
  );
}