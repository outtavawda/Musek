
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LabelDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "display_name, label_name, bio, location, website_url, avatar_url, account_type"
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.account_type !== "label") {
    redirect("/dashboard");
  }

  const labelName = profile.label_name || profile.display_name || "My Label";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-purple-400">
              MUSEK
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Label Dashboard
            </h1>
            <p className="mt-2 text-gray-400">
              Manage your label, artists and music releases.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-700 px-5 py-3 text-sm hover:bg-gray-800"
          >
            Main Dashboard
          </Link>
        </header>

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-wrap items-center gap-5">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Label profile"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-700 text-3xl font-bold">
                {labelName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <p className="text-sm text-purple-400">Your Label</p>
              <h2 className="text-2xl font-bold">{labelName}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {profile.location || "Location not added"}
              </p>
            </div>
          </div>

          <p className="mt-5 text-gray-300">
            {profile.bio || "Add a description to introduce your record label."}
          </p>

          {profile.website_url && (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-purple-400 hover:underline"
            >
              Visit label website
            </a>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Artists</h3>
            <p className="mt-2 text-sm text-gray-400">
              Build and manage your label's artist roster.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Artist management coming next
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Music Releases</h3>
            <p className="mt-2 text-sm text-gray-400">
              Organize and manage music released under your label.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Release management coming next
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="mt-2 text-sm text-gray-400">
              Track music performance and audience activity.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Label analytics coming next
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Label Earnings</h3>
            <p className="mt-2 text-sm text-gray-400">
              View your label's earnings and financial activity.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Earnings management coming next
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Artist Invitations</h3>
            <p className="mt-2 text-sm text-gray-400">
              Invite artists to join your record label.
            </p>
            <p className="mt-4 text-sm text-yellow-400">
              Invitations coming next
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Label Settings</h3>
            <p className="mt-2 text-sm text-gray-400">
              Manage your label's profile and information.
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-block text-sm font-semibold text-purple-400 hover:underline"
            >
              Manage profile
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
