"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";

export default function NativePushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    async function setup() {
      try {
        const permission = await PushNotifications.checkPermissions();
        const result = permission.receive === "granted"
          ? permission
          : await PushNotifications.requestPermissions();
        if (result.receive !== "granted" || !active) return;
        handles.push(await PushNotifications.addListener("registration", async (token: Token) => {
          if (!active) return;
          const platform = Capacitor.getPlatform();
          await fetch("/api/push/native-token", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform })
          });
        }));

        handles.push(await PushNotifications.addListener("registrationError", error => {
          console.error("MUSEK native push registration failed:", error);
        }));

        handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", (event: ActionPerformed) => {
          const target = event.notification.data?.url;
          if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//")) {
            window.location.assign(target);
          }
        }));

        await PushNotifications.register();
      } catch (error) {
        console.error("MUSEK native push setup failed:", error);
      }
    }

    void setup();
    return () => {
      active = false;
      handles.forEach(handle => void handle.remove());
    };
  }, []);

  return null;
}
