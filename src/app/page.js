import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-black text-white">

      <section className="px-8 py-32 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto text-center space-y-10">

          <h1 className="text-6xl font-semibold leading-tight tracking-tight">
            Allocate Capital With Regime Awareness
          </h1>

          <p className="text-gray-400 text-xl max-w-3xl mx-auto">
            Statistical survival modeling for traders managing real capital.
            Press size when persistence is strong. Stand down before deterioration.
          </p>

          <div className="flex justify-center gap-6 pt-6">
            <Link
              href="/app"
              className="bg-white text-black px-8 py-4 rounded-md font-semibold"
            >
              View Live Regime
            </Link>

            <Link
              href="/methodology"
              className="border border-zinc-700 px-8 py-4 rounded-md text-gray-300"
            >
              Read Methodology
            </Link>
          </div>

        </div>
      </section>

      <section className="px-8 py-28 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-16 text-center">

          <h2 className="text-4xl font-semibold">
            Most Traders Increase Risk at the Wrong Time
          </h2>

          <p className="text-gray-400 max-w-3xl mx-auto">
            They size up late in mature trends.  
            They reduce exposure early in developing ones.  
            They ignore statistical deterioration.
          </p>

          <p className="text-gray-300 max-w-3xl mx-auto text-lg">
            ChainPulse quantifies regime persistence so exposure is allocated
            based on probability, not emotion.
          </p>

        </div>
      </section>

      <section className="px-8 py-28">
        <div className="max-w-6xl mx-auto space-y-12 text-center">

          <h2 className="text-4xl font-semibold">
            Built on Quantitative Persistence Modeling
          </h2>

          <div className="grid md:grid-cols-3 gap-12 text-gray-400 mt-12">

            <div>
              Live Binance market data  
            </div>

            <div>
              Multi‑timeframe momentum aggregation  
            </div>

            <div>
              Regime survival & hazard analysis  
            </div>

          </div>

          <div className="pt-12">
            <Link
              href="/pricing"
              className="bg-white text-black px-8 py-4 rounded-md font-semibold"
            >
              View Pricing
            </Link>
          </div>

        </div>
      </section>

    </main>
  );
}