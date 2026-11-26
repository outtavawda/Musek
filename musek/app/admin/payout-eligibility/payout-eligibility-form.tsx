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
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setMessage("");
    if (eligible && !verified) {
      setMessage("Verify the creator before enabling payout eligibility.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await supabase.rpc("admin_update_creator_payout_eligibility", {
        p_creator_id: creatorId, p_verified: verified, p_eligible: eligible,
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
      <p style={{ color: "#bbb" }}>Lifetime gift earnings: CAD ${totalEarnings.toFixed(2)}</p>
      <p style={{ color: "#bbb" }}>Currently settled and withdrawable: CAD ${initialSettledBalance.toFixed(2)}</p>
      <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input type="checkbox" checked={verified} onChange={(event) => { setVerified(event.target.checked); if (!event.target.checked) setEligible(false); }} />
        Creator identity / payout verification approved
      </label>
      <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input type="checkbox" checked={eligible} disabled={!verified} onChange={(event) => setEligible(event.target.checked)} />
        Eligible to request payouts
      </label>
      <p style={{ color: "#888", fontSize: "12px" }}>Settled funds are controlled by the creator settlement ledger and cannot be manually edited here.</p>
      <button type="button" onClick={save} disabled={saving} style={{ width: "fit-content", padding: "10px 16px", borderRadius: "999px", background: "#a855f7", color: "#fff", fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : "Save payout eligibility"}
      </button>
      {message && <p role="status" style={{ color: "#d8b4fe" }}>{message}</p>}
    </div>
  );
}
