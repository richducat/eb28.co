import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Tag,
} from 'lucide-react';

const appStoreUrl = 'https://apps.apple.com/us/app/weed-authority/id1252265730';

const states = [
  ['California', 'Daily adult-use limits plus medical recommendation support'],
  ['Florida', 'MMUR portal links and route-aware patient tracking'],
  ['Arizona', '14-day medical window planning'],
  ['New York', 'OCM and MCDMS source links'],
  ['Pennsylvania', 'Medical registry and patient card support'],
  ['Ohio', 'Registry-first days-supply guidance'],
];

const surfaces = [
  {
    icon: MapPinned,
    title: 'Find legal retailers',
    copy: 'Search nearby cannabis retailers with Apple Maps, save places, and verify the state source before ordering.',
  },
  {
    icon: ShieldCheck,
    title: 'Check your rec',
    copy: 'Keep card details local, open official state portals, and track your private receipt ledger in one place.',
  },
  {
    icon: Tag,
    title: 'Compare products',
    copy: 'Filter by form, effects, cannabinoids, terpene notes, price, retailer, and medical-only requirements.',
  },
  {
    icon: BookOpen,
    title: 'Know the rules',
    copy: 'State-by-state source links keep the app grounded in official regulators, not rumor or screenshots.',
  },
];

const WeedAuthorityPage = () => {
  const { scrollYProgress } = useScroll();
  const heroShift = useTransform(scrollYProgress, [0, 0.35], [0, -90]);
  const heroFade = useTransform(scrollYProgress, [0, 0.34], [1, 0.35]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050706] text-[#eef4eb]">
      <section className="relative min-h-[94svh] overflow-hidden">
        <motion.img
          src="/weedauthority/weedauthority-hero.png"
          alt="Weed Authority app interface"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ y: heroShift, opacity: heroFade }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,6,0.96),rgba(5,7,6,0.70)_44%,rgba(5,7,6,0.22))]" />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <a href="/weedauthority/" className="flex items-center gap-3" aria-label="Weed Authority home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#63f8ab] text-[#050706] shadow-[0_0_38px_rgba(99,248,171,0.36)]">
              <ShieldCheck size={24} strokeWidth={3} />
            </span>
            <span className="text-sm font-black tracking-[0.18em]">WEED AUTHORITY</span>
          </a>
          <a
            href="#download"
            className="rounded-full bg-[#63f8ab] px-5 py-3 text-sm font-black text-[#050706] transition hover:bg-[#e7b35c]"
          >
            Get the app
          </a>
        </div>

        <div className="relative z-10 flex min-h-[94svh] items-center px-5 pb-16 pt-28 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[720px]"
          >
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#63f8ab]">
              <BadgeCheck size={15} /> Legal cannabis, checked first
            </p>
            <h1 className="max-w-[680px] text-[clamp(3.2rem,8vw,7.7rem)] font-black leading-[0.88] tracking-normal">
              WEED AUTHORITY
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#b6c6b2] sm:text-xl">
              A premium iPhone app for finding legal retailers, checking official medical rec portals, tracking allotment privately, and shopping smarter before checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3" id="download">
              <a
                href={appStoreUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#63f8ab] px-6 py-4 text-sm font-black text-[#050706] transition hover:bg-[#e7b35c]"
              >
                App Store <ExternalLink size={17} />
              </a>
              <a
                href="/weedauthority/support/"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.07] px-6 py-4 text-sm font-bold text-white transition hover:border-[#63f8ab]/70"
              >
                Support
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex max-w-3xl flex-col gap-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e7b35c]">Native iOS first</p>
            <h2 className="text-4xl font-black tracking-normal sm:text-6xl">Built around the cannabis checkout.</h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 md:grid-cols-2">
            {surfaces.map((surface, index) => {
              const Icon = surface.icon;
              return (
                <motion.article
                  key={surface.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  className="bg-[#0b110e] p-7 sm:p-9"
                >
                  <Icon className="mb-8 text-[#63f8ab]" size={34} />
                  <h3 className="text-2xl font-black">{surface.title}</h3>
                  <p className="mt-4 max-w-md leading-7 text-[#aebead]">{surface.copy}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b110e] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#63f8ab]">Medical rec ready</p>
            <h2 className="mt-4 text-4xl font-black tracking-normal sm:text-6xl">Official source first. Private ledger second.</h2>
            <p className="mt-6 text-lg leading-8 text-[#aebead]">
              Weed Authority does not scrape state registries or pretend to be the government. It opens official portals, keeps your rec profile local, and gives you a clean receipt ledger for planning.
            </p>
          </div>
          <div className="grid gap-3">
            {states.map(([state, detail]) => (
              <div key={state} className="flex items-center gap-4 border-b border-white/10 py-4">
                <CheckCircle2 className="shrink-0 text-[#63f8ab]" size={22} />
                <div>
                  <p className="font-black">{state}</p>
                  <p className="mt-1 text-sm leading-6 text-[#aebead]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,#101a14,#161006)] p-8 sm:p-12"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Sparkles className="mb-7 text-[#e7b35c]" size={32} />
                <h2 className="text-4xl font-black tracking-normal sm:text-6xl">Launch-ready pages. Local-first privacy.</h2>
                <p className="mt-5 text-lg leading-8 text-[#aebead]">
                  Support, privacy, terms, and App Store metadata are built for a regulated cannabis category with no ads, no tracking, and no required account.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a className="rounded-full bg-[#63f8ab] px-6 py-4 text-sm font-black text-[#050706]" href="/weedauthority/privacy/">
                  Privacy
                </a>
                <a className="rounded-full border border-white/14 px-6 py-4 text-sm font-bold text-white" href="/weedauthority/terms/">
                  Terms
                </a>
              </div>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm font-bold text-[#aebead]">
              <LockKeyhole size={18} className="text-[#63f8ab]" />
              Rec profile and purchase ledger stay on the device unless the customer chooses an official state portal.
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default WeedAuthorityPage;
