#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content', 'eb28');
const ARTICLES_FILE = path.join(CONTENT_DIR, 'articles.json');
const BACKLOG_FILE = path.join(CONTENT_DIR, 'topic-backlog.json');
const STATE_FILE = path.join(CONTENT_DIR, 'content-state.json');
const OUTPUT_DIR = path.join(ROOT, 'output', 'eb28-social');

const CLUSTER_INTERNAL_LINKS = {
  'local-seo': [
    {
      label: 'Local SEO map pack checklist for Melbourne FL',
      href: '/blog/local-seo-map-pack-melbourne-fl/',
      reason: 'Connects Google visibility work to the map-pack signals buyers and search engines both see.',
    },
    {
      label: 'Google Business Profile website builder checklist',
      href: '/blog/google-business-profile-website-builder-melbourne/',
      reason: 'Shows how the website and Google profile should support the same local buying intent.',
    },
    {
      label: 'Melbourne Web Studio lead leak quiz',
      href: '/melbournewebstudio/#quiz',
      reason: 'Turns local-search research into a low-friction conversion path.',
    },
  ],
  'melbourne-web-design': [
    {
      label: 'Melbourne FL web design cost guide',
      href: '/blog/melbourne-fl-web-design-cost-guide-2026/',
      reason: 'Helps comparison-stage buyers understand scope, price, and what a serious website should include.',
    },
    {
      label: 'Website conversion checklist for Melbourne FL',
      href: '/blog/website-conversion-checklist-melbourne-fl/',
      reason: 'Links design decisions to calls, bookings, quote requests, and form completion.',
    },
    {
      label: 'Melbourne Web Studio lead leak quiz',
      href: '/melbournewebstudio/#quiz',
      reason: 'Moves ready buyers from research into a practical first-fix recommendation.',
    },
  ],
  conversion: [
    {
      label: 'Website conversion checklist for Melbourne FL',
      href: '/blog/website-conversion-checklist-melbourne-fl/',
      reason: 'Gives visitors a deeper diagnostic path for above-the-fold clarity, proof, forms, and follow-up.',
    },
    {
      label: 'AI lead follow-up for local service businesses',
      href: '/blog/ai-lead-follow-up-local-service-business/',
      reason: 'Connects page conversion improvements to faster lead handling after the form is submitted.',
    },
    {
      label: 'Melbourne Web Studio lead leak quiz',
      href: '/melbournewebstudio/#quiz',
      reason: 'Converts the conversion problem into a specific next step.',
    },
  ],
  'lead-automation': [
    {
      label: 'AI lead follow-up for local service businesses',
      href: '/blog/ai-lead-follow-up-local-service-business/',
      reason: 'Connects automation ideas to the buyer moments where slow replies lose work.',
    },
    {
      label: 'Website conversion checklist for Melbourne FL',
      href: '/blog/website-conversion-checklist-melbourne-fl/',
      reason: 'Shows how the page and follow-up path need to work together.',
    },
    {
      label: 'Recon Agent founder beta',
      href: '/reconcile/',
      reason: 'Links operational automation readers into a concrete EB28 product path.',
    },
  ],
  'private-ai': [
    {
      label: 'Private AI infrastructure for small businesses',
      href: '/blog/private-ai-infrastructure-small-business/',
      reason: 'Keeps AI infrastructure readers connected to the secure, practical implementation cluster.',
    },
    {
      label: 'AI lead follow-up for local service businesses',
      href: '/blog/ai-lead-follow-up-local-service-business/',
      reason: 'Shows where private AI can support lead intake without replacing human judgment.',
    },
    {
      label: 'EB28 private AI and app development homepage',
      href: '/',
      reason: 'Moves technical readers toward the core EB28 service path.',
    },
  ],
};

