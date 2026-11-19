
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Withdrawal = {
  id: string;
  user_id: string;
  amount_cad: number;
  status: string;
  created_at: string;
  admin_note: string | null;
  payout_reference: string | null;
};

type ArtistProfile = {
  id: string;
  display_name: string | null;
  artist_name: string | null;
};

export default async function AdminWithdrawalsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    redirect("/dashboard");
  }

  const { data: withdrawals, error } = await supabase
    .from("creator_withdrawals")
    .select(
      "id, user_id, amount_cad, status, created_at, admin_note, payout_reference"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: "32px" }}>
        <h1>Admin Withdrawals</h1>
        <p>Unable to load withdrawal requests.</p>
        <p>{error.message}</p>
      </main>
    );
  }

  const requests = (withdrawals || []) as Withdrawal[];

  const artistIds = [...new Set(requests.map((item) => item.user_id))];

  let profiles: ArtistProfile[] = [];

  if (artistIds.length > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, display_name, artist_name")
      .in("id", artistIds);

    profiles = (data || []) as ArtistProfile[];
  }

  const getArtistName = (userId: string) => {
    const profile = profiles.find((item) => item.id === userId);

    return (
      profile?.artist_name ||
      profile?.display_name ||
      "Unknown artist"
    );
  };

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <Link href="/dashboard">← Back to Dashboard</Link>

      <h1 style={{ fontSize: "30px", marginTop: "24px" }}>
        Admin Withdrawal Management
      </h1>

      <p style={{ color: "#888", marginBottom: "28px" }}>
        Review and manage artist withdrawal requests.
      </p>

      <div
        style={{
          padding: "20px",
          border: "1px solid #333",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <p style={{ color: "#888", margin: 0 }}>
          Total withdrawal requests
        </p>
        <h2 style={{ fontSize: "30px", margin: "8px 0 0" }}>
          {requests.length}
        </h2>
      </div>

      {requests.length === 0 ? (
        <p>No withdrawal requests have been submitted yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {requests.map((request) => (
            <section
              key={request.id}
              style={{
                border: "1px solid #333",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h2 style={{ fontSize: "20px", marginTop: 0 }}>
                {getArtistName(request.user_id)}
              </h2>

              <p>
                **Amount:** CAD $
                {Number(request.amount_cad).toFixed(2)}
              </p>

              <p>
                **Status:** {request.status.toUpperCase()}
              </p>

              <p>
                **Requested:**{" "}
                {new Date(request.created_at).toLocaleString("en-CA")}
              </p>

              {request.admin_note && (
                <p>Admin note: {request.admin_note}</p>
              )}

              {request.payout_reference && (
                <p>Payout reference: {request.payout_reference}</p>
              )}

              <p
                style={{
                  fontSize: "12px",
                  color: "#888",
                  wordBreak: "break-all",
                }}
              >
                Request ID: {request.id}
              </p>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
