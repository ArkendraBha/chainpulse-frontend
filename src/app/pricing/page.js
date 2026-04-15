"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import PricingAnalytics from "@/components/PricingAnalytics";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

const TIERS = {
  essential: {
    name: "Essential",
    monthlyPrice: 39,
    annualPrice: 29,
    annualTotal: 348,
    color: "text-blue-400",
    accentColor: "#3b82f6",
    badge: null,
    highlight: false,
    identity: "Exposure Control",
    tagline: "You know what to do.",
    description: "The minimum viable tier for disciplined risk management.",
    sections: [
      {
        title: "Regime Intelligence",
        features: [
          "Full regime stack — macro, trend, execution",
          "Exposure recommendation % — regime-adjusted",
          "Shift risk % — composite deterioration signal",
          "Hazard rate — instantaneous failure risk",
          "Survival curve — persistence probability",
          "Regime maturity — Early/Mid/Late/Overextended",
          "Regime stress meter + confidence score",
          "Volatility & liquidity environment",
          "Transition probability matrix",
          "Cross-asset correlation monitor",
        ],
      },
      {
        title: "Decision Support",
        features: [
          "Decision engine directive",
          "Regime playbook — protocol + win rates",
          "Regime quality grade A–D",
          "Portfolio health score",
          "Consequence simulator",
          "Exposure calibration engine",
          "Drawdown simulator",
          "PnL impact estimator",
        ],
      },
      {
        title: "Data & Accountability",
        features: [
          "Funding rates + open interest",
          "CSV export — exposure + performance",
          "Regime history calendar",
          "Exposure logger",
          "Discipline score + streak",
          "Mistake replay engine",
          "Performance comparison vs model",
          "Edge profile by regime",
          "Weekly performance report",
          "Email alerts + daily brief",
          "All 7 assets tracked",
        ],
      },
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 79,
    annualPrice: 59,
    annualTotal: 708,
    color: "text-emerald-400",
    accentColor: "#10b981",
    badge: "Most Popular",
    highlight: true,
    identity: "Strategic Edge",
    tagline: "You know before others know.",
    description: "Full analytical suite for serious traders managing real capital.",
    sections: [
      {
        title: "Everything in Essential, plus:",
        features: [],
      },
      {
        title: "Live Intelligence",
        features: [
          "WebSocket live regime streaming",
          "AI Regime Analyst — 3-paragraph narrative",
          "Enhanced on-chain intelligence",
        ],
      },
      {
        title: "Advanced Analytics",
        features: [
          "Backtesting engine — 5 strategies, 365 days",
          "Monte Carlo VaR — 10,000 simulations",
          "Kelly Criterion position sizing",
          "Setup quality engine + entry zones",
          "Probabilistic scenarios Bull/Base/Bear",
          "Historical analog matching",
          "Opportunity ranking — cross-asset",
          "Comparison mode — side-by-side",
          "Internal damage monitor",
          "Event risk overlay",
          "Behavioral alpha report",
          "Trade plan generator",
        ],
      },
    ],
  },
  institutional: {
    name: "Institutional",
    monthlyPrice: 149,
    annualPrice: 119,
    annualTotal: 1428,
    color: "text-purple-400",
    accentColor: "#a855f7",
    badge: null,
    highlight: false,
    identity: "Infrastructure Layer",
    tagline: "You run the system.",
    description: "For traders who need regime intelligence embedded in their workflow.",
    sections: [
      {
        title: "Everything in Pro, plus:",
        features: [],
      },
      {
        title: "API & Automation",
        features: [
          "REST API — 1,000 req/day",
          "Up to 3 API keys",
          "Webhook delivery + HMAC signatures",
          "Up to 5 webhook endpoints",
          "Delivery logs + retry status",
        ],
      },
      {
        title: "Customization",
        features: [
          "Custom per-coin alert thresholds",
          "Custom regime thresholds",
          "Trader archetype overlay",
          "Priority alert delivery — 1hr cooldown",
        ],
      },
    ],
  },
};

const COMPARISON = [
  { section: "Free" },
  { feat: "Execution regime label",                        free: true,  essential: true,  pro: true,  institutional: true  },
  { feat: "Market direction",                              free: true,  essential: true,  pro: true,  institutional: true  },
  { feat: "Basic breadth indicator",                       free: true,  essential: true,  pro: true,  institutional: true  },
  { section: "Essential" },
  { feat: "Full regime stack (3 timeframes)",              free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Exposure recommendation %",                     free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Shift risk + hazard rate",                      free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Survival curve",                                free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Decision engine directive",                     free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Funding rates + open interest",                 free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "CSV export",                                    free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Discipline score + streaks",                    free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Performance comparison vs model",               free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "Email alerts + daily brief",                    free: false, essential: true,  pro: true,  institutional: true  },
  { feat: "All 7 assets tracked",                          free: false, essential: true,  pro: true,  institutional: true  },
  { section: "Pro" },
  { feat: "WebSocket live streaming",                      free: false, essential: false, pro: true,  institutional: true  },
  { feat: "AI Regime Analyst",                             free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Backtesting engine (5 strategies, 365 days)",   free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Monte Carlo VaR simulation",                    free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Kelly Criterion position sizing",               free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Setup quality + entry zones",                   free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Probabilistic scenarios",                       free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Historical analog matching",                    free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Internal damage monitor",                       free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Behavioral alpha report",                       free: false, essential: false, pro: true,  institutional: true  },
  { feat: "Trade plan generator",                          free: false, essential: false, pro: true,  institutional: true  },
  { section: "Institutional" },
  { feat: "REST API (1,000 req/day)",                      free: false, essential: false, pro: false, institutional: true  },
  { feat: "Webhooks + HMAC signatures",                    free: false, essential: false, pro: false, institutional: true  },
  { feat: "Custom regime thresholds",                      free: false, essential: false, pro: false, institutional: true  },
  { feat: "Custom alert thresholds",                       free: false, essential: false, pro: false, institutional: true  },
  { feat: "Trader archetype overlay",                      free: false, essential: false, pro: false, institutional: true  },
  { feat: "Priority alert delivery",                       free: false, essential: false, pro: false, institutional: true  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState(null);
  const [selectedTier, setSelectedTier] = useState("pro");

  const handleCheckout = async (tierKey) => {
    setLoading(tierKey);
    try {
      trackEvent("checkout_clicked", { billing_cycle: annual ? "annual" : "monthly", tier: tierKey });
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_cycle: annual ? "annual" : "monthly", tier: tierKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    finally { setLoading(null); }
  };

  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: "#080809" }}>
      <PricingAnalytics />

      {/* ── HERO ── */}
      <section className="px-6 pt-24 pb-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 border border-white/8 rounded-full px-4 py-1.5 text-xs text-zinc-600 uppercase tracking-widest">
            Pricing
          </div>
          <h1
            className="text-6xl font-semibold tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Choose your layer
          </h1>
          <p className="text-zinc-500 text-base max-w-xl mx-auto leading-relaxed">
            Not features. Layers of intelligence.
            Each tier transforms how you allocate capital.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setAnnual(false)}
              className={`text-sm transition-colors ${!annual ? "text-white" : "text-zinc-600"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-emerald-500" : "bg-zinc-700"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${annual ? "left-7 bg-black" : "left-1 bg-white"}`} />
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`text-sm transition-colors ${annual ? "text-white" : "text-zinc-600"}`}
            >
              Annual
              <span className="ml-2 text-xs text-emerald-400 font-medium">Save 25%+</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── TIER CARDS ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
          {Object.entries(TIERS).map(([key, tier]) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            const savings = Math.round((1 - tier.annualPrice / tier.monthlyPrice) * 100);

            return (
              <div
                key={key}
                className={`relative rounded-2xl border flex flex-col transition-all ${
                  tier.highlight
                    ? "border-emerald-500/30"
                    : "border-white/6 hover:border-white/10"
                }`}
                style={{
                  backgroundColor: tier.highlight ? "rgba(16,185,129,0.03)" : "#0f0f10",
                  boxShadow: tier.highlight ? "0 0 60px rgba(16,185,129,0.06)" : undefined,
                }}
              >
                {tier.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-black whitespace-nowrap"
                    style={{ backgroundColor: tier.accentColor }}
                  >
                    {tier.badge}
                  </div>
                )}

                <div className="p-8 space-y-6 flex-1">
                  {/* Identity */}
                  <div className="space-y-1">
                    <div className={`text-[10px] uppercase tracking-widest font-semibold ${tier.color}`}>
                      {tier.name}
                    </div>
                    <div className="text-white font-semibold text-lg">{tier.identity}</div>
                    <div className="text-zinc-500 text-xs">{tier.tagline}</div>
                  </div>

                  {/* Price */}
                  <div className="space-y-0.5">
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-semibold tracking-tight text-white">${price}</span>
                      <span className="text-zinc-600 pb-1.5 text-sm">/ month</span>
                    </div>
                    {annual && (
                      <div className="text-xs text-zinc-700">
                        ${tier.annualTotal}/year · save {savings}%
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 pt-2 leading-relaxed">{tier.description}</p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleCheckout(key)}
                    disabled={loading === key}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-[1px] disabled:opacity-50 ${
                      tier.highlight
                        ? "text-black"
                        : "border border-white/10 text-white hover:bg-white/5"
                    }`}
                    style={tier.highlight ? { backgroundColor: tier.accentColor } : undefined}
                  >
                    {loading === key ? "Redirecting..." : `Start ${tier.name}`}
                  </button>

                  {/* Features */}
                  <div className="space-y-5 pt-2">
                    {tier.sections.map((section) => (
                      <div key={section.title} className="space-y-2">
                        <div className={`text-[10px] uppercase tracking-widest font-medium ${
                          section.title.includes("Everything") ? tier.color : "text-zinc-600"
                        }`}>
                          {section.title}
                        </div>
                        {section.features.map((feat) => (
                          <div key={feat} className="flex items-start gap-2.5 text-xs text-zinc-500">
                            <svg
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${tier.color}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {feat}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-8 py-4 border-t border-white/4 text-center text-[10px] text-zinc-700">
                  7-day free trial · Cancel anytime
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Compare all features</h2>
            <p className="text-zinc-600 text-sm">Every feature across every tier</p>
          </div>

          <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ backgroundColor: "#0f0f10" }}>
            <div className="grid grid-cols-5 border-b border-white/5">
              <div className="col-span-2 px-6 py-4 text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Feature</div>
              {["Free", "Essential", "Pro", "Institutional"].map((t) => (
                <div key={t} className="px-4 py-4 text-center text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{t}</div>
              ))}
            </div>

            {COMPARISON.map((row, i) => {
              if (row.section) {
                return (
                  <div key={i} className="grid grid-cols-5 border-t border-white/4" style={{ backgroundColor: "#080809" }}>
                    <div className="col-span-5 px-6 py-3 text-[10px] text-zinc-700 uppercase tracking-widest font-semibold">
                      {row.section}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="grid grid-cols-5 border-t border-white/4 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="col-span-2 px-6 py-3.5 text-sm text-zinc-400">{row.feat}</div>
                  {["free", "essential", "pro", "institutional"].map((tier) => (
                    <div key={tier} className="px-4 py-3.5 flex items-center justify-center">
                      {row[tier] ? (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-3 h-px bg-zinc-800" />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight text-center">Common questions</h2>
          <div className="divide-y divide-white/5">
            {[
              {
                q: "What exactly does ChainPulse tell me?",
                a: "It tells you the statistical state of the current market regime, how mature it is, how likely it is to continue, and what exposure allocation is supported by the data. It does not tell you what to buy or sell.",
              },
              {
                q: "What's the difference between Essential and Pro?",
                a: "Essential tells you how much to deploy and when to stand down. Pro tells you whether this specific moment is a good entry, validates your strategy historically, models risk across 10,000 scenarios, and tracks the exact behavioral patterns costing you alpha.",
              },
              {
                q: "What assets are covered?",
                a: "BTC, ETH, SOL, BNB, AVAX, LINK, and ADA — updated hourly across three timeframes. All tiers include all 7 assets.",
              },
              {
                q: "How is this different from a signal service?",
                a: "Signal services tell you when to enter and exit. ChainPulse tells you how much capital belongs in the current market environment — and tracks whether your sizing decisions are aligned with the model over time.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your Stripe billing portal at any time. You keep access until the end of your paid period.",
              },
            ].map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="px-6 pb-24 border-t border-white/4 pt-16">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-3xl font-semibold tracking-tight">Start with a 7-day free trial</h2>
          <p className="text-zinc-600 text-sm">No credit card required to start. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => handleCheckout("essential")}
              className="border border-white/8 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-white/5 transition-all hover:-translate-y-[1px]"
              style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              Start Essential — ${annual ? 29 : 39}/mo
            </button>
            <button
              onClick={() => handleCheckout("pro")}
              className="text-black px-8 py-3.5 rounded-xl text-sm font-semibold hover:-translate-y-[1px] transition-all"
              style={{ backgroundColor: "#10b981" }}
            >
              Start Pro — ${annual ? 59 : 79}/mo
            </button>
          </div>
          <p className="text-[10px] text-zinc-700">
            {annual ? "Annual pricing shown" : "Monthly pricing shown"} · 7-day risk-free · Cancel anytime
          </p>
        </div>
      </section>
    </main>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left gap-4"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <svg
          className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{a}</p>}
    </div>
  );
}
