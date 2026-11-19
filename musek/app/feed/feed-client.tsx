
"use client";

type FeedSong = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  audioUrl: string | null;
  artworkUrl: string | null;
  artistId: string;
};

export default function FeedClient({
  songs,
}: {
  songs: FeedSong[];
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090d",
        color: "white",
        padding: "25px 15px 50px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "25px" }}>
        <h1 style={{ fontSize: "32px", margin: 0 }}>
          MUSEK<span style={{ color: "#a855f7" }}>.</span>
        </h1>
        <p style={{ color: "#aaa" }}>Discover your next favourite song</p>
      </header>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <span style={{ color: "#c084fc", fontWeight: "bold" }}>
          FOR YOU
        </span>
        <span style={{ color: "#777", marginLeft: "25px" }}>
          TRENDING
        </span>
        <span style={{ color: "#777", marginLeft: "25px" }}>
          NEW
        </span>
      </div>

      {songs.length === 0 ? (
        <p style={{ textAlign: "center", color: "#aaa" }}>
          No published songs are available yet.
        </p>
      ) : (
        <div
          style={{
            maxWidth: "650px",
            margin: "0 auto",
            display: "grid",
            gap: "25px",
          }}
        >
          {songs.map((song) => (
            <article
              key={song.id}
              style={{
                position: "relative",
                minHeight: "650px",
                height: "75vh",
                maxHeight: "850px",
                borderRadius: "20px",
                overflow: "hidden",
                background: "#191522",
                border: "1px solid #43246a",
                scrollSnapAlign: "start",
              }}
            >
              {song.artworkUrl ? (
                <img
                  src={song.artworkUrl}
                  alt={`${song.title} cover`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "100px",
                    background: "linear-gradient(135deg, #24103e, #111)",
                  }}
                >
                  🎵
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(transparent 25%, rgba(0,0,0,.9) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  bottom: "25px",
                  left: "20px",
                  right: "20px",
                }}
              >
                <p
                  style={{
                    color: "#d8b4fe",
                    fontSize: "12px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                  }}
                >
                  MUSEK DISCOVERY
                </p>

                <h2 style={{ fontSize: "28px", margin: "8px 0" }}>
                  {song.title}
                </h2>

                <p style={{ color: "#eee", margin: "5px 0" }}>
                  {song.artistName}
                </p>

                <p style={{ color: "#ccc", fontSize: "14px" }}>
                  {song.genre}
                </p>

                <a
                  href={`/artist/${song.artistId}`}
                  style={{
                    display: "inline-block",
                    margin: "12px 0",
                    padding: "11px 18px",
                    border: "1px solid #a855f7",
                    borderRadius: "25px",
                    color: "white",
                    textDecoration: "none",
                  }}
                >
                  View Artist Profile →
                </a>

                {song.audioUrl && (
                  <audio
                    controls
                    preload="none"
                    src={song.audioUrl}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "12px",
                    }}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
