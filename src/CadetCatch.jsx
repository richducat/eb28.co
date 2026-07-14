import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

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
        width="36"
        height="36"
        className="h-9 w-9 rounded-[9px] ring-1 ring-white/15"
      />
      <span
        className={`cc-wordmark text-sm font-extrabold uppercase tracking-[0.11em] ${
          light ? 'text-[var(--cc-ivory)]' : 'text-[var(--cc-ink)]'
        }`}
      >
        CadetCatch
      </span>
    </span>
  );
}

function AppStoreButton({ placement, className = '', compact = false, outline = false }) {
  if (compact || outline) {
    return (
      <a
        href={APP_STORE_URL}
        className={`cc-action cc-action-compact ${outline ? 'cc-action-outline' : ''} ${className}`}
        aria-label="Download CadetCatch free on the App Store"
        data-analytics-event="app_store_click"
        data-analytics-label={placement}
      >
        <AppleMark className="h-5 w-5 shrink-0" />
        <span>{compact ? 'Download' : 'Download free'}</span>
      </a>
    );
  }

  return (
    <a
      href={APP_STORE_URL}
      className={`cc-action group ${className}`}
      aria-label="Download CadetCatch free on the App Store"
      data-analytics-event="app_store_click"
      data-analytics-label={placement}
    >
      <AppleMark className="h-7 w-7 shrink-0" />
      <span className="text-left leading-none">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.15em] opacity-60">
          Download free on the
        </span>
        <span className="mt-1 block text-lg font-extrabold tracking-[-0.02em]">App Store</span>
      </span>
      <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
    </a>
  );
}

const GALLERY_MOMENTS = [
  {
    number: '01',
    title: 'The photo drop lands',
    body: 'You open it hoping the face you have been waiting to see is somewhere inside.',
  },
  {
    number: '02',
    title: 'Every group needs a closer look',
    body: 'Similar haircuts and the same uniform turn a quick check into another long search.',
  },
  {
    number: '03',
    title: 'You reach the end still wondering',
    body: 'CadetCatch gives you a shorter place to begin. Your eye still makes the final call.',
  },
];

const WORKFLOW = [
  {
    number: '01',
    title: 'Start with the face you know best',
    body: 'Choose one clear, front-facing photo of your cadet from your iPhone.',
  },
  {
    number: '02',
    title: 'Choose the photo pages you follow',
    body: 'Add or enable the accessible Academy and event galleries you want checked.',
  },
  {
    number: '03',
    title: 'Review every possible match yourself',
    body: 'Keep the photos you recognize and leave the rest. CadetCatch never decides for you.',
  },
];

const SCREENS = [
  {
    src: IMG('find-cadet-photos.png'),
    label: 'Your search home',
    body: 'Keep current and saved photo searches in one calm place.',
    alt: 'CadetCatch home screen on iPhone with photo collections and saved photos',
  },
  {
    src: IMG('start-with-one-photo.png'),
    label: 'One familiar face',
    body: 'Create a private roster from a clear photo you already trust.',
    alt: 'CadetCatch Add Cadet screen asking for one clear profile photo',
  },
  {
    src: IMG('review-photo-finds.png'),
    label: 'Your review',
    body: 'Look through possible matches and save only what you recognize.',
    alt: 'CadetCatch Photos screen with new and saved photo finds',
  },
];

const TRUST_POINTS = [
  {
    title: 'A private roster',
    body: 'You choose the familiar photo CadetCatch uses as a reference.',
  },
  {
    title: 'Only the pages you choose',
    body: 'CadetCatch checks the accessible photo pages you add or enable.',
  },
  {
    title: 'Possible matches, not identity decisions',
    body: 'You inspect every suggestion and decide which photos are really your cadet.',
  },
  {
    title: 'Apple-managed purchases',
    body: 'Apple displays current prices and manages subscription cancellation.',
  },
];

