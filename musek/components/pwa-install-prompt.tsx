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
    <aside
      className="fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-3 right-3 z-[1050] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#e8d9b8] bg-[#fffdf8] p-3 text-[#24211b] shadow-[0_12px_36px_rgba(75,57,20,0.16)]"
      aria-label="Install YASUH"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#eadbb9] bg-[#fbf6e9] text-[#a77b22]" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="2.5" fill="currentColor" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5 text-[#24211b]">Add YASUH to your home screen</p>
        <p className="mt-1 text-[11px] leading-4 text-[#70695d]">
          {ios ? "Tap Share, then choose Add to Home Screen." : "Install YASUH for an app-like experience."}
        </p>
      </div>
      {promptEvent && (
        <button
          type="button"
          onClick={() => void install()}
          className="shrink-0 rounded-full bg-gradient-to-r from-[#c69a35] to-[#9b741e] px-3 py-2 text-xs font-bold text-white shadow-sm"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
        className="shrink-0 px-2 py-2 text-lg leading-none text-[#8f6818]"
      >
        ×
      </button>
    </aside>
  );
}
