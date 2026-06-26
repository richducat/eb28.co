#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(repoRoot, 'public', '32940', 'index.html');
const outDir = path.join(repoRoot, 'output', 'lead-ops');
const trackerPath = path.join(outDir, '32940-booked-call-tracker.csv');
const replacementProspectsPath = path.join(repoRoot, 'scripts', 'data', '32940-replacement-prospects.json');
const avenueContactOverridesPath = path.join(repoRoot, 'scripts', 'data', '32940-avenue-contact-overrides.json');
const publicEmailOverridesPath = path.join(repoRoot, 'scripts', 'data', '32940-public-email-overrides.json');
const today = new Date().toISOString().slice(0, 10);

const conceptBaseUrl = 'https://eb28.co/32940/';
const ownerEmail = 'social@eb28.co';
const minimumProspectCount = 100;

const verifiedContacts = {
  'arabesque-flavors-of-the-middle-east': {
    email: 'arabesqueflavors@gmail.com',
    phone: '(321) 414-0000',
    address: '7640 North Wickham Road, Ste 105, Melbourne, FL 32940',
    website: 'https://arabesqueflavors.com/',
    sourceUrls: ['https://arabesqueflavors.com/'],
    sourceType: 'owned website',
  },
  'bean-sprout-asian-cuisine-sushi-bar': {
    email: 'beansproutviera@gmail.com',
    phone: '(321) 632-8999',
    address: '2221 Town Center Ave Ste. 115, Viera, FL 32940',
    website: 'https://www.beansproutviera.com/',
    sourceUrls: ['https://www.beansproutviera.com/', 'https://www.facebook.com/beansproutviera2026/'],
    sourceType: 'owned website plus Facebook contact profile',
    notes: 'Owned site publishes the phone/address and uses email protection; Facebook profile exposes the same business email.',
  },
  'bella-title-escrow': {
    email: 'Lee@bellatitle.com',
    phone: '(321) 610-7806',
    address: '6450 N. Wickham Rd Suite 106, Melbourne, FL 32940',
    website: 'https://www.bellatitle.com/',
    sourceUrls: ['https://www.bellatitle.com/766/5/Contacts', 'https://www.bellatitle.com/766/1/Our%2BBella%2BTitle%2BFamily'],
    sourceType: 'owned website',
  },
  'bold-cup-coffee': {
    email: 'boldcup@gmail.com',
    phone: '(321) 313-0830',
    address: '2261 Town Center Ave #139, Melbourne, FL 32940',
    website: 'https://www.boldcupcoffee.com/s/order',
    sourceUrls: ['https://www.boldcupcoffee.com/s/order'],
    sourceType: 'owned ordering website',
  },
  'cedar-s-cafe': {
    email: 'cedars@cedarscafe.com',
    phone: '(321) 751-0000',
    address: '4100 N. Wickham Rd, Suite 137, Melbourne, FL 32935',
    website: 'https://www.cedarscafe.com/contact',
    sourceUrls: ['https://www.cedarscafe.com/contact'],
    sourceType: 'owned website',
  },
  'dynasty-nail-spa': {
    email: 'hangle52000@gmail.com',
    phone: '(321) 757-3370',
    address: '7720 N Wickham Rd #108, Melbourne, FL 32940',
    website: 'https://dynastynailspamelbourne.com/contact',
    sourceUrls: ['https://dynastynailspamelbourne.com/contact', 'https://dynastynailspamelbourne.com/'],
    sourceType: 'owned website',
  },
  'eatz': {
    email: 'eatzsuntree@gmail.com',
    phone: '(321) 426-7575',
    address: '7965 N Wickham Rd, Suntree/Viera, FL 32940',
    website: 'https://www.eatz-eatery.com/',
    sourceUrls: ['https://www.eatz-eatery.com/', 'https://www.facebook.com/eatzsuntree/'],
    sourceType: 'owned website plus Facebook contact profile',
  },
  'fairway-cigar-lounge': {
    email: 'tbaruti@fairwaycigarlounge.com',
    phone: '(321) 338-7270',
    address: '6729 Colonnade Ave Unit 108, Melbourne, FL 32940',
    website: 'https://fairwaycigarlounge.com/',
    sourceUrls: ['https://fairwaycigarlounge.com/', 'https://fairwaycigarlounge.com/pages/privacy-policy'],
    sourceType: 'owned website',
  },
  'flying-burro': {
    email: 'flyingburroviera@gmail.com',
    phone: '(321) 208-8970',
    address: '2348 Citadel Way #105, Melbourne, FL 32940',
    website: 'https://flyingburrofl.com/page/contact-us',
    sourceUrls: ['https://flyingburrofl.com/page/contact-us', 'https://flyingburrofl.com/flyingburroviera-bu407w'],
    sourceType: 'owned website',
  },
  'genna-pizza-express': {
    email: 'admin@gennapizzaexpress.com',
    phone: '(321) 462-4020',
    address: '7954 N Wickham Road, Melbourne, FL 32940',
    website: 'https://gennapizzaexpress.com/contact-us/',
    sourceUrls: ['https://gennapizzaexpress.com/contact-us/', 'https://gennapizzaexpress.com/terms-of-service/'],
    sourceType: 'owned website',
    notes: 'Contact page also exposes the store phone and a contact form.',
  },
  'harbor-city-animal-hospital': {
    email: 'info@harborcityanimal.com',
    phone: '(321) 757-7381',
    address: '7670 N Wickham Road, Suite B, Melbourne, FL 32940',
    website: 'https://harborcityanimal.com/',
    sourceUrls: ['https://harborcityanimal.com/', 'https://harborcityanimal.com/services/'],
    sourceType: 'owned website',
  },
  'olive-tree-greek-grill': {
    email: 'customerservice@olivetreegreekgrill.com',
    phone: '(321) 631-0188',
    address: '5481 Lake Andrew Drive, Melbourne, FL 32940',
    website: 'https://olivetreegreekgrill.com/contact-us/',
    sourceUrls: ['https://olivetreegreekgrill.com/contact-us/', 'https://www.instagram.com/olivetreegreekgrill/'],
    sourceType: 'owned website plus Instagram profile',
    notes: 'Owned website confirms location and phone; Instagram profile publishes the email.',
  },
  'the-salty-bagel': {
    email: 'saltybagelandgrill@gmail.com',
    phone: '',
    address: 'Suntree, Melbourne, FL 32940',
    website: 'https://www.saltybagel.co/contact',
    sourceUrls: ['https://www.saltybagel.co/contact', 'https://www.saltybagel.co/menu'],
    sourceType: 'owned website',
  },
  'the-shabby-loft': {
    email: 'info@theshabbyloft.com',
    phone: '(321) 455-8050',
    address: 'Cocoa Village, FL',
    website: 'https://www.theshabbyloft.com/',
    sourceUrls: ['https://www.theshabbyloft.com/'],
    sourceType: 'owned website',
    notes: 'Current public site points to Cocoa Village; tailor outreach to the current store location.',
  },
  'urban-prime': {
    email: 'Info@UrbanPrimeFoods.com',
    phone: '(321) 499-1188',
    address: '2435 Metfield Dr, Melbourne, FL 32940',
    website: 'https://www.urbanprimefoods.com/contact/',
    sourceUrls: ['https://www.urbanprimefoods.com/contact/', 'https://www.urbanprimefoods.com/location/urban-prime/'],
    sourceType: 'owned website',
  },
};

