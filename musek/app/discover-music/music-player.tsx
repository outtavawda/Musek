
"use client";

import { useState } from "react";

type Song = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
};

export default function MusicPlayer({ songs }: { songs: Song[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const availableSongs = songs.filter((song) => song.audioUrl);
  const selectedSong = availableSongs[selectedIndex];

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
    return <p>No playable music is available yet.</p>;
  }

  return (
    <div style={{ paddingBottom: "110px" }}>
      <h2>MUSEK Playlist</h2>

      {availableSongs.map((song, index) => (
        <button
          key={song.id}
          type="button"
          onClick={() => setSelectedIndex(index)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "15px",
            marginBottom: "8px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            background:
              selectedIndex === index ? "#e5e7eb" : "transparent",
            color: "#111",
            cursor: "pointer",
          }}
        >
          <strong>{song.title}</strong>
          <br />
          <span>
            {song.artistName} · {song.genre || "Music"}
          </span>
          {selectedIndex === index && (
            <span style={{ float: "right" }}>Selected</span>
          )}
        </button>
      ))}

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#111827",
          color: "white",
          padding: "15px 20px",
          boxShadow: "0 -3px 12px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          <strong>{selectedSong.title}</strong>
          <p style={{ margin: "4px 0 10px", color: "#d1d5db" }}>
            {selectedSong.artistName}
          </p>

          <audio
            key={selectedSong.id}
            controls
            autoPlay
            src={selectedSong.audioUrl || undefined}
            onEnded={nextSong}
            style={{ width: "100%" }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "15px",
              marginTop: "10px",
            }}
          >
            <button type="button" onClick={previousSong}>
              Previous
            </button>

            <button type="button" onClick={nextSong}>
              Next Song
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
