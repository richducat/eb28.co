import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Compass,
  FileText,
  Home,
  MapPin,
  Menu,
  Phone,
  Quote,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from './lib/utils';
import {
  THOMAS_COMPANY_NAME,
  THOMAS_EB28_BASE_PATH,
  THOMAS_OFFICE_ADDRESS,
  THOMAS_PHONE,
  THOMAS_PHONE_DISPLAY,
  THOMAS_PRIMARY_CTA_COPY,
  THOMAS_PRIMARY_CTA_LABEL,
  THOMAS_SEO_PAGES,
  getThomasPageById,
  getThomasPageForLocation,
  getThomasPathForHostname,
} from './thomasSeoPages.js';
import ThomasCustomHomesHomepageClassic from './ThomasCustomHomesHomepageClassic.jsx';

const FORM_ENDPOINT = 'https://formsubmit.co/ajax/richducat@gmail.com';

const FEATURED_PROJECTS = [
  {
    title: 'Riverfront Custom Home Planning',
    location: 'Brevard County',
    description:
      'Custom residential planning centered on views, layout flow, and a finish schedule that supports a refined final result.',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
  },
  {
    title: 'Build-on-Your-Lot Coordination',
    location: 'Viera + 32940',
    description:
      'Lot-driven planning that starts with location fit, daily lifestyle goals, and the decisions that need to happen early.',
    image:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop',
  },
  {
    title: 'Higher-Finish Custom Residences',
    location: 'Space Coast',
    description:
      'Homes designed around entertaining, everyday livability, and detail choices that feel intentional rather than generic.',
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alex Bogumil',
    role: 'Capital Fundings, LLC',
    text:
      'Thomas Custom Homes delivered exactly what they promised. Their attention to detail and clear communication made a complex build feel manageable and predictable.',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
  },
  {
    name: 'Tammara Otero',
    role: 'Deshoda Interior Design Studio LLC',
    text:
      'As a designer, I appreciate a builder who respects the vision while bringing practical expertise to the table. Thomas Custom Homes is a true partner in the design-build process.',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
  },
];

function getCurrentThomasPage() {
  if (typeof window === 'undefined') {
    return getThomasPageById('thomas-home');
  }

  return (
    getThomasPageForLocation({
      pathname: window.location.pathname,
      hostname: window.location.hostname,
    }) || getThomasPageById('thomas-home')
  );
}

function getDefaultProjectType(page) {
  if (page.kind === 'service' || page.kind === 'home' || page.kind === 'location') {
    return 'Custom Home';
  }

  return 'Consultation';
}

function getNavLinks(hostname) {
  return [
    { name: 'Home', href: getThomasPathForHostname('thomas-home', hostname) },
    { name: 'Viera', href: getThomasPathForHostname('thomas-viera', hostname) },
    {
      name: 'Build on Your Lot',
      href: getThomasPathForHostname('thomas-build-on-your-lot-viera', hostname),
    },
    {
      name: 'Cost Guide',
      href: getThomasPathForHostname('thomas-cost-to-build-viera', hostname),
    },
    { name: 'Contact', href: '#contact' },
  ];
}

function getLinkCardIcon(page) {
  if (page.kind === 'location') return <MapPin size={20} />;
  if (page.kind === 'service') return <Home size={20} />;
  return <FileText size={20} />;
}

