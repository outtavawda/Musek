"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  host_name: string;
  status: "live" | "ended";
  created_at: string;
};
type Profile = { id: string; display_name: string | null; artist_name: string | null };
type Invitation = { id: string; room: Room };

export default function GuestInvites({
  userId,
  room,
  onJoinRoom,
}: {
  userId: string;
  room: Room | null;
  onJoinRoom: (room: Room) => void;
}) {
  const supabase = createClient();
  const [incoming, setIncoming] = useState<Invitation[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);

  const loadIncoming = async () => {
    const { data: invites } = await supabase
      .from("social_live_invites")
      .select("id,room_id")
      .eq("invitee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!invites?.length) { setIncoming([]); return; }
    const { data: rooms } = await supabase
      .from("social_live_rooms")
      .select("id,title,description,host_id,host_name,status,created_at")
      .in("id", invites.map((invite) => invite.room_id))
      .eq("status", "live");
    const roomMap = new Map((rooms || []).map((item) => [item.id, item as Room]));
    setIncoming(invites.flatMap((invite) => {
      const liveRoom = roomMap.get(invite.room_id);
      return liveRoom ? [{ id: invite.id, room: liveRoom }] : [];
    }));
  };

  useEffect(() => {
    loadIncoming();
    const channel = supabase.channel("musek-social-invitations-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_live_invites", filter: "invitee_id=eq." + userId }, loadIncoming)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  const searchArtists = async () => {
    const term = search.trim().replace(/[,%()]/g, "").slice(0, 60);
    if (!term) { setResults([]); return; }
    setSearching(true);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id,display_name,artist_name")
      .eq("is_public", true)
      .eq("account_type", "artist")
      .neq("id", userId)
      .or("artist_name.ilike.%" + term + "%,display_name.ilike.%" + term + "%")
      .limit(8);
    setSearching(false);
    if (error) setNotice("Artist search is unavailable right now.");
    else setResults((data || []) as Profile[]);
  };

  const inviteArtist = async (artist: Profile) => {
    if (!room) return;
    setBusyId(artist.id); setNotice("");
    const { error } = await supabase.from("social_live_invites").insert({
      room_id: room.id,
      inviter_id: userId,
      invitee_id: artist.id,
    });
    setBusyId("");
    if (error) setNotice(error.code === "23505" ? "That artist has already been invited to this room." : "Could not send the guest invitation. Apply migration 005 if you have not already.");
    else setNotice("Guest invitation sent to " + (artist.artist_name || artist.display_name || "the artist") + ".");
  };

  const respond = async (invite: Invitation, accepted: boolean) => {
    setBusyId(invite.id);
    const { error } = await supabase.from("social_live_invites")
      .update({ status: accepted ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", invite.id).eq("invitee_id", userId).eq("status", "pending");
    setBusyId("");
    if (error) { setNotice("Could not update the invitation. Apply migration 005 if needed."); return; }
    setIncoming((items) => items.filter((item) => item.id !== invite.id));
    if (accepted) onJoinRoom(invite.room);
    setNotice(accepted ? "Invitation accepted. You can now join the live video as a guest." : "Invitation declined.");
  };

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-[#11111d] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black tracking-[.2em] text-purple-300">GUEST CONNECTIONS</p><h3 className="mt-1 text-lg font-black">Invitations</h3></div>
        {incoming.length > 0 && <span className="rounded-full bg-purple-400/15 px-3 py-1 text-xs font-bold text-purple-200">{incoming.length} pending</span>}
      </div>

      {incoming.length > 0 && <div className="mt-4 space-y-3">{incoming.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-300/15 bg-purple-500/5 p-3"><div><p className="text-sm font-bold">{invite.room.title}</p><p className="mt-1 text-xs text-gray-400">Invited by {invite.room.host_name}</p></div><div className="flex gap-2"><button disabled={busyId === invite.id} onClick={() => respond(invite, true)} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Accept & join</button><button disabled={busyId === invite.id} onClick={() => respond(invite, false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold disabled:opacity-50">Decline</button></div></div>)}</div>}

      {room?.host_id === userId && <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-sm font-bold">Invite an artist onto your live room</p>
        <div className="mt-3 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); searchArtists(); } }} placeholder="Search public artist profiles…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-purple-400" /><button onClick={searchArtists} disabled={searching || !search.trim()} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold disabled:opacity-50">{searching ? "Searching…" : "Search"}</button></div>
        {results.length > 0 && <div className="mt-3 space-y-2">{results.map((artist) => <div key={artist.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span className="min-w-0 truncate text-sm font-semibold">{artist.artist_name || artist.display_name || "MUSEK Artist"}</span><button onClick={() => inviteArtist(artist)} disabled={busyId === artist.id} className="shrink-0 rounded-lg border border-purple-300/30 px-3 py-2 text-xs font-bold text-purple-200 disabled:opacity-50">{busyId === artist.id ? "Sending…" : "Invite"}</button></div>)}</div>}
      </div>}
      {notice && <p role="status" className="mt-3 text-xs text-purple-200">{notice}</p>}
    </section>
  );
}
