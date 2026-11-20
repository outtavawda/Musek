
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FollowArtist({
  artistId,
}: {
  artistId: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFollowStatus() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.account_type !== "fan") {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("artist_follows")
        .select("id")
        .eq("fan_id", user.id)
        .eq("artist_id", artistId)
        .maybeSingle();

      if (!error) {
        setIsFollowing(!!data);
      }

      setLoading(false);
    }

    loadFollowStatus();
  }, [artistId]);

  async function toggleFollow() {
    if (!userId || saving) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      isFollowing ? "unfollow_artist" : "follow_artist",
      { p_artist_id: artistId }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setIsFollowing(!isFollowing);
    }

    setSaving(false);
  }

  if (loading || !userId) return null;

  return (
    <div style={{ margin: "20px 0" }}>
      <button
        type="button"
        onClick={toggleFollow}
        disabled={saving}
        className="primaryButton"
      >
        {saving
          ? "Please wait..."
          : isFollowing
          ? "✓ Following"
          : "+ Follow Artist"}
      </button>

      {message && (
        <p className="muted" style={{ marginTop: "8px" }}>
          {message}
        </p>
      )}
    </div>
  );
}
