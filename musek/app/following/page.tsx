
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "../discover-music/music-player";

export default async function FollowingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "fan") {
    return (
      <main className="pageWrap">
        <section className="authCard">
          <h1>Following</h1>
          <p>This music feed is available to Fan accounts.</p>
          <Link href="/dashboard">Back to Dashboard</Link>
        </section>
      </main>
    );
  }

  const { data: follows, error: followsError } = await supabase
    .from("artist_follows")
    .select("artist_id")
    .eq("fan_id", user.id);

  if (followsError) {
    return (
      <main className="pageWrap">
        <section className="authCard">
          <h1>Following</h1>
          <p>Unable to load your followed artists.</p>
          <p className="muted">{followsError.message}</p>
        </section>
      </main>
    );
  }

  const artistIds = (follows || []).map((follow) => follow.artist_id);

  let songs: {
    id: string;
    title: string;
    artistName: string;
    genre: string;
    audioUrl: string | null;
    artworkUrl: string | null;
  }[] = [];

  if (artistIds.length > 0) {
    const { data: tracks } = await supabase
      .from("music_tracks")
      .select("id, title, genre, artist_id, audio_path, cover_art_path, created_at")
      .in("artist_id", artistIds)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    const { data: artists } = await supabase
      .from("user_profiles")
      .select("id, artist_name, display_name, avatar_url")
      .in("id", artistIds)
      .eq("account_type", "artist");

    const artistMap = new Map(
      (artists || []).map((artist) => [
        artist.id,
        {
          name: artist.artist_name || artist.display_name || "MUSEK Artist",
          avatar: artist.avatar_url,
        },
      ])
    );

    songs = await Promise.all(
      (tracks || []).map(async (track) => {
        const { data: audio } = await supabase.storage
          .from("music-tracks")
          .createSignedUrl(track.audio_path, 3600);

        const artist = artistMap.get(track.artist_id);

        let artworkUrl = artist?.avatar || null;

        if (track.cover_art_path) {
          const { data: cover } = await supabase.storage
            .from("song-cover-art")
            .createSignedUrl(track.cover_art_path, 3600);

          if (cover?.signedUrl) {
            artworkUrl = cover.signedUrl;
          }
        }

        return {
          id: track.id,
          title: track.title,
          artistName: artist?.name || "MUSEK Artist",
          genre: track.genre || "",
          audioUrl: audio?.signedUrl || null,
          artworkUrl,
        };
      })
    );
  }

  return (
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <Link className="secondaryButton" href="/discover">
          Discover
        </Link>
      </nav>

      <section className="authCard profileCard">
        <p className="eyebrow">YOUR MUSIC COMMUNITY</p>

        <h1>Following</h1>

        <p className="muted">
          Music from the artists you follow.
        </p>

        <p>
          Following <strong>{artistIds.length}</strong>{" "}
          {artistIds.length === 1 ? "artist" : "artists"}
        </p>

        {songs.length > 0 ? (
          <>
            <h2>Latest Music</h2>
            <MusicPlayer songs={songs} />
          </>
        ) : (
          <div style={{ marginTop: "30px" }}>
            <h2>Your feed is waiting</h2>
            <p className="muted">
              Follow artists to see their published music here.
            </p>
            <Link className="primaryButton" href="/discover">
              Discover Artists
            </Link>
          </div>
        )}

        <p className="muted small" style={{ marginTop: "30px" }}>
          <Link href="/dashboard">← Back to Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
