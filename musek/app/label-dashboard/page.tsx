
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
};

type ArtistProfile = {
  id: string;
  artist_name: string | null;
  display_name: string | null;
};

export default async function LabelDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  // Find artists who have joined this label.
  const { data: roster } = await supabase
    .from("label_artists")
    .select("artist_id")
    .eq("label_id", user.id);

  const artistIds = (roster ?? []).map((artist) => artist.artist_id);

  let releases: Release[] = [];
  let artistProfiles: ArtistProfile[] = [];

  // Only load music released by artists on this label.
  if (artistIds.length > 0) {
    const { data: releaseData } = await supabase
      .from("music_tracks")
      .select("id, artist_id, title, genre, created_at")
      .in("artist_id", artistIds)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    releases = (releaseData ?? []) as Release[];

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("id, artist_name, display_name")
      .in("id", artistIds);

    artistProfiles = (profileData ?? []) as ArtistProfile[];
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-purple-400">
              MUSEK
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Label Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Manage your label, artists and music releases.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-700 px-5 py-3 text-sm hover:bg-gray-800"
          >
            Main Dashboard
          </Link>
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

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="mt-2 text-sm text-gray-400">
              Track music performance and audience activity.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Label analytics coming next
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Label Earnings</h3>
            <p className="mt-2 text-sm text-gray-400">
              View your label's earnings and financial activity.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Earnings management coming next
            </p>
          </div>

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
          id="music-releases"
          className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Music Releases</h2>
            <p className="mt-2 text-sm text-gray-400">
              Published songs from artists signed to your label.
            </p>
          </div>

          {artistIds.length === 0 ? (
            <p className="text-sm text-gray-400">
              No signed artists yet. Invite artists to build your roster.
            </p>
          ) : releases.length === 0 ? (
            <p className="text-sm text-gray-400">
              Your signed artists do not have any published songs available here yet.
            </p>
          ) : (
            <div className="space-y-3">
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
