
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

  const {
    data: profile,
    error: profileError,
  } = await supabase
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

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#111116] p-5 shadow-lg shadow-black/20";

  const mutedStyle = "text-sm text-gray-400";

  return (
    <main className="min-h-screen bg-[#08080b] text-white">

      {/* TOP NAVIGATION */}

      <nav className="sticky top-0 z-20 border-b border-white/10 bg-[#08080b]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="text-2xl font-black tracking-tight">
            MUSEK<span className="text-purple-500">.</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-gray-400 md:flex">
            <Link href="/discover-music" className="hover:text-white">
              Discover Music
            </Link>
            <Link href="/discover" className="hover:text-white">
              Artists
            </Link>
            <Link href="/my-music" className="hover:text-white">
              My Music
            </Link>
            <Link href="/favorites" className="hover:text-white">
              Favourites
            </Link>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-purple-500 hover:text-white"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-9 lg:px-8 lg:py-12">

        {/* WELCOME HEADER */}

        <section className="relative mb-9 overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#20132f] via-[#111116] to-[#0b0b0f] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />

          <div className="relative z-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
              Artist Studio
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Welcome back, {displayName}
            </h1>

            <p className="mt-3 max-w-xl text-gray-400">
              Your music, your audience and your earnings — all in one place.
            </p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Account type: {accountType}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/my-music"
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold transition hover:bg-purple-500"
              >
                Manage My Music
              </Link>

              <Link
                href="/profile"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold transition hover:bg-white/10"
              >
                Edit Profile
              </Link>

              <Link
                href="/discover-music"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold transition hover:bg-white/10"
              >
                Explore Music
              </Link>
            </div>
          </div>
        </section>

        {/* QUICK PERFORMANCE STATS */}

        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
                Performance Overview
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                Your Music at a Glance
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className={cardStyle}>
              <p className={mutedStyle}>Total Plays</p>
              <h3 className="mt-3 text-3xl font-black">
                {totalPlays.toLocaleString()}
              </h3>
              <p className="mt-2 text-xs text-purple-400">
                Across published songs
              </p>
            </div>

            <div className={cardStyle}>
              <p className={mutedStyle}>Published Songs</p>
              <h3 className="mt-3 text-3xl font-black">
                {tracks.length}
              </h3>
              <p className="mt-2 text-xs text-purple-400">
                Your live catalogue
              </p>
            </div>

            <div className={cardStyle}>
              <p className={mutedStyle}>Coin Balance</p>
              <h3 className="mt-3 text-3xl font-black text-purple-300">
                {walletBalance.toLocaleString()}
              </h3>
              <p className="mt-2 text-xs text-gray-500">
                Coins in creator wallet
              </p>
            </div>

            <div className={cardStyle}>
              <p className={mutedStyle}>Recorded Earnings</p>
              <h3 className="mt-3 text-3xl font-black text-[#39ff14]">
                ${totalEarnings.toFixed(2)}
              </h3>
              <p className="mt-2 text-xs text-gray-500">
                Canadian dollars
              </p>
            </div>

          </div>
        </section>

        {/* ARTIST WALLET */}

        <section id="artist-wallet" className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
              Financial Centre
            </p>
            <h2 className="mt-1 text-2xl font-bold">Your Artist Wallet</h2>
          </div>

          {!wallet && (
            <p className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
              Wallet information is not available yet. See dashboard errors below.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#28153d] to-[#111116] p-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />

              <div className="relative">
                <p className="text-sm font-semibold text-purple-200">
                  Creator Coin Balance
                </p>
                <h3 className="mt-4 text-4xl font-black">
                  {walletBalance.toLocaleString()}
                </h3>
                <p className="mt-2 text-sm text-purple-200/70">
                  MUSEK Coins
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111116] p-7">
              <p className="text-sm font-semibold text-gray-400">
                Total Coins Received
              </p>
              <h3 className="mt-4 text-4xl font-black">
                {totalCoinsReceived.toLocaleString()}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Lifetime creator coin receipts
              </p>
            </div>

          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

            <div className={cardStyle}>
              <p className="text-sm font-semibold text-gray-400">
                Settled Gift Revenue
              </p>

              <h3 className="mt-3 text-3xl font-black text-[#39ff14]">
                CAD ${settledGiftEarnings.toFixed(2)}
              </h3>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-lg bg-white/5 px-3 py-2 text-gray-300">
                  {settledGiftCoins.toLocaleString()} gift coins
                </span>
                <span className="rounded-lg bg-purple-500/10 px-3 py-2 text-purple-300">
                  Creator share: 70%
                </span>
                <span className="rounded-lg bg-white/5 px-3 py-2 text-gray-400">
                  MUSEK share: 30%
                </span>
              </div>
            </div>

            <div className={cardStyle}>
              <p className="text-sm font-semibold text-gray-400">
                Withdrawal Eligibility
              </p>

              <h3 className="mt-3 text-3xl font-black">
                CAD $100.00
              </h3>

              <p className="mt-3 text-sm text-gray-400">
                {amountToMinimum > 0
                  ? `CAD $${amountToMinimum.toFixed(2)} more in recorded earnings to reach the minimum.`
                  : "Recorded earnings have reached the minimum. Final eligibility must still be verified."}
              </p>

              <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="text-xs leading-5 text-yellow-200">
                  Withdrawals are not yet enabled. Identity verification,
                  payment processing and settlement checks are still required.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* LISTENING ANALYTICS */}

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
              Audience Insights
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Listening Analytics
            </h2>
          </div>

          <div className={cardStyle}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400">
                  Recorded plays over the last six months
                </p>
                <h3 className="mt-2 text-4xl font-black">
                  {monthlyTotal.toLocaleString()}
                </h3>
              </div>

              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300">
                Six-month report
              </span>
            </div>

            <div className="mt-9 flex h-56 items-end justify-between gap-3 sm:gap-5">
              {monthlyStats.map((month) => {
                const height = Math.max(
                  (month.plays / highestMonthlyPlays) * 150,
                  5
                );

                return (
                  <div
                    key={month.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <span className="text-xs font-semibold text-gray-300">
                      {month.plays.toLocaleString()}
                    </span>

                    <div
                      className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-purple-700 to-purple-400 shadow-lg shadow-purple-500/10"
                      style={{ height: `${height}px` }}
                    />

                    <span className="text-center text-[10px] text-gray-500 sm:text-xs">
                      {month.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs text-gray-500">
              Monthly history starts from the date tracking was installed.
            </p>
          </div>
        </section>

        {/* TOP TRACKS */}

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
              Your Catalogue
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Most Popular Songs
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111116]">

            {rankedTracks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-lg font-semibold">
                  No published songs yet
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Publish your first song to start building your audience.
                </p>
                <Link
                  href="/my-music"
                  className="mt-5 inline-block rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold hover:bg-purple-500"
                >
                  Manage My Music
                </Link>
              </div>
            ) : (
              rankedTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between gap-4 border-b border-white/5 p-5 last:border-0 hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 font-bold text-purple-300">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold">
                        {track.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {track.genre || "Music"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-bold">
                      {Number(track.play_count || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Plays</p>
                  </div>
                </div>
              ))
            )}

          </div>
        </section>

        {/* QUICK LINKS */}

        <section className="mb-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
              Your Workspace
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Manage Your Artist Account
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                title: "My Music",
                description: "Upload and manage your releases.",
                href: "/my-music",
              },
              {
                title: "Discover Artists",
                description: "Explore the MUSEK community.",
                href: "/discover",
              },
              {
                title: "My Favourites",
                description: "Visit your saved music.",
                href: "/favorites",
              },
              {
                title: "Edit Profile",
                description: "Update your artist identity.",
                href: "/profile",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl border border-white/10 bg-[#111116] p-5 transition hover:-translate-y-1 hover:border-purple-500/40 hover:bg-[#17121e]"
              >
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {item.description}
                </p>
                <p className="mt-5 text-sm font-semibold text-purple-400">
                  Open section →
                </p>
              </Link>
            ))}

          </div>
        </section>

        {/* DATA ERRORS */}

        {errors.length > 0 && (
          <section className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-300">
              Dashboard Data Errors
            </p>

            {errors.map((error, index) => (
              <p key={index} className="mt-2 text-sm text-red-200">
                {error}
              </p>
            ))}
          </section>
        )}

        <footer className="border-t border-white/10 py-7 text-center text-xs text-gray-600">
          MUSEK. Artist Studio
        </footer>

      </div>
    </main>
  );
}
