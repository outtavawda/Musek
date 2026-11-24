"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type JoinRequest = { id: string; room_id: string; requester_id: string; status: "pending" | "accepted" | "declined"; created_at: string };
type RequesterProfile = { id: string; display_name: string | null; artist_name: string | null; avatar_url: string | null };

export default function LiveRoomJoinRequests({ roomId, hostId, userId, onApproved, isOnStage = false, onLeaveStage }: { roomId: string; hostId: string; userId: string; onApproved?: () => void; isOnStage?: boolean; onLeaveStage?: () => Promise<void> }) {
  const supabase = createClient();
  const isHost = hostId === userId;
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, RequesterProfile>>({});
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const approvedRequestId = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (isHost) {
      const { data } = await supabase.from("social_live_join_requests").select("id,room_id,requester_id,status,created_at").eq("room_id", roomId).eq("status", "pending").order("created_at", { ascending: true });
      const rows = (data || []) as JoinRequest[];
      setRequests(rows);
      const ids = Array.from(new Set(rows.map((row) => row.requester_id)));
      if (ids.length) {
        const { data: people } = await supabase.from("user_profiles").select("id,display_name,artist_name,avatar_url").in("id", ids);
        setProfiles(Object.fromEntries((people || []).map((person) => [person.id, person as RequesterProfile])));
      } else setProfiles({});
    } else {
      const { data, error } = await supabase.from("social_live_join_requests").select("id,room_id,requester_id,status,created_at").eq("room_id", roomId).eq("requester_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) { setNotice("Could not load your stage request. Please refresh and try again."); return; }
      const request = data as JoinRequest | null;
      setMyRequest(request);
      if (request?.status === "accepted" && approvedRequestId.current !== request.id) {
        approvedRequestId.current = request.id;
        onApproved?.();
      } else if (request?.status !== "accepted") {
        approvedRequestId.current = null;
      }
    }
  }, [isHost, roomId, supabase, userId, onApproved]);

  useEffect(() => {
    load();
    const channel = supabase.channel("musek-live-join-requests-" + roomId)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_live_join_requests", filter: "room_id=eq." + roomId }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, roomId, supabase]);

  const requestToJoin = async () => {
    if (pending || isOnStage) return;
    setBusy(true); setNotice("");
    if (myRequest && myRequest.status !== "pending") {
      const { data, error } = await supabase.from("social_live_join_requests")
        .update({ status: "pending", responded_at: null })
        .eq("id", myRequest.id).eq("requester_id", userId).eq("status", myRequest.status)
        .select("id,room_id,requester_id,status,created_at").single();
      setBusy(false);
      if (error) setNotice("Could not resend your request. Please try again.");
      else { setMyRequest(data as JoinRequest); setNotice("Request sent. The host must approve you before you return to the stage."); }
      return;
    }
    const { data, error } = await supabase.from("social_live_join_requests").insert({ room_id: roomId, requester_id: userId }).select("id,room_id,requester_id,status,created_at").single();
    setBusy(false);
    if (error) setNotice(error.code === "23505" ? "Your request is already pending." : "Could not send your request. Apply migration 009 and try again.");
    else { setMyRequest(data as JoinRequest); setNotice("Request sent. The host will need to approve you before you can turn on your camera."); }
  };

  const respond = async (request: JoinRequest, accepted: boolean) => {
    setBusy(true); setNotice("");
    const { data, error } = await supabase.from("social_live_join_requests").update({ status: accepted ? "accepted" : "declined", responded_at: new Date().toISOString() }).eq("id", request.id).eq("status", "pending").select("id,status").maybeSingle();
    setBusy(false);
    if (error || !data) setNotice(error ? "Could not approve this guest: " + error.message : "This request is no longer pending. Refresh the request list.");
    else { setRequests((current) => current.filter((item) => item.id !== request.id)); setNotice(accepted ? "Guest approved. They can now turn on their camera." : "Request declined."); }
  };

  if (isHost) return <div className="absolute right-3 top-[calc(68px+env(safe-area-inset-top))] z-[125] max-w-[min(290px,calc(100vw-24px))]">
    {requests.length > 0 && <div className="rounded-2xl border border-fuchsia-300/25 bg-[#140d20]/95 p-3 shadow-xl backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-black tracking-widest text-fuchsia-200">GUEST REQUESTS · {requests.length}</p>
      <div className="max-h-44 space-y-2 overflow-y-auto">{requests.map((request) => { const profile = profiles[request.requester_id]; const name = profile?.artist_name || profile?.display_name || "MUSEK Member"; return <div key={request.id} className="flex items-center gap-2">
        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover"/> : <span className="grid h-8 w-8 place-items-center rounded-full bg-fuchsia-500/20 text-xs font-bold">{name.slice(0,1).toUpperCase()}</span>}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{name}</span>
        <button type="button" disabled={busy} onClick={() => respond(request, true)} className="rounded-lg bg-fuchsia-600 px-2 py-1.5 text-[10px] font-bold disabled:opacity-50">Allow</button>
        <button type="button" disabled={busy} onClick={() => respond(request, false)} className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-bold disabled:opacity-50">No</button>
      </div>; })}</div>
    </div>}
    {notice && <p role="status" className="mt-1 rounded-lg bg-black/80 px-2 py-1 text-[10px] text-fuchsia-100">{notice}</p>}
  </div>;

  const accepted = myRequest?.status === "accepted";
  const pending = myRequest?.status === "pending";
  const leaveStage = async () => {
    if (!onLeaveStage || busy) return;
    setBusy(true); setNotice("");
    try {
      await onLeaveStage();
      if (myRequest?.status === "accepted") {
        const { data, error } = await supabase.from("social_live_join_requests")
          .update({ status: "declined", responded_at: new Date().toISOString() })
          .eq("id", myRequest.id).eq("requester_id", userId).eq("status", "accepted")
          .select("id,room_id,requester_id,status,created_at").maybeSingle();
        if (error || !data) throw new Error("Could not remove guest from stage.");
        setMyRequest(data as JoinRequest);
      }
    } catch {
      setNotice("Could not leave the stage. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="relative">
    <button type="button" disabled={busy || (isOnStage ? !onLeaveStage : pending)} onClick={isOnStage ? leaveStage : requestToJoin} aria-label={isOnStage ? "Return to live chat" : accepted ? "Request to join live as a guest — approved" : pending ? "Guest request pending" : "Request to join live as a guest"} title={isOnStage ? "Return to live chat" : accepted ? "Approved — request icon" : pending ? "Request pending" : "Request to join"} className={"grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-base shadow-[0_0_16px_rgba(168,85,247,.18)] transition sm:h-11 sm:w-11 sm:text-lg " + (isOnStage ? "border-rose-300/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/35" : accepted ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200" : "border-fuchsia-300/40 bg-[#21152e] text-fuchsia-100 hover:border-fuchsia-200 hover:bg-fuchsia-600/30 disabled:cursor-not-allowed disabled:opacity-60")}>
      {busy ? "…" : isOnStage ? <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 6-12 12M6 6l12 12"/></svg> : pending ? "⌛" : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m3-3h-6"/></svg>}
    </button>
    {notice && <span role="status" className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-fuchsia-300/20 bg-[#140d20] p-2 text-[10px] text-fuchsia-100 shadow-xl">{notice}</span>}
  </div>;
}
