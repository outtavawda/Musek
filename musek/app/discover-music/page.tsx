
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MusicSearch from "./music-search";

export default async function DiscoverMusicPage() {
  const supabase = createClient();

  const { data: tracks, error } = await supabase
    .from("music_tracks")
    .select(
      "id, artist_id, title, description, genre, audio_path, cover_art_path, created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>MUSEK Discover Music</h1>
        <p>Unable to load music: {error.message}</p>
      </main>
    );
  }

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("artist_name, display_name, avatar_url")
        .eq("id", track.artist_id)
        .single();

      const { data: audio } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      let artworkUrl = profile?.avatar_url || null;

      if (track.cover_art_path) {
        const { data: cover } = await supabase.storage
          .from("song-cover-art")
          .createSignedUrl(track.cover_art_path, 3600);

        artworkUrl = cover?.signedUrl || artworkUrl;
      }

      return {
        id: track.id,
        title: track.title,
        artistName:
          profile?.artist_name ||
          profile?.display_name ||
          "MUSEK Artist",
        genre: track.genre || "",
        audioUrl: audio?.signedUrl || null,
        artworkUrl,
      };
    })
  );

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <h1>MUSEK Discover Music</h1>

      <p>Discover new sounds and artists on MUSEK.</p>

      <MusicSearch songs={songs} />

      <p style={{ marginTop: "30px" }}>
        <Link href="/discover">
          Explore Artists and Labels
        </Link>
      </p>

      <p>
        <Link href="/favorites">
          ❤️ My Favourites
        </Link>
      </p>

      <p>
        <Link href="/dashboard">
          Back to Dashboard
        </Link>
      </p>
    </main>
  );
}
