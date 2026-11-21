"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

export default function LiveVideoRoom({ roomId, displayName }: { roomId: string; displayName: string }) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setToken("");
    fetch("/api/social/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to join video.");
        return result as { token: string; serverUrl: string };
      })
      .then((result) => {
        if (!active) return;
        setToken(result.token);
        setServerUrl(result.serverUrl);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to join video.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [roomId]);

  if (loading) return <div className="grid min-h-64 place-items-center rounded-2xl bg-black/30 text-sm text-purple-100">Connecting your secure video room…</div>;
  if (error) return <div role="status" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-sm text-amber-100"><p className="font-bold">Video is not connected yet</p><p className="mt-2">{error}</p><p className="mt-2 text-xs text-amber-100/70">Room chat and reactions remain available while video is configured.</p></div>;

  return (
    <div className="overflow-hidden rounded-2xl bg-[#090811]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div><p className="text-sm font-bold">Live video</p><p className="text-xs text-gray-400">You are joining as {displayName}</p></div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Connected room</span>
      </div>
      <div data-lk-theme="default" className="min-h-[420px]">
        <LiveKitRoom token={token} serverUrl={serverUrl} connect audio video onError={(reason) => setError(reason.message)}>
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}
