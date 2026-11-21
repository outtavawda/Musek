
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

  const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#0b0b16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500";
  const actionClass = "rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-gray-200 transition hover:border-purple-500 hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4">
      {songs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-purple-500/30 bg-purple-500/[0.04] px-6 py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/15 text-3xl text-purple-300">♫</div>
          <h3 className="mt-5 text-xl font-black">Your library starts here</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">You have not uploaded any songs yet. Add your first release and start building your catalogue.</p>
          <a href="/upload" className="mt-6 inline-flex rounded-full bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500">＋ Upload your first song</a>
        </div>
      ) : (
        songs.map((song) => (
          <section key={song.id} className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#151523] to-[#0e0e18] p-4 shadow-xl shadow-black/10 sm:p-6">
            {editingId === song.id ? (
              <div>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">Track settings</p>
                    <h2 className="mt-1 text-xl font-black">Edit Song</h2>
                  </div>
                  <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">Editing</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-gray-300">Song title
                    <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} className={fieldClass} />
                  </label>
                  <label className="text-xs font-semibold text-gray-300">Genre
                    <input value={genre} onChange={(event) => setGenre(event.target.value)} maxLength={80} className={fieldClass} />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-semibold text-gray-300">Description
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} className={fieldClass} />
                </label>
                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  {song.coverArtUrl ? <img src={song.coverArtUrl} alt={`${song.title} cover art`} className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-purple-500/10 text-2xl text-purple-300">♫</div>}
                  <label className="min-w-0 flex-1 text-xs font-semibold text-gray-300">Replace cover art <span className="mt-1 block font-normal text-gray-500">JPG, PNG or WebP · Maximum 5 MB</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setCoverArt(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-gray-400 file:mr-3 file:rounded-full file:border-0 file:bg-purple-500/15 file:px-4 file:py-2 file:text-xs file:font-bold file:text-purple-200" />
                  </label>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" disabled={loading} onClick={() => saveSong(song)} className="rounded-full bg-purple-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-purple-500 disabled:opacity-50">{loading ? "Saving..." : "Save Changes"}</button>
                  <button type="button" onClick={() => { setEditingId(null); setCoverArt(null); }} disabled={loading} className={actionClass}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row">
                {song.coverArtUrl ? <img src={song.coverArtUrl} alt={`${song.title} cover art`} className="h-28 w-28 shrink-0 rounded-xl border border-white/10 object-cover sm:h-32 sm:w-32" /> : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-4xl text-purple-300 sm:h-32 sm:w-32">♫</div>}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${song.status === "published" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>{song.status}</span>
                    {song.genre && <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold text-gray-400">{song.genre}</span>}
                  </div>
                  <h3 className="mt-3 text-xl font-black tracking-tight">{song.title}</h3>
                  {song.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{song.description}</p>}
                  <p className="mt-2 text-[11px] text-gray-600">Added {new Date(song.created_at).toLocaleDateString()}</p>
                  {song.audioUrl ? <audio controls preload="none" src={song.audioUrl} className="mt-4 h-10 w-full max-w-xl" /> : <p className="mt-4 text-xs text-amber-300">Audio preview is temporarily unavailable.</p>}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEditing(song)} disabled={deletingId === song.id || publishingId === song.id} className={actionClass}>Edit details</button>
                    <button type="button" onClick={() => changeStatus(song)} disabled={deletingId === song.id || publishingId === song.id} className={actionClass}>{publishingId === song.id ? "Updating..." : song.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button type="button" onClick={() => deleteSong(song)} disabled={deletingId === song.id || publishingId === song.id} className="rounded-full border border-red-500/20 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40">{deletingId === song.id ? "Deleting..." : "Delete song"}</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        ))
      )}
      {message && <p role="status" className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-200">{message}</p>}
    </div>
  );
}
