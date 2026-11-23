"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import GiftArtwork from "./gift-artwork";
const RealGift3D = dynamic(() => import("./real-gift-3d"), { ssr: false, loading: () => <div className="h-[240px] w-full animate-pulse rounded-xl bg-gradient-to-br from-indigo-950 via-purple-950 to-black" aria-label="Loading 3D gift" /> });
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
  sender_id: string;
  coins: number;
  created_at: string;
  sender_name?: string;
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

function giftImagePath(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `/gifts/${slug}.webp`;
}

export default function LiveGifts({
  roomId,
  creatorId,
  accountType,
  userId,
}: {
  roomId: string;
  creatorId: string;
  accountType: string;
  userId: string;
}) {
  const supabase = createClient();
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [selectedCoins, setSelectedCoins] = useState(100);
  const [category, setCategory] = useState("All");
  const [sending, setSending] = useState(false);
  const [giftRequestKey, setGiftRequestKey] = useState("");
  const [notice, setNotice] = useState("");
  const [activeGift, setActiveGift] = useState<LiveGift | null>(null);
  const [giftQueue, setGiftQueue] = useState<LiveGift[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shopPanelRef = useRef<HTMLDivElement | null>(null);
  const shopTriggerRef = useRef<HTMLButtonElement | null>(null);
  const giftTapRef = useRef<{ coins: number; at: number } | null>(null);

  useEffect(() => {
    if (!shopOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (shopPanelRef.current?.contains(target)) return;
      if (shopTriggerRef.current?.contains(target)) return;
      setShopOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [shopOpen]);

  const visibleGifts = useMemo(
    () => category === "All" ? GIFT_CATALOG : GIFT_CATALOG.filter((gift) => gift.category === category),
    [category]
  );
  const selectedGift = giftForCoins(selectedCoins);

  const enqueueGift = useCallback((gift: LiveGift) => {
    setGiftQueue((current) => [...current, gift].slice(-8));
  }, []);

  const playGiftSound = useCallback((coins: number) => {
    const context = audioContextRef.current;
    if (!soundEnabled || !context || context.state !== "running") return;

    // Each tier has a distinct short sonic signature. Keep the mix quiet
    // enough to sit underneath live speech and music.
    const tier = coins >= 60000 ? "legendary" : coins >= 20000 ? "premium" : coins >= 2500 ? "medium" : "small";
    const notes = tier === "legendary"
      ? [392, 523.25, 659.25, 783.99, 1046.5]
      : tier === "premium"
        ? [349.23, 440, 587.33, 698.46]
        : tier === "medium"
          ? [440, 554.37, 659.25]
          : [659.25, 987.77];

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(tier === "legendary" ? 0.075 : 0.045, now + 0.035);
    master.gain.exponentialRampToValueAtTime(0.0001, now + (tier === "legendary" ? 1.25 : 0.72));
    master.connect(context.destination);

    notes.forEach((frequency, index) => {
      const startAt = now + index * (tier === "legendary" ? 0.095 : 0.075);
      const oscillator = context.createOscillator();
      const overtone = context.createOscillator();
      const voiceGain = context.createGain();
      const overtoneGain = context.createGain();
      const filter = context.createBiquadFilter();

      oscillator.type = tier === "small" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(frequency * 2.01, startAt);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(tier === "legendary" ? 3200 : 2200, startAt);

      voiceGain.gain.setValueAtTime(0.0001, startAt);
      voiceGain.gain.linearRampToValueAtTime(0.72, startAt + 0.025);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.48);
      overtoneGain.gain.setValueAtTime(0.0001, startAt);
      overtoneGain.gain.linearRampToValueAtTime(0.16, startAt + 0.02);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);

      oscillator.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(master);
      overtone.connect(overtoneGain);
      overtoneGain.connect(master);
      oscillator.start(startAt);
      overtone.start(startAt);
      oscillator.stop(startAt + 0.5);
      overtone.stop(startAt + 0.32);
    });
  }, [soundEnabled]);

  const toggleSound = async () => {
    if (!audioContextRef.current) audioContextRef.current = new window.AudioContext();
    if (soundEnabled) {
      setSoundEnabled(false);
      if (audioContextRef.current.state === "running") await audioContextRef.current.suspend();
    } else {
      if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();
      setSoundEnabled(true);
    }
  };

  useEffect(() => {
    if (!activeGift && giftQueue.length > 0) {
      setActiveGift(giftQueue[0]);
      setGiftQueue((current) => current.slice(1));
      return;
    }
    if (!activeGift) return;
    const coins = Number(activeGift.coins);
    const duration = coins >= 60000 ? 8000 : coins >= 20000 ? 6500 : coins >= 2500 ? 4500 : 2800;
    const timeout = window.setTimeout(() => setActiveGift(null), duration);
    return () => window.clearTimeout(timeout);
  }, [activeGift, giftQueue]);

  // Local-only animation previews: these do not call Supabase or spend coins.
  const previewGift = (coins: number) => {
    const preview: LiveGift = {
      gift_id: "preview-" + crypto.randomUUID(),
      room_id: roomId,
      sender_id: userId,
      sender_name: "Preview",
      coins,
      created_at: new Date().toISOString(),
    };
    enqueueGift(preview);
    playGiftSound(coins);
  };

  const loadGifts = useCallback(async () => {
    const { data } = await supabase
      .from("social_live_gifts")
      .select("gift_id,room_id,sender_id,coins,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(12);
    const rows = (data || []) as LiveGift[];
    const senderIds = Array.from(new Set(rows.map((gift) => gift.sender_id).filter(Boolean)));
    const { data: profiles } = senderIds.length
      ? await supabase.from("user_profiles").select("id,display_name,artist_name").in("id", senderIds)
      : { data: [] as { id: string; display_name: string | null; artist_name: string | null }[] };
    const names = new Map((profiles || []).map((profile) => [profile.id, profile.artist_name || profile.display_name || "MUSEK Member"]));
    setGifts(rows.map((gift) => ({ ...gift, sender_name: names.get(gift.sender_id) || "MUSEK Member" })));
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
        async (payload) => {
          const gift = payload.new as LiveGift;
          const { data: sender } = await supabase.from("user_profiles").select("display_name,artist_name").eq("id", gift.sender_id).maybeSingle();
          const enrichedGift = { ...gift, sender_name: sender?.artist_name || sender?.display_name || "MUSEK Member" };
          enqueueGift(enrichedGift);
          playGiftSound(Number(gift.coins));
          setGifts((current) =>
            current.some((item) => item.gift_id === gift.gift_id)
              ? current
              : [enrichedGift, ...current].slice(0, 12)
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enqueueGift, loadGifts, playGiftSound, roomId, supabase]);

  const sendGift = async (giftOverride?: Gift) => {
    const gift = giftOverride || selectedGift;
    if (sending || !gift || accountType !== "fan" || !creatorId) return;
    const requestKey = giftRequestKey || crypto.randomUUID();
    setGiftRequestKey(requestKey);
    setSending(true);
    setNotice("");
    try {
      const { error } = await supabase.rpc("send_social_live_gift", {
        p_room_id: roomId,
        p_coins: gift.coins,
        p_idempotency_key: requestKey,
      });
      if (error) {
        setNotice(error.message || "The gift could not be confirmed. Retry the same gift to safely check its status.");
        return;
      }
      setGiftRequestKey("");
      setNotice(gift.emoji + " " + gift.name + " sent!");
    } catch {
      setNotice("We could not confirm the gift. Retry the same gift; MUSEK will reuse the same transaction key to prevent a duplicate charge.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="relative w-full">
      {activeGift && (() => {
        const details = giftForCoins(Number(activeGift.coins));
        const tier = Number(activeGift.coins) >= 60000 ? "legendary" : Number(activeGift.coins) >= 20000 ? "premium" : Number(activeGift.coins) >= 2500 ? "medium" : "small";
        return (
          <div key={activeGift.gift_id} className={`musek-gift-overlay musek-gift-${tier} musek-gift-event-${(details?.name || "gift").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} role="status" aria-live="polite">
            {tier === "legendary" && (
              <div className="musek-legendary-event" aria-hidden="true">
                <div className="musek-event-vignette" />
                <div className="musek-event-shockwave" />
                <div className="musek-event-beam musek-event-beam-one" />
                <div className="musek-event-beam musek-event-beam-two" />
                <div className="musek-event-title">A LEGENDARY MOMENT</div>
                <div className="musek-event-embers">{Array.from({ length: 34 }, (_, index) => <i key={index} style={{ "--ember": index } as React.CSSProperties} />)}</div>
              </div>
            )}
            <div className="musek-gift-effects" aria-hidden="true">{Array.from({ length: tier === "legendary" ? 30 : 18 }, (_, index) => <span key={index}>{index % 3 === 0 ? "✦" : index % 3 === 1 ? "✧" : "•"}</span>)}</div>
            <div className="musek-gift-flight">
              <div className="musek-gift-content">
                {tier === "premium" || tier === "legendary" ? (
                  <RealGift3D giftName={details?.name || "Galaxy"} senderName={activeGift.sender_name || "A fan"} />
                ) : (
                  <GiftArtwork category={details?.category || "Legend"} name={details?.name || "Live gift"} emoji={details?.emoji || "🎁"} tier={tier} />
                )}
{tier !== "premium" && tier !== "legendary" && <>
                  <p className="musek-gift-eyebrow">{tier === "medium" ? "A BIG MUSEK MOMENT" : "GIFT RECEIVED"}</p>
                  <p className="musek-gift-name">{details?.name || "Live gift"}</p>
                  <p className="musek-gift-value">{formatCoins(Number(activeGift.coins))} coins</p>
                  <p className="musek-gift-sender">sent by {activeGift.sender_name || "a MUSEK fan"}</p>
                </>}
              </div>
            </div>
          </div>
        );
      })()}
      <style jsx>{`
        .musek-gift-overlay { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden; isolation: isolate; background: transparent; }
        .musek-cosmic-reveal { position:relative; width:min(82vw,437px); height:clamp(240px,58vw,390px); overflow:hidden; display:flex; align-items:center; justify-content:center; isolation:isolate; background:radial-gradient(ellipse at 50% 55%,#172c89 0%,#111044 38%,#05051d 72%,#02020d 100%); border-radius:18px; box-shadow:0 0 55px rgba(99,102,241,.45); }
        .musek-cosmic-nebula { position:absolute; inset:-35%; background:radial-gradient(ellipse at 28% 42%,rgba(0,140,255,.7),transparent 28%),radial-gradient(ellipse at 70% 30%,rgba(168,85,247,.65),transparent 30%),radial-gradient(ellipse at 52% 70%,rgba(14,165,233,.48),transparent 32%); filter:blur(16px); animation:cosmic-nebula 16s linear infinite; }
        .musek-cosmic-stars { position:absolute; inset:0; }
        .musek-cosmic-stars i { position:absolute; left:calc((var(--star) * 37.1%) - 350%); top:calc((var(--star) * 23.7%) - 190%); width:3px; height:3px; border-radius:50%; background:#fff; box-shadow:0 0 9px #a5f3fc,0 0 18px #c084fc; animation:cosmic-star calc(2.2s + (var(--star) * .09s)) ease-in-out infinite; }
        .musek-cosmic-planet { position:absolute; border-radius:50%; background:radial-gradient(circle at 32% 28%,#a5f3fc,#2563eb 45%,#101044 78%); box-shadow:0 0 20px rgba(96,165,250,.6); }
        .musek-cosmic-planet-one { width:34px; height:34px; left:9%; top:48%; }
        .musek-cosmic-planet-two { width:17px; height:17px; right:12%; top:35%; background:radial-gradient(circle at 30% 30%,#fde68a,#b45309 60%,#451a03); }
        .musek-cosmic-orbit { position:absolute; left:50%; top:59%; width:86%; height:27%; border:2px solid rgba(251,191,36,.88); border-radius:50%; transform:translate(-50%,-50%) rotate(-9deg); box-shadow:0 0 14px #f59e0b,inset 0 0 14px rgba(168,85,247,.75); animation:cosmic-orbit 3.8s linear infinite; }
        .musek-cosmic-orbit-two { width:96%; height:34%; border-color:rgba(192,132,252,.75); transform:translate(-50%,-50%) rotate(12deg); animation-direction:reverse; }
        .musek-cosmic-gift { position:relative; z-index:2; width:42%; aspect-ratio:1; margin-top:5%; filter:drop-shadow(0 18px 18px rgba(0,0,0,.6)); animation:cosmic-gift-float 2.4s ease-in-out infinite; transform-style:preserve-3d; }
        .musek-cosmic-box { position:absolute; left:12%; top:37%; width:76%; height:55%; background:linear-gradient(110deg,#17104e 0%,#4c1d95 42%,#1e1b4b 100%); border:3px solid #fbbf24; transform:skewY(-3deg) rotateX(4deg); box-shadow:inset 0 0 22px rgba(56,189,248,.38),0 0 24px rgba(250,204,21,.38); }
        .musek-cosmic-box:before { content:""; position:absolute; left:43%; top:0; width:15%; height:100%; background:linear-gradient(90deg,#b45309,#fde68a,#f59e0b); }
        .musek-cosmic-box:after { content:""; position:absolute; left:-4%; top:-12%; width:108%; height:18%; background:linear-gradient(#fef3c7,#f59e0b 45%,#92400e); border:2px solid #fde68a; }
        .musek-cosmic-box i { position:absolute; left:0; top:50%; width:100%; height:5px; background:#fcd34d; box-shadow:0 0 10px #fef08a; }
        .musek-cosmic-box b { position:absolute; right:9%; top:23%; width:18%; height:35%; border:2px solid #fcd34d; border-radius:50%; transform:rotate(24deg); }
        .musek-cosmic-box span { position:absolute; left:9%; top:23%; width:18%; height:35%; border:2px solid #fcd34d; border-radius:50%; transform:rotate(-24deg); }
        .musek-cosmic-bow { position:absolute; z-index:3; left:29%; top:16%; width:42%; height:25%; }
        .musek-cosmic-bow i,.musek-cosmic-bow b { position:absolute; top:0; width:48%; height:72%; border:5px solid #fde68a; border-radius:80% 80% 12% 80%; background:linear-gradient(135deg,#fef3c7,#d97706); box-shadow:0 0 12px #fbbf24; }
        .musek-cosmic-bow i { left:0; transform:rotate(25deg); } .musek-cosmic-bow b { right:0; transform:scaleX(-1) rotate(25deg); }
        .musek-cosmic-bow span { position:absolute; left:40%; top:35%; width:20%; height:25%; border-radius:50%; background:#fff7cc; box-shadow:0 0 12px #fef08a; }
        .musek-cosmic-caption { position:absolute; z-index:4; top:12px; left:12px; right:12px; display:flex; align-items:center; gap:7px; padding:8px 10px; border-radius:30px; background:rgba(3,3,20,.68); color:white; font-size:clamp(10px,2.5vw,14px); text-shadow:0 1px 5px #000; }
        .musek-cosmic-caption b { color:#fde047; } .musek-cosmic-sender { display:grid; width:27px; height:27px; flex:0 0 27px; place-items:center; border-radius:50%; background:linear-gradient(135deg,#c084fc,#2563eb); font-weight:900; }
        @keyframes cosmic-orbit { from { transform:translate(-50%,-50%) rotate(-9deg); } to { transform:translate(-50%,-50%) rotate(351deg); } }
        @keyframes cosmic-gift-float { 0%,100% { transform:translateY(0) rotateY(-7deg); } 50% { transform:translateY(-12px) rotateY(7deg); } }
        .musek-gift-flight { position: relative; z-index: 3; display: flex; align-items: center; justify-content: center; max-width: 100vw; will-change: transform, opacity; animation: musek-gift-flight 2.8s cubic-bezier(.22,.72,.22,1) both; }
        .musek-gift-medium .musek-gift-flight { animation-duration: 4.5s; }
        .musek-gift-premium .musek-gift-flight { animation-duration: 6.5s; }
        .musek-gift-legendary .musek-gift-flight { animation-duration: 8s; }
        @keyframes musek-gift-flight { 0% { opacity:0; transform:translate3d(-115vw,18vh,0) scale(.62) rotate(-9deg); } 16% { opacity:1; transform:translate3d(-55vw,7vh,0) scale(.78) rotate(-5deg); } 42% { opacity:1; transform:translate3d(0,0,0) scale(1.04) rotate(0); } 62% { opacity:1; transform:translate3d(0,0,0) scale(1) rotate(0); } 84% { opacity:1; transform:translate3d(58vw,-5vh,0) scale(.82) rotate(5deg); } 100% { opacity:0; transform:translate3d(115vw,-18vh,0) scale(.62) rotate(9deg); } }
        .musek-gift-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 18px 22px; border: 0; border-radius: 0; background: transparent; box-shadow: none; backdrop-filter: none; }
        .musek-gift-art { position: relative; display: grid; width: clamp(150px, 24vw, 250px); aspect-ratio: 1; place-items: center; perspective: 900px; transform-style: preserve-3d; }
        .musek-gift-art-aura { position: absolute; inset: 12%; border-radius: 50%; background: radial-gradient(circle,rgba(192,132,252,.42),rgba(124,58,237,.12) 48%,transparent 72%); transform: translateZ(-35px); }
        .musek-gift-art-svg { position: relative; z-index: 1; width: 100%; height: 100%; overflow: visible; transform-style: preserve-3d; filter: drop-shadow(0 18px 14px rgba(0,0,0,.4)); animation: gift-object-turn 5s ease-in-out infinite; }
        .musek-gift-art-svg .gift-object { transform-origin: 110px 110px; animation: gift-object-float 2.6s ease-in-out infinite; }
        .musek-gift-art-fallback { position: absolute; right: 8%; bottom: 9%; z-index: 2; font-size: clamp(22px,4vw,36px); filter: drop-shadow(0 3px 5px rgba(0,0,0,.55)); }
        .musek-gift-art-small { width: 58px; flex: 0 0 58px; }
        .musek-gift-art-small .musek-gift-art-fallback { display: none; }
        .musek-gift-art-medium { animation: gift-art-entry .8s cubic-bezier(.2,.8,.2,1) both; }
        .musek-gift-art-premium .musek-gift-art-aura,.musek-gift-art-legendary .musek-gift-art-aura { background: radial-gradient(circle,rgba(250,204,21,.38),rgba(168,85,247,.22) 48%,transparent 72%); }
        .musek-gift-art-legendary { width: clamp(190px,31vw,320px); animation: gift-art-entry 1.1s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-art-legendary .musek-gift-art-svg { animation-duration: 3.2s; }
        .musek-gift-art-legendary .musek-gift-art-fallback { right: 5%; bottom: 6%; font-size: 44px; }
        .musek-gift-eyebrow { margin-top: 10px; color: #d8b4fe; font-size: 10px; font-weight: 950; letter-spacing: .24em; }
        .musek-gift-name { margin-top: 5px; color: white; font-size: clamp(24px, 4vw, 42px); font-weight: 950; text-shadow: 0 3px 22px rgba(192,132,252,.45); }
        .musek-gift-value { margin-top: 4px; color: #e9d5ff; font-size: 13px; font-weight: 800; }
        .musek-gift-sender { margin-top: 8px; color: rgba(255,255,255,.72); font-size: 11px; letter-spacing: .04em; }
        .musek-gift-small { inset: 0; width: 100%; height: 100%; animation: gift-fade 2.8s ease both; }
        .musek-gift-small .musek-gift-content { flex-direction: row; gap: 10px; padding: 8px 14px; border-radius: 18px; }
        .musek-gift-small .musek-gift-art { animation: gift-bounce .7s ease-in-out 2; }
        .musek-gift-small .musek-gift-eyebrow { margin: 0; text-align: left; }
        .musek-gift-small .musek-gift-name { margin: 2px 0 0; font-size: 17px; }
        .musek-gift-small .musek-gift-value { margin: 0; text-align: left; }
        .musek-gift-small .musek-gift-sender { display: none; }
        .musek-gift-medium { background: radial-gradient(circle, rgba(147,51,234,.3), rgba(0,0,0,.58) 70%); animation: gift-fade 4.5s ease both; }
        .musek-gift-medium .musek-gift-art-svg { animation: gift-object-turn 2.5s ease-in-out infinite; }
        .musek-gift-premium { background: radial-gradient(circle, rgba(147,51,234,.48), rgba(4,3,14,.84) 72%); animation: gift-fade 6.5s ease both; }
        .musek-gift-premium .musek-gift-content { border-color: rgba(250,204,21,.75); background: linear-gradient(145deg,rgba(73,42,101,.98),rgba(12,8,28,.98)); box-shadow: 0 0 70px rgba(250,204,21,.34), 0 0 150px rgba(168,85,247,.48), inset 0 1px rgba(255,255,255,.35); animation: gift-legend 1.2s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-premium .musek-gift-flight,.musek-gift-legendary .musek-gift-flight { width:100vw; height:100dvh; }
        .musek-gift-premium .musek-gift-content,.musek-gift-legendary .musek-gift-content { width:100vw; height:100dvh; max-width:none; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; animation:none; }
        .musek-gift-premium .musek-gift-eyebrow { color: #fde68a; }
        .musek-gift-premium .musek-gift-art-svg { animation-duration: 3.2s; }
        .musek-gift-legendary { background: radial-gradient(circle at 50% 48%,rgba(234,179,8,.34),rgba(88,28,135,.48) 38%,rgba(2,2,12,.94) 78%); animation: gift-fade 8s ease both; }
        .musek-gift-legendary .musek-gift-content { border: 1px solid rgba(253,224,71,.9); background: linear-gradient(145deg,rgba(89,52,16,.96),rgba(34,14,60,.98) 48%,rgba(7,7,20,.98)); box-shadow: 0 0 35px rgba(253,224,71,.75),0 0 120px rgba(168,85,247,.72),0 0 220px rgba(217,70,239,.35),inset 0 1px rgba(255,255,255,.5); animation: gift-legendary-entry 1.5s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-legendary .musek-gift-eyebrow { color: #fef08a; }
        .musek-gift-legendary .musek-gift-art-svg { animation-duration: 2.8s; }
        .musek-legendary-event { position:absolute; inset:0; overflow:hidden; z-index:0; }
        .musek-event-vignette { position:absolute; inset:0; background:radial-gradient(ellipse at center,transparent 8%,rgba(0,0,0,.28) 58%,rgba(0,0,0,.86) 100%); animation:event-vignette 8s ease both; }
        .musek-event-shockwave { position:absolute; left:50%; top:50%; width:18vmin; aspect-ratio:1; border:3px solid rgba(253,224,71,.9); border-radius:50%; transform:translate(-50%,-50%) scale(.1); box-shadow:0 0 35px #facc15,inset 0 0 35px #c084fc; animation:event-shockwave 1.35s cubic-bezier(.12,.7,.2,1) both; }
        .musek-event-beam { position:absolute; left:50%; top:50%; width:2px; height:150vmax; transform-origin:top center; background:linear-gradient(180deg,transparent,rgba(253,224,71,.45),transparent); filter:blur(5px); opacity:0; }
        .musek-event-beam-one { transform:rotate(28deg); animation:event-beam 2.8s ease-in-out .15s both; }
        .musek-event-beam-two { transform:rotate(-32deg); animation:event-beam 2.8s ease-in-out .4s both; }
        .musek-event-title { position:absolute; top:9%; left:0; width:100%; text-align:center; color:#fef3c7; font-size:clamp(11px,2vw,18px); font-weight:1000; letter-spacing:.42em; text-shadow:0 0 18px #f59e0b,0 0 38px #a855f7; animation:event-title 8s ease both; }
        .musek-event-embers { position:absolute; inset:0; overflow:hidden; }
        .musek-event-embers i { position:absolute; left:calc((var(--ember) * 29.7%) - 430%); bottom:-12%; width:3px; height:calc(10px + (var(--ember) * 1.1px)); border-radius:99px; background:linear-gradient(#fff7ed,#f97316,transparent); box-shadow:0 0 12px #fb923c; opacity:0; animation:event-ember calc(2.1s + (var(--ember) * .035s)) ease-out infinite; animation-delay:calc(var(--ember) * -.11s); }
        .musek-gift-event-dragon .musek-gift-content { animation:dragon-reveal 1.8s cubic-bezier(.12,.8,.2,1) both; }
        .musek-gift-event-dragon .musek-gift-art { filter:drop-shadow(0 0 28px rgba(16,185,129,.8)) drop-shadow(0 0 55px rgba(249,115,22,.55)); }
        .musek-gift-event-phoenix .musek-gift-art { filter:drop-shadow(0 0 30px rgba(249,115,22,.9)) drop-shadow(0 0 70px rgba(234,179,8,.55)); }
        .musek-gift-event-galaxy .musek-event-vignette,.musek-gift-event-universe .musek-event-vignette,.musek-gift-event-musek-legend .musek-event-vignette { background:radial-gradient(ellipse at center,rgba(88,28,135,.08),rgba(5,5,20,.28) 52%,rgba(0,0,0,.9) 100%); }
        .musek-gift-event-galaxy .musek-legendary-event:before,.musek-gift-event-universe .musek-legendary-event:before,.musek-gift-event-musek-legend .musek-legendary-event:before { content:""; position:absolute; inset:-35%; background:repeating-radial-gradient(ellipse at 50% 50%,transparent 0 8%,rgba(192,132,252,.18) 8.2% 8.5%,transparent 9% 17%),radial-gradient(ellipse at center,rgba(59,130,246,.2),transparent 62%); animation:cosmic-nebula 8s linear infinite; }
        .musek-gift-event-galaxy .musek-event-shockwave,.musek-gift-event-universe .musek-event-shockwave,.musek-gift-event-musek-legend .musek-event-shockwave { border-color:rgba(103,232,249,.9); box-shadow:0 0 42px #a855f7,inset 0 0 38px #38bdf8; }
        .musek-gift-event-galaxy .musek-event-embers i,.musek-gift-event-universe .musek-event-embers i,.musek-gift-event-musek-legend .musek-event-embers i { width:4px; height:4px; border-radius:50%; background:#e9d5ff; box-shadow:0 0 14px #c084fc,0 0 25px #38bdf8; animation-name:cosmic-star; animation-duration:calc(2s + (var(--ember) * .04s)); }
        .musek-gift-event-galaxy .musek-gift-content,.musek-gift-event-universe .musek-gift-content,.musek-gift-event-musek-legend .musek-gift-content { border-color:rgba(192,132,252,.9); background:linear-gradient(145deg,rgba(30,20,75,.96),rgba(10,8,30,.98)); box-shadow:0 0 45px rgba(59,130,246,.55),0 0 130px rgba(168,85,247,.65),inset 0 1px rgba(255,255,255,.5); }
        .musek-gift-event-galaxy .musek-event-title,.musek-gift-event-universe .musek-event-title,.musek-gift-event-musek-legend .musek-event-title { color:#e9d5ff; text-shadow:0 0 18px #38bdf8,0 0 38px #a855f7; }
        .musek-gift-event-rose .musek-gift-content { border-color:rgba(251,113,133,.9); background:linear-gradient(145deg,rgba(76,12,39,.97),rgba(20,6,25,.98)); box-shadow:0 0 42px rgba(244,63,94,.55),0 0 110px rgba(190,24,93,.35),inset 0 1px rgba(255,255,255,.35); animation:rose-reveal 1.35s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-event-rose .musek-gift-art { filter:drop-shadow(0 0 22px rgba(244,63,94,.85)) drop-shadow(0 0 54px rgba(251,113,133,.48)); }
        .musek-gift-event-rose .musek-event-embers i { background:linear-gradient(#fff1f2,#fb7185,#be123c); box-shadow:0 0 13px #fb7185; }
        .musek-gift-event-rose .musek-event-title { color:#ffe4e6; text-shadow:0 0 18px #fb7185,0 0 36px #be123c; }
        .musek-gift-event-rocket .musek-gift-art { filter:drop-shadow(0 0 25px rgba(56,189,248,.8)) drop-shadow(0 0 65px rgba(249,115,22,.55)); }
        .musek-gift-event-money-rain .musek-gift-effects span,.musek-gift-event-money-vault .musek-gift-effects span { color:#86efac; text-shadow:0 0 18px #22c55e,0 0 30px #facc15; }
        @keyframes cosmic-nebula { from { transform:rotate(0) scale(.92); } to { transform:rotate(360deg) scale(1.08); } }
        @keyframes cosmic-star { 0% { opacity:0; transform:translate3d(0,20px,0) scale(.4); } 25% { opacity:1; } 100% { opacity:0; transform:translate3d(calc((var(--ember) - 16) * 4px),-110vh,0) scale(1.8); } }
        @keyframes rose-reveal { 0% { opacity:0; transform:translateY(45px) scale(.55); filter:blur(12px); } 65% { opacity:1; transform:translateY(-8px) scale(1.07); filter:blur(0); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes event-vignette { 0% { opacity:0; } 12%,82% { opacity:1; } 100% { opacity:0; } }
        @keyframes event-shockwave { 0% { opacity:0; transform:translate(-50%,-50%) scale(.1); } 15% { opacity:1; } 100% { opacity:0; transform:translate(-50%,-50%) scale(15); } }
        @keyframes event-beam { 0%,100% { opacity:0; } 25%,60% { opacity:.7; } }
        @keyframes event-title { 0%,12% { opacity:0; transform:translateY(-18px); } 24%,78% { opacity:1; transform:translateY(0); } 100% { opacity:0; } }
        @keyframes event-ember { 0% { opacity:0; transform:translate3d(0,0,0) rotate(15deg); } 12% { opacity:.95; } 100% { opacity:0; transform:translate3d(calc((var(--ember) - 16) * 2px),-115vh,0) rotate(210deg); } }
        @keyframes dragon-reveal { 0% { opacity:0; transform:translateY(70px) scale(.35) rotateX(35deg); filter:blur(18px); } 60% { opacity:1; transform:translateY(-12px) scale(1.08) rotateX(0); filter:blur(0); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        .musek-gift-effects { position: absolute; inset: 0; overflow: hidden; }
        .musek-gift-effects span { position: absolute; left: calc((var(--spark) * 7.3%) + 3%); top: calc((var(--spark) * 13.7%) + 2%); color: #fef08a; font-size: calc(14px + (var(--spark) * 1.2px)); text-shadow: 0 0 18px #c084fc,0 0 34px #fef08a; animation: gift-spark 1.8s ease-in-out infinite; animation-delay: calc(var(--spark) * -0.17s); }
        .musek-gift-effects span:nth-child(1) { --spark: 1; }
        .musek-gift-effects span:nth-child(2) { --spark: 2; }
        .musek-gift-effects span:nth-child(3) { --spark: 3; }
        .musek-gift-effects span:nth-child(4) { --spark: 4; }
        .musek-gift-effects span:nth-child(5) { --spark: 5; }
        .musek-gift-effects span:nth-child(6) { --spark: 6; }
        .musek-gift-effects span:nth-child(7) { --spark: 7; }
        .musek-gift-effects span:nth-child(8) { --spark: 8; }
        .musek-gift-effects span:nth-child(9) { --spark: 9; }
        .musek-gift-effects span:nth-child(10) { --spark: 10; }
        .musek-gift-effects span:nth-child(11) { --spark: 11; }
        .musek-gift-effects span:nth-child(12) { --spark: 12; }
        .musek-gift-effects span:nth-child(13) { --spark: 13; }
        .musek-gift-effects span:nth-child(14) { --spark: 14; }
        .musek-gift-effects span:nth-child(15) { --spark: 15; }
        .musek-gift-effects span:nth-child(16) { --spark: 16; }
        .musek-gift-effects span:nth-child(17) { --spark: 17; }
        .musek-gift-effects span:nth-child(18) { --spark: 18; }
        @keyframes gift-object-turn { 0%,100% { transform: rotateY(-13deg) rotateX(5deg) translateY(0); } 50% { transform: rotateY(13deg) rotateX(-5deg) translateY(-10px); } }
        @keyframes gift-object-float { 0%,100% { transform: translateY(0) rotateZ(-2deg); } 50% { transform: translateY(-8px) rotateZ(2deg); } }
        @keyframes gift-art-entry { 0% { transform: scale(.35) rotateY(70deg); opacity: 0; } 70% { transform: scale(1.08) rotateY(-8deg); opacity: 1; } 100% { transform: scale(1) rotateY(0); } }
        @keyframes gift-bounce { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-12px) scale(1.12); } }
        @keyframes gift-pop { 0% { transform: scale(.25) rotate(-18deg); opacity: 0; } 65% { transform: scale(1.2) rotate(8deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
        @keyframes gift-legend { 0% { transform: scale(.15) rotate(-8deg); opacity: 0; } 70% { transform: scale(1.12) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
        @keyframes gift-legendary-entry { 0% { transform: scale(.08) rotate(-14deg); opacity: 0; filter: blur(14px); } 55% { transform: scale(1.16) rotate(3deg); opacity: 1; filter: blur(0); } 78% { transform: scale(.96) rotate(-1deg); } 100% { transform: scale(1) rotate(0); } }
        @keyframes gift-legendary-float { 0%,100% { transform: translateY(0) rotate(-5deg) scale(1); } 50% { transform: translateY(-24px) rotate(5deg) scale(1.08); } }
        @keyframes gift-float { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-16px) rotate(4deg); } }
        @keyframes gift-spark { 0%,100% { opacity: .1; transform: scale(.3) rotate(0) translateY(18px); } 50% { opacity: 1; transform: scale(1.5) rotate(65deg) translateY(-12px); } }
        @keyframes gift-fade { 0% { opacity: 0; } 10%,82% { opacity: 1; } 100% { opacity: 0; } }
        @media (max-width: 640px) { .musek-gift-content { max-width: calc(100vw - 32px); padding: 18px 20px; } .musek-gift-small .musek-gift-content { max-width: calc(100vw - 28px); } }
        @media (prefers-reduced-motion: reduce) { .musek-gift-overlay, .musek-gift-overlay * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
      `}</style>
      <button ref={shopTriggerRef} type="button" onClick={() => setShopOpen((open) => !open)} aria-label={shopOpen ? "Close gift store" : "Open gift store"} title={shopOpen ? "Close gifts" : "Gift Store"} aria-expanded={shopOpen} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-fuchsia-300/45 bg-gradient-to-br from-fuchsia-500 to-violet-700 text-2xl text-white shadow-[0_0_22px_rgba(168,85,247,.4)] transition hover:scale-105">
        🎁
      </button>
      {shopOpen && <>
      <button type="button" aria-label="Close gift gallery" onClick={() => setShopOpen(false)} className="fixed inset-0 z-[110] cursor-default bg-black/40 backdrop-blur-[2px]" />
      <div ref={shopPanelRef} onClick={(event) => event.stopPropagation()} className="fixed left-1/2 bottom-[calc(126px+env(safe-area-inset-bottom))] z-[120] max-h-[42dvh] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto overscroll-y-contain rounded-2xl border border-fuchsia-300/25 bg-[#100c1c]/[.98] p-3 shadow-[0_20px_80px_rgba(0,0,0,.8)] backdrop-blur-2xl sm:bottom-[126px] sm:max-h-[48dvh]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[.2em] text-purple-300">SUPPORT THE ARTIST</p>
          <h3 className="mt-1 text-lg font-black">MUSEK Gift Shop 🎁</h3>
          <p className="mt-1 text-[10px] text-gray-400">40 gifts · 100 coins = CAD $1 · Artist receives 70%</p>
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
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1.5">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={category === item
                  ? "shrink-0 rounded-full bg-purple-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
                  : "shrink-0 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-gray-300 hover:border-purple-400/50"}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-1 sm:grid-cols-5">
            {visibleGifts.map((gift) => (
              <button
                key={gift.coins}
                type="button"
                disabled={sending || Boolean(giftRequestKey)}
                onClick={() => {
                  const now = Date.now();
                  const previousTap = giftTapRef.current;
                  if (previousTap?.coins === gift.coins && now - previousTap.at <= 380) {
                    giftTapRef.current = null;
                    void sendGift(gift);
                    return;
                  }
                  giftTapRef.current = { coins: gift.coins, at: now };
                  setSelectedCoins(gift.coins);
                }}
                aria-label={`${gift.name}, ${formatCoins(gift.coins)} coins. Tap to select, double-tap to send.`}
                title="Tap to select · double-tap to send"
                aria-pressed={selectedCoins === gift.coins}
                className={selectedCoins === gift.coins
                  ? "min-w-0 rounded-lg border border-purple-300 bg-purple-500/20 p-1.5 text-left ring-1 ring-purple-300/40"
                  : "min-w-0 rounded-lg border border-white/10 bg-black/20 p-1.5 text-left hover:border-purple-400/50"}
              >
                <img
                  src={giftImagePath(gift.name)}
                  alt={gift.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="mx-auto aspect-square w-full max-w-[112px] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]"
                />
                <span className="mt-1 block truncate text-[10px] font-bold leading-tight">{gift.name}</span>
                <span className="mt-0.5 block text-[9px] leading-tight text-gray-400">{formatCoins(gift.coins)} coins</span>
              </button>
            ))}
          </div>
          {accountType === "fan" && creatorId !== "" && (
            <button
              type="button"
              onClick={() => void sendGift()}
              disabled={sending || !selectedGift}
              className="mt-2.5 w-full rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold hover:bg-purple-500 disabled:opacity-50"
            >
              {sending ? "Sending gift…" : "Send " + (selectedGift?.name || "gift")}
            </button>
          )}
      </>

      <div className="mt-2 rounded-xl border border-dashed border-purple-300/25 bg-purple-500/[0.06] p-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-black tracking-[.18em] text-purple-200">GIFT EFFECTS STUDIO · NO COINS SPENT</p><button type="button" onClick={toggleSound} className={soundEnabled ? "rounded-full border border-purple-300/40 bg-purple-500/20 px-3 py-1.5 text-[10px] font-bold text-purple-100" : "rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold text-gray-400"}>{soundEnabled ? "♫ Sound on" : "♫ Sound off"}</button></div>
        <p className="mt-1 text-xs text-gray-400">Preview effects free. Tap a gift to select it or double-tap to send it.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => previewGift(10)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold hover:border-purple-300/50">Preview small ✨</button>
          <button type="button" onClick={() => previewGift(100)} className="rounded-lg border border-rose-300/20 bg-rose-500/[.08] px-3 py-2 text-xs font-bold text-rose-100 hover:border-rose-300/50">Preview Rose 🌹</button>
          <button type="button" onClick={() => previewGift(100000)} className="rounded-lg border border-sky-300/20 bg-sky-500/[.08] px-3 py-2 text-xs font-bold text-sky-100 hover:border-sky-300/50">Preview Galaxy 🌌</button>
          <button type="button" onClick={() => previewGift(2500)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold hover:border-purple-300/50">Preview medium 💎</button>
          <button type="button" onClick={() => previewGift(60000)} className="rounded-lg border border-amber-300/20 bg-amber-400/[.08] px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-300/50">Preview premium 🌌</button>
          <button type="button" onClick={() => previewGift(150000)} className="rounded-lg border border-fuchsia-300/30 bg-gradient-to-r from-amber-400/10 to-fuchsia-500/15 px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-300/60">Preview legendary 🐉</button>
        </div>
      </div>
      {notice && <p role="status" className="mt-3 text-xs text-purple-200">{notice}</p>}
      <div className="mt-2 border-t border-white/10 pt-2">
        <p className="mb-1 text-[10px] font-bold text-gray-300">Recent gifts in this room</p>
        {gifts.length === 0 ? (
          <p className="text-xs text-gray-500">Be the first to support this artist live.</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((gift) => {
              const details = giftForCoins(Number(gift.coins));
              return (
                <li key={gift.gift_id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                  <span>{details?.emoji || "🎁"} {details?.name || "Live gift"} · {formatCoins(Number(gift.coins))} coins <span className="text-gray-500">from {gift.sender_name || "MUSEK Member"}</span></span>
                  <span className="text-xs text-gray-500">{new Date(gift.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </div>
      </>}
    </section>
  );
}
