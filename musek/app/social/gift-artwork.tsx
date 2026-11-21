"use client";

import { useId } from "react";

type GiftArtworkProps = {
  category: string;
  name: string;
  emoji: string;
  tier: "catalog" | "small" | "medium" | "premium" | "legendary";
};

export default function GiftArtwork({ category, name, emoji, tier }: GiftArtworkProps) {
  const kind = category.toLowerCase();
  const uid = useId().replace(/:/g, "");
  return (
    <div className={`musek-gift-art musek-gift-art-${tier} musek-gift-art-${kind}`} aria-label={name} role="img">
      <div className="musek-gift-art-aura" />
      <svg viewBox="0 0 220 220" aria-hidden="true" className="musek-gift-art-svg">
        <defs>
          <linearGradient id={uid + "Gold"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7c2"/><stop offset=".42" stopColor="#fbbf24"/><stop offset="1" stopColor="#92400e"/></linearGradient>
          <linearGradient id={uid + "Purple"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d0fe"/><stop offset=".48" stopColor="#a855f7"/><stop offset="1" stopColor="#581c87"/></linearGradient>
          <linearGradient id={uid + "Blue"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dbeafe"/><stop offset=".5" stopColor="#38bdf8"/><stop offset="1" stopColor="#1e3a8a"/></linearGradient>
          <radialGradient id={uid + "Glow"}><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset="1" stopColor="#c084fc" stopOpacity="0"/></radialGradient>
          <filter id={uid + "Shadow"} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <ellipse cx="110" cy="185" rx="57" ry="13" fill="#000" opacity=".42" filter={`url(#${uid}Shadow)`}/>
        {kind === "love" ? (
          <g className="gift-object">
            <path d="M110 177 43 111C-1 63 63 16 110 66c47-50 111-3 67 45z" fill={`url(#${uid}Purple)`} stroke="#f5d0fe" strokeWidth="4"/>
            <path d="M110 165 54 109c-27-30 8-58 37-29l19 19 19-19c29-29 64-1 37 29z" fill="#fff" opacity=".18"/>
            <path d="M66 77c7-13 20-18 32-10" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".7"/>
          </g>
        ) : kind === "music" ? (
          <g className="gift-object">
            <path d="M90 46v94c-7-9-27-11-39-2-15 12-6 33 12 34 22 1 35-14 35-31V78l63-15v59c-8-9-27-10-39-1-15 12-6 33 12 34 22 1 35-14 35-31V31z" fill={`url(#${uid}Purple)`} stroke="#f5d0fe" strokeWidth="4" strokeLinejoin="round"/>
            <path d="M106 64 161 51" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".7"/>
          </g>
        ) : kind === "party" ? (
          <g className="gift-object">
            <path d="m110 25 20 51 54-13-27 48 38 39-56-3-19 52-20-52-56 3 38-39-27-48 54 13z" fill={`url(#${uid}Gold)`} stroke="#fff2b2" strokeWidth="4" strokeLinejoin="round"/>
            <circle cx="110" cy="111" r="20" fill="#fff7c2" opacity=".55"/>
          </g>
        ) : kind === "luxury" ? (
          <g className="gift-object">
            <path d="m110 24 72 48-72 124L38 72z" fill={`url(#${uid}Blue)`} stroke="#dbeafe" strokeWidth="4" strokeLinejoin="round"/>
            <path d="m38 72 72 15 72-15-72 124z" fill="#fff" opacity=".17"/>
            <path d="m110 24 0 63 72-15z" fill="#fff" opacity=".38"/>
            <path d="m38 72 72 15 0-63z" fill="#fff" opacity=".2"/>
          </g>
        ) : kind === "royalty" ? (
          <g className="gift-object">
            <path d="m34 75 42 31 34-69 34 69 42-31-17 91H51z" fill={`url(#${uid}Gold)`} stroke="#fff2b2" strokeWidth="5" strokeLinejoin="round"/>
            <path d="M51 166h118v18H51z" fill="#b45309" stroke="#fde68a" strokeWidth="3"/>
            <circle cx="34" cy="72" r="11" fill="#fff7c2"/><circle cx="110" cy="35" r="11" fill="#fff7c2"/><circle cx="186" cy="72" r="11" fill="#fff7c2"/>
          </g>
        ) : kind === "culture" ? (
          <g className="gift-object">
            <path d="M54 62q56-38 112 0l-10 104q-46 31-92 0z" fill={`url(#${uid}Gold)`} stroke="#ffedb0" strokeWidth="4"/>
            <ellipse cx="110" cy="62" rx="56" ry="20" fill="#fef3c7" stroke="#92400e" strokeWidth="5"/>
            <path d="M65 98h90M62 122h96M69 147h82" stroke="#7c2d12" strokeWidth="8" strokeLinecap="round"/>
          </g>
        ) : kind === "power" ? (
          <g className="gift-object">
            <path d="M110 24c-40 39-43 90-24 125h48c19-35 16-86-24-125z" fill={`url(#${uid}Blue)`} stroke="#dbeafe" strokeWidth="4"/>
            <circle cx="110" cy="91" r="17" fill="#fef3c7" stroke="#7dd3fc" strokeWidth="5"/>
            <path d="m86 132-26 40 38-14m36-26 26 40-38-14" fill="#f97316" stroke="#fed7aa" strokeWidth="4" strokeLinejoin="round"/>
            <path d="m100 150 10 44 10-44" fill="#fbbf24"/>
          </g>
        ) : (
          <g className="gift-object">
            <circle cx="110" cy="107" r="61" fill={`url(#${uid}Purple)`} stroke="#f5d0fe" strokeWidth="4"/>
            <ellipse cx="110" cy="107" rx="91" ry="31" transform="rotate(-24 110 107)" fill="none" stroke="url(#${uid}Gold)" strokeWidth="10"/>
            <circle cx="88" cy="82" r="13" fill="#fff" opacity=".6"/>
            <circle cx="151" cy="136" r="5" fill="#fde68a"/><circle cx="54" cy="116" r="4" fill="#fff"/>
          </g>
        )}
        <path d="M34 43 40 30m145 18 8-12M26 145l-12 5m174 12 12 5" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8"/>
      </svg>
      <span className="musek-gift-art-fallback">{emoji}</span>

      <style jsx>{`
        .musek-gift-art { position:relative; display:grid; width:clamp(150px,24vw,250px); aspect-ratio:1; place-items:center; perspective:900px; transform-style:preserve-3d; }
        .musek-gift-art-aura { position:absolute; inset:12%; border-radius:50%; background:radial-gradient(circle,rgba(192,132,252,.42),rgba(124,58,237,.12) 48%,transparent 72%); transform:translateZ(-35px); }
        .musek-gift-art-svg { position:relative; z-index:1; width:100%; height:100%; overflow:visible; transform-style:preserve-3d; filter:drop-shadow(0 18px 14px rgba(0,0,0,.4)); animation:gift-object-turn 5s ease-in-out infinite; }
        .musek-gift-art-svg .gift-object { transform-origin:110px 110px; animation:gift-object-float 2.6s ease-in-out infinite; }
        .musek-gift-art-fallback { position:absolute; right:8%; bottom:9%; z-index:2; font-size:clamp(22px,4vw,36px); filter:drop-shadow(0 3px 5px rgba(0,0,0,.55)); }
        .musek-gift-art-catalog { width:58px; flex:0 0 58px; }
        .musek-gift-art-catalog .musek-gift-art-svg,.musek-gift-art-catalog .gift-object { animation:none !important; }
        .musek-gift-art-catalog .musek-gift-art-fallback { display:none; }
        .musek-gift-art-small { width:58px; flex:0 0 58px; }
        .musek-gift-art-small .musek-gift-art-fallback { display:none; }
        .musek-gift-art-medium { animation:gift-art-entry .8s cubic-bezier(.2,.8,.2,1) both; }
        .musek-gift-art-premium .musek-gift-art-aura,.musek-gift-art-legendary .musek-gift-art-aura { background:radial-gradient(circle,rgba(250,204,21,.38),rgba(168,85,247,.22) 48%,transparent 72%); }
        .musek-gift-art-legendary { width:clamp(190px,31vw,320px); animation:gift-art-entry 1.1s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-art-legendary .musek-gift-art-svg { animation-duration:3.2s; }
        .musek-gift-art-legendary .musek-gift-art-fallback { right:5%; bottom:6%; font-size:44px; }
        @keyframes gift-object-turn { 0%,100% { transform:rotateY(-13deg) rotateX(5deg) translateY(0); } 50% { transform:rotateY(13deg) rotateX(-5deg) translateY(-10px); } }
        @keyframes gift-object-float { 0%,100% { transform:translateY(0) rotateZ(-2deg); } 50% { transform:translateY(-8px) rotateZ(2deg); } }
        @keyframes gift-art-entry { 0% { transform:scale(.35) rotateY(70deg); opacity:0; } 70% { transform:scale(1.08) rotateY(-8deg); opacity:1; } 100% { transform:scale(1) rotateY(0); } }
        @media (prefers-reduced-motion:reduce) { .musek-gift-art,.musek-gift-art * { animation-duration:.01ms !important; animation-iteration-count:1 !important; } }
      `}</style>
    </div>
  );
}
