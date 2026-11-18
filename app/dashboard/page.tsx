
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";

type Track = {
  id: string;
  title: string;
  genre: string | null;
  play_count: number | null;
};

type PlayEvent = {
  played_at: string;
};

type Wallet = {
  coin_balance: number;
  total_coins_received: number;
  total_earnings_cad: number;
};

type Gift = {
  coins: number;
  creator_share_cad: number;
  status: string;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, account_type")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email ||
    "Artist";

  const accountType = String(
    profile?.account_type ||
    user.user_metadata?.account_type ||
    "artist"
  ).trim().toLowerCase();

  let wallet: Wallet | null = null;
  let tracks: Track[] = [];
  let playEvents: PlayEvent[] = [];
  let gifts: Gift[] = [];
  const errors: string[] = [];

  if (profileError) {
    errors.push("Profile: " + profileError.message);
  }

  const walletResult = await supabase
    .from("creator_wallets")
    .select("coin_balance, total_coins_received, total_earnings_cad")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletResult.error) {
    errors.push("Wallet: " + walletResult.error.message);
  } else {
    wallet = walletResult.data as Wallet | null;
  }

  const tracksResult = await supabase
    .from("music_tracks")
    .select("id, title, genre, play_count")
    .eq("artist_id", user.id)
    .eq("status", "published");

  if (tracksResult.error) {
    errors.push("Music analytics: " + tracksResult.error.message);
  } else {
    tracks = (tracksResult.data || []) as Track[];
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const eventsResult = await supabase
    .from("track_play_events")
    .select("played_at")
    .eq("artist_id", user.id)
    .gte("played_at", sixMonthsAgo.toISOString());

  if (eventsResult.error) {
    errors.push("Monthly plays: " + eventsResult.error.message);
  } else {
    playEvents = (eventsResult.data || []) as PlayEvent[];
  }

  const giftsResult = await supabase
    .from("gift_transactions")
    .select("coins, creator_share_cad, status")
    .eq("creator_id", user.id)
    .eq("status", "settled");

  if (giftsResult.error) {
    errors.push("Gift history: " + giftsResult.error.message);
  } else {
    gifts = (giftsResult.data || []) as Gift[];
  }

  const walletBalance = Number(wallet?.coin_balance || 0);
  const totalCoinsReceived = Number(wallet?.total_coins_received || 0);
  const totalEarnings = Number(wallet?.total_earnings_cad || 0);

  const totalPlays = tracks.reduce(
    (sum, track) => sum + Number(track.play_count || 0),
    0
  );

  const rankedTracks = [...tracks].sort(
    (a, b) => Number(b.play_count || 0) - Number(a.play_count || 0)
  );

  const mostPlayedSong = rankedTracks[0];

  const monthlyStats = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));

    const plays = playEvents.filter((event) => {
      const playedDate = new Date(event.played_at);
      return (
        playedDate.getMonth() === date.getMonth() &&
        playedDate.getFullYear() === date.getFullYear()
      );
    }).length;

    return {
      label: date.toLocaleDateString("en-CA", {
        month: "short",
        year: "2-digit",
      }),
      plays,
    };
  });

  const highestMonthlyPlays = Math.max(
    ...monthlyStats.map((month) => month.plays),
    1
  );

  const monthlyTotal = monthlyStats.reduce(
    (sum, month) => sum + month.plays,
    0
  );

  const settledGiftCoins = gifts.reduce(
    (sum, gift) => sum + Number(gift.coins || 0),
    0
  );

  const settledGiftEarnings = gifts.reduce(
    (sum, gift) => sum + Number(gift.creator_share_cad || 0),
    0
  );

  const amountToMinimum = Math.max(0, 100 - totalEarnings);

  return (
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <form action={signOut}>
          <button className="secondaryButton" type="submit">
            Log out
          </button>
        </form>
      </nav>

      <section className="contentPanel">
        <p className="eyebrow">YOUR MUSEK ACCOUNT</p>
        <h1>Welcome, {displayName}</h1>

        <p className="muted">
          Account type: <strong>{accountType}</strong>
        </p>

        <p>Your MUSEK artist dashboard.</p>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "24px"
        }}>
          <Link className="primaryButton" href="/profile">
            Edit Profile
          </Link>

          <Link className="secondaryButton" href="/discover-music">
            Discover Music
          </Link>

          <Link className="secondaryButton" href="/favorites">
            My Favourites
          </Link>

          <Link className="secondaryButton" href="/discover">
            Discover Artists
          </Link>

          <Link className="secondaryButton" href="/my-music">
            My Music
          </Link>
        </div>

        {/* ARTIST WALLET - ALWAYS DISPLAYED */}

        <div id="artist-wallet" style={{ marginTop: "40px" }}>
          <p className="eyebrow">ARTIST WALLET</p>
          <h2>Your Earnings</h2>

          {!wallet && (
            <p className="muted">
              Wallet information is not available yet. See dashboard errors below.
            </p>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "14px",
            marginTop: "18px"
          }}>
            <div style={{
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">COIN BALANCE</p>
              <h2>{walletBalance.toLocaleString()}</h2>
              <p className="muted">Coins</p>
            </div>

            <div style={{
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">TOTAL COINS RECEIVED</p>
              <h2>{totalCoinsReceived.toLocaleString()}</h2>
              <p className="muted">Coins</p>
            </div>

            <div style={{
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">RECORDED EARNINGS</p>
              <h2>CAD ${totalEarnings.toFixed(2)}</h2>
            </div>
          </div>

          <div style={{
            marginTop: "20px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px"
          }}>
            <p className="eyebrow">GIFT REVENUE</p>
            <p>
              Settled gift coins: <strong>{settledGiftCoins}</strong>
            </p>
            <p>
              Recorded creator share:{" "}
              <strong>CAD ${settledGiftEarnings.toFixed(2)}</strong>
            </p>
            <p className="muted">
              Creator share: 70% · MUSEK share: 30%
            </p>
          </div>

          <div style={{
            marginTop: "20px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px"
          }}>
            <p className="eyebrow">WITHDRAWAL ELIGIBILITY</p>
            <h2>CAD $100.00 minimum</h2>

            <p className="muted">
              {amountToMinimum > 0
                ? `CAD $${amountToMinimum.toFixed(2)} more in recorded earnings to reach the minimum.`
                : "Recorded earnings have reached the minimum. Final eligibility must still be verified."}
            </p>

            <p className="muted">
              Withdrawals are not yet enabled. Identity verification,
              payment processing and settlement checks are still required.
            </p>
          </div>
        </div>

        {/* ARTIST ANALYTICS - ALWAYS DISPLAYED */}

        <div style={{ marginTop: "40px" }}>
          <p className="eyebrow">ARTIST ANALYTICS</p>
          <h2>Your Music Performance</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "14px",
            marginTop: "18px"
          }}>
            <div style={{
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">TOTAL PLAYS</p>
              <h2>{totalPlays.toLocaleString()}</h2>
            </div>

            <div style={{
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">PUBLISHED SONGS</p>
              <h2>{tracks.length}</h2>
            </div>

            <div style={{
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">TOP SONG PLAYS</p>
              <h2>{mostPlayedSong?.play_count || 0}</h2>
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <p className="eyebrow">MONTHLY LISTENING REPORT</p>
            <h2>Last Six Months</h2>

            <div style={{
              padding: "20px",
              marginTop: "16px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px"
            }}>
              <p className="eyebrow">RECORDED MONTHLY PLAYS</p>
              <h2>{monthlyTotal.toLocaleString()}</h2>

              <div style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "12px",
                height: "190px",
                marginTop: "24px"
              }}>
                {monthlyStats.map((month) => (
                  <div
                    key={month.label}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      height: "100%",
                      gap: "8px"
                    }}
                  >
                    <strong style={{ fontSize: "12px" }}>
                      {month.plays}
                    </strong>

                    <div style={{
                      width: "100%",
                      maxWidth: "48px",
                      height: `${Math.max(
                        (month.plays / highestMonthlyPlays) * 130,
                        5
                      )}px`,
                      background: "#ffffff",
                      borderRadius: "6px 6px 0 0"
                    }} />

                    <span style={{
                      fontSize: "11px",
                      color: "#aaaaaa"
                    }}>
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="muted">
              Monthly history starts from the date tracking was installed.
            </p>
          </div>

          <div style={{ marginTop: "28px" }}>
            <p className="eyebrow">POPULARITY RANKING</p>
            <h2>Your Published Songs</h2>

            {rankedTracks.length === 0 ? (
              <p className="muted">No published songs yet.</p>
            ) : (
              rankedTracks.map((track, index) => (
                <div
                  key={track.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "14px",
                    marginTop: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px"
                  }}
                >
                  <div>
                    <strong>{index + 1}. {track.title}</strong>
                    <p className="muted">{track.genre || "Music"}</p>
                  </div>

                  <strong>{track.play_count || 0} plays</strong>
                </div>
              ))
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <p className="eyebrow">DASHBOARD DATA ERRORS</p>
            {errors.map((error, index) => (
              <p key={index} className="muted">
                {error}
              </p>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
