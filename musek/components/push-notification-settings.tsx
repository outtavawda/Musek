"use client";

import { useEffect, useState } from "react";

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export default function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available) return;
    void navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription()).then(subscription => {
      setEnabled(!!subscription);
    }).catch(() => setMessage("Notifications are unavailable in this browser."));
  }, []);

  async function toggle() {
    setBusy(true); setMessage("");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push notifications are not configured yet.");
      const permission = Notification.permission === "granted"
        ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow notifications in your browser settings to continue.");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const response = await fetch("/api/push/subscribe", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint })
        });
        if (!response.ok) throw new Error((await response.json()).error || "Could not turn off notifications.");
        await existing.unsubscribe();
        setEnabled(false);
        setMessage("MUSEK notifications turned off.");
      } else {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(key) as BufferSource
        });
        const response = await fetch("/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON())
        });
        if (!response.ok) {
          await subscription.unsubscribe();
          throw new Error((await response.json()).error || "Could not save notification settings.");
        }
        setEnabled(true);
        setMessage("MUSEK notifications are enabled on this device.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally { setBusy(false); }
  }

  if (!supported) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">Push notifications</h3>
          <p className="mt-1 text-xs text-gray-400">Get alerts for new releases, live invitations and account activity on this device.</p>
        </div>
        <button type="button" onClick={() => void toggle()} disabled={busy} className="min-h-11 rounded-full bg-fuchsia-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy ? "Please wait…" : enabled ? "Turn off" : "Enable"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-xs text-fuchsia-200">{message}</p>}
    </section>
  );
}
