
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FollowArtist({
  artistId,
}: {
  artistId: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFan, setIsFan] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFollowStatus() {
      const supabase = createClient();

      const { data: count, error: countError } = await supabase.rpc(
        "get_artist_follower_count",
        { p_artist_id: artistId }
      );

      if (!countError && count !== null) {
        setFollowerCount(Number(count));
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setMessage("Login check failed: " + authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setMessage("Log in with a Fan account to follow artists.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage("Profile check failed: " + profileError.message);
        setLoading(false);
        return;
      }

      if (profile?.account_type !== "fan") {
        setMessage("Following artists is available to Fan accounts.");
        setLoading(false);
        return;
      }

      setIsFan(true);

      const { data, error } = await supabase
        .from("artist_follows")
        .select("id")
        .eq("fan_id", user.id)
        .eq("artist_id", artistId)
        .maybeSingle();

      if (error) {
        setMessage("Follow check failed: " + error.message);
      } else {
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
    const action = isFollowing ? "unfollow_artist" : "follow_artist";

    const { error } = await supabase.rpc(action, {
      p_artist_id: artistId,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setIsFollowing(!isFollowing);
      setFollowerCount((current) =>
        Math.max(0, current + (isFollowing ? -1 : 1))
      );
    }

    setSaving(false);
  }

  return (
    <div style={{ margin: "20px 0" }}>
      <p style={{ marginBottom: "12px" }}>
        <strong>{followerCount.toLocaleString()}</strong>{" "}
        {followerCount === 1 ? "Follower" : "Followers"}
      </p>

      {loading ? (
        <p className="muted">Checking Follow status...</p>
      ) : isFan ? (
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
      ) : (
        <p className="muted">{message}</p>
      )}

      {message && isFan && (
        <p className="muted" style={{ marginTop: "8px" }}>
          {message}
        </p>
      )}
    </div>
  );
}
