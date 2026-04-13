import Link from "next/link";

export const metadata = {
  title: "Methodology — ChainPulse",
  description: "How ChainPulse models crypto market regimes using survival analysis, hazard rates, and multi-timeframe momentum scoring.",
};

export default function Methodology() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* ── HERO ── */}
      <section className="px-6 pt-20 pb-16 border-b border-white/5">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Methodology</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
            How ChainPulse works
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
            ChainPulse does not predict price direction. It models regime persistence — quantifying how likely the current market state is to continue, and calibrating exposure to that probability.
          </p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-16">

          {/* 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono">01</div>
              <h2 className="text-xl font-semibold">Regime Classification</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Regime states are determined using a composite momentum and volatility-adjusted scoring function derived from live Binance market data. Each asset is scored across three timeframes simultaneously.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Short-term momentum", sub: "4-hour equivalent" },
                { label: "Intermediate momentum", sub: "24-hour equivalent" },
                { label: "Volatility adjustment", sub: "ATR-normalized" },
                { label: "Score normalization", sub: "−100 to +100 range" },
              ].map(({ label, sub }) => (
                <div key={label} className="border border-white/5 bg-white/[0.015] rounded-xl p-4 space-y-1">
                  <div className="text-xs font-medium text-white">{label}</div>
                  <div className="text-[10px] text-zinc-600">{sub}</div>
                </div>
              ))}
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Scores are classified into five states: <span className="text-emerald-400">Strong Risk-On</span>, <span className="text-green-400">Risk-On</span>, <span className="text-yellow-400">Neutral</span>, <span className="text-red-400">Risk-Off</span>, and <span className="text-red-500">Strong Risk-Off</span>. Each state has distinct historical characteristics for trend persistence, drawdown risk, and momentum edge.
            </p>
          </div>

          <div className="border-t border-white/5" />

          {/* 2 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono">02</div>
              <h2 className="text-xl font-semibold">Multi-Timeframe Coherence</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              ChainPulse scores each asset across three timeframes: macro (1D), trend (4H), and execution (1H). Coherence measures the directional alignment between these layers.
            </p>
            <div className="space-y-3">
              {[
                { level: "High coherence (80–100%)", desc: "All three timeframes agree. Highest-conviction signal. Maximum exposure justified.", color: "text-emerald-400", border: "border-emerald-900/40 bg-emerald-950/20" },
                { level: "Moderate coherence (50–79%)", desc: "Partial alignment. Trend exists but execution is transitional. Reduced size appropriate.", color: "text-yellow-400", border: "border-yellow-900/40 bg-yellow-950/20" },
                { level: "Low coherence (0–49%)", desc: "Conflicting timeframes. No clear directional bias. Risk reduction recommended.", color: "text-red-400", border: "border-red-900/40 bg-red-950/20" },
              ].map(({ level, desc, color, border }) => (
                <div key={level} className={`border ${border} rounded-xl p-4 space-y-1`}>
                  <div className={`text-sm font-semibold ${color}`}>{level}</div>
                  <div className="text-xs text-zinc-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* 3 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono">03</div>
              <h2 className="text-xl font-semibold">Survival Modeling</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              ChainPulse applies survival analysis to historical regime duration data. Given that a regime has lasted X hours, what is the conditional probability it continues for another Y hours?
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              This transforms regime detection from a static label into a time-aware probabilistic model. A Strong Risk-On regime that has lasted 200 hours has materially different survival characteristics than one that just started — even if the current score is identical.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Survival probability", desc: "P(regime continues | current age)" },
                { label: "Expected duration", desc: "Statistical mean remaining time" },
                { label: "Maturity phase", desc: "Early / Mid / Late / Overextended" },
              ].map(({ label, desc }) => (
                <div key={label} className="border border-white/5 bg-white/[0.015] rounded-xl p-4 space-y-1">
                  <div className="text-xs font-semibold text-white">{label}</div>
                  <div className="text-[10px] text-zinc-600 leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* 4 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono">04</div>
              <h2 className="text-xl font-semibold">Hazard Rate</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              The hazard function estimates the instantaneous probability of regime transition at any given moment. A rising hazard rate indicates increasing statistical fragility — even if the regime label has not yet changed.
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Hazard rate is expressed as a percentage relative to historical baseline for that regime type. A hazard rate above 70% indicates the regime is experiencing more deterioration pressure than 70% of historical observations at equivalent age.
            </p>
          </div>

          <div className="border-t border-white/5" />

          {/* 5 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono">05</div>
              <h2 className="text-xl font-semibold">Exposure Allocation Engine</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Recommended exposure is derived from a composite of regime strength, survival probability, hazard rate, and coherence weighting. The output is a single percentage representing the statistically appropriate deployment level.
            </p>
            <div className="border border-white/5 bg-white/[0.015] rounded-xl p-5 space-y-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Exposure formula inputs</div>
              <div className="space-y-2">
                {[
                  { input: "Regime strength magnitude", weight: "Base allocation band" },
                  { input: "Survival probability",      weight: "Persistence multiplier" },
                  { input: "Hazard rate",               weight: "Risk penalty" },
                  { input: "Coherence index",           weight: "Conviction weighting" },
                ].map(({ input, weight }) => (
                  <div key={input} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{input}</span>
                    <span className="text-zinc-600">{weight}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              This is not a signal engine. It is a risk allocation framework. The output tells you how much to deploy — not what to buy.
            </p>
          </div>

          <div className="border-t border-white/5" />

          {/* 6 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono">06</div>
              <h2 className="text-xl font-semibold">Limitations and Philosophy</h2>
            </div>
            <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
              <p>ChainPulse is a decision-support framework — not a prediction engine. Past regime behavior does not guarantee future results. The model can and does produce incorrect signals.</p>
              <p>The system is designed to counter the most common and costly behavioral error in active trading: sizing up late in mature trends and sizing down early in persistent ones. Even a modest improvement in exposure timing produces asymmetric risk-adjusted returns over time.</p>
              <p>Every input, weighting, and output formula is designed to be interpretable. This page documents the full methodology so users can make informed decisions about whether to follow the model's guidance.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-2xl font-semibold">See the model in action</h2>
          <p className="text-zinc-500 text-sm">The free tier shows live regime labels and direction for all 7 assets. No account required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/app"
              className="bg-white text-black px-8 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-all hover:-translate-y-[1px]"
            >
              Open Dashboard →
            </Link>
            <Link
              href="/pricing"
              className="border border-white/10 px-8 py-3 rounded-xl text-zinc-400 text-sm hover:border-white/20 hover:text-white transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
