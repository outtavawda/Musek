
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const supabase = createClient();

  // Identify the signed-in fan.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Load the fan's private music preferences.
  let preferredGenres: string[] = [];

  if (user) {
    const { data: preferences, error } = await supabase
      .from("user_music_preferences")
      .select("preferred_genres")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("MUSEK preference loading error:", error);
    }

    preferredGenres = (preferences?.preferred_genres || [])
      .map((genre: string) => genre.trim().toLowerCase())
      .filter(Boolean);
  }

  // Load a larger selection of published songs.
  const { data: tracks, error: tracksError } = await supabase
    .from("music_tracks")
    .select(
      "id, title, genre, artist_id, audio_path, cover_art_path, play_count"
    )
    .eq("status", "published")
    .order("play_count", { ascending: false })
    .limit(100);

  if (tracksError) {
    console.error("MUSEK feed loading error:", tracksError);
  }

  const availableTracks = tracks || [];

  // Separate familiar music from exploration music.
  const familiarTracks = availableTracks
    .filter((track) =>
      preferredGenres.includes(
        (track.genre || "").trim().toLowerCase()
      )
    )
    .sort(
      (a, b) => (b.play_count || 0) - (a.play_count || 0)
    );

  const explorationTracks = availableTracks
    .filter(
      (track) =>
        !preferredGenres.includes(
          (track.genre || "").trim().toLowerCase()
        )
    )
    .sort(
      (a, b) => (a.play_count || 0) - (b.play_count || 0)
    );

  // Build a 70/30 personalised feed.
  // Seven familiar songs followed by three exploration songs.
  const selectedTracks: typeof availableTracks = [];

  const familiarQueue = [...familiarTracks];
  const explorationQueue = [...explorationTracks];

  if (preferredGenres.length > 0) {
    for (let i = 0; i < 30; i++) {
      const shouldUseFamiliar = i % 10 < 7;

      let nextTrack;

      if (shouldUseFamiliar && familiarQueue.length > 0) {
        nextTrack = familiarQueue.shift();
      } else if (!shouldUseFamiliar && explorationQueue.length > 0) {
        nextTrack = explorationQueue.shift();
      } else if (familiarQueue.length > 0) {
        nextTrack = familiarQueue.shift();
      } else if (explorationQueue.length > 0) {
        nextTrack = explorationQueue.shift();
      } else {
        break;
      }

      if (nextTrack) {
        selectedTracks.push(nextTrack);
      }
    }
  } else {
    // New fans or fans without preferences see popular music first.
    selectedTracks.push(...availableTracks.slice(0, 30));
  }

  // Load artist information for the selected songs.
  const artistIds = Array.from(
    new Set(selectedTracks.map((track) => track.artist_id))
  );

  const { data: artists } =
    artistIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("id, artist_name, display_name, avatar_url")
          .in("id", artistIds)
      : { data: [] };

  // Generate secure playback and artwork URLs.
  const songs = await Promise.all(
    selectedTracks.map(async (track) => {
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
