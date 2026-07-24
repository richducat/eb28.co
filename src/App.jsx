import React, { useState } from 'react';
import { ArrowRight, Check, Menu, X } from 'lucide-react';
import OnboardingQuiz from './components/OnboardingQuiz.jsx';
import { useCheckoutConfig } from './useCheckoutConfig.js';

const services = [
  ['01', 'A website built for you, free', 'Designed by our software and app team around your business — not a template you have to wrestle with.'],
  ['02', 'Customer & lead management', 'AI keeps track of everyone who reaches out and follows up fast, so good leads do not slip away.'],
  ['03', 'Content & social, handled', 'Articles, posts, and useful updates planned around your customers and managed every week.'],
  ['04', 'Get found on Google & AI', 'Search research, local signals, site structure, and useful content working from one practical plan.'],
  ['05', 'Automation where it matters', 'Routine work runs in the background while decisions that need a person stay with you.'],
];

const process = [
  ['We map the business', 'We learn your best customers, offers, service areas, busy seasons, margins, and the questions people ask every day.'],
  ['We build around it', 'A fast custom website, designed for phones first, with a clear offer and a lead path that works on the first try.'],
  ['We connect the growth system', 'Search, content, lead capture, and follow-up share the same business knowledge instead of living in separate silos.'],
  ['We improve what is live', 'We watch what people use, fix friction, and keep the site useful as your business changes.'],
];

const portfolioProjects = [
  { id: 'tool-reconcile', title: 'Recon Agent', type: 'Founder Beta', url: '/reconcile/', image: '/eb28/portfolio/recon-agent.webp', description: 'Daily plain-English Stripe reconciliation for founders who need to see what matched and what needs review.' },
  { id: 'tool-appbuilder', title: 'EB28 App Builder', type: 'AI Builder', url: '/appbuilder/', image: '/eb28/portfolio/eb28-app-builder.webp', description: 'Turns an app idea into sharper concepts, visuals, and production-ready source.' },
  { id: 'tool-fundmanager', title: 'Fund Manager Live', type: 'Live Dashboard', url: '/fundmanager/', image: '/eb28/portfolio/fund-manager-live.webp', description: 'A live portfolio dashboard watching real positions around the clock.' },
  { id: 0, title: 'Tesla Helper App', type: 'Utility App', url: 'https://teslahelper.app', image: '/eb28/portfolio/tesla-helper.webp', description: 'A focused companion experience for Tesla owners.' },
  { id: 3, title: 'FC Street', type: 'Web Game', url: 'https://fc-street.vercel.app/', description: 'A browser football game built to feel immediate, playful, and quick.' },
  { id: 6, title: 'Veteran Claim App', type: 'Claims Platform', url: 'https://tyfys.net/app', image: '/eb28/portfolio/tyfys-veteran-claim.webp', description: 'A guided digital experience that helps veterans organize a benefits claim.' },
  { id: 7, title: 'Toby AI + Lab App', type: 'AI Fitness App', url: 'https://app.labstudio.fit', description: 'AI-assisted fitness guidance connected to a modern training experience.' },
  { id: 8, title: 'VoltGuard', type: 'Business Website', url: 'https://voltguard.homes/#services', image: '/eb28/portfolio/voltguard.webp', description: 'A clear service website for a residential electrical protection business.' },
  { id: 9, title: 'Daily Disspatch', type: 'Content Website', url: 'https://dailydisspatch.com', image: '/eb28/portfolio/daily-disspatch.webp', description: 'A distinct editorial platform built for repeat reading.' },
  { id: 10, title: 'Best Deals Online', type: 'Ecommerce Website', url: 'https://bestdealsonline.us/', image: '/eb28/portfolio/best-deals-online.webp', description: 'Buyer-focused product research and deal guides without fake urgency.' },
  { id: 11, title: 'Best Mobile VPN', type: 'Affiliate Website', url: 'https://www.bestmobilevpn.net/', description: 'A comparison site that makes a technical purchase easier to understand.' },
];

