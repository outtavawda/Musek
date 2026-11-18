
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Song = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
};

export default function MusicPlayer({ songs }: { songs: Song[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const availableSongs = songs.filter((song) => song.audioUrl);
  const selectedSong = availableSongs[selectedIndex];

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

        setFavorites(data.map((item) => item.track_id));
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

        setFavorites((current) =>
          current.filter((id) => id !== songId)
        );

        setMessage("Song removed from favourites.");
      } else {
        const { error } = await supabase
          .from("favorite_tracks")
          .insert({
            user_id: userId,
            track_id: songId,
          });

        if (error) throw error;

        setFavorites((current) =>
          current.includes(songId)
            ? current
            : [...current, songId]
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
    return <p>No playable music is available yet.</p>;
  }

  return (
    <div
      style={{
        paddingBottom: "150px",
        background: "#000000",
        color: "#ffffff",
      }}
    >
      <h2 style={{ color: "#ffffff" }}>MUSEK Playlist</h2>

      {availableSongs.map((song, index) => (
        <div
          key={song.id}
          style={{
            padding: "12px",
            marginBottom: "8px",
            border: "1px solid #333333",
            borderRadius: "8px",
            background:
              selectedIndex === index ? "#262626" : "#000000",
            color: "#ffffff",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedIndex(index)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              color: "#ffffff",
              cursor: "pointer",
              padding: "5px",
            }}
          >
            <strong>{song.title}</strong>
            <br />
            <span style={{ color: "#cccccc" }}>
              {song.artistName} · {song.genre || "Music"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(song.id)}
            disabled={favoriteLoading}
            style={{
              marginTop: "8px",
              background: "#222222",
              color: "#ffffff",
              border: "1px solid #555555",
              borderRadius: "6px",
              padding: "7px 12px",
              cursor: "pointer",
            }}
          >
            {favorites.includes(song.id) ? "❤️ Liked" : "🤍 Like"}
          </button>
        </div>
      ))}

      {message && (
        <p role="status" style={{ color: "#ffffff" }}>
          {message}
        </p>
      )}

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#000000",
          color: "#ffffff",
          padding: "15px 20px",
          boxShadow: "0 -3px 12px rgba(255,255,255,0.08)",
          borderTop: "1px solid #333333",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <strong>{selectedSong.title}</strong>

          <p style={{ margin: "4px 0 10px", color: "#cccccc" }}>
            {selectedSong.artistName}
          </p>

          <audio
            key={selectedSong.id}
            controls
            preload="none"
            src={selectedSong.audioUrl || undefined}
            onEnded={nextSong}
            style={{
              width: "100%",
              colorScheme: "dark",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "15px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              onClick={previousSong}
              style={{
                background: "#222222",
                color: "#ffffff",
                border: "1px solid #555555",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Previous
            </button>

            <button
              type="button"
              onClick={nextSong}
              style={{
                background: "#222222",
                color: "#ffffff",
                border: "1px solid #555555",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Next Song
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
