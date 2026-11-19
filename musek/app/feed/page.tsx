
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const supabase = createClient();

  const { data: tracks } = await supabase
    .from("music_tracks")
    .select(
      "id, title, genre, artist_id, audio_path, cover_art_path, play_count"
    )
    .eq("status", "published")
    .order("play_count", { ascending: false })
    .limit(30);

  const artistIds = Array.from(
    new Set((tracks || []).map((track) => track.artist_id))
  );

  const { data: artists } =
    artistIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("id, artist_name, display_name, avatar_url")
          .in("id", artistIds)
      : { data: [] };

  const songs = await Promise.all(
    (tracks || []).map(async (track) => {
      const artist = (artists || []).find(
        (item) => item.id === track.artist_id
      );

      const { data: audio } = await supabase.storage
        .from("music-tracks")
        .createSignedUrl(track.audio_path, 3600);

      let artworkUrl = artist?.avatar_url || null;

      if (track.cover_art_path) {
        const { data: cover } = await supabase.storage
          .from("song-cover-art")
          .createSignedUrl(track.cover_art_path, 3600);

        if (cover?.signedUrl) {
          artworkUrl = cover.signedUrl;
        }
      }

      return {
        id: track.id,
        title: track.title,
        artistName:
          artist?.artist_name ||
          artist?.display_name ||
          "MUSEK Artist",
        genre: track.genre || "Music",
        audioUrl: audio?.signedUrl || null,
        artworkUrl,
        artistId: track.artist_id,
      };
    })
  );

  const playableSongs = songs.filter(
    (song) => song.audioUrl !== null
  );

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <Link className="secondaryButton" href="/discover">
          Discover
        </Link>
      </nav>

      <FeedClient songs={playableSongs} />
    </main>
  );
}

