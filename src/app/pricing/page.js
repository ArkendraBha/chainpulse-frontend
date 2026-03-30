"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import PricingAnalytics from "@/components/PricingAnalytics";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─────────────────────────────────────────
// TIER CONFIGURATION
// ─────────────────────────────────────────
const TIERS = {
  essential: {
    name: "Essential",
    monthlyPrice: 39,
    annualPrice: 29,
    annualTotal: 348,
    color: "text-blue-400",
    borderColor: "border-blue-500",
    bgGlow: "shadow-blue-500/5",
    badge: null,
    description: "Complete regime intelligence for disciplined traders.",
    sections: [
      {
        title: "Core Regime Stack",
        features: [
          "Full regime stack — macro, trend, execution",
          "Exposure recommendation % — regime-adjusted",
          "Shift risk % — composite deterioration signal",
          "Survival probability — regime persistence model",
          "Hazard rate — failure risk vs historical norm",
          "Full coherence index per timeframe",
          "Timeframe alignment scoring",
        ],
      },
      {
        title: "Decision Support",
        features: [
          "Decision Engine — today's systematic directive",
          "Regime playbook — protocol for current conditions",
          "Regime quality grade (A / B / C / D)",
          "Regime stress meter — composite breakdown",
          "Regime countdown — statistical time remaining",
          "Confidence trend — 24H conviction trajectory",
        ],
      },
      {
        title: "Monitoring",
        features: [
          "Volatility & liquidity environment",
          "Survival curve visualization",
          "Daily regime brief via email",
          "Shift alerts when risk exceeds threshold",
          "All 7 assets: BTC ETH SOL BNB AVAX LINK ADA",
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
    borderColor: "border-emerald-500",
    bgGlow: "shadow-emerald-500/5",
    badge: "MOST POPULAR",
    description: "Full analytical suite for serious traders managing real capital.",
    sections: [
      {
        title: "Everything in Essential, plus:",
        features: [],
      },
      {
        title: "Advanced Analytics",
        features: [
          "Setup quality scoring + optimal entry zones",
          "Probabilistic scenarios (Bull / Base / Bear)",
          "Internal damage monitor — structural weakness",
          "Historical analog matching — forward returns",
          "Opportunity ranking — best entry across all assets",
          "Transition probability matrix",
          "Cross-asset correlation monitor",
        ],
      },
      {
        title: "Trade Execution",
        features: [
          "Trade plan generator with tranches + stops",
          "PnL impact estimator — expected value modeling",
          "Drawdown simulator — 3 scenario loss modeling",
          "Consequence simulator — cost of inaction",
          "Exposure calibration engine",
          "Event risk overlay — macro event adjustments",
        ],
      },
      {
        title: "Personal Accountability",
        features: [
          "Behavioral alpha leak detection",
          "Mistake replay engine — costly deviations",
          "Discipline score + streak tracking",
          "Performance comparison — your alpha vs model",
          "Edge profile — your best and worst regimes",
          "Weekly performance report",
          "Risk profile calibration",
          "Exposure logger",
          "Performance logger",
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
    borderColor: "border-purple-500",
    bgGlow: "shadow-purple-500/5",
    badge: null,
    description: "For power users and teams who need full customization and API access.",
    sections: [
      {
        title: "Everything in Pro, plus:",
        features: [],
      },
      {
        title: "Customization & API",
        features: [
          "Custom alert thresholds per coin",
          "Archetype personalization — tailored to your style",
          "Priority alert delivery",
          "Portfolio allocator with advanced splits",
          "Webhook integrations (coming soon)",
          "REST API access (coming soon)",
        ],
      },
    ],
  },
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [selectedTier, setSelectedTier] = useState("pro");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (tier) => {
    setLoading(true);
    try {
      trackEvent("checkout_clicked", {
        billing_cycle: annual ? "annual" : "monthly",
        tier: tier,
      });

      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing_cycle: annual ? "annual" : "monthly",
          tier: tier,
        }),
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* HEADER */}
        <PricingAnalytics />
        <div className="text-center space-y-4">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            Pricing
          </div>
          <h1 className="text-5xl font-semibold tracking-tight">
            Choose Your Edge
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            One poorly timed exposure increase can cost more than a year of Pro.
          </p>

          {/* BILLING TOGGLE */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={`text-sm ${!annual ? "text-white" : "text-zinc-400"}`}>
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
            <span className={`text-sm ${annual ? "text-white" : "text-zinc-400"}`}>
              Annual
              <span className="ml-2 text-xs text-emerald-400 font-medium">
                Save 25%+
              </span>
            </span>
          </div>
        </div>

        {/* ─── TIER CARDS ─── */}
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(TIERS).map(([key, tier]) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            const isSelected = selectedTier === key;
            const savingsPct = Math.round(
              (1 - tier.annualPrice / tier.monthlyPrice) * 100
            );

            return (
              <div
                key={key}
                onClick={() => setSelectedTier(key)}
                className={[
                  "relative bg-zinc-950/60 backdrop-blur-md border rounded-2xl p-8 space-y-6 cursor-pointer transition-all duration-200",
                  "shadow-[0_10px_40px_rgba(0,0,0,0.4)]",
                  isSelected
                    ? `${tier.borderColor} ${tier.bgGlow} shadow-xl`
                    : "border-white/10 hover:border-white/20",
                ].join(" ")}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap">
                    {tier.badge}
                  </div>
                )}

                {/* Tier name */}
                <div className="space-y-1">
                  <div className={`text-sm font-semibold uppercase tracking-widest ${tier.color}`}>
                    {tier.name}
                  </div>
                  <div className="text-xs text-zinc-500">{tier.description}</div>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-semibold text-white">${price}</span>
                    <span className="text-zinc-400 pb-2">/ mo</span>
                  </div>
                  {annual && (
                    <div className="text-xs text-zinc-500">
                      ${tier.annualTotal}/year · Save {savingsPct}%
                    </div>
                  )}
                  {!annual && (
                    <div className="text-xs text-zinc-600">
                      Or ${tier.annualPrice}/mo billed annually
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
  onClick={(e) => {
    e.stopPropagation();
    handleCheckout(key);
  }}
  disabled={loading}
  className={[
    "w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50",
    isSelected
      ? "bg-white text-black hover:bg-zinc-100 hover:-translate-y-[1px] shadow-lg"
      : "bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10",
  ].join(" ")}
>
  {loading
    ? "Redirecting..."
    : "Start " + tier.name + " — $" + price + "/mo"
  }
</button>

                <div className="text-center text-zinc-600 text-[10px]">
                  7-day free trial · Cancel anytime
                </div>

                {/* Feature preview (short list) */}
                <div className="border-t border-white/5 pt-4 space-y-2">
                  {key === "essential" && (
                    <>
                      <Feature>Full regime stack (all timeframes)</Feature>
                      <Feature>Exposure guidance + shift risk</Feature>
                      <Feature>Decision engine directive</Feature>
                      <Feature>Survival curve + hazard rate</Feature>
                      <Feature>Playbook + stress meter</Feature>
                      <Feature>Email alerts + daily brief</Feature>
                    </>
                  )}
                  {key === "pro" && (
                    <>
                      <Feature highlight>Everything in Essential</Feature>
                      <Feature>Setup quality + entry zones</Feature>
                      <Feature>Probabilistic scenarios</Feature>
                      <Feature>Trade plan generator</Feature>
                      <Feature>Internal damage monitor</Feature>
                      <Feature>Behavioral alpha detection</Feature>
                      <Feature>Discipline + performance tracking</Feature>
                      <Feature>Drawdown + PnL simulation</Feature>
                    </>
                  )}
                  {key === "institutional" && (
                    <>
                      <Feature highlight>Everything in Pro</Feature>
                      <Feature>Custom alert thresholds per coin</Feature>
                      <Feature>Archetype personalization</Feature>
                      <Feature>Priority alert delivery</Feature>
                      <Feature>API access (coming soon)</Feature>
                      <Feature>Webhooks (coming soon)</Feature>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── EXPANDED FEATURE LIST FOR SELECTED TIER ─── */}
        <div className="max-w-3xl mx-auto bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-10 space-y-8 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="text-center space-y-2">
            <div className={`text-sm font-semibold uppercase tracking-widest ${TIERS[selectedTier].color}`}>
              {TIERS[selectedTier].name} — Full Feature List
            </div>
            <div className="text-xs text-zinc-500">
              Everything included in your {TIERS[selectedTier].name} subscription
            </div>
          </div>

          {TIERS[selectedTier].sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="text-xs text-zinc-400 uppercase tracking-widest pt-2">
                {section.title}
              </div>
              {section.features.map((feat) => (
                <div key={feat} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          ))}

          <button
  onClick={() => handleCheckout(selectedTier)}
  disabled={loading}
  className="w-full bg-white text-black py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-[1px] transition-all disabled:opacity-50"
>
  {loading
    ? "Redirecting..."
    : "Start " + TIERS[selectedTier].name + " — $" + (annual ? TIERS[selectedTier].annualPrice : TIERS[selectedTier].monthlyPrice) + "/month"
  }
</button>
          <div className="text-center text-zinc-600 text-xs space-y-1">
            <div>7-day risk-free evaluation · Cancel anytime</div>
            <div>Secure checkout via Stripe</div>
          </div>
        </div>

        {/* ─── COMPARISON TABLE ─── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 py-4 pr-6 font-normal uppercase tracking-widest text-xs">
                  Feature
                </th>
                <th className="text-center text-zinc-400 py-4 px-4 font-normal uppercase tracking-widest text-xs">
                  Free
                </th>
                {Object.entries(TIERS).map(([key, tier]) => (
                  <th
                    key={key}
                    className={`text-center py-4 px-4 font-normal uppercase tracking-widest text-xs ${tier.color}`}
                  >
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feat: "Execution regime label", free: true, essential: true, pro: true, institutional: true },
                { feat: "Market direction", free: true, essential: true, pro: true, institutional: true },
                { feat: "Basic breadth indicator", free: true, essential: true, pro: true, institutional: true },
                { feat: "Full regime stack (3 timeframes)", free: false, essential: true, pro: true, institutional: true },
                { feat: "Exposure recommendation %", free: false, essential: true, pro: true, institutional: true },
                { feat: "Shift risk + hazard rate", free: false, essential: true, pro: true, institutional: true },
                { feat: "Survival curve", free: false, essential: true, pro: true, institutional: true },
                { feat: "Decision engine directive", free: false, essential: true, pro: true, institutional: true },
                { feat: "Regime playbook + quality grade", free: false, essential: true, pro: true, institutional: true },
                { feat: "Email alerts + daily brief", free: false, essential: true, pro: true, institutional: true },
                { feat: "Setup quality + entry zones", free: false, essential: false, pro: true, institutional: true },
                { feat: "Probabilistic scenarios", free: false, essential: false, pro: true, institutional: true },
                { feat: "Trade plan generator", free: false, essential: false, pro: true, institutional: true },
                { feat: "Internal damage monitor", free: false, essential: false, pro: true, institutional: true },
                { feat: "Behavioral alpha detection", free: false, essential: false, pro: true, institutional: true },
                { feat: "Drawdown + PnL simulation", free: false, essential: false, pro: true, institutional: true },
                { feat: "Discipline + performance tracking", free: false, essential: false, pro: true, institutional: true },
                { feat: "Historical analog matching", free: false, essential: false, pro: true, institutional: true },
                { feat: "Opportunity ranking", free: false, essential: false, pro: true, institutional: true },
                { feat: "Custom alert thresholds", free: false, essential: false, pro: false, institutional: true },
                { feat: "Archetype personalization", free: false, essential: false, pro: false, institutional: true },
                { feat: "Priority alerts", free: false, essential: false, pro: false, institutional: true },
                { feat: "API access", free: false, essential: false, pro: false, institutional: "Soon" },
              ].map((row) => (
                <tr key={row.feat} className="border-b border-zinc-900/50">
                  <td className="text-zinc-300 py-3 pr-6">{row.feat}</td>
                  <td className="text-center py-3 px-4">
                    <Check value={row.free} />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check value={row.essential} />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check value={row.pro} />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check value={row.institutional} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── PSYCHOLOGY ANCHOR ─── */}
        <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-4 text-sm text-zinc-400 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="text-white font-medium">
            The Real Cost of Getting It Wrong
          </div>
          <p>
            Designed for traders managing $5,000 or more. At that size, one
            avoided late-stage overexposure event of 3% saves $150 — nearly
            two months of Essential or one month of Pro.
          </p>
          <p>
            The decision engine, drawdown simulator, and consequence modeler
            exist for one reason: to quantify the cost of ignoring regime data
            before it becomes a loss.
          </p>
          <p className="text-zinc-600 text-xs">
            ChainPulse does not guarantee outcomes. Past regime behavior does
            not predict future results.
          </p>
        </div>

        {/* ─── FAQ ─── */}
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-semibold text-center">
            Common Questions
          </h2>

          <div className="space-y-6 text-sm">
            <FAQ
              q="What exactly does ChainPulse tell me?"
              a="It tells you the statistical state of the current market regime, how mature it is, how likely it is to continue, and what exposure allocation is supported by the data. The decision engine then gives you a systematic directive for today's session. It does not tell you what to buy or sell."
            />
            <FAQ
              q="What's the difference between Essential and Pro?"
              a="Essential gives you the complete regime stack, exposure guidance, decision engine, and alerts — everything you need for disciplined risk management. Pro adds advanced analytics: setup quality scoring, trade plan generation, scenario analysis, internal damage detection, behavioral leak identification, and full performance tracking. If you want to know what to do, Essential is enough. If you want to know why and optimize your edge, go Pro."
            />
            <FAQ
              q="How is this different from a trading signal service?"
              a="Signal services tell you when to enter and exit specific trades. ChainPulse tells you how much capital to have deployed given current regime conditions — and tracks whether your decisions are aligned with the model over time. It is a risk allocation framework with personal accountability, not a trade signal engine."
            />
            <FAQ
              q="What assets are covered?"
              a="BTC, ETH, SOL, BNB, AVAX, LINK, and ADA — updated hourly from live market data across three timeframes. All tiers include all 7 assets."
            />
            <FAQ
              q="When do I receive alerts?"
              a="Email alerts are dispatched when regime shift risk exceeds 70% for any tracked asset. Alerts are throttled to a maximum of once per 12 hours per asset to prevent noise. Institutional tier gets priority delivery and custom thresholds."
            />
            <FAQ
              q="What is the discipline score?"
              a="Every time you log your actual exposure, the model compares it against the regime recommendation. Your discipline score tracks how consistently you follow the protocol over time — and flags the specific sessions where deviations cost you the most. Available on Pro and Institutional tiers."
            />
            <FAQ
              q="Can I upgrade or downgrade?"
              a="Yes. You can change your tier at any time from your Stripe billing portal. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period."
            />
            <FAQ
              q="Can I cancel anytime?"
              a="Yes. Cancel from your Stripe billing portal at any time. No questions asked. You keep access until the end of your paid period."
            />
            <FAQ
              q="Is there a free tier?"
              a="Yes. The free tier shows the execution regime label, market direction, and basic breadth. Pro features like the full regime stack, exposure modeling, survival analysis, decision engine, and all accountability tools require a paid subscription."
              last
            />
          </div>
        </div>

        {/* ─── BOTTOM CTA ─── */}
        <div className="text-center space-y-4 pt-8 border-t border-zinc-900">
          <p className="text-zinc-400">
            Still evaluating? Read how the model works first.
          </p>
          <Link
            href="/methodology"
            className="inline-block border border-zinc-700 px-8 py-3 rounded-md text-zinc-300 text-sm hover:border-zinc-500 transition-colors"
          >
            Read Methodology
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────
function Feature({ children, highlight }) {
  return (
    <div className="flex items-start gap-2 text-sm text-zinc-300">
      <span className={`mt-0.5 shrink-0 ${highlight ? "text-blue-400" : "text-emerald-400"}`}>
        {highlight ? "↑" : "→"}
      </span>
      <span className={highlight ? "text-zinc-400 italic" : ""}>{children}</span>
    </div>
  );
}

function Check({ value }) {
  if (value === true) {
    return <span className="text-emerald-400">✓</span>;
  }
  if (value === "Soon") {
    return <span className="text-zinc-500 text-xs">Soon</span>;
  }
  return <span className="text-zinc-700">—</span>;
}

function FAQ({ q, a, last }) {
  return (
    <div className={`${last ? "" : "border-b border-zinc-900"} pb-6 space-y-2`}>
      <div className="text-white font-medium">{q}</div>
      <p className="text-zinc-400">{a}</p>
    </div>
  );
}