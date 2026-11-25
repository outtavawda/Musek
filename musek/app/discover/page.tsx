
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DiscoverSearch from "./discover-search";

export default async function DiscoverPage() {
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, bio, account_type, avatar_url, artist_name, genres, label_name, location, website_url"
    )
    .eq("is_public", true)
    .in("account_type", ["artist", "label"])
    .order("display_name", { ascending: true });

  return (
    <main className="pageWrap" style={{ width: "100%", minHeight: "100vh", padding: "0 clamp(16px, 3vw, 48px) 48px", boxSizing: "border-box" }}>
      <nav className="nav">
        <Link className="brand" href="/">
          YASUH<span>.</span>
        </Link>
        <Link className="secondaryButton" href="/dashboard">
          Dashboard
        </Link>
      </nav>

      <section className="authCard profileCard" style={{ width: "100%", maxWidth: "1440px", margin: "24px auto 0", padding: "clamp(20px, 3vw, 42px)", boxSizing: "border-box" }}>
        <p className="eyebrow">EXPLORE YASUH</p>
        <h1>Discover YASUH</h1>
        <p className="muted">
          Discover new music, connect with artists and explore record labels.
        </p>

        {error ? (
          <p className="notice error">
            Unable to load profiles. Please try again.
          </p>
        ) : (
          <DiscoverSearch profiles={profiles || []} />
        )}

        <p className="muted small" style={{ marginTop: "30px" }}>
          <Link href="/profile">Edit your profile</Link>
        </p>
      </section>
    </main>
  );
}
