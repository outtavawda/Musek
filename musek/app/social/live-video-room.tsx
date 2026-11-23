"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useLocalParticipant, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

export type LiveCameraControl = {
  toggle: () => Promise<void>;
  enabled: boolean;
  canPublish: boolean;
};

function CameraControlBridge({ canPublish, onCameraControl }: {
  canPublish: boolean;
  onCameraControl?: (control: LiveCameraControl | null) => void;
}) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const toggle = useCallback(async () => {
    if (!canPublish) return;
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [canPublish, isCameraEnabled, localParticipant]);

  useEffect(() => {
    onCameraControl?.({ toggle, enabled: isCameraEnabled, canPublish });
    return () => onCameraControl?.(null);
  }, [toggle, isCameraEnabled, canPublish, onCameraControl]);

  return null;
}

function HostFirstStage({ hostId, hostName }: { hostId: string; hostName: string }) {
  // Render only published camera tracks. Audience members remain in chat and
  // never receive a stage tile merely because they joined the room.
  const cameraTracks = useTracks([Track.Source.Camera]);
  const hostTrack = cameraTracks.find((track) => track.participant.identity === hostId);
  const guestTracks = cameraTracks
    .filter((track) => track.participant.identity !== hostId)
    .sort((a, b) => a.participant.name.localeCompare(b.participant.name));

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#05040a] px-3 pb-40 pt-24 sm:px-5 sm:pb-32">
      <div className={guestTracks.length ? "mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-stretch" : "mx-auto max-w-5xl"}>
        <section className={guestTracks.length ? "w-full sm:w-[62%] sm:shrink-0" : "w-full"}>
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

        {guestTracks.length > 0 && (
          <section aria-label="Approved guests on stage" className="grid min-w-0 flex-1 grid-cols-2 content-start gap-2 sm:grid-cols-1 lg:grid-cols-2">
            {guestTracks.map((track) => (
              <div key={track.participant.identity} className="relative aspect-video min-w-0 overflow-hidden rounded-xl border border-white/15 bg-[#171321]">
                <VideoTrack trackRef={track} className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute bottom-2 left-2 max-w-[85%] truncate rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-bold backdrop-blur">{track.participant.name || "Guest"}</div>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="mx-auto mt-3 max-w-6xl text-center text-[10px] text-white/45">
        {guestTracks.length === 0 ? "The host is live. Approved guests will appear here when they turn on their cameras." : guestTracks.length + " guest" + (guestTracks.length === 1 ? "" : "s") + " on stage"}
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
        <HostFirstStage hostId={hostId} hostName={hostName} />
      </LiveKitRoom>
    </div>
  );
}
