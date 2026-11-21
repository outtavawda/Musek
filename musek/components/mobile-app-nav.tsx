"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Home", icon: "⌂", match: (path: string) => path === "/" },
  { href: "/discover-music", label: "Discover", icon: "⌕", match: (path: string) => path.startsWith("/discover") },
  { href: "/social", label: "Social", icon: "◎", match: (path: string) => path === "/social" },
  { href: "/social#live-rooms", label: "Live", icon: "◉", match: (path: string) => path === "/social" },
  { href: "/buy-coins", label: "Wallet", icon: "◇", match: (path: string) => path.startsWith("/buy-coins") || path.startsWith("/withdrawals") },
];

export default function MobileAppNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <>
      <nav className="musek-mobile-nav" aria-label="Mobile app navigation">
        {items.map((item) => {
          const active = item.label === "Live"
            ? pathname === "/social" && hash === "#live-rooms"
            : item.label === "Social"
              ? pathname === "/social" && hash !== "#live-rooms"
              : item.match(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={active ? "musek-mobile-nav-item active" : "musek-mobile-nav-item"}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
            >
              <span className="musek-mobile-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <style jsx global>{`
        .musek-mobile-nav {
          display: none;
        }
        @media (max-width: 760px) {
          body {
            padding-bottom: calc(76px + env(safe-area-inset-bottom));
          }
          .musek-mobile-nav {
            position: fixed;
            z-index: 1000;
            left: 0;
            right: 0;
            bottom: 0;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 2px;
            padding: 9px 8px calc(9px + env(safe-area-inset-bottom));
            border-top: 1px solid rgba(192, 132, 252, .2);
            background: rgba(10, 8, 17, .94);
            backdrop-filter: blur(22px);
            -webkit-backdrop-filter: blur(22px);
            box-shadow: 0 -12px 35px rgba(0, 0, 0, .38);
          }
          .musek-mobile-nav-item {
            min-width: 0;
            min-height: 44px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 4px 2px;
            border-radius: 12px;
            color: #898296;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .01em;
            text-decoration: none;
            -webkit-tap-highlight-color: transparent;
          }
          .musek-mobile-nav-item.active {
            color: #e9d5ff;
          }
          .musek-mobile-nav-icon {
            display: grid;
            place-items: center;
            width: 27px;
            height: 25px;
            font-size: 22px;
            line-height: 1;
          }
          .musek-mobile-nav-item.active .musek-mobile-nav-icon {
            color: #d8b4fe;
            filter: drop-shadow(0 0 8px rgba(192, 132, 252, .55));
          }
        }
      `}</style>
    </>
  );
}
