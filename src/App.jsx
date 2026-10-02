import React, { useState } from 'react';
import { ArrowRight, Check, Menu, X } from 'lucide-react';
import ConversionAssistant from './components/ConversionAssistant.jsx';
import {
  GROWTH_HOSTING_SHORT_LABEL,
} from './offerTerms.js';
import { LOCAL_AI_PACKAGES, formatUsd } from './localAiOffer.js';

const services = [
  ['01', 'AI that answers when you cannot', 'Missed-call text-back, website chat that answers common questions, and booking requests that land on your phone — set up and explained in plain English.'],
  ['02', 'Follow-up that never forgets', 'New leads, review requests, overdue invoices, and past customers all get a polite, automatic nudge while you keep the final say.'],
  ['03', 'A website built around the next customer', 'A custom site with one clear offer, useful proof, and a direct path to call, book, request a quote, or buy.'],
  ['04', 'Local search people can act on', 'Service pages, local signals, useful answers, and technical foundations working toward qualified traffic—not vanity rankings.'],
  ['05', 'Apps and custom software', 'Focused software and repeatable workflows, with human approval kept around sensitive decisions.'],
];

const process = [
  ['Free 20-minute checkup', 'By phone or in person around Brevard. We find where time and customers slip away — no jargon, no pitch deck.'],
  ['A fixed price in writing', 'One page: what we will set up, what it costs, and what it will not do. No hourly billing and no surprises.'],
  ['We set it up and test it', 'We build it with your name, your hours, and answers you approve, then test it before customers ever see it.'],
  ['We keep it running', 'A short walkthrough for your team, then we watch it every month and fix anything that breaks.'],
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
          <a href="/local-ai/">AI for your business</a>
          <button onClick={() => closeAndScroll('what')}>What we do</button>
          <button onClick={() => closeAndScroll('how')}>How it works</button>
          <button onClick={() => closeAndScroll('work')}>Our work</button>
          <a href="/melbournewebstudio/">Web Studio</a>
          <a href="/blog/">Blog</a>
          <a className="eb-button eb-button-small" href="/local-ai/#checkup">Free AI checkup</a>
        </nav>
        <button className="eb-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="main-content">
        <section className="eb-hero">
          <div className="eb-hero-copy">
            <p className="eb-eyebrow"><span /> AI help for Melbourne &amp; Brevard businesses</p>
            <h1>Put AI to work in your business — explained in plain English.</h1>
            <p className="eb-lede">
              We set up simple AI helpers that answer missed calls, follow up with leads, ask for reviews,
              and chase unpaid invoices. Fixed prices, no tech skills needed, and a local person who
              explains it and keeps it running.
            </p>
            <div className="eb-actions">
              <a href="/local-ai/#checkup" className="eb-button">Book a free 20-minute AI checkup <ArrowRight /></a>
              <a className="eb-text-link" href="/local-ai/#packages">See packages and prices</a>
            </div>
            <div className="eb-hero-price eb-hero-ai">
              <p><strong>From {formatUsd(Math.min(...LOCAL_AI_PACKAGES.map((pkg) => pkg.setup)))}</strong> <span>fixed price, in writing</span></p>
              <div>
                {LOCAL_AI_PACKAGES.map((pkg) => (
                  <span key={pkg.id}>
                    <Check /> <span><strong>{pkg.name}</strong> — {formatUsd(pkg.setup)}{pkg.monthly ? ` setup + ${formatUsd(pkg.monthly)}/mo` : ' flat'}</span>
                  </span>
                ))}
              </div>
              <small>Need a website instead? <a href="/get-started/?service=website">{GROWTH_HOSTING_SHORT_LABEL}, or $800 website-only.</a></small>
            </div>
          </div>
          <aside className="eb-hero-assistant-stage" aria-label="EB28 Project Assistant">
            <ConversionAssistant source="home" />
          </aside>
        </section>

        <div className="eb-audience">
          <strong>BUILT FOR BREVARD BUSINESSES</strong>
          <span>Home services &amp; trades</span>
          <span>Salons &amp; spas</span>
          <span>Realtors</span>
          <span>Auto shops</span>
          <span>Restaurants</span>
          <span>Local service pros</span>
        </div>

        <section id="what" className="eb-section">
          <span id="services" className="eb-anchor-alias" aria-hidden="true" />
          <span id="packages" className="eb-anchor-alias" aria-hidden="true" />
          <div className="eb-section-head">
            <p className="eb-kicker">Start with the bottleneck</p>
            <h2>One local team from first question to working system.</h2>
            <p>You do not need to know anything about AI before you call. We run our own business on these tools every day, and we only set up what we would trust in our own shop.</p>
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
            <p className="eb-kicker">How it works</p>
            <h2>Four steps. No homework for you.</h2>
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
            <h2>Find out where AI saves you time.</h2>
            <p>Start with a free 20-minute checkup. If AI would not help your business, we will tell you — and if you need a website or app instead, the guided brief gets that moving.</p>
          </div>
          <div className="eb-contact-actions">
            <div>
              <span>01</span>
              <h3>Free AI checkup</h3>
              <p>About 1 minute to request. We reach out by text, call, or email to set a time — by phone or in person.</p>
              <a href="/local-ai/#checkup" className="eb-button">Book my free checkup <ArrowRight /></a>
            </div>
            <div>
              <span>02</span>
              <h3>Website or app project</h3>
              <p>About 4–8 minutes. Answer the guided questions so the first conversation can focus on decisions.</p>
              <a href="/get-started/" className="eb-button eb-button-light">Start my project <ArrowRight /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="eb-footer">
        <a href="/" className="eb-logo">EB<span>28</span></a>
        <p>AI setup, websites, apps, and useful automation for local businesses — from Melbourne, Florida.</p>
        <div><a href="/local-ai/">AI for your business</a><a href="/get-started/">Get started</a><a href="/melbournewebstudio/">Web Studio</a><a href="/reconcile/">Recon Agent</a><a href="/appbuilder/">App Builder</a><a href="/blog/">Blog</a></div>
        <small>© {new Date().getFullYear()} EB28. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;
