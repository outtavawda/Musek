
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverMusicPage() {
  const supabase = createClient();

  const { data: tracks, error } = await supabase
    .from("music_tracks")
    .select("id, artist_id, title, description, genre, audio_path, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Discover Music</h1>
        <p>Unable to load music: {error.message}</p>
      </main>
    );
  }

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("artist_name, display_name")
        .eq("id", track.artist_id)
        .single();

      const { data: audio } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      return {
        ...track,
        artistName:
          profile?.artist_name || profile?.display_name || "MUSEK Artist",
        audioUrl: audio?.signedUrl || null,
      };
    })
  );

  const genres = Array.from(
    new Set(songs.map((song) => song.genre).filter(Boolean))
  );

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <h1>Discover Music</h1>

      <p>Discover new sounds and artists on MUSEK.</p>

      <h2>Explore Genres</h2>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {genres.length > 0 ? (
          genres.map((genre) => (
            <span
              key={genre}
              style={{
                padding: "8px 14px",
                border: "1px solid #999",
                borderRadius: "20px",
              }}
            >
              {genre}
            </span>
          ))
        ) : (
          <p>Genres will appear when artists publish music.</p>
        )}
      </div>

      <h2 style={{ marginTop: "35px" }}>Latest Music</h2>

      {songs.length === 0 ? (
        <p>No published songs yet. Check back soon!</p>
      ) : (
        songs.map((song) => (
          <section
            key={song.id}
            style={{
              padding: "20px 0",
              borderBottom: "1px solid #ccc",
            }}
          >
            <h3>{song.title}</h3>

            <p>
              By{" "}
              <Link href={`/artist/${song.artist_id}`}>
                {song.artistName}
              </Link>
            </p>

            <p>Genre: {song.genre || "Not specified"}</p>

            <p>{song.description}</p>

            {song.audioUrl ? (
              <audio
                controls
                preload="none"
                src={song.audioUrl}
                style={{ width: "100%", maxWidth: "500px" }}
              />
            ) : (
              <p>Audio is currently unavailable.</p>
            )}
          </section>
        ))
      )}

      <p style={{ marginTop: "30px" }}>
        <Link href="/discover">Explore Artists and Labels</Link>
      </p>

      <p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </p>
    </main>
  );
}
