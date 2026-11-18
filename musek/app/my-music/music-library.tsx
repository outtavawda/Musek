
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Song = {
  id: string;
  title: string;
  description: string;
  genre: string;
  audio_path: string;
  status: string;
  created_at: string;
  audioUrl: string | null;
};

export default function MusicLibrary({
  initialSongs,
  userId,
}: {
  initialSongs: Song[];
  userId: string;
}) {
  const [songs, setSongs] = useState(initialSongs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function startEditing(song: Song) {
    setEditingId(song.id);
    setTitle(song.title);
    setGenre(song.genre || "");
    setDescription(song.description || "");
    setMessage("");
  }

  async function saveSong(songId: string) {
    if (!title.trim()) {
      setMessage("Please enter a song title.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("music_tracks")
        .update({
          title: title.trim(),
          genre: genre.trim(),
          description: description.trim(),
        })
        .eq("id", songId)
        .eq("artist_id", userId);

      if (error) throw error;

      setSongs((currentSongs) =>
        currentSongs.map((song) =>
          song.id === songId
            ? {
                ...song,
                title: title.trim(),
                genre: genre.trim(),
                description: description.trim(),
              }
            : song
        )
      );

      setEditingId(null);
      setMessage("Song details updated successfully.");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error.";

      setMessage("Could not update song: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSong(song: Song) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${song.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(song.id);
    setMessage("");

    try {
      const supabase = createClient();

      // Delete the database record first.
      const { data: deletedRows, error: databaseError } = await supabase
        .from("music_tracks")
        .delete()
        .eq("id", song.id)
        .eq("artist_id", userId)
        .select("id");

      if (databaseError) throw databaseError;

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          "Song could not be deleted. Check your account permissions."
        );
      }

      // Remove the audio file from private storage.
      const { error: storageError } = await supabase.storage
        .from("music-tracks")
        .remove([song.audio_path]);

      if (storageError) {
        setMessage(
          "Song record deleted, but its audio file could not be removed: " +
            storageError.message
        );
      } else {
        setMessage("Song and audio file deleted successfully.");
      }

      setSongs((currentSongs) =>
        currentSongs.filter((item) => item.id !== song.id)
      );

      if (editingId === song.id) {
        setEditingId(null);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error.";

      setMessage("Could not delete song: " + errorMessage);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {songs.length === 0 ? (
        <p>You haven't uploaded any songs yet.</p>
      ) : (
        songs.map((song) => (
          <section
            key={song.id}
            style={{
              padding: "20px 0",
              borderBottom: "1px solid #ccc",
            }}
          >
            {editingId === song.id ? (
              <div>
                <h2>Edit Song</h2>

                <label>
                  Song title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={150}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px",
                      margin: "8px 0 16px",
                    }}
                  />
                </label>

                <label>
                  Genre
                  <input
                    value={genre}
                    onChange={(event) => setGenre(event.target.value)}
                    maxLength={80}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px",
                      margin: "8px 0 16px",
                    }}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px",
                      margin: "8px 0 16px",
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => saveSong(song.id)}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setEditingId(null)}
                  style={{ marginLeft: "10px" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <h2>{song.title}</h2>

                <p>Genre: {song.genre || "Not specified"}</p>
                <p>{song.description}</p>

                <p>
                  Status: <strong>{song.status}</strong>
                </p>

                {song.audioUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={song.audioUrl}
                    style={{ width: "100%", maxWidth: "500px" }}
                  />
                ) : (
                  <p>Audio preview is currently unavailable.</p>
                )}

                <p>
                  <button
                    type="button"
                    onClick={() => startEditing(song)}
                    disabled={deletingId === song.id}
                  >
                    Edit Song
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSong(song)}
                    disabled={deletingId === song.id}
                    style={{
                      marginLeft: "10px",
                      backgroundColor: "#b91c1c",
                      color: "white",
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {deletingId === song.id ? "Deleting..." : "Delete Song"}
                  </button>
                </p>
              </div>
            )}
          </section>
        ))
      )}

      {message && (
        <p role="status" style={{ marginTop: "15px" }}>
          {message}
        </p>
      )}
    </div>
  );
}
