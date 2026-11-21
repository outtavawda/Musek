"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notice = {
  id: string;
  title: string;
  message: string;
  link: string;
  created_at: string;
  read_at: string | null;
};

export default function GlobalNotifications() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  const unread = items.filter((item) => !item.read_at).length;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    async function connect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      setUserId(user.id);
      const { data } = await supabase.from("user_notifications")
        .select("id,title,message,link,created_at,read_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (!active) return;
      setItems((data || []) as Notice[]);
      channel = supabase.channel("musek-notifications-" + user.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: "user_id=eq." + user.id },
          (payload) => setItems((current) => [payload.new as Notice, ...current].slice(0, 20)))
        .subscribe();
    }
    connect();
    return () => { active = false; if (channel) supabase.removeChannel(channel); };
  }, [supabase]);

  async function markRead(item: Notice) {
    if (!userId || item.read_at) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: readAt } : entry));
    await supabase.from("user_notifications").update({ read_at: readAt }).eq("id", item.id).eq("user_id", userId);
  }

  if (!userId) return null;

  return (
    <div className="fixed right-5 top-5 z-[120]">
      <button type="button" onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-purple-300/30 bg-[#171326] text-xl text-white shadow-xl hover:border-purple-300">
        ♢
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && <section className="absolute right-0 mt-3 w-[min(360px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-purple-300/20 bg-[#11101d] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-black">Notifications</h2>
          <button onClick={() => setOpen(false)} className="text-xs text-gray-400">Close</button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? <p className="p-5 text-sm text-gray-400">You're all caught up. We'll let you know when an artist you follow goes live.</p> :
            items.map((item) => <Link key={item.id} href={item.link || "/social"} onClick={() => markRead(item)}
              className={`block border-b border-white/5 px-4 py-3 hover:bg-white/5 ${item.read_at ? "opacity-65" : "bg-purple-500/[.08]"}`}>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs text-gray-300">{item.message}</p>
              <p className="mt-2 text-[10px] text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
            </Link>)}
        </div>
      </section>}
    </div>
  );
}
