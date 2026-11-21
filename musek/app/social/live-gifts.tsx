"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Gift = {
  name: string;
  emoji: string;
  category: string;
  coins: number;
};

type LiveGift = {
  gift_id: string;
  room_id: string;
  coins: number;
  created_at: string;
};

const GIFT_CATALOG: Gift[] = [
  { name: "Heart", emoji: "💗", category: "Love", coins: 10 },
  { name: "Kiss", emoji: "💋", category: "Love", coins: 25 },
  { name: "Teddy", emoji: "🧸", category: "Love", coins: 50 },
  { name: "Love Letter", emoji: "💌", category: "Love", coins: 75 },
  { name: "Rose", emoji: "🌹", category: "Love", coins: 100 },
  { name: "Music Note", emoji: "🎵", category: "Music", coins: 150 },
  { name: "Drum", emoji: "🥁", category: "Music", coins: 200 },
  { name: "Guitar", emoji: "🎸", category: "Music", coins: 250 },
  { name: "Speaker", emoji: "🔊", category: "Music", coins: 300 },
  { name: "Golden Mic", emoji: "🎤", category: "Music", coins: 350 },
  { name: "Confetti", emoji: "🎊", category: "Party", coins: 400 },
  { name: "Party Popper", emoji: "🎉", category: "Party", coins: 500 },
  { name: "Fireworks", emoji: "🎆", category: "Party", coins: 600 },
  { name: "Disco Ball", emoji: "🪩", category: "Party", coins: 750 },
  { name: "Spotlight", emoji: "🔦", category: "Party", coins: 900 },
  { name: "Sunglasses", emoji: "🕶️", category: "Luxury", coins: 1000 },
  { name: "Gold Watch", emoji: "⌚", category: "Luxury", coins: 1250 },
  { name: "Diamond", emoji: "💎", category: "Luxury", coins: 1500 },
  { name: "Sports Car", emoji: "🏎️", category: "Luxury", coins: 1750 },
  { name: "Yacht", emoji: "🛥️", category: "Luxury", coins: 2000 },
  { name: "Crown", emoji: "👑", category: "Royalty", coins: 2500 },
  { name: "Royal Throne", emoji: "🪑", category: "Royalty", coins: 3000 },
  { name: "Castle", emoji: "🏰", category: "Royalty", coins: 3500 },
  { name: "Royal Carriage", emoji: "🐎", category: "Royalty", coins: 4000 },
  { name: "Golden Palace", emoji: "🏯", category: "Royalty", coins: 5000 },
  { name: "Steel Pan", emoji: "🥁", category: "Culture", coins: 6000 },
  { name: "Carnival", emoji: "🎭", category: "Culture", coins: 7500 },
  { name: "Island Escape", emoji: "🏝️", category: "Culture", coins: 10000 },
  { name: "Reggae Vibes", emoji: "🇯🇲", category: "Culture", coins: 12500 },
  { name: "World Tour", emoji: "🌍", category: "Culture", coins: 15000 },
  { name: "Money Rain", emoji: "💸", category: "Power", coins: 20000 },
  { name: "Money Vault", emoji: "🏦", category: "Power", coins: 25000 },
  { name: "Rocket", emoji: "🚀", category: "Power", coins: 30000 },
  { name: "Private Jet", emoji: "🛩️", category: "Power", coins: 40000 },
  { name: "Mansion", emoji: "🏡", category: "Power", coins: 50000 },
  { name: "Dragon", emoji: "🐉", category: "Legend", coins: 60000 },
  { name: "Phoenix", emoji: "🔥", category: "Legend", coins: 75000 },
  { name: "Galaxy", emoji: "🌌", category: "Legend", coins: 100000 },
  { name: "Universe", emoji: "🌠", category: "Legend", coins: 120000 },
  { name: "MUSEK Legend", emoji: "🏆", category: "Legend", coins: 150000 },
];

