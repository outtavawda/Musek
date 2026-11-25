
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArtistManagement from "./artist-management";

type Release = {
  id: string;
  artist_id: string;
  title: string;
  genre: string | null;
  created_at: string;
  play_count: number | null;
};

type ArtistProfile = {
  id: string;
  artist_name: string | null;
  display_name: string | null;
};

type PlayEvent = {
  artist_id: string;
  played_at: string;
};

type GiftTransaction = {
  id: string;
  creator_id: string;
  coins: number | string;
  creator_share_cad: number | string;
  musek_share_cad: number | string;
  status: string;
  created_at: string;
};

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default async function LabelDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "display_name, label_name, bio, location, website_url, avatar_url, account_type"
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.account_type !== "label") {
    redirect("/dashboard");
  }

  const labelName =
    profile.label_name || profile.display_name || "My Label";

  const { data: roster, error: rosterError } = await supabase
    .from("label_artists")
    .select("artist_id")
    .eq("label_id", user.id);

  const artistIds = (roster ?? []).map((artist) => artist.artist_id);

  let releases: Release[] = [];
  let artistProfiles: ArtistProfile[] = [];
  let playEvents: PlayEvent[] = [];
  let giftTransactions: GiftTransaction[] = [];
  let analyticsError = "";
  let earningsError = "";

  if (rosterError) {
    analyticsError = rosterError.message;
    earningsError = rosterError.message;
  }

  if (artistIds.length > 0) {
    const { data: releaseData, error: releaseError } = await supabase
      .from("music_tracks")
      .select("id, artist_id, title, genre, created_at, play_count")
      .in("artist_id", artistIds)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (releaseError) {
      analyticsError = analyticsError || releaseError.message;
    } else {
      releases = (releaseData ?? []) as Release[];
    }

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, artist_name, display_name")
      .in("id", artistIds);

    if (profileError) {
      analyticsError = analyticsError || profileError.message;
    } else {
      artistProfiles = (profileData ?? []) as ArtistProfile[];
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: events, error: eventsError } = await supabase
      .from("track_play_events")
      .select("artist_id, played_at")
      .in("artist_id", artistIds)
      .gte("played_at", sixMonthsAgo.toISOString())
      .order("played_at", { ascending: true });

    if (eventsError) {
      analyticsError = analyticsError || eventsError.message;
    } else {
      playEvents = (events ?? []) as PlayEvent[];
    }

    // Load settled gift transactions for signed artists.
    const { data: giftData, error: giftError } = await supabase
      .from("gift_transactions")
      .select(
        "id, creator_id, coins, creator_share_cad, musek_share_cad, status, created_at"
      )
      .in("creator_id", artistIds)
      .eq("status", "settled")
      .order("created_at", { ascending: false });

    if (giftError) {
      earningsError = giftError.message;
    } else {
      giftTransactions = (giftData ?? []) as GiftTransaction[];
    }
  }

  function getArtistName(artistId: string) {
    const artist = artistProfiles.find(
      (item) => item.id === artistId
    );

    return (
      artist?.artist_name ||
      artist?.display_name ||
      "Artist"
    );
  }

  const totalPlays = releases.reduce(
    (total, release) => total + (release.play_count || 0),
    0
  );

  const rankedReleases = [...releases].sort(
    (a, b) => (b.play_count || 0) - (a.play_count || 0)
  );

  const artistStats = artistIds.map((artistId) => {
    const artistReleases = releases.filter(
      (release) => release.artist_id === artistId
    );

    return {
      id: artistId,
      name: getArtistName(artistId),
      songs: artistReleases.length,
      plays: artistReleases.reduce(
        (total, release) => total + (release.play_count || 0),
        0
      ),
    };
  }).sort((a, b) => b.plays - a.plays);

  const monthlyStats = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));

    const plays = playEvents.filter((event) => {
      const playedDate = new Date(event.played_at);

      return (
        playedDate.getMonth() === date.getMonth() &&
        playedDate.getFullYear() === date.getFullYear()
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

  // Calculate settled gift earnings.
  const totalGiftValue = giftTransactions.reduce(
    (total, gift) =>
      total +
      Number(gift.creator_share_cad) +
      Number(gift.musek_share_cad),
    0
  );

  const totalArtistEarnings = giftTransactions.reduce(
    (total, gift) => total + Number(gift.creator_share_cad),
    0
  );

  const totalMusekShare = giftTransactions.reduce(
    (total, gift) => total + Number(gift.musek_share_cad),
    0
  );

  const totalGiftCoins = giftTransactions.reduce(
    (total, gift) => total + Number(gift.coins),
    0
  );

  const earningsByArtist = artistIds.map((artistId) => {
    const artistGifts = giftTransactions.filter(
      (gift) => gift.creator_id === artistId
    );

    return {
      id: artistId,
      name: getArtistName(artistId),
      gifts: artistGifts.length,
      coins: artistGifts.reduce(
        (total, gift) => total + Number(gift.coins),
        0
      ),
      artistEarnings: artistGifts.reduce(
        (total, gift) => total + Number(gift.creator_share_cad),
        0
      ),
      musekShare: artistGifts.reduce(
        (total, gift) => total + Number(gift.musek_share_cad),
        0
      ),
    };
  }).sort((a, b) => b.artistEarnings - a.artistEarnings);

  const cardStyle = {
    padding: "20px",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
  };

  return (
    <main className="labelDashboard min-h-screen bg-gray-950 text-white">
      <style>{`
        .labelDashboard{--label-purple:#b56af2;--label-lavender:#dec0ff;background:radial-gradient(ellipse at 80% 0%,rgba(107,33,168,.18),transparent 34%),#08070c!important}
        .labelDashboard>.mx-auto{max-width:1440px!important;padding-top:42px!important;padding-bottom:90px!important}
        .labelDashboard header{padding:22px 0 28px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:30px!important}
        .labelDashboard header p:first-child{letter-spacing:4px;color:#c084fc!important}
        .labelDashboard header h1{font-size:clamp(32px,4vw,48px)!important;letter-spacing:-2px;background:linear-gradient(100deg,#fff 20%,#d8b4fe 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .labelDashboard .bg-gray-950{background:#0c0911!important}
        .labelDashboard .bg-gray-900{background:linear-gradient(145deg,rgba(32,23,43,.96),rgba(15,12,20,.98))!important}
        .labelDashboard .border-gray-800{border-color:rgba(192,132,252,.15)!important}
        .labelDashboard .rounded-2xl{border-radius:22px!important}
        .labelDashboard .rounded-xl{border-radius:16px!important}
        .labelDashboard section.rounded-2xl{position:relative;overflow:hidden;box-shadow:0 18px 55px rgba(0,0,0,.2)}
        .labelDashboard section.rounded-2xl:before{content:"";position:absolute;pointer-events:none;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(216,180,254,.35),transparent)}
        .labelDashboard section.rounded-2xl.p-6{padding:clamp(20px,3vw,32px)!important}
        .labelDashboard .text-purple-400{color:#c084fc!important}
        .labelDashboard .bg-purple-500{background:linear-gradient(180deg,#d8b4fe,#9333ea)!important;box-shadow:0 0 20px rgba(168,85,247,.18)}
        .labelDashboard .bg-purple-700,.labelDashboard .bg-purple-800{background:linear-gradient(135deg,#9333ea,#4c1d95)!important}
        .labelDashboard .text-gray-400{color:#aaa0b5!important}
        .labelDashboard .text-gray-500{color:#82778e!important}
        .labelDashboard a.rounded-lg,.labelDashboard button.rounded-lg{transition:all .2s ease}
        .labelDashboard a.rounded-lg:hover,.labelDashboard button.rounded-lg:hover{border-color:rgba(216,180,254,.65);transform:translateY(-1px)}
        .labelDashboard .grid>div.rounded-xl,.labelDashboard [style*="border: 1px solid"]{background:linear-gradient(145deg,rgba(45,30,59,.58),rgba(17,13,23,.8));border-color:rgba(192,132,252,.2)!important;border-radius:17px!important}
        .labelDashboard h2{letter-spacing:-.7px}
        .labelDashboard h3{letter-spacing:-.35px}
        .labelDashboard .text-green-400{color:#86efac!important}
        .labelDashboard .text-yellow-400{color:#fcd34d!important}
        .labelDashboard #label-analytics,.labelDashboard #label-earnings,.labelDashboard #music-releases{scroll-margin-top:24px}
        @media(max-width:640px){.labelDashboard>.mx-auto{padding-left:16px!important;padding-right:16px!important;padding-top:24px!important}.labelDashboard header{align-items:flex-start}.labelDashboard header h1{font-size:34px!important}}
      `}</style>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-purple-400">
              YASUH
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Label Dashboard
            </h1>
            <p className="mt-2 text-gray-400">
              Manage your label, artists and music releases.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/social" className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-5 py-3 text-sm font-semibold text-purple-200">
              YASUH Social
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-700 px-5 py-3 text-sm hover:bg-gray-800"
            >
              Main Dashboard
            </Link>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-wrap items-center gap-5">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Label profile"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-700 text-3xl font-bold">
                {labelName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <p className="text-sm text-purple-400">Your Label</p>
              <h2 className="text-2xl font-bold">{labelName}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {profile.location || "Location not added"}
              </p>
            </div>
          </div>

          <p className="mt-5 text-gray-300">
            {profile.bio ||
              "Add a description to introduce your record label."}
          </p>

          {profile.website_url && (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-purple-400 hover:underline"
            >
              Visit label website
            </a>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Artists</h3>
            <p className="mt-2 text-sm text-gray-400">
              Build and manage your label's artist roster.
            </p>
            <p className="mt-4 text-sm text-purple-400">
              Artist management is available below.
            </p>
          </div>

          <a
            href="#music-releases"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-purple-500"
          >
            <h3 className="text-lg font-semibold">Music Releases</h3>
            <p className="mt-2 text-sm text-gray-400">
              View published music from your signed artists.
            </p>
            <p className="mt-4 text-sm text-purple-400">
              View releases ↓
            </p>
          </a>

          <a
            href="#label-analytics"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-purple-500"
          >
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="mt-2 text-sm text-gray-400">
              Track plays and performance across your signed artists.
            </p>
            <p className="mt-4 text-sm text-purple-400">
              View analytics ↓
            </p>
          </a>

          <a
            href="#label-earnings"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-purple-500"
          >
            <h3 className="text-lg font-semibold">Label Earnings</h3>
            <p className="mt-2 text-sm text-gray-400">
              View gift revenue and earnings generated by your signed artists.
            </p>
            <p className="mt-4 text-sm text-purple-400">
              View earnings ↓
            </p>
          </a>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Artist Invitations</h3>
            <p className="mt-2 text-sm text-gray-400">
              Invite artists to join your record label.
            </p>
            <p className="mt-4 text-sm text-purple-400">
              Invitation management is available below.
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Label Settings</h3>
            <p className="mt-2 text-sm text-gray-400">
              Manage your label's profile and information.
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-block text-sm font-semibold text-purple-400 hover:underline"
            >
              Manage profile
            </Link>
          </div>
        </section>

        <section
          id="label-analytics"
          className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-400">
            LABEL ANALYTICS
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Your Label's Music Performance
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Listening statistics from your signed artists.
          </p>

          {analyticsError && (
            <p className="mt-4 text-sm text-yellow-400">
              Some analytics could not be loaded: {analyticsError}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div style={cardStyle}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                TOTAL PLAYS
              </p>
              <h3 className="mt-2 text-3xl font-bold">
                {totalPlays.toLocaleString()}
              </h3>
            </div>

            <div style={cardStyle}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                SIGNED ARTISTS
              </p>
              <h3 className="mt-2 text-3xl font-bold">
                {artistIds.length}
              </h3>
            </div>

            <div style={cardStyle}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                PUBLISHED SONGS
              </p>
              <h3 className="mt-2 text-3xl font-bold">
                {releases.length}
              </h3>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">
              Plays by Artist
            </h3>

            {artistStats.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                No signed artists are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {artistStats.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 p-4"
                  >
                    <div>
                      <h4 className="font-semibold">{artist.name}</h4>
                      <p className="mt-1 text-sm text-gray-400">
                        {artist.songs} published songs
                      </p>
                    </div>
                    <strong>
                      {artist.plays.toLocaleString()} plays
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">
              Six-Month Listening Report
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Plays recorded during the last six months.
            </p>

            <div style={{ ...cardStyle, marginTop: "16px" }}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                RECORDED PLAYS
              </p>
              <h3 className="mt-2 text-3xl font-bold">
                {totalMonthlyPlays.toLocaleString()}
              </h3>

              <div className="mt-6 flex h-52 items-end justify-between gap-3">
                {monthlyStats.map((month) => (
                  <div
                    key={month.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <strong className="text-xs">{month.plays}</strong>
                    <div
                      className="w-full max-w-12 rounded-t-md bg-purple-500"
                      style={{
                        height: `${Math.max(
                          (month.plays / highestMonthlyPlays) * 130,
                          5
                        )}px`,
                      }}
                    />
                    <span className="text-xs text-gray-400">
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Monthly tracking starts when play-event tracking was installed.
              Earlier plays are not included in this chart.
            </p>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">
              Most-Played Songs
            </h3>

            {rankedReleases.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                No published songs are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {rankedReleases.slice(0, 10).map((release, index) => (
                  <div
                    key={release.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 p-4"
                  >
                    <div>
                      <h4 className="font-semibold">
                        {index + 1}. {release.title}
                      </h4>
                      <p className="mt-1 text-sm text-gray-400">
                        {getArtistName(release.artist_id)}
                        {" · "}
                        {release.genre || "Music"}
                      </p>
                    </div>
                    <strong>
                      {(release.play_count || 0).toLocaleString()} plays
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          id="label-earnings"
          className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-400">
            LABEL EARNINGS
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Gift Revenue from Your Signed Artists
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            A view of settled virtual gifts sent to artists signed to your label.
            These figures are informational and do not represent label commission.
          </p>

          {earningsError && (
            <p className="mt-4 text-sm text-yellow-400">
              Gift earnings could not be loaded: {earningsError}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div style={cardStyle}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                TOTAL GIFT VALUE
              </p>
              <h3 className="mt-2 text-3xl font-bold">
                {cadFormatter.format(totalGiftValue)}
              </h3>
              <p className="mt-2 text-xs text-gray-500">
                Settled gift revenue
              </p>
            </div>

            <div style={cardStyle}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                ARTIST SHARE · 70%
              </p>
              <h3 className="mt-2 text-3xl font-bold text-green-400">
                {cadFormatter.format(totalArtistEarnings)}
              </h3>
              <p className="mt-2 text-xs text-gray-500">
                Credited to signed artists
              </p>
            </div>

            <div style={cardStyle}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                YASUH SHARE · 30%
              </p>
              <h3 className="mt-2 text-3xl font-bold">
                {cadFormatter.format(totalMusekShare)}
              </h3>
              <p className="mt-2 text-xs text-gray-500">
                Platform share of settled gifts
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-800 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">
                  Total coins used for settled gifts
                </p>
                <h3 className="mt-1 text-2xl font-bold">
                  {totalGiftCoins.toLocaleString()} coins
                </h3>
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  Settled gift transactions
                </p>
                <h3 className="mt-1 text-2xl font-bold">
                  {giftTransactions.length}
                </h3>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">
              Gift Earnings by Artist
            </h3>

            {earningsByArtist.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                No signed artists are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {earningsByArtist.map((artist) => (
                  <div
                    key={artist.id}
                    className="rounded-xl border border-gray-800 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{artist.name}</h4>
                        <p className="mt-1 text-sm text-gray-400">
                          {artist.gifts} settled gifts · {artist.coins.toLocaleString()} coins
                        </p>
                      </div>
                      <strong className="text-green-400">
                        {cadFormatter.format(artist.artistEarnings)}
                      </strong>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      YASUH share: {cadFormatter.format(artist.musekShare)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">
              Recent Gift Transactions
            </h3>

            {giftTransactions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                No settled gift transactions have been recorded for your signed artists.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {giftTransactions.slice(0, 10).map((gift) => (
                  <div
                    key={gift.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 p-4"
                  >
                    <div>
                      <h4 className="font-semibold">
                        {getArtistName(gift.creator_id)}
                      </h4>
                      <p className="mt-1 text-sm text-gray-400">
                        {Number(gift.coins).toLocaleString()} coins ·{" "}
                        {new Date(gift.created_at).toLocaleDateString("en-CA")}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong>
                        {cadFormatter.format(
                          Number(gift.creator_share_cad) +
                          Number(gift.musek_share_cad)
                        )}
                      </strong>
                      <p className="mt-1 text-xs text-green-400">
                        Settled
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Gift figures are based on settled transactions recorded in YASUH.
            They are not label earnings or a promise of payment to the label.
            Sandbox test transactions are not real-money revenue.
          </p>
        </section>

        <section
          id="music-releases"
          className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <h2 className="text-2xl font-bold">Music Releases</h2>
          <p className="mt-2 text-sm text-gray-400">
            Published songs from artists signed to your label.
          </p>

          {artistIds.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              No signed artists yet. Invite artists to build your roster.
            </p>
          ) : releases.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              Your signed artists do not have any published songs available here yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {releases.map((release) => (
                <div
                  key={release.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 p-4"
                >
                  <div>
                    <h3 className="font-semibold">{release.title}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Artist: {getArtistName(release.artist_id)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {release.genre || "Genre not specified"}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-400">
                    Published
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/discover-music"
            className="mt-6 inline-block text-sm font-semibold text-purple-400 hover:underline"
          >
            Explore all published music →
          </Link>
        </section>

        <div className="mt-10">
          <ArtistManagement />
        </div>
      </div>
    </main>
  );
}
