"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LiveVideoRoom from "./live-video-room";
import GuestInvites from "./guest-invites";

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
    if (!selected) { setMessages([]); return; }
    let active = true;
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
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
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
    if (!selected || !draft.trim()) return;
    const message = draft.trim().slice(0, 1000);
    setDraft("");
    const { error } = await supabase.from("social_live_messages").insert({
      room_id: selected.id, user_id: userId, display_name: displayName, message
    });
    if (error) setNotice("Message could not be sent. Check your room access and database migration.");
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
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-purple-400/20 bg-gradient-to-br from-[#281044] via-[#171329] to-[#0d1020] p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold tracking-[.25em] text-purple-200">MUSEK SOCIAL</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Music brings us together.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-purple-100/75 sm:text-base">Fans, artists and creators can all go live. Host a listening party, talk with your community, share your camera and microphone, and build real connections.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#start-room" className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#171022]">Go live — anyone can host</a>
            <a href="#live-rooms" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold">Explore live rooms</a>
            <Link href="/buy-coins" className="rounded-xl border border-purple-300/30 bg-purple-500/15 px-5 py-3 text-sm font-bold">MUSEK Coins</Link>
          </div>
        </div>
      </section>

      {notice && <div role="status" className="mt-5 rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">{notice}</div>}
      <GuestInvites userId={userId} room={selected} onJoinRoom={(room) => { setSelected(room); setNotice("Guest invitation accepted. You are joining the live room."); }} />

      <section id="start-room" className="mt-10 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-[#11111d] p-6">
          <p className="text-xs font-bold tracking-[.2em] text-purple-300">CREATE YOUR SPACE</p>
          <h2 className="mt-2 text-2xl font-black">Start a live room</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">Host a listening party, Q&amp;A, artist hangout or community conversation.</p>
          <label className="mt-6 block text-xs font-bold text-gray-400">ROOM TITLE</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={90} placeholder="e.g. Studio talk with the fans" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-purple-400" />
          <label className="mt-4 block text-xs font-bold text-gray-400">DESCRIPTION</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} placeholder="What are we talking about today?" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-purple-400" />
          <button disabled={busy} onClick={startRoom} className="mt-5 w-full rounded-xl bg-purple-600 px-5 py-3 font-bold transition hover:bg-purple-500 disabled:opacity-50">{busy ? "Opening room..." : "＋ Go live now"}</button>
          <p className="mt-3 text-xs leading-5 text-gray-500">Available to every signed-in fan, artist and creator account. The person who opens the room can broadcast; invited guests can join the video when the host accepts their invitation.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11111d]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div><p className="text-xs font-bold tracking-[.2em] text-purple-300">YOUR STUDIO</p><h2 className="mt-1 text-lg font-black">Camera &amp; microphone</h2></div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">Local preview</span>
          </div>
          <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(ellipse_at_center,_#30204c,_#080811_70%)]">
            <video ref={videoRef} autoPlay muted playsInline className={cameraOn ? "h-full w-full object-cover" : "hidden"} />
            {!cameraOn && <div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-purple-300/20 bg-purple-500/15 text-3xl">◉</div><p className="mt-4 text-sm font-semibold">Your camera preview appears here</p><p className="mt-1 text-xs text-gray-500">Your camera is off until you turn it on</p></div>}
          </div>
          <div className="flex flex-wrap items-center gap-3 p-5">
            {!cameraOn ? <button onClick={enableMedia} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black">Turn on camera &amp; mic</button> : <button onClick={stopMedia} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold">Turn off devices</button>}
            <span className="text-xs text-gray-400">Camera {cameraOn ? "on" : "off"} · Mic {micOn ? "on" : "off"}</span>
          </div>
        </div>
      </section>

      <section id="live-rooms" className="mt-12">
        <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold tracking-[.2em] text-purple-300">HAPPENING NOW</p><h2 className="mt-2 text-3xl font-black">Live rooms</h2></div><span className="text-sm text-gray-500">{rooms.length} active</span></div>
        {loading ? <div className="rounded-2xl border border-white/10 bg-[#11111d] p-8 text-sm text-gray-400">Loading live rooms…</div> : rooms.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-[#11111d]/60 p-10 text-center"><div className="text-3xl">♫</div><h3 className="mt-3 text-xl font-bold">No one is live just yet</h3><p className="mt-2 text-sm text-gray-400">Start the first room and bring your community together.</p></div> :
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => <article key={room.id} className="rounded-2xl border border-white/10 bg-[#11111d] p-5"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-black tracking-widest text-rose-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400"/> LIVE</span><span className="text-xs text-gray-500">MUSEK SOCIAL</span></div><h3 className="mt-4 text-xl font-black">{room.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm text-gray-400">{room.description || "Come join the conversation."}</p><div className="mt-4 flex items-center gap-3">
  {room.avatar_url ? <img src={room.avatar_url} alt={room.host_name} className="h-9 w-9 rounded-full border border-purple-300/30 object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full border border-purple-300/30 bg-purple-500/15 text-sm font-black text-purple-200">{room.host_name.slice(0, 1).toUpperCase()}</div>}
  <div><p className="text-xs font-semibold text-gray-200">{room.host_name}</p><p className="text-[10px] text-gray-500">Live host</p></div>
</div><button onClick={() => setSelected(room)} className="mt-5 w-full rounded-xl border border-purple-400/30 bg-purple-500/15 px-4 py-3 text-sm font-bold hover:bg-purple-500/25">Join conversation</button></article>)}</div>}
      </section>

      {selected && <section className="mt-12 scroll-mt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-black tracking-[.25em] text-purple-300">MUSEK LIVE STUDIO</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">{selected.title}</h2><p className="mt-2 text-sm text-gray-400">{selected.description || "A live space for music, conversation and community."}</p></div>
          <div className="flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-black tracking-wider text-rose-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400"/> LIVE BROADCAST</div>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="min-w-0 overflow-hidden rounded-[2rem] border border-purple-400/20 bg-[#100D1B] shadow-[0_25px_90px_rgba(88,28,135,.16)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#241536] to-[#151020] p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                {selected.avatar_url ? <img src={selected.avatar_url} alt={selected.host_name} className="h-12 w-12 shrink-0 rounded-2xl border border-purple-300/40 object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-purple-300/30 bg-purple-500/20 text-lg font-black text-purple-100">{selected.host_name.slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-purple-300">ROOM HOST</p><p className="mt-1 truncate font-bold text-white">{selected.host_name}</p><p className="text-xs text-gray-400">Hosting the conversation</p></div>
              </div>
              <div className="flex shrink-0 gap-2">
                {selected.host_id === userId && <button disabled={ending} onClick={endRoom} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-rose-500 disabled:opacity-50">{ending ? "Ending…" : "End live"}</button>}
                <button onClick={() => { setSelected(null); stopMedia(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-gray-200 transition hover:bg-white/10">Leave room</button>
              </div>
            </div>
            <div className="bg-[radial-gradient(ellipse_at_top,_#382052,_#100D1B_65%)] p-3 sm:p-5">
              <div className="mb-3 flex items-center justify-between px-1"><p className="text-xs font-bold uppercase tracking-[.18em] text-purple-200">THE STAGE</p><p className="text-[11px] text-gray-400">Video &amp; audio experience</p></div>
              <LiveVideoRoom roomId={selected.id} displayName={displayName} />
            </div>
            <div className="border-t border-white/10 bg-[#151020] p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[.18em] text-purple-300">SHOW SOME LOVE</p><p className="mt-1 text-xs text-gray-500">Send a reaction to the room</p></div><span className="text-xs text-gray-500">Community reactions</span></div>
              <div className="flex flex-wrap gap-2">{["❤️","🔥","👏","🎶","😂"].map((emoji) => <button key={emoji} onClick={() => react(emoji)} aria-label={`React ${emoji}`} className="grid h-11 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-xl transition hover:-translate-y-0.5 hover:border-purple-400/50 hover:bg-purple-500/15">{emoji}</button>)}</div>
            </div>
          </div>
          <aside className="flex h-[680px] min-h-[520px] flex-col overflow-hidden rounded-[2rem] border border-purple-400/20 bg-[#100D1B] shadow-[0_25px_90px_rgba(88,28,135,.12)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#241536] to-[#151020] p-5">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-purple-300">COMMUNITY</p><h3 className="mt-1 text-xl font-black text-white">Live chat</h3></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Connected</span></div>
              <p className="mt-2 text-xs leading-5 text-gray-400">Talk with the host and everyone watching this room.</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(111,65,151,.12),_transparent_60%)] p-4">
              {messages.map((message) => <div key={message.id} className={message.user_id === userId ? "ml-5 rounded-2xl rounded-tr-sm border border-purple-400/20 bg-purple-500/15 p-3" : "mr-5 rounded-2xl rounded-tl-sm border border-white/[.07] bg-white/[.04] p-3"}><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-extrabold text-purple-200">{message.display_name}{message.user_id === selected.host_id ? <span className="ml-2 rounded bg-purple-400/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-purple-200">Host</span> : null}</p><span className="shrink-0 text-[9px] text-gray-600">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><p className="mt-2 break-words text-sm leading-6 text-gray-200">{message.message}</p></div>)}
              {messages.length === 0 && <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-purple-300/20 bg-purple-500/10 text-2xl">✦</div><p className="mt-4 text-sm font-bold text-gray-200">Start the conversation</p><p className="mt-1 max-w-[220px] text-xs leading-5 text-gray-500">Say hello and make this live room feel alive.</p></div>}
              <div ref={bottomRef}/>
            </div>
            <form onSubmit={sendMessage} className="border-t border-white/10 bg-[#151020] p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5 focus-within:border-purple-400/50"><input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="Message the room…" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600"/><button disabled={!draft.trim()} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-purple-500 disabled:opacity-40">Send</button></div>
              <p className="mt-2 px-1 text-[10px] text-gray-600">Keep it kind. Everyone is part of the MUSEK community.</p>
            </form>
          </aside>
        </div>
      </section>}
      <p className="mt-12 text-center text-xs leading-6 text-gray-600">MUSEK SOCIAL now includes live rooms, realtime chat, reactions, LiveKit multi-person video and host-issued artist guest invitations. Live video requires LiveKit credentials; private one-to-one calls, recordings and production moderation remain in the next rollout.</p>
    </div>
  );
}
