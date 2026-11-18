
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Gift = {
  id: string;
  sender_id: string;
  creator_id: string;
  coins: number;
  creator_share_cad: number;
  musek_share_cad: number;
  status: string;
  created_at: string;
};

export default async function GiftHistoryPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const isArtist = profile?.account_type === "artist";

  const { data: gifts, error } = await supabase
    .from("gift_transactions")
    .select(
      "id, sender_id, creator_id, coins, creator_share_cad, musek_share_cad, status, created_at"
    )
    .eq(isArtist ? "creator_id" : "sender_id", user.id)
    .order("created_at", { ascending: false });

  const giftRows = (gifts || []) as Gift[];

  return (
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <Link className="secondaryButton" href="/dashboard">
          Dashboard
        </Link>
      </nav>

      <section className="authCard profileCard">
        <p className="eyebrow">MUSEK WALLET</p>

        <h1>Gift History</h1>

        <p className="muted">
          {isArtist
            ? "View the gifts your fans have sent you."
            : "View the gifts you have sent to artists."}
        </p>

        {error ? (
          <p className="muted">
            Unable to load gift history: {error.message}
          </p>
        ) : giftRows.length === 0 ? (
          <p className="muted">
            No gifts yet. Your gift history will appear here.
          </p>
        ) : (
          <div style={{ marginTop: "24px" }}>
            {giftRows.map((gift) => (
              <div
                key={gift.id}
                style={{
                  padding: "18px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <h2>
                  🎁 {gift.coins.toLocaleString()} Coins
                </h2>

                <p className="muted">
                  {isArtist ? "Gift received" : "Gift sent"}
                </p>

                <p className="muted">
                  Artist share: CAD $
                  {Number(gift.creator_share_cad).toFixed(2)}
                </p>

                <p className="muted">
                  MUSEK share: CAD $
                  {Number(gift.musek_share_cad).toFixed(2)}
                </p>

                <p className="muted">
                  Status: {gift.status}
                </p>

                <p className="muted small">
                  {new Date(gift.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="muted small" style={{ marginTop: "30px" }}>
          <Link href="/dashboard">← Back to Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
