import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";

type Wallet = {
  coin_balance: number | null;
  total_coins_purchased: number | null;
};

type Purchase = {
  id: string;
  coins: number | null;
  amount_cad: number | null;
  status: string;
  paid_at: string | null;
};

type ListeningEvent = {
  track_id: string;
  listened_seconds: number | null;
  created_at: string;
};

const cad = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);

export default async function FanDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, account_type, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = String(
    profile?.account_type || user.user_metadata?.account_type || "fan"
  ).trim().toLowerCase();

  if (accountType === "artist") redirect("/dashboard");
  if (accountType === "label") redirect("/label-dashboard");

  const displayName =
    profile?.display_name || user.user_metadata?.display_name || "Music Fan";

  const [walletResult, purchasesResult, followsResult, listeningResult] =
    await Promise.all([
      supabase
        .from("fan_coin_wallet")
        .select("coin_balance, total_coins_purchased")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("coin_purchases")
        .select("id, coins, amount_cad, status, paid_at")
        .eq("user_id", user.id)
        .order("paid_at", { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from("artist_follows")
        .select("artist_id", { count: "exact", head: true })
        .eq("fan_id", user.id),
      supabase
        .from("music_listening_events")
        .select("track_id, listened_seconds, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const wallet = walletResult.data as Wallet | null;
  const purchases = (purchasesResult.data || []) as Purchase[];
  const listeningEvents = (listeningResult.data || []) as ListeningEvent[];
  const followedArtists = followsResult.count || 0;

  const trackIds = Array.from(
    new Set(listeningEvents.map((event) => event.track_id))
  );

  const { data: recentTracks } =
    trackIds.length > 0
      ? await supabase
          .from("music_tracks")
          .select("id, title, artist_id")
          .in("id", trackIds)
      : { data: [] };

  const artistIds = Array.from(
    new Set((recentTracks || []).map((track) => track.artist_id))
  );

  const { data: artistProfiles } =
    artistIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("id, artist_name, display_name")
          .in("id", artistIds)
      : { data: [] };

  const trackMap = new Map((recentTracks || []).map((track) => [track.id, track]));
  const artistMap = new Map(
    (artistProfiles || []).map((artist) => [
      artist.id,
      artist.artist_name || artist.display_name || "YASUH Artist",
    ])
  );

  const recentActivity = listeningEvents
    .map((event) => {
      const track = trackMap.get(event.track_id);
      if (!track) return null;
      return {
        id: event.track_id + event.created_at,
        title: track.title,
        artist: artistMap.get(track.artist_id) || "YASUH Artist",
        listenedSeconds: Number(event.listened_seconds || 0),
        date: event.created_at,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 5);

  const coinBalance = Number(wallet?.coin_balance || 0);
  const totalPurchased = Number(wallet?.total_coins_purchased || 0);
  const paidPurchases = purchases.filter(
    (purchase) => purchase.status?.toLowerCase() === "paid" ||
      purchase.status?.toLowerCase() === "completed"
  );

  const card =
    "rounded-2xl border border-white/10 bg-[#11111d] p-5 shadow-xl shadow-black/20";
  const muted = "text-sm text-gray-400";
  const label = "text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300";

  return (
    <main className="min-h-screen bg-[#080811] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-purple-500/15 bg-[#0b0b17] px-5 py-7 lg:flex">
          <Link href="/" className="mb-12 px-3 text-3xl font-black tracking-tight">
            YASUH<span className="text-purple-500">.</span>
          </Link>
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
            Your Music
          </p>
          <nav className="space-y-2">
            {[
              { href: "/fan-dashboard", icon: "⌂", name: "Dashboard" },
              { href: "/feed", icon: "▤", name: "For You Feed" },
              { href: "/discover-music", icon: "♫", name: "Discover Music" },
              { href: "/following", icon: "♡", name: "Following" },
              { href: "/favorites", icon: "♥", name: "My Favourites" },
              { href: "/discover", icon: "◎", name: "Discover Artists" },
              { href: "/gift-history", icon: "◇", name: "Gift History" },
              { href: "/profile", icon: "●", name: "My Profile" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  item.href === "/fan-dashboard"
                    ? "bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-lg shadow-purple-900/40"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-3 pt-8">
            <form action={signOut}>
              <button className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
          <nav aria-label="Quick navigation" className="mb-6 flex gap-2 overflow-x-auto border-b border-white/[0.06] pb-3 lg:hidden">
            {[
              { href: "/fan-dashboard", name: "Overview" },
              { href: "/feed", name: "For You" },
              { href: "/discover-music", name: "Music" },
              { href: "/social", name: "Live Social" },
              { href: "/following", name: "Following" },
              { href: "/profile", name: "Profile" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${item.href === "/fan-dashboard" ? "border-purple-400/40 bg-purple-500/15 text-purple-100" : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-purple-400/30 hover:text-white"}`}>
                {item.name}
              </Link>
            ))}
          </nav>
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-purple-300/25 bg-gradient-to-br from-purple-600 to-fuchsia-700 sm:flex sm:items-center sm:justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-black">{displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className={label}>FAN WORKSPACE</p>
                <h1 className="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">
                  Welcome back, {displayName}
                </h1>
                <p className={`${muted} mt-2`}>
                  Your music, your artists, all in one place.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/profile" className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-purple-400/40 hover:text-white sm:inline-flex">
                My Profile
              </Link>
              <div className="flex gap-2 lg:hidden">
                <Link href="/feed" className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold">
                  For You
                </Link>
                <form action={signOut}>
                  <button className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>

          <div className="mb-7 overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-r from-[#251044] via-[#18102f] to-[#101020] p-6 sm:p-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-200">
                YOUR SOUND. YOUR COMMUNITY.
              </p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                Find your next favourite song.
              </h2>
              <p className="mt-2 text-sm leading-6 text-purple-100/70">
                Explore independent music, follow the artists you love and support them with YASUH Coins.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/feed" className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#171022] hover:bg-purple-100">
                  Open My Music Feed
                </Link>
                <Link href="/discover-music" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                  Discover Music
                </Link>
                <Link href="/social" className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 px-5 py-3 text-sm font-bold text-white hover:bg-fuchsia-500/25">
                  YASUH Social · Live
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className={`${card} bg-gradient-to-br from-[#21143b] to-[#11111d]`}>
              <p className={label}>AVAILABLE COINS</p>
              <p className="mt-3 text-4xl font-black tabular-nums">{coinBalance.toLocaleString("en-CA")}</p>
              <p className={`${muted} mt-2`}>Ready to support your favourite artists</p>
              <Link href="/buy-coins" className="mt-5 inline-flex rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold hover:bg-purple-500">
                Buy Coins
              </Link>
            </div>
            <div className={card}>
              <p className={label}>TOTAL COINS PURCHASED</p>
              <p className="mt-3 text-4xl font-black tabular-nums">{totalPurchased.toLocaleString("en-CA")}</p>
              <p className={`${muted} mt-2`}>Lifetime coin purchases</p>
              <p className="mt-2 text-xs text-gray-500">{paidPurchases.length} completed purchase{paidPurchases.length === 1 ? "" : "s"}</p>
              <p className="mt-3 text-xs text-gray-500">100 coins = CAD $1.00</p>
            </div>
            <div className={card}>
              <p className={label}>ARTISTS FOLLOWING</p>
              <p className="mt-3 text-4xl font-black tabular-nums">{followedArtists}</p>
              <p className={`${muted} mt-2`}>Artists in your music community</p>
              <Link href="/following" className="mt-5 inline-flex text-sm font-bold text-purple-300 hover:text-white">
                View Following →
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className={card}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className={label}>YOUR WALLET</p>
                  <h2 className="mt-1 text-xl font-extrabold">Recent Coin Purchases</h2>
                </div>
                <Link href="/buy-coins" className="text-sm font-bold text-purple-300 hover:text-white">
                  Add Coins
                </Link>
              </div>
              {purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                      <div>
                        <p className="font-bold">{Number(purchase.coins || 0).toLocaleString("en-CA")} Coins</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {purchase.paid_at
                            ? new Date(purchase.paid_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
                            : "Payment pending"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{cad(Number(purchase.amount_cad || 0))}</p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          purchase.status?.toLowerCase() === "paid" || purchase.status?.toLowerCase() === "completed"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : purchase.status?.toLowerCase() === "pending"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-white/10 text-gray-300"
                        }`}>
                          {purchase.status || "Unknown"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <p className="font-semibold">No coin purchases yet</p>
                  <p className={`${muted} mt-1`}>Your purchases will appear here.</p>
                  <Link href="/buy-coins" className="mt-4 inline-block text-sm font-bold text-purple-300">Explore Coin Packages →</Link>
                </div>
              )}
            </section>

            <section className={card}>
              <p className={label}>LISTENING ACTIVITY</p>
              <h2 className="mt-1 text-xl font-extrabold">Recently Played</h2>
              {recentActivity.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                      <p className="font-bold">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-400">{item.artist}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {new Date(item.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        {item.listenedSeconds > 0 ? ` · ${Math.floor(item.listenedSeconds / 60)} min listened` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <p className="font-semibold">Your listening history starts here</p>
                  <p className={`${muted} mt-1`}>Play a song and your recent activity will appear here.</p>
                  <Link href="/discover-music" className="mt-4 inline-block text-sm font-bold text-purple-300">Find Music →</Link>
                </div>
              )}
            </section>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Link href="/favorites" className={`${card} group transition hover:border-purple-400/40`}>
              <p className="text-2xl">♥</p>
              <h3 className="mt-3 text-lg font-extrabold">My Favourites</h3>
              <p className={`${muted} mt-1`}>Return to the songs you have saved.</p>
              <p className="mt-4 text-sm font-bold text-purple-300 group-hover:text-white">Open Favourites →</p>
            </Link>
            <Link href="/discover" className={`${card} group transition hover:border-purple-400/40`}>
              <p className="text-2xl">◎</p>
              <h3 className="mt-3 text-lg font-extrabold">Discover Artists</h3>
              <p className={`${muted} mt-1`}>Meet independent artists and find new music.</p>
              <p className="mt-4 text-sm font-bold text-purple-300 group-hover:text-white">Explore Artists →</p>
            </Link>
          </div>

          {(walletResult.error || purchasesResult.error || followsResult.error || listeningResult.error) && (
            <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200">
              Some dashboard information could not be loaded. Please refresh; if this continues, contact support.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
