export default function Methodology() {
  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">
      <div className="max-w-4xl mx-auto space-y-12">

        <div>
          <h1 className="text-4xl font-semibold">
            ChainPulse Quantitative Methodology
          </h1>
          <p className="text-gray-400 mt-4">
            ChainPulse is a probabilistic regime modeling system designed to
            optimize exposure allocation during shifting market environments.
            It does not predict price direction. It models regime persistence.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            1. Regime Classification Model
          </h2>
          <p className="text-gray-400">
            Regime states are determined using a composite momentum and
            volatility-adjusted scoring function derived from live Binance
            market data.
          </p>
          <ul className="text-gray-400 mt-4 space-y-2 list-disc list-inside">
            <li>Short-term momentum (4-hour equivalent)</li>
            <li>Intermediate momentum (24-hour equivalent)</li>
            <li>Volatility adjustment</li>
            <li>Score normalization (-100 to +100)</li>
          </ul>
          <p className="text-gray-400 mt-4">
            Regimes are classified into Strong Risk-On, Risk-On,
            Neutral, Risk-Off, and Strong Risk-Off.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            2. Coherence Index
          </h2>
          <p className="text-gray-400">
            Coherence measures directional alignment strength across
            regime components. High coherence environments typically
            reflect sustained trends. Low coherence environments reflect
            choppy or transitional states.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            3. Regime Survival Modeling
          </h2>
          <p className="text-gray-400">
            Historical regime durations are analyzed to compute conditional
            survival probabilities. This estimates:
          </p>
          <ul className="text-gray-400 mt-4 space-y-2 list-disc list-inside">
            <li>Probability the current regime continues</li>
            <li>Expected regime persistence</li>
            <li>Relative maturity of the current phase</li>
          </ul>
          <p className="text-gray-400 mt-4">
            This transforms regime detection into a time-aware probabilistic model.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            4. Hazard Function (Failure Risk)
          </h2>
          <p className="text-gray-400">
            The hazard rate estimates regime deterioration risk relative to
            historical averages. Rising hazard indicates statistical
            instability within the current regime state.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            5. Historical Strength Percentile
          </h2>
          <p className="text-gray-400">
            Current regime strength is ranked against historical
            observations. Percentile context allows traders to identify
            extreme environments rather than relying on raw values.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            6. Exposure Allocation Engine
          </h2>
          <p className="text-gray-400">
            Recommended exposure is derived from:
          </p>
          <ul className="text-gray-400 mt-4 space-y-2 list-disc list-inside">
            <li>Regime strength magnitude</li>
            <li>Survival probability</li>
            <li>Hazard rate penalty</li>
            <li>Coherence weighting</li>
          </ul>
          <p className="text-gray-400 mt-4">
            This is not a signal engine. It is a risk allocation framework.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Model Philosophy
          </h2>
          <p className="text-gray-400">
            Most traders increase size late in mature trends and reduce size
            early in developing ones. ChainPulse is designed to counter that
            behavioral bias through statistical regime persistence modeling.
          </p>
        </section>

        <div className="text-gray-600 text-xs pt-10 border-t border-zinc-800">
          ChainPulse is a decision-support framework. It does not guarantee
          outcomes and should not be considered financial advice.
        </div>

      </div>
    </main>
  );
}