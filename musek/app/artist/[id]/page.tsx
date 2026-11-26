import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "../../discover-music/music-player";
import SendGift from "./send-gift";
import FollowArtist from "./follow-artist";

export default async function ArtistPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: artist } = await supabase
    .from("user_profiles")
    .select("id, display_name, bio, account_type, avatar_url, artist_name, genres, location, website_url")
    .eq("id", params.id)
    .eq("account_type", "artist")
    .eq("is_public", true)
    .maybeSingle();

  if (!artist) notFound();

  const artistName = artist.artist_name || artist.display_name;

  const { data: tracks, error: tracksError } = await supabase
    .from("music_tracks")
    .select("id, title, genre, audio_path, cover_art_path, created_at")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const { data: audio } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      let artworkUrl = artist.avatar_url || null;

      if (track.cover_art_path) {
        const { data: cover } = await supabase.storage
          .from("song-cover-art")
          .createSignedUrl(track.cover_art_path, 3600);

        if (cover?.signedUrl) artworkUrl = cover.signedUrl;
      }

      return {
        id: track.id,
        title: track.title,
        artistName,
        genre: track.genre || "",
        audioUrl: audio?.signedUrl || null,
        artworkUrl,
      };
    })
  );

  const genres = artist.genres || [];

  return (
    <main className="yasuh-artist-theme min-h-screen overflow-hidden bg-[#08070d] pb-20 text-white">
      <div className="pointer-events-none fixed inset-0 -z-0" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(126,34,206,.28), transparent 48%), radial-gradient(ellipse at 100% 40%, rgba(88,28,135,.13), transparent 35%)" }} />
      <nav className="relative z-10 mx-auto flex h-[78px] max-w-7xl items-center justify-between border-b border-white/[0.08] px-5 sm:px-8">
        <Link className="text-[25px] font-black tracking-[-1.5px]" href="/">YASUH<span className="text-fuchsia-400">.</span></Link>
        <Link className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-gray-200 transition hover:border-fuchsia-400/40 hover:text-white" href="/discover">← Discover artists</Link>
      </nav>

      <section className="relative mx-auto mt-7 max-w-7xl px-5 sm:mt-10 sm:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-fuchsia-300/15 bg-[#130e1d] shadow-[0_30px_100px_rgba(0,0,0,.45)]">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 75% 15%, rgba(168,85,247,.28), transparent 42%), linear-gradient(120deg, rgba(25,15,38,.96), rgba(10,9,16,.96) 70%)" }} />
          <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full border border-fuchsia-300/10 shadow-[0_0_100px_rgba(168,85,247,.12)]" />
          <div className="absolute -right-2 -top-14 h-56 w-56 rounded-full border border-fuchsia-300/10" />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-14">
            <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:gap-9">
              <div className="h-36 w-36 shrink-0 rounded-[30px] bg-gradient-to-br from-fuchsia-300 via-purple-600 to-violet-950 p-[3px] shadow-[0_0_55px_rgba(168,85,247,.28)] sm:h-48 sm:w-48 sm:rounded-[38px]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[27px] bg-[#1b1227] sm:rounded-[35px]">
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt={artistName + " profile"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-6xl font-black text-fuchsia-200">{artistName?.charAt(0)?.toUpperCase() || "♫"}</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[.28em] text-fuchsia-300">YASUH · Artist spotlight</p>
                <h1 className="break-words text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl">{artistName}</h1>
                {artist.location && <p className="mt-4 flex items-center gap-2 text-sm text-gray-300"><span className="text-fuchsia-300">⌖</span>{artist.location}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  {genres.length ? genres.map((genre: string) => <span key={genre} className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-100">{genre}</span>) : <span className="text-xs text-gray-500">Genres not added yet</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:min-w-[190px] lg:flex-col lg:items-stretch">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center">
                <p className="text-2xl font-black">{tracks?.length || 0}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-gray-400">Published tracks</p>
              </div>
              <div className="min-w-[170px] flex-1 lg:flex-none"><FollowArtist artistId={artist.id} /></div>
            </div>
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4 sm:px-10">
            <span className="text-[10px] font-bold uppercase tracking-[.2em] text-gray-500">Independent sound. Direct connection.</span>
            {artist.website_url && <a href={artist.website_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-fuchsia-200 transition hover:text-white">Official website ↗</a>}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-8 grid max-w-7xl gap-7 px-5 sm:mt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.25em] text-fuchsia-300">The story behind the sound</p>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">About the artist</h2>
            </div>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-[#171020] to-[#0d0b13] p-6 sm:p-8">
            <p className="whitespace-pre-wrap text-sm leading-8 text-gray-300">{artist.bio || "This artist has not added a biography yet."}</p>
          </div>

          <div className="mb-5 mt-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.25em] text-fuchsia-300">Listen and discover</p>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">The music</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold text-gray-400">{tracks?.length || 0} tracks</span>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#100d17] p-4 sm:p-7">
            {tracksError ? (
              <p className="text-sm text-red-300">Unable to load this artist's music: {tracksError.message}</p>
            ) : songs.length > 0 ? (
              <MusicPlayer songs={songs} />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-14 text-center">
                <div className="mb-3 text-4xl text-fuchsia-300">♫</div>
                <h3 className="font-semibold text-white">The next release is on its way</h3>
                <p className="mt-2 text-sm text-gray-500">This artist has not published any songs yet.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[22px] border border-fuchsia-300/15 bg-gradient-to-br from-[#20122f] to-[#100d17] p-6">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[.22em] text-fuchsia-300">Support independent music</p>
            <h2 className="text-2xl font-black tracking-tight">Show some love.</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">Send a YASUH gift directly to this artist and support their creative journey.</p>
            <SendGift artistId={artist.id} />
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[#100d17] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-gray-500">YASUH community</p>
            <p className="mt-3 text-sm leading-6 text-gray-300">Discover new sounds, follow the artists you love and support the music that moves you.</p>
            <Link href="/discover-music" className="mt-5 inline-flex text-xs font-bold text-fuchsia-200 hover:text-white">Explore more music →</Link>
          </div>
        </aside>
      </section>

      <p className="relative z-10 mx-auto mt-12 max-w-7xl px-5 text-xs text-gray-500 sm:px-8"><Link href="/discover" className="transition hover:text-fuchsia-200">← Back to Discover</Link></p>
    </main>
  );
}
