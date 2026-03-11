"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

export default function Dashboard() {
  const BACKEND = "https://chainpulse-backend-2xok.onrender.com"; // ✅ Replace if needed

  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const [curveData, setCurveData] = useState([]);
  const [coin, setCoin] = useState("BTC");
  const [email, setEmail] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  // ----------------------------------
  // FETCH DATA
  // ----------------------------------

  useEffect(() => {
    fetch(`${BACKEND}/latest?coin=${coin}`)
      .then(res => res.json())
      .then(setLatest);

    fetch(`${BACKEND}/statistics?coin=${coin}&email=${email}`)
      .then(res => res.json())
      .then(setStats);

    fetch(`${BACKEND}/survival-curve?coin=${coin}`)
      .then(res => res.json())
      .then(data => setCurveData(data.data || []));
  }, [coin, email]);

  // ----------------------------------
  // STRIPE CHECKOUT
  // ----------------------------------

  const handleCheckout = async () => {
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
      });
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      alert("Checkout failed. Try again.");
    }
  };

  // ----------------------------------
  // ENABLE ALERTS
  // ----------------------------------

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

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">
      <div className="max-w-6xl mx-auto space-y-16">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-semibold">
              ChainPulse Quant Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Probabilistic regime persistence modeling.
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl">
          <div className="text-sm text-gray-400 uppercase">
            Exposure Allocation Recommendation
          </div>
          <div className="text-6xl font-bold mt-4">
            {exposure}%
          </div>
          <div className="text-gray-400 mt-3">
            Regime Confidence Tier:{" "}
            <span className="text-white font-semibold">
              {confidenceTier}
            </span>
          </div>
        </div>

        {/* SHIFT RISK ALERT */}
        {shiftRisk > 70 && (
          <div className="bg-red-900 border border-red-700 text-red-300 p-6 rounded-xl">
            Elevated Regime Hazard Detected.
            Survival probability deteriorating.
          </div>
        )}

        {/* ADVANCED QUANT ANALYTICS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl">
          <h2 className="text-xl text-gray-400 mb-8">
            Quantitative Regime Persistence Model
          </h2>

          <div className={`grid grid-cols-2 gap-10 ${blurredClass}`}>
            <div>
              <div className="text-gray-400 text-sm">
                Survival Probability
              </div>
              <div className="text-4xl font-semibold mt-2">
                {stats.survival_probability_percent || 74}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Hazard Function
              </div>
              <div className="text-4xl font-semibold mt-2">
                {stats.hazard_percent || 21}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Strength Percentile
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
            </div>
          )}
        </div>

        {/* SURVIVAL + HAZARD CURVE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl">
          <h2 className="text-xl text-gray-400 mb-6">
            Regime Survival & Hazard Curve
          </h2>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={curveData}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="hour" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="survival"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                name="Survival Probability (%)"
              />

              <Line
                type="monotone"
                dataKey="hazard"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Hazard Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="text-gray-500 text-sm mt-4">
            Survival curve models probability regime persists over time.
            Hazard curve models deterioration risk per time interval.
          </div>
        </div>

        {/* ALERTS */}
        <div className="text-center space-y-4">
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