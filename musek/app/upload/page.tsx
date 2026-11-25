
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "./upload-form";

export default async function UploadPage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type, artist_name, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "artist") {
    redirect("/dashboard");
  }

  return (
    <main style={{ maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
      <h1>Upload Music to YASUH</h1>

      <p>
        Welcome, {profile.artist_name || profile.display_name}.
        Upload your music and save it as a draft.
      </p>

      <UploadForm userId={user.id} />

      <p style={{ marginTop: "25px" }}>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
