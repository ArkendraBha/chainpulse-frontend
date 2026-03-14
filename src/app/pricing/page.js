"use client";

import { useState } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 29;
  const annualPrice = 19;
  const annualTotal = annualPrice * 12;

  const handleCheckout = async () => {
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
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
  };

  return (
    <main className="min-h-screen bg-black text-white px-8 py-24">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            Pricing
          </div>
          <h1 className="text-5xl font-semibold">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            One plan. Everything included.
            For traders allocating real capital.
          </p>

          {/* BILLING TOGGLE */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span
              className={`text-sm ${!annual ? "text-white" : "text-gray-500"}`}
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
                  annual
                    ? "left-7 bg-black"
                    : "left-1 bg-white"
                }`}
              />
            </button>
            <span
              className={`text-sm ${annual ? "text-white" : "text-gray-500"}`}
            >
              Annual
              <span className="ml-2 text-xs text-emerald-400 font-medium">
                Save 34%
              </span>
            </span>
          </div>
        </div>

        {/* PRICING CARD */}
        <div className="max-w-lg mx-auto border border-zinc-700 p-12 space-y-8">

          <div className="space-y-2">
            <div className="text-sm text-gray-500 uppercase tracking-widest">
              ChainPulse Pro
            </div>
            <div className="flex items-end gap-2">
              <div className="text-6xl font-semibold">
                ${annual ? annualPrice : monthlyPrice}
              </div>
              <div className="text-gray-400 pb-2">/ month</div>
            </div>
            {annual && (
              <div className="text-gray-500 text-sm">
                Billed annually — ${annualTotal}/year
              </div>
            )}
            {!annual && (
              <div className="text-gray-600 text-xs">
                Or ${annualPrice}/mo billed annually
              </div>
            )}
          </div>

          <div className="text-gray-500 text-xs border-t border-zinc-800 pt-6">
            Early access pricing — subject to increase
          </div>

          <ul className="space-y-4 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Full multi-asset dashboard — BTC, ETH, SOL, BNB, AVAX</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Regime survival curve and hazard modeling</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Exposure allocation engine</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Coherence index and strength percentile</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Real-time regime shift email alerts</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Weekly regime snapshot reports</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>48-hour regime score history chart</span>
            </li>
          </ul>

          <button
            onClick={handleCheckout}
            className="w-full bg-white text-black py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors"
          >
            Activate Pro — ${annual ? annualPrice : monthlyPrice}/month
          </button>

          <div className="text-center text-gray-600 text-xs space-y-1">
            <div>7-day risk-free access · Cancel anytime</div>
            <div>Secure checkout via Stripe</div>
          </div>

        </div>

        {/* ROI FRAMING */}
        <div className="max-w-3xl mx-auto border border-zinc-900 p-10 space-y-6 text-center">
          <h2 className="text-2xl font-semibold">
            The Math is Simple
          </h2>
          <p className="text-gray-400">
            For a trader managing \$10,000, a single avoided late-stage
            overexposure event of 3% saves \$300. That covers 10 months of Pro.
          </p>
          <p className="text-gray-500 text-sm">
            ChainPulse does not guarantee outcomes.
            It gives you a statistical framework to act on.
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
                exposure allocation is supported by the data. It does not
                tell you what to buy or sell.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                How is this different from a trading signal service?
              </div>
              <p className="text-gray-400">
                Signal services tell you when to enter and exit specific trades.
                ChainPulse tells you how much capital to have deployed given
                current regime conditions. It is a risk allocation framework,
                not a trade signal engine.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                What assets are covered?
              </div>
              <p className="text-gray-400">
                BTC, ETH, SOL, BNB, and AVAX — updated hourly from live
                Binance market data.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                When do I receive alerts?
              </div>
              <p className="text-gray-400">
                Email alerts are dispatched when regime shift risk exceeds 70%
                for any tracked asset. Alerts are throttled to a maximum of
                once per 12 hours per asset to prevent noise.
              </p>
            </div>

            <div className="border-b border-zinc-900 pb-6 space-y-2">
              <div className="text-white font-medium">
                Can I cancel anytime?
              </div>
              <p className="text-gray-400">
                Yes. Cancel from your Stripe billing portal at any time.
                No questions asked.
              </p>
            </div>

            <div className="pb-6 space-y-2">
              <div className="text-white font-medium">
                Is there a free tier?
              </div>
              <p className="text-gray-400">
                The live regime snapshot on the dashboard is publicly visible.
                Pro unlocks full analytics, multi-asset coverage, shift alerts,
                and weekly reports.
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