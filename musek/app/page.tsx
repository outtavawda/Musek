import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "./discover-music/music-player";

const features = [
  { number: "01", title: "Discover", description: "Find your next favourite sound. Explore independent music, emerging artists and new releases." },
  { number: "02", title: "Support artists", description: "Send virtual gifts and help creators earn from the community that loves their music." },
  { number: "03", title: "Connect", description: "Follow artists, join the conversation and build real connections through music." },
];

export default async function HomePage() {
  const supabase = createClient();
  const { data: profiles } = await supabase.from("user_profiles")
    .select("id, display_name, account_type, avatar_url, artist_name, label_name, bio, genres, location")
    .eq("is_public", true).in("account_type", ["artist", "label"]).order("display_name", { ascending: true });
  const artists = (profiles || []).filter((p) => p.account_type === "artist").slice(0, 4);
  const labels = (profiles || []).filter((p) => p.account_type === "label").slice(0, 4);

  const { data: tracks } = await supabase.from("music_tracks")
    .select("id, title, genre, artist_id, play_count, audio_path, cover_art_path")
    .eq("status", "published").order("play_count", { ascending: false }).limit(6);
  const artistIds = Array.from(new Set((tracks || []).map((track) => track.artist_id)));
  const { data: trackArtists } = artistIds.length > 0
    ? await supabase.from("user_profiles").select("id, artist_name, display_name, avatar_url").in("id", artistIds)
    : { data: [] };

  const trendingSongs = await Promise.all((tracks || []).map(async (track) => {
    const { data: audioData } = await supabase.storage.from("music-tracks").createSignedUrl(track.audio_path, 3600);
    if (!audioData?.signedUrl) return null;
    const artist = (trackArtists || []).find((p) => p.id === track.artist_id);
    let artworkUrl = artist?.avatar_url || null;
    if (track.cover_art_path) {
      const { data: coverData } = await supabase.storage.from("song-cover-art").createSignedUrl(track.cover_art_path, 3600);
      if (coverData?.signedUrl) artworkUrl = coverData.signedUrl;
    }
    return { id: track.id, title: track.title, artistName: artist?.artist_name || artist?.display_name || "YASUH Artist", genre: track.genre || "Music", audioUrl: audioData.signedUrl, artworkUrl };
  }));
  const playableTrendingSongs = trendingSongs.filter((song): song is NonNullable<typeof song> => song !== null);

  return (
    <main className="yasuh-home-theme min-h-screen overflow-hidden bg-[#080811] text-white">
      <nav className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between pl-[132px] pr-4 py-6 sm:pl-[150px] sm:pr-8 lg:pl-[170px] lg:pr-12">
        
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-7">
          <Link href="/feed" className="hidden text-sm text-gray-300 transition hover:text-white sm:block">Feed</Link>
          <Link href="/discover" className="hidden text-sm text-gray-300 transition hover:text-white min-[390px]:block">Discover</Link>
          <Link href="/discover-music" className="hidden text-sm text-gray-300 transition hover:text-white sm:block">Music</Link>
          <Link href="/login" className="hidden text-sm text-gray-300 transition hover:text-white min-[480px]:block">Log in</Link>
          <Link href="/signup" className="shrink-0 rounded-full bg-purple-600 px-3 py-2.5 text-[11px] font-bold shadow-lg shadow-purple-950/40 transition hover:bg-purple-500 sm:px-5 sm:text-sm">Join YASUH</Link>
        </div>
      </nav>

      <section className="relative mx-auto flex min-h-[610px] max-w-[1400px] items-center px-5 py-20 sm:px-8 lg:min-h-[680px] lg:px-12">
        <div className="pointer-events-none absolute -right-40 top-8 h-[540px] w-[540px] rounded-full bg-purple-700/20 blur-[110px]" />
        <div className="pointer-events-none absolute right-[12%] top-[18%] h-[390px] w-[390px] rounded-full border border-purple-400/10 shadow-[0_0_120px_rgba(139,92,246,0.12)_inset]" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-200"><span className="h-1.5 w-1.5 rounded-full bg-purple-300" /> Music · Creators · Community</div>
          <h1 className="mt-8 text-6xl font-black leading-[0.94] tracking-[-0.07em] sm:text-7xl lg:text-[100px]">Your music.<br /><span className="bg-gradient-to-r from-purple-200 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Your people.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-gray-300 sm:text-lg">A place where independent music finds its audience. Discover new sounds, connect with artists and support the creators behind the music.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="rounded-full bg-purple-600 px-7 py-4 text-sm font-bold shadow-xl shadow-purple-950/40 transition hover:-translate-y-0.5 hover:bg-purple-500">Get started <span className="ml-2">↗</span></Link><Link href="/discover-music" className="rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-sm font-bold transition hover:border-purple-400/50 hover:bg-purple-500/10">Explore music</Link></div>
          <p className="mt-8 text-xs tracking-wide text-gray-500">Made for artists, labels and the fans who move music forward.</p>
        </div>
        <div className="pointer-events-none absolute bottom-16 right-[8%] hidden h-64 w-64 items-center justify-center rounded-[42px] border border-purple-300/20 bg-gradient-to-br from-purple-500/20 to-fuchsia-900/10 shadow-2xl shadow-purple-950/30 lg:flex"><div className="flex h-44 w-44 items-center justify-center rounded-full border border-purple-200/20 bg-[#11101e] text-7xl text-purple-200 shadow-[0_0_70px_rgba(168,85,247,0.22)]">♫</div><span className="absolute -bottom-4 rounded-full border border-white/10 bg-[#171326] px-5 py-2 text-xs font-bold tracking-[0.2em] text-purple-200">SOUND CONNECTS US</span></div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">On the platform</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Trending music</h2><p className="mt-2 text-sm text-gray-400">The tracks listeners are playing.</p></div><Link href="/discover-music" className="text-sm font-bold text-purple-300 hover:text-white">Explore all music →</Link></div>
        {playableTrendingSongs.length === 0 ? <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-gray-400">New music is on the way. Check back soon.</div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#1b1530] to-[#10101a] p-4 sm:p-6"><MusicPlayer songs={playableTrendingSongs} /></div><div className="space-y-2">{playableTrendingSongs.slice(0, 4).map((song, index) => <Link key={song.id} href="/discover-music" className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-purple-400/30 hover:bg-purple-500/[0.06]"><span className="w-5 text-xs font-bold text-purple-300">{String(index + 1).padStart(2, "0")}</span>{song.artworkUrl ? <img src={song.artworkUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-xl text-purple-300">♫</div>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{song.title}</span><span className="mt-1 block truncate text-xs text-gray-500">{song.artistName} · {song.genre}</span></span></Link>)}</div></div>}
      </section>

      <section className="border-y border-white/[0.07] bg-[#0d0c18]"><div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">Meet the creators</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Artists to discover</h2><p className="mt-2 text-sm text-gray-400">Find the voices and sounds shaping the next wave.</p></div>
        {artists.length === 0 ? <p className="text-sm text-gray-500">Artist profiles will appear here as the community grows.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{artists.map((artist) => <Link key={artist.id} href={`/artist/${artist.id}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#141321] transition hover:-translate-y-1 hover:border-purple-400/40">{artist.avatar_url ? <img src={artist.avatar_url} alt="" className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-52 items-center justify-center bg-gradient-to-br from-purple-900/60 to-[#171321] text-5xl text-purple-300">♫</div>}<div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">Featured artist</p><h3 className="mt-2 truncate text-lg font-black">{artist.artist_name || artist.display_name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{artist.bio || "Discover this artist on YASUH."}</p><span className="mt-4 inline-block text-xs font-bold text-purple-300">View profile →</span></div></Link>)}</div>}
      </div></section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12"><div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">The label community</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Record labels</h2><p className="mt-2 text-sm text-gray-400">Explore the teams supporting independent talent.</p></div>
        {labels.length === 0 ? <p className="text-sm text-gray-500">Record label profiles will appear here soon.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{labels.map((label) => <Link key={label.id} href={`/label/${label.id}`} className="group rounded-3xl border border-white/10 bg-gradient-to-br from-[#19152a] to-[#101019] p-5 transition hover:-translate-y-1 hover:border-purple-400/40">{label.avatar_url ? <img src={label.avatar_url} alt="" className="h-24 w-24 rounded-2xl border border-white/10 object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-purple-500/15 text-3xl text-purple-300">✦</div>}<p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">Record label</p><h3 className="mt-2 text-lg font-black">{label.label_name || label.display_name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{label.bio || "Discover this label on YASUH."}</p></Link>)}</div>}
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:px-12"><div className="rounded-[32px] border border-purple-400/20 bg-gradient-to-br from-purple-950/70 via-[#171326] to-[#10101a] px-7 py-12 text-center sm:px-12"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">Your space. Your expression.</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Find your sound. Find your people.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-300">Join a growing community built around independent music, creative expression and artist support.</p><Link href="/signup" className="mt-7 inline-flex rounded-full bg-purple-600 px-7 py-4 text-sm font-bold transition hover:bg-purple-500">Join YASUH</Link></div></section>
      <footer className="border-t border-white/[0.07] px-5 py-8 text-center text-xs text-gray-500 sm:px-8">© {new Date().getFullYear()} YASUH. Your space. Your expression.</footer>
    </main>
  );
}
