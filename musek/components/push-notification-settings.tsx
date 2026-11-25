"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export default function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [native, setNative] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [nativeToken, setNativeToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setNative(isNative);
    if (isNative) setNativeToken(window.localStorage.getItem("musek-native-push-token") || "");
    const available = isNative || ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    setSupported(available);
    if (isNative) {
      void PushNotifications.checkPermissions().then(permission => setEnabled(permission.receive === "granted"));
      return;
    }
    if (!available) return;
    void navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription()).then(subscription => {
      setEnabled(!!subscription);
    }).catch(() => setMessage("Notifications are unavailable in this browser."));
  }, []);

  async function toggle() {
    setBusy(true); setMessage("");
    try {
      if (native) {
        if (enabled && nativeToken) {
          const response = await fetch("/api/push/native-token", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: nativeToken })
          });
          if (!response.ok) throw new Error((await response.json()).error || "Could not turn off notifications.");
          setEnabled(false); setNativeToken("");
          window.localStorage.removeItem("musek-native-push-token");
          setMessage("YASUH notifications are disabled for this device.");
          return;
        }
        const permission = await PushNotifications.checkPermissions();
        const result = permission.receive === "granted" ? permission : await PushNotifications.requestPermissions();
        if (result.receive !== "granted") throw new Error("Allow notifications in device settings to continue.");
        const registration = await PushNotifications.addListener("registration", async (token: Token) => {
          setNativeToken(token.value);
          window.localStorage.setItem("musek-native-push-token", token.value);
          const platform = Capacitor.getPlatform();
          const response = await fetch("/api/push/native-token", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform })
          });
          if (!response.ok) setMessage("Device permission was granted, but YASUH could not save this device.");
          else { setEnabled(true); setMessage("This device is registered for YASUH notifications."); }
        });
        const registrationError = await PushNotifications.addListener("registrationError", error => {
          console.error("YASUH native push registration failed:", error);
          setMessage("Could not register this device for notifications.");
        });
        const action = await PushNotifications.addListener("pushNotificationActionPerformed", (event: ActionPerformed) => {
          const target = event.notification.data?.url;
          if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//")) window.location.assign(target);
        });
        await PushNotifications.register();
        window.setTimeout(() => {
          void registration.remove(); void registrationError.remove(); void action.remove();
        }, 30000);
        setMessage("Waiting for device registration…");
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push notifications are not configured yet.");
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
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
        setEnabled(false); setMessage("YASUH notifications turned off.");
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
        setEnabled(true); setMessage("YASUH notifications are enabled on this device.");
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
