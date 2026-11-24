import { registerPlugin } from "@capacitor/core";

export type NativePlaybackSong = {
  id: string;
  title: string;
  artistName: string;
  audioUrl: string | null;
  artworkUrl?: string | null;
};

export type NativePlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  songId: string;
};

type MusekNativePlaybackPlugin = {
  play(options: { songId: string; queue: NativePlaybackSong[] }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(options: { seconds: number }): Promise<void>;
  getState(): Promise<NativePlaybackState>;
  addListener(
    eventName: "playbackState",
    listenerFunc: (state: NativePlaybackState) => void
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: "playbackError",
    listenerFunc: (error: { message: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
};

export const MusekNativePlayback = registerPlugin<MusekNativePlaybackPlugin>("MusekNativePlayback");
