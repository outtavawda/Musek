"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  account_type: string;
  avatar_url: string | null;
  artist_name: string | null;
  genres: string[] | null;
  label_name: string | null;
  location: string | null;
  website_url: string | null;
};

export default function DiscoverSearch({ profiles }: { profiles: Profile[] }) {
  const [search, setSearch] = useState("");

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((profile) => {
      const searchableText = [
        profile.display_name, profile.artist_name, profile.label_name,
        profile.bio, profile.location, ...(profile.genres || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return searchableText.includes(term);
    });
  }, [profiles, search]);

  const labels = filteredProfiles.filter((profile) => profile.account_type === "label");
  const artists = filteredProfiles.filter((profile) => profile.account_type === "artist");

  return (
    <div className="discoverContent">
      <style>{`
        .discoverContent{width:100%;color:#fff}
        .discoverSearchBox{margin:30px 0 38px;padding:20px;border:1px solid rgba(168,85,247,.24);border-radius:18px;background:linear-gradient(135deg,rgba(126,34,206,.13),rgba(255,255,255,.025))}
        .discoverSearchInput{width:100%;padding:16px 18px;border-radius:12px;border:1px solid rgba(192,132,252,.32);background:#100d18;color:#fff;font-size:16px;outline:none}
        .discoverSearchInput:focus{border-color:#c084fc;box-shadow:0 0 0 3px rgba(168,85,247,.15)}
        .discoverGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:16px;margin-top:20px}
        .discoverCard{min-width:0;padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:linear-gradient(145deg,rgba(30,24,43,.96),rgba(13,11,19,.98));transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .discoverCard:hover{transform:translateY(-3px);border-color:rgba(192,132,252,.55);box-shadow:0 14px 36px rgba(0,0,0,.24)}
        .discoverAvatar{width:84px;height:84px;object-fit:cover;border-radius:50%;border:2px solid rgba(192,132,252,.55);background:#21172d}
        .discoverAvatar.labelAvatar{border-radius:18px}
        .discoverType{margin:17px 0 7px;color:#c084fc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase}
        .discoverName{margin:0 0 9px;font-size:21px;line-height:1.25}
        .discoverName a{color:#fff;text-decoration:none}
        .discoverName a:hover{color:#d8b4fe}
        .discoverBio{min-height:44px;color:#aaa3b5;font-size:14px;line-height:1.6}
        .discoverMeta{margin:12px 0;color:#c4bacf;font-size:12px;line-height:1.6}
        .discoverTags{display:flex;flex-wrap:wrap;gap:7px;margin:13px 0}
        .discoverTag{padding:6px 10px;border:1px solid rgba(192,132,252,.22);border-radius:999px;background:rgba(126,34,206,.12);color:#d8b4fe;font-size:11px}
        .discoverAction{display:inline-flex;margin-top:14px;padding:10px 14px;border-radius:10px;background:linear-gradient(100deg,#7e22ce,#a855f7);color:white;text-decoration:none;font-size:13px;font-weight:700}
        .discoverAction:hover{filter:brightness(1.12)}
        .discoverWebsite{display:inline-block;margin:12px 0 0 12px;color:#c4b5fd;font-size:12px}
        .discoverSection{margin-top:42px}
        .discoverSectionTitle{margin:0;color:#fff;font-size:26px}
        .discoverSectionCopy{margin:8px 0;color:#aaa3b5;font-size:14px}
        .discoverEyebrow{margin:0 0 8px;color:#c084fc;font-size:11px;font-weight:800;letter-spacing:2px}
        .discoverEmpty{padding:22px;border:1px dashed rgba(192,132,252,.25);border-radius:14px;color:#aaa3b5;background:rgba(255,255,255,.025)}
        @media(max-width:600px){.discoverSearchBox{padding:15px}.discoverGrid{grid-template-columns:1fr}.discoverCard{padding:18px}.discoverSectionTitle{font-size:23px}}
      `}</style>

      <section className="discoverSearchBox">
        <p className="discoverEyebrow">FIND YOUR NEXT FAVOURITE</p>
        <h2 style={{ margin: "0 0 14px", fontSize: "22px" }}>Search artists, labels and sounds</h2>
        <input className="discoverSearchInput" type="search" value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Try an artist name, genre or location..."
          aria-label="Search artists, labels or genres" />
        {search.trim() && <p style={{ margin: "12px 0 0", color: "#b8afc2", fontSize: "13px" }}>
          {filteredProfiles.length} matching {filteredProfiles.length === 1 ? "profile" : "profiles"}
        </p>}
      </section>

      <section className="discoverSection">
        <p className="discoverEyebrow">THE TEAMS BEHIND THE SOUND</p>
        <h2 className="discoverSectionTitle">Record Labels</h2>
        <p className="discoverSectionCopy">Explore independent labels and the artists they represent.</p>
        {labels.length === 0 ? (
          <p className="discoverEmpty">{search.trim() ? "No record labels match your search." : "No public record labels yet."}</p>
        ) : (
          <div className="discoverGrid">
            {labels.map((profile) => {
              const name = profile.label_name || profile.display_name || "Record label";
              return <article className="discoverCard" key={profile.id}>
                {profile.avatar_url ? <img className="discoverAvatar labelAvatar" src={profile.avatar_url} alt={name} /> : <div className="discoverAvatar labelAvatar" aria-hidden="true" />}
                <p className="discoverType">Record label</p>
                <h3 className="discoverName"><Link href={`/label/${profile.id}`}>{name}</Link></h3>
                <p className="discoverBio">{profile.bio || "No description added yet."}</p>
                {profile.location && <p className="discoverMeta">⌖ {profile.location}</p>}
                <Link className="discoverAction" href={`/label/${profile.id}`}>Explore label →</Link>
                {profile.website_url && <a className="discoverWebsite" href={profile.website_url} target="_blank" rel="noopener noreferrer">Website ↗</a>}
              </article>;
            })}
          </div>
        )}
      </section>

      <section className="discoverSection">
        <p className="discoverEyebrow">MEET THE MUSIC CREATORS</p>
        <h2 className="discoverSectionTitle">Discover Artists</h2>
        <p className="discoverSectionCopy">Find new voices, explore genres and visit artist profiles.</p>
        {artists.length === 0 ? (
          <p className="discoverEmpty">{search.trim() ? "No artists match your search." : "No public artists yet."}</p>
        ) : (
          <div className="discoverGrid">
            {artists.map((profile) => {
              const name = profile.artist_name || profile.display_name || "Artist";
              return <article className="discoverCard" key={profile.id}>
                {profile.avatar_url ? <img className="discoverAvatar" src={profile.avatar_url} alt={name} /> : <div className="discoverAvatar" aria-hidden="true" />}
                <p className="discoverType">Artist</p>
                <h3 className="discoverName"><Link href={`/artist/${profile.id}`}>{name}</Link></h3>
                <p className="discoverBio">{profile.bio || "This artist is building their story on MUSEK."}</p>
                {profile.genres && profile.genres.length > 0 && <div className="discoverTags">
                  {profile.genres.slice(0, 4).map((genre) => <span className="discoverTag" key={genre}>{genre}</span>)}
                </div>}
                {profile.location && <p className="discoverMeta">⌖ {profile.location}</p>}
                <Link className="discoverAction" href={`/artist/${profile.id}`}>View artist →</Link>
                {profile.website_url && <a className="discoverWebsite" href={profile.website_url} target="_blank" rel="noopener noreferrer">Website ↗</a>}
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
