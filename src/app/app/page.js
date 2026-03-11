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
  ReferenceLine
} from "recharts";

export default function Dashboard() {
  const BACKEND = "https://chainpulse-backend-2xok.onrender.com";

  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const [curveData, setCurveData] = useState([]);
  const [coin, setCoin] = useState("BTC");

  useEffect(() => {
    fetch(`${BACKEND}/latest?coin=${coin}`)
      .then(res => res.json())
      .then(setLatest);

    fetch(`${BACKEND}/statistics?coin=${coin}`)
      .then(res => res.json())
      .then(setStats);

    fetch(`${BACKEND}/survival-curve?coin=${coin}`)
      .then(res => res.json())
      .then(data => setCurveData(data.data || []));
  }, [coin]);

  if (!latest || !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
        Loading Regime Model...
      </div>
    );
  }

  const exposure = stats.exposure_recommendation_percent || 0;
const confidenceTier =
  exposure > 60
    ? "Aggressive"
    : exposure > 30
    ? "Balanced"
    : "Defensive";
  const regimeAge = stats.current_regime_age_hours || 0;

  return (
    <main className="min-h-screen bg-black text-white px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-20">

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">
            Regime Allocation Model
          </h1>

          <div className="flex gap-4">
            {["BTC", "ETH"].map(c => (
              <button
                key={c}
                onClick={() => setCoin(c)}
                className={`px-4 py-2 rounded-md ${
                  coin === c
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-gray-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-zinc-900 p-16 text-center">
          <div className="text-sm text-gray-500 uppercase">
            Exposure Allocation
          </div>
          <div className="text-6xl font-semibold mt-6">
            {exposure}%
          </div>
          <div className="text-gray-500 mt-6">
            Regime Active: {regimeAge.toFixed(1)} hours
          </div>
<div className="text-gray-400 text-sm mt-4">
  You are currently operating in a{" "}
  <span className="text-white font-semibold">
    {confidenceTier}
  </span>{" "}
  regime.
</div>

{isLocked && (
  <div className="text-gray-500 text-sm mt-2">
    Pro users receive real-time deterioration alerts.
  </div>
)}
        </div>

        <div className="border border-zinc-900 p-16">
          <h2 className="text-xl font-semibold mb-8">
            Regime Survival Curve
          </h2>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={curveData}>
              <CartesianGrid stroke="#18181b" />
              <XAxis dataKey="hour" stroke="#52525b" />
              <YAxis stroke="#52525b" />
              <Tooltip />

              <Line
                type="monotone"
                dataKey="survival"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />

              <ReferenceLine
                x={Math.round(regimeAge)}
                stroke="#ffffff"
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </main>
  );
}