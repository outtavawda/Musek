"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_SOCIAL_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

type Post = {
  id: string;
  user_id: string;
  caption: string;
  post_type: "text" | "image" | "video" | "music";
  media_url: string | null;
  music_url: string | null;
  music_title: string | null;
  created_at: string;
  author_name: string;
  avatar_url: string | null;
  likes: number;
  comments_count: number;
  liked: boolean;
};
type Comment = { id: string; post_id: string; user_id: string; comment: string; created_at: string; display_name: string };

export default function SocialFeed({ userId, displayName, avatarUrl }: {
  userId: string; displayName: string; avatarUrl: string | null;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase.from("social_posts")
      .select("id,user_id,caption,post_type,media_url,music_url,music_title,created_at")
      .order("created_at", { ascending: false }).limit(40);
    if (error) {
      setNotice("Social Feed database is not ready yet. Apply migration 010 in Supabase SQL Editor.");
      setLoading(false);
      return;
    }
    const rows = data || [];
    const ids = rows.map((post) => post.id);
    const userIds = Array.from(new Set(rows.map((post) => post.user_id)));
    const [profilesResult, likesResult, commentsResult] = await Promise.all([
      userIds.length ? supabase.from("user_profiles").select("id,display_name,artist_name,avatar_url").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("social_post_likes").select("post_id,user_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("social_post_comments").select("post_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));
    const likeRows = likesResult.data || [];
    const commentRows = commentsResult.data || [];
    setPosts(rows.map((post: any) => {
      const profile: any = profileMap.get(post.user_id);
      const postLikes = likeRows.filter((like: any) => like.post_id === post.id);
      return {
        ...post,
        author_name: profile?.artist_name || profile?.display_name || "YASUH Member",
        avatar_url: profile?.avatar_url || null,
        likes: postLikes.length,
        comments_count: commentRows.filter((item: any) => item.post_id === post.id).length,
        liked: postLikes.some((like: any) => like.user_id === userId),
      } as Post;
    }));
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadPosts();
    const channel = supabase.channel("musek-social-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_posts" }, () => loadPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "social_post_likes" }, () => loadPosts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_post_comments" }, () => loadPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPosts, supabase]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (posting) return;
    if (!caption.trim() && !file && !musicUrl.trim()) {
      setNotice("Add a caption, photo/video or music link before publishing.");
      return;
    }
    if (file && !ALLOWED_SOCIAL_MEDIA_TYPES.includes(file.type)) {
      setNotice("Use a JPG, PNG or WebP photo, or an MP4/WebM video.");
      return;
    }
    if (file && file.size > 100 * 1024 * 1024) {
      setNotice("Media must be 100 MB or smaller.");
      return;
    }
    if (musicUrl.trim()) {
      try { new URL(musicUrl.trim()); } catch { setNotice("Enter a valid music URL."); return; }
    }
    setPosting(true);
    setNotice("");
    let mediaUrl: string | null = null;
    let uploadedMediaPath: string | null = null;
    let postType: Post["post_type"] = "text";
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = userId + "/" + crypto.randomUUID() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("social-posts").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (uploadError) {
        setPosting(false);
        setNotice("Media upload failed: " + uploadError.message + ". Check that migration 010 has been applied.");
        return;
      }
      uploadedMediaPath = path;
      mediaUrl = supabase.storage.from("social-posts").getPublicUrl(path).data.publicUrl;
      postType = file.type.startsWith("video/") ? "video" : "image";
    } else if (musicUrl.trim()) postType = "music";

    const { error } = await supabase.from("social_posts").insert({
      user_id: userId,
      caption: caption.trim(),
      post_type: postType,
      media_url: mediaUrl,
      music_url: musicUrl.trim() || null,
      music_title: musicTitle.trim() || null,
    });
    setPosting(false);
    if (error) {
      if (uploadedMediaPath) {
        const { error: cleanupError } = await supabase.storage
          .from("social-posts")
          .remove([uploadedMediaPath]);
        setNotice(
          cleanupError
            ? "Post could not be published: " + error.message + ". The uploaded media could not be cleaned up: " + cleanupError.message
            : "Post could not be published: " + error.message + ". The uploaded media was removed."
        );
      } else {
        setNotice("Post could not be published: " + error.message);
      }
      return;
    }
    setCaption(""); setMusicUrl(""); setMusicTitle(""); setFile(null);
    const picker = document.getElementById("musek-social-media") as HTMLInputElement | null;
    if (picker) picker.value = "";
    setNotice("Your post is live on YASUH.");
    await loadPosts();
  };

  const toggleLike = async (post: Post) => {
    setPosts(current => current.map(item => item.id === post.id
      ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item));
    const result = post.liked
      ? await supabase.from("social_post_likes").delete().eq("post_id", post.id).eq("user_id", userId)
      : await supabase.from("social_post_likes").insert({ post_id: post.id, user_id: userId });
    if (result.error) {
      setNotice("Like could not be updated: " + result.error.message);
      await loadPosts();
    }
  };

  const loadComments = async (postId: string) => {
    const { data, error } = await supabase.from("social_post_comments")
      .select("id,post_id,user_id,comment,created_at")
      .eq("post_id", postId).order("created_at", { ascending: true }).limit(100);
    if (error) { setNotice("Comments could not be loaded: " + error.message); return; }
    const rows = data || [];
    const ids = Array.from(new Set(rows.map((row: any) => row.user_id)));
    const { data: profiles } = ids.length
      ? await supabase.from("user_profiles").select("id,display_name,artist_name").in("id", ids)
      : { data: [] as any[] };
    const names = new Map((profiles || []).map((profile: any) => [profile.id, profile.artist_name || profile.display_name || "YASUH Member"]));
    setComments(current => ({ ...current, [postId]: rows.map((row: any) => ({ ...row, display_name: names.get(row.user_id) || "YASUH Member" })) }));
  };

  const submitComment = async (postId: string) => {
    const value = (commentDrafts[postId] || "").trim();
    if (!value || commentBusy) return;
    setCommentBusy(true);
    const { error } = await supabase.from("social_post_comments").insert({ post_id: postId, user_id: userId, comment: value.slice(0, 1000) });
    setCommentBusy(false);
    if (error) { setNotice("Comment could not be published: " + error.message); return; }
    setCommentDrafts(current => ({ ...current, [postId]: "" }));
    await loadComments(postId);
    // Reload aggregate counts from the database; the realtime subscription may
    // also refresh this list, so avoid incrementing an already-updated count.
    await loadPosts();
  };

  const initials = displayName.trim().slice(0, 1).toUpperCase() || "M";

  return (
    <section id="social-feed" className="mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black tracking-[.25em] text-purple-300">YOUR MUSIC COMMUNITY</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">The Social Feed<span className="text-purple-400">.</span></h2><p className="mt-2 text-sm text-gray-400">Share your sound, your moments and what inspires you.</p></div>
        <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-200">YASUH COMMUNITY</span>
      </div>

      <form onSubmit={publish} className="overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-br from-[#1b1429] to-[#10101b] p-5 shadow-[0_20px_70px_rgba(88,28,135,.12)] sm:p-6">
        <div className="flex gap-3">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-11 w-11 rounded-full border border-purple-300/30 object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-purple-300/30 bg-purple-500/20 font-black text-purple-100">{initials}</div>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-white">{displayName}</p>
            <p className="mt-0.5 text-xs text-gray-500">Share something with the YASUH community</p>
          </div>
        </div>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} rows={3} placeholder="What's happening in your world of music?" className="mt-5 w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 focus:border-purple-400/60" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm text-gray-300 hover:border-purple-400/40">
            <span className="text-xl">▧</span><span className="min-w-0 flex-1 truncate">{file ? file.name : "Add photo or video"}</span>
            <input
              id="musek-social-media"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="sr-only"
              onChange={e => {
                const selectedFile = e.target.files?.[0] || null;
                if (!selectedFile) {
                  setFile(null);
                  return;
                }
                if (!ALLOWED_SOCIAL_MEDIA_TYPES.includes(selectedFile.type)) {
                  setFile(null);
                  e.target.value = "";
                  setNotice("Unsupported file type. Use JPG, PNG or WebP photos, or MP4/WebM videos.");
                  return;
                }
                if (selectedFile.size > 100 * 1024 * 1024) {
                  setFile(null);
                  e.target.value = "";
                  setNotice("Media must be 100 MB or smaller.");
                  return;
                }
                setFile(selectedFile);
                setNotice("");
              }}
            />
          </label>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5">
            <input value={musicTitle} onChange={e => setMusicTitle(e.target.value)} placeholder="Track title (optional)" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-500" />
            <input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="Paste a music link (optional)" className="mt-1 w-full bg-transparent text-xs text-purple-200 outline-none placeholder:text-gray-500" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500">{caption.length}/2200 characters · Media up to 100 MB</p>
          <button type="submit" disabled={posting} className="rounded-xl border border-fuchsia-200/60 bg-gradient-to-r from-[#e9d5ff] via-[#a855f7] to-[#7e22ce] px-6 py-3 text-sm font-black text-[#180d27] shadow-[0_0_22px_rgba(168,85,247,.25)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50">{posting ? "Publishing…" : "Publish post ↗"}</button>
        </div>
      </form>

      {notice && <p role="status" className="mt-4 rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">{notice}</p>}

      <div className="mt-7 space-y-5">
        {loading ? <div className="rounded-2xl border border-white/10 bg-[#11111d] p-8 text-sm text-gray-400">Loading the community feed…</div> : posts.length === 0 ? <div className="rounded-2xl border border-dashed border-purple-300/20 bg-[#11111d]/70 p-10 text-center"><div className="text-4xl text-purple-300">♫</div><h3 className="mt-3 text-xl font-black">Your community starts here</h3><p className="mt-2 text-sm text-gray-400">Be the first to share a moment, a new track or a photo.</p></div> : posts.map(post => (
          <article key={post.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#11111d] shadow-[0_16px_50px_rgba(0,0,0,.18)]">
            <div className="flex items-center gap-3 p-5">
              {post.avatar_url ? <img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full border border-purple-300/30 object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full border border-purple-300/30 bg-purple-500/20 font-black text-purple-100">{post.author_name.slice(0, 1).toUpperCase()}</div>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-white">{post.author_name}</p><p className="text-[11px] text-gray-500">{new Date(post.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></div>
              <span className="rounded-full border border-purple-300/15 bg-purple-500/10 px-2.5 py-1 text-[9px] font-black tracking-wider text-purple-200">{post.post_type.toUpperCase()}</span>
            </div>
            {post.caption && <p className="whitespace-pre-wrap break-words px-5 pb-4 text-sm leading-7 text-gray-200">{post.caption}</p>}
            {post.media_url && (post.post_type === "video"
              ? <video src={post.media_url} controls playsInline preload="metadata" className="max-h-[620px] w-full bg-black object-contain" />
              : <img src={post.media_url} alt="Community post" loading="lazy" className="max-h-[620px] w-full bg-black object-contain" />)}
            {post.post_type === "music" && post.music_url && <div className="mx-5 mb-4 rounded-2xl border border-purple-300/20 bg-gradient-to-r from-[#28163d] to-[#151020] p-4"><p className="text-[10px] font-black tracking-[.2em] text-purple-300">MUSIC SHARED</p><p className="mt-1 font-bold text-white">{post.music_title || "Listen to this track"}</p><a href={post.music_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-purple-500/20 px-3 py-2 text-xs font-bold text-purple-100 hover:bg-purple-500/30">Open music link ↗</a></div>}
            {post.music_url && post.post_type !== "music" && <a href={post.music_url} target="_blank" rel="noreferrer" className="mx-5 mb-4 inline-flex rounded-lg border border-purple-300/20 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-200">♫ {post.music_title || "Listen to shared music"} ↗</a>}
            <div className="flex items-center gap-5 border-t border-white/[.07] px-5 py-3">
              <button onClick={() => toggleLike(post)} className={post.liked ? "text-sm font-bold text-pink-300" : "text-sm font-semibold text-gray-400 hover:text-pink-200"}>{post.liked ? "♥ Liked" : "♡ Like"} <span className="ml-1 text-xs opacity-70">{post.likes}</span></button>
              <button onClick={async () => { const next = openComments === post.id ? null : post.id; setOpenComments(next); if (next) await loadComments(post.id); }} className="text-sm font-semibold text-gray-400 hover:text-purple-200">Comment <span className="ml-1 text-xs opacity-70">{post.comments_count}</span></button>
            </div>
            {openComments === post.id && <div className="border-t border-white/[.07] bg-black/15 p-4 sm:p-5">
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">{(comments[post.id] || []).map(comment => <div key={comment.id} className="rounded-xl bg-white/[.04] px-3 py-2"><p className="text-xs font-bold text-purple-200">{comment.display_name}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-200">{comment.comment}</p></div>)}{(comments[post.id] || []).length === 0 && <p className="text-xs text-gray-500">No comments yet. Start the conversation.</p>}</div>
              <div className="flex gap-2"><input value={commentDrafts[post.id] || ""} onChange={e => setCommentDrafts(current => ({ ...current, [post.id]: e.target.value }))} maxLength={1000} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-purple-400/50" /><button onClick={() => submitComment(post.id)} disabled={commentBusy || !(commentDrafts[post.id] || "").trim()} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">Send</button></div>
            </div>}
          </article>
        ))}
      </div>
    </section>
  );
}