const CATEGORIES = ["All", "Love", "Music", "Party", "Luxury", "Royalty", "Culture", "Power", "Legend"];

function giftForCoins(coins: number) {
  return GIFT_CATALOG.find((gift) => gift.coins === coins);
}

function formatCoins(coins: number) {
  return coins.toLocaleString("en-CA");
}

export default function LiveGifts({
  roomId,
  creatorId,
  accountType,
}: {
  roomId: string;
  creatorId: string;
  accountType: string;
}) {
  const supabase = createClient();
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [selectedCoins, setSelectedCoins] = useState(100);
  const [category, setCategory] = useState("All");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeGift, setActiveGift] = useState<LiveGift | null>(null);

  const visibleGifts = useMemo(
    () => category === "All" ? GIFT_CATALOG : GIFT_CATALOG.filter((gift) => gift.category === category),
    [category]
  );
  const selectedGift = giftForCoins(selectedCoins);

  // Local-only animation previews: these do not call Supabase or spend coins.
  const previewGift = (coins: number) => {
    const preview: LiveGift = {
      gift_id: "preview-" + crypto.randomUUID(),
      room_id: roomId,
      coins,
      created_at: new Date().toISOString(),
    };
    setActiveGift(preview);
    window.setTimeout(() => {
      setActiveGift((current) => current?.gift_id === preview.gift_id ? null : current);
    }, coins >= 20000 ? 6500 : coins >= 2500 ? 4200 : 2400);
  };

  const loadGifts = useCallback(async () => {
    const { data } = await supabase
      .from("social_live_gifts")
      .select("gift_id,room_id,coins,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(12);
    setGifts((data || []) as LiveGift[]);
  }, [roomId, supabase]);

  useEffect(() => {
    loadGifts();
    const channel = supabase
      .channel("musek-live-gifts-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "social_live_gifts",
          filter: "room_id=eq." + roomId,
        },
        (payload) => {
          const gift = payload.new as LiveGift;
          setActiveGift(gift);
          window.setTimeout(() => {
            setActiveGift((current) => current?.gift_id === gift.gift_id ? null : current);
          }, Number(gift.coins) >= 20000 ? 6500 : Number(gift.coins) >= 2500 ? 4200 : 2400);
          setGifts((current) =>
            current.some((item) => item.gift_id === gift.gift_id)
              ? current
              : [gift, ...current].slice(0, 12)
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGifts, roomId, supabase]);

  const sendGift = async () => {
    if (sending || !selectedGift) return;
    setSending(true);
    setNotice("");
    const { error } = await supabase.rpc("send_social_live_gift", {
      p_room_id: roomId,
      p_coins: selectedGift.coins,
      p_idempotency_key: crypto.randomUUID(),
    });
    setSending(false);
    if (error) {
      setNotice(error.message || "The gift could not be sent.");
      return;
    }
    setNotice(selectedGift.emoji + " " + selectedGift.name + " sent!");
  };

  return (
    <section className="relative mt-5 rounded-2xl border border-purple-400/20 bg-[#171326] p-5">
      {activeGift && (() => {
        const details = giftForCoins(Number(activeGift.coins));
        const tier = Number(activeGift.coins) >= 20000 ? "premium" : Number(activeGift.coins) >= 2500 ? "medium" : "small";
        return (
          <div key={activeGift.gift_id} className={`musek-gift-overlay musek-gift-${tier}`} role="status" aria-live="polite">
            <div className="musek-gift-effects" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
            <div className="musek-gift-content">
              <div className="musek-gift-emoji">{details?.emoji || "🎁"}</div>
              <p className="musek-gift-eyebrow">{tier === "premium" ? "MUSEK LEGENDARY GIFT" : tier === "medium" ? "A BIG MUSEK MOMENT" : "GIFT RECEIVED"}</p>
              <p className="musek-gift-name">{details?.name || "Live gift"}</p>
              <p className="musek-gift-value">{formatCoins(Number(activeGift.coins))} coins</p>
            </div>
          </div>
        );
      })()}
      <style jsx>{`
        .musek-gift-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden; }
        .musek-gift-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 22px 30px; border: 1px solid rgba(216,180,254,.45); border-radius: 24px; background: rgba(20,12,38,.94); box-shadow: 0 0 55px rgba(168,85,247,.38); }
        .musek-gift-emoji { font-size: clamp(54px, 10vw, 112px); line-height: 1.2; filter: drop-shadow(0 0 18px rgba(216,180,254,.8)); }
        .musek-gift-eyebrow { margin-top: 10px; color: #d8b4fe; font-size: 10px; font-weight: 900; letter-spacing: .22em; }
        .musek-gift-name { margin-top: 5px; color: white; font-size: clamp(22px, 4vw, 38px); font-weight: 900; }
        .musek-gift-value { margin-top: 4px; color: #e9d5ff; font-size: 13px; }
        .musek-gift-small { inset: auto 18px 24px auto; width: auto; height: auto; animation: gift-fade 2.4s ease both; }
        .musek-gift-small .musek-gift-content { flex-direction: row; gap: 12px; padding: 10px 16px; border-radius: 18px; }
        .musek-gift-small .musek-gift-emoji { font-size: 38px; animation: gift-bounce .7s ease-in-out 2; }
        .musek-gift-small .musek-gift-eyebrow { margin: 0; text-align: left; }
        .musek-gift-small .musek-gift-name { margin: 2px 0 0; font-size: 17px; }
        .musek-gift-small .musek-gift-value { margin: 0; text-align: left; }
        .musek-gift-medium { background: radial-gradient(circle, rgba(88,28,135,.35), rgba(0,0,0,.55) 68%); animation: gift-fade 4.2s ease both; }
        .musek-gift-medium .musek-gift-emoji { animation: gift-pop 1s cubic-bezier(.2,.8,.2,1) both; }
        .musek-gift-premium { background: radial-gradient(circle, rgba(88,28,135,.58), rgba(4,3,14,.88) 72%); animation: gift-fade 6.5s ease both; }
        .musek-gift-premium .musek-gift-content { border-color: rgba(250,204,21,.7); background: linear-gradient(145deg, rgba(49,26,82,.97), rgba(9,8,24,.97)); box-shadow: 0 0 90px rgba(250,204,21,.32), 0 0 150px rgba(168,85,247,.35); animation: gift-legend 1.2s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-premium .musek-gift-eyebrow { color: #fde68a; }
        .musek-gift-premium .musek-gift-emoji { animation: gift-float 2s ease-in-out infinite; }
        .musek-gift-effects { position: absolute; inset: 0; overflow: hidden; }
        .musek-gift-effects span { position: absolute; color: #fef08a; font-size: 30px; text-shadow: 0 0 18px #c084fc; animation: gift-spark 1.8s ease-in-out infinite; }
        .musek-gift-effects span:nth-child(1) { left: 12%; top: 20%; }
        .musek-gift-effects span:nth-child(2) { left: 78%; top: 18%; animation-delay: .3s; }
        .musek-gift-effects span:nth-child(3) { left: 18%; top: 72%; animation-delay: .6s; }
        .musek-gift-effects span:nth-child(4) { left: 84%; top: 70%; animation-delay: .9s; }
        .musek-gift-effects span:nth-child(5) { left: 50%; top: 10%; animation-delay: 1.2s; }
        .musek-gift-effects span:nth-child(6) { left: 52%; top: 85%; animation-delay: 1.5s; }
        @keyframes gift-bounce { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-12px) scale(1.12); } }
        @keyframes gift-pop { 0% { transform: scale(.25) rotate(-18deg); opacity: 0; } 65% { transform: scale(1.2) rotate(8deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
        @keyframes gift-legend { 0% { transform: scale(.15) rotate(-8deg); opacity: 0; } 70% { transform: scale(1.12) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
        @keyframes gift-float { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-16px) rotate(4deg); } }
        @keyframes gift-spark { 0%,100% { opacity: .2; transform: scale(.6) rotate(0); } 50% { opacity: 1; transform: scale(1.35) rotate(45deg); } }
        @keyframes gift-fade { 0% { opacity: 0; } 12%,78% { opacity: 1; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .musek-gift-overlay, .musek-gift-overlay * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[.2em] text-purple-300">SUPPORT THE ARTIST</p>
          <h3 className="mt-1 text-lg font-black">MUSEK Gift Shop 🎁</h3>
          <p className="mt-1 text-xs text-gray-400">40 gifts · 100 coins = CAD $1 · Artist receives 70%</p>
        </div>
        {accountType === "fan" && creatorId !== "" && (
          <div className="rounded-lg border border-purple-300/20 bg-purple-500/10 px-3 py-2 text-right">
            <p className="text-[10px] text-purple-200">SELECTED GIFT</p>
            <p className="text-sm font-bold">{selectedGift?.emoji} {selectedGift?.name}</p>
            <p className="text-xs text-gray-300">{formatCoins(selectedCoins)} coins · CAD ${(selectedCoins / 100).toFixed(2)}</p>
          </div>
        )}
      </div>

      <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={category === item
                  ? "shrink-0 rounded-full bg-purple-600 px-3 py-2 text-xs font-bold text-white"
                  : "shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-purple-400/50"}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleGifts.map((gift) => (
              <button
                key={gift.coins}
                type="button"
                disabled={sending}
                onClick={() => setSelectedCoins(gift.coins)}
                aria-pressed={selectedCoins === gift.coins}
                className={selectedCoins === gift.coins
                  ? "rounded-xl border border-purple-300 bg-purple-500/20 p-3 text-left ring-1 ring-purple-300/40"
                  : "rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-purple-400/50"}
              >
                <span className="text-2xl">{gift.emoji}</span>
                <span className="mt-2 block text-xs font-bold">{gift.name}</span>
                <span className="mt-1 block text-[11px] text-gray-400">{formatCoins(gift.coins)} coins</span>
              </button>
            ))}
          </div>
          {accountType === "fan" && creatorId !== "" && (
            <button
              type="button"
              onClick={sendGift}
              disabled={sending || !selectedGift}
              className="mt-4 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold hover:bg-purple-500 disabled:opacity-50"
            >
              {sending ? "Sending gift…" : "Send " + (selectedGift?.name || "gift")}
            </button>
          )}
      </>

      <div className="mt-4 rounded-xl border border-dashed border-purple-300/25 bg-purple-500/[0.06] p-3">
        <p className="text-[10px] font-black tracking-[.18em] text-purple-200">ANIMATION TEST · NO COINS SPENT</p>
        <p className="mt-1 text-xs text-gray-400">Preview each gift effect without sending a real gift.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => previewGift(10)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold hover:border-purple-300/50">Preview small ✨</button>
          <button type="button" onClick={() => previewGift(2500)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold hover:border-purple-300/50">Preview medium 💎</button>
          <button type="button" onClick={() => previewGift(20000)} className="rounded-lg border border-amber-300/20 bg-amber-400/[.08] px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-300/50">Preview premium 🌌</button>
        </div>
      </div>
      {notice && <p role="status" className="mt-3 text-xs text-purple-200">{notice}</p>}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="mb-2 text-xs font-bold text-gray-300">Recent gifts in this room</p>
        {gifts.length === 0 ? (
          <p className="text-xs text-gray-500">Be the first to support this artist live.</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((gift) => {
              const details = giftForCoins(Number(gift.coins));
              return (
                <li key={gift.gift_id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                  <span>{details?.emoji || "🎁"} {details?.name || "Live gift"} · {formatCoins(Number(gift.coins))} coins</span>
                  <span className="text-xs text-gray-500">{new Date(gift.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
