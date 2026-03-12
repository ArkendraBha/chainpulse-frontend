export default function Pricing() {
const handleCheckout = async () => {
  try {
    const res = await fetch(
      "https://chainpulse-backend-2xok.onrender.com/create-checkout-session",
      {
        method: "POST",
      }
    );

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout session failed.");
    }
  } catch (err) {
    console.error(err);
    alert("Checkout error.");
  }
};
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
            $29<span className="text-lg text-gray-400"> / month</span>
          </div>
<div className="text-gray-500 text-sm mt-2">
  Early Access Pricing — Subject to Increase
</div>
<div className="text-gray-500 text-xs mt-3">
  Designed for traders managing \$5,000+.
</div>

          <p className="text-gray-400">
            Less than one poorly timed position.
          </p>

          <ul className="text-gray-300 space-y-3 mt-6">
  <li>✔ Avoid late-stage overexposure</li>
  <li>✔ Detect regime deterioration early</li>
  <li>✔ Allocate capital statistically</li>
  <li>✔ Reduce emotional sizing mistakes</li>
            <li>Exposure optimization</li>
            <li>Shift alerts</li>
            <li>Weekly regime reports</li>
          </ul>

          <button
  onClick={handleCheckout}
  className="bg-white text-black px-8 py-4 rounded-md font-semibold"
>
  Activate Pro — \$29/month
</button>
<div className="text-gray-500 text-sm mt-4">
  7-Day Risk-Free Access. Cancel anytime.
</div>
        </div>

      </div>
    </main>
  );
}