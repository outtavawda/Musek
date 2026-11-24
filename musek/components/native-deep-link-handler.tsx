"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

function appUrlToPath(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol === "musek:") {
      const segment = url.hostname;
      const id = url.pathname.replace(/^\/+/, "");
      if (segment === "artist" && id) return `/artist/${encodeURIComponent(id)}`;
      if (segment === "track" && id) return `/discover-music?track=${encodeURIComponent(id)}`;
      if (segment === "live" && id) return `/social?room=${encodeURIComponent(id)}`;
      if (segment === "profile") return "/profile";
      if (segment === "feed") return "/feed";
      return "/";
    }
    if (url.protocol === "https:" && url.origin === window.location.origin) {
      return url.pathname + url.search + url.hash;
    }
  } catch {}
  return null;
}

export default function NativeDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    let listener: { remove: () => Promise<void> } | null = null;

    const route = (url: string) => {
      const path = appUrlToPath(url);
      if (active && path) router.replace(path);
    };

    void App.addListener("appUrlOpen", event => route(event.url)).then(handle => {
      listener = handle;
      if (!active) void handle.remove();
    });
    void App.getLaunchUrl().then(result => {
      if (result?.url) route(result.url);
    });

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [router]);

  return null;
}
