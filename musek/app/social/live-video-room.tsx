"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import "@livekit/components-styles";

export type LiveCameraControl = {
  toggle: () => Promise<void>;
  disableMedia: () => Promise<void>;
  enabled: boolean;
  canPublish: boolean;
};

function CameraControlBridge({ canPublish, onCameraControl }: {
  canPublish: boolean;
  onCameraControl?: (control: LiveCameraControl | null) => void;
}) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();

  // Guests cannot publish camera video until the server confirms stage
  // approval. Keep the camera off even if a device/browser restores a
  // previous camera state when the room reconnects.
  useEffect(() => {
    if (!canPublish && isCameraEnabled) {
      void localParticipant.setCameraEnabled(false).catch(() => undefined);
    }
  }, [canPublish, isCameraEnabled, localParticipant]);

  const toggle = useCallback(async () => {
    if (!canPublish) return;
    await localParticipant.setCameraEnabled(!isCameraEnabled, { resolution: VideoPresets.h720.resolution });
  }, [canPublish, isCameraEnabled, localParticipant]);
  const disableMedia = useCallback(async () => {
    if (!canPublish) return;
    await Promise.all([
      localParticipant.setCameraEnabled(false),
      localParticipant.setMicrophoneEnabled(false),
    ]);
  }, [canPublish, localParticipant]);

  useEffect(() => {
    onCameraControl?.({ toggle, disableMedia, enabled: isCameraEnabled, canPublish });
    return () => onCameraControl?.(null);
  }, [toggle, disableMedia, isCameraEnabled, canPublish, onCameraControl]);

  return null;
}

function HostFirstStage({ roomId, hostId, hostName }: { roomId: string; hostId: string; hostName: string }) {
  const supabase = createClient();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  const [approvedGuests, setApprovedGuests] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let active = true;
    const loadApprovedGuests = async () => {
      const { data } = await supabase.from("social_live_join_requests")
        .select("requester_id").eq("room_id", roomId).eq("status", "accepted");
      const ids = Array.from(new Set((data || []).map((row) => row.requester_id).filter((id) => id !== hostId)));
      if (!ids.length) { if (active) setApprovedGuests([]); return; }
      const { data: profiles } = await supabase.from("user_profiles")
        .select("id,display_name,artist_name").in("id", ids);
      if (active) setApprovedGuests(ids.map((id) => {
        const profile = profiles?.find((person) => person.id === id);
        return { id, name: profile?.artist_name || profile?.display_name || "Guest" };
      }));
    };
    loadApprovedGuests();
    const channel = supabase.channel("musek-approved-stage-" + roomId)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_live_join_requests", filter: "room_id=eq." + roomId }, loadApprovedGuests)
      .subscribe();
    // Reconcile periodically as a fallback if a Realtime event is missed.
    const refreshId = window.setInterval(loadApprovedGuests, 2000);
    return () => { active = false; window.clearInterval(refreshId); supabase.removeChannel(channel); };
  }, [roomId, hostId, supabase]);

  const hostTrack = cameraTracks.find((track) => track.participant.identity === hostId);
  // Only render an approved guest while their LiveKit participant is
  // actually connected. Camera-off guests still remain visible as tiles,
  // but a guest who disconnects can never leave a stale tile behind.
  const connectedGuestIds = new Set(participants.map((participant) => participant.identity));
  const guestTiles = approvedGuests.filter((guest) => connectedGuestIds.has(guest.id)).map((guest) => ({
    ...guest,
    track: cameraTracks.find((track) => track.participant.identity === guest.id),
    connected: true,
  }));

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#05040a] px-3 pb-40 pt-24 sm:px-5 sm:pb-32">
      <div className={guestTiles.length ? "mx-auto grid w-full max-w-6xl grid-cols-2 items-start gap-2 sm:gap-3" : "mx-auto max-w-5xl"}>
        <section className={guestTiles.length ? "min-w-0 w-full" : "w-full"}>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-fuchsia-300/25 bg-[#171321] shadow-2xl shadow-black/40">
            {hostTrack ? (
              <VideoTrack trackRef={hostTrack} className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#352044] to-[#11101a]">
                <div className="text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl font-black">{hostName.slice(0, 1).toUpperCase()}</div>
                  <p className="mt-3 text-sm font-bold">{hostName}</p>
                  <p className="mt-1 text-xs text-white/55">Host · camera off</p>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur">{hostName} · HOST</div>
          </div>
        </section>

        {guestTiles.length > 0 && (
          <section aria-label="Approved guests on stage" className="grid min-w-0 grid-cols-1 content-start gap-2">
            {guestTiles.map((guest) => (
              <div key={guest.id} className="relative aspect-video min-w-0 overflow-hidden rounded-xl border border-fuchsia-300/25 bg-[#171321]">
                {guest.track ? <VideoTrack trackRef={guest.track} className="h-full w-full object-cover" /> : (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#352044] to-[#11101a]">
                    <div className="text-center">
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10 text-2xl font-black">{guest.name.slice(0, 1).toUpperCase()}</div>
                      <p className="mt-2 text-xs font-bold">{guest.name}</p>
                      <p className="mt-1 text-[10px] text-white/55">{guest.connected ? "Approved · camera off" : "Approved · joining stage"}</p>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute bottom-2 left-2 max-w-[85%] truncate rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-bold backdrop-blur">{guest.name}</div>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="mx-auto mt-3 max-w-6xl text-center text-[10px] text-white/45">
        {guestTiles.length === 0 ? "The host is live. Approved guests will appear here when accepted." : guestTiles.length + " guest" + (guestTiles.length === 1 ? "" : "s") + " on stage"}
      </div>
    </div>
  );
}

export default function LiveVideoRoom({ roomId, hostId, displayName, hostName, onCameraControl }: {
  roomId: string;
  hostId: string;
  displayName: string;
  hostName: string;
  onCameraControl?: (control: LiveCameraControl | null) => void;
}) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [canPublish, setCanPublish] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setToken("");
    setCanPublish(false);
    onCameraControl?.(null);
    fetch("/api/social/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to join video.");
        return result as { token: string; serverUrl: string; canPublish: boolean };
      })
      .then((result) => {
        if (!active) return;
        setToken(result.token);
        setServerUrl(result.serverUrl);
        setCanPublish(result.canPublish);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to join video.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; onCameraControl?.(null); };
  }, [roomId, onCameraControl]);

  const handleError = useCallback((reason: Error) => setError(reason.message), []);

  if (loading) return <div className="grid h-full min-h-[100dvh] w-full place-items-center bg-black text-sm text-purple-100">Connecting your secure video room…</div>;
  if (error) return <div role="status" className="grid h-full min-h-[100dvh] content-center bg-black p-6 text-sm text-amber-100"><p className="font-bold">Video is not connected yet</p><p className="mt-2">{error}</p><p className="mt-2 text-xs text-amber-100/70">Room chat and reactions remain available while video is configured.</p></div>;

  return (
    <div className="h-full min-h-[100dvh] w-full overflow-hidden bg-black">
      <LiveKitRoom token={token} serverUrl={serverUrl} connect audio={canPublish} video={false} onError={handleError}>
        <CameraControlBridge canPublish={canPublish} onCameraControl={onCameraControl} />
        <RoomAudioRenderer />
        <HostFirstStage roomId={roomId} hostId={hostId} hostName={hostName} />
      </LiveKitRoom>
    </div>
  );
}
