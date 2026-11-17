import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, signOut } from "../auth-actions";

export default async function ProfilePage({ searchParams }: { searchParams?: { error?: string; message?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("user_profiles")
    .select("display_name, bio, account_type")
    .eq("id", user.id).maybeSingle();

  return (
    <main className="pageWrap">
      <nav className="nav"><Link className="brand" href="/">MUSEK<span>.</span></Link><form action={signOut}><button className="secondaryButton" type="submit">Log out</button></form></nav>
      <section className="authCard profileCard">
        <p className="eyebrow">YOUR PROFILE</p>
        <h1>Edit profile</h1>
        {searchParams?.error && <p className="notice error">{searchParams.error}</p>}
        {searchParams?.message && <p className="notice">{searchParams.message}</p>}
        <form action={updateProfile} className="form">
          <label>Display name<input name="display_name" defaultValue={profile?.display_name || user.user_metadata?.display_name || ""} required /></label>
          <label>Bio<textarea name="bio" rows={5} defaultValue={profile?.bio || ""} maxLength={500} /></label>
          <label>Account type<input value={profile?.account_type || user.user_metadata?.account_type || "fan"} readOnly /></label>
          <button className="primaryButton" type="submit">Save profile</button>
        </form>
        <p className="muted small"><Link href="/dashboard">Back to dashboard</Link></p>
      </section>
    </main>
  );
}
