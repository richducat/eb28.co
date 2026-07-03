import React from 'react';
import {
  BookmarkCheck,
  Check,
  ChevronRight,
  Search,
  ShieldCheck,
  Sun,
  UserRoundPlus,
} from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/cadetcatch/id6769565852';
const SUPPORT_URL = '/cc/support/';
const PRIVACY_URL = '/cc/privacy/';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const SWAB_SUMMER_GUIDE_URL = '/cc/swab-summer-photos/';
const DESKTOP_URL = '/cc/desktop/';

function AppStoreBadge({ className = '' }) {
  return (
    <a
      href={APP_STORE_URL}
      className={`inline-flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      aria-label="Download CadetCatch on the App Store"
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" aria-hidden="true">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-.702" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-300">
          Download on the
        </span>
        <span className="block text-xl font-semibold tracking-tight">App Store</span>
      </span>
    </a>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    icon: UserRoundPlus,
    step: 'Step 1',
    title: 'Add a clear photo of your cadet',
    body: 'Create a private roster on your iPhone and add one clear photo of your cadet. That photo becomes the reference for your searches.',
  },
  {
    icon: Search,
    step: 'Step 2',
    title: 'Search event photos',
    body: 'When new event galleries are posted, run a search instead of paging through every photo by hand. CadetCatch shows possible matches for you to review.',
  },
  {
    icon: BookmarkCheck,
    step: 'Step 3',
    title: 'Review and save likely matches',
    body: 'Look through the likely finds yourself, save the keepers to your iPhone Photos library, and keep simple notes so you remember the moment.',
  },
];

const SCREENSHOTS = [
  {
    src: '/cc/img/find-cadet-photos.png',
    alt: 'CadetCatch home screen on iPhone showing photo collections, saved photos, and a prompt to add a cadet',
    caption: 'Start photo searches from Home once your cadet is on your roster.',
  },
  {
    src: '/cc/img/start-with-one-photo.png',
    alt: 'CadetCatch Add Cadet screen prompting for one clear profile photo, name, and unit',
    caption: 'One clear photo of your cadet is all it takes to get started.',
  },
  {
    src: '/cc/img/review-photo-finds.png',
    alt: 'CadetCatch Photos screen with New and Saved tabs for reviewing possible photo matches',
    caption: 'Review new finds and keep the ones you love organized.',
  },
];

const PRIVACY_POINTS = [
  {
    title: 'You choose the reference photo',
    body: 'Your cadet’s reference photo is used to run your search — and you decide which photo that is.',
  },
  {
    title: 'Matches are suggestions, not verdicts',
    body: 'CadetCatch shows possible matches for you to review. You look at every match yourself before saving anything.',
  },
  {
    title: 'No public roster',
    body: 'Your roster is private to your account. It is never shown publicly or to other families.',
  },
  {
    title: 'Cancel anytime',
    body: 'The subscription is managed by Apple. Cancel anytime in your Apple subscription settings — no phone calls, no hoops.',
  },
];

const PRICING_FEATURES = [
  'Free to download — see the app before you subscribe',
  'Private cadet roster on your iPhone',
  'Search event photos and review possible matches',
  'Save photos to your iPhone Photos library',
  'Keep simple notes on the photos you find',
  'Two email invites included: one spouse or family member, one cadet',
];

export default function CadetCatch() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/cc/" className="flex items-center gap-2.5" aria-label="CadetCatch home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              CC
            </span>
            <span className="text-lg font-semibold tracking-tight">CadetCatch</span>
          </a>
          <a
            href={APP_STORE_URL}
            className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
          >
            Get the app
          </a>
        </div>
      </header>

      {/* Swab Summer banner */}
      <a
        href={SWAB_SUMMER_GUIDE_URL}
        className="block bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200"
      >
        <Sun className="mr-1.5 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
        Swab Summer 2026 is underway — read our guide to finding your swab’s photos
        <ChevronRight className="ml-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
      </a>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
              For Coast Guard Academy families
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Find cadet photos faster
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              CadetCatch helps Coast Guard Academy families keep up with cadet photos without
              digging through every gallery by hand.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <AppStoreBadge />
              <p className="text-sm text-slate-500">
                Free to download · Family Monthly subscription $12.99/month, auto-renewing
              </p>
            </div>
            <p className="mt-6 max-w-xl text-xs leading-relaxed text-slate-400">
              CadetCatch is an independent app and is not affiliated with, endorsed by, or
              connected to the U.S. Coast Guard Academy, the U.S. Coast Guard, or the Department
              of Homeland Security.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/cc/img/find-cadet-photos.png"
              alt="CadetCatch app home screen on an iPhone"
              width="400"
              height="869"
              loading="eager"
              className="w-64 rounded-3xl shadow-xl ring-1 ring-slate-200 sm:w-80"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Three simple steps. You stay in control of every one of them.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map(({ icon: Icon, step, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <Icon className="h-6 w-6 text-orange-700" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  {step}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">A look inside the app</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Designed to be simple enough to use one-handed from the parking lot at drop-off.
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {SCREENSHOTS.map(({ src, alt, caption }) => (
              <figure key={src} className="flex flex-col items-center">
                <img
                  src={src}
                  alt={alt}
                  width="400"
                  height="869"
                  loading="lazy"
                  className="w-56 rounded-2xl shadow-lg ring-1 ring-slate-200"
                />
                <figcaption className="mt-4 max-w-xs text-center text-sm text-slate-600">
                  {caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-y border-slate-200 bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-orange-400" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Built for skeptical military families
            </h2>
            <p className="mt-3 text-slate-300">
              No hype, no fine-print surprises. Here is exactly how CadetCatch treats your family
              and your photos.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PRIVACY_POINTS.map(({ title, body }) => (
              <div key={title} className="rounded-2xl bg-slate-800 p-6">
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-400">
            Read the full details in our{' '}
            <a href={PRIVACY_URL} className="font-medium text-orange-400 underline hover:text-orange-300">
              privacy policy
            </a>
            .
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            One plan for the whole family. No tiers to decode, no surprise upsells.
          </p>
          <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Family Monthly</h3>
              <p>
                <span className="text-4xl font-bold tracking-tight">$12.99</span>
                <span className="text-sm text-slate-500">/month</span>
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Auto-renewing subscription, billed through Apple. Cancel anytime in your Apple
              subscription settings.
            </p>
            <ul className="mt-6 space-y-3">
              {PRICING_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Optional add-on:{' '}
              <a href={DESKTOP_URL} className="font-medium text-orange-700 underline hover:text-orange-800">
                desktop access
              </a>{' '}
              for $7.99, if you prefer reviewing photos on a bigger screen.
            </div>
            <div className="mt-8 flex justify-center">
              <AppStoreBadge />
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              By subscribing you agree to Apple’s{' '}
              <a href={TERMS_URL} className="underline hover:text-slate-600">
                standard End User License Agreement
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Swab Summer callout */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-blue-950 p-8 text-white sm:p-12">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Swab Summer 2026
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Following the Class of 2030 this summer?
              </h2>
              <p className="mt-4 leading-relaxed text-blue-100">
                Day One was June 29, and new event galleries will keep coming through mid-August
                — then Family Weekend lands September 25–27. We put together a plain-English
                guide to where photos get posted and how to keep up without refreshing galleries
                all day.
              </p>
              <a
                href={SWAB_SUMMER_GUIDE_URL}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-blue-950 transition-colors hover:bg-amber-300"
              >
                Read the Swab Summer photo guide
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  CC
                </span>
                <span className="font-semibold">CadetCatch</span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                CadetCatch is an independent app and is not affiliated with, endorsed by, or
                connected to the U.S. Coast Guard Academy, the U.S. Coast Guard, or the
                Department of Homeland Security.
              </p>
            </div>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
              <a href={SUPPORT_URL} className="text-slate-600 hover:text-slate-900">
                Support
              </a>
              <a href={PRIVACY_URL} className="text-slate-600 hover:text-slate-900">
                Privacy
              </a>
              <a href={TERMS_URL} className="text-slate-600 hover:text-slate-900">
                Terms (Apple standard EULA)
              </a>
              <a href={APP_STORE_URL} className="text-slate-600 hover:text-slate-900">
                Download on the App Store
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
