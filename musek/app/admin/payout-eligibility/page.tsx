import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayoutEligibilityForm from "./payout-eligibility-form";

type Artist = { id: string; display_name: string | null; artist_name: string | null };
type Wallet = { user_id: string; total_earnings_cad: number; settled_balance_cad: number; payout_verified: boolean; payout_eligible: boolean };

export default async function AdminPayoutEligibilityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/dashboard");

  const { data: artistData, error: artistError } = await supabase
    .from("user_profiles").select("id, display_name, artist_name")
    .eq("account_type", "artist").order("display_name");
  const artists = (artistData || []) as Artist[];
  const ids = artists.map((artist) => artist.id);

  const { data: walletData, error: walletError } = ids.length
    ? await supabase.from("creator_wallets")
        .select("user_id, total_earnings_cad, settled_balance_cad, payout_verified, payout_eligible")
        .in("user_id", ids)
    : { data: [], error: null };
  const wallets = (walletData || []) as Wallet[];
  const walletByUser = new Map(wallets.map((wallet) => [wallet.user_id, wallet]));

  return (
    <main className="admin-shell" style={{ maxWidth: "1100px", minHeight: "100vh", margin: "0 auto", padding: "36px 24px", color: "#f8f7ff", background: "#080811" }}>
      <Link href="/admin/withdrawals" style={{ color: "#d8b4fe" }}>← Back to withdrawals</Link>
      <h1 style={{ fontSize: "36px", fontWeight: 900, marginTop: "24px" }}>Creator payout verification</h1>
      <p style={{ color: "#999", marginBottom: "28px" }}>Verify creators, approve payout eligibility, and reconcile settled CAD funds. Only verified and eligible creators can request withdrawals.</p>
      {artistError || walletError ? <p>Could not load creator payout records.</p> : artists.length === 0 ? <p>No artist accounts found.</p> : (
        <div style={{ display: "grid", gap: "16px" }}>
          {artists.map((artist) => {
            const wallet = walletByUser.get(artist.id);
            return (
              <section key={artist.id} style={{ border: "1px solid rgba(168,85,247,.2)", borderRadius: "18px", padding: "20px", background: "#11101d" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 800 }}>{artist.artist_name || artist.display_name || "Artist"}</h2>
                <p style={{ color: "#888", fontSize: "12px", wordBreak: "break-all" }}>{artist.id}</p>
                {!wallet ? <p style={{ color: "#aaa" }}>Creator wallet has not been created yet.</p> : (
                  <PayoutEligibilityForm creatorId={artist.id}
                    totalEarnings={Number(wallet.total_earnings_cad || 0)}
                    initialSettledBalance={Number(wallet.settled_balance_cad || 0)}
                    initialVerified={Boolean(wallet.payout_verified)}
                    initialEligible={Boolean(wallet.payout_eligible)} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
