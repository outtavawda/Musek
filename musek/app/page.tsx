
const features = [
  { number: "01", title: "Discover", description: "Find new music, artists and videos in a discovery experience built for creators." },
  { number: "02", title: "Support artists", description: "Explore virtual gifts and creator rewards. Payment features will be enabled after secure backend integration." },
  { number: "03", title: "Connect", description: "A place for fans, artists and labels to build a community around music." }
];

export default function HomePage() {
  return (
    <main>
      <nav className="nav">
        <a className="brand" href="/" aria-label="MUSEK home">
          MUSEK<span>.</span>
        </a>

        <div className="navLinks">
          <a href="#discover">Discover</a>
          <a href="#creators">For creators</a>
          <a href="/login">Login</a>
          <a className="navButton" href="/signup">Sign Up</a>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <span className="pulse" /> MUSIC • CREATORS • COMMUNITY
        </div>

        <h1>Your music.<br /><span>Your people.</span></h1>

        <p className="heroText">
          Discover sounds, connect with artists and be part of a music
          community built around creativity.
        </p>

        <div className="heroActions">
          <a className="primaryButton" href="/signup">
            Join MUSEK <span>↗</span>
          </a>
          <a className="secondaryButton" href="/login">
            Member Login
          </a>
        </div>

        <div className="heroNote">
          A new home for music is taking shape.
        </div>

        <div className="orb orbOne" />
        <div className="orb orbTwo" />
      </section>

      <section className="intro" id="discover">
        <div>
          <div className="sectionLabel">THE MUSEK EXPERIENCE</div>
          <h2>More than listening.<br /><em>A place to belong.</em></h2>
        </div>
        <p>
          MUSEK is being built to bring fans, independent artists and record
          labels closer together through music, discovery and community.
        </p>
      </section>

      <section className="features" id="creators">
        {features.map((feature) => (
          <article className="feature" key={feature.number}>
            <div className="featureNumber">{feature.number}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="creatorBanner">
        <div className="sectionLabel">BUILT FOR THE MUSIC COMMUNITY</div>
        <h2>Artists make the culture.<br /><em>Fans move it forward.</em></h2>
        <p>
          Follow MUSEK as we build tools for artists, labels and the people
          who support them.
        </p>
        <a className="primaryButton" href="/signup">
          Create your account <span>↗</span>
        </a>
      </section>

      <footer>
        <a className="brand" href="/">MUSEK<span>.</span></a>
        <span>© {new Date().getFullYear()} MUSEK. All rights reserved.</span>
        <span>Made for music people.</span>
      </footer>
    </main>
  );
}
