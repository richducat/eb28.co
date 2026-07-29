import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

import ConversionAssistant from './components/ConversionAssistant.jsx';
import { submitLeadCapture } from './leadCapture.js';
import {
  GROWTH_HOSTING_FULL_LABEL,
  WEBSITE_ONLY_LABEL,
  WEBSITE_OFFER_DISCLOSURE,
} from './offerTerms.js';

const CLAIM_EMAIL = 'richducat@gmail.com';
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
        offer: GROWTH_HOSTING_FULL_LABEL,
        websiteOnlyAlternative: WEBSITE_ONLY_LABEL,
        offerDisclosure: WEBSITE_OFFER_DISCLOSURE,
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
              Here's how it works, plainly: we prepare a limited first direction at no cost.
              Choose 12 months of Growth Hosting for $1,176 paid upfront ($98 a month) and
              the full website build is included. Or choose the website-only build for $800
              one-time.
            </p>
            <div className="claim-actions">
              <button type="button" className="claim-primary" onClick={scrollToClaim}>
                Claim the included website build <ArrowRight aria-hidden="true" />
              </button>
              <a className="claim-secondary" href="/32940/">See what we'd fix first</a>
            </div>

            <div className="claim-price">
              <p><strong>$98</strong> <span>a month, paid as $1,176 upfront for 12 months:</span></p>
              <div className="claim-price-grid">
                <span><Check /> We keep it online &amp; fast</span>
                <span><Check /> We help you show up on Google</span>
                <span><Check /> A fresh article every week</span>
                <span><Check /> New leads go straight to you</span>
              </div>
              <small>Website-only is $800 one-time and does not include hosting, SEO upkeep, weekly content, or ongoing lead-routing support.</small>
            </div>
          </div>

          <aside className="claim-assistant-stage" aria-label="EB28 Assistant">
            <ConversionAssistant compact source="free-build" />
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
            <p className="claim-eyebrow"><span /> CLAIM THE INCLUDED WEBSITE BUILD</p>
            <h2>Show us the business. We'll show you the direction.</h2>
            <p>
              Send the basics and choose a 15-minute review window. No payment is taken on
              this form. Full production begins after you choose the annual hosting plan or
              the website-only build.
            </p>
            <div className="claim-form-price">
              <strong>$1,176 upfront.<br />$98/mo equivalent.</strong>
              <span>The full website build is included with the first 12 months of Growth Hosting. Website-only is $800 one-time.</span>
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
              {status === 'submitting' ? 'Sending...' : 'Request my website direction'} <ArrowRight />
            </button>
            <small>No obligation. Submitting this form does not approve hosting or billing.</small>
          </form>
        </section>
      </main>

      <footer className="claim-footer">
        <a href="/" className="claim-logo">EB<span>28</span></a>
        <p>Website build included with $1,176 upfront for 12 months of Growth Hosting ($98/month), or $800 one-time website-only.</p>
        <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>
      </footer>
    </div>
  );
}
