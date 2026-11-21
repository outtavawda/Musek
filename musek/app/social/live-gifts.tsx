"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LiveGift = {
  gift_id: string;
  room_id: string;
  coins: number;
  created_at: string;
};

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
  const [coins, setCoins] = useState(100);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

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
    if (sending) return;
    setSending(true);
    setNotice("");
    const { error } = await supabase.rpc("send_social_live_gift", {
      p_room_id: roomId,
      p_coins: coins,
      p_idempotency_key: crypto.randomUUID(),
    });
    setSending(false);
    if (error) {
      setNotice(error.message || "The gift could not be sent.");
      return;
    }
    setNotice("🎁 Your gift was sent!");
  };

  return (
    <section className="mt-5 rounded-2xl border border-purple-400/20 bg-[#171326] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[.2em] text-purple-300">SUPPORT THE ARTIST</p>
          <h3 className="mt-1 text-lg font-black">Live gifts 🎁</h3>
          <p className="mt-1 text-xs text-gray-400">100 coins = CAD $1. Artist receives 70%.</p>
        </div>
        {accountType === "fan" && creatorId !== "" && (
          <div className="flex flex-wrap gap-2">
            <select
              value={coins}
              disabled={sending}
              onChange={(event) => setCoins(Number(event.target.value))}
              className="rounded-lg border border-white/10 bg-[#0b0a13] px-3 py-2 text-sm"
              aria-label="Choose live gift amount"
            >
              <option value={100}>🎁 100 coins</option>
              <option value={500}>💜 500 coins</option>
              <option value={1000}>🔥 1,000 coins</option>
            </select>
            <button
              type="button"
              onClick={sendGift}
              disabled={sending}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-500 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send gift"}
            </button>
          </div>
        )}
      </div>
      {notice && <p role="status" className="mt-3 text-xs text-purple-200">{notice}</p>}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="mb-2 text-xs font-bold text-gray-300">Recent gifts in this room</p>
        {gifts.length === 0 ? (
          <p className="text-xs text-gray-500">Be the first to support this artist live.</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((gift) => (
              <li key={gift.gift_id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                <span>🎁 Fan sent {Number(gift.coins).toLocaleString()} coins</span>
                <span className="text-xs text-gray-500">{new Date(gift.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
