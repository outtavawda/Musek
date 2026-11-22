
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UploadForm({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter a song title.");
      return;
    }

    if (!audio) {
      setMessage("Please choose an audio file.");
      return;
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a"
    ];

    const allowedExtensions = ["mp3", "wav", "m4a"];
    const extension = audio.name.split(".").pop()?.toLowerCase() || "";

    if (
      !allowedTypes.includes(audio.type) &&
      !allowedExtensions.includes(extension)
    ) {
      setMessage("Please upload an MP3, WAV or M4A file.");
      return;
    }

    if (audio.size > 50 * 1024 * 1024) {
      setMessage("Your audio file must be 50 MB or less.");
      return;
    }

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];

    let coverExtension = "";

    if (coverArt) {
      coverExtension =
        coverArt.name.split(".").pop()?.toLowerCase() || "";

      if (
        !allowedImageTypes.includes(coverArt.type) ||
        !allowedImageExtensions.includes(coverExtension)
      ) {
        setMessage("Cover art must be a JPG, PNG or WebP image.");
        return;
      }

      if (coverArt.size > 5 * 1024 * 1024) {
        setMessage("Cover art must be 5 MB or less.");
        return;
      }
    }

    setLoading(true);

    let audioPath = "";
    let coverArtPath: string | null = null;

    const supabase = createClient();

    try {
      audioPath = `${userId}/${crypto.randomUUID()}.${extension}`;

      // Normalize browser-specific audio MIME labels to the exact types
      // allowed by the private music-tracks bucket.
      const uploadContentType =
        extension === "mp3" ? "audio/mpeg" :
        extension === "wav" ? "audio/wav" :
        extension === "m4a" ? "audio/mp4" : "";

      if (!uploadContentType) {
        throw new Error("Unsupported audio file type.");
      }

      const { error: uploadError } = await supabase.storage
        .from("music-tracks")
        .upload(audioPath, audio, {
          contentType: uploadContentType,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      if (coverArt) {
        coverArtPath = `${userId}/${crypto.randomUUID()}.${coverExtension}`;

        const { error: coverUploadError } = await supabase.storage
          .from("song-cover-art")
          .upload(coverArtPath, coverArt, {
            contentType: coverArt.type,
            upsert: false
          });

        if (coverUploadError) {
          throw coverUploadError;
        }
      }

      const { error: databaseError } = await supabase
        .from("music_tracks")
        .insert({
          artist_id: userId,
          title: title.trim(),
          description: description.trim(),
          genre: genre.trim(),
          audio_path: audioPath,
          cover_art_path: coverArtPath
        });

      if (databaseError) {
        throw databaseError;
      }

      setTitle("");
      setGenre("");
      setDescription("");
      setAudio(null);
      setCoverArt(null);
      form.reset();

      setMessage(
        "Your song and cover art were uploaded successfully and saved as a draft."
      );

    } catch (error: unknown) {
      console.error("MUSEK upload error:", error);

      if (audioPath) {
        await supabase.storage
          .from("music-tracks")
          .remove([audioPath]);
      }

      if (coverArtPath) {
        await supabase.storage
          .from("song-cover-art")
          .remove([coverArtPath]);
      }

      const errorMessage =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Unknown upload error.";

      setMessage("Upload failed: " + errorMessage);

    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <label>
        Song title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={150}
          required
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            margin: "8px 0 20px"
          }}
        />
      </label>

      <label>
        Genre
        <input
          type="text"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          maxLength={80}
          placeholder="Reggae, Dancehall, Hip-Hop..."
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            margin: "8px 0 20px"
          }}
        />
      </label>

      <label>
        Song description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={4}
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            margin: "8px 0 20px"
          }}
        />
      </label>

      <label>
        Song cover art (JPG, PNG or WebP — maximum 5 MB)
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(event) =>
            setCoverArt(event.target.files?.[0] || null)
          }
          style={{
            display: "block",
            margin: "12px 0 24px"
          }}
        />
      </label>

      <label>
        Audio file (MP3, WAV or M4A — maximum 50 MB)
        <input
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
          onChange={(event) =>
            setAudio(event.target.files?.[0] || null)
          }
          required
          style={{
            display: "block",
            margin: "12px 0 24px"
          }}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Uploading..." : "Upload Song"}
      </button>

      {message && (
        <p role="status" style={{ marginTop: "15px" }}>
          {message}
        </p>
      )}
    </form>
  );
}
