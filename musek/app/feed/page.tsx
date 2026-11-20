
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    selectedTracks.push(...availableTracks.slice(0, 30));
  }

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

      const genre = track.genre || "Music";

      const isFamiliar = preferredGenres.includes(
        genre.trim().toLowerCase()
      );

      let recommendationReason = "Popular on MUSEK";

      if (preferredGenres.length > 0) {
        recommendationReason = isFamiliar
          ? `Because you enjoy ${genre}`
          : "Discover something new";
      }

      return {
        id: track.id,
        title: track.title,
        artistName:
          artist?.artist_name ||
          artist?.display_name ||
          "MUSEK Artist",
        genre,
        audioUrl: audio?.signedUrl || null,
        artworkUrl,
        artistId: track.artist_id,
        recommendationReason,
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
