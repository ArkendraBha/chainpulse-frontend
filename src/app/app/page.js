"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const BACKEND = "https://chainpulse-backend-2xok.onrender.com"; // ✅ replace if needed

  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const [coin, setCoin] = useState("BTC");
  const [email, setEmail] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [annual, setAnnual] = useState(false);

  // ----------------------------
  // DATA FETCH
  // ----------------------------

  useEffect(() => {
    fetch(`${BACKEND}/latest?coin=${coin}`)
      .then(res => res.json())
      .then(setLatest);

    fetch(`${BACKEND}/statistics?coin=${coin}&email=${email}`)
      .then(res => res.json())
      .then(setStats);
  }, [coin, email]);

  // ----------------------------
  // STRIPE CHECKOUT HANDLER
  // ----------------------------

  const handleCheckout = async () => {
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
      });

      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      alert("Checkout failed. Try again.");
    }
  };

  // ----------------------------
  // ENABLE ALERTS
  // ----------------------------

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
        Loading Quantitative Regime Model...
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

  const blurredClass = isLocked ? "blur-md opacity-40 select-none" : "";

  const proPrice = annual ? "\$290 / year" : "\$29 / month";
  const proPlusPrice = annual ? "\$490 / year" : "\$49 / month";

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">
      <div className="max-w-5xl mx-auto">

        {/* HERO */}
        <div className="mb-14 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-semibold">
              ChainPulse Quant
            </h1>
            <p className="text-gray-400 mt-3">
              Probabilistic regime modeling for exposure optimization.
            </p>
            <p className="text-gray-600 text-sm mt-2">
              Live market data • Survival modeling • Hazard detection
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

        {/* EXPOSURE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 mb-12 shadow-xl">
          <div className="text-sm text-gray-400 uppercase">
            Exposure Allocation Recommendation
          </div>
          <div className="text-6xl font-bold mt-4">
            {exposure}%
          </div>
          <div className="text-gray-400 mt-2">
            Regime Confidence Tier:{" "}
            <span className="text-white font-semibold">
              {confidenceTier}
            </span>
          </div>
        </div>

        {/* SHIFT RISK */}
        {shiftRisk > 70 && (
          <div className="bg-red-900 border border-red-700 text-red-300 p-6 rounded-xl mb-12">
            Elevated Regime Hazard Detected.
            Survival probability deteriorating.
          </div>
        )}

        {/* ADVANCED QUANT SECTION */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl mb-20">
          <h2 className="text-xl text-gray-400 mb-8">
            Quantitative Regime Persistence Model
          </h2>

          <div className={`grid grid-cols-2 gap-10 ${blurredClass}`}>
            <div>
              <div className="text-gray-400 text-sm">
                Regime Survival Curve (Conditional)
              </div>
              <div className="text-4xl font-semibold mt-2">
                {stats.survival_probability_percent || 74}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Hazard Function (Failure Risk)
              </div>
              <div className="text-4xl font-semibold mt-2">
                {stats.hazard_percent || 21}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Historical Strength Percentile
              </div>
              <div className="text-4xl font-semibold mt-2">
                {stats.percentile_rank_percent || 82}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Regime Shift Probability
              </div>
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
                Activate Quant Pro — \$29/month
              </button>

              <div className="mt-6 text-gray-400 text-sm space-y-2">
                <div>✔ Conditional Continuation Modeling</div>
                <div>✔ Hazard Rate Detection</div>
                <div>✔ Regime Shift Alerts</div>
                <div>✔ Percentile Context Analysis</div>
                <div>✔ Exposure Optimization Engine</div>
              </div>
            </div>
          )}
        </div>

        {/* PRICING */}
        <section className="mt-10">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-semibold">Pricing</h2>

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

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold">Free</h3>
              <div className="text-4xl font-bold mt-6">\$0</div>
            </div>

            <div className="bg-zinc-900 border-2 border-white rounded-2xl p-8 shadow-2xl">
              <h3 className="text-xl font-semibold">Pro</h3>
              <div className="text-4xl font-bold mt-6">{proPrice}</div>

              <button
                onClick={handleCheckout}
                className="mt-8 w-full bg-white text-black py-3 rounded-xl font-semibold"
              >
                Upgrade to Pro
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold">Professional</h3>
              <div className="text-4xl font-bold mt-6">{proPlusPrice}</div>
            </div>

          </div>
        </section>

        {/* ALERTS */}
        <div className="mt-16 text-center space-y-4">
          <input
            type="email"
            placeholder="Enter email for regime alerts"
            className="px-4 py-2 rounded bg-zinc-800 text-white border border-zinc-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <button
              onClick={enableAlerts}
              className="bg-zinc-700 px-6 py-2 rounded-lg text-sm"
            >
              {alertsEnabled ? "Alerts Enabled ✅" : "Enable Regime Alerts"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}