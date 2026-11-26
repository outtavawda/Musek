"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LiveRoom = {
  id: string;
  title: string;
  host_name: string;
  created_at: string;
};

export default function GlobalSocialButton() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);

  const loadLiveRooms = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setSignedIn(Boolean(user));
    setCheckedAuth(true);
    if (!user) {
      setRooms([]);
      return;
    }

    const { data, error } = await supabase
      .from("social_live_rooms")
      .select("id,title,host_name,created_at")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error) setRooms((data || []) as LiveRoom[]);
  }, [supabase]);

  useEffect(() => {
    void loadLiveRooms();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadLiveRooms();
    });

    const channel = supabase
      .channel("musek-global-live-indicator")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_live_rooms" }, () => {
        void loadLiveRooms();
      })
      .subscribe();

    const refresh = window.setInterval(() => void loadLiveRooms(), 30000);

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
      window.clearInterval(refresh);
    };
  }, [loadLiveRooms, supabase]);

  if (pathname === "/social" || pathname.startsWith("/social/")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div className="mb-3 w-[min(calc(100vw-2.5rem),360px)] overflow-hidden rounded-2xl border border-amber-500/40 bg-[#fffaf0] shadow-[0_0_22px_rgba(198,154,53,.18),0_18px_60px_rgba(0,0,0,.6)]">
          <div className="flex items-center justify-between border-b border-amber-500/15 px-4 py-3">
            <div>
              <p className="text-[10px] font-black tracking-[.22em] text-amber-500">MUSEK SOCIAL</p>
              <p className="mt-1 text-sm font-extrabold text-white">Who’s live right now?</p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-700">{rooms.length} LIVE</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            {!checkedAuth ? (
              <p className="px-3 py-7 text-center text-xs text-amber-700/70">Checking live rooms…</p>
            ) : !signedIn ? (
              <div className="px-3 py-7 text-center">
                <div className="text-2xl text-amber-500">♫</div>
                <p className="mt-2 text-sm font-bold text-white">Join the MUSEK community</p>
                <p className="mt-1 text-xs text-gray-400">Log in to see live rooms and join the conversation.</p>
                <Link href="/login" onClick={() => setOpen(false)} className="mt-4 inline-flex rounded-lg border border-amber-500/50 bg-amber-500 px-4 py-2 text-xs font-black text-[#fff] hover:bg-amber-700">Log in</Link>
              </div>
            ) : rooms.length === 0 ? (
              <div className="px-3 py-7 text-center">
                <div className="text-2xl text-amber-500">♫</div>
                <p className="mt-2 text-sm font-bold text-white">No one is live right now</p>
                <p className="mt-1 text-xs text-gray-400">Start a room and let your community join.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {rooms.map((room) => (
                  <li key={room.id}>
                    <Link
                      href="/social"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-white/[0.04] p-3 transition hover:border-amber-500/50 hover:bg-amber-500/[0.08]"
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-lg text-amber-700">
                        ♫
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#fffaf0] bg-amber-500 shadow-[0_0_9px_#a3e635]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{room.host_name} is live</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-400">{room.title}</span>
                      </span>
                      <span className="text-xs font-bold text-amber-700">Join →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-amber-500/15 p-3">
            <Link href={signedIn ? "/social" : "/login"} onClick={() => setOpen(false)} className="block rounded-xl border border-amber-700/70 bg-gradient-to-b from-amber-700 via-amber-500 to-yellow-700 px-4 py-2.5 text-center text-xs font-black tracking-wide text-[#142006] shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_0_16px_rgba(198,154,53,.22)] hover:brightness-110">
              {signedIn ? "OPEN MUSEK SOCIAL" : "LOG IN TO MUSEK"}
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close live rooms" : "Show who is live"}
        className="group relative isolate flex min-w-[218px] items-center gap-3 overflow-hidden rounded-2xl border border-[#e7d09a] bg-gradient-to-b from-[#fff8e8] via-[#d9b65f] to-[#8f6818] p-[2px] text-left shadow-[0_2px_0_#294506,0_5px_0_#172b04,0_0_18px_rgba(198,154,53,.72),0_0_42px_rgba(198,154,53,.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_3px_0_#294506,0_7px_0_#172b04,0_0_25px_rgba(225,190,111,.9),0_0_58px_rgba(198,154,53,.42)] active:translate-y-1 active:shadow-[0_1px_0_#172b04,0_0_16px_rgba(198,154,53,.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
      >
        <span className="pointer-events-none absolute inset-x-3 top-[2px] z-20 h-px bg-white/95" />
        <span className="pointer-events-none absolute -left-1/2 top-0 z-20 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-[520%]" />
        <span className="relative flex h-[48px] w-[50px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[#f5e7c2]/80 bg-gradient-to-br from-[#d8bd78] via-[#a77b22] to-[#805f19] shadow-[inset_0_1px_5px_rgba(255,255,255,.25),inset_0_-5px_10px_rgba(0,0,0,.8)]">
          <span className="absolute inset-1 rounded-lg border border-amber-500/30" />
          <span className="relative text-[25px] font-black leading-none text-[#fff8e8] drop-shadow-[0_0_8px_rgba(225,190,111,.95)]">♫</span>
          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#fff8e8] shadow-[0_0_8px_#fff8e8]" />
        </span>
        <span className="relative min-w-0 flex-1 py-1 pr-2">
          <span className="block text-[9px] font-black tracking-[.28em] text-[#805f19]">ENTER THE ROOM</span>
          <span className="mt-0.5 block text-[16px] font-black leading-none tracking-[.12em] text-[#4f3b12] drop-shadow-[0_1px_0_rgba(255,255,255,.35)]">MUSEK SOCIAL</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[9px] font-extrabold tracking-[.16em] text-[#805f19]">
            <span className={rooms.length > 0 ? "relative h-1.5 w-1.5 rounded-full bg-[#8f6818] shadow-[0_0_7px_#8f6818]" : "h-1.5 w-1.5 rounded-full bg-[#b88b2b]"} />
            {rooms.length > 0 ? `${rooms.length} LIVE NOW` : "MUSIC • PEOPLE • LIVE"}
          </span>
        </span>
        <span className="relative mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#f5e7c2]/80 bg-gradient-to-b from-[#b88b2b] to-[#805f19] text-lg font-black text-[#fff8e8] shadow-[inset_0_1px_2px_rgba(255,255,255,.45),0_2px_4px_rgba(0,0,0,.3)]">›</span>
      </button>
    </div>
  );
}
