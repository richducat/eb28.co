import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Globe2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react';

import { submitLeadCapture } from './leadCapture.js';

const CLAIM_EMAIL = 'social@eb28.co';
const REVIEW_TIMEZONE = 'America/New_York';

function getEasternHour(date = new Date()) {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: REVIEW_TIMEZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).find((part) => part.type === 'hour');
  return Number.parseInt(hourPart?.value || '0', 10);
}

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
  const currentHour = getEasternHour(date);
  const slotTimes = [
    { label: '9:30 AM ET', cutoffHour: 9 },
    { label: '12:30 PM ET', cutoffHour: 12 },
    { label: '3:30 PM ET', cutoffHour: 15 },
  ];
  const slots = [];

  for (let dayOffset = 0; slots.length < 5 && dayOffset < 10; dayOffset += 1) {
    const candidate = new Date(date.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const weekday = weekdayFormatter.format(candidate);
    if (weekday === 'Sat' || weekday === 'Sun') {
      continue;
    }

    for (const slotTime of slotTimes) {
      if (dayOffset === 0 && currentHour >= slotTime.cutoffHour) {
        continue;
      }
      slots.push(`${dateFormatter.format(candidate)} at ${slotTime.label}`);
      if (slots.length >= 5) {
        break;
      }
    }
  }

  return slots.length ? slots : ['Next business morning ET', 'Next business afternoon ET'];
}

const examples = [
  {
    label: 'Restaurants + cafés',
    detail: 'A phone-first menu, hours, directions, reservations or ordering, and catering inquiries without making customers hunt.',
  },
  {
    label: 'Contractors + home services',
    detail: 'Clear services and coverage areas, project proof, urgent-call paths, and quote requests that reach the right person.',
  },
  {
    label: 'Clinics + appointment businesses',
    detail: 'Specific treatment or service pages, practical trust details, and a short route from local search to a booked appointment.',
  },
];

const deliverables = [
  'A working custom concept you can open on your phone and judge before paying',
  'Pages organized around your actual services, customers, and service area',
  'Clear calls, bookings, orders, or quote paths based on how your business sells',
  'Local search foundations: page titles, metadata, sitemap, structure, and speed checks',
  'Managed hosting, SSL, technical upkeep, and launch support after approval',
  `Lead forms routed to ${CLAIM_EMAIL}, with one useful local content update each week`,
];

const steps = [
  {
    title: 'Show us the real business',
    text: 'Share the business name, current website or Google listing, and the customer action that matters most: call, book, order, visit, or request a quote.',
  },
  {
    title: 'Open the working concept',
    text: 'EB28 researches the business and assembles a first version with clearer copy, a local search structure, and a direct customer path.',
  },
  {
    title: 'Keep it only if it is useful',
    text: 'Nothing launches and no billing starts until the owner approves it. After approval, Growth Hosting is $98 per month.',
  },
];

