import React, { useState } from 'react';
import { ArrowRight, CalendarDays, Check, Menu, X } from 'lucide-react';
import ConversionAssistant from './components/ConversionAssistant.jsx';
import {
  GROWTH_HOSTING_SHORT_LABEL,
  WEBSITE_ONLY_LABEL,
} from './offerTerms.js';

const services = [
  ['01', 'A website built around the next customer', 'A custom site with one clear offer, useful proof, and a direct path to call, book, request a quote, or buy.'],
  ['02', 'Lead capture and faster follow-up', 'Forms, qualification, routing, CRM structure, and practical automation that help your team respond while the lead is still warm.'],
  ['03', 'Social and content with a real job', 'Posts, articles, and short-form content planned around the audience, offer, proof, and business result you need.'],
  ['04', 'Local search people can act on', 'Service pages, local signals, useful answers, and technical foundations working toward qualified traffic—not vanity rankings.'],
  ['05', 'Apps and automation that remove friction', 'Focused software and repeatable workflows, with human approval kept around sensitive decisions.'],
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
          <a className="eb-button eb-button-small" href="/get-started/">Get started</a>
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
            <p className="eb-lede">
              Tell us what needs to move: the website, social and content, search, lead follow-up,
              automation, or an app. EB28 turns your answers into a focused project brief, then
              gets you to the right build, proposal, or call without making you repeat the story.
            </p>
            <div className="eb-actions">
              <a href="/get-started/" className="eb-button">Start my project <ArrowRight /></a>
              <a className="eb-text-link" href="/get-started/?intent=call"><CalendarDays /> Book a 15-minute fit call</a>
            </div>
            <div className="eb-hero-price">
              <p><strong>$98/month</strong> <span>website offer</span></p>
              <b>$1,176 paid upfront for the first 12 months</b>
              <div>
                <span><Check /> Website build included</span>
                <span><Check /> Managed hosting and upkeep</span>
                <span><Check /> SEO foundations and weekly content</span>
                <span><Check /> Lead capture and routing support</span>
              </div>
              <small>Or {WEBSITE_ONLY_LABEL.toLowerCase()}. No payment is taken on the project-intake form.</small>
            </div>
          </div>
          <aside className="eb-hero-assistant-stage" aria-label="EB28 Project Assistant">
            <ConversionAssistant source="home" />
          </aside>
        </section>

        <div className="eb-audience">
          <strong>BUILT FOR PEOPLE READY TO GET THE WORK MOVING</strong>
          <span>Local operators</span>
          <span>Professional services</span>
          <span>Founders</span>
          <span>Marketing teams</span>
          <span>Referral clients</span>
        </div>

        <section id="what" className="eb-section">
          <span id="services" className="eb-anchor-alias" aria-hidden="true" />
          <span id="packages" className="eb-anchor-alias" aria-hidden="true" />
          <div className="eb-section-head">
            <p className="eb-kicker">Start with the bottleneck</p>
            <h2>One team from first question to working system.</h2>
            <p>You do not need to diagnose the project before contacting EB28. The guided intake asks the right questions for the services you select and turns the answers into a usable production brief.</p>
          </div>
          <div className="eb-service-grid">
            {services.map(([number, title, description]) => (
              <article className="eb-service" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{description}</p>
              </article>
            ))}
            <article className="eb-service eb-service-cta">
              <p className="eb-kicker">Clear website terms</p>
              <h3>Build included.<br />{GROWTH_HOSTING_SHORT_LABEL}.</h3>
              <p>Website-only is $800 one-time. Hosting and ongoing growth support are not included in that option.</p>
              <a href="/get-started/?service=website" className="eb-button eb-button-light">Choose a website option <ArrowRight /></a>
            </article>
          </div>
        </section>

        <section id="how" className="eb-section eb-process">
          <div className="eb-section-head">
            <p className="eb-kicker">The system behind it</p>
            <h2>Less sales theater. Better information.</h2>
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

        <section id="contact" className="eb-contact eb-contact-conversion">
          <div className="eb-contact-intro">
            <p className="eb-kicker">Your next useful step</p>
            <h2>Start the project before the call.</h2>
            <p>Select the services, answer the detailed questions, set a high-level design direction, and choose whether you want a call, a proposal, or the fastest path to production.</p>
          </div>
          <div className="eb-contact-actions">
            <div>
              <span>01</span>
              <h3>Build the project brief</h3>
              <p>About 4–8 minutes. Your answers arrive together so the first conversation can focus on decisions.</p>
              <a href="/get-started/" className="eb-button">Start my project <ArrowRight /></a>
            </div>
            <div>
              <span>02</span>
              <h3>Book a focused fit call</h3>
              <p>Choose the call path inside the intake and tell us the best time. No blank calendar invite with no context.</p>
              <a href="/get-started/?intent=call" className="eb-button eb-button-light">Book the call <CalendarDays /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="eb-footer">
        <a href="/" className="eb-logo">EB<span>28</span></a>
        <p>Websites, apps, and useful automation from Melbourne, Florida.</p>
        <div><a href="/get-started/">Get started</a><a href="/melbournewebstudio/">Web Studio</a><a href="/reconcile/">Recon Agent</a><a href="/appbuilder/">App Builder</a><a href="/blog/">Blog</a></div>
        <small>© {new Date().getFullYear()} EB28. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;
