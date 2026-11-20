"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SongComments from "./song-comments";

type FeedSong = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl: string | null;
  artistId: string;
  recommendationReason: string;
};

export default function FeedClient({
  songs,
}: {
  songs: FeedSong[];
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [skipLoading, setSkipLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const listenStart = useRef<number | null>(null);
  const listenSong = useRef<string | null>(null);
  const savedListen = useRef(false);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from("favorite_tracks")
          .select("track_id")
          .eq("user_id", user.id);

        if (error) throw error;

        setFavorites((data || []).map((item) => item.track_id));

        const { error: preferenceError } = await supabase.rpc(
          "update_my_music_preferences"
        );

        if (preferenceError) {
          console.error("MUSEK preference update error:", preferenceError);
        }
      } catch (error) {
        console.error("MUSEK favourites loading error:", error);
        setMessage("Could not load your saved songs.");
      }
    }

    loadFavorites();
  }, []);

  useEffect(() => {
    async function loadCounts() {
      if (songs.length === 0) return;

      const supabase = createClient();
      const trackIds = songs.map((song) => song.id);

      try {
        const { data: likes, error: likesError } = await supabase.rpc(
          "get_track_like_counts",
          { p_track_ids: trackIds }
        );

        if (likesError) throw likesError;

        const newLikeCounts: Record<string, number> = {};

        (likes || []).forEach(
          (item: { track_id: string; like_count: number | string }) => {
            newLikeCounts[item.track_id] = Number(item.like_count) || 0;
          }
        );

        setLikeCounts(newLikeCounts);
      } catch (error) {
        console.error("MUSEK public Like counts error:", error);
      }

      try {
        const { data: comments, error: commentsError } = await supabase.rpc(
          "get_track_comment_counts",
          { p_track_ids: trackIds }
        );

        if (commentsError) throw commentsError;

        const newCommentCounts: Record<string, number> = {};

        (comments || []).forEach(
          (item: { track_id: string; comment_count: number | string }) => {
            newCommentCounts[item.track_id] =
              Number(item.comment_count) || 0;
          }
        );

        setCommentCounts(newCommentCounts);
      } catch (error) {
        console.error("MUSEK public comment counts error:", error);
      }
    }

    loadCounts();
  }, [songs]);

  function updateCommentCount(trackId: string, count: number) {
    setCommentCounts((current) => ({
      ...current,
      [trackId]: Math.max(0, count),
    }));
  }

  async function toggleFavorite(songId: string) {
    if (!userId) {
      setMessage("Please log in to like and save songs.");
      return;
    }

    setFavoriteLoading(songId);
    setMessage("");

    try {
      const supabase = createClient();
      const alreadyFavorite = favorites.includes(songId);

      if (alreadyFavorite) {
        const { error } = await supabase
          .from("favorite_tracks")
          .delete()
          .eq("user_id", userId)
          .eq("track_id", songId);

        if (error) throw error;

        setFavorites((current) =>
          current.filter((id) => id !== songId)
        );

        setLikeCounts((current) => ({
          ...current,
          [songId]: Math.max(0, (current[songId] || 0) - 1),
        }));

        setMessage("Song removed from your favourites.");
      } else {
        const { error } = await supabase
          .from("favorite_tracks")
          .insert({
            user_id: userId,
            track_id: songId,
          });

        if (error) throw error;

        setFavorites((current) =>
          current.includes(songId) ? current : [...current, songId]
        );

        setLikeCounts((current) => ({
          ...current,
          [songId]: (current[songId] || 0) + 1,
        }));

        setMessage("Song added to your favourites!");
      }

      const { error: preferenceError } = await supabase.rpc(
        "update_my_music_preferences"
      );

      if (preferenceError) {
        console.error("MUSEK preference update error:", preferenceError);
      }
    } catch (error) {
      console.error("MUSEK Like error:", error);

      setMessage(
        error instanceof Error
          ? "Could not update Like: " + error.message
          : "Could not update Like."
      );
    } finally {
      setFavoriteLoading(null);
    }
  }
