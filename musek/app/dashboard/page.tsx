
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

const money = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);

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

  if (accountType === "fan") redirect("/fan-dashboard");
  if (accountType === "label") redirect("/label-dashboard");

  let wallet: Wallet | null = null;
  let tracks: Track[] = [];
  let playEvents: PlayEvent[] = [];
  let gifts: Gift[] = [];
  const errors: string[] = [];

  if (profileError) errors.push("Profile: " + profileError.message);

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
      label: date.toLocaleDateString("en-CA", { month: "short" }),
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
  const withdrawalProgress = Math.min((totalEarnings / 100) * 100, 100);

  const card =
    "rounded-2xl border border-white/10 bg-[#11111d] shadow-lg shadow-black/20";

  const label =
    "text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300";

  const navItems = [
    { href: "/dashboard", icon: "⌂", name: "Dashboard" },
    { href: "/profile", icon: "●", name: "Profile" },
    { href: "/discover-music", icon: "♫", name: "Discover Music" },
    { href: "/social", icon: "◉", name: "MUSEK Social" },
    { href: "/favorites", icon: "♡", name: "My Favourites" },
    { href: "/discover", icon: "♧", name: "Discover Artists" },
    { href: "/my-music", icon: "♫", name: "My Music" },
    { href: "/gift-history", icon: "◇", name: "Gift History" },
  ];

  return (
    <main className="min-h-screen bg-[#080811] text-white">
      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-purple-500/15 bg-[#0b0b17] px-5 py-7 lg:flex">
          <Link
            href="/"
            className="mb-12 px-3 text-3xl font-black tracking-tight"
          >
            MUSEK<span className="text-purple-500">.</span>
          </Link>

          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
            Your Workspace
          </p>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = item.href === "/dashboard";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-lg shadow-purple-900/40"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6">
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-gray-400 transition hover:border-purple-500 hover:text-white"
              >
                ↪ Log out
              </button>
            </form>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="min-w-0 flex-1">
          {/* TOP BAR */}
          <header className="flex items-center justify-between border-b border-white/10 bg-[#080811]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
            <Link href="/" className="text-xl font-black lg:hidden">
              MUSEK<span className="text-purple-500">.</span>
            </Link>

            <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 sm:block">
              Artist Studio
            </p>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-gray-400 sm:block">
                {displayName}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/15 text-lg">
                ♙
              </div>
              <form action={signOut}>
                <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-purple-500 hover:text-white">
                  Log out
                </button>
              </form>
            </div>
          </header>

          <nav aria-label="Quick navigation" className="flex gap-2 overflow-x-auto border-b border-white/[0.06] bg-[#0b0a14] px-4 py-3 lg:hidden">
            {[
              { href: "/dashboard", name: "Overview" },
              { href: "/my-music", name: "My Music" },
              { href: "/discover-music", name: "Listen" },
              { href: "/social", name: "Live Social" },
              { href: "/profile", name: "Profile" },
              { href: "/gift-history", name: "Gifts" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${item.href === "/dashboard" ? "border-purple-400/40 bg-purple-500/15 text-purple-100" : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-purple-400/30 hover:text-white"}`}>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
            {/* WELCOME BANNER */}
            <section className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-r from-[#21103c] via-[#171329] to-[#10101d] p-7 sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-purple-600/25 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-2/3 bg-gradient-to-l from-purple-500/10 to-transparent" />

              <div className="relative z-10 max-w-3xl">
                <p className={label}>Your MUSEK Account</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Welcome,{" "}
                  <span className="bg-gradient-to-r from-purple-300 to-fuchsia-500 bg-clip-text text-transparent">
                    {displayName}
                  </span>
                </h1>
                <p className="mt-3 text-sm text-purple-100/70">
                  Account type:{" "}
                  <span className="font-bold capitalize text-purple-300">
                    {accountType}
                  </span>
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300">
                  Your music, your audience and your earnings — all in one
                  place.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/social"
                    className="group relative inline-flex items-center gap-2 rounded-full border border-fuchsia-200/70 bg-[linear-gradient(110deg,#f5eaff_0%,#c084fc_18%,#7c3aed_42%,#e9d5ff_68%,#9333ea_100%)] px-6 py-3 text-sm font-black tracking-wide text-[#160b25] shadow-[0_0_10px_rgba(216,180,254,.75),0_0_28px_rgba(168,85,247,.45),inset_0_1px_0_rgba(255,255,255,.9)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_0_16px_rgba(216,180,254,.95),0_0_38px_rgba(168,85,247,.65)]"
                  >
                    <span aria-hidden="true">◉</span> MUSEK Social · Live <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-full bg-purple-600 px-5 py-3 text-sm font-bold shadow-lg shadow-purple-900/40 transition hover:bg-purple-500"
                  >
                    ✎ Edit Profile
                  </Link>
                  <Link
                    href="/discover-music"
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                  >
                    ▷ Discover Music
                  </Link>
                  <Link
                    href="/favorites"
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                  >
                    ♡ My Favourites
                  </Link>
                  <Link
                    href="/discover"
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                  >
                    Discover Artists
                  </Link>
                  <Link
                    href="/my-music"
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                  >
                    ♫ My Music
                  </Link>
                </div>
              </div>
            </section>

            {/* ARTIST WALLET */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className={label}>Artist Wallet</p>
                  <h2 className="mt-1 text-2xl font-black">Your Earnings</h2>
                </div>
                <Link
                  href="/dashboard#artist-wallet"
                  className="rounded-full border border-purple-500/30 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/10"
                >
                  View Details →
                </Link>
              </div>

              {!wallet && (
                <p className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
                  Wallet information is not available yet.
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className={`${card} bg-gradient-to-br from-[#251440] to-[#11111d] p-6`}>
                  <p className={label}>Coin Balance</p>
                  <h3 className="mt-3 text-4xl font-black text-white">
                    {walletBalance.toLocaleString()}
                  </h3>
                  <p className="mt-2 text-xs text-gray-400">MUSEK Coins</p>
                  <p className="mt-5 text-2xl text-purple-400">◉</p>
                </div>

                <div className={`${card} p-6`}>
                  <p className={label}>Total Coins Received</p>
                  <h3 className="mt-3 text-4xl font-black">
                    {totalCoinsReceived.toLocaleString()}
                  </h3>
                  <p className="mt-2 text-xs text-gray-400">
                    Lifetime creator coin receipts
                  </p>
                  <p className="mt-5 text-2xl text-purple-400">☆</p>
                </div>

                <div className={`${card} p-6`}>
                  <p className={label}>Recorded Earnings</p>
                  <h3 className="mt-3 text-4xl font-black text-purple-300">
                    {money(totalEarnings)}
                  </h3>
                  <p className="mt-2 text-xs text-gray-400">
                    Canadian dollars
                  </p>
                  <p className="mt-5 text-2xl text-purple-400">$</p>
                </div>
              </div>
            </section>

            {/* GIFTS AND WITHDRAWALS */}
            <section className="grid gap-4 xl:grid-cols-2">
              <div className={`${card} relative overflow-hidden p-6`}>
                <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
                <p className={label}>Gift Revenue</p>
                <h2 className="mt-4 text-3xl font-black text-white">
                  {money(settledGiftEarnings)}
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Recorded creator share
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-xl bg-white/5 px-4 py-3">
                    <p className="text-xs text-gray-400">Settled gift coins</p>
                    <p className="mt-1 text-xl font-bold">
                      {settledGiftCoins.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-500/10 px-4 py-3">
                    <p className="text-xs text-purple-300">Creator share</p>
                    <p className="mt-1 text-xl font-bold text-purple-300">
                      70%
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-4 py-3">
                    <p className="text-xs text-gray-400">MUSEK share</p>
                    <p className="mt-1 text-xl font-bold">30%</p>
                  </div>
                </div>
              </div>

              <div className={`${card} p-6`}>
                <p className={label}>Withdrawal Eligibility</p>
                <h2 className="mt-4 text-3xl font-black">
                  CAD $100.00 minimum
                </h2>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-400"
                    style={{ width: `${withdrawalProgress}%` }}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-gray-400">
                  {amountToMinimum > 0
                    ? `${money(amountToMinimum)} more in recorded earnings to reach the minimum.`
                    : "Recorded earnings have reached the minimum. Final eligibility must still be verified."}
                </p>

                <p className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs leading-5 text-yellow-200">
                  Withdrawals are not yet enabled. Identity verification,
                  payment processing and settlement checks are still required.
                </p>
              </div>
            </section>

            {/* PERFORMANCE */}
            <section>
              <div className="mb-4">
                <p className={label}>Artist Analytics</p>
                <h2 className="mt-1 text-2xl font-black">
                  Your Music Performance
                </h2>
              </div>

              <div className={`${card} p-5 sm:p-7`}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-purple-500/10 p-4">
                    <p className={label}>Total Plays</p>
                    <p className="mt-2 text-3xl font-black">
                      {totalPlays.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className={label}>Published Songs</p>
                    <p className="mt-2 text-3xl font-black">
                      {tracks.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className={label}>Top Song Plays</p>
                    <p className="mt-2 text-3xl font-black">
                      {Number(rankedTracks[0]?.play_count || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-7 xl:grid-cols-[1.7fr_1fr]">
                  <div>
                    <p className="text-sm font-bold">Monthly Listening Report</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Recorded plays over the last six months
                    </p>
                    <p className="mt-4 text-3xl font-black text-purple-300">
                      {monthlyTotal.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Total plays</p>

                    <div className="mt-7 flex h-48 items-end gap-3 sm:gap-5">
                      {monthlyStats.map((month) => {
                        const height = Math.max(
                          (month.plays / highestMonthlyPlays) * 135,
                          5
                        );

                        return (
                          <div
                            key={month.label}
                            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                          >
                            <span className="text-[10px] font-semibold text-gray-300 sm:text-xs">
                              {month.plays.toLocaleString()}
                            </span>
                            <div
                              className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-purple-800 to-fuchsia-400 shadow-lg shadow-purple-500/20"
                              style={{ height: `${height}px` }}
                            />
                            <span className="text-xs text-gray-500">
                              {month.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-5 text-xs text-gray-500">
                      Monthly history starts from the date tracking was installed.
                    </p>
                  </div>

                  <div>
                    <p className="mb-4 text-sm font-bold">
                      Your Published Songs
                    </p>

                    {rankedTracks.length === 0 ? (
                      <div className="rounded-xl bg-white/5 p-5">
                        <p className="text-sm font-semibold">
                          No published songs yet
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          Publish your first song to start building your audience.
                        </p>
                        <Link
                          href="/my-music"
                          className="mt-4 inline-block text-sm font-bold text-purple-300"
                        >
                          Manage My Music →
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {rankedTracks.slice(0, 5).map((track, index) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-sm font-bold text-purple-300">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {track.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {track.genre || "Music"}
                                </p>
                              </div>
                            </div>
                            <p className="shrink-0 text-xs font-bold text-gray-300">
                              {Number(track.play_count || 0).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* WORKSPACE LINKS */}
            <section>
              <p className={label}>Your Workspace</p>
              <h2 className="mb-4 mt-1 text-2xl font-black">
                Manage Your Artist Account
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    className={`${card} p-5 transition hover:-translate-y-1 hover:border-purple-500/50 hover:bg-[#171326]`}
                  >
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {item.description}
                    </p>
                    <p className="mt-5 text-sm font-bold text-purple-300">
                      Open section →
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* ERRORS */}
            {errors.length > 0 && (
              <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
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
        </div>
      </div>
    </main>
  );
}
