
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  withdrawalId: string;
  status: string;
};

export default function WithdrawalActions({
  withdrawalId,
  status,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [payoutReference, setPayoutReference] = useState("");

  async function updateStatus(
    newStatus: "approved" | "rejected" | "processing" | "paid"
  ) {
    setMessage("");

    if (newStatus === "rejected" && !adminNote.trim()) {
      setMessage("Please enter a rejection reason.");
      return;
    }

    if (newStatus === "paid" && !payoutReference.trim()) {
      setMessage("Please enter the payout reference.");
      return;
    }

    const confirmation = window.confirm(
      `Are you sure you want to ${newStatus} this withdrawal request?`
    );

    if (!confirmation) return;

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "admin_update_withdrawal",
        {
          p_withdrawal_id: withdrawalId,
          p_new_status: newStatus,
          p_admin_note: adminNote.trim() || null,
          p_payout_reference: payoutReference.trim() || null,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Withdrawal status updated successfully.");

      window.location.reload();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "20px",
        paddingTop: "16px",
        borderTop: "1px solid #444",
      }}
    >
      {status === "pending" && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => updateStatus("approved")}
            style={{
              padding: "10px 16px",
              marginRight: "10px",
              background: "#166534",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Approve
          </button>

          <div style={{ marginTop: "16px" }}>
            <label htmlFor={`rejection-${withdrawalId}`}>
              Rejection reason
            </label>

            <textarea
              id={`rejection-${withdrawalId}`}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Explain why this request is rejected"
              rows={3}
              style={{
                display: "block",
                width: "100%",
                maxWidth: "450px",
                marginTop: "8px",
                padding: "10px",
                borderRadius: "8px",
              }}
            />

            <button
              type="button"
              disabled={loading}
              onClick={() => updateStatus("rejected")}
              style={{
                marginTop: "10px",
                padding: "10px 16px",
                background: "#991b1b",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Reject Request
            </button>
          </div>
        </>
      )}

      {status === "approved" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => updateStatus("processing")}
          style={{
            padding: "10px 16px",
            background: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Mark as Processing
        </button>
      )}

      {status === "processing" && (
        <div>
          <label htmlFor={`reference-${withdrawalId}`}>
            Payout reference
          </label>

          <input
            id={`reference-${withdrawalId}`}
            value={payoutReference}
            onChange={(event) =>
              setPayoutReference(event.target.value)
            }
            placeholder="Enter bank transfer reference"
            style={{
              display: "block",
              width: "100%",
              maxWidth: "350px",
              marginTop: "8px",
              padding: "10px",
              borderRadius: "8px",
            }}
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => updateStatus("paid")}
            style={{
              marginTop: "10px",
              padding: "10px 16px",
              background: "#166534",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Mark as Paid
          </button>
        </div>
      )}

      {status === "paid" && (
        <p style={{ color: "#16a34a" }}>
          Payment marked as paid.
        </p>
      )}

      {status === "rejected" && (
        <p style={{ color: "#dc2626" }}>
          This withdrawal request was rejected.
        </p>
      )}

      {message && (
        <p style={{ marginTop: "12px" }}>
          {message}
        </p>
      )}

      {loading && <p>Updating withdrawal...</p>}
    </div>
  );
}
