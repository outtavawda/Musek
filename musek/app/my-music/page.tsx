import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicLibrary from "./music-library";

export default async function MyMusicPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type, artist_name, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "artist") redirect("/dashboard");

  const { data: tracks, error } = await supabase
    .from("music_tracks")
    .select("id, title, description, genre, audio_path, cover_art_path, status, created_at, play_count")
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#080811] px-5 py-12 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-sm text-red-200">Unable to load your music: {error.message}</p>
          <Link href="/dashboard" className="mt-5 inline-block text-sm font-bold text-purple-300">← Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data: audioData } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      let coverArtUrl: string | null = null;
      if (track.cover_art_path) {
        const { data: coverData } = await supabase.storage
          .from("song-cover-art")
          .createSignedUrl(track.cover_art_path, 3600);
        coverArtUrl = coverData?.signedUrl || null;
      }

      return { ...track, audioUrl: audioData?.signedUrl || null, coverArtUrl };
    })
  );

  const publishedCount = songs.filter((song) => song.status === "published").length;
  const draftCount = songs.filter((song) => song.status !== "published").length;
  const totalPlays = songs.reduce((sum, song) => sum + Number(song.play_count || 0), 0);
  const artistName = profile.artist_name || profile.display_name || "Artist";

  return (
    <main className="min-h-screen bg-[#080811] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
        <nav className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tight">MUSEK<span className="text-purple-500">.</span></Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 transition hover:border-purple-500 hover:text-white">Dashboard</Link>
            <Link href="/upload" className="rounded-full bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500">＋ Upload Music</Link>
          </div>
        </nav>

        <section className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-br from-[#24113e] via-[#151326] to-[#0d0d19] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-purple-300">Artist Studio / Library</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">My <span className="text-purple-300">Music</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">Your releases, drafts and catalogue in one place. Manage your music and control what listeners can discover on MUSEK.</p>
            <p className="mt-4 text-xs font-semibold text-purple-200/80">SIGNED IN AS {artistName.toUpperCase()}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#211338] to-[#11111d] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300">Total tracks</p>
            <p className="mt-3 text-3xl font-black">{songs.length}</p>
            <p className="mt-1 text-xs text-gray-500">Your full catalogue</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Published</p>
            <p className="mt-3 text-3xl font-black text-emerald-300">{publishedCount}</p>
            <p className="mt-1 text-xs text-gray-500">Available to listeners</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Total plays</p>
            <p className="mt-3 text-3xl font-black">{totalPlays.toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500">{draftCount} draft{draftCount === 1 ? "" : "s"} in your library</p>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-purple-300">Your releases</p>
              <h2 className="mt-1 text-2xl font-black">Music Library</h2>
            </div>
            <Link href="/upload" className="text-sm font-bold text-purple-300 transition hover:text-white">Upload another track →</Link>
          </div>
          <MusicLibrary initialSongs={songs} userId={user.id} />
        </section>

        <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-gray-600">MUSEK. Artist Studio</footer>
      </div>
    </main>
  );
}
