
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let preferredGenres: string[] = [];
  let preferredArtistIds: string[] = [];

  if (user) {
    // Load genres the fan has explicitly selected.
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

    // Load recent listening activity.
    const { data: listeningEvents, error: listeningError } =
      await supabase
        .from("music_listening_events")
        .select("track_id, listened_seconds")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

    if (listeningError) {
      console.error("MUSEK listening history error:", listeningError);
    }

    // Load songs the fan has liked.
    const { data: favourites, error: favouritesError } =
      await supabase
        .from("favorite_tracks")
        .select("track_id")
        .eq("user_id", user.id);

    if (favouritesError) {
      console.error("MUSEK favourites loading error:", favouritesError);
    }

    const listenedTrackIds = Array.from(
      new Set(
        (listeningEvents || [])
          .filter((event) => (event.listened_seconds || 0) > 0)
          .map((event) => event.track_id)
      )
    );

    const favouriteTrackIds = Array.from(
      new Set((favourites || []).map((item) => item.track_id))
    );

    const knownTrackIds = Array.from(
      new Set([...listenedTrackIds, ...favouriteTrackIds])
    );

    const artistScores: Record<string, number> = {};
    const genreScores: Record<string, number> = {};

    if (knownTrackIds.length > 0) {
      // Find the artists and genres connected to those songs.
      const { data: knownTracks, error: knownTracksError } =
        await supabase
          .from("music_tracks")
          .select("id, artist_id, genre")
          .in("id", knownTrackIds);

      if (knownTracksError) {
        console.error("MUSEK taste analysis error:", knownTracksError);
      }

      const artistByTrack = new Map<string, string>();
      const genreByTrack = new Map<string, string>();

      (knownTracks || []).forEach((track) => {
        artistByTrack.set(track.id, track.artist_id);

        if (track.genre) {
          genreByTrack.set(
            track.id,
            track.genre.trim().toLowerCase()
          );
        }
      });

      // Listening activity helps MUSEK understand what fans enjoy.
      for (const event of listeningEvents || []) {
        const seconds = event.listened_seconds || 0;

        if (seconds <= 0) continue;

        const artistId = artistByTrack.get(event.track_id);
        const genre = genreByTrack.get(event.track_id);
        const score = Math.min(seconds, 300);

        if (artistId) {
          artistScores[artistId] =
            (artistScores[artistId] || 0) + score;
        }

        if (genre) {
          genreScores[genre] =
            (genreScores[genre] || 0) + score;
        }
      }

      // Liked songs receive an extra recommendation boost.
      for (const trackId of favouriteTrackIds) {
        const artistId = artistByTrack.get(trackId);
        const genre = genreByTrack.get(trackId);

        if (artistId) {
          artistScores[artistId] =
            (artistScores[artistId] || 0) + 300;
        }

        if (genre) {
          genreScores[genre] =
            (genreScores[genre] || 0) + 300;
        }
      }
    }

    // Identify artists the fan engages with most.
    preferredArtistIds = Object.entries(artistScores)
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score >= 30)
      .slice(0, 20)
      .map(([artistId]) => artistId);

    // Identify genres the fan enjoys.
    const learnedGenres = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score >= 30)
      .slice(0, 10)
      .map(([genre]) => genre);

    // Combine selected genres with genres learned from behaviour.
    preferredGenres = Array.from(
      new Set([...preferredGenres, ...learnedGenres])
    );
  }

  // Load published music available for discovery.
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

  // Familiar music: genres and artists the fan already enjoys.
  const familiarTracks = availableTracks
    .filter((track) => {
      const genre = (track.genre || "").trim().toLowerCase();

      return (
        preferredGenres.includes(genre) ||
        preferredArtistIds.includes(track.artist_id)
      );
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

  // Exploration music: introduce artists and genres the fan
  // has not engaged with yet.
  const explorationTracks = availableTracks
    .filter((track) => {
      const genre = (track.genre || "").trim().toLowerCase();

      return (
        !preferredGenres.includes(genre) &&
        !preferredArtistIds.includes(track.artist_id)
      );
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

  const selectedTracks: typeof availableTracks = [];

  const familiarQueue = [...familiarTracks];
  const explorationQueue = [...explorationTracks];

  // Aim for 70% familiar music and 30% new discoveries.
  if (preferredGenres.length > 0 || preferredArtistIds.length > 0) {
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

  // Load artist profiles for the selected songs.
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

  // Generate playable audio and artwork URLs.
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
      const normalizedGenre = genre.trim().toLowerCase();

      const isFamiliarGenre = preferredGenres.includes(
        normalizedGenre
      );

      const isPreferredArtist = preferredArtistIds.includes(
        track.artist_id
      );

      let recommendationReason = "Popular on MUSEK";

      if (isPreferredArtist) {
        recommendationReason = "Because you enjoy this artist";
      } else if (isFamiliarGenre) {
        recommendationReason = `Because you enjoy ${genre}`;
      } else if (
        preferredGenres.length > 0 ||
        preferredArtistIds.length > 0
      ) {
        recommendationReason = "Discover something new";
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
