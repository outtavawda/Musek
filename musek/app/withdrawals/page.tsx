
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WithdrawalForm from "./withdrawal-form";

type Withdrawal = {
  id: string;
  amount_cad: number;
  status: string;
  created_at: string;
};

export default async function WithdrawalsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "artist") {
    redirect("/dashboard");
  }

  const { data: wallet, error: walletError } = await supabase
    .from("creator_wallets")
    .select("total_earnings_cad")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError || !wallet) {
    return (
      <main className="pageWrap">
        <section className="contentPanel">
          <h1>Artist Withdrawals</h1>
          <p className="muted">
            Your artist wallet could not be loaded.
          </p>
          <Link href="/dashboard">
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const { data: withdrawals, error: withdrawalsError } =
    await supabase
      .from("creator_withdrawals")
      .select("id, amount_cad, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

  if (withdrawalsError) {
    return (
      <main className="pageWrap">
        <section className="contentPanel">
          <h1>Artist Withdrawals</h1>
          <p className="muted">
            Withdrawal history could not be loaded.
          </p>
          <Link href="/dashboard">
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const totalEarnings = Number(wallet.total_earnings_cad || 0);

  const reservedAmount = (withdrawals || [])
    .filter((withdrawal) =>
      ["pending", "approved", "processing", "paid"].includes(
        withdrawal.status
      )
    )
    .reduce(
      (total, withdrawal) =>
        total + Number(withdrawal.amount_cad || 0),
      0
    );

  const availableBalance = Math.max(
    0,
    Math.round((totalEarnings - reservedAmount) * 100) / 100
  );

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

      <section className="contentPanel">
        <p className="eyebrow">ARTIST ACCOUNT</p>

        <h1>Artist Withdrawals</h1>

        <p className="muted">
          Manage your earnings and submit withdrawal requests.
        </p>

        <WithdrawalForm
          totalEarnings={totalEarnings}
          availableBalance={availableBalance}
          withdrawals={(withdrawals || []) as Withdrawal[]}
        />

        <div style={{ marginTop: "32px" }}>
          <Link href="/dashboard">
            ← Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
