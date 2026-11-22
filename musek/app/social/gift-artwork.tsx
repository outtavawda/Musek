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
  const giftKey = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div className={`musek-gift-art musek-gift-art-${tier} musek-gift-art-${kind} musek-gift-art-${giftKey}`} aria-label={name} role="img">
      <div className="musek-gift-art-aura" />
      <svg viewBox="0 0 220 220" aria-hidden="true" className="musek-gift-art-svg">
        <defs>
          <linearGradient id={uid + "Gold"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7c2"/><stop offset=".42" stopColor="#fbbf24"/><stop offset="1" stopColor="#92400e"/></linearGradient>
          <linearGradient id={uid + "Purple"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d0fe"/><stop offset=".48" stopColor="#a855f7"/><stop offset="1" stopColor="#581c87"/></linearGradient>
          <linearGradient id={uid + "Blue"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dbeafe"/><stop offset=".5" stopColor="#38bdf8"/><stop offset="1" stopColor="#1e3a8a"/></linearGradient>
          <radialGradient id={uid + "Glow"}><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset="1" stopColor="#c084fc" stopOpacity="0"/></radialGradient>
          <linearGradient id={uid + "Fire"} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#b91c1c"/><stop offset=".48" stopColor="#f97316"/><stop offset="1" stopColor="#fef08a"/></linearGradient>
          <linearGradient id={uid + "Emerald"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d1fae5"/><stop offset=".5" stopColor="#10b981"/><stop offset="1" stopColor="#064e3b"/></linearGradient>
          <filter id={uid + "Shadow"} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <ellipse cx="110" cy="185" rx="57" ry="13" fill="#000" opacity=".42" filter={`url(#${uid}Shadow)`}/>
        {name === "Rose" ? (
          <g className="gift-object gift-rose">
            <path d="M110 105c-8 22-10 45-7 75m7-52c-19-14-33-12-43-2 18 2 30 11 38 23m8-14c16-19 31-20 44-10-18 6-29 16-39 31" fill="none" stroke={`url(#${uid}Emerald)`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M110 112c-26-12-38-36-20-51 8-7 17-5 20 4 5-17 28-18 37-4 12 19-8 42-37 51z" fill="#dc2626" stroke="#fecaca" strokeWidth="4"/>
            <path d="M110 102c-14-10-17-21-8-28 6-4 11 0 8 8 7-13 20-10 21-1 1 8-8 16-21 21z" fill="#fb7185" stroke="#fda4af" strokeWidth="2"/>
            <path d="M110 111c-18-8-31-22-28-36 3-12 15-16 25-9-10 2-13 12-5 21 5-10 16-17 27-14 16 5 14 25-19 38z" fill="#b91c1c" opacity=".92"/>
            <path d="M110 113c-7-18-6-32 0-45 7 15 8 30 0 45z" fill="#fda4af" opacity=".9"/>
            <path d="M110 174q-18 8-27 1 13 22 30 9 16 12 30-8-15 7-33-2z" fill="#059669" stroke="#a7f3d0" strokeWidth="3"/>
          </g>
        ) : name === "Dragon" ? (
          <g className="gift-object gift-dragon">
            <path d="M47 145c-20-24-13-55 12-69-3 18 7 26 19 28-7-27 10-55 36-76-5 27 6 38 24 48 27 15 35 42 22 66-12 23-39 39-70 36-19-2-34-13-43-33z" fill={`url(#${uid}Emerald)`} stroke="#d1fae5" strokeWidth="4"/>
            <path d="M91 105c17-16 38-13 48-2l23 4-15 13 9 15-25-7c-12 12-31 15-46 4z" fill={`url(#${uid}Gold)`} stroke="#fef3c7" strokeWidth="3"/>
            <path d="m90 102-31-35 6 43-24 16 43 2m51-27 18-32 2 43 25 9-43 3" fill="#059669" stroke="#d1fae5" strokeWidth="4" strokeLinejoin="round"/>
            <circle cx="142" cy="112" r="4" fill="#fff7c2"/>
            <path d="M111 147q-22 25-42 6" fill="none" stroke="#a7f3d0" strokeWidth="7" strokeLinecap="round"/>
            <path d="M53 169q-18 13-5 23m25-17q-10 18 5 23" fill="none" stroke={`url(#${uid}Fire)`} strokeWidth="9" strokeLinecap="round"/>
          </g>
        ) : name === "Phoenix" ? (
          <g className="gift-object gift-phoenix">
            <path d="M110 28c-8 30-33 39-29 72-18-11-29-30-26-48-31 31-30 78-4 103 19 19 43 25 59 20 16 5 40-1 59-20 26-25 27-72-4-103 3 18-8 37-26 48 4-33-21-42-29-72z" fill={`url(#${uid}Fire)`} stroke="#ffedd5" strokeWidth="4"/>
            <path d="M110 75c-22 24-28 47-15 70 5 9 10 14 15 19 5-5 10-10 15-19 13-23 7-46-15-70z" fill={`url(#${uid}Gold)`} stroke="#fff7c2" strokeWidth="3"/>
            <path d="m76 118-38-17 24 42-21 12 52 3m51-40 38-17-24 42 21 12-52 3" fill="#f97316" stroke="#ffedd5" strokeWidth="4" strokeLinejoin="round"/>
            <circle cx="110" cy="119" r="8" fill="#fff"/>
          </g>
        ) : name === "Rocket" || name === "Private Jet" ? (
          <g className="gift-object gift-rocket">
            <path d="M110 24c-37 34-43 86-22 121h44c21-35 15-87-22-121z" fill={`url(#${uid}Blue)`} stroke="#dbeafe" strokeWidth="4"/>
            <path d="m89 122-34 40 43-13m33-27 34 40-43-13" fill={`url(#${uid}Gold)`} stroke="#fef3c7" strokeWidth="4" strokeLinejoin="round"/>
            <circle cx="110" cy="91" r="17" fill="#111827" stroke="#bfdbfe" strokeWidth="7"/>
            <path d="m95 148 15 49 15-49" fill={`url(#${uid}Fire)`}/>
            <path d="M102 157 110 183l8-26" fill="#fef08a"/>
          </g>
        ) : name === "Money Rain" || name === "Money Vault" ? (
          <g className="gift-object gift-money">
            <rect x="45" y="66" width="130" height="91" rx="13" fill={`url(#${uid}Emerald)`} stroke="#d1fae5" strokeWidth="5"/>
            <rect x="57" y="78" width="106" height="67" rx="8" fill="none" stroke="#a7f3d0" strokeWidth="3"/>
            <circle cx="110" cy="111" r="25" fill={`url(#${uid}Gold)`} stroke="#fff7c2" strokeWidth="3"/>
            <path d="M119 94c-4-5-21-6-22 4-2 12 20 8 19 19-1 10-17 12-25 4m17-37v56" fill="none" stroke="#78350f" strokeWidth="5" strokeLinecap="round"/>
            <path d="m61 39 12 17m34-35 2 23m38-13-10 20M31 101l20 2m118 61 18 9" stroke="#86efac" strokeWidth="7" strokeLinecap="round"/>
          </g>
        ) : name === "Galaxy" || name === "Universe" || name === "MUSEK Legend" ? (
          <g className="gift-object gift-cosmos">
            <circle cx="110" cy="108" r="62" fill={`url(#${uid}Purple)`} stroke="#f5d0fe" strokeWidth="4"/>
            <ellipse cx="110" cy="108" rx="91" ry="30" transform="rotate(-28 110 108)" fill="none" stroke={`url(#${uid}Gold)`} strokeWidth="10"/>
            <ellipse cx="110" cy="108" rx="72" ry="22" transform="rotate(48 110 108)" fill="none" stroke="#67e8f9" strokeWidth="4" opacity=".9"/>
            <circle cx="87" cy="83" r="13" fill="#fff" opacity=".8"/><circle cx="144" cy="132" r="7" fill="#fde68a"/><circle cx="65" cy="121" r="5" fill="#fff"/>
            <path d="m110 18 6 17 17 6-17 6-6 17-6-17-17-6 17-6zM185 65l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#fff7c2"/>
          </g>
        ) : kind === "love" ? (
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
      <span className="musek-gift-art-fallback" aria-hidden="true">{emoji}</span>

      <style jsx>{`
        .musek-gift-art { position:relative; display:grid; width:clamp(150px,24vw,250px); aspect-ratio:1; place-items:center; perspective:900px; transform-style:preserve-3d; }
        .musek-gift-art-aura { position:absolute; inset:12%; border-radius:50%; background:radial-gradient(circle,rgba(192,132,252,.42),rgba(124,58,237,.12) 48%,transparent 72%); transform:translateZ(-35px); }
        .musek-gift-art-svg { position:relative; z-index:1; width:100%; height:100%; overflow:visible; transform-style:preserve-3d; filter:drop-shadow(0 18px 14px rgba(0,0,0,.4)); animation:gift-object-turn 5s ease-in-out infinite; }
        .musek-gift-art-svg .gift-object { transform-origin:110px 110px; animation:gift-object-float 2.6s ease-in-out infinite; }
        .musek-gift-art-fallback { position:absolute; left:50%; top:50%; z-index:2; display:grid; width:46%; aspect-ratio:1; place-items:center; transform:translate(-50%,-50%); font-size:clamp(38px,8vw,76px); line-height:1; filter:drop-shadow(0 5px 10px rgba(0,0,0,.65)); animation:gift-emoji-float 2.2s ease-in-out infinite; }
        .musek-gift-art-catalog { width:100%; max-width:104px; flex:0 0 auto; margin-inline:auto; }
        .musek-gift-art-catalog .musek-gift-art-svg { animation-duration:4s; }
        .musek-gift-art-catalog .musek-gift-art-fallback { width:42%; font-size:clamp(25px,4vw,42px); }
        .musek-gift-art-small { width:58px; flex:0 0 58px; }
        .musek-gift-art-small .musek-gift-art-fallback { display:none; }
        .musek-gift-art-medium { animation:gift-art-entry .8s cubic-bezier(.2,.8,.2,1) both; }
        .musek-gift-art-premium .musek-gift-art-aura,.musek-gift-art-legendary .musek-gift-art-aura { background:radial-gradient(circle,rgba(250,204,21,.38),rgba(168,85,247,.22) 48%,transparent 72%); }
        .musek-gift-art-legendary { width:clamp(190px,31vw,320px); animation:gift-art-entry 1.1s cubic-bezier(.16,1,.3,1) both; }
        .musek-gift-art-legendary .musek-gift-art-svg { animation-duration:3.2s; }
        .musek-gift-art-legendary .musek-gift-art-fallback { right:5%; bottom:6%; font-size:44px; }
        .musek-gift-art-rose .gift-object { animation:gift-rose-motion 2.8s ease-in-out infinite; transform-origin:110px 110px; }
        .musek-gift-art-rose .musek-gift-art-aura { background:radial-gradient(circle,rgba(244,63,94,.42),rgba(190,24,93,.16) 48%,transparent 72%); }
        @keyframes gift-rose-motion { 0%,100% { transform:translateY(3px) rotate(-4deg) scale(.98); filter:drop-shadow(0 0 8px rgba(244,63,94,.45)); } 50% { transform:translateY(-10px) rotate(4deg) scale(1.07); filter:drop-shadow(0 0 24px rgba(244,63,94,.9)); } }
                .musek-gift-art-dragon .gift-object { animation:gift-dragon-motion 2.2s ease-in-out infinite; }
        .musek-gift-art-phoenix .gift-object { animation:gift-phoenix-motion 2.8s ease-in-out infinite; }
        .musek-gift-art-rocket .gift-object { animation:gift-rocket-motion 1.7s ease-in-out infinite; }
        .musek-gift-art-money-rain .gift-object,.musek-gift-art-money-vault .gift-object { animation:gift-money-motion 2.4s ease-in-out infinite; }
        .musek-gift-art-galaxy .gift-object,.musek-gift-art-universe .gift-object,.musek-gift-art-musek-legend .gift-object { animation:gift-cosmos-motion 5s linear infinite; }
        @keyframes gift-dragon-motion { 0%,100% { transform:translateY(0) rotate(-3deg) scale(1); } 50% { transform:translateY(-12px) rotate(4deg) scale(1.05); } }
        @keyframes gift-phoenix-motion { 0%,100% { transform:translateY(5px) scale(.98); filter:drop-shadow(0 0 5px #f97316); } 50% { transform:translateY(-12px) scale(1.06); filter:drop-shadow(0 0 20px #fbbf24); } }
        @keyframes gift-rocket-motion { 0%,100% { transform:translateY(5px) rotate(-3deg); } 50% { transform:translateY(-13px) rotate(3deg); } }
        @keyframes gift-money-motion { 0%,100% { transform:rotateY(-10deg) translateY(0); } 50% { transform:rotateY(10deg) translateY(-8px); } }
        @keyframes gift-cosmos-motion { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes gift-emoji-float { 0%,100% { margin-top:0; filter:drop-shadow(0 5px 8px rgba(0,0,0,.6)); } 50% { margin-top:-7px; filter:drop-shadow(0 9px 15px rgba(192,132,252,.65)); } }
        @keyframes gift-object-turn { 0%,100% { transform:rotateY(-13deg) rotateX(5deg) translateY(0); } 50% { transform:rotateY(13deg) rotateX(-5deg) translateY(-10px); } }
        @keyframes gift-object-float { 0%,100% { transform:translateY(0) rotateZ(-2deg); } 50% { transform:translateY(-8px) rotateZ(2deg); } }
        @keyframes gift-art-entry { 0% { transform:scale(.35) rotateY(70deg); opacity:0; } 70% { transform:scale(1.08) rotateY(-8deg); opacity:1; } 100% { transform:scale(1) rotateY(0); } }
        @media (prefers-reduced-motion:reduce) { .musek-gift-art,.musek-gift-art * { animation-duration:.01ms !important; animation-iteration-count:1 !important; } }
      `}</style>
    </div>
  );
}
