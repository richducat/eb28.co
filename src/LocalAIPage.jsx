import React, { useState } from 'react';
import { ArrowRight, Check, Menu, MessageSquare, PhoneMissed, X } from 'lucide-react';
import { submitLeadCapture } from './leadCapture.js';
import { LOCAL_AI_FOUNDING_OFFER, LOCAL_AI_PACKAGES, formatUsd } from './localAiOffer.js';

const CONTACT_EMAIL = 'social@eb28.co';

const PAINS = [
  ['You miss calls while you are working', 'Every missed call is a customer who probably called the next business on the list.'],
  ['Leads go cold before you reply', 'Someone asks for a quote, life gets busy, and three days later they already hired someone else.'],
  ['You chase invoices by hand', 'Reminding people to pay is awkward, slow, and easy to forget.'],
  ['You know AI matters but not where to start', 'Every ad says "AI." Nobody explains what it would actually do in your business.'],
];

const MONTHLY_COVERS = [
  'We watch it every week and fix anything that breaks — you never have to',
  'One plain-English report a month: what it handled and what it saved you',
  'Small changes when your hours, prices, or services change',
  'Call or text us with questions. A real local person answers.',
];

const STEPS = [
  ['Free 20-minute checkup', 'By phone or at your business. We ask where time and customers slip away. No pitch deck, no jargon.'],
  ['A plain-English plan with a fixed price', 'You get one page in writing: what we will set up, what it costs, and what it will not do. No surprises.'],
  ['We set it up for you', 'Most setups go live within two weeks. We test it on real calls and messages before your customers ever see it.'],
  ['We show your team and keep it running', 'A short walkthrough for you and your staff, then we keep watch every month.'],
];

const PROMISES = [
  'You own every account. If you ever leave, everything stays with you.',
  'AI never sends a price, a refund, or anything sensitive without your OK.',
  'Fixed price in writing before any work starts.',
  'Monthly plans are month-to-month. Cancel with 30 days notice.',
  'We will tell you when AI is not the right fix.',
];

const FAQS = [
  ['Do I need to be good with computers?', 'No. If you can send a text, you can use this. We handle the setup, and we explain everything in normal words.'],
  ['Is this going to replace my staff?', 'No. It handles the repetitive stuff — missed-call texts, reminders, common questions — so your people can focus on customers and the actual work.'],
  ['What if the AI says something wrong?', 'We set firm limits on what it can say. It sticks to the answers you approve, and anything it is unsure about goes to a person. Prices, refunds, and promises always come to you first.'],
  ['Are there other costs besides your price?', 'Some tools charge their own small monthly fee — for example, a business texting number usually runs about $10–30 a month. We list every one before you sign, and those accounts are in your name.'],
  ['What kinds of businesses is this for?', 'Home services and trades, salons and spas, realtors, auto shops, restaurants, cleaners, and most local service businesses. We do not currently take on work that handles patient health records or legal case files.'],
  ['Where are you located?', 'Melbourne, Florida. We work with businesses across Brevard County and can meet in person.'],
];

const TIME_SINKS = [
  'Missed calls',
  'Slow replies to new leads',
  'Answering the same questions',
  'Scheduling and reminders',
  'Getting reviews',
  'Chasing unpaid invoices',
  'Social posts and marketing',
  'Not sure yet',
];

const BUSINESS_TYPES = [
  'Home services or trades',
  'Salon, spa, or beauty',
  'Real estate',
  'Auto',
  'Restaurant or food',
  'Retail shop',
  'Professional services',
  'Other',
];

