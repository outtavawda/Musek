import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";
import ArtistInvitations from "./artist-invitations";

type Track = {
  id: string;
  title: string;
  genre: string | null;
  play_count: number | null;
  status: string;
};

type PlayEvent = {
  played_at: string;
};

type Wallet = {
  coin_balance: number;
  total_coins_received: number;
  total_earnings_cad: number;
};

type FanWallet = {
  coin_balance: number;
  total_coins_purchased: number;
};

type CoinPurchase = {
  id: string;
  coins: number;
  amount_cad: number;
  status: string;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, account_type, bio, is_public")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email;

  const accountType =
    profile?.account_type ||
    user.user_metadata?.account_type ||
    "fan";

  const accountLabel =
    accountType === "artist"
      ? "Artist"
      : accountType === "label"
      ? "Record Label"
      : "Fan";

  let wallet: Wallet | null = null;
  let walletError = "";

  let fanWallet: FanWallet | null = null;
  let fanWalletError = "";

  let coinPurchases: CoinPurchase[] = [];

  let tracks: Track[] = [];
  let playEvents: PlayEvent[] = [];
  let analyticsError = "";

  // FAN WALLET
  if (accountType === "fan") {
    const { data: fanWalletData, error: fanWalletQueryError } =
      await supabase
        .from("fan_coin_wallets")
        .select("coin_balance, total_coins_purchased")
        .eq("user_id", user.id)
        .maybeSingle();

    if (fanWalletQueryError) {
      fanWalletError = fanWalletQueryError.message;
    } else if (fanWalletData) {
      fanWallet = fanWalletData as FanWallet;
    }

    const { data: purchases, error: purchasesError } =
      await supabase
        .from("coin_purchases")
        .select("id, coins, amount_cad, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (purchasesError) {
      fanWalletError = fanWalletError || purchasesError.message;
    } else {
      coinPurchases = (purchases || []) as CoinPurchase[];
    }
  }

  // ARTIST WALLET AND ANALYTICS
  if (accountType === "artist") {
    const { data: walletData, error: walletQueryError } =
      await supabase
        .from("creator_wallets")
        .select(
          "coin_balance, total_coins_received, total_earnings_cad"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (walletQueryError) {
      walletError = walletQueryError.message;
    } else if (walletData) {
      wallet = walletData as Wallet;
    } else {
      walletError = "No artist wallet was found for this account.";
    }

    const { data, error } = await supabase
      .from("music_tracks")
      .select("id, title, genre, play_count, status")
      .eq("artist_id", user.id)
      .eq("status", "published");

    if (error) {
      analyticsError = error.message;
    } else {
      tracks = (data || []) as Track[];
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: events, error: eventsError } = await supabase
      .from("track_play_events")
      .select("played_at")
      .eq("artist_id", user.id)
      .gte("played_at", sixMonthsAgo.toISOString())
      .order("played_at", { ascending: true });

    if (eventsError) {
      analyticsError = analyticsError || eventsError.message;
    } else {
      playEvents = (events || []) as PlayEvent[];
    }
  }

  const totalPlays = tracks.reduce(
    (total, track) => total + (track.play_count || 0),
    0
  );

  const publishedSongs = tracks.length;

  const rankedTracks = [...tracks].sort(
    (a, b) => (b.play_count || 0) - (a.play_count || 0)
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

  const totalMonthlyPlays = monthlyStats.reduce(
    (total, month) => total + month.plays,
    0
  );
  const cardStyle = {
    padding: "20px",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
  };

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
          Account type: <strong>{accountLabel}</strong>
        </p>

        <p>
          Welcome to MUSEK. Your music community starts here.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <Link className="primaryButton" href="/feed">
            ✨ Personalised Music Feed
          </Link>

          <Link className="primaryButton" href="/discover-music">
            🎵 Discover Music
          </Link>

          <Link className="secondaryButton" href="/favorites">
            ❤️ My Favourites
          </Link>

          <Link className="secondaryButton" href="/discover">
            Discover Artists
          </Link>

          <Link className="secondaryButton" href="/profile">
            Edit My Profile
          </Link>

          {accountType === "fan" && (
            <>
              <Link className="primaryButton" href="/following">
                🎧 Following Artists
              </Link>

              <Link className="primaryButton" href="/buy-coins">
                🪙 Buy MUSEK Coins
              </Link>

              <Link className="secondaryButton" href="/gift-history">
                🎁 Gift History
              </Link>
            </>
          )}

          {accountType === "artist" && (
            <>
              <Link className="secondaryButton" href="/my-music">
                🎧 My Music
              </Link>

              <Link className="secondaryButton" href="/gift-history">
                🎁 Gift History
              </Link>

              <Link className="primaryButton" href="/withdrawals">
                💰 Withdraw Earnings
              </Link>
            </>
          )}
        </div>

        {/* FAN WALLET */}
        {accountType === "fan" && (
          <div style={{ marginTop: "36px" }}>
            <p className="eyebrow">YOUR MUSEK COINS</p>

            <h2>My Fan Wallet</h2>

            {fanWalletError && (
              <p className="muted">
                Wallet information: {fanWalletError}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "14px",
                marginTop: "20px",
              }}
            >
              <div style={cardStyle}>
                <p className="eyebrow">CURRENT BALANCE</p>
                <h2 style={{ fontSize: "30px" }}>
                  {Number(fanWallet?.coin_balance || 0).toLocaleString()}
                </h2>
                <p className="muted">MUSEK Coins</p>
              </div>

              <div style={cardStyle}>
                <p className="eyebrow">TOTAL PURCHASED</p>
                <h2 style={{ fontSize: "30px" }}>
                  {Number(
                    fanWallet?.total_coins_purchased || 0
                  ).toLocaleString()}
                </h2>
                <p className="muted">Lifetime coins purchased</p>
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                marginTop: "18px",
              }}
            >
              <p className="eyebrow">COIN VALUE</p>
              <h3>100 MUSEK Coins = $1.00 CAD</h3>
              <p className="muted">
                Your MUSEK Coins are platform credits used within MUSEK.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <Link className="primaryButton" href="/buy-coins">
                  🪙 Buy More Coins
                </Link>

                <Link className="secondaryButton" href="/gift-history">
                  🎁 View Gift History
                </Link>
              </div>
            </div>

            <div style={{ marginTop: "28px" }}>
              <p className="eyebrow">PURCHASE HISTORY</p>
              <h2>Recent Coin Purchases</h2>

              {coinPurchases.length === 0 ? (
                <p className="muted">
                  You have no coin purchases yet.
                </p>
              ) : (
                <div style={{ marginTop: "16px" }}>
                  {coinPurchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px",
                        marginBottom: "10px",
                        border:
                          "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                      }}
                    >
                      <div>
                        <strong>
                          {Number(purchase.coins).toLocaleString()} Coins
                        </strong>

                        <p
                          className="muted"
                          style={{ margin: "5px 0 0" }}
                        >
                          {new Date(
                            purchase.created_at
                          ).toLocaleDateString("en-CA")}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <strong>
                          {Number(purchase.amount_cad).toLocaleString(
                            "en-CA",
                            {
                              style: "currency",
                              currency: "CAD",
                            }
                          )}
                        </strong>

                        <p
                          className="muted"
                          style={{ margin: "5px 0 0" }}
                        >
                          {purchase.status === "paid"
                            ? "Paid"
                            : purchase.status === "pending"
                            ? "Pending"
                            : "Failed"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
                {/* ARTIST WALLET */}
        {accountType === "artist" && (
          <div style={{ marginTop: "36px" }}>
            <p className="eyebrow">ARTIST EARNINGS</p>

            <h2>My Artist Wallet</h2>

            {walletError ? (
              <p className="muted">
                Unable to load wallet: {walletError}
              </p>
            ) : wallet ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "14px",
                    marginTop: "20px",
                  }}
                >
                  <div style={cardStyle}>
                    <p className="eyebrow">COIN BALANCE</p>
                    <h2 style={{ fontSize: "28px" }}>
                      {Number(wallet.coin_balance).toLocaleString()}
                    </h2>
                    <p className="muted">Coins</p>
                  </div>

                  <div style={cardStyle}>
                    <p className="eyebrow">COINS RECEIVED</p>
                    <h2 style={{ fontSize: "28px" }}>
                      {Number(
                        wallet.total_coins_received
                      ).toLocaleString()}
                    </h2>
                    <p className="muted">Lifetime coins received</p>
                  </div>

                  <div style={cardStyle}>
                    <p className="eyebrow">LIFETIME EARNINGS</p>
                    <h2 style={{ fontSize: "28px" }}>
                      {Number(
                        wallet.total_earnings_cad
                      ).toLocaleString("en-CA", {
                        style: "currency",
                        currency: "CAD",
                      })}
                    </h2>
                    <p className="muted">Recorded earnings</p>
                  </div>
                </div>

                <div
                  style={{
                    ...cardStyle,
                    marginTop: "18px",
                  }}
                >
                  <p className="eyebrow">ARTIST PAYOUT INFORMATION</p>

                  <h3>Minimum withdrawal: $100 CAD</h3>

                  <p className="muted">
                    Artist withdrawals are subject to verification,
                    available settled earnings, payout eligibility,
                    fees and applicable compliance checks.
                  </p>

                  <p className="muted">
                    Your lifetime earnings are not necessarily your
                    available withdrawal balance.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginTop: "18px",
                  }}
                >
                  <Link
                    className="secondaryButton"
                    href="/gift-history"
                  >
                    🎁 View Gifts Received
                  </Link>

                  <Link
                    className="primaryButton"
                    href="/withdrawals"
                  >
                    💰 Withdraw Earnings
                  </Link>
                </div>
              </>
            ) : (
              <p className="muted">
                Your artist wallet has not been loaded.
              </p>
            )}
          </div>
        )}

        {/* ARTIST ANALYTICS */}
        {accountType === "artist" && (
          <div style={{ marginTop: "40px" }}>
            <p className="eyebrow">ARTIST ANALYTICS</p>

            <h2>Your Music Performance</h2>

            {analyticsError ? (
              <p className="muted">
                Unable to load some analytics: {analyticsError}
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "14px",
                    marginTop: "20px",
                  }}
                >
                  <div style={cardStyle}>
                    <p className="eyebrow">TOTAL PLAYS</p>
                    <h2 style={{ fontSize: "30px" }}>
                      {totalPlays.toLocaleString()}
                    </h2>
                  </div>

                  <div style={cardStyle}>
                    <p className="eyebrow">PUBLISHED SONGS</p>
                    <h2 style={{ fontSize: "30px" }}>
                      {publishedSongs}
                    </h2>
                  </div>

                  <div style={cardStyle}>
                    <p className="eyebrow">TOP SONG PLAYS</p>
                    <h2 style={{ fontSize: "30px" }}>
                      {(mostPlayedSong?.play_count || 0).toLocaleString()}
                    </h2>
                  </div>
                </div>

                <div style={{ ...cardStyle, marginTop: "24px" }}>
                  <p className="eyebrow">MOST PLAYED SONG</p>

                  <h3>
                    {mostPlayedSong?.title || "No published songs yet"}
                  </h3>

                  {mostPlayedSong && (
                    <p className="muted">
                      {mostPlayedSong.play_count || 0} plays
                    </p>
                  )}
                </div>

                <div style={{ marginTop: "32px" }}>
                  <p className="eyebrow">LISTENING HISTORY</p>
                  <h2>Monthly Listening Report</h2>

                  <p className="muted">
                    Song plays recorded over the last six months.
                  </p>

                  <div style={{ ...cardStyle, marginTop: "18px" }}>
                    <p className="eyebrow">
                      RECORDED PLAYS · SIX MONTHS
                    </p>

                    <h2 style={{ fontSize: "30px" }}>
                      {totalMonthlyPlays.toLocaleString()}
                    </h2>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        gap: "12px",
                        height: "190px",
                        marginTop: "24px",
                      }}
                    >
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
                            gap: "8px",
                          }}
                        >
                          <strong style={{ fontSize: "12px" }}>
                            {month.plays}
                          </strong>

                          <div
                            style={{
                              width: "100%",
                              maxWidth: "48px",
                              height: `${Math.max(
                                (month.plays / highestMonthlyPlays) * 130,
                                5
                              )}px`,
                              background: "#ffffff",
                              borderRadius: "6px 6px 0 0",
                            }}
                          />

                          <span
                            style={{
                              fontSize: "11px",
                              color: "#aaaaaa",
                            }}
                          >
                            {month.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="muted" style={{ marginTop: "12px" }}>
                    Monthly tracking starts from the date this feature
                    was installed. Older plays are not included.
                  </p>
                </div>

                <div style={{ marginTop: "28px" }}>
                  <p className="eyebrow">POPULARITY RANKING</p>
                  <h2>Your Published Songs</h2>

                  {rankedTracks.length === 0 ? (
                    <p className="muted">
                      You have not published any songs yet.
                    </p>
                  ) : (
                    <div style={{ marginTop: "16px" }}>
                      {rankedTracks.map((track, index) => (
                        <div
                          key={track.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            padding: "14px",
                            marginBottom: "10px",
                            border:
                              "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                          }}
                        >
                          <div>
                            <strong>
                              {index + 1}. {track.title}
                            </strong>

                            <p
                              className="muted"
                              style={{ margin: "5px 0 0" }}
                            >
                              {track.genre || "Music"}
                            </p>
                          </div>

                          <strong>
                            {(track.play_count || 0).toLocaleString()} plays
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ARTIST INVITATIONS */}
        {accountType === "artist" && <ArtistInvitations />}
                {/* PROFILE STATUS */}
        <div
          style={{
            ...cardStyle,
            marginTop: "36px",
          }}
        >
          <p className="eyebrow">PROFILE STATUS</p>

          <h2>
            {profile?.is_public
              ? "Your profile is public"
              : "Your profile is private"}
          </h2>

          <p className="muted">
            {profile?.is_public
              ? "Other MUSEK users can discover your public profile."
              : "Your profile is hidden from public discovery. You can change this in Edit My Profile."}
          </p>
        </div>

        {/* EXPLORE MUSEK */}
        <div style={{ marginTop: "32px" }}>
          <p className="eyebrow">EXPLORE MUSEK</p>
          <h2>Your music community</h2>

          <p className="muted">
            Discover artists, listen to published songs and explore
            record labels.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <Link className="primaryButton" href="/feed">
              ✨ Open Personalised Feed →
            </Link>

            {accountType === "fan" && (
              <Link href="/following">
                🎧 Following Artists →
              </Link>
            )}

            <Link href="/discover-music">
              Listen to Music →
            </Link>

            <Link href="/favorites">
              View My Favourites →
            </Link>

            {accountType === "fan" && (
              <Link href="/gift-history">
                View Gift History →
              </Link>
            )}

            {accountType === "artist" && (
              <Link href="/gift-history">
                View Gifts Received →
              </Link>
            )}

            {accountType === "artist" && (
              <Link href="/withdrawals">
                Withdraw Earnings →
              </Link>
            )}

            <Link href="/discover">
              Explore Artists →
            </Link>

            {accountType === "artist" && (
              <Link href="/my-music">
                Manage My Music →
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
