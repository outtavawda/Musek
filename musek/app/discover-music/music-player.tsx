"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMusekPlayback, type MusekSong } from "@/components/music-playback-provider";

type Song = MusekSong;

export default function MusicPlayer({ songs }: { songs: Song[] }) {
  const { currentSong, isPlaying, playSong, setQueue, togglePlayback, nextSong, previousSong } = useMusekPlayback();
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const availableSongs = songs.filter(song => !!song.audioUrl);

  useEffect(() => {
    setQueue(availableSongs);
  }, [songs, setQueue]);

  useEffect(() => {
    async function loadFavorites() {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) { console.error("MUSEK login check error:", authError); return; }
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase.from("favorite_tracks").select("track_id").eq("user_id", user.id);
      if (error) { console.error("MUSEK load favourites error:", error); setMessage("Could not load favourites: " + error.message); return; }
      setFavorites((data || []).map(item => item.track_id));
    }
    void loadFavorites();
  }, []);

  async function toggleFavorite(songId: string) {
    if (!userId) { setMessage("Please log in to save favourite songs."); return; }
    setFavoriteLoading(true); setMessage("");
    try {
      const supabase = createClient();
      if (favorites.includes(songId)) {
        const { error } = await supabase.from("favorite_tracks").delete().eq("user_id", userId).eq("track_id", songId);
        if (error) throw error;
        setFavorites(current => current.filter(id => id !== songId));
        setMessage("Song removed from favourites.");
      } else {
        const { error } = await supabase.from("favorite_tracks").insert({ user_id: userId, track_id: songId });
        if (error) throw error;
        setFavorites(current => current.includes(songId) ? current : [...current, songId]);
        setMessage("Song added to favourites!");
      }
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : "Please try again.";
      setMessage("Favourite error: " + detail);
    } finally { setFavoriteLoading(false); }
  }

  if (!availableSongs.length) return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
      <div className="mb-3 text-4xl text-fuchsia-300">♫</div>
      <h3 className="font-semibold text-white">No playable music yet</h3>
      <p className="mt-2 text-sm text-gray-500">Published tracks with playable audio will appear here.</p>
    </div>
  );

  return (
    <div className="pb-24 text-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">Your playlist</h2><p className="mt-1 text-xs text-gray-500">Select a track to load it into the player.</p></div>
        <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-200">{availableSongs.length} playable</span>
      </div>
      <div className="space-y-3">
        {availableSongs.map(song => {
          const active = currentSong?.id === song.id;
          const liked = favorites.includes(song.id);
          return (
            <div key={song.id} className={active ? "flex items-center gap-3 rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 to-violet-500/10 p-3 sm:gap-4 sm:p-4" : "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0b0a14] p-3 sm:gap-4 sm:p-4"}>
              <button type="button" onClick={() => playSong(song, availableSongs)} aria-label={`Play ${song.title}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-700 to-fuchsia-600 sm:h-16 sm:w-16">
                {song.artworkUrl ? <img src={song.artworkUrl} alt="" className="h-full w-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-2xl">♫</span>}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xl text-white">{active && isPlaying ? "Ⅱ" : "▶"}</span>
              </button>
              <button type="button" onClick={() => playSong(song, availableSongs)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-bold">{song.title}</span><span className="mt-1 block truncate text-xs text-gray-400">{song.artistName}</span>
                <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase text-gray-400">{song.genre || "Music"}</span>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {active && <span className="text-[10px] font-bold uppercase text-fuchsia-300">Playing</span>}
                <button type="button" onClick={() => void toggleFavorite(song.id)} disabled={favoriteLoading} aria-pressed={liked} className={liked ? "rounded-full border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-xs text-pink-300" : "rounded-full border border-white/10 px-3 py-2 text-xs text-gray-300"}>{liked ? "♥ Liked" : "♡ Like"}</button>
              </div>
            </div>
          );
        })}
      </div>
      {message && <p role="status" className="mt-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100">{message}</p>}
      {currentSong && <div className="mt-5 flex items-center justify-center gap-3 sm:hidden">
        <button type="button" onClick={previousSong} className="rounded-full border border-white/10 px-4 py-2 text-xs">Previous</button>
        <button type="button" onClick={togglePlayback} className="rounded-full bg-fuchsia-500 px-5 py-2 text-xs font-bold">{isPlaying ? "Pause" : "Play"}</button>
        <button type="button" onClick={nextSong} className="rounded-full border border-white/10 px-4 py-2 text-xs">Next</button>
      </div>}
    </div>
  );
}
