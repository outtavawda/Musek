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

    const { data: purchases, error: purchasesError } =
      await supabase
        .from("coin_purchases")
        .select("id, coins, amount_cad, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (purchasesError) {
      fanWalletError = fanWalletError || purchasesError.message;
    } else {
      coinPurchases = (purchases || []) as CoinPurchase[];
    }
  }

  // ARTIST WALLET AND ANALYTICS
  if (accountType === "artist") {
    const { data: walletData, error: walletQueryError } =
      await supabase
        .from("creator_wallets")
        .select(
          "coin_balance, total_coins_received, total_earnings_cad"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (walletQueryError) {
      walletError = walletQueryError.message;
    } else if (walletData) {
      wallet = walletData as Wallet;
    } else {
      walletError = "No artist wallet was found for this account.";
    }

    const { data, error } = await supabase
      .from("music_tracks")
      .select("id, title, genre, play_count, status")
      .eq("artist_id", user.id)
      .eq("status", "published");

    if (error) {
      analyticsError = error.message;
    } else {
      tracks = (data || []) as Track[];
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: events, error: eventsError } = await supabase
      .from("track_play_events")
      .select("played_at")
      .eq("artist_id", user.id)
      .gte("played_at", sixMonthsAgo.toISOString())
      .order("played_at", { ascending: true });

    if (eventsError) {
      analyticsError = analyticsError || eventsError.message;
    } else {
      playEvents = (events || []) as PlayEvent[];
    }
  }

  const totalPlays = tracks.reduce(
    (total, track) => total + (track.play_count || 0),
    0
  );

  const publishedSongs = tracks.length;

  const rankedTracks = [...tracks].sort(
    (a, b) => (b.play_count || 0) - (a.play_count || 0)
  );

  const mostPlayedSong = rankedTracks[0];

  const monthlyStats = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));

    const plays = playEvents.filter((event) => {
      const playedDate = new Date(event.played_at);

      return (
        playedDate.getMonth() === date.getMonth() &&
        playedDate.getFullYear() === date.getFullYear()
      );
    }).length;

    return {
      label: date.toLocaleDateString("en-CA", {
        month: "short",
        year: "2-digit",
      }),
      plays,
    };
  });

  const highestMonthlyPlays = Math.max(
    ...monthlyStats.map((month) => month.plays),
    1
  );

  const totalMonthlyPlays = monthlyStats.reduce(
    (total, month) => total + month.plays,
    0
  );