const CLUSTER_MESSAGING = {
  'local-seo': {
    buyerProblem:
      'The buyer is invisible until the moment they need help. If the business does not show up in local search, the job usually goes to whoever looks safest on Google first.',
    firstFix:
      'Start by lining up the Google Business Profile, homepage promise, service content, reviews, citations, and contact path so they all tell the same local story.',
    system:
      'The compounding loop is simple: publish the useful page, submit it, inspect it, watch query movement, then strengthen the page that is already earning impressions.',
    bullets: [
      'Match the page title to the exact local buying question',
      'Add one proof point above the fold and one local FAQ below it',
      'Link from the homepage, Melbourne Web Studio page, and related local SEO articles',
      'Queue one legitimate citation or partner mention for the same cluster',
    ],
  },
  'melbourne-web-design': {
    buyerProblem:
      'The buyer is not shopping for a prettier website. They are trying to avoid wasting money on another site that looks fine but does not bring in calls, quote requests, or bookings.',
    firstFix:
      'Start with the first screen: a clear offer, local relevance, visible proof, fast mobile loading, and one obvious next step.',
    system:
      'The durable build treats the website as the hub. Every article, Google profile signal, citation, and follow-up message should send buyers back to a page that can convert.',
    bullets: [
      'Answer price, timeline, trust, and local-fit objections before the contact form',
      'Use internal links from EB28 and Melbourne Web Studio into the newest buying guides',
      'Keep page speed and mobile layout stable before adding visual polish',
      'Make the quiz or project brief easier to start than a generic contact form',
    ],
  },
  conversion: {
    buyerProblem:
      'The buyer may already be visiting the site. The leak happens when they cannot quickly understand the offer, trust the business, or see what to do next.',
    firstFix:
      'Start by removing friction: sharpen the headline, move proof closer to the CTA, simplify the form, and make the follow-up promise specific.',
    system:
      'Conversion work compounds when every page gets measured, linked, refreshed, and tied to a lead path that responds before the buyer cools off.',
    bullets: [
      'Put the strongest proof near the first CTA',
      'Keep forms short and make phone optional when email-first follow-up is the promise',
      'Add internal links from pages with traffic into the newest conversion pages',
      'Review Search Console positions 4-20 for pages that need better titles or FAQs',
    ],
  },
  'lead-automation': {
    buyerProblem:
      'The buyer does not only need more leads. They need fewer missed opportunities after someone asks for help.',
    firstFix:
      'Start with the handoff after the form: confirmation, qualification, routing, reminders, and a fast human reply when the lead is worth it.',
    system:
      'Automation should support the sale without pretending to be the whole relationship. The best system captures intent, follows up quickly, and keeps the owner in control.',
    bullets: [
      'Map what happens in the first five minutes after a lead comes in',
      'Separate simple FAQs from high-value consult requests',
      'Link automation articles back to the website conversion checklist',
      'Track source page and intent so follow-up can match the buyer problem',
    ],
  },
  'private-ai': {
    buyerProblem:
      'The buyer wants AI speed without handing sensitive business data to tools they do not control.',
    firstFix:
      'Start with one narrow workflow: documents, SOPs, client history, finance review, or staff search. Build the private path before adding more moving parts.',
    system:
      'Private AI earns trust when access, data boundaries, retrieval quality, logging, and human review are planned before the first prompt is written.',
    bullets: [
      'Define which data can be used and which data stays out',
      'Use private retrieval for documents that should not be pasted into public tools',
      'Connect private AI pages to lead automation only where the workflow is clear',
      'Use official citations and practical examples instead of hype',
    ],
  },
};

function getClusterMessaging(cluster) {
  return CLUSTER_MESSAGING[cluster] || CLUSTER_MESSAGING.conversion;
}

