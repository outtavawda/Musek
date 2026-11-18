
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "../discover-music/music-player";

export default async function FavoritesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorite_tracks")
    .select("track_id")
    .eq("user_id", user.id);

  if (favoritesError) {
    return (
      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "20px" }}>
        <h1>My Favourites</h1>
        <p>Could not load your favourite songs.</p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  const trackIds = favorites?.map((item) => item.track_id) || [];

  if (trackIds.length === 0) {
    return (
      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "20px" }}>
        <h1>❤️ My Favourites</h1>
        <p>You haven't saved any favourite songs yet.</p>
        <Link href="/discover-music">Discover Music →</Link>
        <br />
        <br />
        <Link href="/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  const { data: tracks, error: tracksError } = await supabase
    .from("music_tracks")
    .select("id, title, genre, artist_id, audio_path")
    .in("id", trackIds)
    .eq("status", "published");

  if (tracksError) {
    return (
      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "20px" }}>
        <h1>My Favourites</h1>
        <p>Could not load your favourite music.</p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "20px" }}>
        <h1>❤️ My Favourites</h1>
        <p>Your saved songs are currently unavailable or unpublished.</p>
        <Link href="/discover-music">Discover Music →</Link>
      </main>
    );
  }

  const artistIds = [...new Set(tracks.map((track) => track.artist_id))];

  const { data: artists } = await supabase
    .from("user_profiles")
    .select("id, artist_name, display_name")
    .in("id", artistIds);

  const artistMap = new Map(
    (artists || []).map((artist) => [
      artist.id,
      artist.artist_name || artist.display_name || "MUSEK Artist",
    ])
  );

  const songs = await Promise.all(
    tracks.map(async (track) => {
      const { data: signedUrl } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      return {
        id: track.id,
        title: track.title,
        artistName: artistMap.get(track.artist_id) || "MUSEK Artist",
        genre: track.genre || "",
        audioUrl: signedUrl?.signedUrl || null,
      };
    })
  );

  return (
    <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "20px" }}>
      <h1>❤️ My Favourites</h1>

      <p>Your saved MUSEK songs, all in one place.</p>

      <p style={{ marginBottom: "25px" }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
        {" | "}
        <Link href="/discover-music">Discover More Music</Link>
      </p>

      <MusicPlayer songs={songs} />
    </main>
  );
}
