#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'public', '32940');
const claimEmail = 'social@eb28.co';
const studioUrl = 'https://eb28.co/melbournewebstudio/';

const prospects = [
  {
    slug: 'arabesque-flavors-of-the-middle-east',
    name: 'Arabesque Flavors of the Middle East',
    category: 'Middle Eastern restaurant',
    audience: 'families, lunch regulars, and dinner guests near Viera and Suntree',
    action: 'view the menu and plan a visit',
    focus: ['Menu-first mobile layout', 'Catering and group-order prompts', 'Local search pages for dinner, lunch, and catering'],
  },
  {
    slug: 'asian-wok',
    name: 'Asian Wok',
    category: 'Asian restaurant',
    audience: 'nearby takeout customers and families comparing dinner options',
    action: 'call, order, or check hours quickly',
    focus: ['Fast takeout CTA', 'Menu sections built for phones', 'Google-ready service and cuisine copy'],
  },
  {
    slug: 'bean-sprout-asian-cuisine-sushi-bar',
    name: 'Bean Sprout Asian Cuisine & Sushi Bar',
    category: 'Asian cuisine and sushi bar',
    audience: 'sushi customers, dinner groups, and local takeout searches',
    action: 'browse sushi options and book a visit',
    focus: ['Sushi and entree highlights', 'Reservation and takeout paths', 'Weekly content for nearby food searches'],
  },
  {
    slug: 'bella-title-escrow',
    name: 'Bella Title & Escrow',
    category: 'title and escrow office',
    audience: 'buyers, sellers, agents, and lenders needing a clear closing partner',
    action: 'request a closing conversation',
    focus: ['Trust-first service pages', 'Agent and lender enquiry forms', 'Local search copy for closings and escrow'],
  },
  {
    slug: 'bizzarro-s-pizza',
    name: "Bizzarro's Pizza",
    category: 'pizza restaurant',
    audience: 'families, office lunch buyers, and game-night pickup customers',
    action: 'order pizza or call the store',
    focus: ['Order-now mobile flow', 'Lunch and catering prompts', 'Local blog posts around pizza and group meals'],
  },
  {
    slug: 'bold-cup-coffee',
    name: 'Bold Cup Coffee',
    category: 'coffee shop',
    audience: 'morning commuters, remote workers, and local coffee regulars',
    action: 'find hours, location, and featured drinks',
    focus: ['Cafe atmosphere section', 'Drink and pastry highlights', 'Weekly posts for coffee near me searches'],
  },
  {
    slug: 'cedar-s-cafe',
    name: "Cedar's Cafe",
    category: 'local cafe',
    audience: 'breakfast, lunch, and casual dining customers nearby',
    action: 'check the menu and plan a visit',
    focus: ['Menu and hours above the fold', 'Catering and group dining prompts', 'Food photography-ready layout'],
  },
  {
    slug: 'diane-s-nails',
    name: "Diane's Nails",
    category: 'nail salon',
    audience: 'clients booking manicures, pedicures, and nail appointments',
    action: 'call for an appointment',
    focus: ['Service menu with pricing-ready structure', 'Call and booking buttons', 'Local nail salon SEO pages'],
  },
  {
    slug: 'dynasty-nail-spa',
    name: 'Dynasty Nail Spa',
    category: 'nail spa',
    audience: 'walk-in and appointment clients near Suntree and Viera',
    action: 'book a nail or spa visit',
    focus: ['Mobile appointment CTA', 'Service gallery sections', 'Google Business Profile post topics'],
  },
  {
    slug: 'eatz',
    name: 'Eatz',
    category: 'local restaurant',
    audience: 'nearby customers deciding where to eat today',
    action: 'see the food, hours, and next step',
    focus: ['Simple menu-first homepage', 'Daily special and catering blocks', 'Restaurant SEO foundation'],
  },
  {
    slug: 'el-tesoro-cocina-mexicana',
    name: 'El Tesoro Cocina Mexicana',
    category: 'Mexican restaurant',
    audience: 'locals searching for Mexican food, tacos, margaritas, and dinner spots',
    action: 'view the menu or visit today',
    focus: ['Cuisine-specific landing copy', 'Happy hour and specials sections', 'Weekly local food posts'],
  },
  {
    slug: 'elegant-nail-spa',
    name: 'Elegant Nail Spa',
    category: 'nail spa',
    audience: 'clients comparing manicure, pedicure, and salon options',
    action: 'book an appointment',
    focus: ['Appointment-first layout', 'Service and care pages', 'Trust signals without clutter'],
  },
  {
    slug: 'fairway-cigar-lounge',
    name: 'Fairway Cigar Lounge',
    category: 'cigar lounge',
    audience: 'cigar shoppers, lounge members, and visitors looking for a relaxed local spot',
    action: 'find the lounge, inventory, and events',
    focus: ['Membership and event modules', 'Inventory highlight sections', 'Local search copy for cigar lounge queries'],
  },
  {
    slug: 'flying-burro',
    name: 'Flying Burro',
    category: 'local restaurant',
    audience: 'lunch, dinner, and casual takeout customers',
    action: 'browse the menu and plan a meal',
    focus: ['Fast menu CTA', 'Location and hours panel', 'Local content for food searches'],
  },
  {
    slug: 'fujiyama-japanese',
    name: 'Fujiyama Japanese',
    category: 'Japanese restaurant',
    audience: 'sushi, hibachi, and Japanese food customers nearby',
    action: 'book, call, or view menu options',
    focus: ['Cuisine-led hero copy', 'Sushi and hibachi sections', 'Search pages for Japanese food near me'],
  },
  {
    slug: 'gatto-s-tire-and-auto-services',
    name: "Gatto's Tire & Auto Services",
    category: 'auto repair and tire shop',
    audience: 'drivers needing tires, maintenance, and trustworthy repairs',
    action: 'request service or call the shop',
    focus: ['Service request form', 'Trust and maintenance pages', 'Local SEO for tires, brakes, and repairs'],
  },
  {
    slug: 'genna-pizza-express',
    name: 'Genna Pizza Express',
    category: 'pizza restaurant',
    audience: 'pickup, delivery, and casual dining customers',
    action: 'order pizza or check hours',
    focus: ['Order-first mobile layout', 'Catering and party prompts', 'Weekly pizza and local dining content'],
  },
  {
    slug: 'harbor-city-animal-hospital',
    name: 'Harbor City Animal Hospital',
    category: 'veterinary clinic',
    audience: 'pet owners searching for veterinary care and appointment availability',
    action: 'request an appointment or call the clinic',
    focus: ['Appointment request path', 'Service pages for common pet care searches', 'Trust-first clinic layout'],
  },
  {
    slug: 'luxy-nail-spa',
    name: 'Luxy Nail Spa',
    category: 'nail spa',
    audience: 'clients booking nail care, spa services, and repeat appointments',
    action: 'book or call quickly',
    focus: ['Service menu and gallery', 'Mobile booking CTA', 'Local nail and spa content'],
  },
  {
    slug: 'olive-tree-greek-grill',
    name: 'Olive Tree Greek Grill',
    category: 'Greek restaurant',
    audience: 'Mediterranean food fans, lunch customers, and families nearby',
    action: 'view menu and visit',
    focus: ['Greek menu highlights', 'Lunch and catering sections', 'Weekly content for Mediterranean searches'],
  },
  {
    slug: 'paws-on-pizzeria',
    name: 'Paws On Pizzeria',
    category: 'pizza restaurant',
    audience: 'local pizza customers, families, and takeout buyers',
    action: 'order or call for pickup',
    focus: ['Pizza menu structure', 'Family and catering prompts', 'Local search coverage'],
  },
  {
    slug: 'poke-boba',
    name: 'Poke Boba',
    category: 'poke and boba shop',
    audience: 'customers looking for poke bowls, boba drinks, and quick meals',
    action: 'view bowls, drinks, and visit details',
    focus: ['Visual menu sections', 'Order and visit CTAs', 'Weekly posts for poke and boba searches'],
  },
  {
    slug: 'pristine-spa',
    name: 'Pristine Spa',
    category: 'spa',
    audience: 'clients searching for self-care, skincare, and spa appointments',
    action: 'book a spa visit',
    focus: ['Treatment menu layout', 'Calm conversion path', 'Local spa SEO articles'],
  },
  {
    slug: 'realm-nails-spa',
    name: 'Realm Nails & Spa',
    category: 'nail spa',
    audience: 'appointment and walk-in nail clients nearby',
    action: 'book a manicure, pedicure, or spa service',
    focus: ['Service menu blocks', 'Appointment CTA', 'Local nail salon search content'],
  },
  {
    slug: 'revolutions-cyclery',
    name: 'Revolutions Cyclery',
    category: 'bike shop',
    audience: 'cyclists needing bikes, gear, repairs, and local shop expertise',
    action: 'request service or visit the shop',
    focus: ['Repair and tune-up pages', 'Inventory-ready sections', 'Cycling content for local search'],
  },
  {
    slug: 'suntree-florist',
    name: 'Suntree Florist',
    category: 'florist',
    audience: 'gift buyers, event planners, and customers needing local flower delivery',
    action: 'order flowers or request an arrangement',
    focus: ['Occasion landing pages', 'Delivery and order CTAs', 'Weekly flower and event content'],
  },
  {
    slug: 'suntree-flower-shop',
    name: 'Suntree Flower Shop',
    category: 'flower shop',
    audience: 'customers searching for arrangements, gifts, sympathy flowers, and delivery',
    action: 'order or request a custom arrangement',
    focus: ['Delivery-first layout', 'Occasion-based SEO pages', 'Clear phone and quote path'],
  },
  {
    slug: 'the-salty-bagel',
    name: 'The Salty Bagel',
    category: 'bagel shop',
    audience: 'breakfast customers, office orders, and weekend regulars',
    action: 'check the menu and visit',
    focus: ['Breakfast menu layout', 'Catering and office order prompts', 'Local posts for bagels and breakfast'],
  },
  {
    slug: 'the-shabby-loft',
    name: 'The Shabby Loft',
    category: 'boutique retail shop',
    audience: 'local shoppers looking for gifts, decor, and unique finds',
    action: 'visit the shop or ask about inventory',
    focus: ['Product story sections', 'Event and new-arrival prompts', 'Local retail SEO foundation'],
  },
  {
    slug: 'urban-prime',
    name: 'Urban Prime',
    category: 'restaurant and market',
    audience: 'dining guests, market shoppers, and event customers',
    action: 'reserve, shop, or plan a visit',
    focus: ['Restaurant and market split navigation', 'Event and private dining prompts', 'Local search content for dining and market queries'],
  },
];

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const attr = escapeHtml;

