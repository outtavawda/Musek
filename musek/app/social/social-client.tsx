"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LiveVideoRoom from "./live-video-room";
import GuestInvites from "./guest-invites";
import LiveGifts from "./live-gifts";
import SocialFeed from "./social-feed";

type Room = {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  host_name: string;
  status: "live" | "ended";
  created_at: string;
  avatar_url?: string | null;
};
type Message = { id: string; room_id: string; user_id: string; display_name: string; message: string; created_at: string };

export default function SocialClient({ userId, displayName, accountType, avatarUrl }: { userId: string; displayName: string; accountType: string; avatarUrl: string | null }) {
  const supabase = createClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatConnection, setChatConnection] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [notice, setNotice] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    const { data, error } = await supabase.from("social_live_rooms")
      .select("id,title,description,host_id,host_name,status,created_at")
      .eq("status", "live").order("created_at", { ascending: false }).limit(50);
    if (error) setNotice("Social rooms are not available yet. Apply the MUSEK Social database migration to enable them.");
    else {
      const roomRows = (data || []) as Room[];
      const hostIds = Array.from(new Set(roomRows.map((room) => room.host_id)));
      const { data: profiles } = hostIds.length
        ? await supabase.from("user_profiles").select("id,avatar_url").in("id", hostIds)
        : { data: [] as { id: string; avatar_url: string | null }[] };
      const avatarByHost = new Map((profiles || []).map((profile) => [profile.id, profile.avatar_url]));
      setRooms(roomRows.map((room) => ({ ...room, avatar_url: avatarByHost.get(room.host_id) || null })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadRooms();
    const channel = supabase.channel("musek-social-room-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_live_rooms" }, loadRooms)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRooms, supabase]);

  useEffect(() => {
    if (!selected) { setMessages([]); setChatConnection("connecting"); return; }
    let active = true;
    setMessages([]);
    setChatConnection("connecting");
    supabase.from("social_live_messages")
      .select("id,room_id,user_id,display_name,message,created_at")
      .eq("room_id", selected.id).order("created_at", { ascending: true }).limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNotice("Chat is not ready. Check that the MUSEK Social migration has been applied.");
        else setMessages((data || []) as Message[]);
      });
    const channel = supabase.channel("musek-social-chat-" + selected.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_live_messages", filter: "room_id=eq." + selected.id },
        (payload) => setMessages((current) => current.some((m) => m.id === (payload.new as Message).id) ? current : [...current, payload.new as Message]))
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") setChatConnection("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setChatConnection("disconnected");
        else setChatConnection("connecting");
      });
    return () => { active = false; setChatConnection("connecting"); supabase.removeChannel(channel); };
  }, [selected, supabase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false); setMicOn(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const enableMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true); setMicOn(true);
      setNotice("Your local camera and microphone preview is ready. Join a LiveKit room to broadcast to other participants once the service credentials are configured.");
    } catch {
      setNotice("Camera or microphone permission was denied, or no device is available.");
    }
  };

  const startRoom = async () => {
    if (!title.trim()) { setNotice("Give your live room a title first."); return; }
    setBusy(true); setNotice("");
    const { data, error } = await supabase.from("social_live_rooms").insert({
      title: title.trim(), description: description.trim() || null,
      host_id: userId, host_name: displayName, status: "live"
    }).select("id,title,description,host_id,host_name,status,created_at").single();
    setBusy(false);
    if (error) { console.error("MUSEK live room creation failed:", error); setNotice(`Could not create the room: ${error.message}${error.code ? ` (code ${error.code})` : ""}`); return; }
    const newRoom = { ...(data as Room), avatar_url: avatarUrl };
    setRooms((current) => [newRoom, ...current]);
    setSelected(newRoom); setTitle(""); setDescription("");
    setNotice("Your MUSEK Social room is open. Chat is live; video broadcasting will activate after the video provider is connected.");
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim() || chatSending) return;
    const roomId = selected.id;
    const message = draft.trim().slice(0, 1000);
    setChatSending(true);
    setNotice("");
    const { data, error } = await supabase.from("social_live_messages").insert({
      room_id: roomId, user_id: userId, display_name: displayName, message
    }).select("id,room_id,user_id,display_name,message,created_at").single();
    setChatSending(false);
    if (error) {
      setNotice(`Message could not be sent: ${error.message}. Check that migrations 004 and 008 are applied and that this room is still live.`);
      return;
    }
    setDraft((current) => current === message ? "" : current);
    if (data && selected?.id === roomId) {
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    }
  };

  const endRoom = async () => {
    if (!selected || selected.host_id !== userId || ending) return;
    if (!window.confirm("End this live room? Viewers will no longer be able to join.")) return;
    setEnding(true);
    const { error } = await supabase.from("social_live_rooms")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", selected.id).eq("host_id", userId);
    setEnding(false);
    if (error) { setNotice("Could not end the live room. Please try again."); return; }
    stopMedia(); setSelected(null); await loadRooms(); setNotice("Your live room has ended.");
  };

  const react = async (emoji: string) => {
    if (!selected) return;
    const { error } = await supabase.from("social_live_reactions").insert({ room_id: selected.id, user_id: userId, emoji });
    if (error) setNotice("Reactions will be available after the social database migration is applied.");
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-[#080811] pb-24 text-white sm:px-5">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#080811]/95 px-4 py-3 backdrop-blur-xl sm:rounded-b-2xl">
        <div className="flex items-center gap-2"><span className="text-xl font-black tracking-tight">MUSEK<span className="text-fuchsia-400">.</span></span><span className="rounded-full bg-fuchsia-500/15 px-2 py-1 text-[9px] font-black tracking-widest text-fuchsia-200">LIVE</span></div>
        <div className="flex items-center gap-3 text-xs"><Link href="/feed" className="text-gray-400 hover:text-white">Music</Link><Link href="/profile" className="rounded-full border border-white/10 px-3 py-2 font-semibold">Profile</Link></div>
      </header>

      <main className="px-3 pt-5 sm:px-0 sm:pt-7">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black tracking-[.24em] text-fuchsia-300">YOUR COMMUNITY, LIVE</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Discover live</h1><p className="mt-1 text-xs text-gray-400 sm:text-sm">Music, conversations and creators in real time.</p></div>
          <button onClick={() => document.getElementById("start-room")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="shrink-0 rounded-full bg-fuchsia-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-fuchsia-950/40">＋ Go LIVE</button>
        </div>

        {notice && <div role="status" className="mb-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-xs leading-5 text-fuchsia-100">{notice}</div>}

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-extrabold">Live now</h2><span className="text-[10px] font-semibold text-gray-500">{rooms.length} streaming</span></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button onClick={() => document.getElementById("start-room")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
              <span className="grid h-[62px] w-[62px] place-items-center rounded-full border-2 border-dashed border-fuchsia-400/60 bg-fuchsia-500/10 text-2xl text-fuchsia-200">＋</span><span className="text-[10px] font-bold text-gray-300">Your LIVE</span>
            </button>
            {rooms.map((room) => <button key={room.id} onClick={() => setSelected(room)} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
              <span className="rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-400 to-amber-300 p-[2px]"><span className="grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full border-2 border-[#080811] bg-[#21142e]">{room.avatar_url ? <img src={room.avatar_url} alt="" className="h-full w-full object-cover"/> : <span className="text-xl font-black">{room.host_name.slice(0,1).toUpperCase()}</span>}</span></span>
              <span className="w-full truncate text-center text-[10px] font-semibold text-gray-300">{room.host_name}</span>
            </button>)}
          </div>
        </section>

        <GuestInvites userId={userId} room={selected} onJoinRoom={(room) => { setSelected(room); setNotice("Guest invitation accepted. You are joining the live room."); }} />
        <SocialFeed userId={userId} displayName={displayName} avatarUrl={avatarUrl} />

        <section id="live-rooms" className="mt-7">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-extrabold">Recommended lives</h2><span className="text-[10px] text-gray-500">Explore creators</span></div>
          {loading ? <div className="rounded-2xl border border-white/10 bg-[#13121d] p-8 text-center text-sm text-gray-400">Finding live rooms…</div> : rooms.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-[#13121d] p-8 text-center"><div className="text-3xl">♫</div><h3 className="mt-3 text-base font-bold">No one is live just yet</h3><p className="mt-1 text-xs text-gray-400">Start the first stream and bring your community together.</p></div> :
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{rooms.map((room) => <button key={room.id} onClick={() => setSelected(room)} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#13121d] text-left transition hover:border-fuchsia-400/40">
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_#54236e,_#151020_70%)]">
                {room.avatar_url ? <img src={room.avatar_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[1px]"/> : null}
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/30 text-2xl font-black shadow-xl">{room.host_name.slice(0,1).toUpperCase()}</div>
                <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-1 text-[9px] font-black tracking-wider">● LIVE</span><span className="absolute bottom-2 left-2 right-2 line-clamp-2 text-sm font-black drop-shadow-lg">{room.title}</span>
              </div>
              <div className="flex items-center gap-2 p-3">{room.avatar_url ? <img src={room.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover"/> : <span className="grid h-7 w-7 place-items-center rounded-full bg-fuchsia-500/20 text-xs font-bold">{room.host_name.slice(0,1)}</span>}<div className="min-w-0"><p className="truncate text-[11px] font-bold">{room.host_name}</p><p className="text-[9px] text-gray-500">MUSEK creator</p></div></div>
            </button>)}</div>}
        </section>

        <section id="start-room" className="mt-8 scroll-mt-24 rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-[#21152e] to-[#11101a] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black tracking-[.2em] text-fuchsia-300">CREATOR STUDIO</p><h2 className="mt-1 text-lg font-black">Start your LIVE</h2><p className="mt-1 text-xs text-gray-400">Go live with your fans in seconds.</p></div><span className="text-3xl">📡</span></div>
          <label className="block text-[10px] font-bold text-gray-400">STREAM TITLE</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={90} placeholder="What are we doing today?" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-fuchsia-400"/>
          <label className="mt-3 block text-[10px] font-bold text-gray-400">DESCRIPTION (OPTIONAL)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="Tell viewers what your LIVE is about…" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-fuchsia-400"/>
          <button disabled={busy} onClick={startRoom} className="mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-fuchsia-950/40 disabled:opacity-50">{busy ? "Starting your LIVE…" : "＋ Start LIVE"}</button>
          <p className="mt-3 text-center text-[10px] leading-4 text-gray-500">Every signed-in fan, artist and creator can host a live room.</p>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#13121d]">
          <div className="flex items-center justify-between p-4"><div><p className="text-[10px] font-black tracking-[.2em] text-fuchsia-300">CAMERA CHECK</p><h2 className="mt-1 text-sm font-bold">Your camera & microphone</h2></div><span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-gray-400">Private preview</span></div>
          <div className="relative aspect-video bg-black"><video ref={videoRef} autoPlay muted playsInline className={cameraOn ? "h-full w-full object-cover" : "hidden"}/>{!cameraOn && <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-3xl">◉</div><p className="mt-2 text-xs text-gray-400">Camera is currently off</p></div></div>}</div>
          <div className="flex items-center justify-between gap-3 p-3"><span className="text-[10px] text-gray-400">Camera {cameraOn ? "on" : "off"} · Mic {micOn ? "on" : "off"}</span>{!cameraOn ? <button onClick={enableMedia} className="rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-black">Enable camera</button> : <button onClick={stopMedia} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold">Turn off</button>}</div>
        </section>

        {selected && <section className="fixed inset-0 z-50 flex flex-col bg-[#080811] sm:absolute sm:inset-auto sm:left-1/2 sm:top-24 sm:w-[min(960px,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="min-w-0"><p className="text-[9px] font-black tracking-[.2em] text-rose-300">● LIVE NOW</p><h2 className="truncate text-sm font-black">{selected.title}</h2><p className="text-[10px] text-gray-400">{selected.host_name} · MUSEK LIVE</p></div><button onClick={() => { setSelected(null); stopMedia(); }} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">✕ Close</button></div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="relative mx-auto w-full max-w-[560px] bg-black sm:rounded-xl">
              <div className="aspect-[9/13] max-h-[56vh] sm:max-h-[620px]"><LiveVideoRoom roomId={selected.id} displayName={displayName}/></div>
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between"><div className="max-w-[75%] rounded-xl bg-black/45 p-3 backdrop-blur"><p className="text-xs font-black">{selected.host_name}</p><p className="mt-1 text-[10px] text-white/75">{selected.description || "Join the conversation."}</p></div><div className="flex flex-col gap-3 text-center text-xl"><button onClick={() => react("❤️")}>❤️</button><button onClick={() => react("🔥")}>🔥</button><button onClick={() => react("👏")}>👏</button></div></div>
            </div>
            <div className="mx-auto max-w-[560px] p-3">
              <div className="mb-3 flex items-center justify-between"><p className="text-xs font-black">LIVE CHAT <span className="text-emerald-300">●</span></p><span className="text-[9px] text-gray-500">{chatConnection === "connected" ? "Connected" : chatConnection === "disconnected" ? "Reconnecting" : "Connecting…"}</span></div>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl bg-white/[.04] p-3">
                {messages.length === 0 ? <p className="py-5 text-center text-xs text-gray-500">Say hello and join the conversation.</p> : messages.map((message) => <div key={message.id} className="text-xs"><span className={message.user_id === selected.host_id ? "font-bold text-fuchsia-300" : "font-semibold text-gray-300"}>{message.display_name}: </span><span className="break-words text-gray-200">{message.message}</span></div>)}
                <div ref={bottomRef}/>
              </div>
              <form onSubmit={sendMessage} className="mt-2 flex gap-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.06] px-4 py-3 text-xs outline-none focus:border-fuchsia-400"/><button type="submit" disabled={!draft.trim() || chatSending} className="rounded-full bg-fuchsia-600 px-4 text-xs font-bold disabled:opacity-40">{chatSending ? "…" : "Send"}</button></form>
              <div className="mt-3"><LiveGifts roomId={selected.id} creatorId={selected.host_id} accountType={accountType} userId={userId}/></div>
              {selected.host_id === userId && <button disabled={ending} onClick={endRoom} className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-xs font-black disabled:opacity-50">{ending ? "Ending LIVE…" : "End LIVE"}</button>}
            </div>
          </div>
        </section>}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0b0a12]/95 px-2 py-3 backdrop-blur-xl sm:hidden">
        <Link href="/feed" className="flex flex-col items-center gap-1 text-[9px] text-gray-400"><span className="text-lg">♫</span>Music</Link>
        <a href="#live-rooms" className="flex flex-col items-center gap-1 text-[9px] font-bold text-fuchsia-300"><span className="text-lg">◉</span>Discover</a>
        <button onClick={() => document.getElementById("start-room")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="flex flex-col items-center gap-1 text-[9px] font-bold text-white"><span className="grid h-8 w-10 place-items-center rounded-lg bg-gradient-to-r from-fuchsia-500 to-rose-500 text-xl">＋</span>Go LIVE</button>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-[9px] text-gray-400"><span className="text-lg">●</span>Profile</Link>
      </nav>
    </div>
  );
}
