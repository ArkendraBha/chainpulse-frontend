"use client";

import { useState } from "react";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const proPrice = annual ? "\$290 / year" : "\$29 / month";
  const proPlusPrice = annual ? "\$490 / year" : "\$49 / month";

  return (
    <main className="min-h-screen bg-black text-white px-8 py-24">
      <div className="max-w-5xl mx-auto space-y-16">

        <div className="text-center space-y-4">
          <h1 className="text-5xl font-semibold">
            ChainPulse Pro
          </h1>
          <p className="text-gray-400">
            Quantitative regime intelligence for disciplined traders.
          </p>

          <div className="flex justify-center items-center gap-4 mt-6">
            <span className={!annual ? "font-semibold" : "text-gray-400"}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="bg-zinc-800 w-14 h-7 rounded-full relative"
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                  annual ? "left-8" : "left-1"
                }`}
              />
            </button>
            <span className={annual ? "font-semibold" : "text-gray-400"}>
              Annual
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <h3 className="text-xl font-semibold">Free</h3>
            <div className="text-4xl font-bold mt-6">\$0</div>
            <ul className="mt-6 space-y-2 text-gray-400 text-sm">
              <li>✔ Current Regime</li>
              <li>✔ Basic Exposure</li>
            </ul>
          </div>

          <div className="bg-zinc-900 border-2 border-white rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-semibold">Pro</h3>
            <div className="text-4xl font-bold mt-6">{proPrice}</div>
            <ul className="mt-6 space-y-2 text-gray-400 text-sm">
              <li>✔ Survival Curve</li>
              <li>✔ Hazard Modeling</li>
              <li>✔ Exposure Engine</li>
              <li>✔ Regime Shift Alerts</li>
              <li>✔ PDF Reports</li>
            </ul>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <h3 className="text-xl font-semibold">Professional</h3>
            <div className="text-4xl font-bold mt-6">{proPlusPrice}</div>
            <ul className="mt-6 space-y-2 text-gray-400 text-sm">
              <li>✔ Multi-Asset Modeling</li>
              <li>✔ Conditional Continuation</li>
              <li>✔ Transition Matrix</li>
            </ul>
          </div>

        </div>

      </div>
    </main>
  );
}