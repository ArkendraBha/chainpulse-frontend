export default function Pricing() {
  return (
    <main className="min-h-screen bg-black text-white px-8 py-32">
      <div className="max-w-5xl mx-auto text-center space-y-16">

        <h1 className="text-5xl font-semibold">
          ChainPulse Pro
        </h1>

        <p className="text-gray-400 text-xl">
          For traders allocating real capital.
        </p>

        <div className="border border-white p-16 space-y-8">

          <div className="text-5xl font-semibold">
            \$29<span className="text-lg text-gray-400"> / month</span>
          </div>

          <p className="text-gray-400">
            Less than one poorly timed position.
          </p>

          <ul className="text-gray-300 space-y-3">
            <li>Survival modeling</li>
            <li>Hazard detection</li>
            <li>Exposure optimization</li>
            <li>Shift alerts</li>
            <li>Weekly regime reports</li>
          </ul>

          <button className="bg-white text-black px-8 py-4 rounded-md font-semibold">
            Activate Pro
          </button>

        </div>

      </div>
    </main>
  );
}