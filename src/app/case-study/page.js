export default function CaseStudy() {
  return (
    <main className="min-h-screen bg-black text-white px-8 py-20">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-4xl font-semibold">
          Regime Detection Performance Snapshot
        </h1>

        <p className="text-gray-400">
          Over the past 90 days, ChainPulse regime shift modeling identified:
        </p>

        <ul className="text-gray-400 space-y-3 list-disc list-inside">
          <li>6 elevated hazard transitions</li>
          <li>4 sustained high-coherence trend environments</li>
          <li>3 major regime deterioration signals</li>
        </ul>

        <p className="text-gray-400">
          Exposure recommendations adjusted accordingly, reducing late-stage
          trend overexposure risk.
        </p>

        <div className="text-gray-600 text-xs pt-10 border-t border-zinc-800">
          This snapshot reflects statistical regime behavior modeling, not trade
          signals or financial guarantees.
        </div>
      </div>
    </main>
  );
}