const PRICE_ROWS = [
  {
    label: 'iPhone app',
    title: 'Download and explore CadetCatch',
    price: 'Free',
  },
  {
    label: 'One-time options',
    title: 'Photo Check or Photo Unlock',
    price: '$1.99 each',
  },
  {
    label: 'Ongoing searches',
    title: 'Family Monthly',
    price: '$12.99/mo',
  },
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

function EditorialRows({ items }) {
  return (
    <div className="border-t border-[var(--cc-line-dark)]">
      {items.map(({ number, title, body }) => (
        <article key={number} className="cc-editorial-row grid gap-4 border-b border-[var(--cc-line-dark)] py-7 sm:grid-cols-[72px_0.72fr_1fr] sm:items-start sm:gap-7 sm:py-8">
          <span className="text-xs font-extrabold tracking-[0.16em] text-[var(--cc-gold)]">{number}</span>
          <h3 className="text-xl font-bold tracking-[-0.03em] text-[var(--cc-ink)] sm:text-2xl">{title}</h3>
          <p className="max-w-xl leading-7 text-[var(--cc-muted)]">{body}</p>
        </article>
      ))}
    </div>
  );
}

export default function CadetCatch() {
  return (
    <div className="cadetcatch-site min-h-screen overflow-x-clip pb-20 antialiased md:pb-0">
      <header className="cc-header sticky top-0 z-50 border-b border-white/10">
        <div className="mx-auto flex h-[70px] max-w-[1320px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
          <a
            href={HOME_URL}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cc-gold)]"
            aria-label="CadetCatch home"
          >
            <BrandLockup light />
          </a>

          <nav className="cc-primary-nav hidden items-center gap-8 text-sm font-semibold lg:flex" aria-label="Primary">
            <a className="cc-text-link" href="#for-parents">For parents</a>
            <a className="cc-text-link" href="#how-it-works">How it works</a>
            <a className="cc-text-link" href="#privacy">Privacy</a>
            <a className="cc-text-link" href="#pricing">Pricing</a>
            <a className="cc-text-link" href={SWAB_SUMMER_GUIDE_URL}>Photo guide</a>
          </nav>

          <AppStoreButton placement="header" outline className="shrink-0" />
        </div>
      </header>

      <main>
        <section className="cc-hero text-[var(--cc-ivory)]">
          <div className="mx-auto grid min-h-[calc(100svh-70px)] max-w-[1320px] items-center gap-14 px-5 py-14 sm:px-8 sm:py-18 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20 lg:px-10 lg:py-16">
            <div className="cc-hero-copy relative z-10 max-w-[650px]">
              <p className="cc-kicker cc-reveal cc-reveal-1">
                <span className="h-2 w-2 rounded-full bg-[var(--cc-gold)]" />
                For Coast Guard Academy parents
              </p>
              <h1 className="cc-display cc-reveal cc-reveal-2 mt-7 max-w-[700px] text-[4.35rem] font-semibold leading-[0.87] tracking-[-0.055em] sm:text-[5.8rem] lg:text-[6.65rem]">
                Find the face you know by heart.
              </h1>
              <p className="cc-reveal cc-reveal-3 mt-8 max-w-[590px] text-lg leading-8 text-white/72 sm:text-xl sm:leading-9">
                A new gallery goes up. You scan every row and zoom into every group, looking for one
                familiar face. CadetCatch narrows the photos worth a closer look. You decide which
                ones are really your cadet.
              </p>

              <div className="cc-reveal cc-reveal-4 mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <AppStoreButton placement="hero" className="w-full sm:w-auto" />
                <a className="cc-inline-link" href="#how-it-works">
                  See how it works
                  <span aria-hidden="true">↓</span>
                </a>
              </div>

              <p className="cc-reveal cc-reveal-4 mt-6 max-w-lg text-sm leading-6 text-white/48">
                <span className="sm:hidden">iPhone · Free to download</span>
                <span className="hidden sm:inline">iPhone · Free to download · Possible matches are always reviewed by you</span>
              </p>
            </div>

            <figure className="cc-product-stage cc-reveal cc-reveal-3 mx-auto w-full max-w-[650px]">
              <div className="cc-product-halo" aria-hidden="true" />
              <img
                src={IMG('review-photo-finds.png')}
                alt="CadetCatch iPhone screen for reviewing new and saved photo finds"
                width="400"
                height="869"
                loading="eager"
                className="cc-product-screen"
              />
              <figcaption className="relative mt-6 flex flex-col gap-1 border-t border-white/16 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
                <strong className="font-bold text-[var(--cc-ivory)]">Actual CadetCatch screen</strong>
                <span className="text-white/48">You review every possible match.</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="for-parents" className="scroll-mt-24 bg-[var(--cc-paper)] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto grid max-w-[1220px] gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <div>
              <p className="cc-section-label">The gallery ritual</p>
              <h2 className="cc-display mt-5 text-5xl font-semibold leading-[0.93] tracking-[-0.045em] sm:text-6xl">
                Open. Zoom. Scan every row. Still wonder if you missed them.
              </h2>
              <p className="mt-7 max-w-lg text-lg leading-8 text-[var(--cc-muted)]">
                The haircuts look alike. The uniforms are the same. You reach the last photo with
                the same question you started with.
              </p>
            </div>
            <EditorialRows items={GALLERY_MOMENTS} />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1220px]">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-24">
              <div>
                <p className="cc-section-label">How it works</p>
                <h2 className="cc-display mt-5 text-5xl font-semibold leading-[0.93] tracking-[-0.045em] sm:text-6xl">
                  One familiar photo. A shorter place to start.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-[var(--cc-muted)] lg:justify-self-end">
                CadetCatch does not replace a parent’s eye. It helps that eye begin with the photos
                most worth a closer look.
              </p>
            </div>

            <div className="mt-14 border-t border-[var(--cc-line)]">
              {WORKFLOW.map(({ number, title, body }) => (
                <article key={number} className="grid gap-4 border-b border-[var(--cc-line)] py-8 sm:grid-cols-[80px_0.9fr_1.1fr] sm:items-start sm:gap-8 sm:py-10">
                  <span className="cc-display text-4xl font-semibold text-[var(--cc-gold-deep)]">{number}</span>
                  <h3 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">{title}</h3>
                  <p className="max-w-xl leading-7 text-[var(--cc-muted)]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--cc-night)] px-5 py-20 text-[var(--cc-ivory)] sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1220px]">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
              <div>
                <p className="cc-section-label text-[var(--cc-gold)]">Inside the app</p>
                <h2 className="cc-display mt-5 text-5xl font-semibold leading-[0.93] tracking-[-0.045em] sm:text-6xl">
                  The app stays simple because the decision is yours.
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-8 text-white/58 lg:justify-self-end">
                Set up one familiar face, choose the photo pages you want checked, and keep your
                review in one place.
              </p>
            </div>

            <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-8">
              {SCREENS.map(({ src, label, body, alt }) => (
                <figure key={src} className="cc-screen-figure">
                  <img src={src} alt={alt} width="400" height="869" loading="lazy" className="cc-workflow-screen" />
                  <figcaption className="mt-6 border-t border-white/16 pt-5">
                    <strong className="block text-base font-bold text-[var(--cc-ivory)]">{label}</strong>
                    <span className="mt-2 block text-sm leading-6 text-white/50">{body}</span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-16 flex flex-col items-start gap-4 border-t border-white/16 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-6 text-white/48">Real CadetCatch screens. No mock dashboard and no automatic identity decision.</p>
              <AppStoreButton placement="screens" />
            </div>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-24 bg-[var(--cc-ivory)] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto grid max-w-[1220px] gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
            <div>
              <p className="cc-section-label">Family trust comes first</p>
              <h2 className="cc-display mt-5 text-5xl font-semibold leading-[0.93] tracking-[-0.045em] sm:text-6xl">
                Your family photo stays your family business.
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--cc-muted)]">
                CadetCatch helps you review. It does not decide who anyone is. You choose the pages,
                inspect every suggestion, and keep only what you recognize.
              </p>
              <a className="cc-plain-arrow mt-8" href={PRIVACY_URL}>
                Read the privacy policy <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="border-t border-[var(--cc-line-dark)]">
              {TRUST_POINTS.map(({ title, body }) => (
                <article key={title} className="grid grid-cols-[28px_1fr] gap-4 border-b border-[var(--cc-line-dark)] py-7 sm:py-8">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center bg-[var(--cc-gold)] text-[var(--cc-night)]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold tracking-[-0.02em]">{title}</h3>
                    <p className="mt-2 leading-7 text-[var(--cc-muted)]">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto grid max-w-[1220px] gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
            <div>
              <p className="cc-section-label">App Store pricing</p>
              <h2 className="cc-display mt-5 text-5xl font-semibold leading-[0.93] tracking-[-0.045em] sm:text-6xl">
                Free to download. Clear choices if you want more.
              </h2>
              <p className="mt-7 max-w-lg text-lg leading-8 text-[var(--cc-muted)]">
                Put CadetCatch on your iPhone at no charge. Apple shows the current price before any
                in-app purchase.
              </p>
              <div className="mt-8 hidden lg:block">
                <AppStoreButton placement="pricing" />
              </div>
            </div>

            <div>
              <div className="border-t border-[var(--cc-line)]">
                {PRICE_ROWS.map(({ label, title, price }) => (
                  <article key={label} className="grid gap-3 border-b border-[var(--cc-line)] py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:py-9">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--cc-gold-deep)]">{label}</p>
                      <h3 className="mt-2 text-xl font-bold tracking-[-0.025em] sm:text-2xl">{title}</h3>
                    </div>
                    <p className="cc-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{price}</p>
                  </article>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--cc-muted)]">
                U.S. App Store prices shown as of July 14, 2026. Apple displays the current price
                before purchase and manages subscription cancellation.
              </p>
              <div className="mt-8 lg:hidden">
                <AppStoreButton placement="pricing-mobile" className="w-full sm:w-auto" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--cc-paper)] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1000px]">
            <p className="cc-section-label">Straight answers</p>
            <h2 className="cc-display mt-5 max-w-3xl text-5xl font-semibold leading-[0.93] tracking-[-0.045em] sm:text-6xl">
              What parents should know before downloading.
            </h2>

            <div className="mt-12 border-t border-[var(--cc-line-dark)]">
              {FAQS.map(({ question, answer }) => (
                <details key={question} className="cc-faq group border-b border-[var(--cc-line-dark)]">
                  <summary className="flex min-h-[76px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-bold tracking-[-0.02em] marker:hidden sm:text-xl">
                    {question}
                    <span className="cc-faq-mark shrink-0 text-2xl font-normal text-[var(--cc-gold-deep)]" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-3xl pb-7 pr-10 leading-7 text-[var(--cc-muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--cc-night)] px-5 py-20 text-[var(--cc-ivory)] sm:px-8 sm:py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1040px] text-center">
            <p className="cc-section-label text-[var(--cc-gold)]">Before the next photo drop</p>
            <h2 className="cc-display mx-auto mt-6 max-w-4xl text-6xl font-semibold leading-[0.88] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
              Start with the face you already know.
            </h2>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/58">
              Download CadetCatch free. Add one clear photo. When the next gallery arrives, begin
              with a shorter review.
            </p>
            <div className="mt-9 flex justify-center">
              <AppStoreButton placement="final" className="w-full sm:w-auto" />
            </div>
            <a className="cc-inline-link mx-auto mt-7 w-fit" href={SWAB_SUMMER_GUIDE_URL}>
              Read the free Swab Summer photo guide
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--cc-line)] bg-white px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <a href={HOME_URL} aria-label="CadetCatch home"><BrandLockup /></a>
            <p className="mt-4 text-sm leading-6 text-[var(--cc-muted)]">
              CadetCatch is an independent app and is not affiliated with, endorsed by, or connected
              to the U.S. Coast Guard Academy, the U.S. Coast Guard, or the Department of Homeland Security.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-1 text-sm font-semibold text-[var(--cc-muted)]" aria-label="Footer">
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={SUPPORT_URL}>Support</a>
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={PRIVACY_URL}>Privacy</a>
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={TERMS_URL}>Terms</a>
            <a className="inline-flex min-h-11 items-center hover:text-[var(--cc-ink)]" href={SWAB_SUMMER_GUIDE_URL}>Photo guide</a>
            <a className="inline-flex min-h-11 items-center font-bold text-[var(--cc-gold-deep)] hover:text-[var(--cc-ink)]" href={APP_STORE_URL}>App Store</a>
          </nav>
        </div>
      </footer>

      <div className="cc-mobile-download fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 px-3 pt-3 shadow-[0_-12px_38px_rgba(0,0,0,0.24)] md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <img src={IMG('cadetcatch-icon.png')} alt="" width="42" height="42" className="h-10 w-10 rounded-[9px] ring-1 ring-white/15" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-[var(--cc-ivory)]">CadetCatch</p>
            <p className="truncate text-xs text-white/45">Free on the App Store</p>
          </div>
          <AppStoreButton placement="mobile-sticky" compact />
        </div>
      </div>
    </div>
  );
}