function CheckupForm() {
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    businessType: '',
    phone: '',
    email: '',
    bestContact: 'Text',
    notes: '',
  });
  const [timeSinks, setTimeSinks] = useState([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const toggleSink = (sink) => {
    setTimeSinks((previous) => (previous.includes(sink) ? previous.filter((item) => item !== sink) : [...previous, sink]));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.businessName.trim()) {
      setError('Add your name and business name.');
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError('Add a phone number or email so we can reach you.');
      return;
    }
    if (!consent) {
      setError('Check the box so we know it is OK to contact you.');
      return;
    }

    setStatus('submitting');
    try {
      await submitLeadCapture({
        ...form,
        timeSinks,
        serviceNeed: 'local-ai-checkup',
        offer: 'Free 20-minute AI checkup',
        sourcePage: typeof window === 'undefined' ? 'https://eb28.co/local-ai/' : window.location.href,
        consent: 'User asked EB28 to contact them about a free AI checkup by their preferred method.',
        _subject: `[EB28 AI CHECKUP] ${form.businessName || form.name}: ${timeSinks.join(', ') || 'not specified'}`,
      });
      setStatus('success');
    } catch (submissionError) {
      console.error('EB28 AI checkup request failed', submissionError);
      setStatus('idle');
      setError(`That did not send. Email ${CONTACT_EMAIL} with your name and business and we will reply the same day.`);
    }
  };

  if (status === 'success') {
    return (
      <div className="lai-form lai-form-done" role="status">
        <Check aria-hidden="true" />
        <h3>Got it — thank you.</h3>
        <p>We will reach out by {form.bestContact.toLowerCase()} within one business day to pick a time for your free checkup.</p>
      </div>
    );
  }

  return (
    <form className="lai-form" onSubmit={submit} noValidate>
      <div className="lai-form-row">
        <label>Your name<input required value={form.name} onChange={update('name')} autoComplete="name" /></label>
        <label>Business name<input required value={form.businessName} onChange={update('businessName')} autoComplete="organization" /></label>
      </div>
      <label>Type of business
        <select value={form.businessType} onChange={update('businessType')}>
          <option value="">Choose one</option>
          {BUSINESS_TYPES.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      <div className="lai-form-row">
        <label>Phone<input type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" /></label>
        <label>Email<input type="email" value={form.email} onChange={update('email')} autoComplete="email" /></label>
      </div>
      <fieldset>
        <legend>What eats up the most time right now?</legend>
        <div className="lai-chips">
          {TIME_SINKS.map((sink) => (
            <button
              type="button"
              key={sink}
              className={timeSinks.includes(sink) ? 'is-on' : ''}
              aria-pressed={timeSinks.includes(sink)}
              onClick={() => toggleSink(sink)}
            >
              {sink}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Best way to reach you</legend>
        <div className="lai-chips">
          {['Text', 'Call', 'Email'].map((method) => (
            <button
              type="button"
              key={method}
              className={form.bestContact === method ? 'is-on' : ''}
              aria-pressed={form.bestContact === method}
              onClick={() => setForm((previous) => ({ ...previous, bestContact: method }))}
            >
              {method}
            </button>
          ))}
        </div>
      </fieldset>
      <label>Anything else? (optional)<textarea rows={3} value={form.notes} onChange={update('notes')} placeholder="Best days or times, what you have tried, questions..." /></label>
      <label className="lai-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>It is OK for EB28 to contact me about this checkup. No spam, and we never sell your info.</span>
      </label>
      {error && <p className="lai-form-error" role="alert">{error}</p>}
      <button type="submit" className="eb-button" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : <>Book my free checkup <ArrowRight /></>}
      </button>
      <small>Free. No obligation. Takes about 20 minutes.</small>
    </form>
  );
}

export default function LocalAIPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="eb-home lai-page">
      <a className="eb-skip" href="#main-content">Skip to content</a>
      <header className="eb-nav">
        <a href="/" className="eb-logo" aria-label="EB28 home">EB<span>28</span></a>
        <nav className={`eb-navlinks ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
          <a href="#packages" onClick={() => setMenuOpen(false)}>Prices</a>
          <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>Questions</a>
          <a href="/">Websites</a>
          <a className="eb-button eb-button-small" href="#checkup" onClick={() => setMenuOpen(false)}>Free AI checkup</a>
        </nav>
        <button className="eb-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="main-content">
        <section className="lai-hero">
          <div className="lai-hero-copy">
            <p className="eb-eyebrow"><span /> AI help for Melbourne &amp; Brevard businesses</p>
            <h1>AI that answers, follows up, and chases invoices — set up for you.</h1>
            <p className="eb-lede">
              No jargon and no tech skills needed. We come to your business, set up a few simple AI helpers
              that save you hours every week, explain exactly how they work in plain English, and keep them running.
            </p>
            <div className="eb-actions">
              <a href="#checkup" className="eb-button">Book a free 20-minute checkup <ArrowRight /></a>
              <a className="eb-text-link" href="#packages">See prices</a>
            </div>
            <ul className="lai-hero-points">
              <li><Check /> Fixed prices, in writing</li>
              <li><Check /> Local — we can meet in person</li>
              <li><Check /> You own every account</li>
            </ul>
          </div>
          <aside className="lai-demo" aria-label="Example of a missed-call text-back">
            <p className="lai-demo-label">Example: what your customer sees</p>
            <div className="lai-phone">
              <div className="lai-phone-event"><PhoneMissed aria-hidden="true" /> Missed call · 6:42 PM</div>
              <div className="lai-bubble lai-bubble-in">Hi, this is Sunrise Plumbing! Sorry we missed your call — we are on a job. What can we help with?</div>
              <div className="lai-bubble lai-bubble-out">Water heater is leaking in the garage</div>
              <div className="lai-bubble lai-bubble-in">Got it. Is it an emergency, or can it wait until tomorrow morning? Mike can be there at 8:00 or 10:30.</div>
              <div className="lai-bubble lai-bubble-out">8 works</div>
              <div className="lai-bubble lai-bubble-in">You are booked for 8:00 AM. Mike will text when he is on the way.</div>
              <div className="lai-phone-event lai-phone-owner"><MessageSquare aria-hidden="true" /> Owner gets: "New booking — water heater leak, 8:00 AM"</div>
            </div>
            <p className="lai-demo-note">Illustration with a made-up business. Your version uses your name, your hours, and answers you approve.</p>
          </aside>
        </section>

        <section className="eb-section">
          <div className="eb-section-head">
            <p className="eb-kicker">Sound familiar?</p>
            <h2>The work is fine. The busywork is the problem.</h2>
          </div>
          <div className="lai-pains">
            {PAINS.map(([title, body]) => (
              <article key={title}><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </section>

        <section id="packages" className="eb-section lai-packages-section">
          <div className="eb-section-head">
            <p className="eb-kicker">Simple packages · fixed prices</p>
            <h2>Pick the problem. We set up the fix.</h2>
            <p>One-time setup, then an optional monthly plan so it keeps working. No contracts, no hourly billing, no surprise invoices.</p>
          </div>
          <div className="lai-packages">
            {LOCAL_AI_PACKAGES.map((pkg) => (
              <article key={pkg.id} className={`lai-package ${pkg.featured ? 'is-featured' : ''}`}>
                {pkg.featured && <span className="lai-badge">Recommended</span>}
                <h3>{pkg.name}</h3>
                <p className="lai-tagline">{pkg.tagline}</p>
                <p className="lai-price">
                  <strong>{formatUsd(pkg.setup)}</strong>
                  <span>{pkg.monthly ? 'one-time setup' : 'flat, one session'}</span>
                </p>
                {pkg.monthly > 0 && <p className="lai-monthly">+ {formatUsd(pkg.monthly)}/month to keep it running</p>}
                <ul>
                  {pkg.includes.map((item) => <li key={item}><Check /> {item}</li>)}
                </ul>
                <p className="lai-fit"><b>Good fit:</b> {pkg.fit}</p>
                <a href={`#checkup`} className={`eb-button ${pkg.featured ? '' : 'eb-button-dark'}`}>Start with a free checkup <ArrowRight /></a>
              </article>
            ))}
          </div>
          <div className="lai-founding">
            <p>{LOCAL_AI_FOUNDING_OFFER}</p>
          </div>
          <div className="lai-monthly-covers">
            <h3>What the monthly plan covers</h3>
            <ul>{MONTHLY_COVERS.map((item) => <li key={item}><Check /> {item}</li>)}</ul>
          </div>
        </section>

        <section id="how" className="eb-section eb-process">
          <div className="eb-section-head">
            <p className="eb-kicker">How it works</p>
            <h2>Four steps. No homework for you.</h2>
          </div>
          <div className="eb-process-list">
            {STEPS.map(([title, description], index) => (
              <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>
            ))}
          </div>
        </section>

        <section className="eb-section lai-promises">
          <div className="eb-section-head">
            <p className="eb-kicker">Our promises</p>
            <h2>Straight answers, in writing.</h2>
            <p>We run our own business on these same AI tools every day. We only set up what we would trust in our own shop.</p>
          </div>
          <ul>{PROMISES.map((item) => <li key={item}><Check /> {item}</li>)}</ul>
        </section>

        <section id="faq" className="eb-section lai-faq">
          <div className="eb-section-head">
            <p className="eb-kicker">Common questions</p>
            <h2>Plain answers.</h2>
          </div>
          <div className="lai-faq-list">
            {FAQS.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="checkup" className="eb-contact lai-checkup">
          <div className="eb-contact-intro">
            <p className="eb-kicker">Free AI checkup</p>
            <h2>20 minutes. Zero jargon.</h2>
            <p>Tell us a little about your business. We will reach out to set a time — by phone or in person around Melbourne and Brevard — and show you where AI would save you the most time. If it would not help, we will tell you.</p>
          </div>
          <CheckupForm />
        </section>
      </main>

      <footer className="eb-footer">
        <a href="/" className="eb-logo">EB<span>28</span></a>
        <p>AI setup, websites, and automation for local businesses — from Melbourne, Florida.</p>
        <div><a href="#checkup">Free AI checkup</a><a href="/">Websites</a><a href="/get-started/">Start a project</a><a href="/blog/">Blog</a></div>
        <small>© {new Date().getFullYear()} EB28. All rights reserved.</small>
      </footer>
    </div>
  );
}