function parseArgs(argv) {
  const options = {
    write: false,
    slot: 'auto',
    date: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--write') {
      options.write = true;
    } else if (arg === '--slot') {
      options.slot = next || 'auto';
      index += 1;
    } else if (arg === '--date') {
      options.date = next || null;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/eb28-content-engine.mjs [--write] [--slot am|pm|auto] [--date YYYY-MM-DD]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function easternParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function resolveSlot(slot) {
  if (slot === 'am' || slot === 'pm') return slot;
  return easternParts().hour < 12 ? 'am' : 'pm';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 82);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function chooseTopic(backlog, articles, runId) {
  const usedSlugs = new Set(articles.map((article) => article.slug));
  const usedKeywords = new Set(articles.map((article) => String(article.primaryKeyword || '').toLowerCase()));
  const available = backlog.filter((topic) => {
    const slug = slugify(topic.title);
    const keyword = String(topic.primaryKeyword || '').toLowerCase();
    return !usedSlugs.has(slug) && !usedKeywords.has(keyword);
  });

  if (!available.length) {
    const fallbackIndex = Math.abs([...runId].reduce((total, char) => total + char.charCodeAt(0), 0)) % backlog.length;
    const topic = backlog[fallbackIndex] || {
      cluster: 'organic-growth',
      primaryKeyword: 'organic lead generation system',
      title: `Organic Lead Generation System Update ${runId}`,
      angle: 'daily operational improvement',
      intent: 'commercial',
    };
    return {
      ...topic,
      title: `${topic.title} (${runId})`,
    };
  }

  return available[0];
}

function buildInternalLinks(article) {
  const fallbackLinks = [
    {
      label: 'Website conversion checklist for Melbourne FL',
      href: '/blog/website-conversion-checklist-melbourne-fl/',
      reason: 'Connects the topic to the page changes most likely to create more qualified enquiries.',
    },
    {
      label: 'Local SEO map pack checklist for Melbourne FL',
      href: '/blog/local-seo-map-pack-melbourne-fl/',
      reason: 'Keeps organic-growth content tied to the strongest local-search cluster.',
    },
    {
      label: 'Melbourne Web Studio lead leak quiz',
      href: '/melbournewebstudio/#quiz',
      reason: 'Gives ready buyers a practical next step instead of a generic contact form.',
    },
  ];

  const links = [...(CLUSTER_INTERNAL_LINKS[article.cluster] || fallbackLinks), ...fallbackLinks];
  const seen = new Set();
  return links
    .filter((link) => link.href !== `/blog/${article.slug}/`)
    .filter((link) => {
      if (seen.has(link.href)) return false;
      seen.add(link.href);
      return true;
    })
    .slice(0, 4);
}

function buildArticle(topic, { date, slot, runId }) {
  const slug = slugify(topic.title);
  const clusterLabel = String(topic.cluster || 'organic-growth').replace(/-/g, ' ');
  const keyword = topic.primaryKeyword || topic.title;
  const angle = topic.angle || 'practical implementation';
  const messaging = getClusterMessaging(topic.cluster || 'organic-growth');
  const article = {
    slug,
    title: topic.title,
    description: `${topic.title} for business owners who want clearer search visibility, better buyer trust, and a website path that turns interest into real enquiries.`,
    cluster: topic.cluster || 'organic-growth',
    primaryKeyword: keyword,
    datePublished: date,
    dateModified: date,
    author: 'EB28',
    heroLabel: slot === 'am' ? 'Morning growth brief' : 'Evening growth brief',
    sourceRunId: runId,
    summary: `A plain-English ${slot.toUpperCase()} growth brief for the ${clusterLabel} cluster, focused on ${angle} and the first fix most likely to create qualified leads.`,
    sections: [
      {
        heading: 'Why this search matters',
        body: [
          `Someone searching for "${keyword}" is usually closer to a buying decision than a research rabbit hole. They want to know what to fix, who to trust, and whether the next step is worth their time.`,
          messaging.buyerProblem,
        ],
        bullets: [
          'Answer the question in the first few lines',
          'Use the same phrase a real buyer would use',
          'Show what a serious fix includes',
          'Give the reader a direct next step instead of a vague contact prompt',
        ],
      },
      {
        heading: 'What to fix first',
        body: [
          messaging.firstFix,
          'Do not bury the fix inside a giant redesign. A small improvement to a page that already gets impressions can beat a bigger project that never ships.',
        ],
        bullets: messaging.bullets,
      },
      {
        heading: 'How EB28 turns it into a system',
        body: [
          messaging.system,
          'That loop is what the EB28 automation runs daily. It keeps content production, technical SEO, internal links, Search Console checks, and reporting tied to the same ranking goal.',
        ],
        bullets: [
          'Publish two content updates daily at 6 AM and 6 PM Eastern',
          'Run a daily SEO review after the evening content cycle',
          'Inspect the newest URLs and pull actual query average position when Search Console credentials are available',
          'Send a report to social@eb28.co when email credentials are configured'
        ],
      },
    ],
    faqs: [
      {
        question: `How does "${keyword}" help organic leads?`,
        answer:
          'It helps when the page answers a real buying question, links to a relevant service path, loads quickly, and includes enough proof for a visitor to take action.',
      },
      {
        question: 'How often should this page be reviewed?',
        answer:
          'Review it after Search Console has enough data, then refresh titles, intros, FAQs, citations, and internal links when the page is gaining impressions but sitting below page one.',
      },
    ],
    citations: [
      {
        label: 'Google Search Central: SEO Starter Guide',
        url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
      {
        label: 'Google Search Central: Ask Google to recrawl URLs',
        url: 'https://developers.google.com/search/docs/advanced/crawling/ask-google-to-recrawl',
      },
    ],
    relatedSlugs: [
      'local-seo-map-pack-melbourne-fl',
      'website-conversion-checklist-melbourne-fl',
      'melbourne-fl-web-design-cost-guide-2026',
    ].filter((relatedSlug) => relatedSlug !== slug),
  };

  return {
    ...article,
    internalLinks: buildInternalLinks(article),
  };
}

function buildSocialPackage(article, { date, slot, runId }) {
  const url = `https://eb28.co/blog/${article.slug}/`;
  return {
    brand: 'EB28',
    generatedAt: new Date().toISOString(),
    runId,
    slot,
    article: {
      title: article.title,
      url,
      cluster: article.cluster,
      primaryKeyword: article.primaryKeyword,
    },
    posts: {
      blog: {
        title: article.title,
        url,
        status: 'ready_for_build_and_deploy',
      },
      facebook: {
        caption: `${article.title}\n\nA practical guide for local businesses that want more qualified organic leads, stronger search visibility, and a faster path from visitor to customer.\n\nRead it: ${url}`,
        status: 'ready_to_publish',
      },
      instagram: {
        caption: `${article.primaryKeyword}: the practical version.\n\nWe broke down what to fix first, how to connect it to real lead flow, and what EB28 checks daily to keep search growth moving.\n\nRead the full guide at eb28.co/blog/`,
        creativeBrief:
          'Carousel: Slide 1 problem statement, Slide 2 what to fix first, Slide 3 technical SEO checks, Slide 4 internal links, Slide 5 CTA to project brief.',
        status: 'ready_to_publish_when_eb28_social_channel_is_configured',
      },
      x: {
        caption: `${article.title}\n\nThe key: connect the search intent to a page that is fast, useful, internally linked, and measured in Search Console.\n\n${url}`,
        status: 'ready_to_publish',
      },
      linkedin: {
        caption: `New EB28 growth brief: ${article.title}\n\nThis covers the practical SEO and conversion fixes that turn a business website into a more reliable organic lead path.\n\n${url}`,
        status: 'ready_to_publish',
      },
    },
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const slot = resolveSlot(options.slot);
  const date = options.date || easternParts().date;
  const runId = `${date}-${slot}`;

  const [articles, backlog, state] = await Promise.all([
    readJson(ARTICLES_FILE, []),
    readJson(BACKLOG_FILE, []),
    readJson(STATE_FILE, { runs: [] }),
  ]);

  const existingRun = (state.runs || []).find((run) => run.runId === runId);
  if (existingRun) {
    const result = {
      ok: true,
      status: 'already_completed',
      runId,
      article: existingRun.article,
      reportPath: existingRun.reportPath || null,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const topic = chooseTopic(backlog, articles, runId);
  const article = buildArticle(topic, { date, slot, runId });
  const socialPackage = buildSocialPackage(article, { date, slot, runId });
  const reportPath = path.join(OUTPUT_DIR, `eb28-content-${runId}.json`);

  const result = {
    ok: true,
    status: options.write ? 'written' : 'dry_run',
    runId,
    article: {
      slug: article.slug,
      title: article.title,
      url: `https://eb28.co/blog/${article.slug}/`,
      cluster: article.cluster,
      primaryKeyword: article.primaryKeyword,
    },
    socialPackagePath: reportPath,
  };

  if (options.write) {
    const nextArticles = [article, ...articles];
    const nextState = {
      ...state,
      updatedAt: new Date().toISOString(),
      runs: [
        {
          runId,
          date,
          slot,
          createdAt: new Date().toISOString(),
          article: result.article,
          reportPath,
        },
        ...(state.runs || []),
      ].slice(0, 120),
    };

    await writeJson(ARTICLES_FILE, nextArticles);
    await writeJson(STATE_FILE, nextState);
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await writeJson(reportPath, socialPackage);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
