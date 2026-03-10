"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
);

export default function Home() {

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("https://chainpulse-backend-80xy.onrender.com/latest")
      .then(res => res.json())
      .then(setData);

    fetch("https://chainpulse-backend-80xy.onrender.com/history")
      .then(res => res.json())
      .then(setHistory);

  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Initializing ChainPulse...
      </div>
    );
  }

  const score = data.score || 0;

  const determineRegime = (value) => {
    if (value > 35) return "Strong Risk-On";
    if (value > 15) return "Risk-On";
    if (value < -35) return "Strong Risk-Off";
    if (value < -15) return "Risk-Off";
    return "Neutral";
  };

  const currentRegime = determineRegime(score);

  // === Regime Change Detection ===

  let lastFlipTime = null;
  let regimeDuration = "—";
  let isFreshFlip = false;

  if (history.length > 1) {
    for (let i = 1; i < history.length; i++) {
      const pastRegime = determineRegime(history[i].score);
      if (pastRegime !== currentRegime) {
        lastFlipTime = new Date(history[i].timestamp + "Z");
        break;
      }
    }

    if (lastFlipTime) {
      const now = new Date();
      const diffMs = now - lastFlipTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      regimeDuration = `${Math.floor(diffHours)}h`;

      if (diffHours <= 6) {
        isFreshFlip = true;
      }
    }
  }

  const regimeColor =
    currentRegime.includes("Risk-On")
      ? "bg-green-500"
      : currentRegime.includes("Risk-Off")
      ? "bg-red-500"
      : "bg-gray-500";

  const chartData = {
    labels: history.map(h =>
      new Date(h.timestamp + "Z").toLocaleTimeString()
    ).reverse(),
    datasets: [
      {
        data: history.map(h => h.score).reverse(),
        borderColor: "#22c55e",
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: {
        grid: { color: "#27272a" },
        ticks: { color: "#71717a" }
      }
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-6xl mx-auto">

        <div className="mb-16">
          <h1 className="text-5xl font-semibold">
            ChainPulse
          </h1>
          <p className="text-gray-400 mt-4 text-xl">
            Swing Regime Detection Engine
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-xl">

          <div className={`h-1 ${regimeColor}`}></div>

          <div className="bg-zinc-900 p-12 border border-zinc-800">

            <div className="flex justify-between items-center">

              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">
                  Current Regime
                </div>

                <div className="text-4xl font-semibold mt-3 flex items-center gap-4">
                  {currentRegime}

                  {isFreshFlip && (
                    <span className="text-xs bg-yellow-500 text-black px-3 py-1 rounded-full">
                      Fresh Flip
                    </span>
                  )}

                </div>

                <div className="text-gray-400 mt-4">
                  Active for: {regimeDuration}
                </div>

                {lastFlipTime && (
                  <div className="text-gray-500 text-sm mt-2">
                    Last change: {lastFlipTime.toLocaleString()}
                  </div>
                )}

              </div>

              <div className="text-5xl font-bold">
                {score}
              </div>

            </div>

          </div>

        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mt-16">

          <h2 className="text-xl text-gray-400 mb-8">
            Regime Trend
          </h2>

          <Line data={chartData} options={chartOptions} />

        </div>

      </div>

    </main>
  );
}