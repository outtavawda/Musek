
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Song = {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  audio_path: string;
  cover_art_path: string | null;
  status: string;
  created_at: string;
  audioUrl: string | null;
  coverArtUrl: string | null;
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
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function startEditing(song: Song) {
    setEditingId(song.id);
    setTitle(song.title);
    setGenre(song.genre || "");
    setDescription(song.description || "");
    setCoverArt(null);
    setMessage("");
  }

  async function saveSong(song: Song) {
    if (!title.trim()) {
      setMessage("Please enter a song title.");
      return;
    }

    let newCoverPath: string | null = null;

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (coverArt) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];

        const extension =
          coverArt.name.split(".").pop()?.toLowerCase() || "";

        if (
          !allowedTypes.includes(coverArt.type) ||
          !["jpg", "jpeg", "png", "webp"].includes(extension)
        ) {
          throw new Error("Please choose a JPG, PNG or WebP image.");
        }

        if (coverArt.size > 5 * 1024 * 1024) {
          throw new Error("Cover art must be 5 MB or less.");
        }

        newCoverPath = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("song-cover-art")
          .upload(newCoverPath, coverArt, {
            contentType: coverArt.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      const updatedCoverPath = newCoverPath || song.cover_art_path;

      const { data, error } = await supabase
        .from("music_tracks")
        .update({
          title: title.trim(),
          genre: genre.trim(),
          description: description.trim(),
          ...(newCoverPath ? { cover_art_path: newCoverPath } : {}),
        })
        .eq("id", song.id)
        .eq("artist_id", userId)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("You do not have permission to update this song.");
      }

      let newCoverUrl = song.coverArtUrl;

      if (newCoverPath) {
        const { data: signedData } = await supabase.storage
          .from("song-cover-art")
          .createSignedUrl(newCoverPath, 3600);

        newCoverUrl = signedData?.signedUrl || null;
      }

      setSongs((currentSongs) =>
        currentSongs.map((item) =>
          item.id === song.id
            ? {
                ...item,
                title: title.trim(),
                genre: genre.trim(),
                description: description.trim(),
                cover_art_path: updatedCoverPath,
                coverArtUrl: newCoverUrl,
              }
            : item
        )
      );

      if (newCoverPath && song.cover_art_path) {
        await supabase.storage
          .from("song-cover-art")
          .remove([song.cover_art_path]);
      }

      setEditingId(null);
      setCoverArt(null);
      setMessage("Song details and cover art updated successfully.");

    } catch (error: unknown) {
      if (newCoverPath) {
        const supabase = createClient();
        await supabase.storage
          .from("song-cover-art")
          .remove([newCoverPath]);
      }

      setMessage(
        "Could not update song: " +
          (error instanceof Error ? error.message : "Unknown error.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(song: Song) {
    const newStatus =
      song.status === "published" ? "draft" : "published";

    const action =
      newStatus === "published" ? "publish" : "unpublish";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${song.title}"?`
      )
    ) {
      return;
    }

    setPublishingId(song.id);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("music_tracks")
        .update({ status: newStatus })
        .eq("id", song.id)
        .eq("artist_id", userId)
        .select("id, status");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("You do not have permission to change this song.");
      }

      setSongs((currentSongs) =>
        currentSongs.map((item) =>
          item.id === song.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setMessage(
        newStatus === "published"
          ? "Your song is now published on MUSEK!"
          : "Your song has been moved back to drafts."
      );
    } catch (error: unknown) {
      setMessage(
        "Could not change song status: " +
          (error instanceof Error ? error.message : "Unknown error.")
      );
    } finally {
      setPublishingId(null);
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

      const { data: deletedRows, error: databaseError } = await supabase
        .from("music_tracks")
        .delete()
        .eq("id", song.id)
        .eq("artist_id", userId)
        .select("id");

      if (databaseError) throw databaseError;

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("Song could not be deleted. Check your permissions.");
      }

      const { error: storageError } = await supabase.storage
        .from("music-tracks")
        .remove([song.audio_path]);

      let coverStorageError = null;

      if (song.cover_art_path) {
        const { error } = await supabase.storage
          .from("song-cover-art")
          .remove([song.cover_art_path]);

        coverStorageError = error;
      }

      setSongs((currentSongs) =>
        currentSongs.filter((item) => item.id !== song.id)
      );

      if (storageError || coverStorageError) {
        setMessage(
          "Song record deleted, but a storage file could not be removed."
        );
      } else {
        setMessage("Song and its files deleted successfully.");
      }

      if (editingId === song.id) setEditingId(null);
    } catch (error: unknown) {
      setMessage(
        "Could not delete song: " +
          (error instanceof Error ? error.message : "Unknown error.")
      );
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
                    onChange={(event) => setDescription(event.target.value)}
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

                <div style={{ margin: "16px 0" }}>
                  <p><strong>Current song cover art</strong></p>

                  {song.coverArtUrl ? (
                    <img
                      src={song.coverArtUrl}
                      alt={`${song.title} cover art`}
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  ) : (
                    <p>No cover art uploaded yet.</p>
                  )}
                </div>

                <label>
                  Add or replace cover art (JPG, PNG or WebP — maximum 5 MB)
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setCoverArt(event.target.files?.[0] || null)
                    }
                    style={{
                      display: "block",
                      margin: "12px 0 20px",
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => saveSong(song)}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setCoverArt(null);
                  }}
                  disabled={loading}
                  style={{ marginLeft: "10px" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <h2>{song.title}</h2>

                {song.coverArtUrl && (
                  <img
                    src={song.coverArtUrl}
                    alt={`${song.title} cover art`}
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                )}

                <p>Genre: {song.genre || "Not specified"}</p>
                <p>{song.description}</p>

                <p>
                  Status: <strong>{song.status}</strong>
                </p>

                {song.audioUrl && (
                  <audio
                    controls
                    preload="none"
                    src={song.audioUrl}
                    style={{ width: "100%", maxWidth: "500px" }}
                  />
                )}

                <p>
                  <button
                    type="button"
                    onClick={() => startEditing(song)}
                    disabled={deletingId === song.id || publishingId === song.id}
                  >
                    Edit Song
                  </button>

                  <button
                    type="button"
                    onClick={() => changeStatus(song)}
                    disabled={deletingId === song.id || publishingId === song.id}
                    style={{ marginLeft: "10px" }}
                  >
                    {publishingId === song.id
                      ? "Updating..."
                      : song.status === "published"
                      ? "Unpublish Song"
                      : "Publish Song"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSong(song)}
                    disabled={deletingId === song.id || publishingId === song.id}
                    style={{
                      marginLeft: "10px",
                      backgroundColor: "#b91c1c",
                      color: "white",
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: "4px",
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
