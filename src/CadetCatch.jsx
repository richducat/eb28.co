import React from 'react';
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  ChevronRight,
  Eye,
  Images,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRoundPlus,
} from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/cadetcatch/id6769565852';
const ON_CADETCATCH_DOMAIN =
  typeof window !== 'undefined' &&
  /(^|\.)cadetcatch\.com$/.test(window.location.hostname.toLowerCase());
const BASE = ON_CADETCATCH_DOMAIN ? '' : '/cc';
const HOME_URL = `${BASE}/`;
const SUPPORT_URL = `${BASE}/support/`;
const PRIVACY_URL = `${BASE}/privacy/`;
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const SWAB_SUMMER_GUIDE_URL = `${BASE}/swab-summer-photos/`;
const IMG = (name) => `${BASE}/img/${name}`;

function AppleMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-.702" />
    </svg>
  );
}

function BrandLockup({ light = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={IMG('cadetcatch-icon.png')}
        alt=""
        width="44"
        height="44"
        className="h-10 w-10 rounded-xl shadow-lg ring-1 ring-white/15"
      />
      <span className={`cc-display text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-[var(--cc-ink)]'}`}>
        CadetCatch
      </span>
    </span>
  );
}

function AppStoreButton({ placement, className = '', compact = false }) {
  if (compact) {
    return (
      <a
        href={APP_STORE_URL}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cc-gold)] px-4 py-2 text-sm font-bold text-[var(--cc-night)] shadow-[0_10px_30px_rgba(249,178,27,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ffc13d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-cyan)] active:translate-y-0 ${className}`}
        aria-label="Download CadetCatch free on the App Store"
        data-analytics-event="app_store_click"
        data-analytics-label={placement}
      >
        <AppleMark className="h-5 w-5" />
        <span>Download free</span>
      </a>
    );
  }

  return (
    <a
      href={APP_STORE_URL}
      className={`group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[var(--cc-gold)] px-5 py-3 text-[var(--cc-night)] shadow-[0_16px_42px_rgba(249,178,27,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffc13d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cc-cyan)] active:translate-y-0 ${className}`}
      aria-label="Download CadetCatch free on the App Store"
      data-analytics-event="app_store_click"
      data-analytics-label={placement}
    >
      <AppleMark className="h-8 w-8 shrink-0" />
      <span className="text-left leading-none">
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
          Download free on the
        </span>
        <span className="cc-display mt-1 block text-xl font-bold tracking-tight">App Store</span>
      </span>
      <ArrowRight
        className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

const PROOF_POINTS = [
  {
    icon: LockKeyhole,
    title: 'Your cadet stays on your private roster',
    body: 'You choose the familiar photo CadetCatch uses as a reference.',
  },
  {
    icon: Search,
    title: 'Check only the galleries you choose',
    body: 'Add or enable the public Academy and event photo pages you already follow.',
  },
  {
    icon: Eye,
    title: 'You make the final call',
    body: 'Possible matches are suggestions. You decide which photos are really your cadet.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    icon: UserRoundPlus,
    step: '01',
    title: 'Start with the face you know best',
    body: 'Choose one clear, front-facing photo of your cadet from your iPhone.',
  },
  {
    icon: Images,
    step: '02',
    title: 'Choose the galleries you follow',
    body: 'Add or enable the accessible Academy and event photo pages you want checked.',
  },
  {
    icon: BookmarkCheck,
    step: '03',
    title: 'Review with a parent’s eye',
    body: 'Look through possible matches yourself and save the photos you recognize.',
  },
];

const SCREENSHOTS = [
  {
    src: IMG('find-cadet-photos.png'),
    label: 'Know where to start',
    title: 'Your cadet search home',
    alt: 'CadetCatch home screen on iPhone with collections, saved photos, and a prompt to add a cadet',
  },
  {
    src: IMG('start-with-one-photo.png'),
    label: 'Use one familiar face',
    title: 'Set up your private roster',
    alt: 'CadetCatch Add Cadet screen prompting for one clear profile photo, name, and unit',
  },
  {
    src: IMG('review-photo-finds.png'),
    label: 'Review at your pace',
    title: 'Keep likely finds together',
    alt: 'CadetCatch Photos screen with New and Saved tabs for reviewing possible photo matches',
  },
];

const TRUST_POINTS = [
  'Your cadet photo stays in a private roster',
  'No ads or cross-app tracking',
  'No automatic identity decision',
  'Purchases and cancellation are managed by Apple',
];

const FAQS = [
  {
    question: 'Does CadetCatch automatically identify my cadet?',
    answer:
      'No. CadetCatch surfaces possible matches from the photo pages you choose. You review every result and decide which photos are actually your cadet.',
  },
  {
    question: 'Which photo pages does CadetCatch search?',
    answer:
      'CadetCatch checks only accessible photo pages you add or enable in the app. It does not search private albums unless you choose to provide an accessible link.',
  },
  {
    question: 'What if I do not see my cadet right away?',
    answer:
      'That can happen. A gallery may not include your cadet, or the photo angle and image quality may not be clear enough for a useful suggestion. CadetCatch gives you a better place to start, but it cannot guarantee a match in every gallery.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'The iPhone app is free to download. Current App Store options include a $1.99 One-Time Photo Check, a $1.99 Unlock One Photo purchase, and Family Monthly at $12.99 per month.',
  },
  {
    question: 'Is CadetCatch affiliated with the Coast Guard Academy?',
    answer:
      'No. CadetCatch is an independent family app and is not affiliated with, endorsed by, or connected to USCGA, the U.S. Coast Guard, or DHS.',
  },
];

export default function CadetCatch() {
  return (
    <div className="cadetcatch-site min-h-screen overflow-x-clip pb-24 antialiased md:pb-0">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061411]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a
            href={HOME_URL}
            className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cc-cyan)]"
            aria-label="CadetCatch home"
          >
            <BrandLockup light />
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/70 lg:flex" aria-label="Primary">
            <a className="transition hover:text-white" href="#for-parents">
              For parents
            </a>
            <a className="transition hover:text-white" href="#privacy">
              Privacy
            </a>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href={SWAB_SUMMER_GUIDE_URL}>
              Swab photo guide
            </a>
          </nav>

          <AppStoreButton placement="header" compact className="shrink-0" />
        </div>
      </header>

      <main>
        <section className="cc-hero-field text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="relative z-10 max-w-2xl">
              <a
                href={SWAB_SUMMER_GUIDE_URL}
                className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--cc-gold)]/35 bg-[var(--cc-gold)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--cc-gold)] transition hover:border-[var(--cc-gold)]/65 hover:bg-[var(--cc-gold)]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-cyan)]"
              >
                Swab Summer 2026 photo guide
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>

              <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-cyan)]">
                For Coast Guard Academy parents
              </p>
              <h1 className="cc-display max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                Find the face you know by heart.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/72 sm:text-xl">
                A new gallery goes up. You zoom into group shots and still wonder if you missed
                them. CadetCatch narrows the photos worth a closer look. You decide which ones are
                really your cadet.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <AppStoreButton placement="hero" className="w-full sm:w-auto" />
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-cyan)]"
                >
                  See the parent workflow
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              <p className="mt-4 text-sm text-white/58">
                iPhone · Free to download · Start with one clear photo
              </p>

              <div className="mt-8 grid gap-3 text-sm text-white/78 sm:grid-cols-3">
                {['Your cadet stays private', 'You choose the galleries', 'You make the final call'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cc-cyan)]/15 text-[var(--cc-cyan)]">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/14 bg-white/[0.065] shadow-[0_36px_90px_rgba(0,0,0,0.42)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={IMG('cadetcatch-icon.png')}
                    alt="CadetCatch app icon"
                    width="48"
                    height="48"
                    className="h-12 w-12 shrink-0 rounded-2xl ring-1 ring-white/15"
                  />
                  <div className="min-w-0">
                    <p className="cc-display truncate font-bold text-white">A new gallery is up</p>
                    <p className="truncate text-xs text-white/58">Start with one familiar face</p>
                  </div>
                </div>
                <span className="hidden shrink-0 rounded-full border border-[var(--cc-cyan)]/35 bg-[var(--cc-cyan)]/10 px-3 py-1.5 text-xs font-bold text-[var(--cc-cyan)] sm:inline-flex">
                  Parent review
                </span>
              </div>

              <div className="grid grid-cols-[0.82fr_1.18fr] items-center gap-4 p-4 sm:gap-7 sm:p-7">
                <figure className="mx-auto w-full max-w-[220px] rounded-[1.7rem] border border-white/18 bg-white p-2 shadow-[0_24px_65px_rgba(0,0,0,0.32)]">
                  <img
                    src={IMG('review-photo-finds.png')}
                    alt="CadetCatch iPhone screen for reviewing new and saved photo finds"
                    width="400"
                    height="869"
                    loading="eager"
                    className="block h-auto w-full rounded-[1.25rem]"
                  />
                </figure>

                <div className="min-w-0 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cc-gold)] sm:text-xs">
                    The moment you want
                  </p>
                  <h2 className="cc-display mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
                    “There you are.”
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
                    CadetCatch shortens the review. You recognize the face.
                  </p>
                  <div className="mt-5 space-y-2.5 text-xs font-semibold text-white/78 sm:text-sm">
                    {['Choose your photo pages', 'Review possible matches', 'Save what you recognize'].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cc-cyan)]/14 text-[var(--cc-cyan)]">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cc-line)] bg-white" aria-label="Product proof">
          <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {PROOF_POINTS.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className={`flex gap-4 py-7 md:px-7 ${index > 0 ? 'border-t border-[var(--cc-line)] md:border-l md:border-t-0' : ''}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--cc-mist)] text-[var(--cc-evergreen)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="cc-display text-base font-bold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--cc-muted)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="for-parents" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-orange)]">
                For the parent checking every photo drop
              </p>
              <h2 className="cc-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                A gallery drops. You start looking for one familiar face.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--cc-muted)]">
                You zoom into group shot after group shot. The haircuts look alike. The uniforms are
                the same. You reach the end and still wonder if you skipped the photo you wanted.
              </p>
              <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-[var(--cc-evergreen)]">
                You know your cadet’s posture, their glasses, and the way they stand in a crowd.
                CadetCatch gets you closer to the photos where that knowledge matters.
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[var(--cc-line)] bg-white shadow-[0_24px_75px_rgba(6,20,17,0.1)]">
              <div className="border-b border-[var(--cc-line)] bg-[var(--cc-mist)] px-6 py-5 sm:px-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cc-orange)]">The familiar routine</p>
                <p className="cc-display mt-2 text-2xl font-bold">Open. Zoom. Scroll. Start over.</p>
              </div>
              <div className="grid gap-0 sm:grid-cols-3">
                {[
                  ['01', 'Open every photo'],
                  ['02', 'Zoom into every group'],
                  ['03', 'Wonder if you missed them'],
                ].map(([step, text], index) => (
                  <div key={step} className={`p-6 sm:p-7 ${index > 0 ? 'border-t border-[var(--cc-line)] sm:border-l sm:border-t-0' : ''}`}>
                    <span className="cc-display text-sm font-bold text-[var(--cc-orange)]">{step}</span>
                    <p className="cc-display mt-3 text-lg font-bold leading-snug">{text}</p>
                  </div>
                ))}
              </div>
              <div className="m-4 rounded-2xl bg-[var(--cc-night)] p-6 text-white sm:m-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cc-gold)]">A shorter review with CadetCatch</p>
                  <p className="cc-display mt-2 text-2xl font-bold">Start with the likely photos.</p>
                  <p className="mt-3 max-w-xl leading-7 text-white/64">You still make the call. You just have a better place to begin.</p>
                </div>
                <Search className="mt-6 h-12 w-12 shrink-0 text-[var(--cc-cyan)] sm:mt-0" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-orange)]">
                  Three simple steps
                </p>
                <h2 className="cc-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                  From “Did I miss them?” to photos worth reviewing.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-[var(--cc-muted)] lg:justify-self-end">
                The app does not replace your eye. It gives your eye a better place to start: one
                familiar face, the galleries you choose, and a shorter list to review.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map(({ icon: Icon, step, title, body }) => (
                <article
                  key={title}
                  className="group rounded-[1.75rem] border border-[var(--cc-line)] bg-white p-7 shadow-[0_18px_60px_rgba(6,20,17,0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(6,20,17,0.12)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cc-night)] text-[var(--cc-gold)]">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="cc-display text-4xl font-extrabold text-[var(--cc-line)]">{step}</span>
                  </div>
                  <h3 className="cc-display mt-7 text-2xl font-bold tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 leading-7 text-[var(--cc-muted)]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--cc-mist)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-orange)]">
                See the parent workflow
              </p>
              <h2 className="cc-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                Start with one photo. Keep the likely finds together.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[var(--cc-muted)]">
                The steps stay clear, even if you have never used a photo-matching app before.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {SCREENSHOTS.map(({ src, label, title, alt }) => (
                <figure key={src} className="text-center">
                  <div className="mx-auto max-w-[310px] rounded-[2.25rem] border border-white bg-white p-3 shadow-[0_24px_70px_rgba(6,20,17,0.14)]">
                    <img
                      src={src}
                      alt={alt}
                      width="400"
                      height="869"
                      loading="lazy"
                      className="w-full rounded-[1.75rem]"
                    />
                  </div>
                  <figcaption className="mt-5">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cc-orange)]">
                      {label}
                    </span>
                    <span className="cc-display mt-1 block text-xl font-bold">{title}</span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center">
              <AppStoreButton placement="screenshots" />
              <p className="mt-3 text-sm text-[var(--cc-muted)]">Available for iPhone · Free download</p>
            </div>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-[var(--cc-night)] text-white shadow-[0_30px_90px_rgba(6,20,17,0.2)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative overflow-hidden border-b border-white/10 p-8 sm:p-12 lg:border-b-0 lg:border-r lg:p-16">
              <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-[var(--cc-cyan)]/10 blur-3xl" />
              <ShieldCheck className="relative h-12 w-12 text-[var(--cc-gold)]" aria-hidden="true" />
              <p className="relative mt-8 text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-cyan)]">
                Family trust comes first
              </p>
              <h2 className="cc-display relative mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                Your family photo stays your family business.
              </h2>
              <p className="relative mt-5 max-w-lg text-lg leading-8 text-white/68">
                CadetCatch helps you review. It does not decide who anyone is. You choose the photo
                pages, inspect every suggestion, and keep only what you recognize.
              </p>
              <a
                href={PRIVACY_URL}
                className="relative mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-cyan)]"
              >
                Read the privacy policy
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid gap-4 p-8 sm:grid-cols-2 sm:p-12 lg:p-16">
              {TRUST_POINTS.map((point, index) => (
                <div key={point} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cc-gold)] text-[var(--cc-night)]">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="cc-display mt-5 text-lg font-bold leading-snug">{point}</p>
                  {index === 2 && (
                    <p className="mt-2 text-sm leading-6 text-white/58">
                      Suggestions help you look faster; they are not final identifications.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-orange)]">
                  Transparent App Store pricing
                </p>
                <h2 className="cc-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                  Start free. Choose only what your family needs.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--cc-muted)]">
                  Put CadetCatch on your iPhone at no charge. If you want a paid search or ongoing
                  access, Apple shows the price before you choose it.
                </p>
                <div className="mt-8 hidden lg:block">
                  <AppStoreButton placement="pricing" />
                </div>
              </div>

              <div className="grid gap-4">
                <article className="rounded-[1.75rem] border border-[var(--cc-line)] bg-[var(--cc-cream)] p-7 sm:flex sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cc-orange)]">Get started</p>
                    <h3 className="cc-display mt-2 text-2xl font-bold">Download the iPhone app</h3>
                    <p className="mt-2 text-[var(--cc-muted)]">Explore the app before choosing an in-app option.</p>
                  </div>
                  <p className="cc-display mt-5 text-4xl font-extrabold sm:mt-0">Free</p>
                </article>

                <article className="rounded-[1.75rem] border border-[var(--cc-line)] bg-[var(--cc-mist)] p-7 sm:flex sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cc-orange)]">One-time options</p>
                    <h3 className="cc-display mt-2 text-2xl font-bold">Photo Check or Photo Unlock</h3>
                    <p className="mt-2 text-[var(--cc-muted)]">Each option is a separate one-time in-app purchase.</p>
                  </div>
                  <p className="cc-display mt-5 whitespace-nowrap text-4xl font-extrabold sm:mt-0">$1.99 <span className="text-base font-semibold">each</span></p>
                </article>

                <article className="relative overflow-hidden rounded-[1.75rem] border-2 border-[var(--cc-gold)] bg-[var(--cc-night)] p-7 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--cc-cyan)]/10 blur-2xl" />
                  <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cc-gold)]">For ongoing searches</p>
                    <h3 className="cc-display mt-2 text-2xl font-bold">Family Monthly</h3>
                    <p className="mt-2 text-white/62">Auto-renewing subscription managed through Apple.</p>
                  </div>
                  <p className="cc-display relative mt-5 whitespace-nowrap text-4xl font-extrabold sm:mt-0">$12.99<span className="text-base font-semibold text-white/58">/mo</span></p>
                </article>

                <div className="mt-2 rounded-2xl border border-[var(--cc-line)] bg-white p-5 text-sm leading-6 text-[var(--cc-muted)]">
                  Prices shown are U.S. App Store prices as of July 14, 2026. Apple displays the
                  current price before any purchase and manages subscription cancellation.
                </div>

                <div className="mt-4 flex justify-center lg:hidden">
                  <AppStoreButton placement="pricing-mobile" className="w-full sm:w-auto" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--cc-orange)]">
                Questions before you download
              </p>
              <h2 className="cc-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                The honest answers.
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map(({ question, answer }) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-[var(--cc-line)] bg-white p-5 open:shadow-[0_16px_50px_rgba(6,20,17,0.08)] sm:p-6"
                >
                  <summary className="cc-display flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold marker:hidden">
                    {question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cc-mist)] text-[var(--cc-evergreen)] transition group-open:rotate-90">
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-3xl pr-10 leading-7 text-[var(--cc-muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="cc-hero-field mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] px-6 py-14 text-center text-white shadow-[0_30px_90px_rgba(6,20,17,0.22)] sm:px-12 sm:py-20">
            <img
              src={IMG('cadetcatch-icon.png')}
              alt=""
              width="72"
              height="72"
              className="mx-auto h-16 w-16 rounded-2xl ring-1 ring-white/15"
            />
            <h2 className="cc-display mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              When the next gallery drops, start with CadetCatch.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/68">
              Add one clear photo now, so your next search starts with a familiar face.
            </p>
            <div className="mt-8 flex justify-center">
              <AppStoreButton placement="final" className="w-full sm:w-auto" />
            </div>
            <a
              href={SWAB_SUMMER_GUIDE_URL}
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--cc-cyan)] underline decoration-[var(--cc-cyan)]/35 underline-offset-4 transition hover:text-white"
            >
              Or read the free Swab Summer photo guide
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--cc-line)] bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <a href={HOME_URL} aria-label="CadetCatch home">
              <BrandLockup />
            </a>
            <p className="mt-4 text-sm leading-6 text-[var(--cc-muted)]">
              CadetCatch is an independent app and is not affiliated with, endorsed by, or
              connected to the U.S. Coast Guard Academy, the U.S. Coast Guard, or the Department
              of Homeland Security.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm font-semibold text-[var(--cc-muted)] sm:flex sm:flex-wrap" aria-label="Footer">
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={SUPPORT_URL}>Support</a>
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={PRIVACY_URL}>Privacy</a>
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={TERMS_URL}>Terms</a>
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={SWAB_SUMMER_GUIDE_URL}>Photo guide</a>
            <a className="inline-flex min-h-11 items-center text-[var(--cc-orange)] hover:text-[var(--cc-ink)]" href={APP_STORE_URL}>App Store</a>
          </nav>
        </div>
      </footer>

      <div className="cc-mobile-download fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-[#061411]/95 px-3 pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <img
            src={IMG('cadetcatch-icon.png')}
            alt=""
            width="44"
            height="44"
            className="h-11 w-11 rounded-xl ring-1 ring-white/15"
          />
          <div className="min-w-0 flex-1">
            <p className="cc-display truncate text-sm font-bold text-white">CadetCatch</p>
            <p className="truncate text-xs text-white/55">Free on the App Store</p>
          </div>
          <AppStoreButton placement="mobile-sticky" compact />
        </div>
      </div>
    </div>
  );
}
