"use client";

import Link from "next/link";

export default function TrackRecord() {
  const sampleData = [
    {
      date: "2024-03-12",
      regime: "Strong Risk-Off",
      exposure: "25%",
      outcome: "-14% BTC drop next 7 days",
      avoided: "Approx. 10–15% drawdown avoided",
    },
    {
      date: "2024-01-28",
      regime: "Risk-On",
      exposure: "70%",
      outcome: "+18% BTC rally next 10 days",
      avoided: "Captured majority of move",
    },
    {
      date: "2023-11-04",
      regime: "Strong Risk-Off",
      exposure: "10%",
      outcome: "-11% correction",
      avoided: "Protected capital",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-5xl mx-auto space-y-16">

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Model Track Record
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Historical examples of regime transitions and exposure guidance.
          </p>
        </div>

        <div className="space-y-6">
          {sampleData.map((item, i) => (
            <div
              key={i}
              className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
            >
              <div className="flex justify-between items-center">
                <div className="text-sm text-zinc-500">
                  {item.date}
                </div>
                <div className="text-sm font-semibold text-emerald-400">
                  Exposure: {item.exposure}
                </div>
              </div>

              <div className="text-lg font-semibold">
                Regime: {item.regime}
              </div>

              <div className="text-sm text-zinc-400">
                Market outcome: {item.outcome}
              </div>

              <div className="text-sm text-zinc-300">
                Result: {item.avoided}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-8">
          <Link
            href="/pricing"
            className="bg-white text-black px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-[1px] transition-all"
          >
            Start Using Full Regime Intelligence
          </Link>
        </div>

      </div>
    </main>
  );
}