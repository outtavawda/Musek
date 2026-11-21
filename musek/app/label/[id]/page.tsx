import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MusicPlayer from "../../discover-music/music-player";

type ArtistProfile = {
  id: string;
  display_name: string | null;
  artist_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type MusicTrack = {
  id: string;
  artist_id: string;
  title: string;
  genre: string | null;
  audio_path: string;
  cover_art_path: string | null;
};

type PlayerSong = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl: string | null;
};

export default async function LabelPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: label, error: labelError } = await supabase
    .from("user_profiles")
    .select("id, display_name, bio, account_type, avatar_url, label_name, location, website_url, is_public")
    .eq("id", params.id)
    .eq("account_type", "label")
    .eq("is_public", true)
    .maybeSingle();

  if (labelError || !label) notFound();

  const labelName = label.label_name || label.display_name || "MUSEK Label";
  const { data: relationships } = await supabase
    .from("label_artists")
    .select("artist_id")
    .eq("label_id", label.id);

  const artistIds: string[] = [];
  (relationships || []).forEach((item) => {
    if (!artistIds.includes(item.artist_id)) artistIds.push(item.artist_id);
  });

  let artists: ArtistProfile[] = [];
  let tracks: MusicTrack[] = [];
  let playerSongs: PlayerSong[] = [];

  if (artistIds.length > 0) {
    const { data: artistProfiles } = await supabase
      .from("user_profiles")
      .select("id, display_name, artist_name, avatar_url, bio")
      .in("id", artistIds)
      .eq("account_type", "artist");

    artists = (artistProfiles || []) as ArtistProfile[];

    const { data: publishedTracks } = await supabase
      .from("music_tracks")
      .select("id, artist_id, title, genre, audio_path, cover_art_path")
      .in("artist_id", artistIds)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    tracks = (publishedTracks || []) as MusicTrack[];

    playerSongs = await Promise.all(
      tracks.map(async (track) => {
        const { data: audio } = await supabase.storage
          .from("music-tracks")
          .createSignedUrl(track.audio_path, 3600);

        const artist = artists.find((item) => item.id === track.artist_id);
        let artworkUrl = artist?.avatar_url || null;

        if (track.cover_art_path) {
          const { data: cover } = await supabase.storage
            .from("song-cover-art")
            .createSignedUrl(track.cover_art_path, 3600);
          if (cover?.signedUrl) artworkUrl = cover.signedUrl;
        }

        return {
          id: track.id,
          title: track.title,
          artistName: artist?.artist_name || artist?.display_name || "MUSEK Artist",
          genre: track.genre || "",
          audioUrl: audio?.signedUrl || null,
          artworkUrl,
        };
      })
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#08070d] pb-20 text-white">
      <div className="pointer-events-none fixed inset-0 -z-0" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(126,34,206,.28), transparent 48%), radial-gradient(ellipse at 100% 40%, rgba(88,28,135,.13), transparent 35%)" }} />
      <nav className="relative z-10 mx-auto flex h-[78px] max-w-7xl items-center justify-between border-b border-white/[0.08] px-5 sm:px-8">
        <Link className="text-[25px] font-black tracking-[-1.5px]" href="/">MUSEK<span className="text-fuchsia-400">.</span></Link>
        <Link className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-gray-200 transition hover:border-fuchsia-400/40 hover:text-white" href="/discover">← Discover labels</Link>
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
                  {label.avatar_url ? (
                    <img src={label.avatar_url} alt={labelName + " logo"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-6xl font-black text-fuchsia-200">{labelName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[.28em] text-fuchsia-300">MUSEK · Record label spotlight</p>
                <h1 className="break-words text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl">{labelName}</h1>
                {label.location && <p className="mt-4 flex items-center gap-2 text-sm text-gray-300"><span className="text-fuchsia-300">⌖</span>{label.location}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:min-w-[190px] lg:flex-col">
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center">
                <p className="text-2xl font-black">{artists.length}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-gray-400">Signed artists</p>
              </div>
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center">
                <p className="text-2xl font-black">{tracks.length}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-gray-400">Published tracks</p>
              </div>
            </div>
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4 sm:px-10">
            <span className="text-[10px] font-bold uppercase tracking-[.2em] text-gray-500">A home for artists. A platform for sound.</span>
            {label.website_url && <a href={label.website_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-fuchsia-200 transition hover:text-white">Official label website ↗</a>}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-8 grid max-w-7xl gap-7 px-5 sm:mt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[.25em] text-fuchsia-300">The people behind the releases</p>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Our artists</h2>
          </div>
          {artists.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-14 text-center">
              <div className="mb-3 text-4xl text-fuchsia-300">♫</div>
              <h3 className="font-semibold text-white">The roster is taking shape</h3>
              <p className="mt-2 text-sm text-gray-500">This label has not added any artists yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {artists.map((artist) => {
                const artistName = artist.artist_name || artist.display_name || "MUSEK Artist";
                const artistTracks = tracks.filter((track) => track.artist_id === artist.id);
                const artistPlayerSongs = playerSongs.filter((song) => artistTracks.some((track) => track.id === song.id));

                return (
                  <article key={artist.id} className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-[#171020] to-[#0d0b13]">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-7">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-[#21152d]">
                        {artist.avatar_url ? <img src={artist.avatar_url} alt={artistName + " profile"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl text-fuchsia-200">♫</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[.22em] text-fuchsia-300">Signed artist</p>
                        <h3 className="mt-1 text-xl font-black tracking-tight">{artistName}</h3>
                        {artist.bio && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">{artist.bio}</p>}
                      </div>
                      <Link href={`/artist/${artist.id}`} className="inline-flex shrink-0 items-center justify-center rounded-full border border-fuchsia-300/25 bg-fuchsia-400/[0.08] px-4 py-2.5 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-400/15">View artist profile →</Link>
                    </div>
                    <div className="border-t border-white/[0.07] bg-black/20 p-5 sm:p-7">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h4 className="text-xs font-black uppercase tracking-[.18em] text-gray-300">Published music</h4>
                        <span className="text-[10px] text-gray-500">{artistTracks.length} {artistTracks.length === 1 ? "track" : "tracks"}</span>
                      </div>
                      {artistTracks.length === 0 ? <p className="text-sm text-gray-500">No published songs yet.</p> : <MusicPlayer songs={artistPlayerSongs} />}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[22px] border border-fuchsia-300/15 bg-gradient-to-br from-[#20122f] to-[#100d17] p-6">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[.22em] text-fuchsia-300">The label story</p>
            <h2 className="text-2xl font-black tracking-tight">About the label.</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-300">{label.bio || "This record label has not added a biography yet."}</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[#100d17] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-gray-500">Label catalogue</p>
            <h2 className="mt-3 text-xl font-black">More music to discover.</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Explore releases from this label's artists and discover more independent sounds across MUSEK.</p>
            <Link href="/discover-music" className="mt-5 inline-flex text-xs font-bold text-fuchsia-200 transition hover:text-white">Explore all music →</Link>
          </div>
        </aside>
      </section>

      <p className="relative z-10 mx-auto mt-12 max-w-7xl px-5 text-xs text-gray-500 sm:px-8"><Link href="/discover" className="transition hover:text-fuchsia-200">← Back to Discover</Link></p>
    </main>
  );
}
