
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, signOut } from "../auth-actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
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

        <p className="muted">
          Customize your presence on MUSEK.
        </p>

        {searchParams?.error && (
          <p className="notice error">{searchParams.error}</p>
        )}

        {searchParams?.message && (
          <p className="notice">{searchParams.message}</p>
        )}

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
            Profile picture URL
            <input
              name="avatar_url"
              type="url"
              placeholder="https://example.com/photo.jpg"
              defaultValue={profile?.avatar_url || ""}
            />
          </label>

          <label>
            Bio
            <textarea
              name="bio"
              rows={5}
              maxLength={500}
              placeholder="Tell people about yourself..."
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
                  placeholder="Your artist name"
                />
              </label>

              <label>
                Music genres
                <input
                  name="genres"
                  defaultValue={(profile?.genres || []).join(", ")}
                  placeholder="Reggae, Dancehall, Hip-Hop..."
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
                  placeholder="Your label name"
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
