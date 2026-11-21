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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const isArtist = profile?.account_type === "artist";
  const { data: gifts, error } = await supabase
    .from("gift_transactions")
    .select("id, sender_id, creator_id, coins, creator_share_cad, musek_share_cad, status, created_at")
    .eq(isArtist ? "creator_id" : "sender_id", user.id)
    .order("created_at", { ascending: false });

  const giftRows = (gifts || []) as Gift[];
  const totalCoins = giftRows.reduce((sum, gift) => sum + Number(gift.coins || 0), 0);
  const totalCreatorShare = giftRows.reduce((sum, gift) => sum + Number(gift.creator_share_cad || 0), 0);
  const totalGiftValue = totalCoins / 100;

  return (
    <main className="min-h-screen bg-[#080811] px-5 py-6 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-[-0.08em]">MUSEK<span className="text-purple-400">.</span></Link>
          <Link href="/dashboard" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-purple-400/40 hover:bg-purple-500/10">Dashboard</Link>
        </nav>

        <section className="relative mt-10 overflow-hidden rounded-[30px] border border-purple-400/20 bg-gradient-to-br from-[#24163b] via-[#171326] to-[#101019] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-purple-500/20 blur-[90px]" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">MUSEK WALLET</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Gift history</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300">{isArtist ? "A record of the support your fans have sent your way." : "A record of the gifts you have sent to support artists."}</p>
          </div>
        </section>

        {!error && (
          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#12111e] p-5">
              <p className="text-xs text-gray-400">{isArtist ? "Coins received" : "Coins sent"}</p>
              <p className="mt-2 text-2xl font-black tabular-nums">{totalCoins.toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">Across {giftRows.length} {giftRows.length === 1 ? "gift" : "gifts"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12111e] p-5">
              <p className="text-xs text-gray-400">{isArtist ? "Creator earnings" : "Gift value"}</p>
              <p className="mt-2 text-2xl font-black tabular-nums">CAD ${(isArtist ? totalCreatorShare : totalGiftValue).toFixed(2)}</p>
              <p className="mt-1 text-xs text-gray-500">{isArtist ? "Creator share from these gifts" : "Based on 100 coins = CAD $1"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12111e] p-5">
              <p className="text-xs text-gray-400">Gift activity</p>
              <p className="mt-2 text-2xl font-black tabular-nums">{giftRows.length}</p>
              <p className="mt-1 text-xs text-gray-500">Transactions recorded</p>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-xl font-black">Recent activity</h2><p className="mt-1 text-xs text-gray-500">Your latest gift transactions</p></div>
            <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-200">{giftRows.length} total</span>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-5 text-sm text-red-200">Unable to load gift history: {error.message}</div>
          ) : giftRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl text-purple-300">🎁</div>
              <h3 className="mt-5 text-lg font-bold">No gifts yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-400">{isArtist ? "When fans send you gifts, your transactions and creator earnings will appear here." : "When you send gifts to artists, your transaction history will appear here."}</p>
              <Link href={isArtist ? "/dashboard" : "/discover"} className="mt-6 inline-flex rounded-full bg-purple-600 px-5 py-3 text-sm font-bold transition hover:bg-purple-500">{isArtist ? "Back to dashboard" : "Discover artists"}</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11101b]">
              {giftRows.map((gift, index) => (
                <article key={gift.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${index > 0 ? "border-t border-white/[0.07]" : ""}`}>
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-2xl">🎁</div>
                    <div className="min-w-0">
                      <h3 className="font-bold">{Number(gift.coins).toLocaleString()} coins</h3>
                      <p className="mt-1 text-xs text-gray-400">{isArtist ? "Gift received" : "Gift sent"} · {new Date(gift.created_at).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-gray-500">Creator share: CAD ${Number(gift.creator_share_cad).toFixed(2)} <span className="px-1 text-gray-700">·</span> MUSEK share: CAD ${Number(gift.musek_share_cad).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold capitalize text-gray-300">{gift.status.replace(/_/g, " ")}</span>
                    <span className="text-sm font-bold tabular-nums text-purple-200">{isArtist ? `+${Number(gift.creator_share_cad).toFixed(2)} CAD` : `-${(Number(gift.coins) / 100).toFixed(2)} CAD`}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="pb-10 pt-8"><Link href="/dashboard" className="text-sm font-semibold text-gray-400 transition hover:text-white">← Back to dashboard</Link></div>
      </div>
    </main>
  );
}
