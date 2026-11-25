import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MusicSearch from "./music-search";

export default async function DiscoverMusicPage() {
  const supabase = createClient();

  const { data: tracks, error } = await supabase
    .from("music_tracks")
    .select(
      "id, artist_id, title, description, genre, audio_path, cover_art_path, created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#080711] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold">Unable to load music</h1>
          <p className="mt-2 text-sm text-red-200">{error.message}</p>
        </div>
      </main>
    );
  }

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("artist_name, display_name, avatar_url")
        .eq("id", track.artist_id)
        .single();

      const { data: audio } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      let artworkUrl = profile?.avatar_url || null;

      if (track.cover_art_path) {
        const { data: cover } = await supabase.storage
          .from("song-cover-art")
          .createSignedUrl(track.cover_art_path, 3600);

        artworkUrl = cover?.signedUrl || artworkUrl;
      }

      return {
        id: track.id,
        title: track.title,
        artistName:
          profile?.artist_name ||
          profile?.display_name ||
          "YASUH Artist",
        genre: track.genre || "",
        audioUrl: audio?.signedUrl || null,
        artworkUrl,
      };
    })
  );

  const genreCount = new Set(
    songs.map((song) => song.genre.trim()).filter(Boolean)
  ).size;

  return (
    <main className="min-h-screen bg-[#080711] px-4 pb-40 pt-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black tracking-[0.18em] text-white">
            YASUH<span className="text-fuchsia-500">.</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/feed" className="rounded-full px-4 py-2 text-gray-300 transition hover:bg-white/10 hover:text-white">
              Music Feed
            </Link>
            <Link href="/discover" className="rounded-full px-4 py-2 text-gray-300 transition hover:bg-white/10 hover:text-white">
              Artists
            </Link>
            <Link href="/favorites" className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-fuchsia-200 transition hover:bg-fuchsia-500/20">
              My Favourites
            </Link>
          </nav>
        </header>

        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#241044] via-[#17102d] to-[#0d0b18] p-7 shadow-2xl shadow-purple-950/30 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">
              Your next favourite starts here
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">
              Discover <span className="text-fuchsia-400">Music.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
              Explore independent sounds, find new artists, and build a library
              around the music you love.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#music-library" className="rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:bg-fuchsia-400">
                Explore the library
              </a>
              <Link href="/discover" className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Find artists
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-gray-400">Published tracks</p>
            <p className="mt-2 text-3xl font-bold">{songs.length}</p>
            <p className="mt-1 text-xs text-gray-500">Available in the library</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-gray-400">Genres</p>
            <p className="mt-2 text-3xl font-bold">{genreCount}</p>
            <p className="mt-1 text-xs text-gray-500">Sounds to explore</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-gray-400">Made for discovery</p>
            <p className="mt-2 text-3xl font-bold text-fuchsia-300">YASUH</p>
            <p className="mt-1 text-xs text-gray-500">Independent music lives here</p>
          </div>
        </section>

        <section id="music-library" className="rounded-3xl border border-white/10 bg-[#11101b] p-5 shadow-xl sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">
              Explore the sound
            </p>
            <h2 className="mt-2 text-2xl font-bold">Music Library</h2>
            <p className="mt-2 text-sm text-gray-400">
              Search tracks, artists, and genres. Select a song to start listening.
            </p>
          </div>

          <MusicSearch songs={songs} />
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-gray-500">
          <span>Discover independent music on YASUH.</span>
          <div className="flex gap-5">
            <Link href="/favorites" className="transition hover:text-fuchsia-300">Favourites</Link>
            <Link href="/dashboard" className="transition hover:text-fuchsia-300">Dashboard</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
