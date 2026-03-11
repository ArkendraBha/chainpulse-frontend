"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const BACKEND = "https://chainpulse-backend-2xok.onrender.com"; 

  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const [coin, setCoin] = useState("BTC");
  const [email, setEmail] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [annual, setAnnual] = useState(false);

  // ✅ FETCH DATA
  useEffect(() => {
    fetch(`${BACKEND}/latest?coin=${coin}`)
      .then(res => res.json())
      .then(setLatest);

    fetch(`${BACKEND}/statistics?coin=${coin}&email=${email}`)
      .then(res => res.json())
      .then(setStats);
  }, [coin, email]);

  // ✅ STRIPE CHECKOUT
  const handleCheckout = async () => {
    const res = await fetch(`${BACKEND}/create-checkout-session`, {
      method: "POST",
    });
    const data = await res.json();
    window.location.href = data.url;
  };

  // ✅ ENABLE ALERTS
  const enableAlerts = async () => {
    if (!email) {
      alert("Enter your email first.");
      return;
    }

    await fetch(`${BACKEND}/enable-alerts?email=${email}`, {
      method: "POST",
    });

    setAlertsEnabled(true);
    alert("Regime shift alerts enabled.");
  };

  if (!latest || !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Loading Regime Intelligence...
      </div>
    );
  }

  const exposure = stats.exposure_recommendation_percent || 0;
  const isLocked = stats.pro_required;
  const shiftRisk = stats.regime_shift_risk_percent || 0;

  const confidenceTier =
    exposure > 60
      ? "Aggressive"
      : exposure > 30
      ? "Balanced"
      : "Defensive";

  const exposureMessage =
    exposure < 20
      ? "Market conditions are statistically unfavorable for aggressive positioning."
      : exposure < 60
      ? "Moderate persistence detected. Controlled exposure recommended."
      : "High persistence environment. Favorable for size deployment.";

  const blurredClass = isLocked ? "blur-md opacity-40 select-none" : "";

  const proPrice = annual ? "\$290 / year" : "\$29 / month";
  const proPlusPrice = annual ? "\$490 / year" : "\$49 / month";

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-14 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-semibold">
              Regime-Based Exposure Intelligence
            </h1>
            <p className="text-gray-400 mt-3">
              Reduce drawdowns. Deploy size with conviction.
            </p>
          </div>

          <div className="flex bg-zinc-800 rounded-lg p-1">
            {["BTC", "ETH"].map(c => (
              <button
                key={c}
                onClick={() => setCoin(c)}
                className={`px-4 py-2 rounded-lg ${
                  coin === c
                    ? "bg-white text-black"
                    : "text-gray-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* EXPOSURE PANEL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 mb-10 shadow-xl">
          <div className="text-sm text-gray-400 uppercase">
            Recommended Exposure
          </div>
          <div className="text-6xl font-bold mt-4">
            {exposure}%
          </div>
          <div className="text-gray-400 mt-2">
            Confidence Tier:{" "}
            <span className="text-white font-semibold">
              {confidenceTier}
            </span>
          </div>
          <div className="text-gray-500 mt-4 text-sm">
            {exposureMessage}
          </div>
        </div>

        {/* SHIFT ALERT */}
        {shiftRisk > 70 && (
          <div className="bg-red-900 border border-red-700 text-red-300 p-6 rounded-xl mb-10">
            Elevated Regime Shift Risk detected. Statistical deterioration underway.
          </div>
        )}

        {/* PRO SECTION */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl mb-20">
          <h2 className="text-xl text-gray-400 mb-8">
            Institutional Regime Analytics
          </h2>

          <div className={`grid grid-cols-2 gap-10 ${blurredClass}`}>
            <div>
              <div className="text-gray-400 text-sm">Survival Probability</div>
              <div className="text-4xl font-semibold mt-2">
                {stats.survival_probability_percent || 74}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">Hazard Rate</div>
              <div className="text-4xl font-semibold mt-2">
                {stats.hazard_percent || 21}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">Strength Percentile</div>
              <div className="text-4xl font-semibold mt-2">
                {stats.percentile_rank_percent || 82}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">Regime Shift Risk</div>
              <div className="text-4xl font-semibold mt-2">
                {shiftRisk || 19}%
              </div>
            </div>
          </div>

          {isLocked && (
            <div className="mt-10 text-center">
              <button
                onClick={handleCheckout}
                className="bg-white text-black px-8 py-3 rounded-xl font-semibold text-lg"
              >
                Start Trading With Regime Edge — \$29/month
              </button>

              <div className="mt-6 text-gray-400 text-sm space-y-2">
                <div>✔ Exposure Optimization Engine</div>
                <div>✔ Survival & Hazard Modeling</div>
                <div>✔ Regime Shift Alerts</div>
                <div>✔ Strength Percentile Context</div>
                <div>✔ Institutional Persistence Analytics</div>
              </div>
            </div>
          )}
        </div>

        {/* PRICING SECTION */}
        <section className="mt-10 text-white">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-semibold">Pricing</h2>
            <p className="text-gray-400 mt-3">
              Less than one bad trade per month.
            </p>

            <div className="mt-6 flex justify-center items-center gap-4">
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

            {/* FREE */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold">Free</h3>
              <div className="text-4xl font-bold mt-6">\$0</div>
              <ul className="mt-6 space-y-2 text-gray-400 text-sm">
                <li>✔ Current Regime</li>
                <li>✔ Exposure %</li>
                <li>✔ Basic Coherence</li>
              </ul>
            </div>

            {/* PRO */}
            <div className="bg-zinc-900 border-2 border-white rounded-2xl p-8 relative shadow-2xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 text-sm rounded-full font-semibold">
                ⭐ Most Popular
              </div>

              <h3 className="text-xl font-semibold">Pro</h3>
              <div className="text-4xl font-bold mt-6">{proPrice}</div>

              <ul className="mt-6 space-y-2 text-gray-400 text-sm">
                <li>✔ Survival Modeling</li>
                <li>✔ Hazard Detection</li>
                <li>✔ Shift Alerts</li>
                <li>✔ Exposure Engine</li>
              </ul>

              <button
                onClick={handleCheckout}
                className="mt-8 w-full bg-white text-black py-3 rounded-xl font-semibold"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* PROFESSIONAL */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold">Professional</h3>
              <div className="text-4xl font-bold mt-6">{proPlusPrice}</div>

              <ul className="mt-6 space-y-2 text-gray-400 text-sm">
                <li>✔ Conditional Continuation</li>
                <li>✔ Transition Matrix</li>
                <li>✔ Historical Export</li>
              </ul>
            </div>

          </div>
        </section>

        {/* EMAIL + ALERTS */}
        <div className="mt-16 text-center space-y-4">
          <input
            type="email"
            placeholder="Enter email for alerts"
            className="px-4 py-2 rounded bg-zinc-800 text-white border border-zinc-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <button
              onClick={enableAlerts}
              className="bg-zinc-700 px-6 py-2 rounded-lg text-sm"
            >
              {alertsEnabled ? "Alerts Enabled ✅" : "Enable Regime Shift Alerts"}
            </button>
          </div>
        </div>

        <div className="text-gray-600 text-xs mt-16 text-center">
          Decision-support tool. Not financial advice.
        </div>
      </div>
    </main>
  );
}