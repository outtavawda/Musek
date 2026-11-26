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
  const [activeGenre, setActiveGenre] = useState("All sounds");

  const artists = profiles.filter((profile) => profile.account_type === "artist");
  const labels = profiles.filter((profile) => profile.account_type === "label");
  const genres = Array.from(
    new Set(artists.flatMap((profile) => profile.genres || []).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesSearch = !term || [
        profile.display_name,
        profile.artist_name,
        profile.label_name,
        profile.bio,
        profile.location,
        ...(profile.genres || []),
      ].filter(Boolean).join(" ").toLowerCase().includes(term);
      const matchesGenre =
        activeGenre === "All sounds" ||
        (profile.account_type === "artist" && (profile.genres || []).includes(activeGenre));
      return matchesSearch && matchesGenre;
    });
  }, [profiles, search, activeGenre]);

  const filteredArtists = filteredProfiles.filter((profile) => profile.account_type === "artist");
  const filteredLabels = filteredProfiles.filter((profile) => profile.account_type === "label");

  return (
    <div className="musekDiscover">
      <style>{`
        .musekDiscover{--purple:#a855f7;--lavender:#d8b4fe;color:#f8f6fb;width:100%;padding-bottom:24px}
        .discoverHero{position:relative;isolation:isolate;overflow:hidden;margin:28px 0 34px;padding:clamp(28px,5vw,58px);border:1px solid rgba(192,132,252,.2);border-radius:28px;background:radial-gradient(ellipse at 82% 18%,rgba(147,51,234,.32),transparent 38%),radial-gradient(ellipse at 100% 100%,rgba(91,33,182,.24),transparent 42%),linear-gradient(120deg,#17111f 0%,#0d0b12 65%,#171020 100%);box-shadow:0 25px 80px rgba(0,0,0,.3)}
        .discoverHero:after{content:"";position:absolute;z-index:-1;width:330px;height:330px;right:4%;top:5%;border:1px solid rgba(216,180,254,.13);border-radius:50%;box-shadow:0 0 0 35px rgba(168,85,247,.025),0 0 100px rgba(168,85,247,.13) inset}
        .discoverKicker{color:#d8b4fe;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
        .discoverHero h2{max-width:680px;margin:18px 0 14px;font-size:clamp(38px,6vw,68px);line-height:.99;letter-spacing:-3px}
        .discoverHero h2 span{color:#c084fc}
        .discoverLead{max-width:540px;color:#b8afc2;font-size:15px;line-height:1.75}
        .discoverStats{display:flex;flex-wrap:wrap;gap:28px;margin-top:30px}
        .discoverStat strong{display:block;font-size:23px;color:#fff}
        .discoverStat span{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#91869e}
        .discoverSearchPanel{margin:0 0 34px;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(120deg,rgba(30,23,39,.95),rgba(15,13,20,.95))}
        .discoverSearchInput{width:100%;padding:16px 18px;border:1px solid rgba(192,132,252,.22);border-radius:12px;background:#0b0910;color:#fff;font-size:15px;outline:none}
        .discoverSearchInput:focus{border-color:#b56af2;box-shadow:0 0 0 3px rgba(168,85,247,.12)}
        .discoverGenreRow{display:flex;gap:8px;overflow-x:auto;padding:14px 0 2px;scrollbar-width:thin}
        .discoverGenre{flex:0 0 auto;padding:9px 14px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:#17131d;color:#bdb3c8;font-size:12px;cursor:pointer;transition:.2s}
        .discoverGenre:hover,.discoverGenre.active{border-color:rgba(192,132,252,.7);background:linear-gradient(110deg,#6b21a8,#9333ea);color:white}
        .discoverSection{margin-top:44px}
        .discoverSectionHead{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:18px}
        .discoverSectionTitle{margin:7px 0 0;color:#fff;font-size:clamp(25px,3vw,34px);letter-spacing:-1px}
        .discoverSectionCopy{margin:7px 0 0;color:#9d94a8;font-size:13px;line-height:1.6}
        .discoverCount{color:#9e8bad;font-size:11px;white-space:nowrap}
        .discoverArtistGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:17px}
        .discoverArtistCard{position:relative;min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:linear-gradient(155deg,#21172c,#100d15 68%);transition:transform .22s,border-color .22s,box-shadow .22s}
        .discoverArtistCard:hover{transform:translateY(-5px);border-color:rgba(192,132,252,.48);box-shadow:0 20px 45px rgba(0,0,0,.32)}
        .discoverArtistImage{position:relative;height:220px;overflow:hidden;background:radial-gradient(circle at 50% 35%,rgba(168,85,247,.55),transparent 55%),linear-gradient(145deg,#38214e,#17111f)}
        .discoverArtistImage img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
        .discoverArtistCard:hover .discoverArtistImage img{transform:scale(1.06)}
        .discoverImageShade{position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(12,9,16,.72))}
        .discoverArtistBody{padding:18px}
        .discoverType{color:#c084fc;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
        .discoverName{margin:7px 0 8px;font-size:21px;line-height:1.2}
        .discoverName a{color:white}
        .discoverName a:hover{color:#d8b4fe}
        .discoverBio{min-height:40px;margin:0;color:#a9a0b2;font-size:12px;line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .discoverTags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 10px}
        .discoverTag{padding:5px 9px;border:1px solid rgba(192,132,252,.18);border-radius:999px;background:rgba(126,34,206,.12);color:#d8b4fe;font-size:10px}
        .discoverMeta{margin:10px 0 0;color:#92889d;font-size:11px}
        .discoverCardBottom{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}
        .discoverAction{color:#e9d5ff;font-size:11px;font-weight:800;letter-spacing:.5px}
        .discoverAction:hover{color:#fff}
        .discoverWebsite{color:#9e91ad;font-size:10px}
        .discoverLabelGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:13px}
        .discoverLabelCard{display:flex;align-items:center;gap:15px;min-width:0;padding:17px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:linear-gradient(120deg,#1b1424,#100d15);transition:.2s}
        .discoverLabelCard:hover{border-color:rgba(192,132,252,.45);transform:translateY(-2px)}
        .discoverLabelImage{width:66px;height:66px;flex:0 0 66px;overflow:hidden;border-radius:15px;background:linear-gradient(145deg,#67369a,#21172d)}
        .discoverLabelImage img{width:100%;height:100%;object-fit:cover}
        .discoverLabelInfo{min-width:0}
        .discoverLabelInfo h3{margin:5px 0;color:#fff;font-size:16px}
        .discoverLabelInfo p{margin:0;color:#9f96a9;font-size:11px;line-height:1.5}
        .discoverEmpty{padding:24px;border:1px dashed rgba(192,132,252,.25);border-radius:15px;color:#a99fb2;background:rgba(255,255,255,.02)}
        @media(max-width:600px){.discoverHero{border-radius:20px}.discoverHero h2{letter-spacing:-2px}.discoverArtistGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.discoverArtistImage{height:155px}.discoverArtistBody{padding:12px}.discoverName{font-size:16px}.discoverBio{font-size:11px}.discoverCardBottom{align-items:flex-start;flex-direction:column}.discoverLabelGrid{grid-template-columns:1fr}}
        @media(max-width:380px){.discoverArtistGrid{grid-template-columns:1fr}.discoverArtistImage{height:210px}}

        /* YASUH gold + white palette — colours only; preserve discovery layout. */
        .musekDiscover{color:#24211b}
        .discoverHero{border-color:#eadbb9;background:radial-gradient(ellipse at 82% 18%,rgba(198,154,53,.16),transparent 38%),radial-gradient(ellipse at 100% 100%,rgba(225,190,111,.12),transparent 42%),linear-gradient(120deg,#fffaf0 0%,#ffffff 65%,#fbf8f0 100%);box-shadow:0 20px 55px rgba(80,61,22,.08)}
        .discoverHero:after{border-color:rgba(198,154,53,.22);box-shadow:0 0 0 35px rgba(198,154,53,.025),0 0 100px rgba(198,154,53,.08) inset}
        .discoverKicker,.discoverHero h2 span,.discoverType,.discoverAction{color:#8f6818}
        .discoverLead,.discoverSectionCopy,.discoverBio,.discoverMeta,.discoverWebsite,.discoverLabelInfo p,.discoverEmpty{color:#70695d}
        .discoverStat strong,.discoverSectionTitle,.discoverName a,.discoverLabelInfo h3{color:#24211b}
        .discoverStat span,.discoverCount{color:#81796d}
        .discoverSearchPanel{border-color:#e9e1d2;background:linear-gradient(120deg,#fffdf8,#fbf8f0)}
        .discoverSearchInput{border-color:#e5d4ad;background:#fff;color:#24211b}
        .discoverSearchInput:focus{border-color:#c69a35;box-shadow:0 0 0 3px rgba(198,154,53,.14)}
        .discoverGenre{border-color:#e9e1d2;background:#fff;color:#625d54}
        .discoverGenre:hover,.discoverGenre.active{border-color:#c69a35;background:linear-gradient(110deg,#d9b65f,#b88b2b);color:#fff}
        .discoverArtistCard,.discoverLabelCard{border-color:#e9e1d2;background:linear-gradient(155deg,#fff,#fbf8f0)}
        .discoverArtistCard:hover,.discoverLabelCard:hover{border-color:rgba(198,154,53,.55);box-shadow:0 15px 35px rgba(80,61,22,.10)}
        .discoverArtistImage{background:linear-gradient(145deg,#f4ead0,#e8dcc0)}
        .discoverImageShade{background:linear-gradient(transparent,rgba(25,21,14,.42))}
        .discoverName a:hover,.discoverAction:hover{color:#c69a35}
        .discoverTag{border-color:rgba(198,154,53,.25);background:rgba(198,154,53,.08);color:#805f19}
        .discoverCardBottom{border-color:#e9e1d2}
        .discoverLabelImage{background:linear-gradient(145deg,#e6d3a4,#f7f1e4)}
        .discoverEmpty{border-color:rgba(198,154,53,.35);background:#fffdf8}
      `}</style>

      <section className="discoverHero">
        <p className="discoverKicker">YASUH • ARTIST DISCOVERY</p>
        <h2>Find the sound<br />you <span>haven’t heard</span><br />yet.</h2>
        <p className="discoverLead">Explore independent artists, discover fresh genres and connect with the people shaping what comes next.</p>
        <div className="discoverStats">
          <div className="discoverStat"><strong>{artists.length}</strong><span>Artists</span></div>
          <div className="discoverStat"><strong>{labels.length}</strong><span>Labels</span></div>
          <div className="discoverStat"><strong>{genres.length}</strong><span>Genres</span></div>
        </div>
      </section>

      <section className="discoverSearchPanel">
        <input className="discoverSearchInput" type="search" value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search artists, labels, genres or locations..."
          aria-label="Search artists, labels, genres or locations" />
        <div className="discoverGenreRow" aria-label="Filter artists by genre">
          <button type="button" className={activeGenre === "All sounds" ? "discoverGenre active" : "discoverGenre"} onClick={() => setActiveGenre("All sounds")}>All sounds</button>
          {genres.map((genre) => (
            <button type="button" key={genre} className={activeGenre === genre ? "discoverGenre active" : "discoverGenre"} onClick={() => setActiveGenre(genre)}>{genre}</button>
          ))}
        </div>
      </section>

      <section className="discoverSection">
        <div className="discoverSectionHead">
          <div><p className="discoverKicker">MEET THE CREATORS</p><h2 className="discoverSectionTitle">Artists to explore</h2><p className="discoverSectionCopy">Independent voices. Distinct sounds. New favourites waiting to be found.</p></div>
          <span className="discoverCount">{filteredArtists.length} artists</span>
        </div>
        {filteredArtists.length === 0 ? (
          <p className="discoverEmpty">{search.trim() || activeGenre !== "All sounds" ? "No artists match these filters. Try another search or genre." : "No public artists yet."}</p>
        ) : (
          <div className="discoverArtistGrid">
            {filteredArtists.map((profile) => {
              const name = profile.artist_name || profile.display_name || "Artist";
              return <article className="discoverArtistCard" key={profile.id}>
                <div className="discoverArtistImage">
                  {profile.avatar_url && <img src={profile.avatar_url} alt={name} loading="lazy" />}
                  <div className="discoverImageShade" />
                </div>
                <div className="discoverArtistBody">
                  <span className="discoverType">YASUH ARTIST</span>
                  <h3 className="discoverName"><Link href={`/artist/${profile.id}`}>{name}</Link></h3>
                  <p className="discoverBio">{profile.bio || "Discover this artist’s music and story on YASUH."}</p>
                  {profile.genres && profile.genres.length > 0 && <div className="discoverTags">{profile.genres.slice(0, 3).map((genre) => <span className="discoverTag" key={genre}>{genre}</span>)}</div>}
                  {profile.location && <p className="discoverMeta">⌖ {profile.location}</p>}
                  <div className="discoverCardBottom">
                    <Link className="discoverAction" href={`/artist/${profile.id}`}>EXPLORE ARTIST ↗</Link>
                    {profile.website_url && <a className="discoverWebsite" href={profile.website_url} target="_blank" rel="noopener noreferrer">Website ↗</a>}
                  </div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      {activeGenre === "All sounds" && (
        <section className="discoverSection">
          <div className="discoverSectionHead">
            <div><p className="discoverKicker">THE TEAMS BEHIND THE SOUND</p><h2 className="discoverSectionTitle">Record labels</h2><p className="discoverSectionCopy">Meet the independent labels building artist communities.</p></div>
            <span className="discoverCount">{filteredLabels.length} labels</span>
          </div>
          {filteredLabels.length === 0 ? <p className="discoverEmpty">{search.trim() ? "No labels match your search." : "No public record labels yet."}</p> : (
            <div className="discoverLabelGrid">
              {filteredLabels.map((profile) => {
                const name = profile.label_name || profile.display_name || "Record label";
                return <Link className="discoverLabelCard" href={`/label/${profile.id}`} key={profile.id}>
                  <div className="discoverLabelImage">{profile.avatar_url && <img src={profile.avatar_url} alt={name} loading="lazy" />}</div>
                  <div className="discoverLabelInfo"><span className="discoverType">RECORD LABEL</span><h3>{name}</h3><p>{profile.location || profile.bio || "Explore label profile and roster"}</p></div>
                </Link>;
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
