
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FeedSong = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl: string | null;
  artistId: string;
  recommendationReason: string;
};

export default function FeedClient({
  songs,
}: {
  songs: FeedSong[];
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const listenStart = useRef<number | null>(null);
  const listenSong = useRef<string | null>(null);
  const savedListen = useRef(false);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from("favorite_tracks")
          .select("track_id")
          .eq("user_id", user.id);

        if (error) throw error;

        setFavorites((data || []).map((item) => item.track_id));

        const { error: preferenceError } = await supabase.rpc(
          "update_my_music_preferences"
        );

        if (preferenceError) {
          console.error(
            "MUSEK preference update error:",
            preferenceError
          );
        }
      } catch (error) {
        console.error("MUSEK favourites loading error:", error);
        setMessage("Could not load your saved songs.");
      }
    }

    loadFavorites();
  }, []);

  async function toggleFavorite(songId: string) {
    if (!userId) {
      setMessage("Please log in to like and save songs.");
      return;
    }

    setFavoriteLoading(songId);
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

        setMessage("Song removed from your favourites.");
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

        setMessage("Song added to your favourites!");
      }

      const { error: preferenceError } = await supabase.rpc(
        "update_my_music_preferences"
      );

      if (preferenceError) {
        console.error(
          "MUSEK preference update error:",
          preferenceError
        );
      }
    } catch (error) {
      console.error("MUSEK Like error:", error);

      setMessage(
        error instanceof Error
          ? "Could not update Like: " + error.message
          : "Could not update Like."
      );
    } finally {
      setFavoriteLoading(null);
    }
  }

  async function saveListeningTime() {
    if (
      !userId ||
      !listenSong.current ||
      listenStart.current === null ||
      savedListen.current
    ) {
      return;
    }

    const songId = listenSong.current;

    const seconds = Math.floor(
      (Date.now() - listenStart.current) / 1000
    );

    savedListen.current = true;
    listenStart.current = null;
    listenSong.current = null;

    if (seconds < 1) return;

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("record_music_listen", {
        p_track_id: songId,
        p_listened_seconds: seconds,
      });

      if (error) {
        console.error("MUSEK listening history error:", error);
      } else {
        const { error: preferenceError } = await supabase.rpc(
          "update_my_music_preferences"
        );

        if (preferenceError) {
          console.error(
            "MUSEK preference update error:",
            preferenceError
          );
        }
      }
    } catch (error) {
      console.error("MUSEK listening history error:", error);
    }
  }

  function startListening(songId: string) {
    if (!userId) return;

    if (listenSong.current === songId) return;

    void saveListeningTime();

    listenSong.current = songId;
    listenStart.current = Date.now();
    savedListen.current = false;
  }

  useEffect(() => {
    const handlePageHide = () => {
      void saveListeningTime();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      void saveListeningTime();
    };
  }, [userId]);

  return (
    <main
      style={{
        minHeight: "100svh",
        background: "#09090d",
        color: "white",
        padding: "15px",
        boxSizing: "border-box",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "15px" }}>
        <h1 style={{ fontSize: "30px", margin: 0 }}>
          MUSEK<span style={{ color: "#a855f7" }}>.</span>
        </h1>

        <p style={{ color: "#aaa", margin: "5px 0" }}>
          Your music. Your discovery.
        </p>
      </header>

      <div
        style={{
          textAlign: "center",
          marginBottom: "12px",
          color: "#c084fc",
          fontWeight: "bold",
          letterSpacing: "2px",
        }}
      >
        FOR YOU
      </div>

      {message && (
        <p role="status" style={{ textAlign: "center", color: "#d8b4fe" }}>
          {message}
        </p>
      )}

      {songs.length === 0 ? (
        <p style={{ textAlign: "center", color: "#aaa" }}>
          No published songs are available yet.
        </p>
      ) : (
        <div
          style={{
            maxWidth: "650px",
            height: "calc(100svh - 145px)",
            minHeight: "500px",
            margin: "0 auto",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            overscrollBehaviorY: "contain",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            scrollbarWidth: "none",
          }}
        >
          {songs.map((song) => {
            const isFavorite = favorites.includes(song.id);
            const isLoading = favoriteLoading === song.id;

            return (
              <article
                key={song.id}
                style={{
                  position: "relative",
                  flex: "0 0 100%",
                  height: "100%",
                  minHeight: "500px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "#191522",
                  border: "1px solid #43246a",
                  scrollSnapAlign: "start",
                  scrollSnapStop: "always",
                }}
              >
                {song.artworkUrl ? (
                  <img
                    src={song.artworkUrl}
                    alt={`${song.title} cover`}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      fontSize: "100px",
                      background: "linear-gradient(135deg, #24103e, #111)",
                    }}
                  >
                    🎵
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(transparent 15%, rgba(0,0,0,.9) 100%)",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    bottom: "25px",
                    left: "20px",
                    right: "20px",
                  }}
                >
                  <p
                    style={{
                      color: "#d8b4fe",
                      fontSize: "12px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                    }}
                  >
                    MUSEK DISCOVERY
                  </p>

                  <h2 style={{ fontSize: "28px", margin: "8px 0" }}>
                    {song.title}
                  </h2>

                  <p style={{ color: "#eee", margin: "5px 0" }}>
                    {song.artistName}
                  </p>

                  <p style={{ color: "#ccc", fontSize: "14px" }}>
                    {song.genre}
                  </p>

                  <p
                    style={{
                      display: "inline-block",
                      color: "#e9d5ff",
                      background: "rgba(126,34,206,0.35)",
                      border: "1px solid rgba(192,132,252,0.5)",
                      borderRadius: "20px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      margin: "4px 0 12px",
                    }}
                  >
                    ✨ {song.recommendationReason}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      margin: "12px 0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFavorite(song.id)}
                      disabled={isLoading}
                      aria-pressed={isFavorite}
                      style={{
                        padding: "11px 18px",
                        border: "1px solid #a855f7",
                        borderRadius: "25px",
                        background: isFavorite ? "#6b21a8" : "#17101f",
                        color: "white",
                        fontWeight: "bold",
                        cursor: isLoading ? "wait" : "pointer",
                        opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      {isLoading
                        ? "Saving..."
                        : isFavorite
                          ? "❤️ Liked"
                          : "🤍 Like"}
                    </button>

                    <a
                      href={`/artist/${song.artistId}`}
                      style={{
                        padding: "11px 18px",
                        border: "1px solid #a855f7",
                        borderRadius: "25px",
                        color: "white",
                        textDecoration: "none",
                      }}
                    >
                      View Artist →
                    </a>
                  </div>

                  {song.audioUrl && (
                    <audio
                      controls
                      preload="none"
                      src={song.audioUrl}
                      onPlay={() => startListening(song.id)}
                      onPause={() => {
                        if (listenSong.current === song.id) {
                          void saveListeningTime();
                        }
                      }}
                      onEnded={() => {
                        if (listenSong.current === song.id) {
                          void saveListeningTime();
                        }
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: "12px",
                      }}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
