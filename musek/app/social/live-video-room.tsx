"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import "@livekit/components-styles";

export type LiveCameraControl = {
  toggle: () => Promise<void>;
  toggleMicrophone: () => Promise<void>;
  disableMedia: () => Promise<void>;
  enabled: boolean;
  microphoneEnabled: boolean;
  canPublish: boolean;
};

function CameraControlBridge({ canPublish, onCameraControl }: {
  canPublish: boolean;
  onCameraControl?: (control: LiveCameraControl | null) => void;
}) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

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
    await localParticipant.setCameraEnabled(!isCameraEnabled, { resolution: VideoPresets.h720.resolution, facingMode: "user" });
  }, [canPublish, isCameraEnabled, localParticipant]);
  const toggleMicrophone = useCallback(async () => {
    if (!canPublish) return;
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [canPublish, isMicrophoneEnabled, localParticipant]);
  const disableMedia = useCallback(async () => {
    if (!canPublish) return;
    await Promise.all([
      localParticipant.setCameraEnabled(false),
      localParticipant.setMicrophoneEnabled(false),
    ]);
  }, [canPublish, localParticipant]);

  useEffect(() => {
    onCameraControl?.({ toggle, toggleMicrophone, disableMedia, enabled: isCameraEnabled, microphoneEnabled: isMicrophoneEnabled, canPublish });
    return () => onCameraControl?.(null);
  }, [toggle, toggleMicrophone, disableMedia, isCameraEnabled, isMicrophoneEnabled, canPublish, onCameraControl]);

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
    <div className="absolute inset-0 overflow-hidden bg-[#05040a] px-2 pb-36 pt-20 sm:px-4 sm:pb-28">
      <div className="mx-auto flex h-full w-full max-w-6xl items-stretch gap-2 sm:gap-3">
        <section className={guestTiles.length ? "relative min-w-0 flex-[2.1] overflow-hidden rounded-2xl border border-[#d6b65c]/70 bg-[#17130a] shadow-[0_8px_36px_rgba(0,0,0,.55)]" : "relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#d6b65c]/70 bg-[#17130a] shadow-[0_8px_36px_rgba(0,0,0,.55)]"}>
          {hostTrack ? (
            <div className="musek-stage-video"><VideoTrack trackRef={hostTrack} /></div>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#3b2d0c] to-[#090909]">
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#e7c96f]/50 bg-[#d4af37]/15 text-3xl font-black text-[#f7e7ad]">{hostName.slice(0, 1).toUpperCase()}</div>
                <p className="mt-3 text-sm font-bold text-white">{hostName}</p>
                <p className="mt-1 text-xs text-white/65">Host · camera off</p>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-[#f4df9b]/70 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#f6df9a] backdrop-blur">♛ Host · {hostName}</div>
        </section>

        {guestTiles.length > 0 && (
          <section aria-label="Approved guests on stage" className="flex w-[32%] min-w-0 max-w-[280px] flex-col gap-2">
            {guestTiles.map((guest) => (
              <div key={guest.id} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[#d6b65c]/70 bg-[#17130a] shadow-lg">
                {guest.track ? <div className="musek-stage-video"><VideoTrack trackRef={guest.track} /></div> : (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#3b2d0c] to-[#090909]">
                    <div className="px-1 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#e7c96f]/50 bg-[#d4af37]/15 text-xl font-black text-[#f7e7ad]">{guest.name.slice(0, 1).toUpperCase()}</div>
                      <p className="mt-2 truncate text-[11px] font-bold text-white">{guest.name}</p>
                      <p className="mt-1 text-[9px] text-white/60">{guest.connected ? "Approved · camera off" : "Approved · joining"}</p>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute bottom-2 left-2 right-2 truncate rounded-full border border-[#f4df9b]/40 bg-black/65 px-2 py-1 text-center text-[9px] font-bold text-[#fff2c4] backdrop-blur">{guest.name}</div>
              </div>
            ))}
          </section>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-[calc(140px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full border border-[#d6b65c]/40 bg-black/55 px-3 py-1 text-center text-[9px] text-[#f4df9b]/80 backdrop-blur">
        {guestTiles.length === 0 ? "The host is live · approved guests appear here when accepted" : guestTiles.length + " guest" + (guestTiles.length === 1 ? "" : "s") + " on stage"}
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
      <LiveKitRoom token={token} serverUrl={serverUrl} connect audio={false} video={false} onError={handleError}>
        <CameraControlBridge canPublish={canPublish} onCameraControl={onCameraControl} />
        <RoomAudioRenderer />
        <HostFirstStage roomId={roomId} hostId={hostId} hostName={hostName} />
      </LiveKitRoom>
    </div>
  );
}
