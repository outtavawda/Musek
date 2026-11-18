
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";

type Track = {
  id: string;
  title: string;
  genre: string | null;
  play_count: number | null;
  status: string;
};

type PlayEvent = {
  played_at: string;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, account_type, bio, is_public")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email;

  const accountType =
    profile?.account_type ||
    user.user_metadata?.account_type ||
    "fan";

  const accountLabel =
    accountType === "artist"
      ? "Artist"
      : accountType === "label"
      ? "Record Label"
      : "Fan";

  let tracks: Track[] = [];
  let playEvents: PlayEvent[] = [];
  let analyticsError = "";

  if (accountType === "artist") {
    const { data, error } = await supabase
      .from("music_tracks")
      .select("id, title, genre, play_count, status")
      .eq("artist_id", user.id)
      .eq("status", "published");

    if (error) {
      analyticsError = error.message;
    } else {
      tracks = (data || []) as Track[];
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: events, error: eventsError } = await supabase
      .from("track_play_events")
      .select("played_at")
      .eq("artist_id", user.id)
      .gte("played_at", sixMonthsAgo.toISOString())
      .order("played_at", { ascending: true });

    if (eventsError) {
      analyticsError = analyticsError || eventsError.message;
    } else {
      playEvents = (events || []) as PlayEvent[];
    }
  }

  const totalPlays = tracks.reduce(
    (total, track) => total + (track.play_count || 0),
    0
  );

  const publishedSongs = tracks.length;

  const rankedTracks = [...tracks].sort(
    (a, b) => (b.play_count || 0) - (a.play_count || 0)
  );

  const mostPlayedSong = rankedTracks[0];

  const monthlyStats = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));

    const month = date.getMonth();
    const year = date.getFullYear();

    const plays = playEvents.filter((event) => {
      const playedDate = new Date(event.played_at);

      return (
        playedDate.getMonth() === month &&
        playedDate.getFullYear() === year
      );
    }).length;

    return {
      label: date.toLocaleDateString("en-CA", {
        month: "short",
        year: "2-digit",
      }),
      plays,
    };
  });

  const highestMonthlyPlays = Math.max(
    ...monthlyStats.map((month) => month.plays),
    1
  );

  const totalMonthlyPlays = monthlyStats.reduce(
    (total, month) => total + month.plays,
    0
  );

  return (
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <form action={signOut}>
          <button className="secondaryButton" type="submit">
            Log out
          </button>
        </form>
      </nav>

      <section className="contentPanel">
        <p className="eyebrow">YOUR MUSEK ACCOUNT</p>

        <h1>Welcome, {displayName}</h1>

        <p className="muted">
          Account type: <strong>{accountLabel}</strong>
        </p>

        <p>
          Welcome to MUSEK. Your music community starts here.
        </p>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "24px"
        }}>
          <Link className="primaryButton" href="/discover-music">
            🎵 Discover Music
          </Link>

          <Link className="secondaryButton" href="/favorites">
            ❤️ My Favourites
          </Link>

          <Link className="secondaryButton" href="/discover">
            Discover Artists
          </Link>

          <Link className="secondaryButton" href="/profile">
            Edit My Profile
          </Link>
        </div>

        {accountType === "artist" && (
          <div style={{ marginTop: "36px" }}>
            <p className="eyebrow">ARTIST ANALYTICS</p>

            <h2>Your Music Performance</h2>

            {analyticsError ? (
              <p className="muted">
                Unable to load some analytics: {analyticsError}
              </p>
            ) : (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "14px",
                  marginTop: "20px"
                }}>
                  <div style={{
                    padding: "20px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px"
                  }}>
                    <p className="eyebrow">TOTAL PLAYS</p>
                    <h2 style={{ fontSize: "30px" }}>
                      {totalPlays.toLocaleString()}
                    </h2>
                  </div>

                  <div style={{
                    padding: "20px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px"
                  }}>
                    <p className="eyebrow">PUBLISHED SONGS</p>
                    <h2 style={{ fontSize: "30px" }}>
                      {publishedSongs}
                    </h2>
                  </div>

                  <div style={{
                    padding: "20px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px"
                  }}>
                    <p className="eyebrow">TOP SONG PLAYS</p>
                    <h2 style={{ fontSize: "30px" }}>
                      {(mostPlayedSong?.play_count || 0).toLocaleString()}
                    </h2>
                  </div>
                </div>

                <div style={{
                  marginTop: "24px",
                  padding: "20px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px"
                }}>
                  <p className="eyebrow">MOST PLAYED SONG</p>

                  <h3>
                    {mostPlayedSong?.title || "No published songs yet"}
                  </h3>

                  {mostPlayedSong && (
                    <p className="muted">
                      {mostPlayedSong.play_count || 0} plays
                    </p>
                  )}
                </div>

                <div style={{ marginTop: "32px" }}>
                  <p className="eyebrow">LISTENING HISTORY</p>
                  <h2>Monthly Listening Report</h2>

                  <p className="muted">
                    Song plays recorded over the last six months.
                  </p>

                  <div style={{
                    padding: "20px",
                    marginTop: "18px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px"
                  }}>
                    <p className="eyebrow">RECORDED PLAYS · SIX MONTHS</p>

                    <h2 style={{ fontSize: "30px" }}>
                      {totalMonthlyPlays.toLocaleString()}
                    </h2>

                    <div style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: "12px",
                      height: "190px",
                      marginTop: "24px"
                    }}>
                      {monthlyStats.map((month) => (
                        <div
                          key={month.label}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            height: "100%",
                            gap: "8px"
                          }}
                        >
                          <strong style={{ fontSize: "12px" }}>
                            {month.plays}
                          </strong>

                          <div style={{
                            width: "100%",
                            maxWidth: "48px",
                            height: `${Math.max(
                              (month.plays / highestMonthlyPlays) * 130,
                              5
                            )}px`,
                            background: "#ffffff",
                            borderRadius: "6px 6px 0 0"
                          }} />

                          <span style={{
                            fontSize: "11px",
                            color: "#aaaaaa"
                          }}>
                            {month.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="muted" style={{ marginTop: "12px" }}>
                    Monthly tracking starts from the date this feature was
                    installed. Older plays are not included in this report.
                  </p>
                </div>

                <div style={{ marginTop: "28px" }}>
                  <p className="eyebrow">POPULARITY RANKING</p>
                  <h2>Your Published Songs</h2>

                  {rankedTracks.length === 0 ? (
                    <p className="muted">
                      You have not published any songs yet.
                    </p>
                  ) : (
                    <div style={{ marginTop: "16px" }}>
                      {rankedTracks.map((track, index) => (
                        <div
                          key={track.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            padding: "14px",
                            marginBottom: "10px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px"
                          }}
                        >
                          <div>
                            <strong>
                              {index + 1}. {track.title}
                            </strong>

                            <p className="muted" style={{ margin: "5px 0 0" }}>
                              {track.genre || "Music"}
                            </p>
                          </div>

                          <strong>
                            {(track.play_count || 0).toLocaleString()} plays
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{
          marginTop: "32px",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.12)"
        }}>
          <p className="eyebrow">PROFILE STATUS</p>

          <h2>
            {profile?.is_public
              ? "Your profile is public"
              : "Your profile is private"}
          </h2>

          <p className="muted">
            {profile?.is_public
              ? "Other MUSEK users can discover your public profile."
              : "Your profile is hidden from public discovery. You can change this in Edit My Profile."}
          </p>
        </div>

        <div style={{ marginTop: "32px" }}>
          <p className="eyebrow">EXPLORE MUSEK</p>
          <h2>Your music community</h2>

          <p className="muted">
            Discover artists, listen to published songs and explore record labels.
          </p>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <Link href="/discover-music">
              Listen to Music →
            </Link>

            <Link href="/favorites">
              View My Favourites →
            </Link>

            <Link href="/discover">
              Explore Artists →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
