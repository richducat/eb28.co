import React from 'react';

// Shared site header. One brand across every surface: daylight pages pass
// dark={false}; the live dashboard passes dark. CTA is per-page.
const LINKS = [
  { href: '/bluechip/', label: 'Bluechip' },
  { href: '/deskos/', label: 'The Fleet' },
  { href: '/fundmanager/', label: 'Live Tape' },
  { href: '/setup/', label: 'Setup' },
];

export default function SiteNav({ dark = false, active = '', cta = null, subtitle = 'EB28', brand = 'EB28' }) {
  const wrap = dark
    ? 'sticky top-0 z-40 border-b border-white/10 bg-[#020617]/90 backdrop-blur'
    : 'sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur';
  const brandText = dark ? 'text-white' : 'text-slate-900';
  const brandSub = dark ? 'text-white/50' : 'text-slate-500';
  const link = dark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-900';
  const linkActive = dark ? 'text-white font-semibold' : 'text-slate-900 font-semibold';

  return (
    <header className={wrap}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="/bluechip/" className="flex shrink-0 items-center gap-2.5" aria-label="EB28 home">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${dark ? 'bg-white text-[#020617]' : 'bg-slate-900 text-white'}`}>
            $
          </span>
          <span className={`text-lg font-semibold tracking-tight ${brandText}`}>
            {brand} <span className={`font-normal ${brandSub}`}>· {subtitle}</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 sm:flex" aria-label="Site">
          {LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={`text-sm transition-colors ${active === href ? linkActive : link}`}>
              {label}
            </a>
          ))}
        </nav>
        {cta && (
          <a
            href={cta.href}
            target={cta.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
          >
            {cta.label}
          </a>
        )}
      </div>
    </header>
  );
}
