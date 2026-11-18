
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Withdrawal = {
  id: string;
  amount_cad: number;
  status: string;
  created_at: string;
};

export default function WithdrawalForm({
  totalEarnings,
  availableBalance,
  withdrawals,
}: {
  totalEarnings: number;
  availableBalance: number;
  withdrawals: Withdrawal[];
}) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestKey, setRequestKey] = useState("");

  async function submitWithdrawal() {
    setMessage("");

    const requestedAmount = Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount < 100) {
      setMessage("The minimum withdrawal is $100 CAD.");
      return;
    }

    if (
      Math.round(requestedAmount * 100) !== requestedAmount * 100
    ) {
      setMessage("Enter an amount with no more than two decimal places.");
      return;
    }

    if (requestedAmount > availableBalance) {
      setMessage("Your requested amount exceeds your available balance.");
      return;
    }

    const key = requestKey || crypto.randomUUID();
    setRequestKey(key);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );

      const { error } = await supabase.rpc(
        "request_artist_withdrawal",
        {
          p_amount_cad: requestedAmount,
          p_idempotency_key: key,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Your withdrawal request was submitted successfully. It is awaiting review."
      );

      setAmount("");
      setRequestKey("");

      router.refresh();
    } catch {
      setMessage(
        "We could not confirm your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <div
        style={{
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "12px",
          marginTop: "20px",
        }}
      >
        <p className="eyebrow">WITHDRAWAL BALANCE</p>

        <h2>
          {availableBalance.toLocaleString("en-CA", {
            style: "currency",
            currency: "CAD",
          })}
        </h2>

        <p className="muted">
          Total recorded earnings:{" "}
          {totalEarnings.toLocaleString("en-CA", {
            style: "currency",
            currency: "CAD",
          })}
        </p>

        <p className="muted">
          Minimum withdrawal: $100.00 CAD
        </p>
      </div>

      <div
        style={{
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "12px",
          marginTop: "20px",
        }}
      >
        <h2>Request a Withdrawal</h2>

        {availableBalance < 100 ? (
          <p className="muted">
            You need at least $100 CAD in available earnings before you
            can request a withdrawal.
          </p>
        ) : (
          <>
            <label
              htmlFor="withdrawal-amount"
              style={{
                display: "block",
                marginTop: "14px",
                marginBottom: "8px",
              }}
            >
              Withdrawal amount (CAD)
            </label>

            <input
              id="withdrawal-amount"
              type="number"
              min="100"
              max={availableBalance}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "transparent",
                color: "inherit",
                fontSize: "16px",
              }}
            />

            <button
              type="button"
              className="primaryButton"
              onClick={submitWithdrawal}
              disabled={isSubmitting}
              style={{ marginTop: "16px" }}
            >
              {isSubmitting
                ? "Submitting..."
                : "Submit Withdrawal Request"}
            </button>
          </>
        )}

        {message && (
          <p role="status" style={{ marginTop: "16px" }}>
            {message}
          </p>
        )}
      </div>

      <div style={{ marginTop: "32px" }}>
        <p className="eyebrow">WITHDRAWAL HISTORY</p>
        <h2>My Requests</h2>

        {withdrawals.length === 0 ? (
          <p className="muted">
            You have not submitted any withdrawal requests.
          </p>
        ) : (
          <div style={{ marginTop: "16px" }}>
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                style={{
                  padding: "16px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  marginBottom: "12px",
                }}
              >
                <strong>
                  {Number(withdrawal.amount_cad).toLocaleString(
                    "en-CA",
                    {
                      style: "currency",
                      currency: "CAD",
                    }
                  )}
                </strong>

                <p className="muted">
                  Status: {withdrawal.status}
                </p>

                <p className="muted">
                  Requested:{" "}
                  {new Date(withdrawal.created_at).toLocaleDateString(
                    "en-CA"
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
