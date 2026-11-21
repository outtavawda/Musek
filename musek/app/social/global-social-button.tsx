"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type LiveRoom = {
  id: string;
  title: string;
  host_name: string;
  created_at: string;
};

export default function GlobalSocialButton() {
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

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div className="mb-3 w-[min(calc(100vw-2.5rem),360px)] overflow-hidden rounded-2xl border border-lime-300/40 bg-[#10170d] shadow-[0_0_22px_rgba(163,230,53,.18),0_18px_60px_rgba(0,0,0,.6)]">
          <div className="flex items-center justify-between border-b border-lime-300/15 px-4 py-3">
            <div>
              <p className="text-[10px] font-black tracking-[.22em] text-lime-300">MUSEK SOCIAL</p>
              <p className="mt-1 text-sm font-extrabold text-white">Who’s live right now?</p>
            </div>
            <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2.5 py-1 text-[10px] font-black text-lime-200">{rooms.length} LIVE</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            {!checkedAuth ? (
              <p className="px-3 py-7 text-center text-xs text-lime-100/70">Checking live rooms…</p>
            ) : !signedIn ? (
              <div className="px-3 py-7 text-center">
                <div className="text-2xl text-lime-300">♫</div>
                <p className="mt-2 text-sm font-bold text-white">Join the MUSEK community</p>
                <p className="mt-1 text-xs text-gray-400">Log in to see live rooms and join the conversation.</p>
                <Link href="/login" onClick={() => setOpen(false)} className="mt-4 inline-flex rounded-lg border border-lime-300/50 bg-lime-300 px-4 py-2 text-xs font-black text-[#15200b] hover:bg-lime-200">Log in</Link>
              </div>
            ) : rooms.length === 0 ? (
              <div className="px-3 py-7 text-center">
                <div className="text-2xl text-lime-300">♫</div>
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
                      className="flex items-center gap-3 rounded-xl border border-lime-300/15 bg-white/[0.04] p-3 transition hover:border-lime-300/50 hover:bg-lime-300/[0.08]"
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lime-300/30 bg-lime-300/10 text-lg text-lime-200">
                        ♫
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#10170d] bg-lime-300 shadow-[0_0_9px_#a3e635]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{room.host_name} is live</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-400">{room.title}</span>
                      </span>
                      <span className="text-xs font-bold text-lime-200">Join →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-lime-300/15 p-3">
            <Link href={signedIn ? "/social" : "/login"} onClick={() => setOpen(false)} className="block rounded-xl border border-lime-200/70 bg-gradient-to-b from-lime-200 via-lime-400 to-lime-600 px-4 py-2.5 text-center text-xs font-black tracking-wide text-[#142006] shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_0_16px_rgba(163,230,53,.22)] hover:brightness-110">
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
        className="group relative isolate flex min-w-[218px] items-center gap-3 overflow-hidden rounded-2xl border border-[#d9ff83] bg-gradient-to-b from-[#f5ffd8] via-[#a8e934] to-[#426b08] p-[2px] text-left shadow-[0_2px_0_#294506,0_5px_0_#172b04,0_0_18px_rgba(163,230,53,.72),0_0_42px_rgba(163,230,53,.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_3px_0_#294506,0_7px_0_#172b04,0_0_25px_rgba(190,242,100,.9),0_0_58px_rgba(163,230,53,.42)] active:translate-y-1 active:shadow-[0_1px_0_#172b04,0_0_16px_rgba(163,230,53,.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-200"
      >
        <span className="pointer-events-none absolute inset-x-3 top-[2px] z-20 h-px bg-white/95" />
        <span className="pointer-events-none absolute -left-1/2 top-0 z-20 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-[520%]" />
        <span className="relative flex h-[48px] w-[50px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[#f1ffc9]/80 bg-gradient-to-br from-[#304c0a] via-[#172705] to-[#080e03] shadow-[inset_0_1px_5px_rgba(255,255,255,.25),inset_0_-5px_10px_rgba(0,0,0,.8)]">
          <span className="absolute inset-1 rounded-lg border border-lime-300/30" />
          <span className="relative text-[25px] font-black leading-none text-[#caff69] drop-shadow-[0_0_8px_rgba(190,242,100,.95)]">♫</span>
          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#caff69] shadow-[0_0_8px_#caff69]" />
        </span>
        <span className="relative min-w-0 flex-1 py-1 pr-2">
          <span className="block text-[9px] font-black tracking-[.28em] text-[#34510b]">ENTER THE ROOM</span>
          <span className="mt-0.5 block text-[16px] font-black leading-none tracking-[.12em] text-[#102000] drop-shadow-[0_1px_0_rgba(255,255,255,.35)]">MUSEK SOCIAL</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[9px] font-extrabold tracking-[.16em] text-[#294507]">
            <span className={rooms.length > 0 ? "relative h-1.5 w-1.5 rounded-full bg-[#164b19] shadow-[0_0_7px_#164b19]" : "h-1.5 w-1.5 rounded-full bg-[#536b30]"} />
            {rooms.length > 0 ? `${rooms.length} LIVE NOW` : "MUSIC • PEOPLE • LIVE"}
          </span>
        </span>
        <span className="relative mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#eaffbd]/80 bg-gradient-to-b from-[#557f12] to-[#203b05] text-lg font-black text-[#edffc9] shadow-[inset_0_1px_2px_rgba(255,255,255,.45),0_2px_4px_rgba(0,0,0,.3)]">›</span>
      </button>
    </div>
  );
}
