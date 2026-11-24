"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode
} from "react";

export type MusekSong = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl?: string | null;
};

type PlaybackContextValue = {
  currentSong: MusekSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: MusekSong[];
  playSong: (song: MusekSong, songs?: MusekSong[]) => void;
  setQueue: (songs: MusekSong[]) => void;
  togglePlayback: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seek: (seconds: number) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function useMusekPlayback() {
  const value = useContext(PlaybackContext);
  if (!value) throw new Error("useMusekPlayback must be used inside MusekPlaybackProvider");
  return value;
}

export default function MusekPlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef({ songId: "", sessionId: null as string | null, started: false, completed: false, heartbeatAt: 0, busy: false, credited: 0 });
  const [queue, setQueueState] = useState<MusekSong[]>([]);
  const [currentSong, setCurrentSong] = useState<MusekSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const setQueue = useCallback((songs: MusekSong[]) => {
    setQueueState(songs.filter(song => !!song.audioUrl));
  }, []);

  const playSong = useCallback((song: MusekSong, songs?: MusekSong[]) => {
    if (songs) setQueueState(songs.filter(item => !!item.audioUrl));
    else setQueueState(current => current.some(item => item.id === song.id) ? current : [song]);
    setCurrentSong(song);
    setExpanded(true);
    setIsPlaying(true);
  }, []);

  const nextSong = useCallback(() => {
    if (!queue.length) return;
    const index = queue.findIndex(song => song.id === currentSong?.id);
    setCurrentSong(queue[index < 0 ? 0 : (index + 1) % queue.length]);
    setIsPlaying(true);
  }, [queue, currentSong]);

  const previousSong = useCallback(() => {
    if (!queue.length) return;
    const index = queue.findIndex(song => song.id === currentSong?.id);
    setCurrentSong(queue[index < 0 ? queue.length - 1 : (index - 1 + queue.length) % queue.length]);
    setIsPlaying(true);
  }, [queue, currentSong]);

  const togglePlayback = useCallback(() => {
    if (Capacitor.getPlatform() === "android") {
      if (isPlaying) void MusekNativePlayback.pause();
      else void MusekNativePlayback.resume();
      setIsPlaying(value => !value);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    const target = Math.max(0, Math.min(seconds, duration || seconds));
    if (Capacitor.getPlatform() === "android") {
      void MusekNativePlayback.seek({ seconds: target });
      setCurrentTime(target);
      return;
    }
    if (audioRef.current) audioRef.current.currentTime = target;
  }, [duration]);

  useEffect(() => {
    if (!currentSong) return;
    if (sessionRef.current.songId !== currentSong.id) {
      sessionRef.current = { songId: currentSong.id, sessionId: null, started: false, completed: false, heartbeatAt: 0, busy: false, credited: 0 };
    }
    if (Capacitor.getPlatform() === "android") {
      const nativeQueue = (queue.length ? queue : [currentSong]).filter(song => !!song.audioUrl);
      void MusekNativePlayback.play({ songId: currentSong.id, queue: nativeQueue }).catch(error => {
        console.error("MUSEK native playback failed", error);
        setIsPlaying(false);
      });
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = currentSong.audioUrl || "";
    audio.load();
    if (isPlaying) void audio.play().catch(() => setIsPlaying(false));
  }, [currentSong?.id]);

  useEffect(() => {
    if (Capacitor.getPlatform() === "android") return;
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying && currentSong) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying, currentSong?.id]);

  const startSession = useCallback(async () => {
    const song = currentSong;
    const session = sessionRef.current;
    if (!song || session.songId !== song.id || session.started) return;
    session.started = true;
    try {
      const response = await fetch("/api/music/record-play", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: song.id, action: "start" })
      });
      const result = await response.json();
      if (!response.ok || typeof result.sessionId !== "string") throw new Error(result.error || "Could not start playback session");
      if (sessionRef.current.songId === song.id) sessionRef.current.sessionId = result.sessionId;
    } catch (error) {
      session.started = false;
      console.error("MUSEK play session start failed", error);
    }
  }, [currentSong]);

  const heartbeat = useCallback(async () => {
    const audio = audioRef.current;
    const native = Capacitor.getPlatform() === "android";
    const song = currentSong;
    const session = sessionRef.current;
    if ((!audio && !native) || !song || (native ? !isPlaying : !audio || audio.paused || audio.seeking) || session.songId !== song.id || !session.sessionId || session.completed || session.busy || Date.now() - session.heartbeatAt < 4500) return;
    session.heartbeatAt = Date.now();
    session.busy = true;
    try {
      const nativeState = native ? await MusekNativePlayback.getState() : null;
      const playbackPosition = native ? (nativeState?.currentTime || 0) : audio!.currentTime;
      const response = await fetch("/api/music/record-play", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: song.id, action: "heartbeat", sessionId: session.sessionId, playbackPositionSeconds: playbackPosition })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Heartbeat failed");
      session.credited = Number(result.creditedSeconds) || 0;
      if (session.credited >= 30 && playbackPosition >= 30 && !session.completed) {
        const completion = await fetch("/api/music/record-play", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId: song.id, action: "complete", sessionId: session.sessionId, playbackPositionSeconds: playbackPosition })
        });
        if (completion.ok) session.completed = true;
      }
    } catch (error) {
      session.heartbeatAt = 0;
      console.error("MUSEK playback heartbeat failed", error);
    } finally {
      session.busy = false;
    }
  }, [currentSong, isPlaying]);

  useEffect(() => {
    if (Capacitor.getPlatform() === "android") {
      let mounted = true;
      let listener: { remove: () => Promise<void> } | null = null;
      const applyState = (state: { isPlaying: boolean; currentTime: number; duration: number }) => {
        if (!mounted) return;
        setIsPlaying(state.isPlaying);
        setCurrentTime(state.currentTime || 0);
        setDuration(state.duration || 0);
      };
      void MusekNativePlayback.addListener("playbackState", applyState).then(handle => {
        listener = handle;
      });
      const sync = () => {
        void MusekNativePlayback.getState().then(applyState).catch(error => {
          console.error("MUSEK native playback state sync failed", error);
        });
        void heartbeat();
      };
      sync();
      const interval = window.setInterval(sync, 1000);
      return () => {
        mounted = false;
        window.clearInterval(interval);
        if (listener) void listener.remove();
      };
    }
    const audio = audioRef.current;
    if (!audio) return;
    const time = () => { setCurrentTime(audio.currentTime || 0); void heartbeat(); };
    const metadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", time);
    audio.addEventListener("loadedmetadata", metadata);
    audio.addEventListener("play", play);
    audio.addEventListener("pause", pause);
    return () => {
      audio.removeEventListener("timeupdate", time);
      audio.removeEventListener("loadedmetadata", metadata);
      audio.removeEventListener("play", play);
      audio.removeEventListener("pause", pause);
    };
  }, [heartbeat]);

  useEffect(() => {
    if (!currentSong || !isPlaying) return;
    void startSession();
  }, [currentSong?.id, isPlaying, startSession]);

  useEffect(() => {
    if (Capacitor.getPlatform() === "android" || !("mediaSession" in navigator) || !currentSong) return;
    const artwork = currentSong.artworkUrl ? [{ src: currentSong.artworkUrl, sizes: "512x512", type: "image/png" }] : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title, artist: currentSong.artistName, album: "MUSEK",
      artwork
    });
    navigator.mediaSession.setActionHandler("play", () => { void audioRef.current?.play(); });
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("previoustrack", previousSong);
    navigator.mediaSession.setActionHandler("nexttrack", nextSong);
    navigator.mediaSession.setActionHandler("seekbackward", details => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (details.seekOffset || 10)); });
    navigator.mediaSession.setActionHandler("seekforward", details => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + (details.seekOffset || 10)); });
    return () => {
      for (const action of ["play","pause","previoustrack","nexttrack","seekbackward","seekforward"] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [currentSong, nextSong, previousSong, duration]);

  useEffect(() => {
    if ("mediaSession" in navigator && duration > 0) {
      navigator.mediaSession.setPositionState?.({ duration, playbackRate: 1, position: Math.min(currentTime, duration) });
    }
  }, [currentTime, duration]);

  const value = useMemo(() => ({ currentSong, isPlaying, currentTime, duration, queue, playSong, setQueue, togglePlayback, nextSong, previousSong, seek }), [currentSong, isPlaying, currentTime, duration, queue, playSong, setQueue, togglePlayback, nextSong, previousSong, seek]);

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" playsInline onEnded={nextSong} className="hidden" />
      {currentSong && (
        <section className="musek-global-player" aria-label="MUSEK music player">
          <button type="button" className="musek-player-art" onClick={() => setExpanded(value => !value)} aria-label="Expand music player">
            {currentSong.artworkUrl ? <img src={currentSong.artworkUrl} alt="" /> : <span>♫</span>}
          </button>
          <div className="musek-player-meta">
            <strong>{currentSong.title}</strong><span>{currentSong.artistName}</span>
            <input aria-label="Playback position" type="range" min="0" max={duration || 1} step="1" value={Math.min(currentTime, duration || 1)} onChange={event => seek(Number(event.target.value))} />
          </div>
          <button type="button" className="musek-player-control" onClick={previousSong} aria-label="Previous track">|◀</button>
          <button type="button" className="musek-player-control primary" onClick={togglePlayback} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <button type="button" className="musek-player-control" onClick={nextSong} aria-label="Next track">▶|</button>
          {expanded && <button type="button" className="musek-player-close" onClick={() => setExpanded(false)}>Collapse</button>}
        </section>
      )}
    </PlaybackContext.Provider>
  );
}
