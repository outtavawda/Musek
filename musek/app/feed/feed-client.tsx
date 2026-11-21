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
  async function shareSong(song: FeedSong) {
    const shareUrl = `${window.location.origin}/artist/${song.artistId}`;

    const shareData = {
      title: `${song.title} - ${song.artistName} | MUSEK`,
      text: `Listen to ${song.title} by ${song.artistName} on MUSEK!`,
      url: shareUrl,
    };

    setMessage("");

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage("Thanks for sharing MUSEK!");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Song link copied! Share it with your friends.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Song link copied! Share it with your friends.");
      } catch {
        setMessage("Could not share the link. Please try again.");
      }
    }
  }

  async function saveListeningTime() {
    if (
      !userId ||
      !listenSong.current ||
      listenStart.current === null ||
      savedListen.current
    ) {
      return;
    }

    const songId = listenSong.current;
    const seconds = Math.floor(
      (Date.now() - listenStart.current) / 1000
    );

    savedListen.current = true;
    listenStart.current = null;
    listenSong.current = null;

    if (seconds < 1) return;

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("record_music_listen", {
        p_track_id: songId,
        p_listened_seconds: seconds,
      });

      if (error) {
        console.error("MUSEK listening history error:", error);
      } else {
        const { error: preferenceError } = await supabase.rpc(
          "update_my_music_preferences"
        );

        if (preferenceError) {
          console.error("MUSEK preference update error:", preferenceError);
        }
      }
    } catch (error) {
      console.error("MUSEK listening history error:", error);
    }
  }

  function startListening(songId: string) {
    if (!userId) return;
    if (listenSong.current === songId) return;

    void saveListeningTime();

    listenSong.current = songId;
    listenStart.current = Date.now();
    savedListen.current = false;
  }

  async function skipSong(songId: string, nextSongId?: string) {
    if (!userId) {
      setMessage("Please log in to skip songs.");
      return;
    }

    if (skipLoading) return;

    setSkipLoading(songId);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("record_music_skip", {
        p_track_id: songId,
      });

      if (error) throw error;

      if (listenSong.current === songId) {
        await saveListeningTime();
      }

      const { error: preferenceError } = await supabase.rpc(
        "update_my_music_preferences"
      );

      if (preferenceError) {
        console.error("MUSEK preference update error:", preferenceError);
      }

      if (nextSongId) {
        document.getElementById(`feed-song-${nextSongId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        setMessage("You've reached the end of your discovery feed.");
      }
    } catch (error) {
      console.error("MUSEK skip tracking error:", error);

      setMessage(
        error instanceof Error
          ? "Could not record skip: " + error.message
          : "Could not record skip."
      );
    } finally {
      setSkipLoading(null);
    }
  }

  useEffect(() => {
    const handlePageHide = () => {
      void saveListeningTime();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      void saveListeningTime();
    };
  }, [userId]);
  return (
    <main className="musek-feed">
      <style>{`
        .musek-feed{min-height:100svh;background:radial-gradient(ellipse at 50% 0%,rgba(126,34,206,.18),transparent 42%),#08070d;color:#fff;padding:0 22px 36px}
        .musek-feed *{box-sizing:border-box}
        .feed-topbar{max-width:1180px;height:76px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.09)}
        .feed-logo{font-size:25px;font-weight:950;letter-spacing:-1.5px}.feed-logo span{color:#c084fc}
        .feed-nav{display:flex;align-items:center;gap:10px}.feed-nav a{color:#e9d5ff;text-decoration:none;border:1px solid rgba(192,132,252,.28);background:rgba(88,28,135,.15);padding:10px 15px;border-radius:999px;font-size:13px;font-weight:700}
        .feed-intro{max-width:1180px;margin:0 auto;padding:30px 0 22px;display:flex;justify-content:space-between;align-items:end;gap:20px}
        .feed-kicker{color:#c084fc;font-size:11px;font-weight:800;letter-spacing:2.6px;margin:0 0 10px}
        .feed-intro h1{font-size:clamp(30px,4vw,46px);letter-spacing:-2px;line-height:1;margin:0}
        .feed-intro p{color:#a7a0b2;font-size:14px;line-height:1.6;margin:10px 0 0}
        .feed-pill{white-space:nowrap;border:1px solid rgba(192,132,252,.25);background:rgba(126,34,206,.12);color:#e9d5ff;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:700}
        .feed-status{max-width:1180px;margin:0 auto 14px;text-align:center;color:#e9d5ff;font-size:13px}
        .feed-list{max-width:1180px;height:min(690px,calc(100svh - 190px));min-height:560px;margin:0 auto;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;display:flex;flex-direction:column;gap:18px;padding:2px 3px 20px;scrollbar-width:thin;scrollbar-color:#000 #000}
        .feed-card{flex:0 0 100%;min-height:540px;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);border:1px solid rgba(192,132,252,.22);border-radius:24px;overflow:hidden;background:linear-gradient(135deg,#17111f,#0e0c14);scroll-snap-align:start;scroll-snap-stop:always;box-shadow:0 18px 60px rgba(0,0,0,.28)}
        .feed-art{position:relative;min-height:540px;background:linear-gradient(135deg,#321052,#100d18);overflow:hidden}
        .feed-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .feed-art:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 45%,rgba(10,8,15,.18)),linear-gradient(0deg,rgba(8,6,12,.72),transparent 55%)}
        .feed-art-tag{position:absolute;z-index:1;left:22px;top:22px;border:1px solid rgba(255,255,255,.25);background:rgba(10,8,15,.48);backdrop-filter:blur(12px);padding:8px 12px;border-radius:999px;font-size:10px;letter-spacing:2px;font-weight:800;color:#f3e8ff}
        .feed-art-title{position:absolute;z-index:1;left:26px;right:24px;bottom:26px;text-shadow:0 3px 24px rgba(0,0,0,.7)}
        .feed-art-title small{display:block;color:#e9d5ff;font-size:11px;letter-spacing:2px;font-weight:800;margin-bottom:8px}
        .feed-art-title strong{display:block;font-size:clamp(25px,3vw,40px);line-height:1.05;letter-spacing:-1.4px;overflow-wrap:anywhere}
        .feed-details{padding:25px;display:flex;flex-direction:column;min-width:0;overflow-y:auto}
        .feed-reason{display:inline-flex;align-self:flex-start;max-width:100%;color:#e9d5ff;background:rgba(126,34,206,.16);border:1px solid rgba(192,132,252,.25);padding:8px 11px;border-radius:999px;font-size:11px;font-weight:700;margin-bottom:13px}
        .feed-track-name{font-size:25px;letter-spacing:-.8px;margin:0 0 5px;overflow-wrap:anywhere}
        .feed-artist{font-size:14px;color:#d8cde5;margin:0 0 5px}
        .feed-genre{font-size:12px;color:#93899f;margin:0 0 18px}
        .feed-actions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 15px}
        .feed-actions button,.feed-actions a{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(192,132,252,.34);border-radius:999px;padding:9px 12px;background:#1a1324;color:#f8f4ff;font-size:12px;font-weight:750;text-decoration:none;cursor:pointer}
        .feed-actions button:disabled{opacity:.55;cursor:wait}
        .feed-actions .feed-like{background:linear-gradient(135deg,#7e22ce,#581c87);border-color:#a855f7}
        .feed-actions .feed-skip{background:rgba(126,34,206,.22)}
        .feed-counts{display:flex;gap:16px;color:#c4b5d4;font-size:12px;margin:0 0 12px}
        .feed-audio{width:100%;display:block;margin:0 0 4px;accent-color:#a855f7}
        .feed-empty{max-width:700px;margin:40px auto;padding:42px 24px;text-align:center;border:1px solid rgba(192,132,252,.2);border-radius:22px;background:#15101d;color:#c4b5d4}
        @media(max-width:760px){.musek-feed{padding:0 12px 24px}.feed-topbar{height:66px}.feed-intro{padding:24px 2px 18px;align-items:flex-start;flex-direction:column;gap:12px}.feed-intro h1{font-size:34px}.feed-list{height:calc(100svh - 205px);min-height:560px;gap:14px}.feed-card{grid-template-columns:1fr;grid-template-rows:280px auto;min-height:0}.feed-art{min-height:280px}.feed-art-title{left:18px;bottom:17px}.feed-art-title strong{font-size:28px}.feed-details{padding:18px;overflow:visible}.feed-track-name{font-size:22px}.feed-nav a{padding:9px 12px}.feed-pill{font-size:11px}}
        @media(max-width:420px){.feed-logo{font-size:22px}.feed-nav{gap:6px}.feed-nav a{font-size:11px;padding:8px 10px}.feed-list{height:calc(100svh - 215px)}.feed-card{grid-template-rows:240px auto}.feed-art{min-height:240px}.feed-details{padding:15px}.feed-actions button,.feed-actions a{padding:9px 10px;font-size:11px}}
      `}</style>

      <header className="feed-topbar">
        <Link className="feed-logo" href="/">MUSEK<span>.</span></Link>
        <nav className="feed-nav" aria-label="Music navigation">
          <Link href="/discover-music">Discover Music</Link>
          <Link href="/fan-dashboard">My Dashboard</Link>
        </nav>
      </header>

      <section className="feed-intro">
        <div>
          <p className="feed-kicker">MADE FOR YOUR TASTE</p>
          <h1>Your Music Feed</h1>
          <p>Find your next favourite song. Keep listening, liking and discovering.</p>
        </div>
        <div className="feed-pill">✦ PERSONALIZED DISCOVERY</div>
      </section>

      {message && <p className="feed-status" role="status">{message}</p>}

      {songs.length === 0 ? (
        <div className="feed-empty">
          <div style={{fontSize:"38px",marginBottom:"12px"}}>♫</div>
          <h2 style={{color:"white",margin:"0 0 8px"}}>Your next discovery is coming</h2>
          <p style={{margin:0}}>No published songs are available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="feed-list">
          {songs.map((song, index) => {
            const isFavorite = favorites.includes(song.id);
            const isLoading = favoriteLoading === song.id;
            const isSkipping = skipLoading === song.id;
            const likeCount = likeCounts[song.id] || 0;
            const commentCount = commentCounts[song.id] || 0;
            const nextSong = songs[index + 1];

            return (
              <article id={\`feed-song-\${song.id}\`} key={song.id} className="feed-card">
                <div className="feed-art">
                  {song.artworkUrl ? (
                    <img src={song.artworkUrl} alt={\`\${song.title} cover\`} />
                  ) : (
                    <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",fontSize:"110px",color:"#d8b4fe"}}>♫</div>
                  )}
                  <div className="feed-art-tag">MUSEK • DISCOVER</div>
                  <div className="feed-art-title">
                    <small>NOW IN YOUR FEED</small>
                    <strong>{song.title}</strong>
                  </div>
                </div>

                <div className="feed-details">
                  <div className="feed-reason">✦ {song.recommendationReason}</div>
                  <h2 className="feed-track-name">{song.title}</h2>
                  <p className="feed-artist">{song.artistName}</p>
                  <p className="feed-genre">{song.genre}</p>

                  <div className="feed-actions">
                    <button type="button" className="feed-like" onClick={() => toggleFavorite(song.id)} disabled={isLoading} aria-pressed={isFavorite}>
                      {isLoading ? "Saving..." : isFavorite ? "♥ Liked" : "♡ Like"}
                    </button>
                    <button type="button" onClick={() => shareSong(song)}>↗ Share</button>
                    <button
                      type="button"
                      className="feed-skip"
                      onClick={() => {
                        document.getElementById(\`feed-song-\${song.id}\`)?.querySelector("audio")?.pause();
                        void skipSong(song.id, nextSong?.id);
                      }}
                      disabled={Boolean(skipLoading)}
                    >
                      {isSkipping ? "Skipping..." : "⏭ Skip"}
                    </button>
                    <Link href={\`/artist/\${song.artistId}\`}>Artist Profile ↗</Link>
                  </div>

                  <div className="feed-counts">
                    <span>♥ {likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
                    <span>💬 {commentCount} {commentCount === 1 ? "Comment" : "Comments"}</span>
                  </div>

                  {song.audioUrl && (
                    <audio
                      className="feed-audio"
                      controls
                      preload="none"
                      src={song.audioUrl}
                      onPlay={() => startListening(song.id)}
                      onPause={() => {
                        if (listenSong.current === song.id) void saveListeningTime();
                      }}
                      onEnded={() => {
                        if (listenSong.current === song.id) void saveListeningTime();
                      }}
                    />
                  )}

                  <SongComments trackId={song.id} onVisibleCountChange={(count) => updateCommentCount(song.id, count)} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
