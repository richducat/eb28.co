import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
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

const examples = [
  {
    label: 'Restaurants',
    detail: 'Menu, calls, reservations, ordering links, catering prompts, and weekly local food posts.',
  },
  {
    label: 'Home services',
    detail: 'Service-area pages, quote requests, proof, follow-up routing, and useful repair guides.',
  },
  {
    label: 'Clinics and salons',
    detail: 'Treatment pages, appointment paths, trust signals, reviews, and local care topics.',
  },
];

const deliverables = [
  'Free custom website concept before you pay for hosting',
  '$98/month Growth Hosting after owner approval',
  'Managed hosting, SSL, technical upkeep, and launch support',
  'Local SEO page structure, metadata, sitemap, and speed checks',
  'One weekly local blog post or Google Business content prompt',
  `Lead forms and owner-review requests routed to ${CLAIM_EMAIL}`,
];

const steps = [
  {
    title: 'Send the business details',
    text: 'Give EB28 the business name, current website or Google listing, and the outcome you want more customers to take.',
  },
  {
    title: 'Review a working concept',
    text: 'EB28 builds a first version with clearer copy, lead capture, local SEO structure, and conversion paths.',
  },
  {
    title: 'Launch only if it earns approval',
    text: 'If the owner wants to use it, Growth Hosting keeps the site live, updated, and fed with weekly local content.',
  },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-emerald-200';

export default function FreeWebsiteBuildPage() {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    businessName: '',
    websiteUrl: '',
    businessType: '',
    bestTime: '',
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
        message: '',
      });
    } catch (submissionError) {
      console.error('Free website build request failed', submissionError);
      setStatus('idle');
      setError(`The form could not send yet. Email ${CLAIM_EMAIL} and include your business name and review window.`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
          <a href="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">EB</span>
            <span>EB28</span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="/melbournewebstudio/" className="hover:text-slate-950">Studio</a>
            <a href="/32940/" className="hover:text-slate-950">32940 Concepts</a>
            <a href="/blog/" className="hover:text-slate-950">Guides</a>
          </div>
          <a
            href={`mailto:${CLAIM_EMAIL}?subject=Free%20website%20build%20request`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-black hover:border-slate-950"
          >
            <Mail className="h-4 w-4" />
            {CLAIM_EMAIL}
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
              <Sparkles className="h-4 w-4" />
              Free website build, then $98/mo if approved
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-slate-950 md:text-7xl">
              A useful local business website before you pay for one.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              EB28 builds a real working website concept for your business at no upfront cost. If
              you want to use it, Growth Hosting is $98/month and includes hosting, technical SEO,
              weekly content, and lead routing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#claim"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 font-black text-white shadow-xl shadow-slate-900/15 hover:bg-slate-800"
              >
                Claim a free build
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="/32940/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-black text-slate-950 hover:border-slate-950"
              >
                View owner concepts
              </a>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ['0', 'upfront build fee'],
                ['$98', 'monthly hosting after approval'],
                ['1x', 'weekly local content prompt'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-stone-200 bg-white p-5">
                  <div className="text-3xl font-black">{value}</div>
                  <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <form
            id="claim"
            onSubmit={handleSubmit}
            className="rounded-lg border border-stone-200 bg-white p-5 shadow-2xl shadow-slate-900/10 md:p-7"
          >
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Owner review request
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Get the free website concept.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This sends to {CLAIM_EMAIL}. Add a review window so EB28 can confirm a 10-minute call.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Your name
                <input className={inputClass} name="name" value={formData.name} onChange={handleChange} required autoComplete="name" />
              </label>
              <label className="text-sm font-bold">
                Role
                <input className={inputClass} name="role" value={formData.role} onChange={handleChange} placeholder="Owner, manager..." />
              </label>
              <label className="text-sm font-bold">
                Email
                <input className={inputClass} name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email" />
              </label>
              <label className="text-sm font-bold">
                Phone
                <input className={inputClass} name="phone" type="tel" value={formData.phone} onChange={handleChange} autoComplete="tel" />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Business name
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
              <label className="text-sm font-bold sm:col-span-2">
                Best 10-minute review window
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
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            {status === 'sent' && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Sent. EB28 will reply from {CLAIM_EMAIL} to confirm the review window.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {status === 'submitting' ? 'Sending...' : 'Send my free website request'}
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              No obligation. EB28 will not launch, host, or bill unless the owner approves the site.
            </p>
          </form>
        </section>

        <section className="border-y border-stone-200 bg-white py-14">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 md:grid-cols-3">
            {examples.map((item) => (
              <article key={item.label} className="rounded-lg border border-stone-200 p-6">
                <h3 className="text-xl font-black">{item.label}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">What you get</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Useful enough to judge. Simple enough to say yes.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              This is built for businesses that need more calls, bookings, orders, or quotes from
              local buyers. The free concept gives you something concrete to inspect before the
              monthly hosting decision.
            </p>
          </div>
          <div className="grid gap-3">
            {deliverables.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" />
                <span className="font-semibold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                  <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-lg font-black text-slate-950">
                    {index + 1}
                  </div>
                  <h3 className="text-2xl font-black">{step.title}</h3>
                  <p className="mt-4 leading-7 text-slate-300">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              [Globe2, 'Built as a working site', 'Not a slide deck or mock screenshot.'],
              [Search, 'Structured for local SEO', 'Titles, content sections, sitemap, and technical checks.'],
              [CalendarClock, 'Designed around a review call', 'The form asks for a concrete 10-minute window.'],
              [ShieldCheck, 'Owner-approved launch', 'The business keeps its domain, content rights, and customers.'],
            ].map(([Icon, title, text]) => (
              <div key={title} className="rounded-lg border border-stone-200 bg-white p-5">
                <Icon className="h-7 w-7 text-emerald-700" />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-black text-slate-950">EB28</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> Melbourne, FL</span>
            <span className="inline-flex items-center gap-1"><TimerReset className="h-4 w-4" /> 10-minute review</span>
          </div>
          <a href={`mailto:${CLAIM_EMAIL}`} className="font-black text-slate-950">{CLAIM_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}
