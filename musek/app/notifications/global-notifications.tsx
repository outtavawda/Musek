"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
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
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (!active) return;
      setItems((data || []) as Notice[]);
      channel = supabase.channel("musek-notifications-" + user.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: "user_id=eq." + user.id },
          (payload) => setItems((current) => [payload.new as Notice, ...current].slice(0, 30)))
        .subscribe();
    }
    void connect();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [supabase]);

  async function markRead(item: Notice) {
    if (!userId || item.read_at) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: readAt } : entry));
    await supabase.from("user_notifications").update({ read_at: readAt }).eq("id", item.id).eq("user_id", userId);
  }

  if (!userId) return null;

  return (
    <div className="fixed left-4 top-3 z-[120] flex items-center gap-3 sm:left-6 sm:top-5">\n      {pathname !== "/" && <Link href="/" aria-label="YASUH home" className="text-[23px] font-black tracking-[-0.08em] text-stone-900 drop-shadow-none">YASUH<span className="text-amber-700">.</span></Link>}
      <button type="button" onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="group relative grid h-10 w-10 place-items-center rounded-full border border-amber-300/35 bg-white text-amber-800 shadow-[0_6px_20px_rgba(70,55,25,.12)] transition duration-200 hover:border-amber-200/70 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] transition duration-200 group-hover:scale-110 group-hover:text-amber-100" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>
          <circle cx="12" cy="10" r="2.5"/>
        </svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-[21px] min-w-[21px] place-items-center rounded-full border-2 border-white bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-700 px-1 text-[9px] font-black text-white shadow-[0_2px_12px_rgba(198,154,53,.3)]">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && <>
        <button aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-[-1] cursor-default bg-black/15 sm:bg-transparent"/>
        <section aria-label="Notifications panel" className="absolute right-0 mt-3 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[22px] border border-amber-200 bg-white/95 text-stone-900 shadow-[0_24px_80px_rgba(0,0,0,.65)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-yellow-50 px-4 py-4">
            <div>
              <div className="flex items-center gap-2"><h2 className="text-[15px] font-extrabold tracking-tight">Notifications</h2><span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800">YASUH</span></div>
              <p className="mt-1 text-[11px] text-stone-500">{unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="grid h-8 w-8 place-items-center rounded-full border border-amber-100 bg-amber-50 text-sm text-stone-600 transition hover:bg-amber-100 hover:text-stone-900">✕</button>
          </div>
          <div className="max-h-[min(65vh,520px)] overflow-y-auto p-2">
            {items.length === 0 ? <div className="px-6 py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-800 shadow-inner"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></span><p className="mt-3 text-sm font-bold">Nothing new yet</p><p className="mt-1 text-xs leading-5 text-stone-500">Updates from artists and your YASUH community will show up here.</p></div> :
              items.map((item) => <Link key={item.id} href={item.link || "/social"} onClick={() => { void markRead(item); setOpen(false); }}
                className={`group mb-1 flex gap-3 rounded-2xl border px-3 py-3 transition hover:border-amber-200 hover:bg-amber-50 ${item.read_at ? "border-transparent bg-stone-50" : "border-amber-200 bg-amber-50"}`}>
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.read_at ? "bg-stone-100 text-stone-500" : "bg-gradient-to-br from-fuchsia-500/25 to-violet-500/20 text-fuchsia-100"}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10 21 7v10l-6-3"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2"><span className="text-[12px] font-bold leading-5 text-stone-900">{item.title}</span>{!item.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-300 shadow-[0_0_10px_rgba(216,180,254,.8)]"/>}</span>
                  <span className="mt-0.5 block text-[11px] leading-[1.55] text-stone-600">{item.message}</span>
                  <span className="mt-2 block text-[9px] font-medium text-stone-500">{new Date(item.created_at).toLocaleString()}</span>
                </span>
              </Link>)}
          </div>
          <div className="border-t border-amber-100 px-4 py-2.5"><p className="text-center text-[9px] font-semibold tracking-wide text-stone-500">YOU'RE CONNECTED TO THE YASUH COMMUNITY</p></div>
        </section>
      </>}
    </div>
  );
}
