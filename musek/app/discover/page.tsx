
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
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>
        <Link className="secondaryButton" href="/dashboard">
          Dashboard
        </Link>
      </nav>

      <section className="authCard profileCard">
        <p className="eyebrow">EXPLORE MUSEK</p>
        <h1>Discover MUSEK</h1>
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
