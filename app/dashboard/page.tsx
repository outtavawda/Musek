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
    .select("display_name, account_type, bio")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email;
  const accountType = profile?.account_type || user.user_metadata?.account_type || "fan";

  return (
    <main className="pageWrap">
      <nav className="nav"><Link className="brand" href="/">MUSEK<span>.</span></Link><form action={signOut}><button className="secondaryButton" type="submit">Log out</button></form></nav>
      <section className="contentPanel">
        <p className="eyebrow">YOUR MUSEK ACCOUNT</p>
        <h1>Welcome, {displayName}</h1>
        <p className="muted">Account type: <strong>{accountType}</strong></p>
        <p>Your account is signed in. Complete your profile to get started.</p>
        <Link className="primaryButton" href="/profile">Edit profile <span>↗</span></Link>
      </section>
    </main>
  );
}
