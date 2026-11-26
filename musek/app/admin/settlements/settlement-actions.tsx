"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SettlementActions({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function runSettlement() {
    setMessage("");
    if (disabled || busy) return;
    const confirmed = window.confirm(
      "Settle all seven-day-matured gift earnings for verified and payout-eligible creators? This changes withdrawable wallet balances but does not send bank payments."
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const batchKey = crypto.randomUUID();
      const { data, error } = await supabase.rpc("settle_creator_gift_earnings", {
        p_batch_key: batchKey,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      const result = data as { status?: string; settled_entry_count?: number; settled_total_cad?: number } | null;
      setMessage(
        result?.status === "already_processed"
          ? "This settlement batch was already processed. Refresh the page to reconcile again."
          : `Settlement completed: ${result?.settled_entry_count ?? 0} entries, CAD $${Number(result?.settled_total_cad ?? 0).toFixed(2)}. Refresh to verify the updated balances.`
      );
      window.location.reload();
    } catch {
      setMessage("Settlement request failed. Reconcile the ledger before trying again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: "24px", padding: "20px", borderRadius: "16px", border: "1px solid #71502b", background: "#1b160f" }}>
      <h2 style={{ marginTop: 0 }}>Run creator settlement</h2>
      <p style={{ color: "#c7bba8" }}>This is an admin-only accounting operation. It is idempotent per batch and only releases earnings that have passed the full seven-day hold.</p>
      <button type="button" onClick={runSettlement} disabled={disabled || busy} style={{ padding: "12px 18px", borderRadius: "999px", border: 0, fontWeight: 800, color: "#17120a", background: disabled || busy ? "#766d60" : "#e6b75b", cursor: disabled || busy ? "not-allowed" : "pointer" }}>
        {busy ? "Settling..." : "Settle matured creator earnings"}
      </button>
      {disabled && <p style={{ color: "#fca5a5" }}>Settlement unavailable until reconciliation succeeds with zero mismatches.</p>}
      {message && <p role="status" style={{ color: "#f5d38b" }}>{message}</p>}
    </section>
  );
}
