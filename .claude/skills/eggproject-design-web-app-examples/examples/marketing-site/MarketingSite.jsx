/* global React */
const { useState, useEffect } = React;

const NAV_LINKS = ['Work', 'Services', 'Process', 'Journal'];

/* ============ Theme (light/dark) ============
   Shares the same localStorage key ('eggTheme') as the rest of the
   system so the choice carries across surfaces. */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('eggTheme') || 'light'; }
    catch (_) { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('eggTheme', theme); } catch (_) {}
  }, [theme]);
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return [theme, toggle];
}

/* Canonical menu-integrated theme switch (colors_and_type.css →
   .ep-theme-toggle). Icon swaps via [data-theme] on <html>. */
function ThemeToggle({ onToggle, style }) {
  return (
    <button className="ep-theme-toggle" type="button" onClick={onToggle} aria-label="Switch theme" style={style}>
      <svg className="ep-theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      <svg className="ep-theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
  );
}

function Logo({ inverse }) {
  return (
    <a href="#" className="ep-logo">
      <img src={inverse ? "../../../eggproject-design/assets/logo-mark-inverse.svg" : "../../../eggproject-design/assets/logo-mark.svg"} alt="" />
      <span className="ep-logo__word">EggProject</span>
    </a>
  );
}

function TopNav({ activeIndex = 0, onToggleTheme }) {
  return (
    <header className="ep-topnav">
      <div className="ep-topnav__inner">
        <Logo />
        <nav className="ep-topnav__links">
          {NAV_LINKS.map((link, i) => (
            <a key={link} href="#" className={i === activeIndex ? 'is-active' : ''}>{link}</a>
          ))}
        </nav>
        <div className="ep-topnav__actions">
          <ThemeToggle onToggle={onToggleTheme} />
          <button className="ep-btn ep-btn--ghost">Sign in</button>
          <button className="ep-btn ep-btn--primary">Start a project →</button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="ep-hero">
      <div className="ep-hero__grid">
        <div className="ep-hero__copy">
          <span className="ep-eyebrow">
            <span className="ep-eyebrow__dot" />
            Independent development studio · Budapest
          </span>
          <h1 className="ep-hero__title">
            Crafted code,<br/>
            <em>shipped on time.</em>
          </h1>
          <p className="ep-hero__lead">
            EggProject is a small senior team building web platforms, internal
            tools, and product MVPs for ambitious teams. We design, we engineer,
            we deliver — without the agency theatre.
          </p>
          <div className="ep-hero__cta">
            <button className="ep-btn ep-btn--ink">Start a project →</button>
            <button className="ep-btn ep-btn--ghost">See selected work</button>
          </div>
          <div className="ep-hero__proof">
            <div className="ep-hero__proof-item">
              <div className="ep-hero__proof-number">48</div>
              <div className="ep-hero__proof-label">Projects shipped<br/>since 2019</div>
            </div>
            <div className="ep-hero__proof-item">
              <div className="ep-hero__proof-number">~6<span style={{fontFamily:'var(--ep-font-sans)', fontSize: '0.6em'}}> wk</span></div>
              <div className="ep-hero__proof-label">Average time<br/>to first release</div>
            </div>
            <div className="ep-hero__proof-item">
              <div className="ep-hero__proof-number">9 /<span style={{opacity:0.4}}>10</span></div>
              <div className="ep-hero__proof-label">Clients still<br/>working with us</div>
            </div>
          </div>
        </div>
        <div className="ep-hero__visual">
          <div className="ep-hero__card">
            <div className="ep-hero__card-header">
              <span className="ep-dot ep-dot--red" />
              <span className="ep-dot ep-dot--yellow" />
              <span className="ep-dot ep-dot--green" />
              <span className="ep-hero__card-path">atlas/dashboard.tsx</span>
            </div>
            <pre className="ep-hero__code">
{`import { Project } from '@egg/core';

export const Atlas = () => {
  return (
    <Project name="atlas">
      <Project.Brief />
      <Project.Build />
      <Project.Ship />
    </Project>
  );
};`}
            </pre>
          </div>
          <div className="ep-hero__badge">
            <img src="../../../eggproject-design/assets/logo-mark.svg" alt="" />
            <div>
              <strong>Ready for production</strong>
              <span>Atlas · v1.0.0 · 2 min ago</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoStrip() {
  const logos = ['Northbeam', 'Halifax & Co.', 'Studio Kovács', 'Lumenwerk', 'Project Atlas', 'Méreg Labs'];
  return (
    <section className="ep-logos">
      <span className="ep-overline">Trusted by ambitious teams across Europe</span>
      <div className="ep-logos__row">
        {logos.map(logo => (
          <span key={logo} className="ep-logos__item">{logo}</span>
        ))}
      </div>
    </section>
  );
}

const SERVICES = [
  {
    number: '01',
    title: 'Product engineering',
    description: 'We build web platforms end-to-end — from architecture and design system to deploy pipelines. TypeScript, React, Postgres, the boring stack that ships.',
    tags: ['React', 'TypeScript', 'Postgres', 'AWS'],
  },
  {
    number: '02',
    title: 'Internal tooling',
    description: 'Dashboards, admin panels, ops consoles. The unsexy software that runs your business — designed so your team actually uses it.',
    tags: ['Next.js', 'tRPC', 'Tailwind'],
  },
  {
    number: '03',
    title: 'MVP sprints',
    description: 'A 4–6 week dash from idea to production. You get a working product, a design system to grow with, and a team that knows where the bodies are buried.',
    tags: ['Strategy', 'Design', 'Engineering'],
    featured: true,
  },
  {
    number: '04',
    title: 'Design system audits',
    description: "We come in, untangle component drift, and leave behind tokens, docs, and a system the next team can actually maintain.",
    tags: ['Tokens', 'Storybook', 'Figma'],
  },
];

function Services() {
  return (
    <section className="ep-services">
      <div className="ep-services__header">
        <span className="ep-overline">What we do</span>
        <h2 className="ep-h">Four ways<br/>to work <em>together.</em></h2>
      </div>
      <div className="ep-services__grid">
        {SERVICES.map(service => (
          <article key={service.number} className={`ep-service ${service.featured ? 'is-featured' : ''}`}>
            <div className="ep-service__number">{service.number}</div>
            <h3 className="ep-service__title">{service.title}</h3>
            <p className="ep-service__description">{service.description}</p>
            <div className="ep-service__tags">
              {service.tags.map(tag => <span key={tag} className="ep-tag">{tag}</span>)}
            </div>
            <a href="#" className="ep-service__more">Learn more →</a>
          </article>
        ))}
      </div>
    </section>
  );
}

const WORK = [
  { name: 'Atlas', sub: 'Logistics platform', tag: 'Product', year: '2025' },
  { name: 'Halifax Ops', sub: 'Internal tooling for a 40-person agency', tag: 'Tooling', year: '2024' },
  { name: 'Lumenwerk', sub: 'Solar installer CRM', tag: 'MVP sprint', year: '2024' },
];

function SelectedWork() {
  return (
    <section className="ep-work">
      <div className="ep-work__header">
        <span className="ep-overline">Selected work</span>
        <h2 className="ep-h">Recent <em>builds.</em></h2>
      </div>
      <div className="ep-work__list">
        {WORK.map((work, i) => (
          <a key={work.name} href="#" className="ep-work__row">
            <span className="ep-work__idx">{String(i+1).padStart(2,'0')}</span>
            <div className="ep-work__name">
              <strong>{work.name}</strong>
              <span>{work.sub}</span>
            </div>
            <span className="ep-tag">{work.tag}</span>
            <span className="ep-work__year">{work.year}</span>
            <span className="ep-work__arrow">→</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Quote() {
  return (
    <section className="ep-quote">
      <div className="ep-quote__inner">
        <p className="ep-quote__text">
          <em>"They shipped in five weeks what our previous vendor</em> couldn't
          finish in nine months. EggProject is the calmest, most senior team
          we've ever worked with."
        </p>
        <div className="ep-quote__by">
          <div className="ep-avatar">JS</div>
          <div>
            <strong>Júlia Szabó</strong>
            <span>Head of Operations · Halifax &amp; Co.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTABand() {
  return (
    <section className="ep-cta-band">
      <div className="ep-cta-band__inner">
        <h2 className="ep-h ep-h--invert">Got something to <em>ship?</em></h2>
        <p>Tell us about it. We'll get back within one business day with honest scope, honest pricing, and the next steps.</p>
        <div className="ep-cta-band__row">
          <button className="ep-btn ep-btn--yolk">Start a project →</button>
          <button className="ep-btn ep-btn--ghost-invert">hello@eggproject.dev</button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ep-footer">
      <div className="ep-footer__top">
        <Logo />
        <p className="ep-footer__tag">A small development studio. Built in Budapest, shipping worldwide.</p>
      </div>
      <div className="ep-footer__cols">
        <div>
          <span className="ep-footer__label">Studio</span>
          <a>Work</a><a>Services</a><a>Process</a><a>Journal</a>
        </div>
        <div>
          <span className="ep-footer__label">Contact</span>
          <a>hello@eggproject.dev</a><a>+36 1 234 5678</a><a>Budapest, HU</a>
        </div>
        <div>
          <span className="ep-footer__label">Elsewhere</span>
          <a>GitHub</a><a>Read.cv</a><a>LinkedIn</a>
        </div>
      </div>
      <div className="ep-footer__bottom">
        <span>© 2026 EggProject Kft.</span>
        <span>Crafted in Budapest · v3.2</span>
      </div>
    </footer>
  );
}

function MarketingSite() {
  const [, toggleTheme] = useTheme();
  return (
    <div className="ep-site">
      <TopNav onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <LogoStrip />
        <Services />
        <SelectedWork />
        <Quote />
        <CTABand />
      </main>
      <Footer />
    </div>
  );
}

Object.assign(window, { MarketingSite });
