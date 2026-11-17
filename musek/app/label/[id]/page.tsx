
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LabelPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: label } = await supabase
    .from("user_profiles")
    .select(`
      id,
      display_name,
      bio,
      account_type,
      avatar_url,
      label_name,
      location,
      website_url
    `)
    .eq("id", params.id)
    .eq("account_type", "label")
    .eq("is_public", true)
    .maybeSingle();

  if (!label) notFound();

  const labelName = label.label_name || label.display_name;

  return (
    <main className="pageWrap">
      <nav className="nav">
        <Link className="brand" href="/">
          MUSEK<span>.</span>
        </Link>

        <Link className="secondaryButton" href="/discover">
          Discover
        </Link>
      </nav>

      <section className="authCard profileCard">
        <p className="eyebrow">MUSEK RECORD LABEL</p>

        {label.avatar_url ? (
          <img
            src={label.avatar_url}
            alt={`${labelName} profile`}
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "20px",
              objectFit: "cover",
              marginBottom: "20px"
            }}
          />
        ) : (
          <div style={{
            width: "150px",
            height: "150px",
            borderRadius: "20px",
            background: "#252525",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
            fontSize: "48px"
          }}>
            🎵
          </div>
        )}

        <h1>{labelName}</h1>

        {label.location && (
          <p className="muted">{label.location}</p>
        )}

        <h2>About the label</h2>

        <p>
          {label.bio || "This record label has not added a biography yet."}
        </p>

        {label.website_url && (
          <p>
            <a
              href={label.website_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit label website ↗
            </a>
          </p>
        )}

        <div style={{ marginTop: "30px" }}>
          <p className="eyebrow">LABEL MUSIC CATALOGUE</p>

          <p className="muted">
            Artists, albums and music releases will be added to this section in a future MUSEK update.
          </p>
        </div>

        <p className="muted small">
          <Link href="/discover">← Back to Discover</Link>
        </p>
      </section>
    </main>
  );
}
