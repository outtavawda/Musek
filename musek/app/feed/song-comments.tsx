
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  status: "visible" | "hidden";
};

export default function SongComments({
  trackId,
  onVisibleCountChange,
}: {
  trackId: string;
  onVisibleCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTrackArtist, setIsTrackArtist] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadComments() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id ?? null);

    if (user) {
      const { data: track } = await supabase
        .from("music_tracks")
        .select("artist_id")
        .eq("id", trackId)
        .maybeSingle();

      setIsTrackArtist(track?.artist_id === user.id);
    } else {
      setIsTrackArtist(false);
    }

    const { data, error } = await supabase
      .from("music_track_comments")
      .select("id, user_id, comment, created_at, status")
      .eq("track_id", trackId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MUSEK comments error:", error);
      setMessage("Could not load comments.");
    } else {
      const loadedComments = (data || []) as Comment[];

      setComments(loadedComments);

      const publicCount = loadedComments.filter(
        (item) => item.status === "visible"
      ).length;

      onVisibleCountChange?.(publicCount);
    }

    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    void loadComments();
  }, [trackId]);

  async function postComment() {
    if (!userId) {
      setMessage("Please log in to comment.");
      return;
    }

    const trimmedComment = newComment.trim();

    if (!trimmedComment) {
      setMessage("Please write a comment first.");
      return;
    }

    if (trimmedComment.length > 1000) {
      setMessage("Comments must be 1,000 characters or less.");
      return;
    }

    setPosting(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("music_track_comments")
        .insert({
          track_id: trackId,
          user_id: userId,
          comment: trimmedComment,
        });

      if (error) throw error;

      setNewComment("");
      setMessage("Comment posted!");
      await loadComments();
    } catch (error) {
      console.error("MUSEK comment error:", error);
      setMessage("Could not post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("music_track_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId);

    if (error) {
      console.error("MUSEK delete comment error:", error);
      setMessage("Could not delete comment.");
      return;
    }

    setMessage("Comment deleted.");
    await loadComments();
  }

  async function moderateComment(
    commentId: string,
    newStatus: "visible" | "hidden"
  ) {
    if (!userId || !isTrackArtist) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("music_track_comments")
      .update({ status: newStatus })
      .eq("id", commentId)
      .eq("track_id", trackId);

    if (error) {
      console.error("MUSEK moderation error:", error);
      setMessage("Could not update this comment.");
      return;
    }

    setMessage(
      newStatus === "hidden"
        ? "Comment hidden."
        : "Comment restored."
    );

    await loadComments();
  }

  const visibleCount = comments.filter(
    (item) => item.status === "visible"
  ).length;

  return (
    <section
      style={{
        marginTop: "18px",
        padding: "15px",
        background: "rgba(15, 10, 24, 0.95)",
        border: "1px solid #43246a",
        borderRadius: "15px",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: "17px" }}>
        💬 Comments ({visibleCount})
      </h3>

      <textarea
        value={newComment}
        onChange={(event) => setNewComment(event.target.value)}
        placeholder="Share your thoughts about this song..."
        maxLength={1000}
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #6941a5",
          background: "#17101f",
          color: "white",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginTop: "8px",
        }}
      >
        <small style={{ color: "#aaa" }}>
          {newComment.length}/1000
        </small>

        <button
          type="button"
          onClick={postComment}
          disabled={posting || !newComment.trim()}
          style={{
            padding: "9px 16px",
            border: "none",
            borderRadius: "20px",
            background: "#9333ea",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            opacity: posting || !newComment.trim() ? 0.6 : 1,
          }}
        >
          {posting ? "Posting..." : "Post Comment"}
        </button>
      </div>

      {message && (
        <p role="status" style={{ color: "#d8b4fe", fontSize: "13px" }}>
          {message}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#aaa" }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: "14px" }}>
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div style={{ marginTop: "15px" }}>
          {comments.map((item) => (
            <div
              key={item.id}
              style={{
                padding: "12px 0",
                borderTop: "1px solid #352544",
                opacity: item.status === "hidden" ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <strong style={{ fontSize: "13px", color: "#d8b4fe" }}>
                  {item.user_id === userId ? "You" : "MUSEK Listener"}
                </strong>

                <div style={{ display: "flex", gap: "8px" }}>
                  {isTrackArtist && (
                    <button
                      type="button"
                      onClick={() =>
                        moderateComment(
                          item.id,
                          item.status === "visible" ? "hidden" : "visible"
                        )
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#c4b5fd",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {item.status === "visible" ? "Hide" : "Restore"}
                    </button>
                  )}

                  {item.user_id === userId && (
                    <button
                      type="button"
                      onClick={() => deleteComment(item.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#fca5a5",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {item.status === "hidden" && isTrackArtist && (
                <small style={{ color: "#fbbf24" }}>
                  Hidden from the public
                </small>
              )}

              <p
                style={{
                  margin: "7px 0",
                  fontSize: "14px",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {item.comment}
              </p>

              <small style={{ color: "#888" }}>
                {new Date(item.created_at).toLocaleDateString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
