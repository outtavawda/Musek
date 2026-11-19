
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    number: "01",
    title: "Discover",
    description:
      "Find new music, artists and videos in a discovery experience built for creators.",
  },
  {
    number: "02",
    title: "Support artists",
    description:
      "Explore virtual gifts and creator rewards. Payment features will be enabled after secure backend integration.",
  },
  {
    number: "03",
    title: "Connect",
    description:
      "A place for fans, artists and labels to build a community around music.",
  },
];

export default async function HomePage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, account_type, avatar_url, artist_name, label_name, bio, genres, location"
    )
    .eq("is_public", true)
    .in("account_type", ["artist", "label"])
    .order("display_name", { ascending: true });

  const artists = (profiles || [])
    .filter((profile) => profile.account_type === "artist")
    .slice(0, 4);

  const labels = (profiles || [])
    .filter((profile) => profile.account_type === "label")
    .slice(0, 4);

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/" aria-label="MUSEK home">
          MUSEK<span>.</span>
        </Link>

        <div className="navLinks">
          <Link href="/discover">Discover</Link>
          <a href="#creators">For creators</a>
          <Link href="/login">Login</Link>
          <Link className="navButton" href="/signup">
            Sign Up
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <span className="pulse" /> MUSIC • CREATORS • COMMUNITY
        </div>

        <h1>
          Your music.
          <br />
          <span>Your people.</span>
        </h1>

        <p className="heroText">
          Discover sounds, connect with artists and be part of a music
          community built around creativity.
        </p>

        <div className="heroActions">
          <Link className="primaryButton" href="/signup">
            Join MUSEK <span>↗</span>
          </Link>
          <Link className="secondaryButton" href="/login">
            Member Login
          </Link>
        </div>

        <div className="heroNote">
          A new home for music is taking shape.
        </div>

        <div className="orb orbOne" />
        <div className="orb orbTwo" />
      </section>

      {/* FEATURED ARTISTS */}
      <section style={{ padding: "60px 7%" }}>
        <div className="sectionLabel">MEET THE CREATORS</div>
        <h2>Featured Artists</h2>
        <p>
          Discover independent artists and explore their music.
        </p>

        {artists.length === 0 ? (
          <p>No featured artists available yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginTop: "25px",
            }}
          >
            {artists.map((artist) => (
              <article
                key={artist.id}
                className="feature"
                style={{ borderRadius: "14px" }}
              >
                {artist.avatar_url && (
                  <img
                    src={artist.avatar_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      marginBottom: "15px",
                    }}
                  />
                )}

                <div className="sectionLabel">ARTIST</div>
                <h3>{artist.artist_name || artist.display_name}</h3>

                <p>{artist.bio || "Discover this artist on MUSEK."}</p>

                {artist.genres && artist.genres.length > 0 && (
                  <p className="small">
                    {artist.genres.join(", ")}
                  </p>
                )}

                <Link href={`/artist/${artist.id}`}>
                  Visit artist profile →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED RECORD LABELS */}
      <section style={{ padding: "60px 7%" }}>
        <div className="sectionLabel">THE LABEL COMMUNITY</div>
        <h2>Featured Record Labels</h2>
        <p>
          Explore record labels and meet the artists they represent.
        </p>

        {labels.length === 0 ? (
          <p>No featured record labels available yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginTop: "25px",
            }}
          >
            {labels.map((label) => (
              <article
                key={label.id}
                className="feature"
                style={{ borderRadius: "14px" }}
              >
                {label.avatar_url && (
                  <img
                    src={label.avatar_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      marginBottom: "15px",
                    }}
                  />
                )}

                <div className="sectionLabel">RECORD LABEL</div>
                <h3>{label.label_name || label.display_name}</h3>

                <p>{label.bio || "Explore this record label on MUSEK."}</p>

                {label.location && (
                  <p className="small">{label.location}</p>
                )}

                <Link href={`/label/${label.id}`}>
                  Explore record label →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="intro" id="discover">
        <div>
          <div className="sectionLabel">THE MUSEK EXPERIENCE</div>
          <h2>
            More than listening.
            <br />
            <em>A place to belong.</em>
          </h2>
        </div>
        <p>
          MUSEK is being built to bring fans, independent artists and record
          labels closer together through music, discovery and community.
        </p>
      </section>

      <section className="features" id="creators">
        {features.map((feature) => (
          <article className="feature" key={feature.number}>
            <div className="featureNumber">{feature.number}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="creatorBanner">
        <div className="sectionLabel">BUILT FOR THE MUSIC COMMUNITY</div>
        <h2>
          Artists make the culture.
          <br />
          <em>Fans move it forward.</em>
        </h2>
        <p>
          Follow MUSEK as we build tools for artists, labels and the people
          who support them.
        </p>
        <Link className="primaryButton" href="/signup">
          Create your account <span>↗</span>
        </Link>
      </section>

      <footer>
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>
        <span>© {new Date().getFullYear()} MUSEK. All rights reserved.</span>
        <span>Made for music people.</span>
      </footer>
    </main>
  );
}
