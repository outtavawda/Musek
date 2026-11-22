"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function PayoutEligibilityForm({
  creatorId, totalEarnings, initialSettledBalance, initialVerified, initialEligible,
}: {
  creatorId: string; totalEarnings: number; initialSettledBalance: number;
  initialVerified: boolean; initialEligible: boolean;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [eligible, setEligible] = useState(initialEligible);
  const [settled, setSettled] = useState(String(initialSettledBalance.toFixed(2)));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setMessage("");
    const settledAmount = Number(settled);
    if (!Number.isFinite(settledAmount) || settledAmount < 0 || Math.round(settledAmount * 100) !== settledAmount * 100) {
      setMessage("Enter a valid settled CAD amount with up to two decimal places.");
      return;
    }
    if (eligible && !verified) {
      setMessage("Verify the creator before enabling payout eligibility.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await supabase.rpc("admin_set_creator_payout_eligibility", {
        p_creator_id: creatorId, p_verified: verified, p_eligible: eligible,
        p_settled_balance_cad: settledAmount,
      });
      if (error) { setMessage(error.message); return; }
      setMessage("Creator payout settings saved.");
    } catch {
      setMessage("Could not save creator payout settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
      <p style={{ color: "#bbb" }}>Recorded lifetime earnings: CAD ${totalEarnings.toFixed(2)}</p>
      <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input type="checkbox" checked={verified} onChange={(event) => { setVerified(event.target.checked); if (!event.target.checked) setEligible(false); }} />
        Creator identity / payout verification approved
      </label>
      <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input type="checkbox" checked={eligible} disabled={!verified} onChange={(event) => setEligible(event.target.checked)} />
        Eligible to request payouts
      </label>
      <label style={{ display: "grid", gap: "6px", maxWidth: "320px" }}>
        Settled funds (CAD)
        <input type="number" min="0" step="0.01" value={settled} onChange={(event) => setSettled(event.target.value)} style={{ padding: "10px", borderRadius: "8px", color: "#fff", background: "#090812", border: "1px solid #51436b" }} />
      </label>
      <p style={{ color: "#888", fontSize: "12px" }}>Only reconcile funds that have actually settled and are available for payout. Existing reserved withdrawals cannot be underfunded.</p>
      <button type="button" onClick={save} disabled={saving} style={{ width: "fit-content", padding: "10px 16px", borderRadius: "999px", background: "#a855f7", color: "#fff", fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : "Save payout eligibility"}
      </button>
      {message && <p role="status" style={{ color: "#d8b4fe" }}>{message}</p>}
    </div>
  );
}
