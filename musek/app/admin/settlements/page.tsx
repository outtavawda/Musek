import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettlementActions from "./settlement-actions";

type ReconciliationRow = {
  creator_id: string;
  wallet_total_earnings_cad: number;
  ledger_earnings_cad: number;
  wallet_settled_balance_cad: number;
  ledger_expected_settled_cad: number;
  pending_eligible_cad: number;
  pending_hold_cad: number;
  earnings_match: boolean;
  settled_balance_match: boolean;
};

const money = (value: number) => `CAD $${Number(value || 0).toFixed(2)}`;

export default async function AdminSettlementsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase.from("admin_users")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/dashboard");

  const { data, error } = await supabase.rpc("reconcile_creator_wallet_ledger");
  const rows = (data || []) as ReconciliationRow[];
  const mismatches = rows.filter((row) => !row.earnings_match || !row.settled_balance_match).length;
  const matured = rows.reduce((sum, row) => sum + Number(row.pending_eligible_cad || 0), 0);
  const onHold = rows.reduce((sum, row) => sum + Number(row.pending_hold_cad || 0), 0);

  return (
    <main style={{ maxWidth: "1180px", minHeight: "100vh", margin: "0 auto", padding: "36px 24px", color: "#f8f7ff", background: "#080811" }}>
      <Link href="/admin/withdrawals" style={{ color: "#d8b4fe" }}>← Back to withdrawals</Link>
      <h1 style={{ fontSize: "36px", fontWeight: 900, marginTop: "24px" }}>Creator gift settlements</h1>
      <p style={{ color: "#999", maxWidth: "760px" }}>Gift earnings mature after seven full days. Only creators whose identity and payout eligibility are approved can receive a settlement into their withdrawable CAD balance.</p>
      <SettlementActions disabled={Boolean(error) || rows.length === 0 || mismatches > 0} />
      {error ? (
        <p role="alert" style={{ color: "#fca5a5" }}>Could not reconcile creator wallets: {error.message}</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "12px", margin: "24px 0" }}>
            <section style={{ padding: "18px", borderRadius: "14px", background: "#171426", border: "1px solid #49355f" }}>
              <p style={{ color: "#aaa", margin: 0 }}>Matured, awaiting settlement</p><strong style={{ fontSize: "24px" }}>{money(matured)}</strong>
            </section>
            <section style={{ padding: "18px", borderRadius: "14px", background: "#171426", border: "1px solid #49355f" }}>
              <p style={{ color: "#aaa", margin: 0 }}>Still in seven-day hold</p><strong style={{ fontSize: "24px" }}>{money(onHold)}</strong>
            </section>
            <section style={{ padding: "18px", borderRadius: "14px", background: "#171426", border: "1px solid #49355f" }}>
              <p style={{ color: "#aaa", margin: 0 }}>Wallet / ledger mismatches</p><strong style={{ fontSize: "24px", color: mismatches ? "#fca5a5" : "#86efac" }}>{mismatches}</strong>
            </section>
          </div>
          {mismatches > 0 && <p role="alert" style={{ color: "#fca5a5" }}>Settlement is disabled until every wallet/ledger mismatch is investigated and resolved.</p>}
          {rows.length === 0 ? <p>No creator wallet records to reconcile.</p> : (
            <div style={{ display: "grid", gap: "12px" }}>
              {rows.map((row) => (
                <section key={row.creator_id} style={{ padding: "18px", borderRadius: "14px", background: "#11101d", border: "1px solid #352744" }}>
                  <p style={{ color: "#999", fontSize: "12px", overflowWrap: "anywhere" }}>{row.creator_id}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "8px" }}>
                    <p>Wallet lifetime: <strong>{money(row.wallet_total_earnings_cad)}</strong></p>
                    <p>Ledger lifetime: <strong>{money(row.ledger_earnings_cad)}</strong></p>
                    <p>Wallet settled: <strong>{money(row.wallet_settled_balance_cad)}</strong></p>
                    <p>Ledger expected: <strong>{money(row.ledger_expected_settled_cad)}</strong></p>
                    <p>Matured, not settled: <strong>{money(row.pending_eligible_cad)}</strong></p>
                    <p>In seven-day hold: <strong>{money(row.pending_hold_cad)}</strong></p>
                  </div>
                  <p style={{ color: row.earnings_match && row.settled_balance_match ? "#86efac" : "#fca5a5" }}>
                    {row.earnings_match && row.settled_balance_match ? "Reconciliation matched" : "RECONCILIATION MISMATCH — investigate before settlement"}
                  </p>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      <p style={{ color: "#777", fontSize: "12px", marginTop: "28px" }}>This screen does not initiate bank transfers. Settlement only moves matured eligible earnings into the creator’s YASUH withdrawable balance. The separate withdrawal workflow still requires an authorized payout and reference.</p>
    </main>
  );
}
