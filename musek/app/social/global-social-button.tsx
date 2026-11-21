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

  const loadLiveRooms = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setSignedIn(Boolean(user));
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
    loadLiveRooms();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadLiveRooms();
    });

    const channel = supabase
      .channel("musek-global-live-indicator")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_live_rooms" }, () => {
        loadLiveRooms();
      })
      .subscribe();

    const refresh = window.setInterval(loadLiveRooms, 30000);

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
      window.clearInterval(refresh);
    };
  }, [loadLiveRooms, supabase]);

  if (!signedIn) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div className="mb-3 w-[min( min( calc(100vw - 2.5rem), 360px), 360px)] overflow-hidden rounded-2xl border border-purple-300/25 bg-[#11101d] shadow-2xl shadow-purple-950/40">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-black tracking-[.2em] text-purple-300">MUSEK SOCIAL</p>
              <p className="mt-1 text-sm font-extrabold text-white">Who’s live right now?</p>
            </div>
            <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[10px] font-black text-rose-300">{rooms.length} LIVE</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            {rooms.length === 0 ? (
              <div className="px-3 py-7 text-center">
                <div className="text-2xl">♫</div>
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
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-purple-300/40 hover:bg-purple-500/10"
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-lg">
                        ♫
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#11101d] bg-rose-400" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{room.host_name} is live</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-400">{room.title}</span>
                      </span>
                      <span className="text-xs font-bold text-purple-200">Join →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-white/10 p-3">
            <Link href="/social" onClick={() => setOpen(false)} className="block rounded-xl bg-purple-600 px-4 py-2.5 text-center text-xs font-extrabold text-white hover:bg-purple-500">
              Open MUSEK SOCIAL
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close live rooms" : "Show who is live"}
        className="flex items-center gap-2 rounded-full border border-purple-300/30 bg-[#211334] px-4 py-3 text-sm font-black text-white shadow-xl shadow-purple-950/40 transition hover:-translate-y-0.5 hover:bg-[#35204d]"
      >
        <span className="relative flex h-2.5 w-2.5">
          {rooms.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />}
          <span className={rooms.length > 0 ? "relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" : "relative inline-flex h-2.5 w-2.5 rounded-full bg-gray-500"} />
        </span>
        SOCIAL
        {rooms.length > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px]">{rooms.length}</span>}
      </button>
    </div>
  );
}
