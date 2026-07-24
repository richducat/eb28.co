import React, { useState } from 'react';
import { ArrowRight, ArrowUp, Check } from 'lucide-react';

import { submitLeadCapture } from './leadCapture.js';

const CLAIM_EMAIL = 'social@eb28.co';
const REVIEW_TIMEZONE = 'America/New_York';

function getReviewWindowOptions(date = new Date()) {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: REVIEW_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: REVIEW_TIMEZONE,
    weekday: 'short',
  });
  const hour = Number.parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: REVIEW_TIMEZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date), 10);
  const slotTimes = [
    { label: '9:30 AM ET', cutoffHour: 9 },
    { label: '12:30 PM ET', cutoffHour: 12 },
    { label: '3:30 PM ET', cutoffHour: 15 },
  ];
  const slots = [];

  for (let dayOffset = 0; slots.length < 5 && dayOffset < 10; dayOffset += 1) {
    const candidate = new Date(date.getTime() + dayOffset * 86400000);
    const weekday = weekdayFormatter.format(candidate);
    if (weekday === 'Sat' || weekday === 'Sun') continue;
    for (const slot of slotTimes) {
      if (dayOffset === 0 && hour >= slot.cutoffHour) continue;
      slots.push(`${dateFormatter.format(candidate)} at ${slot.label}`);
      if (slots.length === 5) break;
    }
  }

  return slots;
}

const inputClass = 'claim-field';

