"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LiveVideoRoom, { type LiveCameraControl } from "./live-video-room";
import LiveRoomJoinRequests from "./live-room-join-requests";
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
  host_left_at?: string | null;
  avatar_url?: string | null;
};
type Message = { id: string; room_id: string; user_id: string; display_name: string; message: string; created_at: string; avatar_url?: string | null };
type ChatProfile = { id: string; display_name: string | null; artist_name: string | null; account_type: string | null; avatar_url: string | null; bio: string | null; location: string | null; genres: string[] | null; website_url: string | null; is_public: boolean | null };

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
  const [hostSecondsLeft, setHostSecondsLeft] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ChatProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [liveCameraControl, setLiveCameraControl] = useState<LiveCameraControl | null>(null);
  const [videoSessionKey, setVideoSessionKey] = useState(0);
  const [guestLiveKitEnabled, setGuestLiveKitEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const handleLiveCameraControl = useCallback((control: LiveCameraControl | null) => setLiveCameraControl(control), []);
  const handleGuestStageApproved = useCallback(() => {
    setGuestLiveKitEnabled(true);
    setVideoSessionKey((key) => key + 1);
  }, []);
  const handleGuestStageClosed = useCallback(async () => {
    // Leaving the stage must not leave the LIVE room. Keep the guest's
    // LiveKit connection mounted so they can continue watching the host
    // and using chat; stop both camera and microphone publication.
    try { await liveCameraControl?.disableMedia(); } catch {
      // Stage membership is still cleared server-side if media shutdown fails.
    }
  }, [liveCameraControl]);
  useEffect(() => {
    if (selected) setGuestLiveKitEnabled(true);
  }, [selected?.id]);
  const loadRooms = useCallback(async () => {
    const { data, error } = await supabase.from("social_live_rooms")
      .select("id,title,description,host_id,host_name,status,created_at,host_left_at")
      .eq("status", "live").order("created_at", { ascending: false }).limit(50);
    if (error) setNotice("Social rooms are not available yet. Apply the YASUH Social database migration to enable them.");
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
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) { setNotice("Chat is not ready. Check that the MUSEK Social migration has been applied."); return; }
        const rows = (data || []) as Message[];
        const senderIds = Array.from(new Set(rows.map((message) => message.user_id)));
        const { data: profiles } = senderIds.length
          ? await supabase.from("user_profiles").select("id,avatar_url").in("id", senderIds)
          : { data: [] as { id: string; avatar_url: string | null }[] };
        if (!active) return;
        const avatarByUser = new Map((profiles || []).map((profile) => [profile.id, profile.avatar_url]));
        setMessages(rows.map((message) => ({ ...message, avatar_url: avatarByUser.get(message.user_id) || null })));
      });
    const channel = supabase.channel("musek-social-chat-" + selected.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_live_messages", filter: "room_id=eq." + selected.id },
        async (payload) => {
          const incoming = payload.new as Message;
          const { data: profile } = await supabase.from("user_profiles").select("avatar_url").eq("id", incoming.user_id).maybeSingle();
          const enriched = { ...incoming, avatar_url: profile?.avatar_url || null };
          setMessages((current) => current.some((message) => message.id === enriched.id) ? current : [...current, enriched]);
        })
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
    if (error) { console.error("YASUH live room creation failed:", error); setNotice(`Could not create the room: ${error.message}${error.code ? ` (code ${error.code})` : ""}`); return; }
    const newRoom = { ...(data as Room), avatar_url: avatarUrl };
    setRooms((current) => [newRoom, ...current]);
    setSelected(newRoom); setTitle(""); setDescription("");
    setNotice("Your YASUH Social room is open. Chat is live; video broadcasting will activate after the video provider is connected.");
    void fetch("/api/push/artist-live", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: newRoom.id })
    }).then(async response => {
      if (!response.ok) console.warn("YASUH live push delivery was not completed:", await response.text());
    }).catch(error => console.warn("YASUH live push delivery failed:", error));
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
      const { data: profile } = await supabase.from("user_profiles").select("avatar_url").eq("id", userId).maybeSingle();
      const enriched = { ...(data as Message), avatar_url: profile?.avatar_url || avatarUrl };
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, enriched]);
    }
  };

  useEffect(() => {
    if (!selected) return;
    const roomId = selected.id;
    let active = true;
    const leaveEndedRoom = () => {
      if (!active) return;
      setGuestLiveKitEnabled(false);
      setLiveCameraControl(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
      setMicOn(false);
      setSelected((current) => current?.id === roomId ? null : current);
      setNotice("This LIVE has ended. You have returned to the live room list.");
    };
    supabase.from("social_live_rooms").select("status").eq("id", roomId).maybeSingle()
      .then(({ data }) => { if (data?.status !== "live") leaveEndedRoom(); });
    const channel = supabase.channel("musek-live-room-lifecycle-" + roomId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "social_live_rooms", filter: "id=eq." + roomId },
        (payload) => {
          const next = payload.new as { status?: string; host_left_at?: string | null };
          if (next.status === "ended") leaveEndedRoom();
          else if (typeof next.host_left_at !== "undefined") {
            setSelected((current) => current?.id === roomId ? { ...current, host_left_at: next.host_left_at } : current);
          }
        })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [selected?.id, supabase]);

  useEffect(() => {
    if (!selected?.host_left_at || selected.status !== "live") { setHostSecondsLeft(null); return; }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(selected.host_left_at as string).getTime() + 3 * 60 * 1000 - Date.now()) / 1000));
      setHostSecondsLeft(remaining);
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [selected?.host_left_at, selected?.status]);

  const enterRoom = async (room: Room) => {
    if (room.host_id === userId && room.host_left_at) {
      const { error } = await supabase.from("social_live_rooms")
        .update({ host_left_at: null }).eq("id", room.id).eq("host_id", userId).eq("status", "live");
      if (error) { setNotice("Could not resume your LIVE. Please try again."); return; }
      room = { ...room, host_left_at: null };
    }
    setSelected(room);
  };

  const leaveHostLive = async () => {
    if (!selected || selected.host_id !== userId || ending) return;
    setEnding(true);
    const roomId = selected.id;
    const { error } = await supabase.from("social_live_rooms")
      .update({ host_left_at: new Date().toISOString() })
      .eq("id", roomId).eq("host_id", userId).eq("status", "live");
    setEnding(false);
    if (error) { setNotice("Could not start the three-minute LIVE shutdown timer. Please try again."); return; }
    stopMedia();
    setGuestLiveKitEnabled(false);
    setLiveCameraControl(null);
    setSelected(null);
    await loadRooms();
    setNotice("You left your LIVE. It will automatically end in 3 minutes unless you return.");
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
    // Clear stage permissions as the room closes; connected guests also
    // receive the room-ended realtime event and leave their video session.
    await supabase.from("social_live_join_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("room_id", selected.id).in("status", ["pending", "accepted"]);
    stopMedia();
    setGuestLiveKitEnabled(false);
    setLiveCameraControl(null);
    setSelected(null);
    await loadRooms();
    setNotice("Your LIVE has ended. Guests and viewers are being returned to the live list.");
  };

  const openChatProfile = async (profileId: string) => {
    setProfileLoading(true);
    setViewingProfile(null);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id,display_name,artist_name,account_type,avatar_url,bio,location,genres,website_url,is_public")
      .eq("id", profileId)
      .maybeSingle();
    setProfileLoading(false);
    if (error || !data || data.is_public === false) {
      setNotice("This member's profile is not publicly available.");
      return;
    }
    setViewingProfile(data as ChatProfile);
  };

  const react = async (emoji: string) => {
    if (!selected) return;
    const { error } = await supabase.from("social_live_reactions").insert({ room_id: selected.id, user_id: userId, emoji });
    if (error) setNotice("Reactions will be available after the social database migration is applied.");
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#080811] pb-24 text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#080811]/95 px-4 py-3 backdrop-blur-xl sm:rounded-b-2xl">
        <div className="flex items-center gap-2"><span className="text-xl font-black tracking-tight">YASUH<span className="text-fuchsia-400">.</span></span><span className="rounded-full bg-fuchsia-500/15 px-2 py-1 text-[9px] font-black tracking-widest text-fuchsia-200">LIVE</span></div>
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
            {rooms.map((room) => <button key={room.id} onClick={() => { void enterRoom(room); }} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
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
              <div className="flex items-center gap-2 p-3">{room.avatar_url ? <img src={room.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover"/> : <span className="grid h-7 w-7 place-items-center rounded-full bg-fuchsia-500/20 text-xs font-bold">{room.host_name.slice(0,1)}</span>}<div className="min-w-0"><p className="truncate text-[11px] font-bold">{room.host_name}</p><p className="text-[9px] text-gray-500">YASUH creator</p></div></div>
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

        {selected && <section className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-[#05040a] text-white">
          <div className="absolute inset-0">
            {(selected.host_id === userId || guestLiveKitEnabled) && <LiveVideoRoom key={videoSessionKey} roomId={selected.id} hostId={selected.host_id} displayName={displayName} hostName={selected.host_name} onCameraControl={handleLiveCameraControl}/>} 
            {selected.host_id === userId && <LiveRoomJoinRequests roomId={selected.id} hostId={selected.host_id} userId={userId} onApproved={() => setVideoSessionKey((key) => key + 1)}/>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/90"/>
            {selected.host_id !== userId && hostSecondsLeft !== null && <div role="status" className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full border border-amber-300/30 bg-black/75 px-4 py-2 text-center text-xs font-bold text-amber-100 shadow-xl backdrop-blur">Host is away · LIVE ends in {Math.floor(hostSecondsLeft / 60)}:{String(hostSecondsLeft % 60).padStart(2, "0")} unless they return</div>}
          </div>

          <div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-[max(14px,env(safe-area-inset-top))]">
            <div className="flex min-w-0 items-center gap-3 rounded-full border border-white/15 bg-black/35 p-2 pr-4 backdrop-blur-xl">
              {selected.avatar_url ? <img src={selected.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/> : <span className="grid h-10 w-10 place-items-center rounded-full bg-fuchsia-500/30 font-black">{selected.host_name.slice(0,1).toUpperCase()}</span>}
              <div className="min-w-0"><p className="max-w-[170px] truncate text-xs font-black">{selected.host_name}</p><p className="text-[10px] text-white/70">YASUH LIVE · {messages.length} messages</p></div>
              <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[9px] font-black tracking-widest">● LIVE</span>
            </div>
            <button onClick={async () => {
              if (selected.host_id === userId) { await leaveHostLive(); return; }
              const roomId = selected.id;
              await supabase.from("social_live_join_requests")
                .update({ status: "declined", responded_at: new Date().toISOString() })
                .eq("room_id", roomId).eq("requester_id", userId).in("status", ["pending", "accepted"]);
              setGuestLiveKitEnabled(false);
              setLiveCameraControl(null);
              setSelected(null);
              stopMedia();
            }} aria-label={selected.host_id === userId ? "Leave live room (3-minute shutdown)" : "Leave live room"} title={selected.host_id === userId ? "Leave LIVE; it ends after 3 minutes if you do not return" : "Leave live"} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 bg-black/40 text-lg backdrop-blur-xl">✕</button>
          </div>

          <div className="relative z-10 mt-auto flex items-end gap-3 px-3 pb-[calc(104px+env(safe-area-inset-bottom))] sm:pb-6">
            <div className="min-w-0 flex-1">
              <div className="mb-3 max-h-[31dvh] space-y-2 overflow-y-auto pr-2 [mask-image:linear-gradient(to_bottom,transparent,black_12%)]">
                {messages.slice(-8).map((message) => <div key={message.id} className="flex w-fit max-w-full items-start gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-xs shadow-lg backdrop-blur-md"><button type="button" onClick={() => openChatProfile(message.user_id)} aria-label={"View " + message.display_name + "'s profile"} className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-fuchsia-500/20 text-[10px] font-black text-white transition hover:border-fuchsia-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-400">{message.avatar_url ? <img src={message.avatar_url} alt="" className="h-full w-full object-cover"/> : message.display_name.slice(0, 1).toUpperCase()}</button><span className="min-w-0 break-words"><button type="button" onClick={() => openChatProfile(message.user_id)} className={message.user_id === selected.host_id ? "font-black text-fuchsia-200 hover:underline" : "font-bold text-white/80 hover:underline"}>{message.display_name}</button>{" "}<span className="text-white">{message.message}</span></span></div>)}
                <div ref={bottomRef}/>
              </div>
              <div className="mb-3 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
                <p className="text-xs font-black">{selected.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-white/75">{selected.description || "Join the conversation and show this creator some love."}</p>
              </div>
              <form onSubmit={sendMessage} className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-2 right-2 z-[115] mx-auto flex w-auto max-w-2xl flex-row flex-nowrap items-center gap-0.5 rounded-2xl border border-white/10 bg-black/50 p-1 shadow-[0_8px_30px_rgba(0,0,0,.5)] backdrop-blur-xl sm:gap-1.5 sm:p-1.5">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={1} placeholder="Say something…" aria-label="Say something" className="h-9 min-h-0 min-w-0 flex-1 basis-0 rounded-lg border border-white/20 bg-black/55 px-2 py-1.5 text-[11px] leading-4 text-white outline-none backdrop-blur-xl placeholder:text-white/60 focus:border-fuchsia-300 sm:h-11 sm:rounded-xl sm:text-xs"/>
                <button type="submit" disabled={!draft.trim() || chatSending} className="h-9 shrink-0 rounded-lg bg-fuchsia-600 px-2 text-[11px] font-black disabled:opacity-40 sm:h-11 sm:rounded-xl sm:px-2.5 sm:text-xs">{chatSending ? "…" : "Send"}</button>
                <div className="relative z-[130] flex shrink-0 items-center gap-0.5 sm:gap-1">
                  <LiveGifts roomId={selected.id} creatorId={selected.host_id} accountType={accountType} userId={userId}/>
                  {selected.host_id !== userId && <LiveRoomJoinRequests roomId={selected.id} hostId={selected.host_id} userId={userId} onApproved={handleGuestStageApproved} onStageClosed={handleGuestStageClosed}/>} 
                  <button
                      type="button"
                      disabled={!liveCameraControl?.canPublish}
                      onClick={() => liveCameraControl?.toggle().catch(() => setNotice("Could not change your live camera. Check camera permission and try again."))}
                      aria-label={liveCameraControl?.enabled ? "Turn camera off" : "Turn camera on"}
                      aria-pressed={Boolean(liveCameraControl?.enabled)}
                      title={liveCameraControl?.enabled ? "Turn camera off" : "Turn camera on"}
                      className={"grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11 " + (liveCameraControl?.enabled ? "border-fuchsia-200 bg-fuchsia-600 shadow-fuchsia-950/40" : "border-fuchsia-300/35 bg-[#21152e] hover:bg-fuchsia-600/30")}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>
                        {!liveCameraControl?.enabled && <path d="m4 4 16 16"/>}
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={!liveCameraControl?.canPublish}
                      onClick={() => liveCameraControl?.toggleMicrophone().catch(() => setNotice("Could not change your microphone. Check microphone permission and try again."))}
                      aria-label={liveCameraControl?.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
                      aria-pressed={Boolean(liveCameraControl?.microphoneEnabled)}
                      title={liveCameraControl?.microphoneEnabled ? "Mute microphone" : "Turn microphone on"}
                      className={"grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11 " + (liveCameraControl?.microphoneEnabled ? "border-emerald-200 bg-emerald-600 shadow-emerald-950/40" : "border-rose-300/35 bg-[#21152e] hover:bg-rose-600/30")}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>
                        {!liveCameraControl?.microphoneEnabled && <path d="m4 4 16 16"/>}
                      </svg>
                    </button>
                </div>
              </form>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-4 pb-14 text-center">
              <button onClick={() => react("❤️")} className="text-2xl drop-shadow-lg">❤️<span className="mt-1 block text-[9px] font-bold">Love</span></button>
              <button onClick={() => react("🔥")} className="text-2xl drop-shadow-lg">🔥<span className="mt-1 block text-[9px] font-bold">Fire</span></button>
              <button onClick={() => react("👏")} className="text-2xl drop-shadow-lg">👏<span className="mt-1 block text-[9px] font-bold">Clap</span></button>
              {selected.host_id === userId && <button disabled={ending} onClick={endRoom} className="rounded-full bg-rose-600 px-3 py-2 text-[9px] font-black disabled:opacity-50">{ending ? "ENDING" : "END LIVE NOW"}</button>}
            </div>
          </div>

        </section>}
        {(profileLoading || viewingProfile) && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" onClick={() => { if (!profileLoading) setViewingProfile(null); }}>
          <section role="dialog" aria-modal="true" aria-label="Member profile" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-fuchsia-300/20 bg-[#171321] p-5 shadow-2xl">
            {profileLoading ? <p className="py-8 text-center text-sm text-gray-300">Loading profile…</p> : viewingProfile && <>
              <div className="flex items-start justify-between"><div className="flex items-center gap-3">{viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover"/> : <span className="grid h-14 w-14 place-items-center rounded-full bg-fuchsia-500/20 text-xl font-black">{(viewingProfile.artist_name || viewingProfile.display_name || "M").slice(0,1).toUpperCase()}</span>}<div><p className="text-base font-black">{viewingProfile.artist_name || viewingProfile.display_name || "YASUH Member"}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-fuchsia-200">{viewingProfile.account_type || "member"}</p></div></div><button type="button" onClick={() => setViewingProfile(null)} aria-label="Close profile" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-gray-300">✕</button></div>
              {viewingProfile.location && <p className="mt-4 text-xs text-gray-400">{viewingProfile.location}</p>}
              {viewingProfile.genres && viewingProfile.genres.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{viewingProfile.genres.map((genre) => <span key={genre} className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-semibold text-fuchsia-100">{genre}</span>)}</div>}
              {viewingProfile.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-200">{viewingProfile.bio}</p>}
              {viewingProfile.website_url && <a href={viewingProfile.website_url} target="_blank" rel="noreferrer" className="mt-4 block break-all text-xs text-fuchsia-200 underline">Visit website</a>}
              <button type="button" onClick={() => setViewingProfile(null)} className="mt-5 w-full rounded-xl bg-fuchsia-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-fuchsia-500">Back to live chat</button>
            </>}
          </section>
        </div>}
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
