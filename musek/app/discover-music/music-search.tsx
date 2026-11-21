"use client";

import { useMemo, useState } from "react";
import MusicPlayer from "./music-player";

type Song = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl: string | null;
};

export default function MusicSearch({ songs }: { songs: Song[] }) {
  const [search, setSearch] = useState("");

  const genres = useMemo(() => {
    const uniqueGenres = songs
      .map((song) => song.genre.trim())
      .filter((genre) => genre.length > 0);

    return Array.from(new Set(uniqueGenres));
  }, [songs]);

  const filteredSongs = songs.filter((song) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      song.title.toLowerCase().includes(query) ||
      song.artistName.toLowerCase().includes(query) ||
      song.genre.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <label htmlFor="musek-music-search" className="mb-3 block text-sm font-semibold text-gray-200">
        Search songs, artists or genres
      </label>

      <div className="relative mb-8">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-fuchsia-300">
          ⌕
        </span>
        <input
          id="musek-music-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="What do you want to listen to?"
          aria-label="Search songs, artists or genres"
          className="w-full rounded-2xl border border-white/10 bg-[#090812] py-4 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
        />
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Browse by genre</h3>
          <span className="text-xs text-gray-500">{genres.length} genres</span>
        </div>

        {genres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => {
              const active = search.toLowerCase() === genre.toLowerCase();

              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSearch(active ? "" : genre)}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-full border border-fuchsia-400 bg-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-950/30"
                      : "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:text-white"
                  }
                >
                  {genre}
                </button>
              );
            })}

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-gray-400 transition hover:text-white"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Genres will appear as artists publish music.</p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">All Music</h2>
          <p className="mt-1 text-xs text-gray-500">Find your next favourite track.</p>
        </div>
        <p className="text-xs font-medium text-fuchsia-200">
          {filteredSongs.length} {filteredSongs.length === 1 ? "track" : "tracks"} found
        </p>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
          <div className="mb-3 text-3xl">♫</div>
          <h3 className="font-semibold text-white">No music found</h3>
          <p className="mt-2 text-sm text-gray-500">Try another search or clear your genre filter.</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-5 rounded-full bg-fuchsia-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-fuchsia-400"
          >
            Show all music
          </button>
        </div>
      ) : (
        <MusicPlayer key={search} songs={filteredSongs} />
      )}
    </div>
  );
}