export default function FreeWebsiteBuildPage() {
  const reviewWindowOptions = getReviewWindowOptions();
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    businessName: '',
    websiteUrl: '',
    businessType: '',
    bestTime: '',
    backupTime: '',
    message: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const scrollToClaim = () => document.querySelector('#claim')?.scrollIntoView({ behavior: 'smooth' });

  const askAssistant = (question) => {
    setAssistantReply(
      question === 'examples'
        ? 'You can browse the local concepts first, then come back here when you find a direction you like.'
        : 'The build is free to review. If you approve it, $98 a month covers hosting, Google visibility foundations, a fresh weekly article, and direct lead delivery.',
    );
  };

  const submitAssistantQuestion = (event) => {
    event.preventDefault();
    if (!assistantInput.trim()) return;
    setAssistantReply('Tell us the business name and the best way customers should reach you. We will use that to shape the first build.');
    setAssistantInput('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!formData.name.trim() || !formData.businessName.trim() || !formData.email.includes('@')) {
      setError('Add your name, business name, and a valid email so EB28 can send the concept.');
      return;
    }
    if (!formData.bestTime.trim()) {
      setError('Choose at least one review window.');
      return;
    }

    setStatus('submitting');
    try {
      await submitLeadCapture({
        ...formData,
        serviceNeed: 'free-website-build-growth-hosting-public-offer',
        sourcePage: 'https://eb28.co/free-website-build/',
        offer: 'Free website build plus EB28 Growth Hosting at $98/month with SEO and weekly blog posts',
        requestedNextStep: 'Confirm a 15-minute owner review call for the free website concept',
        reviewTimezone: REVIEW_TIMEZONE,
        _subject: `Free website build request: ${formData.businessName || formData.name}`,
      });
      setStatus('sent');
    } catch (submissionError) {
      console.error('Free website build request failed', submissionError);
      setStatus('idle');
      setError(`The form could not send yet. Email ${CLAIM_EMAIL} and include your business name and review window.`);
    }
  };

  return (
    <div className="claim-design">
      <a className="claim-skip" href="#main-content">Skip to content</a>

      <header className="claim-nav">
        <a href="/" className="claim-logo" aria-label="EB28 home">EB<span>28</span></a>
        <nav aria-label="Primary navigation">
          <a href="/#services">What we do</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/melbournewebstudio/">Web Studio</a>
          <a href="/reconcile/">Recon Agent</a>
          <a href="/blog/">Blog</a>
          <a className="claim-talk" href="#claim">Let's talk</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="claim-hero">
          <div className="claim-hero-copy">
            <p className="claim-eyebrow"><span /> WEB HELP FOR MELBOURNE, FL</p>
            <h1>A website that<br />attracts customers —<br />and services them<br />for you, too.</h1>
            <p className="claim-lede">
              Here's how it works, plainly: we make you a real website at no cost. Look it
              over. If it's right, it's $98 a month to keep it online, help it show up on
              Google, add a fresh article every week, and send anyone who reaches out
              straight to your phone. No contracts, no tech headaches.
            </p>
            <div className="claim-actions">
              <button type="button" className="claim-primary" onClick={scrollToClaim}>
                Build mine for free <ArrowRight aria-hidden="true" />
              </button>
              <a className="claim-secondary" href="/32940/">See what we'd fix first</a>
            </div>

            <div className="claim-price">
              <p><strong>$98</strong> <span>a month covers all of it:</span></p>
              <div className="claim-price-grid">
                <span><Check /> We keep it online &amp; fast</span>
                <span><Check /> We help you show up on Google</span>
                <span><Check /> A fresh article every week</span>
                <span><Check /> New leads go straight to you</span>
              </div>
              <small>Cancel whenever you want. The site is yours to keep.</small>
            </div>
          </div>

          <aside className="claim-assistant-stage" aria-label="EB28 Assistant">
            <div className="claim-assistant">
              <div className="claim-assistant-head">
                <span className="claim-assistant-mark">EB</span>
                <div><strong>EB28 Assistant</strong><small><i /> Here to help right now</small></div>
              </div>
              <div className="claim-chat">
                <div className="claim-message claim-message-left">
                  Hi 👋 Looking to get more customers? I can explain how the free build works — or grab a time that suits you.
                </div>
                <div className="claim-message claim-message-right">What's actually included for $98?</div>
                <div className="claim-message claim-message-left">
                  Hosting, getting you found on Google, a fresh article every week, and every new lead sent straight to you. Want me to book a quick call to walk through it?
                </div>
                {assistantReply && <div className="claim-message claim-message-left" role="status">{assistantReply}</div>}
                <div className="claim-quick-actions">
                  <button type="button" onClick={() => askAssistant('included')}>How does the free build work?</button>
                  <a href="/32940/" onClick={() => askAssistant('examples')}>See examples</a>
                </div>
                <button type="button" className="claim-book" onClick={scrollToClaim}>📅 Book a 15-min call</button>
              </div>
              <form className="claim-chat-input" onSubmit={submitAssistantQuestion}>
                <label className="sr-only" htmlFor="assistant-question">Ask the EB28 Assistant</label>
                <input
                  id="assistant-question"
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="Ask me anything..."
                />
                <button type="submit" aria-label="Send question"><ArrowUp /></button>
              </form>
            </div>
          </aside>
        </section>

        <div className="claim-audience">
          <strong>BUILT FOR LOCAL OPERATORS</strong>
          <span>Contractors</span>
          <span>Med &amp; dental</span>
          <span>Legal</span>
          <span>Home services</span>
          <span>Restaurants</span>
          <span>Finance ops</span>
        </div>

        <section id="claim" className="claim-form-section">
          <div className="claim-form-intro">
            <p className="claim-eyebrow"><span /> BUILD MINE FOR FREE</p>
            <h2>Show us the business. We'll show you the build.</h2>
            <p>
              Send the basics and choose a 15-minute review window. Nothing goes live and
              nothing is billed unless you approve the finished concept.
            </p>
            <div className="claim-form-price">
              <strong>All of it,<br />for $98/mo.</strong>
              <span>That's the whole deal. Build's free — you only pay once you love it.</span>
            </div>
          </div>

          <form className="claim-form" onSubmit={handleSubmit}>
            <div className="claim-form-grid">
              <label>Your name *<input className={inputClass} name="name" value={formData.name} onChange={handleChange} required autoComplete="name" /></label>
              <label>Role<input className={inputClass} name="role" value={formData.role} onChange={handleChange} placeholder="Owner, manager..." /></label>
              <label>Email *<input className={inputClass} name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email" /></label>
              <label>Phone<input className={inputClass} name="phone" type="tel" value={formData.phone} onChange={handleChange} autoComplete="tel" /></label>
              <label className="claim-full">Business name *<input className={inputClass} name="businessName" value={formData.businessName} onChange={handleChange} required /></label>
              <label>Current website or Google listing<input className={inputClass} name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} /></label>
              <label>Business type<input className={inputClass} name="businessType" value={formData.businessType} onChange={handleChange} /></label>
              <fieldset className="claim-full">
                <legend>Choose a 15-minute review window *</legend>
                <div className="claim-slots">
                  {reviewWindowOptions.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={formData.bestTime === slot}
                      className={formData.bestTime === slot ? 'is-selected' : ''}
                      onClick={() => setFormData((previous) => ({ ...previous, bestTime: slot }))}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="claim-full">Different preferred time<input className={inputClass} name="bestTime" value={formData.bestTime} onChange={handleChange} required /></label>
              <label className="claim-full">What should the site help customers do?<textarea className={inputClass} name="message" value={formData.message} onChange={handleChange} /></label>
            </div>
            {error && <p className="claim-error" role="alert">{error}</p>}
            {status === 'sent' && <p className="claim-success" role="status">Sent. EB28 will email you to confirm the review.</p>}
            <button className="claim-primary claim-submit" type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending...' : 'Build mine for free'} <ArrowRight />
            </button>
            <small>No obligation. Submitting this form does not approve hosting or billing.</small>
          </form>
        </section>
      </main>

      <footer className="claim-footer">
        <a href="/" className="claim-logo">EB<span>28</span></a>
        <p>Free website builds, $98/mo growth hosting, and private AI for local businesses on Florida's Space Coast.</p>
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>
      </footer>
    </div>
  );
}
