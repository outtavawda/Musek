
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { uploadTrack } from "@/app/auth-actions";

export default async function UploadPage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "artist") {
    return (
      <main>
        <h1>Artist access required</h1>
        <p>Only artist accounts can upload music.</p>
        <Link href="/dashboard">Return to dashboard</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
      <h1>Upload Music</h1>
      <p>Share your music with the MUSEK community.</p>

      <form action={uploadTrack} encType="multipart/form-data">
        <label>
          Song title
          <input
            type="text"
            name="title"
            required
            maxLength={150}
            style={{ display: "block", width: "100%", padding: "12px", margin: "8px 0 20px" }}
          />
        </label>

        <label>
          Genre
          <input
            type="text"
            name="genre"
            maxLength={80}
            placeholder="Reggae, Dancehall, Hip-Hop..."
            style={{ display: "block", width: "100%", padding: "12px", margin: "8px 0 20px" }}
          />
        </label>

        <label>
          Audio file (MP3, WAV or M4A)
          <input
            type="file"
            name="audio"
            accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
            required
            style={{ display: "block", margin: "12px 0 24px" }}
          />
        </label>

        <button type="submit">Upload Song</button>
      </form>

      <p style={{ marginTop: "25px" }}>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
