import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-black text-white px-8 py-24">
      <div className="max-w-5xl mx-auto text-center space-y-12">

        <h1 className="text-6xl font-semibold leading-tight">
          Regime-Based Exposure Intelligence
        </h1>

        <p className="text-gray-400 text-xl">
          Quantitative persistence modeling for disciplined swing traders.
        </p>

        <div className="flex justify-center gap-6">
          <Link
            href="/app"
            className="bg-white text-black px-8 py-4 rounded-xl font-semibold"
          >
            Open Dashboard
          </Link>

          <Link
            href="/methodology"
            className="border border-zinc-700 px-8 py-4 rounded-xl"
          >
            View Methodology
          </Link>
        </div>

        <div className="pt-16 text-gray-400 text-sm">
          Live market data • Survival modeling • Hazard detection • Exposure optimization
        </div>
      </div>
    </main>
  );
}