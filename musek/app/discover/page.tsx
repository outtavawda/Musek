
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
        <h1>Discover artists and labels</h1>
        <p className="muted">
          Find new artists, explore music genres and discover record labels.
        </p>

        {error && (
          <p className="notice error">
            Unable to load profiles. Please try again.
          </p>
        )}

        {!error && (!profiles || profiles.length === 0) && (
          <p className="notice">
            No public artists or labels yet. Be one of the first to share your profile!
          </p>
        )}

        {profiles && profiles.length > 0 && (
          <div className="form">
            {profiles.map((profile) => (
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

                <p className="eyebrow">
                  {profile.account_type === "artist" ? "ARTIST" : "RECORD LABEL"}
                </p>

                <h2>
                  {profile.account_type === "artist"
                    ? profile.artist_name || profile.display_name
                    : profile.label_name || profile.display_name}
                </h2>

                <p className="muted">{profile.bio || "No bio added yet."}</p>

                {profile.genres && profile.genres.length > 0 && (
                  <p className="small">
                    Genres: {profile.genres.join(", ")}
                  </p>
                )}

                {profile.location && (
                  <p className="small">Location: {profile.location}</p>
                )}

                {profile.website_url && (
                  <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                    Visit website
                  </a>
                )}
              </article>
            ))}
          </div>
        )}

        <p className="muted small">
          <Link href="/profile">Edit your profile</Link>
        </p>
      </section>
    </main>
  );
}