const callOrFormContacts = {
  'asian-wok': {
    phone: '(321) 253-8859',
    address: '8530 N Wickham Rd #110, Melbourne, FL 32940',
    website: 'https://www.asianwokviera.com/contact-us',
    sourceUrls: ['https://www.asianwokviera.com/contact-us'],
    sourceType: 'owned website',
  },
  'bizzarro-s-pizza': {
    phone: '(321) 242-5966',
    address: '7777 N Wickham Rd Suite 12, Melbourne, FL 32940',
    website: 'https://www.bizzarrospizzasuntree.com/contact_us.html',
    sourceUrls: ['https://www.bizzarrospizzasuntree.com/contact_us.html'],
    sourceType: 'owned website',
  },
  'botta-pizzeria-bakery': {
    phone: '(321) 421-7722',
    address: '5410 Murrell Rd #205, Rockledge, FL 32955',
    website: 'https://www.bottapizzeria.com/',
    sourceUrls: ['https://www.bottapizzeria.com/'],
    sourceType: 'owned website',
    notes: 'Replacement for the stale Paws On Pizzeria row; official site verifies phone and ordering path.',
  },
  'diane-s-nails': {
    phone: '(321) 242-0060',
    address: '4100 N Wickham Rd #106, Melbourne, FL 32935',
    website: '',
    sourceUrls: ['https://www.fresha.com/lp/en/bt/nail-salons/in/us-palm-bay/melbourne'],
    sourceType: 'booking directory',
  },
  'el-tesoro-cocina-mexicana': {
    phone: '(321) 429-0833',
    address: '8260 N Wickham Rd, Melbourne, FL 32940',
    website: 'https://eltesoromexrestaurant.com/',
    sourceUrls: ['https://eltesoromexrestaurant.com/', 'https://eltesoromexrestaurant.com/order', 'https://eltesoromexrestaurant.com/menu'],
    sourceType: 'owned website and owned online-ordering page',
    notes: 'Updated to current official El Tesoro Cocina Mexicana website, phone, and address during 2026-06-26 contact-route audit.',
  },
  'elegant-nail-spa': {
    phone: '(321) 428-5335',
    address: '8020 N Wickham Rd #107, Melbourne, FL 32940',
    website: 'https://www.elegantnailspaviera.com/location/elegant-nail-spa/',
    sourceUrls: ['https://www.elegantnailspaviera.com/location/elegant-nail-spa/'],
    sourceType: 'owned website',
  },
  'fujiyama-japanese': {
    phone: '(321) 255-6633',
    address: '5000 N Wickham Rd #111, Melbourne, FL 32940',
    website: 'https://fujiyamamelbourne.com/about-us',
    sourceUrls: ['https://fujiyamamelbourne.com/about-us'],
    sourceType: 'owned website',
  },
  'gatto-s-tire-and-auto-services': {
    phone: '(321) 308-2468',
    address: '7205 Dolina Ct, Viera, FL 32940',
    website: 'https://www.gattos.com/Locations/Mode/3/7205-Dolina-Ct-Viera-FL-32940/details',
    sourceUrls: ['https://www.gattos.com/Locations/Mode/3/7205-Dolina-Ct-Viera-FL-32940/details', 'https://www.gattos.com/Locations/Contact'],
    sourceType: 'owned website',
  },
  'luxy-nail-spa': {
    phone: '(321) 423-3873',
    address: 'Melbourne, FL 32940',
    website: 'https://luxynailspaviera.com/',
    sourceUrls: ['https://luxynailspaviera.com/'],
    sourceType: 'owned website',
  },
  'olive-tree-greek-grill': {
    phone: '(321) 631-0188',
    address: '5481 Lake Andrew Drive, Melbourne, FL 32940',
    website: 'https://olivetreegreekgrill.com/contact-us/',
    sourceUrls: ['https://olivetreegreekgrill.com/contact-us/'],
    sourceType: 'owned website',
  },
  'poke-fin-viera': {
    phone: '(321) 241-4742',
    address: '7500 Lake Andrew Dr, Viera, FL 32940',
    website: 'https://pokefin.com/',
    sourceUrls: ['https://pokefin.com/', 'https://ma-restaurant-dba-poke-fin-viera.square.site/'],
    sourceType: 'owned website plus ordering profile',
  },
  'pristine-spa': {
    phone: '(407) 577-6796',
    address: '7645 Stadium Parkway Suite 103-104, Melbourne, FL 32940',
    website: 'https://www.pristinespas.com/',
    sourceUrls: ['https://www.pristinespas.com/', 'https://www.vagaro.com/pristinespaviera'],
    sourceType: 'owned website plus booking profile',
  },
  'realm-nails-spa': {
    phone: '(321) 877-0018',
    address: '2348 Citadel Way #102, Melbourne, FL 32940',
    website: 'https://realmnailsspa.com/booking/',
    sourceUrls: ['https://realmnailsspa.com/booking/'],
    sourceType: 'owned website',
  },
  'revolutions-cyclery': {
    phone: '(321) 751-5457',
    address: '6300 N. Wickham Road Suite 135, Melbourne, FL 32940',
    website: 'https://www.revolutionscyclery.com/about/contact-us-pg1316.htm',
    sourceUrls: ['https://www.revolutionscyclery.com/about/contact-us-pg1316.htm'],
    sourceType: 'owned website',
  },
  'suntree-florist': {
    phone: '(321) 253-5511',
    address: '6450 North Wickham Road Suite 104, Melbourne, FL 32940',
    website: 'https://www.suntreefloristmelbourne.com/contact_us.php',
    sourceUrls: ['https://www.suntreefloristmelbourne.com/contact_us.php'],
    sourceType: 'owned website',
  },
  'suntree-flower-shop': {
    phone: '(321) 425-6111',
    address: '7720 N Wickham Rd Suite 104, Melbourne, FL 32940',
    website: 'https://suntreeflowershop.com/',
    sourceUrls: ['https://www.flowershopnetwork.com/floristProfile/656516', 'https://verovine.com/business/suntree-flower-shop/'],
    sourceType: 'florist network profile plus local directory',
  },
  'sirocco-station': {
    phone: '',
    address: '2261 Town Center Ave, Viera, FL 32940',
    website: 'https://www.avenueviera.com/tenants/sirocco-station/',
    sourceUrls: ['https://www.avenueviera.com/tenants/sirocco-station/', 'https://siroccomediterranean.com/'],
    sourceType: 'Avenue Viera tenant page plus brand website',
    notes: 'Coming-soon tenant; use contact form or brand route to find the opening decision maker.',
  },
  'urban-prime': {
    phone: '(321) 499-1188',
    address: '2435 Metfield Dr, Melbourne, FL 32940',
    website: 'https://www.urbanprimefoods.com/contact/',
    sourceUrls: ['https://www.urbanprimefoods.com/contact/', 'https://www.urbanprimefoods.com/location/urban-prime/'],
    sourceType: 'owned website',
  },
};

async function loadReplacementContacts() {
  const raw = await fs.readFile(replacementProspectsPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${path.relative(repoRoot, replacementProspectsPath)} must contain an array.`);
  }

  return Object.fromEntries(
    parsed
      .filter((prospect) => prospect.slug && prospect.contact)
      .map((prospect) => {
        const contact = prospect.contact;
        const sourceUrls = Array.isArray(contact.sourceUrls) && contact.sourceUrls.length
          ? contact.sourceUrls
          : contact.website
            ? [contact.website]
            : [];

        return [
          prospect.slug,
          {
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            address: contact.address ?? '',
            website: contact.website ?? '',
            sourceUrls,
            sourceType: contact.sourceType ?? 'replacement prospect source',
            notes: contact.notes ?? 'Wave 1 replacement prospect; confirm local decision maker before outreach.',
          },
        ];
      }),
  );
}

const replacementContacts = await loadReplacementContacts();

async function loadAvenueContactOverrides() {
  try {
    const raw = await fs.readFile(avenueContactOverridesPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${path.relative(repoRoot, avenueContactOverridesPath)} must contain an object keyed by prospect slug.`);
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([slug, contact]) => {
        const sourceUrls = Array.isArray(contact.sourceUrls) && contact.sourceUrls.length
          ? contact.sourceUrls
          : contact.website
            ? [contact.website]
            : [];

        return [
          slug,
          {
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            address: contact.address ?? '',
            website: contact.website ?? '',
            sourceUrls,
            sourceType: contact.sourceType ?? 'Avenue Viera tenant page',
            notes: contact.notes ?? 'Avenue tenant page is the first verified contact route; confirm local decision maker before outreach.',
          },
        ];
      }),
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

const avenueContactOverrides = await loadAvenueContactOverrides();

