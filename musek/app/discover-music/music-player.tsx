"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Song = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl?: string | null;
};

export default function MusicPlayer({ songs }: { songs: Song[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const countedPlayForSong = useRef<string | null>(null);

  const availableSongs = songs.filter((song) => song.audioUrl);
  const selectedSong = availableSongs[selectedIndex];

  useEffect(() => {
    countedPlayForSong.current = null;
  }, [selectedSong?.id]);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("MUSEK login check error:", authError);
          return;
        }

        if (!user) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from("favorite_tracks")
          .select("track_id")
          .eq("user_id", user.id);

        if (error) {
          console.error("MUSEK load favourites error:", error);
          setMessage("Could not load favourites: " + error.message);
          return;
        }

        setFavorites((data || []).map((item) => item.track_id));
      } catch (error: unknown) {
        console.error("MUSEK favourites loading error:", error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load favourites."
        );
      }
    }

    loadFavorites();
  }, []);

  async function recordPlay(songId: string) {
    if (countedPlayForSong.current === songId) return;

    countedPlayForSong.current = songId;

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("increment_track_play", {
        track_uuid: songId,
      });

      if (error) {
        countedPlayForSong.current = null;
        console.error("MUSEK play count error:", error);
      }
    } catch (error) {
      countedPlayForSong.current = null;
      console.error("MUSEK play count error:", error);
    }
  }

  async function toggleFavorite(songId: string) {
    if (!userId) {
      setMessage("Please log in to save favourite songs.");
      return;
    }

    setFavoriteLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const alreadyFavorite = favorites.includes(songId);

      if (alreadyFavorite) {
        const { error } = await supabase
          .from("favorite_tracks")
          .delete()
          .eq("user_id", userId)
          .eq("track_id", songId);

        if (error) throw error;

        setFavorites((current) => current.filter((id) => id !== songId));
        setMessage("Song removed from favourites.");
      } else {
        const { error } = await supabase.from("favorite_tracks").insert({
          user_id: userId,
          track_id: songId,
        });

        if (error) throw error;

        setFavorites((current) =>
          current.includes(songId) ? current : [...current, songId]
        );
        setMessage("Song added to favourites!");
      }
    } catch (error: unknown) {
      console.error("MUSEK favourites error:", error);

      const errorMessage =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : JSON.stringify(error);

      setMessage("Favourite error: " + errorMessage);
    } finally {
      setFavoriteLoading(false);
    }
  }

  function nextSong() {
    setSelectedIndex((current) =>
      current >= availableSongs.length - 1 ? 0 : current + 1
    );
  }

  function previousSong() {
    setSelectedIndex((current) =>
      current <= 0 ? availableSongs.length - 1 : current - 1
    );
  }

  if (availableSongs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
        <div className="mb-3 text-4xl text-fuchsia-300">♫</div>
        <h3 className="font-semibold text-white">No playable music yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Published tracks with playable audio will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-44 text-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Your playlist</h2>
          <p className="mt-1 text-xs text-gray-500">
            Select a track to load it into the player.
          </p>
        </div>
        <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-200">
          {availableSongs.length} playable
        </span>
      </div>

      <div className="space-y-3">
        {availableSongs.map((song, index) => {
          const active = selectedIndex === index;
          const liked = favorites.includes(song.id);

          return (
            <div
              key={song.id}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 to-violet-500/10 p-3 shadow-lg shadow-fuchsia-950/20 sm:gap-4 sm:p-4"
                  : "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0b0a14] p-3 transition hover:border-white/20 hover:bg-white/[0.04] sm:gap-4 sm:p-4"
              }
            >
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Play ${song.title} in player`}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-700 to-fuchsia-600 sm:h-16 sm:w-16"
              >
                {song.artworkUrl ? (
                  <img
                    src={song.artworkUrl}
                    alt={`${song.title} artwork`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl">
                    ♫
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xl text-white opacity-0 transition hover:opacity-100">
                  ▶
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-bold text-white sm:text-base">
                  {song.title}
                </span>
                <span className="mt-1 block truncate text-xs text-gray-400">
                  {song.artistName}
                </span>
                <span className="mt-2 inline-flex max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  {song.genre || "Music"}
                </span>
              </button>

              <div className="flex shrink-0 flex-col items-end gap-2">
                {active && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">
                    Selected
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleFavorite(song.id)}
                  disabled={favoriteLoading}
                  aria-label={liked ? "Remove from favourites" : "Add to favourites"}
                  aria-pressed={liked}
                  className={
                    liked
                      ? "rounded-full border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-xs font-semibold text-pink-300 transition hover:bg-pink-500/20 disabled:opacity-50"
                      : "rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-pink-400/30 hover:text-pink-300 disabled:opacity-50"
                  }
                >
                  {liked ? "♥ Liked" : "♡ Like"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100"
        >
          {message}
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-fuchsia-400/20 bg-[#0b0914]/95 px-3 py-3 shadow-[0_-12px_45px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-700 to-fuchsia-600 sm:h-14 sm:w-14">
            {selectedSong.artworkUrl ? (
              <img
                src={selectedSong.artworkUrl}
                alt={`${selectedSong.title} artwork`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl">
                ♫
              </span>
            )}
          </div>

          <div className="hidden min-w-0 w-44 shrink-0 sm:block">
            <p className="truncate text-sm font-bold text-white">
              {selectedSong.title}
            </p>
            <p className="mt-1 truncate text-xs text-gray-400">
              {selectedSong.artistName}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 sm:hidden">
              <p className="truncate text-xs font-bold text-white">
                {selectedSong.title}
              </p>
              <p className="truncate text-[10px] text-gray-400">
                {selectedSong.artistName}
              </p>
            </div>
            <audio
              key={selectedSong.id}
              controls
              preload="none"
              src={selectedSong.audioUrl || undefined}
              onTimeUpdate={(event) => {
                const audio = event.currentTarget;
                const playThreshold =
                  Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration < 30
                    ? audio.duration * 0.5
                    : 30;

                if (audio.currentTime >= playThreshold) {
                  void recordPlay(selectedSong.id);
                }
              }}
              onEnded={nextSong}
              className="h-9 w-full"
            />
          </div>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={previousSong}
              aria-label="Previous song"
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-gray-200 transition hover:border-fuchsia-400/40 hover:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={nextSong}
              aria-label="Next song"
              className="rounded-full bg-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-fuchsia-950/40 transition hover:bg-fuchsia-400"
            >
              Next
            </button>
          </div>
        </div>
        <div className="mt-2 flex justify-center gap-3 sm:hidden">
          <button
            type="button"
            onClick={previousSong}
            className="rounded-full border border-white/10 px-4 py-1.5 text-[11px] font-semibold text-gray-300"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextSong}
            className="rounded-full bg-fuchsia-500 px-4 py-1.5 text-[11px] font-bold text-white"
          >
            Next Song
          </button>
        </div>
      </div>
    </div>
  );
}
