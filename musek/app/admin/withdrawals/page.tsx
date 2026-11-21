
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WithdrawalActions from "./withdrawal-actions";

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

  // Confirm that the signed-in user has admin access.
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/dashboard");
  }

  // Load withdrawal requests visible to an authorized admin.
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

  const requests: Withdrawal[] = (withdrawals || []) as Withdrawal[];

  // Collect unique artist IDs using TypeScript-compatible syntax.
  const artistIds = Array.from(
    new Set(requests.map((item) => item.user_id))
  );

  let profiles: ArtistProfile[] = [];

  if (artistIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, display_name, artist_name")
      .in("id", artistIds);

    if (!profileError && profileData) {
      profiles = profileData as ArtistProfile[];
    }
  }

  const getArtistName = (userId: string): string => {
    const profile = profiles.find((item) => item.id === userId);

    return (
      profile?.artist_name ||
      profile?.display_name ||
      "Unknown artist"
    );
  };

  const totalRequested = requests.reduce(
    (total, request) => total + Number(request.amount_cad),
    0
  );

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "approved"
  ).length;

  const processingCount = requests.filter(
    (request) => request.status === "processing"
  ).length;

  const paidCount = requests.filter(
    (request) => request.status === "paid"
  ).length;

  return (
    <main
      className="admin-shell"
      style={{
        maxWidth: "1280px",
        minHeight: "100vh",
        margin: "0 auto",
        padding: "42px 28px",
        color: "#f8f7ff",
        background: "radial-gradient(ellipse at 85% 0%, rgba(124,58,237,.18), transparent 38%), #080811",
      }}
    >
      <Link href="/dashboard" style={{ display: "inline-flex", padding: "10px 15px", border: "1px solid rgba(168,85,247,.35)", borderRadius: "999px", color: "#d8b4fe", textDecoration: "none", background: "rgba(168,85,247,.08)" }}>← Back to Dashboard</Link>

      <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-.04em", color: "#fff", marginTop: "24px" }}>
        Admin Withdrawal Management
      </h1>

      <p style={{ color: "#888", marginBottom: "28px" }}>
        Review and manage artist withdrawal requests.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            padding: "23px",
            border: "1px solid rgba(168,85,247,.22)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(31,25,51,.96), rgba(15,15,27,.98))",
            boxShadow: "0 16px 45px rgba(0,0,0,.22)",
          }}
        >
          <p style={{ color: "#aaa4bd", margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>
            Total withdrawal requests
          </p>
          <h2 style={{ fontSize: "32px", margin: "8px 0 0", color: "#e9d5ff", fontWeight: 850 }}>
            {requests.length}
          </h2>
        </div>

        <div
          style={{
            padding: "23px",
            border: "1px solid rgba(168,85,247,.22)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(31,25,51,.96), rgba(15,15,27,.98))",
            boxShadow: "0 16px 45px rgba(0,0,0,.22)",
          }}
        >
          <p style={{ color: "#aaa4bd", margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>
            Pending requests
          </p>
          <h2 style={{ fontSize: "32px", margin: "8px 0 0", color: "#e9d5ff", fontWeight: 850 }}>
            {pendingCount}
          </h2>
        </div>

        <div
          style={{
            padding: "23px",
            border: "1px solid rgba(168,85,247,.22)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(31,25,51,.96), rgba(15,15,27,.98))",
            boxShadow: "0 16px 45px rgba(0,0,0,.22)",
          }}
        >
          <p style={{ color: "#aaa4bd", margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>
            Approved requests
          </p>
          <h2 style={{ fontSize: "32px", margin: "8px 0 0", color: "#e9d5ff", fontWeight: 850 }}>
            {approvedCount}
          </h2>
        </div>

        <div
          style={{
            padding: "23px",
            border: "1px solid rgba(168,85,247,.22)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(31,25,51,.96), rgba(15,15,27,.98))",
            boxShadow: "0 16px 45px rgba(0,0,0,.22)",
          }}
        >
          <p style={{ color: "#aaa4bd", margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>
            Processing requests
          </p>
          <h2 style={{ fontSize: "32px", margin: "8px 0 0", color: "#e9d5ff", fontWeight: 850 }}>
            {processingCount}
          </h2>
        </div>

        <div
          style={{
            padding: "23px",
            border: "1px solid rgba(168,85,247,.22)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(31,25,51,.96), rgba(15,15,27,.98))",
            boxShadow: "0 16px 45px rgba(0,0,0,.22)",
          }}
        >
          <p style={{ color: "#aaa4bd", margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>
            Paid requests
          </p>
          <h2 style={{ fontSize: "32px", margin: "8px 0 0", color: "#e9d5ff", fontWeight: 850 }}>
            {paidCount}
          </h2>
        </div>

        <div
          style={{
            padding: "23px",
            border: "1px solid rgba(168,85,247,.22)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(31,25,51,.96), rgba(15,15,27,.98))",
            boxShadow: "0 16px 45px rgba(0,0,0,.22)",
          }}
        >
          <p style={{ color: "#aaa4bd", margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>
            Total amount requested
          </p>
          <h2 style={{ fontSize: "32px", margin: "8px 0 0", color: "#e9d5ff", fontWeight: 850 }}>
            CAD ${totalRequested.toFixed(2)}
          </h2>
        </div>
      </div>

      {requests.length === 0 ? (
        <p>No withdrawal requests have been submitted yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {requests.map((request) => (
            <section
              key={request.id}
              style={{
                border: "1px solid rgba(168,85,247,.2)",
                borderRadius: "22px",
                padding: "25px",
                background: "linear-gradient(145deg, rgba(24,21,39,.98), rgba(13,13,24,.98))",
                boxShadow: "0 18px 50px rgba(0,0,0,.2)",
              }}
            >
              <h2 style={{ fontSize: "22px", marginTop: 0, color: "#fff", fontWeight: 850 }}>
                {getArtistName(request.user_id)}
              </h2>

              <p>
                <strong>Amount:</strong> CAD $
                {Number(request.amount_cad).toFixed(2)}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {request.status.toUpperCase()}
              </p>

              <p>
                <strong>Requested:</strong>{" "}
                {new Date(request.created_at).toLocaleString("en-CA")}
              </p>

              {request.admin_note && (
                <p>
                  <strong>Admin note:</strong> {request.admin_note}
                </p>
              )}

              {request.payout_reference && (
                <p>
                  <strong>Payout reference:</strong>{" "}
                  {request.payout_reference}
                </p>
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

              <WithdrawalActions
                withdrawalId={request.id}
                status={request.status}
              />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
