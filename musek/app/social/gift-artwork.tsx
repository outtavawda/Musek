"use client";

type GiftArtworkProps = {
  category: string;
  name: string;
  emoji: string;
  tier: "small" | "medium" | "premium" | "legendary";
};

export default function GiftArtwork({ category, name, emoji, tier }: GiftArtworkProps) {
  const kind = category.toLowerCase();
  return (
    <div className={`musek-gift-art musek-gift-art-${tier} musek-gift-art-${kind}`} aria-label={name} role="img">
      <div className="musek-gift-art-aura" />
      <svg viewBox="0 0 220 220" aria-hidden="true" className="musek-gift-art-svg">
        <defs>
          <linearGradient id="giftGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7c2"/><stop offset=".42" stopColor="#fbbf24"/><stop offset="1" stopColor="#92400e"/></linearGradient>
          <linearGradient id="giftPurple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d0fe"/><stop offset=".48" stopColor="#a855f7"/><stop offset="1" stopColor="#581c87"/></linearGradient>
          <linearGradient id="giftBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dbeafe"/><stop offset=".5" stopColor="#38bdf8"/><stop offset="1" stopColor="#1e3a8a"/></linearGradient>
          <radialGradient id="giftGlow"><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset="1" stopColor="#c084fc" stopOpacity="0"/></radialGradient>
          <filter id="giftShadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <ellipse cx="110" cy="185" rx="57" ry="13" fill="#000" opacity=".42" filter="url(#giftShadow)"/>
        {kind === "love" ? (
          <g className="gift-object">
            <path d="M110 177 43 111C-1 63 63 16 110 66c47-50 111-3 67 45z" fill="url(#giftPurple)" stroke="#f5d0fe" strokeWidth="4"/>
            <path d="M110 165 54 109c-27-30 8-58 37-29l19 19 19-19c29-29 64-1 37 29z" fill="#fff" opacity=".18"/>
            <path d="M66 77c7-13 20-18 32-10" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".7"/>
          </g>
        ) : kind === "music" ? (
          <g className="gift-object">
            <path d="M90 46v94c-7-9-27-11-39-2-15 12-6 33 12 34 22 1 35-14 35-31V78l63-15v59c-8-9-27-10-39-1-15 12-6 33 12 34 22 1 35-14 35-31V31z" fill="url(#giftPurple)" stroke="#f5d0fe" strokeWidth="4" strokeLinejoin="round"/>
            <path d="M106 64 161 51" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".7"/>
          </g>
        ) : kind === "party" ? (
          <g className="gift-object">
            <path d="m110 25 20 51 54-13-27 48 38 39-56-3-19 52-20-52-56 3 38-39-27-48 54 13z" fill="url(#giftGold)" stroke="#fff2b2" strokeWidth="4" strokeLinejoin="round"/>
            <circle cx="110" cy="111" r="20" fill="#fff7c2" opacity=".55"/>
          </g>
        ) : kind === "luxury" ? (
          <g className="gift-object">
            <path d="m110 24 72 48-72 124L38 72z" fill="url(#giftBlue)" stroke="#dbeafe" strokeWidth="4" strokeLinejoin="round"/>
            <path d="m38 72 72 15 72-15-72 124z" fill="#fff" opacity=".17"/>
            <path d="m110 24 0 63 72-15z" fill="#fff" opacity=".38"/>
            <path d="m38 72 72 15 0-63z" fill="#fff" opacity=".2"/>
          </g>
        ) : kind === "royalty" ? (
          <g className="gift-object">
            <path d="m34 75 42 31 34-69 34 69 42-31-17 91H51z" fill="url(#giftGold)" stroke="#fff2b2" strokeWidth="5" strokeLinejoin="round"/>
            <path d="M51 166h118v18H51z" fill="#b45309" stroke="#fde68a" strokeWidth="3"/>
            <circle cx="34" cy="72" r="11" fill="#fff7c2"/><circle cx="110" cy="35" r="11" fill="#fff7c2"/><circle cx="186" cy="72" r="11" fill="#fff7c2"/>
          </g>
        ) : kind === "culture" ? (
          <g className="gift-object">
            <path d="M54 62q56-38 112 0l-10 104q-46 31-92 0z" fill="url(#giftGold)" stroke="#ffedb0" strokeWidth="4"/>
            <ellipse cx="110" cy="62" rx="56" ry="20" fill="#fef3c7" stroke="#92400e" strokeWidth="5"/>
            <path d="M65 98h90M62 122h96M69 147h82" stroke="#7c2d12" strokeWidth="8" strokeLinecap="round"/>
          </g>
        ) : kind === "power" ? (
          <g className="gift-object">
            <path d="M110 24c-40 39-43 90-24 125h48c19-35 16-86-24-125z" fill="url(#giftBlue)" stroke="#dbeafe" strokeWidth="4"/>
            <circle cx="110" cy="91" r="17" fill="#fef3c7" stroke="#7dd3fc" strokeWidth="5"/>
            <path d="m86 132-26 40 38-14m36-26 26 40-38-14" fill="#f97316" stroke="#fed7aa" strokeWidth="4" strokeLinejoin="round"/>
            <path d="m100 150 10 44 10-44" fill="#fbbf24"/>
          </g>
        ) : (
          <g className="gift-object">
            <circle cx="110" cy="107" r="61" fill="url(#giftPurple)" stroke="#f5d0fe" strokeWidth="4"/>
            <ellipse cx="110" cy="107" rx="91" ry="31" transform="rotate(-24 110 107)" fill="none" stroke="url(#giftGold)" strokeWidth="10"/>
            <circle cx="88" cy="82" r="13" fill="#fff" opacity=".6"/>
            <circle cx="151" cy="136" r="5" fill="#fde68a"/><circle cx="54" cy="116" r="4" fill="#fff"/>
          </g>
        )}
        <path d="M34 43 40 30m145 18 8-12M26 145l-12 5m174 12 12 5" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8"/>
      </svg>
      <span className="musek-gift-art-fallback">{emoji}</span>
    </div>
  );
}