async function loadPublicEmailOverrides() {
  try {
    const raw = await fs.readFile(publicEmailOverridesPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${path.relative(repoRoot, publicEmailOverridesPath)} must contain an object keyed by prospect slug.`);
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, contact]) => contact?.email)
        .map(([slug, contact]) => {
          const sourceUrls = Array.isArray(contact.sourceUrls) && contact.sourceUrls.length
            ? contact.sourceUrls
            : contact.website
              ? [contact.website]
              : [];

          return [
            slug,
            {
              email: contact.email ?? '',
              phone: contact.phone ?? '',
              address: contact.address ?? '',
              website: contact.website ?? '',
              sourceUrls,
              sourceType: contact.sourceType ?? 'public email on business website',
              notes: contact.notes ?? 'Auto-discovered public email; verify decision maker before sending.',
            },
          ];
        }),
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

const publicEmailOverrides = await loadPublicEmailOverrides();

const avenueTenantSourceSlugs = new Set([
  'clevens-face-and-body-specialist',
  'escapology',
  'sirocco-station',
  'viera-discovery-center',
  'nourish',
  'trader-joes',
  'j-crew-factory',
  'lets-plant-it',
  'tommy-bahama',
  'kendra-scott',
  'crumbl',
  'southern-tide',
  'air-anchor',
  'american-eagle',
  'aerie',
  'nordstrom-rack',
  'warby-parker',
  'viera-dental',
  'verizon-wireless',
  'urban-air-adventure-park',
  'tuscany-grill',
  'thai-hana',
  'talbots',
  'sur-la-table',
  'sunglass-hut',
  'steak-n-shake',
  'sport-clips',
  'spectrum',
  'soma',
  'sola-salons',
  'sleep-number-by-select-comfort',
  'skin-laundry',
  'sephora',
  'sally-beauty-supply',
  'playa-bowls',
  'pizza-gallery-grill',
  'pearle-vision',
  'paris-banh-mi',
  'panera-bread',
  'old-navy',
  'office-depot',
  'nothing-bundt-cakes',
  'moes-southwest-grill',
  'mens-wearhouse',
  'the-melting-pot',
  'massage-envy',
  'lululemon',
  'longhorn-steakhouse',
  'loft',
  'lilly-pulitzer',
  'lane-bryant',
  'kohls',
  'kirklands',
  'kay-jewelers',
  'j-mclaughlin',
  'the-good-feet-store',
  'gifts-more-at-the-paper-store',
  'five-guys-burgers-and-fries',
  'european-wax-center',
  'ethan-allen',
  'world-market',
  'cold-stone-creamery',
  'club-pilates',
  'chilis',
  'chicos',
  'burn-boot-camp',
  'books-a-million',
  'bonefish-grill',
  'belk',
  'bath-body-works',
  'att-wireless',
  'amc-theatres',
  'addy-rose-hair-studio',
  '7-senses-kids',
  '28-north-gastropub',
]);

const avenueSourceSlugOverrides = {
  'clevens-face-and-body-specialist': 'clevens-face-and-body-specialist-coming-soon',
};

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function csvEscape(value = '') {
  const text = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      field = '';
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const [headers, ...bodyRows] = rows;
  return bodyRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function headerSafe(value = '') {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function makeBody(prospect) {
  const claimUrl = `${prospect.conceptUrl}#claim`;
  return [
    `Hi ${prospect.business} team,`,
    '',
    `I built a free owner-review website concept for ${prospect.business} here:`,
    prospect.conceptUrl,
    '',
    `It is not public-indexed and it is not your official site. I made it to show what a clearer mobile-first local site could look like for ${prospect.category} customers.`,
    '',
    'The build itself is free. If you want to use it, EB28 can host and improve it for $98/month, including managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    `If you want me to tailor it with your real photos, menu/services, hours, and preferred contact path, email ${ownerEmail} with the best person to talk to or book a 10-minute review through the form here:`,
    claimUrl,
    '',
    'If this is not useful, reply "no thanks" and I will not follow up.',
    '',
    'Rich',
    'EB28',
    ownerEmail,
  ].join('\n');
}

function makeMailto(prospect) {
  if (!prospect.verifiedEmail) {
    return '';
  }

  const params = new URLSearchParams({
    subject: `Free website concept for ${prospect.business}`,
    body: makeBody(prospect),
  });

  return `mailto:${prospect.verifiedEmail}?${params.toString()}`;
}

function makeGmailComposeUrl({ to, subject, body }) {
  if (!to) {
    return '';
  }

  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

function makeProspectGmailComposeUrl(prospect) {
  return makeGmailComposeUrl({
    to: prospect.verifiedEmail,
    subject: `Free website concept for ${prospect.business}`,
    body: makeBody(prospect),
  });
}

function makePhoneScript(prospect) {
  const claimUrl = `${prospect.conceptUrl}#claim`;
  return [
    `Hi, this is Rich with EB28. Is this the right number for ${prospect.business}?`,
    '',
    `I built a free owner-review website concept for ${prospect.business}: ${prospect.conceptUrl}`,
    '',
    'It is not public-indexed and it is not their official site. I wanted to get it to the owner or manager who handles the website.',
    '',
    'The build is free. If they want to use it, EB28 can host and improve it for $98/month with managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    `Who is the best person to send it to, or is there a better time for a quick review call? They can also use the review form here: ${claimUrl}`,
  ].join('\n');
}

function makeEml(prospect) {
  const subject = `Free website concept for ${prospect.business}`;
  const lines = [
    `To: ${headerSafe(prospect.verifiedEmail)}`,
    `From: EB28 <${ownerEmail}>`,
    `Reply-To: ${ownerEmail}`,
    `Subject: ${headerSafe(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    `X-EB28-Concept: ${prospect.conceptUrl}`,
    '',
    makeBody(prospect),
    '',
  ];

  return `${lines.join('\r\n')}`;
}

function getEmailStats(directEmailProspects) {
  const groups = new Map();

  for (const prospect of directEmailProspects) {
    const key = prospect.verifiedEmail.trim().toLowerCase();
    if (!key) {
      continue;
    }
    const existing = groups.get(key) ?? {
      email: prospect.verifiedEmail,
      businesses: [],
      conceptUrls: [],
    };
    existing.businesses.push(prospect.business);
    existing.conceptUrls.push(prospect.conceptUrl);
    groups.set(key, existing);
  }

  const duplicateRecipientInboxes = [...groups.values()]
    .filter((group) => group.businesses.length > 1)
    .map((group) => ({
      email: group.email,
      businesses: group.businesses,
      conceptUrls: group.conceptUrls,
    }));

  return {
    draftCount: directEmailProspects.length,
    uniqueRecipientInboxes: groups.size,
    duplicateRecipientInboxes,
  };
}

function extractProspects(indexHtml) {
  const linkPattern = /<a href="\/32940\/([^"]+)\.html">([\s\S]*?)<br><small>([\s\S]*?)<\/small><\/a>/g;
  const prospects = [];
  let match;

  while ((match = linkPattern.exec(indexHtml)) !== null) {
    const [, slug, rawName, rawCategory] = match;
    const name = decodeHtml(rawName.trim());
    const category = decodeHtml(rawCategory.trim());
    prospects.push({ slug, name, category });
  }

  return prospects;
}

function mergeContactData(...contacts) {
  const merged = {
    sourceUrls: [],
  };

  for (const contact of contacts.filter(Boolean)) {
    for (const field of ['email', 'phone', 'address', 'website', 'sourceType', 'notes']) {
      if (!merged[field] && contact[field]) {
        merged[field] = contact[field];
      }
    }

    if (Array.isArray(contact.sourceUrls)) {
      merged.sourceUrls.push(...contact.sourceUrls);
    }
  }

  merged.sourceUrls = [...new Set(merged.sourceUrls)];
  return merged;
}

function withTracking(prospect, index) {
  const contact = verifiedContacts[prospect.slug] ?? mergeContactData(
    publicEmailOverrides[prospect.slug],
    callOrFormContacts[prospect.slug],
    replacementContacts[prospect.slug],
    avenueContactOverrides[prospect.slug],
  );
  const avenueSourceSlug = avenueSourceSlugOverrides[prospect.slug] ?? prospect.slug;
  const avenueTenantPage = avenueTenantSourceSlugs.has(prospect.slug)
    ? `https://www.avenueviera.com/tenants/${avenueSourceSlug}/`
    : '';
  const sourceUrls = contact.sourceUrls ?? (avenueTenantPage ? [avenueTenantPage] : []);
  const website = contact.website ?? avenueTenantPage;
  const hasDirectEmail = Boolean(contact.email);
  const hasContactPath = Boolean(website || contact.phone);
  const hasAvenueTenantFallback = Boolean(avenueTenantPage && !contact.email && !contact.phone && !contact.website);

  return {
    priority: index + 1,
    slug: prospect.slug,
    business: prospect.name,
    category: prospect.category,
    conceptUrl: `${conceptBaseUrl}${prospect.slug}.html`,
    verifiedEmail: contact.email ?? '',
    phone: contact.phone ?? '',
    address: contact.address ?? '',
    website,
    sourceType: contact.sourceType ?? (sourceUrls.length ? 'Avenue Viera tenant page' : ''),
    sourceUrls,
    outreachStage: hasDirectEmail ? 'draft_ready' : hasContactPath ? 'call_or_contact_form' : 'research_needed',
    nextAction: hasDirectEmail
      ? 'Create Gmail draft, then send after review'
      : hasContactPath
        ? hasAvenueTenantFallback
          ? 'Use the Avenue tenant page to find the tenant website, call path, or location contact before outreach'
          : 'Call or use official contact form with the same concept link'
        : 'Research official owner contact before outreach',
    lastTouch: '',
    nextTouch: today,
    bookedCallStatus: 'not_booked',
    bookedCallUrl: '',
    notes: contact.notes ?? (hasAvenueTenantFallback ? 'Avenue tenant page is the first verified contact route; confirm local decision maker before outreach.' : ''),
  };
}

async function loadExistingTrackerRows() {
  try {
    const trackerCsv = await fs.readFile(trackerPath, 'utf8');
    return parseCsv(trackerCsv);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function renderBookedCallTracker(prospects, existingRows = []) {
  const trackerHeaders = [
    'priority',
    'business',
    'stage',
    'status',
    'concept_url',
    'email',
    'phone',
    'website',
    'source_urls',
    'next_touch',
    'last_touch',
    'touch_count',
    'response_status',
    'booked_call_status',
    'booked_call_datetime',
    'booked_call_source',
    'booked_call_evidence',
    'owner_contact_name',
    'notes',
    'mailto',
    'gmail_compose_url',
  ];

  const existingByConcept = new Map(existingRows.map((row) => [row.concept_url, row]));
  const existingByBusiness = new Map(existingRows.map((row) => [slugify(row.business), row]));

  const rows = prospects.map((prospect) => {
    const existing = existingByConcept.get(prospect.conceptUrl) ?? existingByBusiness.get(slugify(prospect.business)) ?? {};
    const status = existing.status || 'not_started';
    const bookedCallStatus = existing.booked_call_status || prospect.bookedCallStatus || 'not_booked';
    const newlyActionable = existing.stage === 'research_needed' && prospect.outreachStage !== 'research_needed' && status === 'not_started';
    const routeChangedToVerifiedEmail = Boolean(prospect.verifiedEmail && existing.email !== prospect.verifiedEmail);
    const hasStaleGenericRouteNote = String(existing.notes || '').startsWith('Avenue tenant page is the first verified contact route');
    const routeNote = routeChangedToVerifiedEmail || hasStaleGenericRouteNote
      ? prospect.notes || existing.notes || ''
      : existing.notes || prospect.notes || '';
    const nextTouch = bookedCallStatus === 'booked' || status === 'not_interested'
      ? ''
      : newlyActionable
        ? today
        : existing.next_touch || prospect.nextTouch || today;

    return {
      priority: prospect.priority,
      business: prospect.business,
      stage: prospect.outreachStage,
      status,
      concept_url: prospect.conceptUrl,
      email: prospect.verifiedEmail,
      phone: prospect.phone,
      website: prospect.website,
      source_urls: prospect.sourceUrls,
      next_touch: nextTouch,
      last_touch: existing.last_touch || prospect.lastTouch || '',
      touch_count: existing.touch_count || '0',
      response_status: existing.response_status || '',
      booked_call_status: bookedCallStatus,
      booked_call_datetime: existing.booked_call_datetime || '',
      booked_call_source: existing.booked_call_source || '',
      booked_call_evidence: existing.booked_call_evidence || '',
      owner_contact_name: existing.owner_contact_name || '',
      notes: routeNote,
      mailto: makeMailto(prospect),
      gmail_compose_url: makeProspectGmailComposeUrl(prospect),
    };
  });

  return [
    trackerHeaders.join(','),
    ...rows.map((row) => trackerHeaders.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function firstAction(prospect) {
  if (prospect.verifiedEmail) {
    return 'email';
  }
  if (prospect.phone) {
    return 'call_then_contact_form';
  }
  return 'contact_form';
}

function day0Rows(prospects) {
  return prospects
    .filter((prospect) => prospect.outreachStage !== 'research_needed')
    .map((prospect) => {
      const source = inferOutreachSource(prospect);
      return {
        priority: prospect.priority,
        business: prospect.business,
        first_action: firstAction(prospect),
        stage: prospect.outreachStage,
        email: prospect.verifiedEmail,
        phone: prospect.phone,
        website: prospect.website,
        concept_url: prospect.conceptUrl,
        claim_url: `${prospect.conceptUrl}#claim`,
        subject: `Free website concept for ${prospect.business}`,
        message: makeBody(prospect),
        phone_script: makePhoneScript(prospect),
        mailto: makeMailto(prospect),
        gmail_compose_url: makeProspectGmailComposeUrl(prospect),
        record_contacted_command: makeContactedRecordCommand(prospect),
        record_booked_command: makeBookedRecordCommand(prospect),
        source,
      };
    });
}

function renderDay0ExportCsv(prospects) {
  const fields = [
    'priority',
    'business',
    'first_action',
    'stage',
    'email',
    'phone',
    'website',
    'concept_url',
    'claim_url',
    'subject',
    'message',
    'phone_script',
    'mailto',
    'gmail_compose_url',
    'record_contacted_command',
    'record_booked_command',
  ];
  const rows = day0Rows(prospects);

  return [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
  ].join('\n');
}

function renderDay0MessageBank(prospects) {
  const rows = day0Rows(prospects);
  const direct = rows.filter((row) => row.stage === 'draft_ready');
  const callOrForm = rows.filter((row) => row.stage === 'call_or_contact_form');
  const directBlocks = direct.flatMap((row) => [
    `### ${row.priority}. ${row.business}`,
    '',
    `- To: \`${row.email}\``,
    `- Subject: \`${row.subject}\``,
    `- Concept: ${row.concept_url}`,
    `- Claim form: ${row.claim_url}`,
    `- Mailto: ${row.mailto}`,
    `- Gmail compose: ${row.gmail_compose_url}`,
    '',
    'Message:',
    '',
    '```text',
    row.message,
    '```',
    '',
    'Record contacted command:',
    '',
    '```bash',
    row.record_contacted_command,
    '```',
    '',
    'Record booked command, after replacing placeholders with real scheduling evidence:',
    '',
    '```bash',
    row.record_booked_command,
    '```',
    '',
  ]);
  const callBlocks = callOrForm.flatMap((row) => [
    `### ${row.priority}. ${row.business}`,
    '',
    `- Phone: \`${row.phone || 'not found'}\``,
    `- Website/contact form: ${row.website || 'not found'}`,
    `- Concept: ${row.concept_url}`,
    `- Claim form: ${row.claim_url}`,
    '',
    'Phone script:',
    '',
    '```text',
    row.phone_script,
    '```',
    '',
    'Contact-form message:',
    '',
    '```text',
    row.message,
    '```',
    '',
    'Record contacted command:',
    '',
    '```bash',
    row.record_contacted_command,
    '```',
    '',
    'Record booked command, after replacing placeholders with real scheduling evidence:',
    '',
    '```bash',
    row.record_booked_command,
    '```',
    '',
  ]);

  return [
    '# 32940 Day-0 Outreach Message Bank',
    '',
    `Generated: ${today}`,
    '',
    'Use this file to execute day-0 outreach without inventing copy mid-call or mid-form. Every message points to the prospect-specific claim form on the free concept page, and a lead counts only after a specific call time is booked and logged with evidence.',
    '',
    '## Direct Email Queue',
    '',
    ...directBlocks,
    '## Call / Contact Form Queue',
    '',
    ...callBlocks,
  ].join('\n');
}

function renderDay0Workbench(prospects) {
  const rows = day0Rows(prospects);
  const cards = rows.map((row) => {
    const mail = row.mailto ? `<a class="btn primary" href="${escapeHtml(row.mailto)}">Open Email</a>` : '';
    const gmail = row.gmail_compose_url ? `<a class="btn primary" target="_blank" rel="noopener" href="${escapeHtml(row.gmail_compose_url)}">Open Gmail</a>` : '';
    const call = row.phone ? `<a class="btn" href="tel:${escapeHtml(row.phone)}">Call</a>` : '';
    const site = row.website ? `<a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.website)}">Contact Form</a>` : '';

    return `
      <article class="card" data-stage="${escapeHtml(row.stage)}" data-business="${escapeHtml(row.business.toLowerCase())}">
        <div class="topline"><span>#${escapeHtml(row.priority)}</span><span>${escapeHtml(row.first_action.replace(/_/g, ' '))}</span></div>
        <h2>${escapeHtml(row.business)}</h2>
        <p class="meta">${escapeHtml(row.stage.replace(/_/g, ' '))}</p>
        <div class="actions">
          <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.concept_url)}">Concept</a>
          <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.claim_url)}">Claim Form</a>
          ${gmail}
          ${mail}
          ${call}
          ${site}
        </div>
        <label>Subject <input readonly value="${escapeHtml(row.subject)}"></label>
        <label>Message <textarea readonly>${escapeHtml(row.message)}</textarea></label>
        <label>Phone Script <textarea readonly>${escapeHtml(row.phone_script)}</textarea></label>
        <label>Record contacted command <textarea class="command" readonly>${escapeHtml(row.record_contacted_command)}</textarea></label>
        <label>Record booked command <textarea class="command" readonly>${escapeHtml(row.record_booked_command)}</textarea></label>
        <p class="meta">Email: ${escapeHtml(row.email || 'not found')} - Phone: ${escapeHtml(row.phone || 'not found')}</p>
      </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EB28 32940 Day-0 Outreach Workbench</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#5d6678; --line:#d7dce7; --panel:#fff; --bg:#f6f7f9; --blue:#1957d2; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    header { position:sticky; top:0; z-index:2; padding:16px 20px; border-bottom:1px solid var(--line); background:rgba(255,255,255,.97); }
    h1 { margin:0; font-size:21px; letter-spacing:0; }
    .meta { color:var(--muted); font-size:13px; line-height:1.4; }
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; padding:14px 18px 0; }
    .toolbar input, .toolbar select { min-height:38px; padding:8px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); font:inherit; }
    main { display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:14px; padding:16px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .topline { display:flex; justify-content:space-between; color:var(--muted); font-size:12px; text-transform:uppercase; font-weight:750; }
    h2 { margin:0; font-size:18px; letter-spacing:0; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; }
    .btn { min-height:34px; padding:7px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); text-decoration:none; font-weight:700; display:inline-flex; align-items:center; }
    .btn.primary { background:var(--blue); border-color:var(--blue); color:#fff; }
    label { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted); font-weight:700; }
    input, textarea { width:100%; border:1px solid var(--line); border-radius:7px; padding:8px; color:var(--ink); background:#fbfcff; font:inherit; }
    textarea { min-height:150px; resize:vertical; font-size:12px; line-height:1.45; }
    textarea.command { min-height:74px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
  </style>
</head>
<body>
  <header>
    <h1>EB28 32940 Day-0 Outreach Workbench</h1>
    <div class="meta">${rows.length} actionable prospects - ${rows.filter((row) => row.stage === 'draft_ready').length} direct email - ${rows.filter((row) => row.stage === 'call_or_contact_form').length} call/contact form - generated ${today}</div>
    <div class="meta">Every message points to the prospect-specific claim form. Count a lead only after real booked-call evidence is logged.</div>
  </header>
  <div class="toolbar">
    <input id="search" placeholder="Search business or message">
    <select id="stage">
      <option value="">All routes</option>
      <option value="draft_ready">Direct email</option>
      <option value="call_or_contact_form">Call/form</option>
    </select>
  </div>
  <main>
    ${cards}
  </main>
  <script>
    const cards = [...document.querySelectorAll('.card')];
    function applyFilters() {
      const query = document.getElementById('search').value.toLowerCase();
      const stage = document.getElementById('stage').value;
      for (const card of cards) {
        const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
        const matchesStage = !stage || card.dataset.stage === stage;
        card.style.display = matchesQuery && matchesStage ? '' : 'none';
      }
    }
    document.getElementById('search').addEventListener('input', applyFilters);
    document.getElementById('stage').addEventListener('input', applyFilters);
  </script>
</body>
</html>`;
}

function renderMarkdown(prospects) {
  const direct = prospects.filter((prospect) => prospect.verifiedEmail);
  const callOrForm = prospects.filter((prospect) => !prospect.verifiedEmail && prospect.outreachStage === 'call_or_contact_form');
  const research = prospects.filter((prospect) => prospect.outreachStage === 'research_needed');
  const emailStats = getEmailStats(direct);

  const rows = prospects.map((prospect) => (
    `| ${prospect.priority} | ${prospect.business} | ${prospect.outreachStage} | ${prospect.verifiedEmail || prospect.phone || 'research'} | ${prospect.nextAction} | ${prospect.conceptUrl} |`
  ));

  const draftBlocks = direct.map((prospect) => (
    [
      `### ${prospect.business}`,
      `To: ${prospect.verifiedEmail}`,
      `Subject: Free website concept for ${prospect.business}`,
      '',
      '```text',
      makeBody(prospect),
      '```',
      '',
      `Sources: ${prospect.sourceUrls.join(', ')}`,
    ].join('\n')
  ));

  return [
    '# 32940 EB28 Lead Pipeline',
    '',
    `Generated: ${today}`,
    `Goal: 100 confirmed booked-call leads. Current confirmed booked-call leads from this file: 0.`,
    '',
    '## Status',
    '',
    `- Total deployed concepts: ${prospects.length}`,
    `- Direct-email outreach ready: ${emailStats.draftCount}`,
    `- Unique recipient inboxes: ${emailStats.uniqueRecipientInboxes}`,
    `- Call/contact-form ready: ${callOrForm.length}`,
    `- Research needed: ${research.length}`,
    '',
    '## Pipeline',
    '',
    '| # | Business | Stage | Contact | Next action | Concept |',
    '|---:|---|---|---|---|---|',
    ...rows,
    '',
    '## Direct Email Drafts',
    '',
    ...draftBlocks,
    '',
    '## Call / Contact Form Script',
    '',
    '```text',
    'Hi, this is Rich with EB28. I built a free owner-review website concept for your business. It is not your official site and it is not indexed publicly. I wanted to send it to the right person so they can decide whether it is useful.',
    '',
    'The concept link is: {{concept_url}}',
    '',
    'The build is free. If you want EB28 to host and improve it, Growth Hosting is $98/month and includes managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    'Who is the best person to review it?',
    '```',
    '',
    '## Notes',
    '',
    '- Do not send to unverified guessed addresses.',
    '- Treat a reply, booked calendar call, or completed form submission as a lead event.',
    '- Count only confirmed booked calls toward the 100-lead goal.',
  ].join('\n');
}

function markdownCell(value) {
  return String(Array.isArray(value) ? value.join('<br>') : (value ?? ''))
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shellQuote(value = '') {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function inferOutreachSource(prospect) {
  if (prospect.verifiedEmail) {
    return 'email';
  }
  if (prospect.phone) {
    return 'phone';
  }
  return 'contact_form';
}

function humanOutreachSource(source) {
  return source.replace(/_/g, ' ');
}

function makeRecordCommand(prospect, status, source, evidence, datetime = '') {
  const parts = [
    'npm run leadops:record:32940 --',
    '--priority',
    shellQuote(prospect.priority),
    '--status',
    shellQuote(status),
    '--source',
    shellQuote(source),
  ];

  if (datetime) {
    parts.push('--datetime', shellQuote(datetime));
  }

  parts.push('--evidence', shellQuote(evidence));
  return parts.join(' ');
}

function makeStatePatch(prospect, status, source, evidence, datetime = '') {
  return JSON.stringify({
    [String(prospect.priority)]: {
      status,
      evidence,
      source,
      datetime,
    },
  }, null, 2);
}

function makeContactedEvidence(prospect) {
  const routeSource = inferOutreachSource(prospect);
  const routeLabel = humanOutreachSource(routeSource);
  return `Manual ${routeLabel} outreach completed for ${prospect.business}; waiting for reply.`;
}

function makeBookedEvidenceTemplate(prospect) {
  return `Reply or calendar evidence confirms a booked review call for ${prospect.business} at YYYY-MM-DD HH:MM ET.`;
}

function makeContactedRecordCommand(prospect) {
  const routeSource = inferOutreachSource(prospect);
  return makeRecordCommand(
    prospect,
    'contacted',
    routeSource,
    makeContactedEvidence(prospect),
  );
}

function makeBookedRecordCommand(prospect) {
  const routeSource = inferOutreachSource(prospect);
  return makeRecordCommand(
    prospect,
    'booked',
    routeSource,
    makeBookedEvidenceTemplate(prospect),
    'YYYY-MM-DD HH:MM ET',
  );
}

function makeContactedStatePatch(prospect) {
  const routeSource = inferOutreachSource(prospect);
  return makeStatePatch(prospect, 'contacted', routeSource, makeContactedEvidence(prospect));
}

function makeBookedStatePatchTemplate(prospect) {
  const routeSource = inferOutreachSource(prospect);
  return makeStatePatch(
    prospect,
    'booked',
    routeSource,
    makeBookedEvidenceTemplate(prospect),
    'YYYY-MM-DD HH:MM ET',
  );
}

function makeFollowUpRecordCommand(prospect, day) {
  const routeSource = inferOutreachSource(prospect);
  const routeLabel = humanOutreachSource(routeSource);
  return makeRecordCommand(
    prospect,
    'follow_up',
    routeSource,
    `Manual Day ${day} ${routeLabel} follow-up completed for ${prospect.business}; waiting for reply.`,
  );
}

const followUpSteps = [
  {
    day: 2,
    label: 'Right reviewer',
    subjectPrefix: 'Quick follow-up',
    body(prospect) {
      const claimUrl = `${prospect.conceptUrl}#claim`;
      return [
        `Hi ${prospect.business} team,`,
        '',
        `Quick follow-up on the free owner-review website concept I built for ${prospect.business}:`,
        prospect.conceptUrl,
        '',
        'I am mainly trying to get it to the right person so they can decide whether it is useful. It is not public-indexed and it is not your official site.',
        '',
        `If someone wants me to tailor it with real photos, services, hours, or the preferred contact path, they can email ${ownerEmail} or use the review form:`,
        claimUrl,
        '',
        'If this is not useful, reply "no thanks" and I will close the loop.',
        '',
        'Rich',
        'EB28',
        ownerEmail,
      ].join('\n');
    },
  },
  {
    day: 5,
    label: 'Proof and offer',
    subjectPrefix: 'Website concept plus hosting',
    body(prospect) {
      const claimUrl = `${prospect.conceptUrl}#claim`;
      return [
        `Hi ${prospect.business} team,`,
        '',
        `I wanted to resend the free concept link for ${prospect.business}:`,
        prospect.conceptUrl,
        '',
        'The build is free. If you want to use it, EB28 can host and improve it for $98/month. That includes managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
        '',
        `The page is meant to show what a clearer mobile-first local site could look like for ${prospect.category} customers.`,
        '',
        `If you want it adjusted or want to talk through whether it is worth using, email ${ownerEmail} or use the 10-minute review form:`,
        claimUrl,
        '',
        'Rich',
        'EB28',
        ownerEmail,
      ].join('\n');
    },
  },
  {
    day: 10,
    label: 'Close loop',
    subjectPrefix: 'Closing the loop',
    body(prospect) {
      const claimUrl = `${prospect.conceptUrl}#claim`;
      return [
        `Hi ${prospect.business} team,`,
        '',
        `Last note from me on the free website concept for ${prospect.business}:`,
        prospect.conceptUrl,
        '',
        'I will leave it alone unless the owner or manager wants it adjusted, removed, or hosted.',
        '',
        'If you do want to use it, Growth Hosting is $98/month and includes hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
        '',
        'The review form is here:',
        claimUrl,
        '',
        'If this is not useful, reply "no thanks" and I will not follow up again.',
        '',
        'Rich',
        'EB28',
        ownerEmail,
      ].join('\n');
    },
  },
];

function makeFollowUpMailto(prospect, step) {
  if (!prospect.verifiedEmail) {
    return '';
  }

  const params = new URLSearchParams({
    subject: `${step.subjectPrefix}: ${prospect.business}`,
    body: step.body(prospect),
  });

  return `mailto:${prospect.verifiedEmail}?${params.toString()}`;
}

function makeFollowUpGmailComposeUrl(prospect, step) {
  return makeGmailComposeUrl({
    to: prospect.verifiedEmail,
    subject: `${step.subjectPrefix}: ${prospect.business}`,
    body: step.body(prospect),
  });
}

function followUpRows(prospects) {
  return prospects
    .filter((prospect) => prospect.outreachStage !== 'research_needed')
    .flatMap((prospect) => followUpSteps.map((step) => ({
      priority: prospect.priority,
      business: prospect.business,
      day: step.day,
      sequence_label: step.label,
      route: prospect.outreachStage,
      email: prospect.verifiedEmail,
      phone: prospect.phone,
      website: prospect.website,
      concept_url: prospect.conceptUrl,
      claim_url: `${prospect.conceptUrl}#claim`,
      subject: `${step.subjectPrefix}: ${prospect.business}`,
      message: step.body(prospect),
      mailto: makeFollowUpMailto(prospect, step),
      gmail_compose_url: makeFollowUpGmailComposeUrl(prospect, step),
      record_follow_up_command: makeFollowUpRecordCommand(prospect, step.day),
      record_booked_command: makeBookedRecordCommand(prospect),
    })));
}

function renderFollowUpSequenceCsv(prospects) {
  const fields = [
    'priority',
    'business',
    'day',
    'sequence_label',
    'route',
    'email',
    'phone',
    'website',
    'concept_url',
    'claim_url',
    'subject',
    'message',
    'mailto',
    'gmail_compose_url',
    'record_follow_up_command',
    'record_booked_command',
  ];
  const rows = followUpRows(prospects);

  return [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
  ].join('\n');
}

function renderFollowUpSequenceMarkdown(prospects) {
  const rows = followUpRows(prospects);
  const byDay = new Map(followUpSteps.map((step) => [step.day, rows.filter((row) => row.day === step.day)]));
  const blocks = [];

  for (const step of followUpSteps) {
    blocks.push(`## Day ${step.day}: ${step.label}`, '');
    for (const row of byDay.get(step.day)) {
      blocks.push(
        `### ${row.priority}. ${row.business}`,
        '',
        `- Route: ${row.route.replace(/_/g, ' ')}`,
        `- To: \`${row.email || 'call/contact form'}\``,
        `- Subject: \`${row.subject}\``,
        `- Concept: ${row.concept_url}`,
        `- Claim form: ${row.claim_url}`,
        row.mailto ? `- Mailto: ${row.mailto}` : '- Mailto: not available',
        row.gmail_compose_url ? `- Gmail compose: ${row.gmail_compose_url}` : '- Gmail compose: not available',
        '',
        'Message:',
        '',
        '```text',
        row.message,
        '```',
        '',
        'Record follow-up command:',
        '',
        '```bash',
        row.record_follow_up_command,
        '```',
        '',
        'Record booked command, after replacing placeholders with real scheduling evidence:',
        '',
        '```bash',
        row.record_booked_command,
        '```',
        '',
      );
    }
  }

  return [
    '# 32940 Follow-Up Sequence',
    '',
    `Generated: ${today}`,
    '',
    'Use this after day-0 outreach. These are templates only: run a follow-up command after an actual follow-up touch, and run a booked command only after a real scheduled call time, calendar link, or equivalent evidence exists.',
    '',
    ...blocks,
  ].join('\n');
}

function renderFollowUpWorkbench(prospects) {
  const rows = followUpRows(prospects);
  const cards = rows.map((row) => {
    const mail = row.mailto ? `<a class="btn primary" href="${escapeHtml(row.mailto)}">Open Email</a>` : '';
    const gmail = row.gmail_compose_url ? `<a class="btn primary" target="_blank" rel="noopener" href="${escapeHtml(row.gmail_compose_url)}">Open Gmail</a>` : '';
    const call = row.phone ? `<a class="btn" href="tel:${escapeHtml(row.phone)}">Call</a>` : '';
    const site = row.website ? `<a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.website)}">Contact Form</a>` : '';

    return `
      <article class="card" data-day="${escapeHtml(row.day)}" data-route="${escapeHtml(row.route)}" data-business="${escapeHtml(row.business.toLowerCase())}">
        <div class="topline"><span>#${escapeHtml(row.priority)}</span><span>Day ${escapeHtml(row.day)} - ${escapeHtml(row.sequence_label)}</span></div>
        <h2>${escapeHtml(row.business)}</h2>
        <p class="meta">${escapeHtml(row.route.replace(/_/g, ' '))}</p>
        <div class="actions">
          <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.concept_url)}">Concept</a>
          <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.claim_url)}">Claim Form</a>
          ${gmail}
          ${mail}
          ${call}
          ${site}
        </div>
        <label>Subject <input readonly value="${escapeHtml(row.subject)}"></label>
        <label>Message <textarea readonly>${escapeHtml(row.message)}</textarea></label>
        <label>Record follow-up command <textarea class="command" readonly>${escapeHtml(row.record_follow_up_command)}</textarea></label>
        <label>Record booked command <textarea class="command" readonly>${escapeHtml(row.record_booked_command)}</textarea></label>
        <p class="meta">Email: ${escapeHtml(row.email || 'not found')} - Phone: ${escapeHtml(row.phone || 'not found')}</p>
      </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EB28 32940 Follow-Up Workbench</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#5d6678; --line:#d7dce7; --panel:#fff; --bg:#f6f7f9; --blue:#1957d2; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    header { position:sticky; top:0; z-index:2; padding:16px 20px; border-bottom:1px solid var(--line); background:rgba(255,255,255,.97); }
    h1 { margin:0; font-size:21px; letter-spacing:0; }
    .meta { color:var(--muted); font-size:13px; line-height:1.4; }
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; padding:14px 18px 0; }
    .toolbar input, .toolbar select { min-height:38px; padding:8px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); font:inherit; }
    main { display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:14px; padding:16px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .topline { display:flex; justify-content:space-between; color:var(--muted); font-size:12px; text-transform:uppercase; font-weight:750; }
    h2 { margin:0; font-size:18px; letter-spacing:0; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; }
    .btn { min-height:34px; padding:7px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); text-decoration:none; font-weight:700; display:inline-flex; align-items:center; }
    .btn.primary { background:var(--blue); border-color:var(--blue); color:#fff; }
    label { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted); font-weight:700; }
    input, textarea { width:100%; border:1px solid var(--line); border-radius:7px; padding:8px; color:var(--ink); background:#fbfcff; font:inherit; }
    textarea { min-height:150px; resize:vertical; font-size:12px; line-height:1.45; }
    textarea.command { min-height:74px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
  </style>
</head>
<body>
  <header>
    <h1>EB28 32940 Follow-Up Workbench</h1>
    <div class="meta">${rows.length} follow-up templates - ${followUpSteps.map((step) => `Day ${step.day}`).join(', ')} - generated ${today}</div>
    <div class="meta">Run follow-up commands only after real follow-up touches. Booked commands require real scheduling evidence.</div>
  </header>
  <div class="toolbar">
    <input id="search" placeholder="Search business or message">
    <select id="day">
      <option value="">All days</option>
      ${followUpSteps.map((step) => `<option value="${step.day}">Day ${step.day}</option>`).join('')}
    </select>
    <select id="route">
      <option value="">All routes</option>
      <option value="draft_ready">Direct email</option>
      <option value="call_or_contact_form">Call/form</option>
    </select>
  </div>
  <main>
    ${cards}
  </main>
  <script>
    const cards = [...document.querySelectorAll('.card')];
    function applyFilters() {
      const query = document.getElementById('search').value.toLowerCase();
      const day = document.getElementById('day').value;
      const route = document.getElementById('route').value;
      for (const card of cards) {
        const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
        const matchesDay = !day || card.dataset.day === day;
        const matchesRoute = !route || card.dataset.route === route;
        card.style.display = matchesQuery && matchesDay && matchesRoute ? '' : 'none';
      }
    }
    document.getElementById('search').addEventListener('input', applyFilters);
    document.getElementById('day').addEventListener('input', applyFilters);
    document.getElementById('route').addEventListener('input', applyFilters);
  </script>
</body>
</html>`;
}

function renderManualOutreachCommandCenter(prospects, emailStats) {
  const direct = prospects.filter((prospect) => prospect.verifiedEmail);
  const callOrForm = prospects.filter((prospect) => !prospect.verifiedEmail && prospect.outreachStage === 'call_or_contact_form');
  const auditCommand = 'npm run leadops:audit:32940 -- --write';
  const rows = prospects
    .filter((prospect) => prospect.outreachStage !== 'research_needed')
    .map((prospect) => {
      const mailto = makeMailto(prospect);
      const gmailComposeUrl = makeProspectGmailComposeUrl(prospect);
      const subject = `Free website concept for ${prospect.business}`;
      const body = makeBody(prospect);
      const contactedCommand = makeContactedRecordCommand(prospect);
      const bookedCommand = makeBookedRecordCommand(prospect);
      const contactedPatch = makeContactedStatePatch(prospect);
      const bookedPatch = makeBookedStatePatchTemplate(prospect);
      const phoneScript = makePhoneScript(prospect);
      const primaryAction = prospect.verifiedEmail
        ? `<a class="btn primary" target="_blank" rel="noopener" href="${escapeHtml(gmailComposeUrl)}">Open Gmail</a><a class="btn" href="${escapeHtml(mailto)}">Open Mail App</a>`
        : '<span class="pill">Call/Form</span>';
      const phoneAction = prospect.phone ? `<a class="btn" href="tel:${escapeHtml(prospect.phone)}">Call</a>` : '';
      const websiteAction = prospect.website ? `<a class="btn" target="_blank" rel="noopener" href="${escapeHtml(prospect.website)}">Website/Form</a>` : '';

      return `
        <article class="card" data-stage="${escapeHtml(prospect.outreachStage)}" data-priority="${escapeHtml(prospect.priority)}" data-business="${escapeHtml(prospect.business.toLowerCase())}">
          <div class="topline"><span>#${prospect.priority}</span><span class="state-label">${escapeHtml(prospect.outreachStage.replace(/_/g, ' '))}</span></div>
          <h2>${escapeHtml(prospect.business)}</h2>
          <p class="meta">${escapeHtml(prospect.category)}</p>
          <div class="actions">
            <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(prospect.conceptUrl)}">Concept</a>
            ${primaryAction}
            ${phoneAction}
            ${websiteAction}
            <button class="btn mark-touched" type="button" data-priority="${escapeHtml(prospect.priority)}">Mark touched</button>
          </div>
          <dl>
            <div><dt>Email</dt><dd>${escapeHtml(prospect.verifiedEmail || 'not available')}</dd></div>
            <div><dt>Phone</dt><dd>${escapeHtml(prospect.phone || 'not available')}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(prospect.sourceUrls.join(' | ') || prospect.sourceType || 'n/a')}</dd></div>
          </dl>
          <label>Subject <input readonly value="${escapeHtml(subject)}"></label>
          <label>Message <textarea readonly>${escapeHtml(body)}</textarea></label>
          <label>Phone/contact-form script <textarea readonly>${escapeHtml(phoneScript)}</textarea></label>
          <div class="actions">
            <button class="btn" type="button" data-copy-target="contacted-patch-${escapeHtml(prospect.priority)}">Copy contacted patch</button>
            <button class="btn" type="button" data-copy-target="contacted-command-${escapeHtml(prospect.priority)}">Copy contacted command</button>
            <button class="btn" type="button" data-copy-target="booked-command-${escapeHtml(prospect.priority)}">Copy booked command</button>
          </div>
          <label>Contacted state patch <textarea id="contacted-patch-${escapeHtml(prospect.priority)}" class="command" readonly>${escapeHtml(contactedPatch)}</textarea></label>
          <label>Record contacted command <textarea class="command" readonly>${escapeHtml(contactedCommand)}</textarea></label>
          <label class="sr-label">Record contacted command copy source <textarea id="contacted-command-${escapeHtml(prospect.priority)}" class="command compact" readonly>${escapeHtml(contactedCommand)}</textarea></label>
          <label>Booked state patch template <textarea class="command" readonly>${escapeHtml(bookedPatch)}</textarea></label>
          <label>Record booked command <textarea id="booked-command-${escapeHtml(prospect.priority)}" class="command" readonly>${escapeHtml(bookedCommand)}</textarea></label>
        </article>`;
    });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EB28 32940 Manual Outreach Command Center</title>
  <style>
    :root { color-scheme: light; --bg:#f6f7f9; --panel:#fff; --ink:#172033; --muted:#5d6678; --line:#d7dce7; --blue:#1957d2; --green:#137a45; --amber:#9a5b00; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    header { position:sticky; top:0; z-index:2; padding:16px 18px; border-bottom:1px solid var(--line); background:rgba(255,255,255,.97); }
    h1 { margin:0; font-size:21px; letter-spacing:0; }
    .summary { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
    .metric { min-width:130px; padding:9px 11px; border:1px solid #cfdbff; border-radius:8px; background:#eef3ff; }
    .metric strong { display:block; font-size:22px; }
    .metric span, .meta { color:var(--muted); font-size:12px; line-height:1.35; }
    .notice { margin-top:10px; color:#344054; font-size:13px; }
    .audit-command { margin-top:10px; max-width:760px; }
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; padding:14px 18px 0; }
    input, select, textarea { border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); font:inherit; }
    .toolbar input, .toolbar select { min-height:38px; padding:8px 10px; }
    main { display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:14px; padding:14px 18px 18px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .topline { display:flex; justify-content:space-between; color:var(--muted); font-size:12px; text-transform:uppercase; font-weight:750; }
    h2 { margin:0; font-size:18px; letter-spacing:0; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; }
    .btn, .pill { min-height:34px; padding:7px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); text-decoration:none; font-weight:700; display:inline-flex; align-items:center; cursor:pointer; }
    .btn.primary { background:var(--blue); border-color:var(--blue); color:#fff; }
    .btn.copied { border-color:var(--green); color:var(--green); }
    .pill { color:var(--amber); background:#fff8e6; border-color:#f1d08a; }
    .card.is-touched { border-color:#9ad0b1; background:#f7fff9; }
    .card.is-touched .state-label::after { content:" - touched this session"; color:var(--green); }
    dl { margin:0; display:grid; gap:6px; font-size:12px; }
    dt { color:var(--muted); font-weight:800; text-transform:uppercase; }
    dd { margin:2px 0 0; overflow-wrap:anywhere; }
    label { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted); font-weight:800; }
    label input, textarea { width:100%; padding:8px; color:var(--ink); }
    textarea { min-height:128px; resize:vertical; font-size:12px; line-height:1.45; }
    textarea.command { min-height:74px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
    textarea.compact { min-height:48px; }
    .sr-label { position:absolute; left:-10000px; width:1px; height:1px; overflow:hidden; }
  </style>
</head>
<body>
  <header>
    <h1>EB28 32940 Manual Outreach Command Center</h1>
    <div class="summary">
      <div class="metric"><strong>${prospects.length}</strong><span>total prospects</span></div>
      <div class="metric"><strong>${direct.length}</strong><span>direct-email drafts</span></div>
      <div class="metric"><strong>${emailStats.uniqueRecipientInboxes}</strong><span>unique inboxes</span></div>
      <div class="metric"><strong>${callOrForm.length}</strong><span>call/form targets</span></div>
      <div class="metric"><strong id="sessionTouchedCount">0</strong><span>touched this session</span></div>
    </div>
    <p class="notice">Manual fallback while Gmail/SMTP auth is unavailable. After a real outreach touch, run the contacted command. After a real reply, calendar link, or scheduled call time, replace the booked placeholders and run the booked command, then write the audit.</p>
    <label class="audit-command">Apply audit command <textarea class="command" readonly>${escapeHtml(auditCommand)}</textarea></label>
    <label class="audit-command">Session touched priorities <textarea id="sessionTouchedOutput" class="command" readonly></textarea></label>
  </header>
  <div class="toolbar">
    <input id="search" placeholder="Search business or source">
    <select id="stage">
      <option value="">All routes</option>
      <option value="draft_ready">Direct email</option>
      <option value="call_or_contact_form">Call/form</option>
    </select>
  </div>
  <main id="cards">
    ${rows.join('\n')}
  </main>
  <script>
    const cards = [...document.querySelectorAll('.card')];
    const touchedKey = 'eb28-32940-manual-command-center-touched';
    let touched = new Set(JSON.parse(localStorage.getItem(touchedKey) || '[]'));

    function saveTouched() {
      const values = [...touched].sort((a, b) => Number(a) - Number(b));
      localStorage.setItem(touchedKey, JSON.stringify(values));
      document.getElementById('sessionTouchedCount').textContent = String(values.length);
      document.getElementById('sessionTouchedOutput').value = values.join(', ');
      for (const card of cards) {
        card.classList.toggle('is-touched', touched.has(card.dataset.priority));
      }
    }

    async function copyFromTarget(targetId, button) {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.focus();
      target.select();
      try {
        await navigator.clipboard.writeText(target.value);
      } catch {
        document.execCommand('copy');
      }
      const originalText = button.textContent;
      button.textContent = 'Copied';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 1400);
    }

    function applyFilters() {
      const query = document.getElementById('search').value.toLowerCase();
      const stage = document.getElementById('stage').value;
      for (const card of cards) {
        const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
        const matchesStage = !stage || card.dataset.stage === stage;
        card.style.display = matchesQuery && matchesStage ? '' : 'none';
      }
    }
    document.getElementById('search').addEventListener('input', applyFilters);
    document.getElementById('stage').addEventListener('input', applyFilters);
    document.querySelectorAll('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', () => copyFromTarget(button.dataset.copyTarget, button));
    });
    document.querySelectorAll('.mark-touched').forEach((button) => {
      button.addEventListener('click', () => {
        touched.add(button.dataset.priority);
        saveTouched();
      });
    });
    saveTouched();
  </script>
</body>
</html>`;
}

function renderCallContactQueue(prospects) {
  const direct = prospects.filter((prospect) => prospect.verifiedEmail);
  const callOrForm = prospects.filter((prospect) => !prospect.verifiedEmail && prospect.outreachStage === 'call_or_contact_form');
  const research = prospects.filter((prospect) => prospect.outreachStage === 'research_needed');
  const emailStats = getEmailStats(direct);
  const actionable = direct.length + callOrForm.length;
  const callRows = callOrForm.map((prospect) => (
    `| ${prospect.priority} | ${markdownCell(prospect.business)} | ${markdownCell(prospect.phone)} | ${markdownCell(prospect.website)} | ${markdownCell(prospect.conceptUrl)} | ${markdownCell(prospect.sourceUrls)} |`
  ));
  const researchRows = research.map((prospect) => (
    `| ${prospect.priority} | ${markdownCell(prospect.business)} | ${markdownCell(prospect.website || prospect.sourceUrls)} | Research official owner or manager contact before outreach |`
  ));

  return [
    '# 32940 EB28 Call and Contact-Form Queue',
    '',
    `Generated: ${today}`,
    '',
    `Total prospects: ${prospects.length}`,
    `Actionable now: ${actionable}`,
    `Direct-email ready: ${emailStats.draftCount}`,
    `Unique recipient inboxes: ${emailStats.uniqueRecipientInboxes}`,
    `Call/contact-form ready: ${callOrForm.length}`,
    `Research needed: ${research.length}`,
    'Confirmed booked-call leads: 0',
    '',
    '## Call / Contact Form Ready',
    '',
    '| # | Business | Phone | Website | Concept | Source |',
    '|---:|---|---|---|---|---|',
    ...callRows,
    '',
    '## Research Needed',
    '',
    '| # | Business | Current source | Next action |',
    '|---:|---|---|---|',
    ...researchRows,
    '',
    '## Contact Form Script',
    '',
    '```text',
    'Hi, this is Rich with EB28. I built a free owner-review website concept for your business:',
    '{{concept_url}}',
    '',
    'It is not public-indexed and it is not your official website. The build itself is free. If you want to use it, EB28 can host and improve it for $98/month with managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    'Who is the best person to review it?',
    '```',
    '',
    '## Counting Rule',
    '',
    'Count a lead only after evidence includes a real booked call, calendar link, scheduled call time, or equivalent proof.',
  ].join('\n');
}

function renderDispatchReadinessMarkdown(prospects, draftManifest, emailStats) {
  const callOrForm = prospects.filter((prospect) => !prospect.verifiedEmail && prospect.outreachStage === 'call_or_contact_form');
  const research = prospects.filter((prospect) => prospect.outreachStage === 'research_needed');
  const duplicateRows = emailStats.duplicateRecipientInboxes.map((group) => (
    `| ${markdownCell(group.email)} | ${markdownCell(group.businesses)} | ${markdownCell(group.conceptUrls)} |`
  ));
  const topDraftRows = draftManifest.slice(0, 25).map((draft, index) => (
    `| ${index + 1} | ${markdownCell(draft.business)} | ${markdownCell(draft.to)} | ${markdownCell(draft.file)} | ${markdownCell(draft.conceptUrl)} |`
  ));
  const duplicateSection = duplicateRows.length
    ? ['| Inbox | Businesses | Concepts |', '|---|---|---|', ...duplicateRows]
    : ['None.'];

  return [
    '# 32940 Dispatch Readiness',
    '',
    `Generated: ${today}`,
    '',
    '## Summary',
    '',
    `- Total prospects: ${prospects.length}`,
    `- Local .eml draft files: ${draftManifest.length}`,
    `- Unique recipient inboxes: ${emailStats.uniqueRecipientInboxes}`,
    `- Duplicate recipient inbox groups: ${emailStats.duplicateRecipientInboxes.length}`,
    `- Call/contact-form targets remaining: ${callOrForm.length}`,
    `- Research-needed targets remaining: ${research.length}`,
    `- Sender header: EB28 <${ownerEmail}>`,
    `- Reply-To header: ${ownerEmail}`,
    '',
    '## Send Gate',
    '',
    '- Send only through an authenticated mailbox authorized to send as `social@eb28.co`.',
    '- Do not count a sent draft as a booked-call lead.',
    '- Count a prospect only after a real booked call, calendar link, scheduled call time, or equivalent evidence is logged.',
    '',
    '## Duplicate Recipient Groups',
    '',
    ...duplicateSection,
    '',
    '## First 25 Draft Files',
    '',
    '| # | Business | To | File | Concept |',
    '|---:|---|---|---|---|',
    ...topDraftRows,
  ].join('\n');
}

async function main() {
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  const prospects = extractProspects(indexHtml).map(withTracking);
  const existingTrackerRows = await loadExistingTrackerRows();

  if (prospects.length < minimumProspectCount) {
    throw new Error(`Expected at least ${minimumProspectCount} prospect pages from ${indexPath}, found ${prospects.length}.`);
  }

  await fs.mkdir(outDir, { recursive: true });

  const csvHeaders = [
    'priority',
    'slug',
    'business',
    'category',
    'conceptUrl',
    'verifiedEmail',
    'phone',
    'address',
    'website',
    'sourceType',
    'sourceUrls',
    'outreachStage',
    'nextAction',
    'lastTouch',
    'nextTouch',
    'bookedCallStatus',
    'bookedCallUrl',
    'notes',
  ];

  const csv = [
    csvHeaders.join(','),
    ...prospects.map((prospect) => csvHeaders.map((header) => csvEscape(prospect[header])).join(',')),
  ].join('\n');

  await fs.writeFile(path.join(outDir, '32940-prospect-pipeline.csv'), `${csv}\n`);
  await fs.writeFile(path.join(outDir, '32940-prospect-pipeline.json'), `${JSON.stringify({ generatedAt: today, prospects }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, '32940-outreach-drafts.md'), `${renderMarkdown(prospects)}\n`);
  await fs.writeFile(path.join(outDir, '32940-call-contact-queue.md'), `${renderCallContactQueue(prospects)}\n`);
  await fs.writeFile(trackerPath, `${renderBookedCallTracker(prospects, existingTrackerRows)}\n`);

  const draftsDir = path.join(outDir, 'drafts');
  const directEmailProspects = prospects.filter((prospect) => prospect.verifiedEmail);
  const emailStats = getEmailStats(directEmailProspects);
  await fs.rm(draftsDir, { recursive: true, force: true });
  await fs.mkdir(draftsDir, { recursive: true });

  const draftManifest = [];
  for (const prospect of directEmailProspects) {
    const filename = `${String(prospect.priority).padStart(2, '0')}-${slugify(prospect.business)}.eml`;
    const filePath = path.join(draftsDir, filename);
    await fs.writeFile(filePath, makeEml(prospect));
    draftManifest.push({
      business: prospect.business,
      to: prospect.verifiedEmail,
      subject: `Free website concept for ${prospect.business}`,
      file: path.relative(repoRoot, filePath),
      conceptUrl: prospect.conceptUrl,
      sourceUrls: prospect.sourceUrls,
    });
  }

  const callOrForm = prospects.filter((prospect) => !prospect.verifiedEmail && prospect.outreachStage === 'call_or_contact_form');
  const research = prospects.filter((prospect) => prospect.outreachStage === 'research_needed');
  const dispatchReadiness = {
    generatedAt: today,
    ownerEmail,
    totalProspects: prospects.length,
    localDraftFiles: draftManifest.length,
    uniqueRecipientInboxes: emailStats.uniqueRecipientInboxes,
    duplicateRecipientInboxes: emailStats.duplicateRecipientInboxes,
    callContactFormTargets: callOrForm.length,
    researchNeededTargets: research.length,
    sendPrerequisites: [
      'Use an authenticated mailbox authorized to send as social@eb28.co.',
      'Do not count a sent draft as a booked-call lead.',
      'Log real booked-call evidence before counting a prospect toward the 100-lead goal.',
    ],
  };

  await fs.writeFile(
    path.join(outDir, '32940-local-draft-manifest.json'),
    `${JSON.stringify({ generatedAt: today, drafts: draftManifest }, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-dispatch-readiness.json'),
    `${JSON.stringify(dispatchReadiness, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-dispatch-readiness.md'),
    `${renderDispatchReadinessMarkdown(prospects, draftManifest, emailStats)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-day0-outreach-export.csv'),
    `${renderDay0ExportCsv(prospects)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-day0-message-bank.md'),
    `${renderDay0MessageBank(prospects)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-day0-outreach-workbench.html'),
    renderDay0Workbench(prospects),
  );
  await fs.writeFile(
    path.join(outDir, '32940-follow-up-sequence.csv'),
    `${renderFollowUpSequenceCsv(prospects)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-follow-up-sequence.md'),
    `${renderFollowUpSequenceMarkdown(prospects)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, '32940-follow-up-workbench.html'),
    renderFollowUpWorkbench(prospects),
  );
  await fs.writeFile(
    path.join(outDir, '32940-manual-outreach-command-center.html'),
    renderManualOutreachCommandCenter(prospects, emailStats),
  );

  console.log(`Wrote ${prospects.length} prospects to ${path.relative(repoRoot, outDir)}`);
  console.log(`${directEmailProspects.length} direct-email drafts ready`);
  console.log(`${emailStats.uniqueRecipientInboxes} unique recipient inboxes ready`);
  console.log(`Wrote ${draftManifest.length} local .eml drafts to ${path.relative(repoRoot, draftsDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
