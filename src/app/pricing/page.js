"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import Link from "next/link";
import PricingAnalytics from "@/components/PricingAnalytics";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 39;
  const annualPrice = 29;
  const annualTotal = annualPrice * 12;


  const handleCheckout = async () => {
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_cycle: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Checkout error. Please try again.");
    }
  }
;
  return (
    <main className="min-h-screen bg-black text-white px-8 py-24">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* HEADER */}
        <PricingAnalytics />
        <div className="text-center space-y-4">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Pricing
          </div>
          <h1 className="text-5xl font-semibold tracking-tight">
  Avoid One Late-Cycle Breakdown
</h1>
<p className="text-zinc-400 text-lg max-w-xl mx-auto">
  One poorly timed exposure increase can cost more than a year of Pro.
</p>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            One plan. Everything included. For traders allocating real capital.
          </p>

          {/* BILLING TOGGLE */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span
              className={`text-sm ${!annual ? "text-white" : "text-zinc-400"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                annual ? "bg-white" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                  annual ? "left-7 bg-black" : "left-1 bg-white"
                }`}
              />
            </button>
            <span
              className={`text-sm ${annual ? "text-white" : "text-zinc-400"}`}
            >
              Annual
              <span className="ml-2 text-xs text-emerald-400 font-medium">
                Save 26%
              </span>
            </span>
          </div>
        </div>

        {/* PRICING CARD */}
        <div className="max-w-lg mx-auto bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-12 space-y-8 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="space-y-2">
            <div className="text-sm text-zinc-400 uppercase tracking-widest">
              ChainPulse Pro
            </div>
            <div className="flex items-end gap-2">
              <div className="text-6xl font-semibold">
                ${annual ? annualPrice : monthlyPrice}
              </div>
              <div className="text-gray-400 pb-2">/ month</div>
            </div>
            {annual && (
              <div className="text-zinc-400 text-sm">
                Billed annually — ${annualTotal}/year
              </div>
            )}
            {!annual && (
              <div className="text-gray-600 text-xs">
                Or ${annualPrice}/mo billed annually — save $120/year
              </div>
            )}
          </div>

          <div className="text-zinc-400 text-xs border-t border-zinc-800 pt-6">
            7-day risk-free evaluation · Cancel anytime
          </div>

          <ul className="space-y-3 text-sm text-zinc-300 leading-relaxed">
            <li className="text-xs text-zinc-400 uppercase tracking-widest pt-1">
              Core Decision Engine
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>
                Exposure recommendation % — regime-adjusted allocation
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Shift risk % — composite deterioration signal</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Survival probability — regime persistence model</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Hazard rate — failure risk vs historical norm</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Decision Engine — today's systematic directive</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Consequence Simulator — cost of inaction</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>PnL Impact Estimator — expected value modeling</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Drawdown Simulator — 3 scenario loss modeling</span>
            </li>

            <li className="text-xs text-zinc-400 uppercase tracking-widest pt-3">
              Regime Intelligence
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Regime quality grade (A / B / C / D)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Regime stress meter — composite breakdown signal</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Regime countdown — statistical time remaining</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Regime playbook — protocol for current conditions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Confidence trend — 24H conviction trajectory</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Volatility & liquidity environment</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Transition probability matrix</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Full coherence index per timeframe</span>
            </li>

            <li className="text-xs text-zinc-400 uppercase tracking-widest pt-3">
              Personal Accountability
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Risk profile calibration — personalised exposure</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Exposure logger — track your actual positions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Discipline streak — consecutive aligned sessions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Discipline score — model adherence over time</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Mistake replay — deviations during risk events</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Performance comparison — your alpha vs model</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Edge profile — your best and worst regimes</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Weekly performance report</span>
            </li>

            <li className="text-xs text-zinc-400 uppercase tracking-widest pt-3">
              Portfolio & Alerts
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Portfolio health score — composite risk rating</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Portfolio exposure allocator</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Cross-asset correlation monitor</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Real-time shift alerts via email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Daily regime brief every morning</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>Weekly discipline summary report</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>All 7 assets: BTC ETH SOL BNB AVAX LINK ADA</span>
            </li>
          </ul>

          <button
  onClick={() => {
    trackEvent("checkout_clicked", {
      billing_cycle: annual ? "annual" : "monthly"
    });
    handleCheckout();
  }}
  className="w-full bg-white text-black py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-[1px] transition-all"
>
  Start Using Full Regime Intelligence — $
  {annual ? annualPrice : monthlyPrice}/month
</button>

          <div className="text-center text-gray-600 text-xs space-y-1">
            <div>7-day risk-free evaluation · Cancel anytime</div>
            <div>Secure checkout via Stripe</div>
          </div>
        </div>

        {/* PSYCHOLOGY ANCHOR */}
        <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-4 text-sm text-zinc-400 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="text-white font-medium">
            The Real Cost of Getting It Wrong
          </div>
          <p>
            Designed for traders managing $5,000 or more. At that size, one
            avoided late-stage overexposure event of 3% saves $150 — nearly
            four months of Pro.
          </p>
          <p>
            The decision engine, drawdown simulator, and consequence modeler
            exist for one reason: to quantify the cost of ignoring regime data
            before it becomes a loss.
          </p>
          <p className="text-gray-600 text-xs">
            ChainPulse does not guarantee outcomes. Past regime behavior does
            not predict future results.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-semibold text-center">
            Common Questions
          </h2>

          <div className="space-y-6 text-sm">
            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                What exactly does ChainPulse tell me?
              </div>
              <p className="text-gray-400">
                It tells you the statistical state of the current market regime,
                how mature it is, how likely it is to continue, and what
                exposure allocation is supported by the data. The decision
                engine then gives you a systematic directive for today's
                session. It does not tell you what to buy or sell.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                How is this different from a trading signal service?
              </div>
              <p className="text-gray-400">
                Signal services tell you when to enter and exit specific trades.
                ChainPulse tells you how much capital to have deployed given
                current regime conditions — and tracks whether your decisions
                are aligned with the model over time. It is a risk allocation
                framework with personal accountability, not a trade signal
                engine.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                What assets are covered?
              </div>
              <p className="text-gray-400">
                BTC, ETH, SOL, BNB, AVAX, LINK, and ADA — updated hourly from
                live market data across three timeframes.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                When do I receive alerts?
              </div>
              <p className="text-gray-400">
                Email alerts are dispatched when regime shift risk exceeds 70%
                for any tracked asset. Alerts are throttled to a maximum of once
                per 12 hours per asset to prevent noise.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                What is the discipline score?
              </div>
              <p className="text-gray-400">
                Every time you log your actual exposure, the model compares it
                against the regime recommendation. Your discipline score tracks
                how consistently you follow the protocol over time — and flags
                the specific sessions where deviations cost you the most.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                Can I cancel anytime?
              </div>
              <p className="text-gray-400">
                Yes. Cancel from your Stripe billing portal at any time. No
                questions asked.
              </p>
            </div>

            <div className="pb-6 space-y-2">
              <div className="text-white font-medium">
                Is there a free tier?
              </div>
              <p className="text-gray-400">
                The live regime snapshot and execution score on the dashboard
                are publicly visible. Pro unlocks full analytics, exposure
                modeling, survival analysis, the decision engine, discipline
                tracking, multi-asset coverage, shift alerts, and all personal
                accountability features.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="text-center space-y-4 pt-8 border-t border-zinc-900">
          <p className="text-gray-400">
            Still evaluating? Read how the model works first.
          </p>
          <Link
            href="/methodology"
            className="inline-block border border-zinc-700 px-8 py-3 rounded-md text-gray-300 text-sm hover:border-zinc-500 transition-colors"
          >
            Read Methodology
          </Link>
        </div>
      </div>
    </main>
  );
}
