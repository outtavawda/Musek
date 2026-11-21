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

  const visibleGifts = useMemo(
    () => category === "All" ? GIFT_CATALOG : GIFT_CATALOG.filter((gift) => gift.category === category),
    [category]
  );
  const selectedGift = giftForCoins(selectedCoins);

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
    <section className="mt-5 rounded-2xl border border-purple-400/20 bg-[#171326] p-5">
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

      {accountType === "fan" && creatorId !== "" && (
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
          <button
            type="button"
            onClick={sendGift}
            disabled={sending || !selectedGift}
            className="mt-4 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold hover:bg-purple-500 disabled:opacity-50"
          >
            {sending ? "Sending gift…" : "Send " + (selectedGift?.name || "gift")}
          </button>
        </>
      )}

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
