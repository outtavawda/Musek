
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateProfile,
  uploadProfilePhoto,
  signOut
} from "../auth-actions";

export default async function ProfilePage({
  searchParams
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(`
      display_name,
      bio,
      account_type,
      avatar_url,
      artist_name,
      genres,
      label_name,
      website_url,
      location,
      is_public
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile loading error:", profileError.message);
  }

  const accountType =
    profile?.account_type ||
    user.user_metadata?.account_type ||
    "fan";

  return (
    <main className="pageWrap" style={{ minHeight: "100vh", padding: "32px 20px 70px", background: "radial-gradient(ellipse at top, #21133d 0%, #09090f 48%, #050507 100%)", color: "#f8f7ff" }}>
      <nav className="nav" style={{ maxWidth: "1080px", margin: "0 auto 34px", padding: "18px 22px", border: "1px solid rgba(168, 85, 247, .22)", borderRadius: "18px", background: "rgba(15, 13, 25, .82)", backdropFilter: "blur(16px)" }}>
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <form action={signOut}>
          <button className="secondaryButton" type="submit">
            Log out
          </button>
        </form>
      </nav>

      <section className="authCard profileCard" style={{ maxWidth: "760px", margin: "0 auto", padding: "clamp(24px, 5vw, 48px)", border: "1px solid rgba(168, 85, 247, .24)", borderRadius: "26px", background: "linear-gradient(145deg, rgba(28, 20, 45, .96), rgba(11, 11, 18, .98))", boxShadow: "0 24px 90px rgba(0, 0, 0, .42)" }}>
        <p className="eyebrow" style={{ color: "#c084fc", letterSpacing: ".22em", fontWeight: 800 }}>YOUR MUSEK PROFILE</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", marginBottom: "28px", background: "linear-gradient(90deg, #fff, #d8b4fe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Edit profile</h1>

        {searchParams?.error && (
          <p className="notice error">{searchParams.error}</p>
        )}

        {searchParams?.message && (
          <p className="notice">{searchParams.message}</p>
        )}

        <div style={{ marginBottom: "25px", textAlign: "center" }}>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Your profile"
              style={{
                width: "130px",
                height: "130px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "12px"
              }}
            />
          ) : (
            <div style={{
              width: "130px",
              height: "130px",
              borderRadius: "50%",
              background: "#252525",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "42px"
            }}>
              👤
            </div>
          )}

          <h2 style={{ color: "#f3e8ff" }}>Profile picture</h2>

          <form
            action={uploadProfilePhoto}
            className="form"
            encType="multipart/form-data"
          >
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              required
            />

            <p className="muted small">
              JPG, PNG or WebP. Maximum size 5 MB.
            </p>

            <button className="primaryButton" type="submit">
              Upload Photo
            </button>
          </form>
        </div>

        <form action={updateProfile} className="form">
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={
                profile?.display_name ||
                user.user_metadata?.display_name ||
                ""
              }
              required
            />
          </label>

          <label>
            Bio
            <textarea
              name="bio"
              rows={5}
              maxLength={500}
              defaultValue={profile?.bio || ""}
            />
          </label>

          <label>
            Account type
            <input value={accountType} readOnly />
          </label>

          {accountType === "artist" && (
            <>
              <h2 style={{ color: "#f3e8ff", marginTop: "12px" }}>Artist information</h2>

              <label>
                Artist name
                <input
                  name="artist_name"
                  defaultValue={profile?.artist_name || ""}
                />
              </label>

              <label>
                Music genres
                <input
                  name="genres"
                  defaultValue={(profile?.genres || []).join(", ")}
                  placeholder="Reggae, Dancehall, Hip-Hop"
                />
              </label>
            </>
          )}

          {accountType === "label" && (
            <>
              <h2 style={{ color: "#f3e8ff", marginTop: "12px" }}>Record label information</h2>

              <label>
                Record label name
                <input
                  name="label_name"
                  defaultValue={profile?.label_name || ""}
                />
              </label>
            </>
          )}

          <label>
            Location
            <input
              name="location"
              defaultValue={profile?.location || ""}
              placeholder="City, Country"
            />
          </label>

          {(accountType === "artist" || accountType === "label") && (
            <label>
              Website
              <input
                name="website_url"
                type="url"
                defaultValue={profile?.website_url || ""}
                placeholder="https://yourwebsite.com"
              />
            </label>
          )}

          <label>
            <input
              name="is_public"
              type="checkbox"
              value="true"
              defaultChecked={profile?.is_public || false}
            />
            Make my profile public
          </label>

          <button className="primaryButton" type="submit" style={{ width: "100%", padding: "15px", borderRadius: "13px", background: "linear-gradient(90deg, #9333ea, #c026d3)", border: 0, color: "white", fontWeight: 800, boxShadow: "0 8px 28px rgba(147, 51, 234, .28)" }}>
            Save profile
          </button>
        </form>

        <p className="muted small">
          <Link href="/dashboard">Back to dashboard</Link>
        </p>
      </section>
    </main>
  );
}