const guideLinks = [
  ['Website Redesign in Melbourne, FL', '/blog/website-redesign-in-melbourne-fl-fix-the-leaks-before-you-rebuild-everything/'],
  ['Lead Generation Websites in Melbourne, FL', '/blog/lead-generation-website-in-melbourne-fl-the-page-elements-that-make-people-act/'],
  ['Local SEO Services in Melbourne, FL', '/blog/local-seo-services-in-melbourne-fl-what-should-be-fixed-before-you-pay-monthly/'],
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const checkoutProducts = useCheckoutConfig();

  const closeAndScroll = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="eb-home">
      <a className="eb-skip" href="#main-content">Skip to content</a>
      <header className="eb-nav">
        <a href="/" className="eb-logo" aria-label="EB28 home">EB<span>28</span></a>
        <nav className={`eb-navlinks ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
          <button onClick={() => closeAndScroll('what')}>What we do</button>
          <button onClick={() => closeAndScroll('how')}>How it works</button>
          <button onClick={() => closeAndScroll('work')}>Our work</button>
          <a href="/melbournewebstudio/">Web Studio</a>
          <a href="/blog/">Blog</a>
          <button className="eb-button eb-button-small" onClick={() => closeAndScroll('contact')}>Let&apos;s talk</button>
        </nav>
        <button className="eb-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="main-content">
        <section className="eb-hero">
          <div className="eb-hero-copy">
            <p className="eb-eyebrow"><span /> Web help for Melbourne, FL</p>
            <h1>A website that attracts customers — and services them for you, too.</h1>
            <p className="eb-lede">We make you a real website at no cost. Look it over. If it is right, it is $98 a month to keep it online, help it show up on Google, add fresh content, and connect the busywork your team should not have to chase.</p>
            <div className="eb-actions">
              <a href="/free-website-build/" className="eb-button">Build mine for free <ArrowRight /></a>
              <button className="eb-text-link" onClick={() => closeAndScroll('how')}>See how the system works <ArrowRight /></button>
            </div>
            <p className="eb-micro"><Check /> No build fee. Review it before you decide.</p>
          </div>
          <aside className="eb-hero-board" aria-label="Your connected growth system">
            <p className="eb-board-label">One connected system</p>
            <div className="eb-system-card eb-card-main"><span>01</span><strong>Your business brain</strong><small>Offers · customers · service areas · real answers</small></div>
            <div className="eb-system-grid">
              <div className="eb-system-card"><span>02</span><strong>Website</strong><small>Fast, useful, ready to convert</small></div>
              <div className="eb-system-card"><span>03</span><strong>Search</strong><small>Google and AI discovery</small></div>
              <div className="eb-system-card"><span>04</span><strong>Follow-up</strong><small>Leads routed while they are warm</small></div>
              <div className="eb-system-card"><span>05</span><strong>Content</strong><small>Useful work published consistently</small></div>
            </div>
          </aside>
        </section>

        <section id="what" className="eb-section">
          <span id="services" className="eb-anchor-alias" aria-hidden="true" />
          <span id="packages" className="eb-anchor-alias" aria-hidden="true" />
          <div className="eb-section-head">
            <p className="eb-kicker">All included · one system</p>
            <h2>We take the whole thing off your plate.</h2>
            <p>Your website is the front door. We build the useful system behind it around how your business actually runs.</p>
          </div>
          <div className="eb-service-grid">
            {services.map(([number, title, description]) => (
              <article className="eb-service" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{description}</p>
              </article>
            ))}
            <article className="eb-service eb-service-cta">
              <p className="eb-kicker">Simple starting point</p>
              <h3>Built free.<br />$98 a month if you keep it.</h3>
              <a href="/free-website-build/" className="eb-button eb-button-light">Start the free build <ArrowRight /></a>
            </article>
          </div>
        </section>

        <section id="how" className="eb-section eb-process">
          <div className="eb-section-head">
            <p className="eb-kicker">The system behind it</p>
            <h2>Nothing important left to chance.</h2>
          </div>
          <div className="eb-process-list">
            {process.map(([title, description], index) => (
              <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>
            ))}
          </div>
        </section>

        <section id="work" className="eb-section">
          <div className="eb-section-head eb-section-head-row">
            <div><p className="eb-kicker">Built by EB28</p><h2>Real work. Open every project.</h2></div>
            <p>Apps, tools, games, and business websites — built to solve a clear problem and ready for you to explore.</p>
          </div>
          <div className="eb-work-grid">
            {portfolioProjects.map((project, index) => {
              const external = project.url.startsWith('http');
              return (
                <a key={project.id} href={project.url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="eb-work-card">
                  <div className={`eb-work-art eb-art-${(index % 6) + 1}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {project.image
                      ? <img src={project.image} alt={`${project.title} project preview`} loading="lazy" />
                      : <strong className="eb-work-nameplate">{project.title}</strong>}
                  </div>
                  <div className="eb-work-copy"><p>{project.type}</p><h3>{project.title}</h3><span>{project.description}</span><b>Open project <ArrowRight /></b></div>
                </a>
              );
            })}
          </div>
        </section>

        <section className="eb-guides">
          <div><p className="eb-kicker">Plain-English guides</p><h2>Learn what makes a site work before you buy one.</h2><a href="/blog/" className="eb-button eb-button-dark">Read the blog <ArrowRight /></a></div>
          <div>{guideLinks.map(([title, href]) => <a href={href} key={href}>{title}<ArrowRight /></a>)}</div>
        </section>

        <section id="contact" className="eb-contact">
          <div className="eb-contact-intro">
            <p className="eb-kicker">Your next useful step</p>
            <h2>Find the right build in 60 seconds.</h2>
            <p>Three quick questions. You end with a practical recommendation, a price, and the first step. No blank “tell us about your project” box.</p>
          </div>
          <div className="eb-quiz-wrap"><OnboardingQuiz checkoutProducts={checkoutProducts} /></div>
        </section>
      </main>

      <footer className="eb-footer">
        <a href="/" className="eb-logo">EB<span>28</span></a>
        <p>Websites, apps, and useful automation from Melbourne, Florida.</p>
        <div><a href="/melbournewebstudio/">Web Studio</a><a href="/reconcile/">Recon Agent</a><a href="/appbuilder/">App Builder</a><a href="/blog/">Blog</a></div>
        <small>© {new Date().getFullYear()} EB28. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;
