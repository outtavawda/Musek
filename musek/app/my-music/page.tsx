
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicLibrary from "./music-library";

export default async function MyMusicPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type, artist_name, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "artist") {
    redirect("/dashboard");
  }

  const { data: tracks, error } = await supabase
    .from("music_tracks")
    .select(
      "id, title, description, genre, audio_path, status, created_at"
    )
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <main><p>Unable to load music: {error.message}</p></main>;
  }

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      return {
        ...track,
        audioUrl: data?.signedUrl || null,
      };
    })
  );

  return (
    <main style={{ maxWidth: "850px", margin: "40px auto", padding: "20px" }}>
      <h1>My Music</h1>

      <p>
        Welcome, {profile.artist_name || profile.display_name}.
        Manage and listen to your uploaded music.
      </p>

      <p>
        <Link href="/upload">+ Upload New Music</Link>
      </p>

      <hr />

      <MusicLibrary initialSongs={songs} userId={user.id} />

      <p style={{ marginTop: "30px" }}>
        <Link href="/dashboard">Back to Dashboard</Link>
      </p>
    </main>
  );
}
