import Link from "next/link";

export const metadata = {
  title: "Methodology — ChainPulse",
  description: "How ChainPulse models crypto market regimes using survival analysis, hazard rates, and multi-timeframe momentum scoring.",
};

export default function Methodology() {
  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: "#080809" }}>

      {/* ── HERO ── */}
      <section className="px-6 pt-24 pb-16 border-b border-white/4">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Methodology</div>
          <h1 className="text-5xl font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
            How ChainPulse works
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed max-w-2xl">
            ChainPulse does not predict price direction. It models regime persistence —
            quantifying how likely the current market state is to continue, and calibrating
            exposure to that probability.
          </p>
          <div className="text-xs text-zinc-600 pt-2 border-t border-white/4 pt-4">
            Every input, weighting, and output formula is documented on this page.
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-0 divide-y divide-white/4">

          {[
            {
              n: "01",
              title: "Regime Classification",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Regime states are determined using a composite momentum and volatility-adjusted
                    scoring function derived from live Binance market data. Each asset is scored
                    across three timeframes simultaneously — macro (1D), trend (4H), and execution (1H).
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Short-term momentum", sub: "4-hour equivalent" },
                      { label: "Intermediate momentum", sub: "24-hour equivalent" },
                      { label: "Volatility adjustment", sub: "ATR-normalized" },
                      { label: "Score normalization", sub: "−100 to +100 range" },
                    ].map(({ label, sub }) => (
                      <div
                        key={label}
                        className="border border-white/5 rounded-xl p-4 space-y-1"
                        style={{ backgroundColor: "#0f0f10" }}
                      >
                        <div className="text-xs font-medium text-white">{label}</div>
                        <div className="text-[10px] text-zinc-600">{sub}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Scores are classified into five states:{" "}
                    <span className="text-emerald-400">Strong Risk-On</span>,{" "}
                    <span className="text-green-400">Risk-On</span>,{" "}
                    <span className="text-yellow-400">Neutral</span>,{" "}
                    <span className="text-red-400">Risk-Off</span>, and{" "}
                    <span className="text-red-500">Strong Risk-Off</span>.
                  </p>
                </div>
              ),
            },
            {
              n: "02",
              title: "Multi-Timeframe Coherence",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Coherence measures directional alignment across the three timeframe layers.
                    High coherence indicates all layers agree — highest conviction signal.
                    Fragmented coherence indicates transition noise.
                  </p>
                  <div className="space-y-2">
                    {[
                      { level: "High (80–100%)", desc: "All timeframes agree. Maximum conviction. Exposure ceiling applies.", color: "text-emerald-400", border: "border-emerald-900/30", bg: "rgba(16,185,129,0.04)" },
                      { level: "Moderate (50–79%)", desc: "Partial alignment. Regime exists but execution is transitional. Reduced size.", color: "text-yellow-400", border: "border-yellow-900/30", bg: "rgba(234,179,8,0.04)" },
                      { level: "Low (0–49%)", desc: "Conflicting timeframes. No clear directional edge. Risk reduction recommended.", color: "text-red-400", border: "border-red-900/30", bg: "rgba(239,68,68,0.04)" },
                    ].map(({ level, desc, color, border, bg }) => (
                      <div
                        key={level}
                        className={`border ${border} rounded-xl p-4 space-y-1`}
                        style={{ backgroundColor: bg }}
                      >
                        <div className={`text-sm font-semibold ${color}`}>{level}</div>
                        <div className="text-xs text-zinc-500">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              n: "03",
              title: "Survival Modeling",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    ChainPulse applies survival analysis to historical regime duration data.
                    Given that a regime has lasted X hours, what is the conditional probability
                    it continues for another Y hours?
                  </p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    This transforms regime detection from a static label into a time-aware
                    probabilistic model. A Strong Risk-On regime lasting 200 hours has materially
                    different survival characteristics than one that just started — even if the
                    current score is identical.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Survival probability", desc: "P(regime continues | current age)" },
                      { label: "Expected duration", desc: "Statistical mean remaining time" },
                      { label: "Maturity phase", desc: "Early / Mid / Late / Overextended" },
                    ].map(({ label, desc }) => (
                      <div
                        key={label}
                        className="border border-white/5 rounded-xl p-4 space-y-1"
                        style={{ backgroundColor: "#0f0f10" }}
                      >
                        <div className="text-xs font-semibold text-white">{label}</div>
                        <div className="text-[10px] text-zinc-600 leading-relaxed">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              n: "04",
              title: "Hazard Rate",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    The hazard function estimates the instantaneous probability of regime
                    transition at any given moment. A rising hazard rate indicates increasing
                    statistical fragility — even if the regime label has not yet changed.
                  </p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Hazard rate is expressed as a percentage relative to historical baseline
                    for that regime type. A hazard rate above 70% means the current regime
                    is experiencing more failure pressure than 70% of historical regimes at
                    equivalent age.
                  </p>
                  <div
                    className="border border-white/5 rounded-xl p-5"
                    style={{ backgroundColor: "#0f0f10" }}
                  >
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Key property</div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Hazard rate is a leading signal. It rises before regime transition occurs.
                      This gives traders time to reduce exposure before price confirms the shift.
                    </p>
                  </div>
                </div>
              ),
            },
            {
              n: "05",
              title: "Exposure Allocation Engine",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    The recommended exposure percentage is derived from a weighted composite
                    of regime strength, survival probability, hazard rate, and coherence.
                    The output is a single number: how much capital belongs in this regime.
                  </p>
                  <div
                    className="border border-white/5 rounded-xl p-5 space-y-3"
                    style={{ backgroundColor: "#0f0f10" }}
                  >
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Inputs</div>
                    <div className="space-y-2">
                      {[
                        { input: "Regime strength magnitude", weight: "Base allocation band" },
                        { input: "Survival probability", weight: "Persistence multiplier" },
                        { input: "Hazard rate", weight: "Risk penalty" },
                        { input: "Coherence index", weight: "Conviction weighting" },
                      ].map(({ input, weight }) => (
                        <div key={input} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">{input}</span>
                          <span className="text-zinc-600">{weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    This is not a signal engine. It is a risk allocation framework.
                    The output tells you how much to deploy — not what to buy.
                  </p>
                </div>
              ),
            },
            {
              n: "06",
              title: "Behavioral Discipline Tracking",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Every time a user logs their actual exposure, the model compares it to
                    the regime recommendation. Discipline score tracks protocol adherence
                    over time. Behavioral alpha analysis identifies specific patterns that
                    cost the user money.
                  </p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    This is the feature that most signal services do not build.
                    Knowing the regime is valuable. Knowing whether you actually followed
                    the model — and what it cost you when you didn't — is the edge.
                  </p>
                </div>
              ),
            },
            {
              n: "07",
              title: "Limitations and Philosophy",
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    ChainPulse is a decision-support framework. It is not a prediction engine
                    and does not guarantee outcomes. The model can and does produce incorrect signals.
                  </p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    The system is designed to counter the most common and costly behavioral error
                    in active trading: sizing up late in mature trends and sizing down early in
                    persistent ones. Even a modest improvement in exposure timing produces
                    asymmetric risk-adjusted returns over time.
                  </p>
                  <div
                    className="border border-white/5 rounded-xl p-4 text-xs text-zinc-600 leading-relaxed"
                    style={{ backgroundColor: "#0f0f10" }}
                  >
                    ChainPulse is a decision-support tool, not financial advice.
                    Past regime behavior does not predict future results.
                    Trade at your own risk.
                  </div>
                </div>
              ),
            },
          ].map(({ n, title, content }) => (
            <div key={n} className="py-12">
              <div className="flex items-start gap-8">
                <div className="shrink-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono text-zinc-600 border border-white/5"
                    style={{ backgroundColor: "#0f0f10" }}
                  >
                    {n}
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  {content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-16 border-t border-white/4">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight">See the model in action</h2>
          <p className="text-zinc-600 text-sm">
            The free tier shows live regime labels for all 7 assets. No account required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/app"
              className="text-black px-8 py-3 rounded-xl font-semibold text-sm hover:-translate-y-[1px] transition-all"
              style={{ backgroundColor: "#10b981" }}
            >
              Open Dashboard →
            </Link>
            <Link
              href="/pricing"
              className="border border-white/8 px-8 py-3 rounded-xl text-zinc-400 text-sm hover:border-white/15 hover:text-white transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
