"use client";

import Link from "next/link";

export default function CoinGiftPolicyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        padding: "48px 20px",
      }}
    >
      <article style={{ maxWidth: 820, margin: "0 auto", lineHeight: 1.7 }}>
        <Link href="/buy-coins" style={{ color: "#c4a1ff", textDecoration: "none" }}>
          ← Back to Buy Coins
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "28px 0 8px" }}>
          YASUH Coin & Gift Policy
        </h1>
        <p style={{ color: "#aaa", marginBottom: 30 }}>
          Please review this policy before purchasing coins or sending a gift.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 28 }}>1. Coin purchases</h2>
        <ul style={{ paddingLeft: 22 }}>
          <li>Coin prices and quantities are shown before checkout. 100 YASUH Coins = CAD $1.00.</li>
          <li>Completed coin purchases are generally final and non-refundable, including unused coins, except where a refund or other remedy is required by applicable law or the payment provider.</li>
          <li>For purchases made through Apple App Store or Google Play billing, refund requests must be made through the applicable store and are subject to its rules.</li>
          <li>For purchases processed directly by YASUH or its payment processor, contact YASUH support about duplicate charges, unauthorized transactions, missing coins, or checkout errors. A valid completed purchase cannot be cancelled simply because you change your mind.</li>
          <li>If payment succeeds but coins are not credited because of a YASUH technical error, YASUH will investigate and correct the failed delivery, which may include crediting the missing coins or another remedy required by law.</li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 28 }}>2. Gifts are final</h2>
        <ul style={{ paddingLeft: 22 }}>
          <li>Once you confirm and successfully send a gift, it is final. YASUH does not offer voluntary cancellations or refunds for completed gifts.</li>
          <li>Send gifts only when you intend to make a final, voluntary contribution. A gift does not purchase a guaranteed result, service, response, or creator activity.</li>
          <li>YASUH does not reverse a completed gift merely because you change your mind or are dissatisfied with a creator's content, response, or conduct.</li>
          <li>If a gift is charged but not successfully delivered because of a YASUH technical error, YASUH will investigate and correct the failed transaction.</li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 28 }}>3. Creator responsibility</h2>
        <ul style={{ paddingLeft: 22 }}>
          <li>Creators are responsible for their own content, statements, conduct, promises, and interactions with fans.</li>
          <li>YASUH does not guarantee creator performance, insure creator activity, or act as guarantor of promises or disputes between fans and creators.</li>
          <li>YASUH does not automatically deduct alleged refund amounts from a creator's future earnings.</li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 28 }}>4. Payment disputes and legal requirements</h2>
        <p>
          This policy does not override applicable law, card-network rules, payment-provider requirements, or YASUH's responsibility for its own errors or misconduct. If a payment dispute, fraud report, payment-provider instruction, or legal requirement requires action, YASUH may investigate and take the specific action required. Such an exceptional reversal is not a voluntary gift refund.
        </p>
        <p style={{ marginTop: 12 }}>
          Any exceptional reversal will be documented, restricted to authorized personnel, and reconciled. Any recovery or adjustment involving creator earnings requires a separately reviewed legal and contractual basis and an auditable decision. Nothing in this policy limits non-waivable consumer rights.
        </p>

        <p style={{ color: "#999", fontSize: 13, marginTop: 36 }}>
          This policy is part of YASUH's platform terms and should be read together with the applicable terms and payment-provider conditions.
        </p>

        <Link
          href="/buy-coins"
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "12px 18px",
            background: "#c4a1ff",
            color: "#10091c",
            borderRadius: 9,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Return to Buy Coins
        </Link>
      </article>
    </main>
  );
}
