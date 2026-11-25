
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function SendGift({
  artistId,
}: {
  artistId: string;
}) {
  const router = useRouter();

  const [isFan, setIsFan] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountCheckFailed, setAccountCheckFailed] = useState(false);
  const [coins, setCoins] = useState(100);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function checkAccount() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (user) {
          setLoggedIn(true);

          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("account_type")
            .eq("id", user.id)
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          setIsFan(profile?.account_type === "fan");
        }
      } catch {
        setAccountCheckFailed(true);
      } finally {
        setLoadingAccount(false);
      }
    }

    checkAccount();
  }, []);

  async function sendGift() {
    if (sending) return;

    setSending(true);
    setMessage("");

    const requestKey = idempotencyKey || crypto.randomUUID();

    if (!idempotencyKey) {
      setIdempotencyKey(requestKey);
    }

    try {
      const { error } = await supabase.rpc("send_musek_gift", {
        p_creator_id: artistId,
        p_coins: coins,
        p_idempotency_key: requestKey,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        `Gift sent successfully! ${coins.toLocaleString()} coins sent to the artist.`
      );

      setIdempotencyKey(null);
      router.refresh();
    } catch {
      // Keep the same idempotency key so a retry cannot create a duplicate gift
      // if the first request reached the server but its response was lost.
      setMessage("We could not confirm your gift. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loadingAccount) {
    return null;
  }

  if (accountCheckFailed) {
    return (
      <div style={{ marginTop: "30px" }}>
        <p role="alert" className="muted">
          We could not verify your account. Please try again.
        </p>
        <button
          type="button"
          className="primaryButton"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div style={{ marginTop: "30px" }}>
        <p className="muted">
          Sign in as a fan to send gifts to this artist.
        </p>
        <a href="/login">Log in to MUSEK →</a>
      </div>
    );
  }

  if (!isFan) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: "30px",
        padding: "22px",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "12px",
      }}
    >
      <p className="eyebrow">SUPPORT THIS ARTIST</p>

      <h2>Send a Gift</h2>

      <p className="muted">
        Show your support by sending MUSEK Coins to this artist.
      </p>

      <label
        htmlFor="gift-coins"
        style={{ display: "block", marginTop: "18px" }}
      >
        Choose your gift
      </label>

      <select
        id="gift-coins"
        value={coins}
        disabled={sending}
        onChange={(event) => {
          setCoins(Number(event.target.value));
          setIdempotencyKey(null);
          setMessage("");
        }}
        style={{
          display: "block",
          width: "100%",
          padding: "12px",
          marginTop: "8px",
          borderRadius: "8px",
        }}
      >
        <option value={100}>100 Coins — $1.00 CAD</option>
        <option value={500}>500 Coins — $5.00 CAD</option>
        <option value={1000}>1,000 Coins — $10.00 CAD</option>
      </select>

      <p className="muted" style={{ marginTop: "12px" }}>
        The artist receives 70% of the eligible gift revenue.
        MUSEK retains 30%.
      </p>

      <button
        type="button"
        className="primaryButton"
        onClick={sendGift}
        disabled={sending}
        style={{ marginTop: "12px", width: "100%" }}
      >
        {sending
          ? "Sending Gift..."
          : `🎁 Send ${coins.toLocaleString()} Coins`}
      </button>

      {message && (
        <p
          role="status"
          style={{
            marginTop: "16px",
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
