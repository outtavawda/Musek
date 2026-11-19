
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
};

export default async function LabelPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // Load the public label profile
  const { data: label } = await supabase
    .from("user_profiles")
    .select(`
      id,
      display_name,
      bio,
      account_type,
      avatar_url,
      label_name,
      location,
      website_url,
      is_public
    `)
    .eq("id", params.id)
    .eq("account_type", "label")
    .eq("is_public", true)
    .maybeSingle();

  if (!label) notFound();

  const labelName = label.label_name || label.display_name;

  // Find artists signed to this label
  const { data: relationships } = await supabase
    .from("label_artists")
    .select("artist_id")
    .eq("label_id", label.id);

  const artistIds = [
    ...new Set((relationships || []).map((item) => item.artist_id)),
  ];

  let artists: ArtistProfile[] = [];
  let tracks: MusicTrack[] = [];

  // Load signed artist profiles
  if (artistIds.length > 0) {
    const { data: artistProfiles } = await supabase
      .from("user_profiles")
      .select(`
        id,
        display_name,
        artist_name,
        avatar_url,
        bio
      `)
      .in("id", artistIds)
      .eq("account_type", "artist");

    artists = (artistProfiles || []) as ArtistProfile[];

    // Load published music from signed artists
    const { data: publishedTracks } = await supabase
      .from("music_tracks")
      .select("id, artist_id, title, genre")
      .in("artist_id", artistIds)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    tracks = (publishedTracks || []) as MusicTrack[];
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
                artist.artist_name || artist.display_name || "MUSEK Artist";

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

                  {tracks.filter(
                    (track) => track.artist_id === artist.id
                  ).length === 0 ? (
                    <p className="muted">
                      No published songs yet.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {tracks
                        .filter(
                          (track) => track.artist_id === artist.id
                        )
                        .map((track) => (
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LabelPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: label } = await supabase
    .from("user_profiles")
    .select(`
      id,
      display_name,
      bio,
      account_type,
      avatar_url,
      label_name,
      location,
      website_url
    `)
    .eq("id", params.id)
    .eq("account_type", "label")
    .eq("is_public", true)
    .maybeSingle();

  if (!label) notFound();

  const labelName = label.label_name || label.display_name;

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
              marginBottom: "20px"
            }}
          />
        ) : (
          <div style={{
            width: "150px",
            height: "150px",
            borderRadius: "20px",
            background: "#252525",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
            fontSize: "48px"
          }}>
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

        <div style={{ marginTop: "30px" }}>
          <p className="eyebrow">LABEL MUSIC CATALOGUE</p>

          <p className="muted">
            Artists, albums and music releases will be added to this section in a future MUSEK update.
          </p>
        </div>

        <p className="muted small">
          <Link href="/discover">← Back to Discover</Link>
        </p>
      </section>
    </main>
  );
}
