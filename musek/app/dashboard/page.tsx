import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";
import ArtistInvitations from "./artist-invitations";

type Track = {
  id: string;
  title: string;
  genre: string | null;
  play_count: number | null;
  status: string;
};

type PlayEvent = {
  played_at: string;
};

type Wallet = {
  coin_balance: number;
  total_coins_received: number;
  total_earnings_cad: number;
};

type FanWallet = {
  coin_balance: number;
  total_coins_purchased: number;
};

type CoinPurchase = {
  id: string;
  coins: number;
  amount_cad: number;
  status: string;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, account_type, bio, is_public")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email;

  const accountType =
    profile?.account_type ||
    user.user_metadata?.account_type ||
    "fan";

  const accountLabel =
    accountType === "artist"
      ? "Artist"
      : accountType === "label"
      ? "Record Label"
      : "Fan";

  let wallet: Wallet | null = null;
  let walletError = "";

  let fanWallet: FanWallet | null = null;
  let fanWalletError = "";

  let coinPurchases: CoinPurchase[] = [];

  let tracks: Track[] = [];
  let playEvents: PlayEvent[] = [];
  let analyticsError = "";

  // FAN WALLET
  if (accountType === "fan") {
    const { data: fanWalletData, error: fanWalletQueryError } =
      await supabase
        .from("fan_coin_wallets")
        .select("coin_balance, total_coins_purchased")
        .eq("user_id", user.id)
        .maybeSingle();

    if (fanWalletQueryError) {
      fanWalletError = fanWalletQueryError.message;
    } else if (fanWalletData) {
      fanWallet = fanWalletData as FanWallet;
    }
