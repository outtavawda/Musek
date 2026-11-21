
"use client";

import { useState } from "react";
import Link from "next/link";

const packages = [
  { coins: 100, price: "$1.00" },
  { coins: 500, price: "$5.00" },
  { coins: 1000, price: "$10.00" },
];

export default function BuyCoinsPage() {
  const [selectedPackage, setSelectedPackage] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePurchase() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          package: String(selectedPackage),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-xl">

        <Link
          href="/dashboard"
          className="mb-8 inline-block text-sm font-semibold text-purple-400 hover:text-purple-300"
        >
          ← Return to Dashboard
        </Link>

        <h1 className="mb-3 text-4xl font-bold">Buy MUSEK Coins</h1>

        <p className="mb-8 text-gray-400">
          Purchase coins to support your favourite artists.
          100 MUSEK Coins = CAD $1.00.
        </p>

        <div className="space-y-4">
          {packages.map((item) => (
            <button
              key={item.coins}
              type="button"
              onClick={() => setSelectedPackage(item.coins)}
              className={`flex w-full items-center justify-between rounded-xl border p-5 text-left transition ${
                selectedPackage === item.coins
                  ? "border-purple-500 bg-purple-950"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500"
              }`}
            >
              <span>
                <span className="block text-xl font-bold">
                  {item.coins.toLocaleString()} Coins
                </span>
                <span className="text-sm text-gray-400">
                  MUSEK Coin Package
                </span>
              </span>

              <span className="text-xl font-bold">{item.price} CAD</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-5 rounded-lg bg-red-950 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-purple-600 px-6 py-4 font-bold hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Connecting to Square..." : "Continue to Payment"}
        </button>

        <p className="mt-5 text-center text-sm text-gray-500">
          Secure checkout powered by Square.
        </p>

        <div className="mt-8 border-t border-gray-800 pt-6 text-center">
          <Link
            href="/dashboard"
            className="font-semibold text-purple-400 hover:text-purple-300"
          >
            Return to Dashboard →
          </Link>
        </div>

      </div>
    </main>
  );
}
