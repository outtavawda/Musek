
"use client";

import { useState } from "react";
import Link from "next/link";

const packages = [
  {
    coins: 100,
    price: "$1.00",
    image: "/coins/musek-coin-100.png",
  },
  {
    coins: 500,
    price: "$5.00",
    image: "/coins/musek-coin-500.png",
  },
  {
    coins: 1000,
    price: "$10.00",
    image: "/coins/musek-coin-1000.png",
  },
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
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "white",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            color: "#805f19",
            textDecoration: "none",
            marginBottom: "35px",
            fontWeight: 600,
          }}
        >
          ← Return to Dashboard
        </Link>

        <h1
          style={{
            fontSize: "34px",
            fontWeight: 800,
            marginBottom: "12px",
          }}
        >
          Buy YASUH Coins
        </h1>

        <p
          style={{
            color: "#70695d",
            marginBottom: "35px",
            lineHeight: 1.6,
          }}
        >
          Purchase coins to support your favourite artists.
          100 YASUH Coins = CAD $1.00.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "14px",
            justifyContent: "center",
          }}
        >
          {packages.map((item) => {
            const selected = selectedPackage === item.coins;

            return (
              <button
                key={item.coins}
                type="button"
                onClick={() => setSelectedPackage(item.coins)}
                style={{
                  flex: "1 1 180px",
                  maxWidth: "260px",
                  minWidth: "0",
                  background: "#fffaf0",
                  color: "white",
                  border: selected
                    ? "2px solid #c69a35"
                    : "1px solid #e9e1d2",
                  borderRadius: "14px",
                  padding: "20px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  cursor: "pointer",
                  boxShadow: selected
                    ? "0 0 16px rgba(198,154,53,0.18)"
                    : "none",
                }}
              >
                <img
                  src={item.image}
                  alt={`${item.coins} YASUH Coins`}
                  style={{
                    width: "55px",
                    height: "55px",
                    objectFit: "contain",
                    display: "block",
                    background: "transparent",
                  }}
                />

                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                  }}
                >
                  {item.coins.toLocaleString()} Coins
                </span>

                <span
                  style={{
                    color: "#aaa",
                    fontSize: "13px",
                  }}
                >
                  YASUH Coin Package
                </span>

                <span
                  style={{
                    fontSize: "19px",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {item.price} CAD
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p
            style={{
              marginTop: "22px",
              padding: "14px",
              background: "#450a0a",
              color: "#fca5a5",
              borderRadius: "8px",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "35px",
            padding: "17px",
            background: loading ? "#b88b2b" : "linear-gradient(100deg, #e4c477, #b88b2b)",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "17px",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 0 18px rgba(198,154,53,0.24)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Connecting to Square..." : "Continue to Payment"}
        </button>

        <p
          style={{
            textAlign: "center",
            color: "#70695d",
            fontSize: "13px",
            marginTop: "18px",
            lineHeight: 1.6,
          }}
        >
          Secure checkout powered by Square.
          <br />
          By continuing, you acknowledge the{" "}
          <Link href="/policies/coins-and-gifts" style={{ color: "#805f19", textDecoration: "underline" }}>
            Coin &amp; Gift Policy
          </Link>.
        </p>

        <div
          style={{
            borderTop: "1px solid #e9e1d2",
            marginTop: "35px",
            paddingTop: "25px",
            textAlign: "center",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              color: "#b78cff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Return to Dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
