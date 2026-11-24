"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIos(/iPhone|iPad|iPod/i.test(ua) && !(window.navigator as Navigator & { standalone?: boolean }).standalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || (!promptEvent && !ios)) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setDismissed(true);
  }

  return (
    <aside className="fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 right-3 z-[1050] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-purple-300/25 bg-[#171326]/95 p-3 text-white shadow-2xl backdrop-blur-xl" aria-label="Install MUSEK">
      <img src="/musek-icon.svg" alt="" className="h-11 w-11 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Add MUSEK to your home screen</p>
        <p className="mt-1 text-[11px] text-gray-300">{ios ? "Tap Share, then choose Add to Home Screen." : "Install MUSEK for an app-like experience."}</p>
      </div>
      {promptEvent && <button type="button" onClick={() => void install()} className="rounded-full bg-purple-500 px-3 py-2 text-xs font-bold">Install</button>}
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss install prompt" className="px-2 text-gray-400">×</button>
    </aside>
  );
}
