
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
      <h2>Search MUSEK Music</h2>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search songs, artists or genres..."
        aria-label="Search songs, artists or genres"
        style={{
          display: "block",
          width: "100%",
          padding: "14px",
          margin: "15px 0 20px",
          border: "1px solid #999",
          borderRadius: "8px",
          fontSize: "16px",
          boxSizing: "border-box",
        }}
      />

      <h3>Browse Genres</h3>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "25px",
        }}
      >
        {genres.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => setSearch(genre)}
            style={{
              padding: "8px 14px",
              border: "1px solid #999",
              borderRadius: "20px",
              cursor: "pointer",
            }}
          >
            {genre}
          </button>
        ))}

        {genres.length > 0 && (
          <button
            type="button"
            onClick={() => setSearch("")}
            style={{
              padding: "8px 14px",
              border: "1px solid #999",
              borderRadius: "20px",
              cursor: "pointer",
            }}
          >
            Show All
          </button>
        )}
      </div>

      <h2>Music Library</h2>

      <p>{filteredSongs.length} song(s) found</p>

      {filteredSongs.length === 0 ? (
        <p>No songs found. Try another search.</p>
      ) : (
        <MusicPlayer
          key={search}
          songs={filteredSongs}
        />
      )}
    </div>
  );
}