const inputClass =
  'mt-2 w-full rounded-[5px] border-2 border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100';

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
      setError('Add at least one review window so this can become a booked-call lead.');
      return;
    }

    setStatus('submitting');
    try {
      await submitLeadCapture({
        ...formData,
        serviceNeed: 'free-website-build-growth-hosting-public-offer',
        sourcePage: 'https://eb28.co/free-website-build/',
        offer: 'Free website build plus EB28 Growth Hosting at $98/month with SEO and weekly blog posts',
        requestedNextStep: 'Confirm a 10-minute owner review call for the free website concept',
        reviewTimezone: REVIEW_TIMEZONE,
        _subject: `Free website build request: ${formData.businessName || formData.name}`,
      });
      setStatus('sent');
      setFormData({
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
    } catch (submissionError) {
      console.error('Free website build request failed', submissionError);
      setStatus('idle');
      setError(`The form could not send yet. Email ${CLAIM_EMAIL} and include your business name and review window.`);
    }
  };

  return (
    <div className="eb-home min-h-screen">
      <a className="eb-skip" href="#main-content">Skip to content</a>
      <header className="eb-nav">
        <a href="/" className="eb-logo" aria-label="EB28 home">EB<span>28</span></a>
        <nav className="ml-auto flex items-center gap-6" aria-label="Primary navigation">
          <div className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="/melbournewebstudio/" className="text-slate-950 no-underline hover:text-emerald-700">Web Studio</a>
            <a href="/32940/" className="text-slate-950 no-underline hover:text-emerald-700">Local concepts</a>
            <a href="/blog/" className="text-slate-950 no-underline hover:text-emerald-700">Guides</a>
          </div>
          <a
            href={`mailto:${CLAIM_EMAIL}?subject=Free%20website%20build%20request`}
            className="eb-button eb-button-small"
          >
            <Mail className="h-4 w-4" />
            Email EB28
          </a>
        </nav>
      </header>

      <main id="main-content">
        <section className="eb-hero">
          <div className="eb-hero-copy">
            <p className="eb-eyebrow"><span /> Free website build · Melbourne, FL</p>
            <h1>
              See your new website before you decide.
            </h1>
            <p className="eb-lede">
              EB28 researches your local business and builds a working website concept at no
              upfront cost. Open it, test it, and decide whether it is genuinely more useful.
            </p>
            <div className="eb-actions">
              <a
                href="#claim"
                className="eb-button"
              >
                Start my free build
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="/32940/"
                className="eb-text-link"
              >
                See local business concepts
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <p className="eb-micro"><Check /> No build fee. No obligation. Nothing launches without owner approval.</p>
            <div className="mt-10 grid border-l-2 border-t-2 border-slate-900 sm:grid-cols-3">
              {[
                ['$0', 'to receive and review the build'],
                ['$98/mo', 'only after you approve and keep it'],
                ['10 min', 'for the owner review conversation'],
              ].map(([value, label]) => (
                <div key={label} className="border-b-2 border-r-2 border-slate-900 bg-white p-5">
                  <div className="font-mono text-2xl font-black">{value}</div>
                  <div className="mt-2 text-xs font-bold leading-5 text-slate-600">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="eb-hero-board">
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[10px_10px_0_#19202a] md:p-7">
              <div className="mb-7 flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
                <div>
                  <p className="eb-kicker">What happens first</p>
                  <h2 className="mt-2 text-3xl font-black">A build you can inspect.</h2>
                </div>
                <Sparkles className="h-8 w-8 flex-none text-emerald-700" aria-hidden="true" />
              </div>
              <ol className="space-y-5">
                {[
                  ['01', 'Research', 'Your services, customers, location, current presence, and strongest next action.'],
                  ['02', 'Build', 'A working phone-first site with specific copy and a practical local search structure.'],
                  ['03', 'Owner review', 'You open the concept and choose whether it deserves to become your live website.'],
                ].map(([number, title, text]) => (
                  <li key={number} className="grid grid-cols-[2.75rem_1fr] gap-4 border-b border-slate-300 pb-5 last:border-0 last:pb-0">
                    <span className="font-mono text-sm font-black text-emerald-700">{number}</span>
                    <div>
                      <h3 className="text-lg font-black">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>

        <section id="claim" className="eb-contact">
          <div className="eb-contact-intro">
            <p className="eb-kicker">Claim your build</p>
            <h2>Give us enough to make the first version specific.</h2>
            <p>
              Share the business and the customer action you need more of. Then choose a short
              Eastern-time review window. EB28 will use that context to confirm the right next step.
            </p>
            <div className="mt-8 border-l-2 border-emerald-400 pl-5">
              <p className="text-sm font-black text-white">Price, plainly stated</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The concept is free to review. If the owner approves it for launch, Growth Hosting
                is $98 per month. No approval means no launch and no charge.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[5px] border-2 border-white/20 bg-white p-5 text-slate-950 md:p-7"
          >
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Your business details
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight">Request the working concept.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Required fields are marked. Your request routes to {CLAIM_EMAIL}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Your name <span aria-hidden="true">*</span>
                <input className={inputClass} name="name" value={formData.name} onChange={handleChange} required autoComplete="name" />
              </label>
              <label className="text-sm font-bold">
                Role
                <input className={inputClass} name="role" value={formData.role} onChange={handleChange} placeholder="Owner, manager..." />
              </label>
              <label className="text-sm font-bold">
                Email <span aria-hidden="true">*</span>
                <input className={inputClass} name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email" />
              </label>
              <label className="text-sm font-bold">
                Phone
                <input className={inputClass} name="phone" type="tel" value={formData.phone} onChange={handleChange} autoComplete="tel" />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Business name <span aria-hidden="true">*</span>
                <input className={inputClass} name="businessName" value={formData.businessName} onChange={handleChange} required />
              </label>
              <label className="text-sm font-bold">
                Current website or Google listing
                <input className={inputClass} name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="example.com or Google profile" />
              </label>
              <label className="text-sm font-bold">
                Business type
                <input className={inputClass} name="businessType" value={formData.businessType} onChange={handleChange} placeholder="Restaurant, contractor, salon..." />
              </label>
              <div className="sm:col-span-2">
                <p className="text-sm font-black text-slate-950">Fast 10-minute review windows <span aria-hidden="true">*</span></p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {reviewWindowOptions.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={formData.bestTime === slot}
                      onClick={() => setFormData((previous) => ({ ...previous, bestTime: slot }))}
                      className={`min-h-11 rounded-[5px] border-2 px-3 py-2 text-left text-sm font-black transition ${
                        formData.bestTime === slot
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800 shadow-[3px_3px_0_#237e53]'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-950'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Pick one to prefill the field below, or type a different time. Times are interpreted in Eastern time.
                </p>
              </div>
              <label className="text-sm font-bold sm:col-span-2">
                Best 10-minute review window <span aria-hidden="true">*</span>
                <input
                  className={inputClass}
                  name="bestTime"
                  value={formData.bestTime}
                  onChange={handleChange}
                  required
                  placeholder="Today 3:00 PM ET, Friday morning, or two options"
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Backup review window
                <input
                  className={inputClass}
                  name="backupTime"
                  value={formData.backupTime}
                  onChange={handleChange}
                  placeholder="Optional backup time in case the first window is taken"
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                What should the site help customers do?
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Call, book, order, request a quote, check menu, understand services..."
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-[5px] border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            {status === 'sent' && (
              <p role="status" aria-live="polite" className="mt-4 rounded-[5px] border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Sent. EB28 will reply from {CLAIM_EMAIL} to confirm the review window.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="eb-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-65"
            >
              {status === 'submitting' ? 'Sending request…' : 'Request my free website concept'}
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              No obligation. Submitting this form does not approve hosting or billing.
            </p>
          </form>
        </section>

        <section className="eb-section">
          <div className="eb-section-head">
            <p className="eb-kicker">Built around the transaction</p>
            <h2>Different local businesses need different websites.</h2>
            <p>The first version should reflect how a customer actually chooses, not force every business into the same generic template.</p>
          </div>
          <div className="eb-service-grid">
            {examples.map((item) => (
              <article key={item.label} className="eb-service">
                <span>LOCAL</span>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="eb-guides">
          <div>
            <p className="eb-kicker">Included in the offer</p>
            <h2>Enough substance to make a real decision.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Judge the language, phone experience, service structure, and customer path in a
              working concept. The $98 monthly decision comes only after you see that work.
            </p>
          </div>
          <div className="!block">
            {deliverables.map((item) => (
              <div key={item} className="flex gap-3 border-b border-slate-300 py-4 last:border-0">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" />
                <span className="font-semibold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="eb-section eb-process">
          <div className="eb-section-head">
            <p className="eb-kicker">Three clear stages</p>
            <h2>Free to review. Paid only after approval.</h2>
          </div>
          <div className="eb-process-list">
              {steps.map((step, index) => (
                <article key={step.title}>
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="eb-section">
          <div className="eb-section-head">
            <p className="eb-kicker">What the promise means</p>
            <h2>Clear boundaries. No vague handoff.</h2>
          </div>
          <div className="grid border-t-2 border-slate-900 md:grid-cols-4">
            {[
              [Globe2, 'A working concept', 'Open a real site on desktop and mobile, not a slide deck or static mockup.'],
              [Search, 'Local search foundations', 'Useful page structure and technical basics, without promising a search ranking.'],
              [CalendarClock, 'A short owner review', 'A specific 10-minute window keeps the decision concrete and respectful of your day.'],
              [ShieldCheck, 'Approval before launch', 'No launch, hosting, or monthly billing begins until the owner says yes.'],
            ].map(([Icon, title, text]) => (
              <article key={title} className="border-b-2 border-r-2 border-slate-900 p-6 last:border-r-0">
                <Icon className="h-7 w-7 text-emerald-700" />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1380px] gap-8 border-b-2 border-slate-900 bg-emerald-700 px-5 py-12 text-white md:grid-cols-[1fr_auto] md:items-center md:px-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">One concrete next step</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black md:text-5xl">Show us the business. We will show you the build.</h2>
          </div>
          <a href="#claim" className="eb-button eb-button-light">
            Start the free request
            <ArrowRight />
          </a>
        </section>
      </main>

      <footer className="eb-footer">
        <a href="/" className="eb-logo">EB<span>28</span></a>
        <p>Websites, apps, and useful automation from Melbourne, Florida.</p>
        <div>
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> Melbourne, FL</span>
          <span className="inline-flex items-center gap-1"><TimerReset className="h-4 w-4" /> 10-minute review</span>
          <a href={`mailto:${CLAIM_EMAIL}`}>{CLAIM_EMAIL}</a>
        </div>
        <small>© {new Date().getFullYear()} EB28. All rights reserved.</small>
      </footer>
    </div>
  );
}
