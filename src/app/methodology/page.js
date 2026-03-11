export default function Methodology() {
  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-semibold">
          ChainPulse Quantitative Methodology
        </h1>

        <p className="text-gray-400">
          ChainPulse uses a multi-factor regime detection model based on
          momentum, volatility, coherence, and survival modeling.
        </p>

        <h2 className="text-2xl font-semibold">Regime Scoring</h2>
        <p className="text-gray-400">
          Composite score derived from short and medium-term momentum
          adjusted for volatility.
        </p>

        <h2 className="text-2xl font-semibold">Survival Modeling</h2>
        <p className="text-gray-400">
          Historical regime durations are analyzed to compute conditional
          continuation probabilities.
        </p>

        <h2 className="text-2xl font-semibold">Hazard Function</h2>
        <p className="text-gray-400">
          Hazard rate estimates probability of regime deterioration
          relative to historical averages.
        </p>

        <h2 className="text-2xl font-semibold">Exposure Engine</h2>
        <p className="text-gray-400">
          Exposure recommendations combine regime strength, coherence,
          survival probability, and hazard risk.
        </p>
      </div>
    </main>
  );
}