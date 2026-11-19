
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  account_type: string;
  avatar_url: string | null;
  artist_name: string | null;
  genres: string[] | null;
  label_name: string | null;
  location: string | null;
  website_url: string | null;
};

export default function DiscoverSearch({
  profiles,
}: {
  profiles: Profile[];
}) {
  const [search, setSearch] = useState("");

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return profiles;

    return profiles.filter((profile) => {
      const searchableText = [
        profile.display_name,
        profile.artist_name,
        profile.label_name,
        profile.bio,
        profile.location,
        ...(profile.genres || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [profiles, search]);

  const labels = filteredProfiles.filter(
    (profile) => profile.account_type === "label"
  );

  const artists = filteredProfiles.filter(
    (profile) => profile.account_type === "artist"
  );

  return (
    <>
      <section style={{ marginTop: "28px" }}>
        <p className="eyebrow">SEARCH MUSEK</p>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search artists, labels or genres..."
          aria-label="Search artists, labels or genres"
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "inherit",
            fontSize: "16px",
            marginBottom: "12px",
          }}
        />

        {search.trim() && (
          <p className="small muted">
            Found {filteredProfiles.length} matching{" "}
            {filteredProfiles.length === 1 ? "profile" : "profiles"}.
          </p>
        )}
      </section>

      {/* RECORD LABELS */}
      <section style={{ marginTop: "30px" }}>
        <p className="eyebrow">DISCOVER RECORD LABELS</p>
        <h2>Record Labels</h2>
        <p className="muted">
          Explore record labels and discover the artists they represent.
        </p>

        {labels.length === 0 ? (
          <p className="notice">
            {search.trim()
              ? "No record labels match your search."
              : "No public record labels yet."}
          </p>
        ) : (
          <div className="form">
            {labels.map((profile) => (
              <article
                key={profile.id}
                style={{
                  padding: "18px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  marginBottom: "12px",
                }}
              >
                {profile.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    style={{
                      width: "90px",
                      height: "90px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      marginBottom: "12px",
                    }}
                  />
                )}

                <p className="eyebrow">RECORD LABEL</p>

                <h2>
                  <Link href={`/label/${profile.id}`}>
                    {profile.label_name || profile.display_name}
                  </Link>
                </h2>

                <p className="muted">
                  {profile.bio || "No description added yet."}
                </p>

                {profile.location && (
                  <p className="small">Location: {profile.location}</p>
                )}

                <Link href={`/label/${profile.id}`}>
                  Explore label and signed artists →
                </Link>

                {profile.website_url && (
                  <p>
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit website
                    </a>
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ARTISTS */}
      <section style={{ marginTop: "40px" }}>
        <p className="eyebrow">DISCOVER MUSIC CREATORS</p>
        <h2>Artists</h2>
        <p className="muted">
          Find artists, explore their genres and listen to their music.
        </p>

        {artists.length === 0 ? (
          <p className="notice">
            {search.trim()
              ? "No artists match your search."
              : "No public artists yet."}
          </p>
        ) : (
          <div className="form">
            {artists.map((profile) => (
              <article
                key={profile.id}
                style={{
                  padding: "18px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  marginBottom: "12px",
                }}
              >
                {profile.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    style={{
                      width: "76px",
                      height: "76px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginBottom: "12px",
                    }}
                  />
                )}

                <p className="eyebrow">ARTIST</p>

                <h2>
                  <Link href={`/artist/${profile.id}`}>
                    {profile.artist_name || profile.display_name}
                  </Link>
                </h2>

                <p className="muted">
                  {profile.bio || "No bio added yet."}
                </p>

                {profile.genres && profile.genres.length > 0 && (
                  <p className="small">
                    Genres: {profile.genres.join(", ")}
                  </p>
                )}

                {profile.location && (
                  <p className="small">Location: {profile.location}</p>
                )}

                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit website
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
