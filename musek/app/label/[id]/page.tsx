
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "../../discover-music/music-player";

type ArtistProfile = {
  id: string;
  display_name: string | null;
  artist_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type MusicTrack = {
  id: string;
  artist_id: string;
  title: string;
  genre: string | null;
  audio_path: string;
  cover_art_path: string | null;
};

type PlayerSong = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl: string | null;
};

export default async function LabelPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: label, error: labelError } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, bio, account_type, avatar_url, label_name, location, website_url, is_public"
    )
    .eq("id", params.id)
    .eq("account_type", "label")
    .eq("is_public", true)
    .maybeSingle();

  if (labelError || !label) {
    notFound();
  }

  const labelName = label.label_name || label.display_name;

  const { data: relationships } = await supabase
    .from("label_artists")
    .select("artist_id")
    .eq("label_id", label.id);

  const artistIds: string[] = [];

  (relationships || []).forEach((item) => {
    if (!artistIds.includes(item.artist_id)) {
      artistIds.push(item.artist_id);
    }
  });

  let artists: ArtistProfile[] = [];
  let tracks: MusicTrack[] = [];
  let playerSongs: PlayerSong[] = [];

  if (artistIds.length > 0) {
    const { data: artistProfiles } = await supabase
      .from("user_profiles")
      .select("id, display_name, artist_name, avatar_url, bio")
      .in("id", artistIds)
      .eq("account_type", "artist");

    artists = (artistProfiles || []) as ArtistProfile[];

    const { data: publishedTracks } = await supabase
      .from("music_tracks")
      .select(
        "id, artist_id, title, genre, audio_path, cover_art_path"
      )
      .in("artist_id", artistIds)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    tracks = (publishedTracks || []) as MusicTrack[];

    playerSongs = await Promise.all(
      tracks.map(async (track) => {
        const { data: audio } = await supabase.storage
          .from("music-tracks")
          .createSignedUrl(track.audio_path, 3600);

        const artist = artists.find(
          (item) => item.id === track.artist_id
        );

        let artworkUrl = artist?.avatar_url || null;

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
          artistName:
            artist?.artist_name ||
            artist?.display_name ||
            "MUSEK Artist",
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
        <p className="eyebrow">MUSEK RECORD LABEL</p>

        {label.avatar_url ? (
          <img
            src={label.avatar_url}
            alt={`${labelName} profile`}
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "20px",
              objectFit: "cover",
              marginBottom: "20px",
            }}
          />
        ) : (
          <div
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "20px",
              background: "#252525",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              fontSize: "48px",
            }}
          >
            🎵
          </div>
        )}

        <h1>{labelName}</h1>

        {label.location && (
          <p className="muted">{label.location}</p>
        )}

        <h2>About the label</h2>

        <p>
          {label.bio || "This record label has not added a biography yet."}
        </p>

        {label.website_url && (
          <p>
            <a
              href={label.website_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit label website ↗
            </a>
          </p>
        )}

        <hr style={{ margin: "30px 0" }} />

        <p className="eyebrow">SIGNED ARTISTS</p>
        <h2>Artists on this label</h2>

        {artists.length === 0 ? (
          <p className="muted">
            This label has not added any artists yet.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {artists.map((artist) => {
              const artistName =
                artist.artist_name ||
                artist.display_name ||
                "MUSEK Artist";

              const artistTracks = tracks.filter(
                (track) => track.artist_id === artist.id
              );

              const artistPlayerSongs = playerSongs.filter(
                (song) =>
                  artistTracks.some((track) => track.id === song.id)
              );

              return (
                <div
                  key={artist.id}
                  style={{
                    padding: "18px",
                    border: "1px solid #333",
                    borderRadius: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                    }}
                  >
                    {artist.avatar_url ? (
                      <img
                        src={artist.avatar_url}
                        alt={`${artistName} profile`}
                        style={{
                          width: "65px",
                          height: "65px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "35px" }}>🎤</div>
                    )}

                    <div>
                      <h3 style={{ margin: 0 }}>{artistName}</h3>
                      <p className="muted">Signed artist</p>
                      <Link href={`/artist/${artist.id}`}>
                        View artist profile →
                      </Link>
                    </div>
                  </div>

                  {artist.bio && (
                    <p className="muted">{artist.bio}</p>
                  )}

                  <h4>Published Music</h4>

                  {artistTracks.length === 0 ? (
                    <p className="muted">
                      No published songs yet.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: "grid", gap: "10px" }}>
                        {artistTracks.map((track) => (
                          <div
                            key={track.id}
                            style={{
                              padding: "12px",
                              background: "#1b1b1b",
                              borderRadius: "10px",
                            }}
                          >
                            <strong>🎵 {track.title}</strong>

                            {track.genre && (
                              <p className="muted">{track.genre}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: "18px" }}>
                        <p className="eyebrow">LISTEN TO {artistName}</p>
                        <MusicPlayer songs={artistPlayerSongs} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <hr style={{ margin: "30px 0" }} />

        <p className="eyebrow">LABEL MUSIC CATALOGUE</p>

        <p className="muted">
          Discover music released by the artists signed to {labelName}.
        </p>

        <p style={{ marginTop: "25px" }}>
          <Link href="/discover-music">
            Explore all published MUSEK music →
          </Link>
        </p>

        <p className="muted small">
          <Link href="/discover">← Back to Discover</Link>
        </p>
      </section>
    </main>
  );
}
