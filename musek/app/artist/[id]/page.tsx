
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "../../discover-music/music-player";
import SendGift from "./send-gift";

export default async function ArtistPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: artist } = await supabase
    .from("user_profiles")
    .select(`
      id,
      display_name,
      bio,
      account_type,
      avatar_url,
      artist_name,
      genres,
      location,
      website_url
    `)
    .eq("id", params.id)
    .eq("account_type", "artist")
    .eq("is_public", true)
    .maybeSingle();

  if (!artist) notFound();

  const artistName = artist.artist_name || artist.display_name;

  const { data: tracks, error: tracksError } = await supabase
    .from("music_tracks")
    .select("id, title, genre, audio_path, created_at")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data: audio } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      return {
        id: track.id,
        title: track.title,
        artistName,
        genre: track.genre || "",
        audioUrl: audio?.signedUrl || null,
      };
    })
  );

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
        <p className="eyebrow">MUSEK ARTIST</p>

        {artist.avatar_url && (
          <img
            src={artist.avatar_url}
            alt={`${artistName} profile`}
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "20px",
            }}
          />
        )}

        <h1>{artistName}</h1>

        {artist.location && (
          <p className="muted">{artist.location}</p>
        )}

        <h2>About the artist</h2>

        <p>
          {artist.bio || "This artist has not added a biography yet."}
        </p>

        <h2>Music genres</h2>

        <p>
          {artist.genres?.length
            ? artist.genres.join(" • ")
            : "Genres not added yet."}
        </p>

        {artist.website_url && (
          <p>
            <a
              href={artist.website_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit artist website ↗
            </a>
          </p>
        )}

        {/* SEND GIFT */}
        <SendGift artistId={artist.id} />

        <div style={{ marginTop: "30px" }}>
          <p className="eyebrow">ARTIST MUSIC</p>

          <h2>Published Songs</h2>

          {tracksError ? (
            <p className="muted">
              Unable to load this artist's music: {tracksError.message}
            </p>
          ) : songs.length > 0 ? (
            <MusicPlayer songs={songs} />
          ) : (
            <p className="muted">
              This artist has not published any songs yet.
            </p>
          )}
        </div>

        <p className="muted small" style={{ marginTop: "30px" }}>
          <Link href="/discover">← Back to Discover</Link>
        </p>
      </section>
    </main>
  );
}