function buildMailto(prospect) {
  const subject = encodeURIComponent(`Claim the free EB28 website for ${prospect.name}`);
  const body = encodeURIComponent(
    `I want to claim the free website concept for ${prospect.name}.\n\nName:\nPhone:\nBest time to talk:\nCurrent website or Google listing:\n`,
  );
  return `mailto:${claimEmail}?subject=${subject}&body=${body}`;
}

function focusMarkup(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n');
}

function renderProspectPage(prospect, index) {
  const title = `${prospect.name} free website concept | EB28 Growth Hosting`;
  const description = `A free local website concept for ${prospect.name}. EB28 can host, optimize, and publish weekly local content for $98/month after owner approval.`;
  const mailto = buildMailto(prospect);
  const accent = index % 3 === 0 ? '#0f766e' : index % 3 === 1 ? '#2563eb' : '#be123c';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,follow" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${attr(description)}" />
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #5b6472;
        --line: #e5e7eb;
        --wash: #f6f7f9;
        --accent: ${accent};
        --accent-soft: color-mix(in srgb, var(--accent) 11%, white);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: #fff;
        line-height: 1.5;
      }
      a { color: inherit; }
      .notice {
        background: #111827;
        color: #fff;
        padding: 10px 20px;
        text-align: center;
        font-size: 13px;
      }
      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        max-width: 1180px;
        margin: 0 auto;
        padding: 18px 22px;
      }
      .brand {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-weight: 900;
        letter-spacing: 0;
      }
      .brand small {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }
      .nav-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 12px 16px;
        border: 1px solid var(--line);
        border-radius: 8px;
        text-decoration: none;
        font-weight: 800;
        font-size: 14px;
        background: #fff;
      }
      .btn.primary {
        background: var(--ink);
        color: #fff;
        border-color: var(--ink);
      }
      .btn.accent {
        background: var(--accent);
        color: #fff;
        border-color: var(--accent);
      }
      .hero {
        border-top: 1px solid var(--line);
        background:
          radial-gradient(circle at 82% 20%, var(--accent-soft), transparent 31%),
          linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      }
      .wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 70px 22px;
      }
      .hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
        gap: 48px;
        align-items: center;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 18px;
        padding: 7px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      h1 {
        margin: 0;
        max-width: 840px;
        font-size: clamp(38px, 7vw, 72px);
        line-height: .95;
        letter-spacing: 0;
      }
      .lead {
        margin: 24px 0 0;
        max-width: 680px;
        color: var(--muted);
        font-size: clamp(17px, 2vw, 21px);
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 30px;
      }
      .preview {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 24px 70px rgb(15 23 42 / 12%);
        overflow: hidden;
      }
      .preview-top {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 14px;
        border-bottom: 1px solid var(--line);
        background: #f8fafc;
      }
      .dot { width: 10px; height: 10px; border-radius: 999px; background: #cbd5e1; }
      .preview-body { padding: 26px; }
      .mock-title {
        margin: 0 0 8px;
        font-size: 27px;
        line-height: 1.05;
        letter-spacing: 0;
      }
      .mock-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 22px 0;
      }
      .mock-strip span {
        min-height: 86px;
        border-radius: 7px;
        background: var(--accent-soft);
        border: 1px solid color-mix(in srgb, var(--accent) 20%, white);
      }
      .mock-panel {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }
      .mock-panel div {
        height: 12px;
        border-radius: 999px;
        background: #e5e7eb;
      }
      .band { border-top: 1px solid var(--line); }
      .section-title {
        max-width: 760px;
        margin: 0 0 26px;
        font-size: clamp(29px, 4vw, 46px);
        line-height: 1;
        letter-spacing: 0;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 24px;
        background: #fff;
      }
      .card h3 {
        margin: 0 0 10px;
        font-size: 18px;
      }
      .card p, .card li { color: var(--muted); }
      .card ul {
        margin: 0;
        padding-left: 20px;
      }
      .offer {
        background: var(--ink);
        color: #fff;
      }
      .offer .wrap {
        display: grid;
        grid-template-columns: minmax(0, .95fr) minmax(300px, 1.05fr);
        gap: 36px;
        align-items: start;
      }
      .offer .section-title, .offer .lead { color: #fff; }
      .offer-list {
        display: grid;
        gap: 12px;
        margin: 26px 0 0;
        padding: 0;
        list-style: none;
      }
      .offer-list li {
        display: flex;
        gap: 10px;
        color: #d1d5db;
      }
      .offer-list li::before {
        content: "";
        width: 9px;
        height: 9px;
        margin-top: 8px;
        border-radius: 999px;
        background: var(--accent);
        flex: 0 0 auto;
      }
      form {
        display: grid;
        gap: 12px;
        padding: 24px;
        border: 1px solid rgb(255 255 255 / 14%);
        border-radius: 8px;
        background: rgb(255 255 255 / 7%);
      }
      label {
        display: grid;
        gap: 7px;
        color: #e5e7eb;
        font-size: 13px;
        font-weight: 800;
      }
      input, textarea {
        width: 100%;
        border: 1px solid rgb(255 255 255 / 18%);
        border-radius: 7px;
        background: rgb(255 255 255 / 10%);
        color: #fff;
        padding: 13px 14px;
        font: inherit;
      }
      input::placeholder, textarea::placeholder { color: #9ca3af; }
      textarea { min-height: 118px; resize: vertical; }
      .fine {
        color: #9ca3af;
        font-size: 12px;
      }
      .index-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .index-list a {
        display: block;
        padding: 15px;
        border: 1px solid var(--line);
        border-radius: 8px;
        text-decoration: none;
        background: #fff;
        font-weight: 800;
      }
      footer {
        border-top: 1px solid var(--line);
        padding: 28px 22px;
        color: var(--muted);
        text-align: center;
      }
      @media (max-width: 860px) {
        .hero-grid, .offer .wrap, .cards, .index-list {
          grid-template-columns: 1fr;
        }
        .wrap { padding: 46px 18px; }
        .nav { align-items: flex-start; flex-direction: column; }
        .nav-actions { justify-content: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="notice">
      Unofficial free website concept prepared by EB28 for owner review. This is not the business's current official website.
    </div>
    <header class="nav" aria-label="Page header">
      <div class="brand">
        <span>${escapeHtml(prospect.name)}</span>
        <small>${escapeHtml(prospect.category)} growth concept by EB28</small>
      </div>
      <div class="nav-actions">
        <a class="btn" href="${attr(studioUrl)}">About EB28</a>
        <a class="btn primary" href="#claim">Claim this free site</a>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="wrap hero-grid">
          <div>
            <p class="eyebrow">Free website build + $98/mo Growth Hosting</p>
            <h1>A sharper website concept for ${escapeHtml(prospect.name)}.</h1>
            <p class="lead">
              Built to help ${escapeHtml(prospect.audience)} ${escapeHtml(prospect.action)} without hunting through clutter, slow pages, or unclear next steps.
            </p>
            <div class="hero-actions">
              <a class="btn accent" href="#claim">Claim this free site</a>
              <a class="btn" href="${attr(mailto)}">Email EB28</a>
            </div>
          </div>
          <aside class="preview" aria-label="Website concept preview">
            <div class="preview-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
            <div class="preview-body">
              <p class="eyebrow">${escapeHtml(prospect.category)}</p>
              <h2 class="mock-title">${escapeHtml(prospect.name)}</h2>
              <p>Clear service or menu highlights, fast contact paths, and local search content structured for customers nearby.</p>
              <div class="mock-strip"><span></span><span></span><span></span></div>
              <a class="btn primary" href="#claim">Owner approval needed</a>
              <div class="mock-panel"><div style="width: 92%"></div><div style="width: 74%"></div><div style="width: 58%"></div></div>
            </div>
          </aside>
        </div>
      </section>

      <section class="band">
        <div class="wrap">
          <h2 class="section-title">What this site would help customers do.</h2>
          <div class="cards">
            <article class="card">
              <h3>Act faster</h3>
              <p>Put the highest-intent action near the top of every mobile screen: call, book, order, request service, or plan a visit.</p>
            </article>
            <article class="card">
              <h3>Trust the business</h3>
              <p>Use owner-approved photos, service details, hours, location cues, and proof where a customer naturally needs confidence.</p>
            </article>
            <article class="card">
              <h3>Find it on Google</h3>
              <p>Publish search-friendly pages and weekly local content so more nearby customers can discover the business before choosing a competitor.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="band">
        <div class="wrap">
          <h2 class="section-title">Launch focus for ${escapeHtml(prospect.name)}.</h2>
          <div class="cards">
            <article class="card">
              <h3>Priority fixes</h3>
              <ul>
                ${focusMarkup(prospect.focus)}
              </ul>
            </article>
            <article class="card">
              <h3>Owner approval needed</h3>
              <p>Before public launch, EB28 confirms correct hours, phone number, domain access, photos, menu or service details, and any required legal or brand language.</p>
            </article>
            <article class="card">
              <h3>Lead routing</h3>
              <p>Every claim form on this concept sends to <strong>${claimEmail}</strong>. EB28 can route approved site leads to the business's preferred inbox at launch.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="offer" id="claim">
        <div class="wrap">
          <div>
            <p class="eyebrow">EB28 Growth Hosting</p>
            <h2 class="section-title">The website build is free. Hosting, SEO, and weekly content are $98/month.</h2>
            <p class="lead">
              EB28 builds the first version at no upfront cost. If the owner wants to use it, EB28 hosts and improves it for $98/month with local SEO upkeep and weekly blog posts.
            </p>
            <ul class="offer-list">
              <li>Managed website hosting, SSL, technical upkeep, and launch support.</li>
              <li>Local SEO structure, page titles, descriptions, sitemap, and performance checks.</li>
              <li>One weekly local blog post or Google Business Profile content prompt.</li>
              <li>One monthly website update request included after launch.</li>
              <li>No ownership confusion: the owner keeps the business, domain, content rights, and customer relationships.</li>
            </ul>
          </div>
          <form action="https://formsubmit.co/${claimEmail}" method="POST" accept-charset="UTF-8">
            <input type="hidden" name="_subject" value="Claim request: ${attr(prospect.name)} free EB28 website" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="source" value="eb28-32940-${attr(prospect.slug)}" />
            <input type="hidden" name="business" value="${attr(prospect.name)}" />
            <label>
              Your name
              <input name="name" autocomplete="name" required placeholder="Name" />
            </label>
            <label>
              Email
              <input name="email" type="email" autocomplete="email" required placeholder="you@example.com" />
            </label>
            <label>
              Phone
              <input name="phone" type="tel" autocomplete="tel" placeholder="Best number" />
            </label>
            <label>
              Message
              <textarea name="message" required placeholder="I want to claim or discuss this free website concept."></textarea>
            </label>
            <button class="btn accent" type="submit">Send claim to ${claimEmail}</button>
            <p class="fine">Prefer email? Send a note to <a href="${attr(mailto)}">${claimEmail}</a>. This concept remains noindex until the business owner approves public use.</p>
          </form>
        </div>
      </section>
    </main>

    <footer>
      Prepared by <a href="https://eb28.co">EB28</a>. Unofficial concept for owner review only. Contact <a href="mailto:${claimEmail}">${claimEmail}</a>.
    </footer>
  </body>
</html>
`;
}

function renderIndex() {
  const links = prospects
    .map(
      (prospect) =>
        `<a href="/32940/${attr(prospect.slug)}.html">${escapeHtml(prospect.name)}<br><small>${escapeHtml(prospect.category)}</small></a>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,follow" />
    <title>32940 Free Website Concepts | EB28 Growth Hosting</title>
    <meta name="description" content="Free website concepts for local 32940 businesses, prepared by EB28 with $98/month Growth Hosting available after owner approval." />
    <style>
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f8fafc; }
      main { max-width: 1120px; margin: 0 auto; padding: 64px 22px; }
      h1 { margin: 0; font-size: clamp(38px, 7vw, 70px); line-height: .96; letter-spacing: 0; }
      p { color: #4b5563; font-size: 18px; max-width: 780px; line-height: 1.55; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 26px 0 40px; }
      a.button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 12px 16px; border-radius: 8px; background: #111827; color: #fff; font-weight: 900; text-decoration: none; }
      .index-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .index-list a { display: block; min-height: 92px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; text-decoration: none; color: #111827; font-weight: 900; box-shadow: 0 8px 30px rgb(15 23 42 / 5%); }
      .index-list small { display: inline-block; margin-top: 7px; color: #6b7280; font-weight: 700; }
      .notice { margin-top: 36px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #6b7280; font-size: 14px; }
      @media (max-width: 840px) { .index-list { grid-template-columns: 1fr; } main { padding: 42px 18px; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Free website concepts for 32940 local businesses.</h1>
      <p>EB28 prepared these noindex owner-review pages as a lead-generation offer: the custom website build is free, and approved sites can be hosted, optimized, and supported for $98/month with weekly local content.</p>
      <div class="actions">
        <a class="button" href="${studioUrl}">View EB28 Growth Hosting</a>
        <a class="button" href="mailto:${claimEmail}?subject=32940%20free%20website%20concepts">Email ${claimEmail}</a>
      </div>
      <section class="index-list" aria-label="Business website concepts">
        ${links}
      </section>
      <p class="notice">These are unofficial concepts for owner review only. They are not the current official websites for the listed businesses.</p>
    </main>
  </body>
</html>
`;
}

await fs.mkdir(outDir, { recursive: true });

for (const [index, prospect] of prospects.entries()) {
  await fs.writeFile(path.join(outDir, `${prospect.slug}.html`), renderProspectPage(prospect, index));
}

await fs.writeFile(path.join(outDir, 'index.html'), renderIndex());

console.log(`Generated ${prospects.length} 32940 growth site concepts in ${path.relative(repoRoot, outDir)}`);
