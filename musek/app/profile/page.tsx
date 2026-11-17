
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
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <form action={signOut}>
          <button className="secondaryButton" type="submit">
            Log out
          </button>
        </form>
      </nav>

      <section className="authCard profileCard">
        <p className="eyebrow">YOUR MUSEK PROFILE</p>
        <h1>Edit profile</h1>

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

          <h2>Profile picture</h2>

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
          <input
            type="hidden"
            name="avatar_url"
            value={profile?.avatar_url || ""}
          />

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
              <h2>Artist information</h2>

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
              <h2>Record label information</h2>

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

          <button className="primaryButton" type="submit">
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
