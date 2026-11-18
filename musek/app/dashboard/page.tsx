
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, account_type, bio, is_public")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email;

  const accountType =
    profile?.account_type ||
    user.user_metadata?.account_type ||
    "fan";

  const accountLabel =
    accountType === "artist"
      ? "Artist"
      : accountType === "label"
      ? "Record Label"
      : "Fan";

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

      <section className="contentPanel">
        <p className="eyebrow">YOUR MUSEK ACCOUNT</p>

        <h1>Welcome, {displayName}</h1>

        <p className="muted">
          Account type: <strong>{accountLabel}</strong>
        </p>

        <p>
          Welcome to MUSEK. Your music community starts here.
        </p>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "24px"
        }}>
          <Link className="primaryButton" href="/discover-music">
            🎵 Discover Music
          </Link>

          <Link className="secondaryButton" href="/discover">
            Discover Artists
          </Link>

          <Link className="secondaryButton" href="/profile">
            Edit My Profile
          </Link>
        </div>

        <div style={{
          marginTop: "32px",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.12)"
        }}>
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

        <div style={{ marginTop: "32px" }}>
          <p className="eyebrow">EXPLORE MUSEK</p>
          <h2>Your music community</h2>

          <p className="muted">
            Discover artists, listen to published songs and explore record labels.
          </p>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <Link href="/discover-music">
              Listen to Music →
            </Link>

            <Link href="/discover">
              Explore Artists →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
