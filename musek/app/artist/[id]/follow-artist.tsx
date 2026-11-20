
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFollowStatus() {
      const supabase = createClient();

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
        setMessage("Please log in with a Fan account to follow artists.");
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

  if (loading) {
    return <p className="muted">Checking Follow status...</p>;
  }

  if (!isFan) {
    return (
      <p className="muted" style={{ margin: "20px 0" }}>
        {message}
      </p>
    );
  }

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