function Navbar({ hostname }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navLinks = getNavLinks(hostname);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-slate-950/85 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <a href={getThomasPathForHostname('thomas-home', hostname)} className="group flex items-center gap-2">
          <div className="rounded-lg bg-brand-primary p-1.5 text-white transition-transform group-hover:scale-110">
            <Home size={24} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-white">THOMAS</span>
            <span className="text-[10px] font-semibold tracking-[0.24em] text-slate-300">
              CUSTOM HOMES INC.
            </span>
          </div>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-200 transition-colors hover:text-brand-accent"
            >
              {link.name}
            </a>
          ))}
          <a
            href={`tel:${THOMAS_PHONE}`}
            className="flex items-center gap-2 rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-white active:scale-95"
          >
            <Phone size={16} />
            {THOMAS_PHONE_DISPLAY}
          </a>
        </div>

        <button
          type="button"
          className="rounded-full border border-white/10 p-2 text-white md:hidden"
          onClick={() => setIsMobileMenuOpen((previous) => !previous)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute left-0 right-0 top-full border-t border-white/10 bg-slate-950 p-6 shadow-2xl md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="border-b border-white/10 py-2 text-lg font-medium text-white"
                >
                  {link.name}
                </a>
              ))}
              <a
                href={`tel:${THOMAS_PHONE}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-accent px-5 py-4 text-lg font-semibold text-slate-950"
              >
                <Phone size={20} />
                Call {THOMAS_PHONE_DISPLAY}
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function Hero({ page, hostname }) {
  const secondaryPageId = page.relatedLinks?.[0] || 'thomas-viera';
  const secondaryHref =
    secondaryPageId === 'thomas-home'
      ? getThomasPathForHostname('thomas-home', hostname)
      : getThomasPathForHostname(secondaryPageId, hostname);
  const secondaryLabel =
    secondaryPageId === 'thomas-home'
      ? 'View Homepage'
      : `Explore ${getThomasPageById(secondaryPageId).navLabel}`;

  return (
    <section className="relative overflow-hidden bg-slate-950 pb-20 pt-28 text-white">
      <div className="absolute inset-0">
        <img
          src={page.heroImage}
          alt={page.h1}
          className="h-full w-full object-cover opacity-35"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,176,74,0.18),transparent_35%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.88))]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.25fr,0.85fr] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
            <ShieldCheck size={14} className="text-brand-accent" />
            {page.eyebrow}
          </div>
          <h1 className="mb-6 font-display text-5xl font-bold leading-[1.04] md:text-7xl">
            {page.h1}
          </h1>
          <div className="space-y-4 text-lg leading-relaxed text-slate-200">
            {page.heroParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#contact"
              className="flex items-center justify-center gap-2 rounded-full bg-brand-accent px-8 py-4 text-lg font-bold text-slate-950 transition-all hover:bg-white active:scale-95"
            >
              {THOMAS_PRIMARY_CTA_LABEL}
              <ArrowRight size={18} />
            </a>
            <a
              href={secondaryHref}
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white/10 active:scale-95"
            >
              {secondaryLabel}
              <ChevronRight size={18} />
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-accent">
            <Compass size={16} />
            {page.summaryTitle}
          </div>
          <div className="space-y-3">
            {page.summaryItems.map((item) => (
              <div key={item} className="flex items-start gap-3 text-slate-100">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/35 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Next Step
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {page.primaryCtaCopy || THOMAS_PRIMARY_CTA_COPY}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function InlinePromo({ pageId, hostname, title, description }) {
  const page = getThomasPageById(pageId);

  return (
    <div className="rounded-[2rem] border border-brand-primary/10 bg-brand-primary/5 p-6 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
        Helpful Next Step
      </div>
      <h3 className="font-display text-2xl font-bold text-slate-900">{title || page.h1}</h3>
      <p className="mt-3 text-slate-600">
        {description ||
          'If you want a more concrete planning conversation, this page is the best next step to review before you reach out.'}
      </p>
      <a
        href={getThomasPathForHostname(page.id, hostname)}
        className="mt-5 inline-flex items-center gap-2 font-bold text-brand-primary transition-colors hover:text-brand-accent"
      >
        Open this page
        <ArrowRight size={16} />
      </a>
    </div>
  );
}

function SectionRenderer({ page, hostname }) {
  return (
    <section id="overview" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-8">
            {page.sections.map((section, index) => (
              <div key={section.title} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-8 shadow-sm">
                <h2 className="font-display text-3xl font-bold text-slate-900">{section.title}</h2>
                {section.paragraphs ? (
                  <div className="mt-4 space-y-4 text-lg leading-relaxed text-slate-600">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                {section.items ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {section.items.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-slate-700">
                        <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-accent" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {index === 0 && page.midPagePromoId ? (
                  <div className="mt-6">
                    <InlinePromo pageId={page.midPagePromoId} hostname={hostname} />
                  </div>
                ) : null}
              </div>
            ))}

            {page.faqItems?.length ? (
              <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
                <h2 className="font-display text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
                <div className="mt-6 space-y-5">
                  {page.faqItems.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <h3 className="text-lg font-bold text-slate-900">{item.question}</h3>
                      <p className="mt-2 leading-relaxed text-slate-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-950 p-8 text-white shadow-xl">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                Start With a Consultation
              </div>
              <p className="mt-4 text-lg leading-relaxed text-slate-200">
                The next helpful step is a conversation about your city, lot status, target timeline,
                and what kind of custom-home result you want to create.
              </p>
              <a
                href="#contact"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-accent px-6 py-3 font-bold text-slate-950 transition-all hover:bg-white active:scale-95"
              >
                Start the Conversation
                <ArrowRight size={16} />
              </a>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
              <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
                Key Markets
              </div>
              <div className="space-y-3 text-slate-700">
                {['Viera', 'Melbourne', 'Rockledge', 'Suntree', 'Cocoa', 'Brevard County'].map(
                  (area) => (
                    <div key={area} className="flex items-center gap-3">
                      <MapPin size={16} className="text-brand-accent" />
                      <span>{area}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFeatures({ hostname }) {
  const featurePageIds = [
    'thomas-viera',
    'thomas-build-on-your-lot-viera',
    'thomas-luxury-custom-homes-viera',
    'thomas-build-from-out-of-state',
  ];

  return (
    <section id="featured" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-accent">
            Explore More
          </div>
          <h2 className="font-display text-4xl font-bold text-slate-900 md:text-5xl">
            Explore Planning Options Across Viera and Brevard County.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            These pages cover some of the most common starting points for buyers planning a custom
            home, a build-on-your-lot project, or a move into the Viera and Brevard market.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featurePageIds.map((pageId) => {
            const page = getThomasPageById(pageId);

            return (
              <a
                key={pageId}
                href={getThomasPathForHostname(page.id, hostname)}
                className="group rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 inline-flex rounded-full bg-brand-primary/10 p-3 text-brand-primary">
                  {getLinkCardIcon(page)}
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900">{page.h1}</h3>
                <p className="mt-3 text-slate-600">{page.metaDescription}</p>
                <div className="mt-5 flex items-center gap-2 font-bold text-brand-primary transition-colors group-hover:text-brand-accent">
                  Open page
                  <ChevronRight size={16} />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedProjects() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-accent">
            Project Inspiration
          </div>
          <h2 className="font-display text-4xl font-bold text-slate-900 md:text-5xl">
            Build quality is easier to understand when the finished result feels tangible.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {FEATURED_PROJECTS.map((project) => (
            <div key={project.title} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 shadow-sm">
              <img
                src={project.image}
                alt={project.title}
                className="aspect-[4/3] w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-6">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                  {project.location}
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900">{project.title}</h3>
                <p className="mt-3 text-slate-600">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedLinks({ page, hostname }) {
  if (!page.relatedLinks?.length) {
    return null;
  }

  return (
    <section id="guides" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-accent">
            Related Pages
          </div>
          <h2 className="font-display text-4xl font-bold text-slate-900">{page.relatedLinksTitle}</h2>
          <p className="mt-4 text-lg text-slate-600">
            Use these pages to move from a general question into the next planning step that fits
            your lot, location, or custom-home goals.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {page.relatedLinks.map((pageId) => {
            const linkedPage = getThomasPageById(pageId);

            return (
              <a
                key={pageId}
                href={getThomasPathForHostname(pageId, hostname)}
                className="group rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 inline-flex rounded-full bg-brand-primary/10 p-3 text-brand-primary">
                  {getLinkCardIcon(linkedPage)}
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                  {linkedPage.navLabel}
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                  {linkedPage.h1}
                </h3>
                <p className="mt-3 text-slate-600">{linkedPage.metaDescription}</p>
                <div className="mt-5 flex items-center gap-2 font-bold text-brand-primary transition-colors group-hover:text-brand-accent">
                  Open page
                  <ChevronRight size={16} />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalMoneyCta({ page, hostname }) {
  if (!page.finalMoneyPageId) {
    return null;
  }

  const targetPage = getThomasPageById(page.finalMoneyPageId);

  return (
    <section className="bg-white pb-4">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-[2rem] border border-brand-primary/10 bg-brand-primary px-8 py-10 text-white shadow-xl md:px-12">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
            Final CTA
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Ready to turn the research into a real planning conversation?
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
            If this guide helped you narrow the right direction, the next best step is the page
            below. It moves from general research into the kind of consultation that can address
            your lot, timeline, and custom-home goals directly.
          </p>
          <a
            href={getThomasPathForHostname(targetPage.id, hostname)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-accent px-7 py-3 font-bold text-slate-950 transition-all hover:bg-white active:scale-95"
          >
            Open {targetPage.navLabel}
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-accent">
            Testimonials
          </div>
          <h2 className="font-display text-4xl font-bold text-slate-900 md:text-5xl">
            Homeowners and collaborators often remember the process as much as the finished work.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-[2rem] border border-slate-100 bg-slate-50 p-8 shadow-sm"
            >
              <Quote size={48} className="absolute right-8 top-8 text-slate-200" />
              <p className="relative z-10 text-xl italic leading-relaxed text-slate-700">
                &quot;{testimonial.text}&quot;
              </p>
              <div className="mt-8 flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-14 w-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="font-bold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-brand-muted">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ page }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    lotStatus: '',
    projectType: getDefaultProjectType(page),
    budgetRange: 'Under $500k',
    completionDate: '',
    projectNotes: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function validate(name, value) {
    const trimmedValue = String(value || '').trim();

    if (name === 'name' && trimmedValue.length < 2) {
      return 'Name is required';
    }

    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
      return 'A valid email is required';
    }

    if (name === 'phone' && trimmedValue.length < 10) {
      return 'Phone is required';
    }

    if (name === 'city' && !trimmedValue) {
      return 'City is required';
    }

    if (name === 'lotStatus' && !trimmedValue) {
      return 'Lot status is required';
    }

    if (name === 'projectNotes' && trimmedValue.length < 12) {
      return 'Project notes should include a little more detail';
    }

    return '';
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: validate(name, value) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const nextErrors = {
      name: validate('name', formData.name),
      email: validate('email', formData.email),
      phone: validate('phone', formData.phone),
      city: validate('city', formData.city),
      lotStatus: validate('lotStatus', formData.lotStatus),
      projectNotes: validate('projectNotes', formData.projectNotes),
    };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          lotStatus: formData.lotStatus,
          projectType: formData.projectType,
          budgetRange: formData.budgetRange,
          completionDate: formData.completionDate,
          projectNotes: formData.projectNotes,
          sourcePage: page.h1,
          sourceSlug: page.slug || 'home',
          business: THOMAS_COMPANY_NAME,
          officePhone: THOMAS_PHONE_DISPLAY,
          officeAddress: THOMAS_OFFICE_ADDRESS,
          _subject: `${THOMAS_COMPANY_NAME} lead: ${page.h1}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setIsSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        lotStatus: '',
        projectType: getDefaultProjectType(page),
        budgetRange: 'Under $500k',
        completionDate: '',
        projectNotes: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Thomas Custom Homes lead form error:', error);
      setSubmitError(`Please try again or call ${THOMAS_PHONE_DISPLAY} directly.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md lg:grid-cols-[0.9fr,1.1fr] lg:p-14">
          <div>
            <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-accent">
              Contact
            </div>
            <h2 className="font-display text-4xl font-bold md:text-5xl">
              {page.primaryCtaCopy || THOMAS_PRIMARY_CTA_COPY}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              Share your city, lot status, timeline, and project notes so the follow-up
              conversation can start with real context.
            </p>
            <div className="mt-8 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-accent">
                  <Phone size={22} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Call</div>
                  <a href={`tel:${THOMAS_PHONE}`} className="text-xl font-bold hover:text-brand-accent">
                    {THOMAS_PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-accent">
                  <MapPin size={22} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Office</div>
                  <div className="text-xl font-bold">{THOMAS_OFFICE_ADDRESS}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 text-slate-900 shadow-xl">
            {isSuccess ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle size={40} />
                </div>
                <h3 className="font-display text-3xl font-bold">Request Sent</h3>
                <p className="mt-4 max-w-xl text-slate-600">
                  Thank you. The request came through with your city, lot status, and project notes
                  so the next conversation can start with real context.
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <h3 className="font-display text-3xl font-bold text-slate-900">
                    Request a Consultation
                  </h3>
                  <p className="mt-2 text-slate-600">
                    Share the basics and the team can respond with a more useful next step.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="John Doe"
                  />
                  <Field
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="john@example.com"
                    type="email"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="(321) 555-1234"
                  />
                  <Field
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="Viera"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Lot Status"
                    name="lotStatus"
                    value={formData.lotStatus}
                    onChange={handleChange}
                    error={errors.lotStatus}
                    options={[
                      'I already own the lot',
                      'I have a lot under contract',
                      'I am still evaluating lots',
                      'I am planning a major remodel on an existing home',
                    ]}
                    placeholder="Select lot status"
                  />
                  <SelectField
                    label="Project Type"
                    name="projectType"
                    value={formData.projectType}
                    onChange={handleChange}
                    options={[
                      'Custom Home',
                      'Build on Your Lot',
                      'Luxury Custom Home',
                      'Waterfront Custom Home',
                      'Relocation Planning',
                      'Major Remodel',
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Budget Range"
                    name="budgetRange"
                    value={formData.budgetRange}
                    onChange={handleChange}
                    options={[
                      'Under $500k',
                      '$500k - $750k',
                      '$750k - $1M',
                      '$1M - $1.5M',
                      '$1.5M+',
                    ]}
                  />
                  <Field
                    label="Desired Timeline"
                    name="completionDate"
                    value={formData.completionDate}
                    onChange={handleChange}
                    placeholder="e.g., Spring 2027"
                  />
                </div>

                <TextAreaField
                  label="Project Notes"
                  name="projectNotes"
                  value={formData.projectNotes}
                  onChange={handleChange}
                  error={errors.projectNotes}
                  placeholder="Tell us what you want to build, where you want to build it, and what matters most in the process."
                />

                {submitError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-4 font-bold text-white transition-all active:scale-95',
                    isSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-brand-primary/90',
                  )}
                >
                  {isSubmitting ? 'Sending...' : 'Send Consultation Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, error, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <input
        {...props}
        className={cn(
          'w-full rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'border-slate-200 focus:ring-brand-primary/20',
        )}
      />
      {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function SelectField({ label, error, options, placeholder, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <select
        {...props}
        className={cn(
          'w-full rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'border-slate-200 focus:ring-brand-primary/20',
        )}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function TextAreaField({ label, error, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <textarea
        {...props}
        className={cn(
          'h-32 w-full resize-none rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'border-slate-200 focus:ring-brand-primary/20',
        )}
      />
      {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function Footer({ hostname }) {
  const locationLinks = THOMAS_SEO_PAGES.filter((page) => page.kind === 'location');
  const guideLinks = THOMAS_SEO_PAGES.filter(
    (page) => page.kind === 'article' || page.kind === 'relocation',
  ).slice(0, 4);

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-14">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.2fr,0.9fr,0.9fr]">
        <div>
          <a href={getThomasPathForHostname('thomas-home', hostname)} className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-primary p-1.5 text-white">
              <Home size={24} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                THOMAS
              </span>
              <span className="text-[10px] font-semibold tracking-[0.24em] text-brand-muted">
                CUSTOM HOMES INC.
              </span>
            </div>
          </a>
          <p className="mt-5 max-w-md text-slate-600">
            Custom-home planning for Viera, Cocoa, Melbourne, Rockledge, Suntree, and the broader
            Brevard County market.
          </p>
          <div className="mt-6 space-y-3 text-slate-700">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-brand-accent" />
              <a href={`tel:${THOMAS_PHONE}`} className="hover:text-brand-primary">
                {THOMAS_PHONE_DISPLAY}
              </a>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-1 text-brand-accent" />
              <span>{THOMAS_OFFICE_ADDRESS}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900">Location Pages</h4>
          <ul className="mt-5 space-y-3 text-slate-600">
            {locationLinks.map((page) => (
              <li key={page.id}>
                <a href={getThomasPathForHostname(page.id, hostname)} className="hover:text-brand-primary">
                  {page.h1}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900">Guides</h4>
          <ul className="mt-5 space-y-3 text-slate-600">
            {guideLinks.map((page) => (
              <li key={page.id}>
                <a href={getThomasPathForHostname(page.id, hostname)} className="hover:text-brand-primary">
                  {page.h1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function ThomasCustomHomesPage() {
  const currentPage = getCurrentThomasPage();
  const hostname =
    typeof window === 'undefined' ? 'thomascustom.homes' : window.location.hostname.toLowerCase();
  const isHomePage = currentPage.id === 'thomas-home';

  if (isHomePage) {
    return <ThomasCustomHomesHomepageClassic />;
  }

  return (
    <div className="bg-white font-sans text-slate-900">
      <Navbar hostname={hostname} />
      <main>
        <Hero page={currentPage} hostname={hostname} />
        <SectionRenderer page={currentPage} hostname={hostname} />
        <FinalMoneyCta page={currentPage} hostname={hostname} />
        <RelatedLinks page={currentPage} hostname={hostname} />
        <Testimonials />
        <Contact page={currentPage} />
      </main>
      <Footer hostname={hostname} />
    </div>
  );
}
