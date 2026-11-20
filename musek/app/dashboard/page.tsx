padding: "14px",
                            marginBottom: "10px",
                            border:
                              "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                          }}
                        >
                          <div>
                            <strong>
                              {index + 1}. {track.title}
                            </strong>

                            <p
                              className="muted"
                              style={{ margin: "5px 0 0" }}
                            >
                              {track.genre || "Music"}
                            </p>
                          </div>

                          <strong>
                            {(track.play_count || 0).toLocaleString()} plays
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ARTIST INVITATIONS */}
        {accountType === "artist" && <ArtistInvitations />}

        {/* PROFILE STATUS */}
        <div
          style={{
            ...cardStyle,
            marginTop: "36px",
          }}
        >
          <p className="eyebrow">PROFILE STATUS</p>

          <h2>
            {profile?.is_public
              ? "Your profile is public"
              : "Your profile is private"}
          </h2>

          <p className="muted">
            {profile?.is_public
              ? "Other MUSEK users can discover your public profile."
              : "Your profile is hidden from public discovery. You can change this in Edit My Profile."}
          </p>
        </div>

        {/* EXPLORE MUSEK */}
        <div style={{ marginTop: "32px" }}>
          <p className="eyebrow">EXPLORE MUSEK</p>
          <h2>Your music community</h2>

          <p className="muted">
            Discover artists, listen to published songs and explore
            record labels.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <Link className="primaryButton" href="/feed">
              ✨ Open Personalised Feed →
            </Link>

            {accountType === "fan" && (
              <Link href="/following">
                🎧 Following Artists →
              </Link>
            )}

            <Link href="/discover-music">
              Listen to Music →
            </Link>

            <Link href="/favorites">
              View My Favourites →
            </Link>

            {accountType === "fan" && (
              <Link href="/gift-history">
                View Gift History →
              </Link>
            )}

            {accountType === "artist" && (
              <Link href="/gift-history">
                View Gifts Received →
              </Link>
            )}

            {accountType === "artist" && (
              <Link href="/withdrawals">
                Withdraw Earnings →
              </Link>
            )}

            <Link href="/discover">
              Explore Artists →
            </Link>

            {accountType === "artist" && (
              <Link href="/my-music">
                Manage My Music →
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
