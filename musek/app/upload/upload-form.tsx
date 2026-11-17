
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UploadForm({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
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

    setLoading(true);

    const supabase = createClient();
    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("music-tracks")
        .upload(filePath, audio, {
          contentType: audio.type || "application/octet-stream",
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: databaseError } = await supabase
        .from("music_tracks")
        .insert({
          artist_id: userId,
          title: title.trim(),
          description: description.trim(),
          genre: genre.trim(),
          audio_path: filePath
        });

      if (databaseError) {
        await supabase.storage
          .from("music-tracks")
          .remove([filePath]);

        throw databaseError;
      }

      setTitle("");
      setGenre("");
      setDescription("");
      setAudio(null);
      form.reset();

      setMessage(
        "Your song was uploaded successfully and saved as a draft."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong during upload."
      );
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

      {message && <p role="status">{message}</p>}
    </form>
  );
}
