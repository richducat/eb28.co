#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(repoRoot, 'scripts', 'data', '32940-premium-prospects.json');
const outRoot = path.join(repoRoot, 'public', '32940', 'proposals');
const sourceAssets = path.join(repoRoot, 'scripts', 'assets', '32940-premium');
const reviewBase = '/content-factory/';

function html(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function attr(value = '') { return html(value); }

function icon(name) {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.92z"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.arrow}</svg>`;
}

function pageUrl(prospect, page) {
  return `/32940/proposals/${prospect.slug}/${page.slug ? `${page.slug}/` : ''}`;
}

function picture(prospect, eager = false) {
  if (!prospect.heroImage) return '';
  const base = `/32940/proposals/assets/${prospect.heroImage}`;
  return `<picture class="hero-picture" style="background-image:url('${base}-960.jpg')">
    <source type="image/avif" srcset="${base}-640.avif 640w, ${base}-960.avif 960w, ${base}-1440.avif 1440w" sizes="(max-width: 760px) calc(100vw - 28px), (max-width: 1100px) 760px, 52vw" />
    <source type="image/webp" srcset="${base}-640.webp 640w, ${base}-960.webp 960w, ${base}-1440.webp 1440w" sizes="(max-width: 760px) calc(100vw - 28px), (max-width: 1100px) 760px, 52vw" />
    <img src="${base}-1440.jpg" width="1440" height="1100" alt="${attr(prospect.heroImageAlt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />
    <span class="photo-credit">Photo: ${html(prospect.heroCredit)}</span>
  </picture>`;
}

function heroVisual(prospect, page, pageIndex) {
  if (prospect.siteKey === 'martin') {
    return `<div class="hero-visual" aria-label="Service request routing preview">
      <div class="triage-visual"><div class="triage-heading"><small>Start with the problem</small><strong>Choose the clearest service route.</strong></div><div class="triage-options"><span><b>01</b>Pest activity</span><span><b>02</b>Termite concern</span><span><b>03</b>Rodent signs</span><span><b>04</b>Bed bug concern</span></div><div class="triage-footer"><span>Next step</span><strong>The service team confirms the right response.</strong></div></div>
      <div class="visual-card"><small>Owner-review structure</small><strong>${pageIndex === 0 ? 'Four needs. Four clear routes.' : html(page.label)}</strong><p>Every public claim and service route is confirmed before production launch.</p></div>
    </div>`;
  }

  if (pageIndex > 0) {
    return `<div class="hero-visual"><div class="page-index" data-number="0${pageIndex + 1}"><span>${html(prospect.name)}</span><div><strong>${html(page.label)}</strong><p>${html(page.intro)}</p></div></div></div>`;
  }

  const card = prospect.siteKey === 'suntree'
    ? ['New-client clarity', 'Records, preparation and appointment-request expectations in one calm path.']
    : prospect.siteKey === 'rubio'
      ? ['Appointment request', 'A request is never presented as a confirmed appointment or emergency channel.']
      : prospect.siteKey === 'pool365'
        ? ['Clear estimate path', 'Describe the pool, share useful equipment context and let the service team confirm the next step.']
        : ['Viera coverage index', 'Pest, termite, rodent, wildlife and WDO routes without the fixed legacy maze.'];
  return `<div class="hero-visual">${picture(prospect, true)}<div class="visual-card"><small>Premium concept</small><strong>${html(card[0])}</strong><p>${html(card[1])}</p></div></div>`;
}

function serviceDescription(prospect, item) {
  const value = item.toLowerCase();
  const matchers = [
    [/bed bug/, 'Explains what details help the service team prepare, without promising a diagnosis or treatment outcome online.'],
    [/termite/, 'Separates termite questions from general pest requests and gives inspection or education its own next step.'],
    [/wdo/, 'Keeps inspection-report language tied to verified qualifications, scope and owner-approved guidance.'],
    [/rodent/, 'Organizes signs, property context and access questions before the service team recommends a response.'],
    [/wildlife/, 'Routes wildlife concerns separately so published methods, availability and boundaries stay accurate.'],
    [/pest/, 'Gives common pest requests a direct route while leaving diagnosis, timing and treatment recommendations to the business.'],
    [/wellness|preventive/, 'Creates a calm overview of routine care and visit preparation using only clinic-approved information.'],
    [/dental/, 'Makes dental information easier to find while keeping procedure details and recommendations under clinic review.'],
    [/surgery|procedure/, 'Provides a place for owner-approved preparation and follow-up information without making medical promises.'],
    [/technician/, 'Explains the clinic’s confirmed technician-supported services after the owner approves the exact scope.'],
    [/urgent|emergency/, 'States clearly what the website can and cannot do, without implying emergency coverage or availability.'],
    [/new.client|new.patient|first.visit|records/, 'Puts records, preparation and appointment expectations into one practical first-visit checklist.'],
    [/appointment|visit reason|clinic confirmation|hospital confirmation/, 'Collects useful request context while making clear that the clinic must confirm every appointment.'],
    [/team|facility|hospital story|care philosophy/, 'Reserves space for real biographies, credentials and approved photography instead of invented proof.'],
    [/location|arrival|parking/, 'Reduces arrival uncertainty with an owner-verified address, access notes and contact path.'],
    [/bilingual|spanish/, 'Adds a second language only after the owner confirms the service and approves a reviewed translation.'],
    [/weekly|cleaning routine|water balance|service notes/, 'Shows the owner-approved maintenance scope and communication process without inventing package details.'],
    [/pump|plumbing/, 'Helps customers describe the symptom and equipment context before a repair recommendation is made.'],
    [/heater|heating|chiller|chlorination/, 'Keeps equipment categories distinct so the right service request reaches the right follow-up path.'],
    [/automation/, 'Creates a focused route for automation questions, upgrades and troubleshooting context.'],
    [/inspection/, 'Explains what an inspection request needs while leaving findings and recommendations to the licensed team.'],
    [/repair/, 'Starts with the pool symptom, equipment and property context instead of an unsupported online diagnosis.'],
    [/pricing/, 'Keeps the structure ready for owner-approved rates and terms without publishing placeholder prices.'],
    [/estimate|service address|pool need|property|preferred follow.up/, 'Collects only the context needed for a useful business follow-up after routing and consent are verified.'],
    [/residential|commercial/, 'Separates customer types and service expectations using only published, owner-confirmed coverage.'],
    [/merritt island|rockledge|suntree|viera|melbourne|brevard|service.area/, 'Connects local customers to verified coverage without creating thin or repetitive location pages.'],
  ];
  return matchers.find(([pattern]) => pattern.test(value))?.[1]
    || `Explains ${item.toLowerCase()} in plain language and gives the customer one useful next step without unsupported promises.`;
}

function serviceCards(prospect, page, pageIndex) {
  const items = page.cards?.length ? page.cards : prospect.services.slice(0, 6);
  const destinationPages = prospect.pages.filter((entry) => entry.slug);
  return items.map((item, index) => {
    const destination = pageIndex === 0 ? destinationPages[index % destinationPages.length] : null;
    return `<article><span>${String(index + 1).padStart(2, '0')}</span><h3>${html(item)}</h3><p>${html(serviceDescription(prospect, item))}</p>${destination ? `<a href="${attr(pageUrl(prospect, destination))}">Explore this path ${icon('arrow')}</a>` : ''}</article>`;
  }).join('');
}

function coverageContent(prospect) {
  const content = {
    martin: ['Brevard coverage, stated plainly.', 'Customers see the published areas first. Exact property availability and timing still come from the service team.'],
    suntree: ['Local clinic context without guesswork.', 'The production site can make location and appointment information easy to find after the clinic verifies every detail.'],
    rubio: ['Location confidence before the request.', 'Address, arrival and service-area details remain launch-gated until the hospital approves them.'],
    pool365: ['Know whether service reaches the pool.', 'The site can show confirmed coverage clearly before asking a customer to complete an estimate request.'],
    beachside: ['Viera first, with Brevard context.', 'Published coverage stays useful and concise while street-level availability remains with the service team.'],
  }[prospect.siteKey];
  return { title: content[0], copy: content[1] };
}

function coveragePanel(prospect) {
  return `<div class="coverage-panel"><div class="coverage-head"><span>Owner-review coverage</span><b>${prospect.areas.length} published areas</b></div><div class="coverage-primary"><small>Primary service context</small><strong>${html(prospect.areas[0])}</strong></div><div class="coverage-list">${prospect.areas.map((area, index) => `<div><i>${String(index + 1).padStart(2, '0')}</i><span>${html(area)}</span><b>Verify at launch</b></div>`).join('')}</div><p>Final street-level availability, hours and response timing are confirmed by the business before this becomes a customer-facing site.</p></div>`;
}

function processCopy(prospect) {
  if (prospect.vertical === 'veterinary') return [
    ['Confirm clinic facts', 'Services, availability, staff credentials and urgent-care boundaries stay under item-level owner approval.'],
    ['Request the right visit', 'The customer gives useful context without treating a web form as medical advice or a confirmed appointment.'],
    ['Clinic follows up', 'Verified routing and clinic confirmation complete the process after production activation.'],
  ];
  if (prospect.vertical === 'pool_service') return [
    ['Choose the pool need', 'Cleaning, equipment, repair and inspection requests are separated before intake.'],
    ['Share useful context', 'The production request asks for the property, symptoms and preferred response.'],
    ['Team confirms service', 'Pricing, timing and availability remain with the business—not an automated promise.'],
  ];
  return [
    ['Describe what you see', 'The site organizes the problem without pretending to diagnose the property remotely.'],
    ['Select the service path', 'Pest, termite, rodent, wildlife and inspection needs stay clearly separated.'],
    ['Business confirms next step', 'The production team owns timing, pricing, availability and service recommendations.'],
  ];
}

function sectionCopy(prospect) {
  return {
    martin: {
      serviceTitle: 'Pest, termite, rodent and inspection needs stay separate.',
      processEyebrow: 'From first sign to confirmed service plan',
      processTitle: 'A direct path without an online diagnosis.',
      processText: 'Homeowners can describe what they are seeing and reach the right service conversation. Martin Pest Control still owns diagnosis, recommendations, timing and pricing.',
    },
    suntree: {
      serviceTitle: 'Care information organized around the questions pet owners ask.',
      processEyebrow: 'A calmer route to a confirmed visit',
      processTitle: 'Prepare the owner. Protect the clinical boundary.',
      processText: 'The website can clarify records, visit preparation and appointment requests. The clinic remains responsible for medical guidance, urgency and confirmation.',
    },
    rubio: {
      serviceTitle: 'Routine, new-patient and urgent questions do not compete.',
      processEyebrow: 'Clear next steps for pet owners',
      processTitle: 'Useful guidance without implying availability.',
      processText: 'The site separates appointment requests, first-visit information and urgent-care boundaries. Rubio Pet Hospital retains every clinical decision and confirmation.',
    },
    pool365: {
      serviceTitle: 'Cleaning, repairs and equipment issues get separate paths.',
      processEyebrow: 'From pool symptom to service follow-up',
      processTitle: 'Give the team useful context before the estimate.',
      processText: 'Customers can identify the pool need and share equipment or property context. The 365 Pool Service team still confirms scope, availability and pricing.',
    },
    beachside: {
      serviceTitle: 'Pest, termite, wildlife and inspection needs stay easy to scan.',
      processEyebrow: 'From property concern to confirmed service path',
      processTitle: 'Route specialized requests without blurring the services.',
      processText: 'The website organizes pest, termite, rodent, wildlife and WDO requests. Beachside still owns inspection findings, recommendations, timing and pricing.',
    },
  }[prospect.siteKey];
}

function faqItems(prospect) {
  if (prospect.vertical === 'veterinary') return [
    ['Can this site confirm an appointment?', 'No. The production site can submit a request to a verified clinic inbox, but the clinic must confirm every appointment.'],
    ['Does the website provide urgent medical advice?', 'No. Owner-approved urgent guidance will explain the correct contact boundary without diagnosing or promising availability.'],
    ['Why is every veterinary content item approved separately?', 'Clinical and service details can be sensitive. Item-level approval keeps the clinic in control indefinitely.'],
    ['Will Spanish content be included?', prospect.siteKey === 'rubio' ? 'Only if the owner confirms the service and approves a professionally reviewed translation.' : 'Only owner-requested and approved languages are added to production.'],
  ];
  return [
    ['Can I request service from this concept?', 'No. Customer calls, forms and appointment actions are intentionally disabled until the owner approves the site and routing is verified.'],
    ['Are the prices and offers current?', 'No price or promotion is shown unless the owner confirms it for launch.'],
    ['What happens after owner approval?', 'EB28 stages the approved version privately, verifies contact routing, prepares redirects and publishes only after the domain and launch checklist are ready.'],
    ['Who owns the finished website?', 'The customer keeps the domain, customer data and approved content. ChatbotBuilder retains its reusable software and templates; a static export and domain handoff are available on cancellation.'],
  ];
}

function requestBlock(prospect) {
  return `<div class="request-grid">
    <form class="disabled-form" aria-label="Disabled owner-review form">
      <label>Name<input disabled value="Enabled after owner approval" /></label>
      <label>${prospect.vertical === 'veterinary' ? 'Visit reason' : prospect.vertical === 'pool_service' ? 'Pool need' : 'Service need'}<textarea disabled>Customer-facing intake is disabled on this unofficial concept.</textarea></label>
      <button type="button" disabled>Submission disabled during owner review</button>
    </form>
    <aside class="launch-gate"><h3>Production activation gate</h3><p>EB28 enables real contact actions only after the owner approves the exact site version and the destination inbox or phone is tested.</p><ul><li>Verified phone and inbox ownership</li><li>Approved privacy, consent and confirmation language</li><li>Zero test messages routed to a live customer workflow</li><li>Rollback package captured before DNS changes</li></ul></aside>
  </div>`;
}

function analyticsScript(prospect, page) {
  return `<script>
  (function(){
    window.dataLayer=window.dataLayer||[];
    function event(name,detail){var payload=Object.assign({event:name,prospect_slug:${JSON.stringify(prospect.slug)},concept_page:${JSON.stringify(page.slug || 'home')}},detail||{});window.dataLayer.push(payload);if(typeof window.gtag==='function')window.gtag('event',name,payload)}
    fetch('/analytics-config.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(cfg){var id=cfg&&String(cfg.ga4MeasurementId||'').trim();if(!id)return;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.appendChild(s);window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',id)}).catch(function(){});
    event('redesign_opened',{source:'premium_proposal'});
    document.querySelectorAll('[data-owner-review]').forEach(function(link){link.addEventListener('click',function(){event('application_started',{source:'premium_redesign',plan:'pilot_growth'})})});
    var toggle=document.querySelector('.nav-toggle');var nav=document.querySelector('.site-nav');if(toggle&&nav){toggle.addEventListener('click',function(){var open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))})}
  })();
  </script>`;
}

function renderPage(prospect, page, pageIndex) {
  const url = pageUrl(prospect, page);
  const reviewUrl = `${reviewBase}?prospect=${encodeURIComponent(prospect.slug)}#pilot`;
  const title = `${page.label} concept for ${prospect.name} | EB28 owner review`;
  const description = `${page.title} Unofficial five-page premium website concept prepared by EB28 for owner review.`;
  const isRequestPage = /appointment|request|estimate/i.test(`${page.slug} ${page.label}`);
  const nav = prospect.pages.map((entry) => `<a href="${attr(pageUrl(prospect, entry))}"${entry.slug === page.slug ? ' aria-current="page"' : ''}>${html(entry.label)}</a>`).join('');
  const processes = processCopy(prospect).map(([heading, copy], index) => `<article><b>${index + 1}</b><h3>${html(heading)}</h3><p>${html(copy)}</p></article>`).join('');
  const faqs = faqItems(prospect).map(([question, answer], index) => `<details${index === 0 ? ' open' : ''}><summary>${html(question)}</summary><p>${html(answer)}</p></details>`).join('');
  const coverage = coverageContent(prospect);
  const sections = sectionCopy(prospect);
  const imagePreload = prospect.heroImage && pageIndex === 0 ? `<link rel="preload" as="image" href="/32940/proposals/assets/${prospect.heroImage}-960.avif" type="image/avif" fetchpriority="high" />` : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>${html(title)}</title>
  <meta name="description" content="${attr(description)}" />
  <link rel="canonical" href="https://eb28.co${attr(url)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
${imagePreload ? `  ${imagePreload}\n` : ''}  <link rel="stylesheet" href="/32940/proposals/assets/concept.css" />
</head>
<body data-site="${attr(prospect.siteKey)}">
  <div class="concept-banner">${icon('lock')} Unofficial owner-review concept · Not the official ${html(prospect.name)} website · Customer calls and submissions disabled</div>
  <header class="site-header">
    <div class="shell">
      <a class="brand" href="${attr(pageUrl(prospect, prospect.pages[0]))}"><span class="brand-mark">${html(prospect.monogram)}</span><span class="brand-copy"><strong>${html(prospect.name)}</strong><small>${html(prospect.category)}</small></span></a>
      <nav class="site-nav" aria-label="Concept site navigation">${nav}<a class="review-link" data-owner-review href="${attr(reviewUrl)}">Owner review ${icon('arrow')}</a></nav>
      <a class="review-link" data-owner-review href="${attr(reviewUrl)}">Review with EB28 ${icon('arrow')}</a>
      <button class="nav-toggle" type="button" aria-label="Open site navigation" aria-expanded="false">${icon('menu')}</button>
    </div>
  </header>
  <main>
    <section class="hero${pageIndex > 0 ? ' page-hero' : ''}">
      <div class="shell">
        <div class="hero-copy"><p class="eyebrow">${html(page.eyebrow)}</p><h1>${html(page.title)}</h1><p>${html(page.intro || prospect.hero.copy)}</p><div class="hero-actions"><a class="primary-link" data-owner-review href="${attr(reviewUrl)}">Open the owner review ${icon('arrow')}</a><span class="disabled-action" aria-disabled="true">${icon('phone')} ${html(prospect.phone)} · disabled</span></div><p class="source-note">${html(prospect.hero.note)} Source check: ${html(prospect.sourceStatus)}.</p></div>
        ${heroVisual(prospect, page, pageIndex)}
      </div>
    </section>
    <section class="proof-rail" aria-label="Verified concept inputs"><div class="shell"><div class="proof-label">Source-backed inputs</div>${prospect.proof.map((item) => `<div class="proof-item"><strong>${html(item)}</strong><span>Owner approval required</span></div>`).join('')}</div></section>
    <section class="section surface"><div class="shell"><div class="section-heading"><p class="eyebrow">${pageIndex === 0 ? 'Service index' : `Inside ${html(page.label)}`}</p><h2>${pageIndex === 0 ? html(sections.serviceTitle) : `${html(page.label)} with a clear purpose and next step.`}</h2><p>${html(page.intro)}</p></div><div class="service-index">${serviceCards(prospect, page, pageIndex)}</div>${isRequestPage ? requestBlock(prospect) : ''}</div></section>
    <section class="section deep"><div class="shell"><div class="section-heading"><p class="eyebrow">${html(sections.processEyebrow)}</p><h2>${html(sections.processTitle)}</h2><p>${html(sections.processText)}</p></div><div class="process-grid">${processes}</div></div></section>
    <section class="section"><div class="shell"><div class="area-grid">${coveragePanel(prospect)}<div class="area-copy"><p class="eyebrow">Local service area</p><h2>${html(coverage.title)}</h2><p>${html(coverage.copy)}</p><div class="coverage-proof">${prospect.proof.map((item) => `<div>${icon('arrow')}<span>${html(item)}<small>Source reviewed · owner confirmation required</small></span></div>`).join('')}</div></div></div></div></section>
    <section class="section surface"><div class="shell"><div class="section-heading"><p class="eyebrow">Owner-review FAQ</p><h2>What this concept does—and deliberately does not do.</h2></div><div class="faq-list">${faqs}</div></div></section>
    <section class="owner-review" id="owner-review"><div class="shell"><div><p class="eyebrow">Founding-business review</p><h2>Turn the approved concept into a working growth system.</h2><p>Five invited businesses can review Full Growth at $499/month for three months with the launch fee waived. The pilot ends after 90 days unless the customer affirmatively renews at $699/month.</p></div><a class="primary-link" data-owner-review href="${attr(reviewUrl)}">Review site + content pilot ${icon('arrow')}</a></div></section>
  </main>
  <footer class="site-footer"><div class="shell"><div class="footer-grid"><div><strong>${html(prospect.name)}</strong><p>Unofficial five-page premium concept prepared by EB28. This is not the business’s current official website and is not accepting customer enquiries.</p></div><div><small>Published contact input</small><span>${html(prospect.phone)}</span>${prospect.email ? `<span>${html(prospect.email)}</span>` : ''}</div><div><small>Owner review</small><a class="footer-review" data-owner-review href="${attr(reviewUrl)}">Open EB28 review ${icon('arrow')}</a></div></div><div class="footer-bottom">Sources reviewed July 14, 2026: ${prospect.sourceUrls.map(html).join(' · ')}. Final business facts, asset rights, forms, analytics and domain routing require owner approval and launch verification.</div></div></footer>
  <div class="mobile-review"><div><small>Unofficial concept</small><strong>Customer actions disabled</strong></div><a data-owner-review href="${attr(reviewUrl)}">Owner review</a></div>
  ${analyticsScript(prospect, page)}
</body>
</html>`;
}

function renderIndex(prospects) {
  const cards = prospects.map((prospect) => `<a href="/32940/proposals/${attr(prospect.slug)}/"><small>${html(prospect.artDirection)}</small><strong>${html(prospect.name)}</strong><span>Open five-page owner-review concept ${icon('arrow')}</span></a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Five premium 32940 redesign concepts | EB28</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/32940/proposals/assets/concept.css"><style>.proposal-index{min-height:100vh;padding:90px 0;background:#f3f1e9}.proposal-index h1{max-width:960px;margin:18px 0 0;font:400 clamp(48px,7vw,92px)/.96 Georgia,serif;letter-spacing:-.055em}.proposal-index>div>p:last-of-type{max-width:700px;margin:24px 0 0;color:#68736c;line-height:1.7}.proposal-cards{margin-top:56px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.proposal-cards a{min-height:260px;padding:28px;border:1px solid #d4dad5;border-radius:14px;display:flex;flex-direction:column;background:#fff;color:#17201d;text-decoration:none}.proposal-cards small{color:#65736b;line-height:1.5}.proposal-cards strong{margin:auto 0 18px;font:400 30px Georgia,serif}.proposal-cards span{min-height:44px;display:flex;align-items:center;gap:8px;color:#28765a;font-size:11px;font-weight:800}.proposal-cards svg{width:15px}@media(max-width:700px){.proposal-cards{grid-template-columns:1fr}.proposal-index{padding:60px 0}}</style></head><body><div class="concept-banner">${icon('lock')} Unlisted EB28 owner-review inventory · Not official customer websites</div><main class="proposal-index"><div class="shell"><p class="eyebrow">32940 founding-business concepts</p><h1>Five businesses. Five distinct premium directions.</h1><p>Every concept is five pages, fully navigable, noindex and intentionally disconnected from customer-facing calls or submissions.</p><div class="proposal-cards">${cards}</div></div></main></body></html>`;
}

const prospects = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
await fs.mkdir(outRoot, { recursive: true });
try {
  await fs.access(path.join(sourceAssets, 'concept.css'));
  await fs.access(path.join(sourceAssets, 'image-sources.json'));
} catch {
  throw new Error('Premium proposal assets are missing. Run npm run prepare:32940:premium-assets first.');
}
await fs.cp(sourceAssets, path.join(outRoot, 'assets'), { recursive: true });
for (const prospect of prospects) {
  if (!Array.isArray(prospect.pages) || prospect.pages.length !== 5) throw new Error(`${prospect.slug} must define exactly five pages.`);
  for (const [pageIndex, page] of prospect.pages.entries()) {
    const directory = path.join(outRoot, prospect.slug, page.slug || '');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'index.html'), renderPage(prospect, page, pageIndex), 'utf8');
  }
}
await fs.writeFile(path.join(outRoot, 'index.html'), renderIndex(prospects), 'utf8');
console.log(`Generated ${prospects.length} premium concepts and ${prospects.length * 5} navigable pages -> ${path.relative(repoRoot, outRoot)}`);
