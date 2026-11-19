
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, bio, account_type, avatar_url, artist_name, genres, label_name, location, website_url"
    )
    .eq("is_public", true)
    .in("account_type", ["artist", "label"])
    .order("display_name", { ascending: true });

  const artists =
    profiles?.filter((profile) => profile.account_type === "artist") || [];

  const labels =
    profiles?.filter((profile) => profile.account_type === "label") || [];

  return (
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>
        <Link className="secondaryButton" href="/dashboard">
          Dashboard
        </Link>
      </nav>

      <section className="authCard profileCard">
        <p className="eyebrow">EXPLORE MUSEK</p>
        <h1>Discover MUSEK</h1>
        <p className="muted">
          Discover new music, connect with artists and explore record labels.
        </p>

        {error && (
          <p className="notice error">
            Unable to load profiles. Please try again.
          </p>
        )}

        {!error && (
          <>
            {/* RECORD LABELS */}
            <section style={{ marginTop: "30px" }}>
              <p className="eyebrow">DISCOVER RECORD LABELS</p>
              <h2>Record Labels</h2>
              <p className="muted">
                Explore record labels and discover the artists they represent.
              </p>

              {labels.length === 0 ? (
                <p className="notice">
                  No public record labels yet.
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
                        marginBottom: "12px"
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
                            marginBottom: "12px"
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
                        <p className="small">
                          Location: {profile.location}
                        </p>
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
                  No public artists yet. Be one of the first to share your music!
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
                        marginBottom: "12px"
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
                            marginBottom: "12px"
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
                        <p className="small">
                          Location: {profile.location}
                        </p>
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
        )}

        <p className="muted small" style={{ marginTop: "30px" }}>
          <Link href="/profile">Edit your profile</Link>
        </p>
      </section>
    </main>
  );
}
