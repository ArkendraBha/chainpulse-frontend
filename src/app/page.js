"use client";

import { useState } from "react";
import Link from "next/link";

export default function Landing() {

  const BACKEND = "https://chainpulse-backend-2xok.onrender.com";

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email) return;

    try {
      await fetch(
        `${BACKEND}/subscribe?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      setSubscribed(true);
    } catch (err) {
      console.error("Subscription failed");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="px-8 py-32 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto text-center space-y-10">

          <h1 className="text-6xl font-semibold leading-tight tracking-tight">
            Allocate Capital With Regime Awareness
          </h1>

          <p className="text-gray-400 text-xl max-w-3xl mx-auto">
            Statistical survival modeling for traders managing real capital.
            Press size when persistence is strong. Stand down before deterioration.
          </p>

          <div className="flex justify-center gap-6 pt-6">
            <Link
              href="/app"
              className="bg-white text-black px-8 py-4 rounded-md font-semibold"
            >
              View Live Regime
            </Link>

            <Link
              href="/methodology"
              className="border border-zinc-700 px-8 py-4 rounded-md text-gray-300"
            >
              Read Methodology
            </Link>
          </div>

        </div>
      </section>

      {/* TRUST SIGNAL */}
      <section className="px-8 py-12 border-b border-zinc-900 text-center">
        <div className="max-w-4xl mx-auto text-gray-500 text-sm">
          Used by 42 disciplined traders managing real capital.
        </div>
      </section>

      {/* LIVE SNAPSHOT */}
      <section className="px-8 py-24 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto text-center space-y-8">

          <h2 className="text-3xl font-semibold">
            Live Regime Snapshot
          </h2>

          <div className="border border-zinc-900 p-10">
            <div className="text-2xl font-semibold">
              BTC Regime: <span className="text-green-400">Risk-On</span>
            </div>

            <div className="text-gray-400 mt-4">
              Exposure: 64%
            </div>

            <div className="text-gray-400">
              Shift Risk: 18%
            </div>

            <div className="text-gray-500 text-sm mt-6">
              This environment is statistically persistent.
            </div>
          </div>

        </div>
      </section>

      {/* PAIN SECTION */}
      <section className="px-8 py-28 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-16 text-center">

          <h2 className="text-4xl font-semibold">
            Most Traders Increase Risk at the Wrong Time
          </h2>

          <p className="text-gray-400 max-w-3xl mx-auto">
            They size up late in mature trends.  
            They reduce exposure early in developing ones.  
            They ignore statistical deterioration.
          </p>

          <p className="text-gray-300 max-w-3xl mx-auto text-lg">
            ChainPulse quantifies regime persistence so exposure is allocated
            based on probability, not emotion.
          </p>

        </div>
      </section>

      {/* EMAIL + SAMPLE REPORT */}
      <section className="px-8 py-24 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto text-center space-y-8">

          <h2 className="text-3xl font-semibold">
            Get Weekly Regime Snapshot
          </h2>

          <p className="text-gray-400">
            Receive a concise weekly summary of current regime conditions.
          </p>

          <div className="flex justify-center gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-md w-72"
            />

            <button
              onClick={handleSubscribe}
              className="bg-white text-black px-6 py-3 rounded-md font-semibold"
            >
              Subscribe
            </button>
          </div>

          {subscribed && (
            <div className="text-green-400 text-sm mt-4">
              Confirmation email sent. Please check your inbox.
            </div>
          )}

          <div className="pt-6">
            <a
              href={`${BACKEND}/sample-report`}
              target="_blank"
              className="text-gray-400 underline hover:text-white text-sm"
            >
              Download Sample Weekly Report (PDF)
            </a>
          </div>

        </div>
      </section>

      {/* AUTHORITY SECTION */}
      <section className="px-8 py-28">
        <div className="max-w-6xl mx-auto space-y-12 text-center">

          <h2 className="text-4xl font-semibold">
            Built on Quantitative Persistence Modeling
          </h2>

          <div className="grid md:grid-cols-3 gap-12 text-gray-400 mt-12">

            <div>
              Live Binance market data  
            </div>

            <div>
              Multi‑timeframe momentum aggregation  
            </div>

            <div>
              Regime survival & hazard analysis  
            </div>

          </div>

          <div className="pt-12">
            <Link
              href="/pricing"
              className="bg-white text-black px-8 py-4 rounded-md font-semibold"
            >
              View Pricing
            </Link>
          </div>

        </div>
      </section>

    </main>
  );
}