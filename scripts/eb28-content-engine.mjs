#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  CONTENT_QUALITY_VERSION,
  analyzeArticleQuality,
  analyzeSocialPackage,
  normalizeKeyword,
} from './lib/eb28-content-quality.mjs';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content', 'eb28');
const ARTICLES_FILE = path.join(CONTENT_DIR, 'articles.json');
const BACKLOG_FILE = path.join(CONTENT_DIR, 'topic-backlog.json');
const STATE_FILE = path.join(CONTENT_DIR, 'content-state.json');
const SOCIAL_FEATURES_FILE = path.join(CONTENT_DIR, 'social-features.json');
const OUTPUT_RELATIVE_DIR = path.join('output', 'eb28-social');
const OUTPUT_DIR = path.join(ROOT, OUTPUT_RELATIVE_DIR);
const DEFAULT_REFRESH_COOLDOWN_DAYS = Number.parseInt(process.env.EB28_REFRESH_COOLDOWN_DAYS || '21', 10);

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

const CLUSTER_QUALITY_DETAILS = {
  'local-seo': {
    audience:
      'owners and marketing leads at Melbourne and Space Coast businesses that need qualified local visibility, not a vanity ranking report',
    diagnostics: [
      'Confirm the Google Business Profile name, categories, hours, service area, and landing-page destination are accurate',
      'Compare the search promise in the profile with the headline and proof on the linked page',
      'Review whether local reviews, citations, and on-site location details agree instead of creating mixed signals',
      'Check the actual enquiry path on a phone before adding another directory listing or blog post',
    ],
    metrics: [
      'Qualified calls, forms, bookings, and direction requests tied to the target service',
      'Search Console impressions, clicks, click-through rate, and average position for the target query and page',
      'Business Profile discovery actions and the landing pages that receive those visits',
      'Indexing, canonical, internal-link, and conversion-path health for the page being promoted',
    ],
    boundaries: [
      'Do not buy links, create fake locations, or stuff city names into copy that does not help a buyer',
      'Do not promise a ranking position or treat a temporary map movement as durable demand',
      'Keep business information consistent and document who owns profile, domain, analytics, and directory access',
      'Make one measurable improvement at a time so the result can be reviewed honestly',
    ],
    citations: [
      {
        label: 'Google Search Central: SEO Starter Guide',
        url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
      {
        label: 'Google Business Profile Help: improve local ranking',
        url: 'https://support.google.com/business/answer/7091',
      },
      {
        label: 'Google Search Central: LocalBusiness structured data',
        url: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
      },
    ],
    socialHook: 'Local visibility improves when the profile, website, proof, and enquiry path tell the same story.',
    visualDirection: 'Use a local-search diagnostic board: profile signal, landing page, proof, and enquiry path connected in one clear flow.',
  },
  'melbourne-web-design': {
    audience:
      'Melbourne and Brevard County owners comparing a redesign, a new website, or a local web partner and trying to avoid another attractive site that does not convert',
    diagnostics: [
      'Open the page on a real phone and ask whether the offer, location, proof, and next step are clear before scrolling',
      'Check loading, interaction, and layout stability with field data where it exists and lab data for diagnosis',
      'Trace every primary call to action through confirmation and follow-up instead of stopping at the button',
      'Confirm the business controls its domain, analytics, content, forms, and source files before signing a rebuild contract',
    ],
    metrics: [
      'Qualified project briefs, booked conversations, and completed forms by landing page',
      'Mobile conversion rate and form completion rate, reviewed with enough volume to avoid false conclusions',
      'Core Web Vitals, broken interactions, accessibility defects, and layout regressions on priority templates',
      'Search impressions and clicks for the service-and-location queries each page is meant to answer',
    ],
    boundaries: [
      'Do not hide ownership, hosting, analytics, or maintenance terms behind a design-only proposal',
      'Do not trade readable type, contrast, keyboard access, or stable mobile layout for visual novelty',
      'Do not rebuild pages that already perform until the actual leak has been measured',
      'Keep the scope tied to a buyer problem, a measurable path, and a clear handoff plan',
    ],
    citations: [
      {
        label: 'web.dev: Web Vitals',
        url: 'https://web.dev/articles/vitals',
      },
      {
        label: 'W3C Web Accessibility Initiative: WCAG overview',
        url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
      },
      {
        label: 'Google Search Central: SEO Starter Guide',
        url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
    ],
    socialHook: 'A website should make the next decision easier on a phone, not merely look impressive in a desktop mockup.',
    visualDirection: 'Show a mobile-first before-and-after with offer clarity, proof, one primary action, and a clean follow-up path.',
  },
  conversion: {
    audience:
      'small-business owners who already have traffic or referrals but are losing buyers between the first page view and a completed enquiry',
    diagnostics: [
      'Read the first screen as a new buyer and identify the offer, audience, proof, and next step without using insider knowledge',
      'Review analytics and form events for the exact point where visitors hesitate or leave',
      'Test the full path on mobile, including validation, confirmation, routing, and response expectations',
      'Separate traffic problems from message, trust, usability, and follow-up problems before changing the page',
    ],
    metrics: [
      'Completed qualified enquiries rather than button clicks or raw sessions alone',
      'Form starts, validation failures, completions, and time to the first useful response',
      'Conversion rate by landing page, device class, source, and buyer intent when sample size supports it',
      'Search Console query/page movement for pages that were changed to match clearer intent',
    ],
    boundaries: [
      'Do not manufacture urgency, testimonials, scarcity, or performance claims',
      'Do not add fields unless each one changes qualification, routing, or the next conversation',
      'Do not call a higher click rate a business win unless qualified enquiries also improve',
      'Keep accessibility, privacy, and a clear human escalation path inside the conversion design',
    ],
    citations: [
      {
        label: 'web.dev: Web Vitals',
        url: 'https://web.dev/articles/vitals',
      },
      {
        label: 'W3C Web Accessibility Initiative: WCAG overview',
        url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
      },
      {
        label: 'Google Search Central: SEO Starter Guide',
        url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
    ],
    socialHook: 'More traffic will not repair a page that makes the offer, proof, form, or follow-up hard to trust.',
    visualDirection: 'Map the conversion path as four panels: promise, proof, action, and response, with one friction point called out in each.',
  },
  'lead-automation': {
    audience:
      'service-business owners and operators who need faster lead handling without handing pricing, qualification, or relationship decisions to an unsupervised bot',
    diagnostics: [
      'Map the first five minutes after an enquiry and identify where ownership or context is lost',
      'Separate deterministic confirmations and routing from conversations that require judgment',
      'List every data field, system permission, failure mode, and human escalation before connecting tools',
      'Review consent, sender identity, opt-out handling, logs, and error recovery for every automated message',
    ],
    metrics: [
      'Time to acknowledgement and time to a useful human response for qualified leads',
      'Routing accuracy, duplicate-message rate, failed handoffs, and leads that required manual recovery',
      'Appointments or qualified conversations created without increasing complaints or opt-outs',
      'Source-page and intent data preserved from the first enquiry through the CRM record',
    ],
    boundaries: [
      'Keep pricing exceptions, legal commitments, high-value qualification, and sensitive disputes with an accountable person',
      'Use accurate sender information and honor channel-specific consent and opt-out requirements',
      'Fail closed when identity, destination, permission, or required lead context cannot be verified',
      'Log the automation decision and make it easy for staff to correct or take over the conversation',
    ],
    citations: [
      {
        label: 'NIST: Artificial Intelligence Risk Management Framework',
        url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      },
      {
        label: 'NIST: Privacy Framework',
        url: 'https://www.nist.gov/privacy-framework',
      },
      {
        label: 'FTC: CAN-SPAM compliance guide for business',
        url: 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business',
      },
    ],
    socialHook: 'Good lead automation shortens the wait while keeping consequential decisions and exceptions accountable to a person.',
    visualDirection: 'Use a lead-handoff timeline that separates automatic confirmation, routing, human review, and follow-up measurement.',
  },
  'private-ai': {
    audience:
      'small-business owners and technical leads evaluating private AI for documents or internal workflows without weakening access control, privacy, or human oversight',
    diagnostics: [
      'Choose one narrow job and document the data, users, permissions, answer standard, and failure cost',
      'Classify what may enter the system, what must stay out, and how deletion or correction will work',
      'Test retrieval quality and citation traceability before adding actions or broader access',
      'Review model, hosting, logging, vendor, backup, and incident-response boundaries as one system',
    ],
    metrics: [
      'Answer usefulness and citation accuracy on a representative evaluation set',
      'Unsupported-answer rate, access-control failures, stale-document retrieval, and human correction rate',
      'Time saved on the chosen workflow after review time and exception handling are included',
      'Adoption by the intended staff without unauthorized data movement or shadow workflows',
    ],
    boundaries: [
      'Do not place sensitive data into a workflow until access, retention, logging, and vendor boundaries are documented',
      'Do not give the system write access or external actions merely because read-only answers look useful',
      'Require citations and human review for answers that affect customers, money, compliance, or safety',
      'Keep an evaluation set and rollback path so a model or document change can be checked before release',
    ],
    citations: [
      {
        label: 'NIST: Artificial Intelligence Risk Management Framework',
        url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      },
      {
        label: 'NIST: Privacy Framework',
        url: 'https://www.nist.gov/privacy-framework',
      },
      {
        label: 'OWASP: Top 10 for Large Language Model Applications',
        url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      },
    ],
    socialHook: 'Private AI starts with a narrow job, explicit data boundaries, cited answers, and a person who owns the exceptions.',
    visualDirection: 'Diagram a private-AI workflow from approved documents to retrieval, cited answer, human review, and logged correction.',
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
    forceRefresh: false,
    refreshCooldownDays: Number.isFinite(DEFAULT_REFRESH_COOLDOWN_DAYS)
      ? DEFAULT_REFRESH_COOLDOWN_DAYS
      : 21,
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
    } else if (arg === '--force-refresh') {
      options.forceRefresh = true;
    } else if (arg === '--refresh-cooldown-days') {
      options.refreshCooldownDays = Number.parseInt(next || '', 10);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/eb28-content-engine.mjs [--write] [--slot am|pm|auto] [--date YYYY-MM-DD] [--force-refresh] [--refresh-cooldown-days N]',
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.refreshCooldownDays) || options.refreshCooldownDays < 0) {
    throw new Error('--refresh-cooldown-days must be a non-negative integer.');
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

function dateToUtcDay(value) {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysSince(value, currentDate) {
  const earlier = dateToUtcDay(value);
  const current = dateToUtcDay(currentDate);
  if (!earlier || !current) return Number.POSITIVE_INFINITY;
  return Math.floor((current.getTime() - earlier.getTime()) / 86_400_000);
}

function selectContentPlan(backlog, articles, { date, forceRefresh, refreshCooldownDays }) {
  if (!Array.isArray(backlog) || !backlog.length) {
    throw new Error('The EB28 topic backlog is empty. Add a researched, non-overlapping topic before publishing.');
  }

  const articlesByKeyword = new Map();
  for (const article of articles) {
    const keyword = normalizeKeyword(article.primaryKeyword);
    if (!keyword) continue;
    const matches = articlesByKeyword.get(keyword) || [];
    matches.push(article);
    articlesByKeyword.set(keyword, matches);
  }

  const duplicateKeyword = [...articlesByKeyword.entries()].find(([, matches]) => matches.length > 1);
  if (duplicateKeyword) {
    throw new Error(
      `Duplicate primary keyword detected before generation: "${duplicateKeyword[0]}" appears on ${duplicateKeyword[1]
        .map((article) => article.slug)
        .join(', ')}. Collapse the duplicates before continuing.`,
    );
  }

  const usedSlugs = new Set(articles.map((article) => article.slug));
  const available = backlog.find((topic) => {
    const keyword = normalizeKeyword(topic.primaryKeyword);
    return !usedSlugs.has(slugify(topic.title)) && !articlesByKeyword.has(keyword);
  });

  if (available) {
    return {
      operation: 'create',
      topic: available,
      existingArticle: null,
      daysSinceRefresh: null,
    };
  }

  const refreshCandidates = backlog
    .map((topic, index) => {
      const existingArticle = articlesByKeyword.get(normalizeKeyword(topic.primaryKeyword))?.[0] || null;
      if (!existingArticle) return null;
      const modified = existingArticle.dateModified || existingArticle.datePublished || '1970-01-01';
      return {
        topic,
        existingArticle,
        modified,
        age: daysSince(modified, date),
        index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.modified).localeCompare(String(b.modified)) || a.index - b.index);

  if (!refreshCandidates.length) {
    throw new Error(
      'Every backlog topic is unavailable and none maps to a canonical article. Add a researched unique topic instead of creating a dated fallback slug.',
    );
  }

  const selected = refreshCandidates[0];
  if (!forceRefresh && selected.age < refreshCooldownDays) {
    return {
      operation: 'no_change',
      topic: selected.topic,
      existingArticle: selected.existingArticle,
      daysSinceRefresh: selected.age,
      refreshCooldownDays,
    };
  }

  return {
    operation: 'refresh',
    topic: selected.topic,
    existingArticle: selected.existingArticle,
    daysSinceRefresh: selected.age,
    refreshCooldownDays,
  };
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

function getClusterQualityDetails(cluster) {
  return CLUSTER_QUALITY_DETAILS[cluster] || CLUSTER_QUALITY_DETAILS.conversion;
}

function buildDescription(keyword) {
  const candidates = [
    `A practical ${keyword} guide: what to fix first, what to measure, and how to turn the work into more qualified enquiries without wasted effort.`,
    `Learn ${keyword}: the priorities, proof, measurements, and safeguards that create a clearer path from buyer interest to qualified enquiries.`,
    `${keyword} explained for business owners: first fixes, useful measurements, avoidable risks, and a practical path to better enquiries.`,
    `${keyword}: priorities, proof, measurement, safeguards, and a clearer path from search visibility to qualified enquiries.`,
  ];
  const selected = candidates.find((candidate) => candidate.length >= 110 && candidate.length <= 170);
  if (!selected) {
    throw new Error(`Unable to build a 110-170 character meta description for "${keyword}".`);
  }
  return selected;
}

function buildArticle(topic, { date, slot, runId, existingArticle = null }) {
  const cluster = topic.cluster || existingArticle?.cluster || 'conversion';
  const keyword = topic.primaryKeyword || existingArticle?.primaryKeyword || topic.title;
  const angle = topic.angle || existingArticle?.contentAngle || 'practical implementation';
  const messaging = getClusterMessaging(cluster);
  const details = getClusterQualityDetails(cluster);
  const existingTitle = existingArticle?.title || '';
  const title = normalizeKeyword(existingTitle).includes(normalizeKeyword(keyword)) ? existingTitle : topic.title;
  const slug = existingArticle?.slug || slugify(topic.title);
  const description = buildDescription(keyword);
  const article = {
    ...(existingArticle || {}),
    contentVersion: CONTENT_QUALITY_VERSION,
    slug,
    title,
    description,
    cluster,
    primaryKeyword: keyword,
    contentIntent: topic.intent || existingArticle?.contentIntent || 'commercial',
    contentAngle: angle,
    audience: details.audience,
    datePublished: existingArticle?.datePublished || date,
    dateModified: date,
    author: 'EB28',
    heroLabel: 'Practical growth guide',
    sourceRunId: runId,
    summary: `${keyword} works best when the page or workflow answers a real buyer question, removes one measurable source of friction, and keeps ownership clear. This guide is for ${details.audience}. It explains the first fixes, a 30-day implementation sequence, the measurements that matter, and the boundaries that protect trust.`,
    sections: [
      {
        heading: `Quick answer: ${keyword}`,
        body: [
          `${keyword} is not a single tactic or software purchase. It is a focused improvement process built around ${angle}. The useful version begins with a specific buyer problem, identifies the smallest change that can solve it, and connects that change to a page or workflow where a qualified person can take the next step.`,
          `For ${details.audience}, the goal is not more activity for its own sake. The goal is a clearer decision path with evidence that the right people can find it, understand it, trust it, and complete the next step. That means search visibility, usability, proof, follow-up, and measurement have to support the same promise.`,
        ],
        bullets: [
          `Define the exact buyer question behind "${keyword}" before changing copy or tools`,
          'Name the one business outcome the work is supposed to improve',
          'Document the current path from discovery through enquiry and response',
          'Ship the smallest testable improvement, then inspect the result before expanding scope',
        ],
      },
      {
        heading: 'Start with the buyer and the real constraint',
        body: [
          `${messaging.buyerProblem} A useful audit therefore starts with the moment a buyer becomes uncertain: the search result, first screen, proof section, form, automated reply, or internal handoff. The visible symptom may be low traffic or weak conversion, but the constraint is often a mismatch between the promise and the experience that follows it.`,
          `Write down what the buyer is trying to decide, what evidence would reduce risk, and what should happen after the next action. Then compare that ideal path with the live one on a phone and in the operating systems behind it. This prevents a design, SEO, or automation project from optimizing the wrong step simply because it is easy to count.`,
        ],
        bullets: details.diagnostics,
      },
      {
        heading: 'What to fix first and what to leave alone',
        body: [
          `${messaging.firstFix} Keep the first release narrow enough to review. A focused change to an existing page or handoff is easier to validate than a large rebuild, and it creates a cleaner signal about whether the original diagnosis was correct. Preserve what already works until evidence shows that it is part of the problem.`,
          `Prioritize clarity, trust, accessibility, ownership, and recovery before visual polish or additional automation. If the reader cannot tell what is offered, the system cannot explain why it made a decision, or the team cannot recover a failed handoff, adding another channel usually increases noise. The best first fix makes the next decision easier for both the buyer and the operator.`,
        ],
        bullets: messaging.bullets,
      },
      {
        heading: `A practical 30-day ${keyword} plan`,
        body: [
          `Use the first month to create one controlled learning loop instead of a backlog of disconnected tasks. Start with a baseline, make one coherent set of changes, verify that the live experience matches the plan, and wait for enough evidence to judge direction. Keep a short decision log so later refreshes build on what was learned rather than repeating the same audit.`,
          `The plan should fit the amount of traffic and operational data available. A small local business may need qualitative review plus a few weeks of search and enquiry signals; a higher-volume page can support faster comparisons. In either case, avoid declaring a win from one metric, one day, or a lab test that does not reflect real buyers.`,
        ],
        bullets: [
          'Week 1: capture the current page or workflow, baseline useful metrics, and list the top buyer objections',
          'Week 2: implement the smallest coherent fix, including copy, proof, links, accessibility, tracking, and handoff details',
          'Week 3: verify production on mobile and desktop, test the full enquiry path, and correct broken or ambiguous states',
          'Week 4: review qualified outcomes, Search Console or operational signals, user questions, and the next highest-confidence improvement',
        ],
      },
      {
        heading: 'Measure outcomes instead of publishing activity',
        body: [
          `A publish event is not the outcome. For ${keyword}, measurement should connect discoverability and experience to a qualified business action. Review the page or workflow as a system: whether the right audience arrived, whether the promise matched their need, whether the action completed, and whether the team responded with the context required to continue.`,
          `Use precise labels and keep source limits visible. Search Console reports search performance, analytics reports observed behavior, form or CRM records report submitted intent, and staff feedback explains exceptions. None of those sources alone proves revenue impact. Read them together, state what is unavailable, and make the next decision from confirmed evidence rather than a persuasive dashboard.`,
        ],
        bullets: details.metrics,
      },
      {
        heading: 'Keep the system useful, safe, and accountable',
        body: [
          `${messaging.system} The system stays useful when every change has an owner, a reason, a validation step, and a rollback path. That discipline matters most when a workflow touches customer data, public claims, accessibility, search visibility, or automated communication, because a small error can travel farther than the original improvement.`,
          `Review citations before publishing and remove any claim that the source does not support. Keep public contact paths intentional, keep off-lane proof and unrelated project material out of the output, and do not publish social drafts without verifying the owned account and destination. If a credential or production surface is unavailable, preserve the last verified state and report the blocker rather than filling the gap with an assumption.`,
        ],
        bullets: details.boundaries,
      },
      {
        heading: 'Choose the next step from evidence',
        body: [
          `The right next step is usually smaller than a full rebuild. Use the diagnostic checklist above, choose the constraint with the strongest evidence, and define what would make the change worth keeping. If the problem spans search, design, automation, and reporting, keep one accountable owner while specialists work from the same buyer path and measurement plan.`,
          `EB28 approaches ${keyword} as a connected operating problem, not a bundle of disconnected deliverables. Start with the live page or workflow, confirm the buyer decision it needs to support, and use the project brief or Melbourne Web Studio lead-leak quiz to document the first improvement without committing to unnecessary scope.`,
        ],
        bullets: [
          'Bring the live URL or workflow, not only a list of desired features',
          'State the buyer action and business outcome that matter most',
          'List known constraints, unavailable data, and systems that must remain unchanged',
          'Agree on the production verification and reporting evidence before work begins',
        ],
      },
    ],
    faqs: [
      {
        question: `What should a business fix first for ${keyword}?`,
        answer: `Fix the first verified break in the buyer path. That may be an unclear search promise, a weak mobile first screen, missing proof, a difficult form, or a slow handoff. Baseline the current result, make one coherent change, and verify the full path before expanding the project.`,
      },
      {
        question: `How long does ${keyword} take to show useful results?`,
        answer: `The implementation can often begin with a focused change, but the evaluation period depends on traffic, crawl timing, lead volume, and the business cycle. Use the first 30 days to establish a baseline, ship, verify production, and collect enough evidence to choose the next step without overreading early noise.`,
      },
      {
        question: `Which metrics matter most for ${keyword}?`,
        answer: `Use metrics that connect the target audience to a qualified action: relevant search impressions and clicks, page or workflow completion, form quality, response time, routing accuracy, and confirmed conversations or bookings. Keep each data source labeled, and do not treat activity alone as proof of business impact.`,
      },
      {
        question: 'When should a business bring in outside help?',
        answer: `Outside help is useful when the problem crosses several systems, internal ownership is unclear, or the team cannot safely test and verify production. A good partner should explain the diagnosis, preserve access and ownership, state evidence limits, and leave a measurable operating process instead of creating permanent dependence.`,
      },
    ],
    citations: details.citations,
    relatedSlugs:
      existingArticle?.relatedSlugs?.length >= 3
        ? existingArticle.relatedSlugs.filter((relatedSlug) => relatedSlug !== slug)
        : [
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

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value, maxLength) {
  const text = compact(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, Math.max(0, maxLength - 1));
  const boundary = clipped.lastIndexOf(' ');
  return `${(boundary > maxLength * 0.55 ? clipped.slice(0, boundary) : clipped).replace(/[.,;:!?-]+$/, '')}…`;
}

function stableIndex(seed, length) {
  if (!length) return 0;
  let hash = 0;
  for (const character of String(seed || '')) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % length;
}

function clusterLabel(cluster) {
  return String(cluster || 'growth system')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function selectFeatureSpotlight(featureCatalog, cluster, seed) {
  const businessFeatures = (featureCatalog?.features || []).filter(
    (feature) => feature.lane === 'business-growth' && feature.status !== 'retired',
  );
  const matching = businessFeatures.filter((feature) => (feature.clusters || []).includes(cluster));
  const candidates = matching.length ? matching : businessFeatures;
  if (!candidates.length) {
    throw new Error('No active business-growth features are available in content/eb28/social-features.json.');
  }
  return candidates[stableIndex(seed, candidates.length)];
}

function hashtagsForCluster(cluster) {
  const tags = {
    'local-seo': ['#LocalSEO', '#MelbourneFL', '#SmallBusinessMarketing', '#EB28'],
    'melbourne-web-design': ['#WebDesign', '#MelbourneFL', '#ConversionDesign', '#EB28'],
    conversion: ['#ConversionRateOptimization', '#LeadGeneration', '#SmallBusiness', '#EB28'],
    'lead-automation': ['#LeadAutomation', '#AISystems', '#SmallBusiness', '#EB28'],
    'private-ai': ['#PrivateAI', '#RAG', '#BusinessAutomation', '#EB28'],
  };
  return tags[cluster] || tags.conversion;
}

function buildXCaption({ hook, feature, url }) {
  const featureLine = `${feature.name}: ${feature.features?.[0] || feature.promise}`;
  const reserved = url.length + 2;
  const body = truncateAtWord(`${hook} ${featureLine}`, Math.max(80, 280 - reserved));
  return `${body}\n${url}`;
}

function buildSocialPackage(article, { date, slot, runId, operation, featureCatalog }) {
  const url = `https://eb28.co/blog/${article.slug}/`;
  const messaging = getClusterMessaging(article.cluster);
  const details = getClusterQualityDetails(article.cluster);
  const feature = selectFeatureSpotlight(featureCatalog, article.cluster, `${runId}:${article.slug}`);
  const hashtags = hashtagsForCluster(article.cluster);
  const diagnostic = details.diagnostics[0];
  const metric = details.metrics[0];
  const boundary = details.boundaries[0];
  const featureUrl = feature.cta?.url || 'https://eb28.co/';
  const featureStatus = feature.status === 'founder_beta' ? 'Founder beta' : 'Active feature';
  const featureSummary = {
    id: feature.id,
    name: feature.name,
    lane: feature.lane,
    status: feature.status,
    newSince: feature.newSince,
    audience: feature.audience,
    promise: feature.promise,
    features: feature.features,
    cta: feature.cta,
    visualTheme: feature.visualTheme,
  };
  const platformStrategy = {
    facebook: 'Problem-to-plan post with a practical checklist and one feature proof point.',
    instagram: 'Four-slide 4:5 carousel with a save-worthy diagnostic, first fix, feature spotlight, and measurable next step.',
    linkedin: 'Operator lesson with a specific build sequence and a soft product connection.',
    x: 'One concise operating insight plus the canonical guide.',
    shortFormVideo: 'Thirty-to-forty-five-second vertical explainer with visible UI, workflow steps, and on-screen captions.',
  };
  const creativeSystem = {
    version: featureCatalog?.version || '2026-07-social-v2',
    pillar: clusterLabel(article.cluster),
    objective: 'qualified_attention',
    eyebrow: `${slot.toUpperCase()} FIELD NOTE`,
    headline: details.socialHook,
    subhead: `${article.title}. Start with one constraint, ship one useful fix, and measure the handoff.`,
    theme: feature.visualTheme || 'cobalt',
    feature: featureSummary,
    steps: [
      { label: 'Find the constraint', value: diagnostic },
      { label: 'Build the first fix', value: messaging.firstFix },
      { label: 'Connect the feature', value: `${feature.name}: ${feature.features?.[0] || feature.promise}` },
    ],
    metric: {
      label: 'What to measure',
      value: metric,
    },
    cta: {
      label: 'Read the full EB28 field guide',
      url,
    },
    disclaimer: boundary,
    requiredFormats: {
      instagramCarousel: { width: 1080, height: 1350, slides: 4 },
      vertical: { width: 1080, height: 1920 },
      landscape: { width: 1200, height: 675 },
    },
  };
  return {
    brand: 'EB28',
    lane: 'business-growth',
    generatedAt: new Date().toISOString(),
    runId,
    slot,
    operation,
    publishingPolicy: {
      externalPublishing: 'not_authorized',
      requiredState: 'draft_only',
      note: 'Verify the exact EB28-owned account and channel in the publishing tool before any separate publishing action.',
    },
    creativeStandards: {
      version: featureCatalog?.version || '2026-07-social-v2',
      voice: 'Specific, operator-led, plain English, evidence-aware, and free of unsupported guarantees.',
      visual: 'Mobile-first 4:5 carousel plus 9:16 and 16:9 derivatives; bold type, one focal idea per slide, no generic stock imagery.',
      featureCoverage: 'Every package selects one active EB28 feature from the central catalog and ties it to the article intent.',
    },
    article: {
      title: article.title,
      url,
      slug: article.slug,
      cluster: article.cluster,
      primaryKeyword: article.primaryKeyword,
    },
    featureSpotlight: featureSummary,
    destinations: {
      canonicalGuide: url,
      feature: featureUrl,
    },
    platformStrategy,
    creativeSystem,
    posts: {
      blog: {
        title: article.title,
        url,
        status: 'draft_only',
      },
      facebook: {
        caption: `${details.socialHook}\n\nBefore adding another tool, inspect the path:\n\n1. ${diagnostic}\n2. ${messaging.firstFix}\n3. Measure ${metric.charAt(0).toLowerCase()}${metric.slice(1)}.\n\n${featureStatus}: ${feature.name}\n${feature.promise}\n\nRead the field guide: ${url}\nSee the feature: ${featureUrl}`,
        url,
        status: 'draft_only',
      },
      instagram: {
        caption: `${details.socialHook}\n\nIf “${article.primaryKeyword}” is the goal, do not start with a software list.\n\n01 — Find the constraint\n${diagnostic}\n\n02 — Build one useful fix\n${messaging.firstFix}\n\n03 — Connect a real EB28 feature\n${feature.name}: ${feature.features?.[0] || feature.promise}\n\n04 — Prove the handoff\nTrack ${metric.charAt(0).toLowerCase()}${metric.slice(1)}.\n\nSave this for the next audit. Full guide at ${url}\n\n${hashtags.join(' ')}`,
        creativeBrief: `${details.visualDirection} Use the generated four-slide carousel: decisive cover, diagnostic-to-fix flow, ${feature.name} spotlight, and measurement/CTA. Show documentary UI or a simple workflow diagram when a real screenshot is available; never use a generic office stock photo.`,
        url,
        status: 'draft_only',
      },
      x: {
        caption: buildXCaption({ hook: details.socialHook, feature, url }),
        url,
        status: 'draft_only',
      },
      linkedin: {
        caption: `${details.socialHook}\n\nA useful ${article.primaryKeyword} project starts with a buyer constraint, not a software list.\n\nThe operating sequence:\n• ${diagnostic}\n• ${messaging.firstFix}\n• Measure ${metric.charAt(0).toLowerCase()}${metric.slice(1)}\n\nWhat EB28 has added: ${feature.name}. ${feature.promise}\n\nThe full guide covers the 30-day build loop, safeguards, and evidence-based next step.\n\n${url}\n\n${hashtags.slice(0, 3).join(' ')}`,
        url,
        status: 'draft_only',
      },
      shortFormVideo: {
        hook: details.socialHook,
        durationSeconds: 40,
        format: '9:16 vertical, burned-in captions, screen recording or workflow diagram, no talking-head requirement',
        beats: [
          { seconds: '0-3', visual: 'Large hook over the live page or workflow map', voiceover: details.socialHook },
          { seconds: '3-12', visual: 'Highlight the buyer constraint', voiceover: diagnostic },
          { seconds: '12-24', visual: 'Animate the first-fix path', voiceover: messaging.firstFix },
          { seconds: '24-34', visual: `Show ${feature.name} with one real feature`, voiceover: feature.promise },
          { seconds: '34-40', visual: 'Show the measurement and canonical URL', voiceover: `Measure ${metric.charAt(0).toLowerCase()}${metric.slice(1)}. Read the full guide at EB28.` },
        ],
        onScreenText: ['Find the constraint', 'Build one useful fix', `Feature: ${feature.name}`, 'Measure the handoff'],
        caption: `${truncateAtWord(details.socialHook, 130)} ${feature.name}: ${truncateAtWord(feature.promise, 120)} ${url} ${hashtags.slice(0, 4).join(' ')}`,
        url,
        status: 'draft_only',
      },
    },
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const slot = resolveSlot(options.slot);
  const date = options.date || easternParts().date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dateToUtcDay(date)) {
    throw new Error('--date must be a valid YYYY-MM-DD date.');
  }
  const runId = `${date}-${slot}`;

  const [articles, backlog, state, featureCatalog] = await Promise.all([
    readJson(ARTICLES_FILE, []),
    readJson(BACKLOG_FILE, []),
    readJson(STATE_FILE, { runs: [] }),
    readJson(SOCIAL_FEATURES_FILE, { features: [] }),
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

  const plan = selectContentPlan(backlog, articles, {
    date,
    forceRefresh: options.forceRefresh,
    refreshCooldownDays: options.refreshCooldownDays,
  });

  if (plan.operation === 'no_change') {
    const result = {
      ok: true,
      status: 'no_change',
      runId,
      operation: plan.operation,
      reason: 'refresh_cooldown',
      refreshCooldownDays: plan.refreshCooldownDays,
      daysSinceRefresh: plan.daysSinceRefresh,
      nextEligibleArticle: {
        slug: plan.existingArticle.slug,
        title: plan.existingArticle.title,
        dateModified: plan.existingArticle.dateModified || plan.existingArticle.datePublished,
      },
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const article = buildArticle(plan.topic, {
    date,
    slot,
    runId,
    existingArticle: plan.existingArticle,
  });
  const socialPackage = buildSocialPackage(article, {
    date,
    slot,
    runId,
    operation: plan.operation,
    featureCatalog,
  });
  const articleQuality = analyzeArticleQuality(article);
  const socialQuality = analyzeSocialPackage(socialPackage);
  if (!articleQuality.ok || !socialQuality.ok) {
    throw new Error(
      `Content quality gate failed: ${JSON.stringify({
        article: articleQuality.failures,
        social: socialQuality.failures,
      })}`,
    );
  }

  const reportPath = path.posix.join('output', 'eb28-social', `eb28-content-${runId}.json`);
  const reportAbsolutePath = path.join(ROOT, reportPath);

  const result = {
    ok: true,
    status: options.write ? 'written' : 'dry_run',
    runId,
    operation: plan.operation,
    daysSinceRefresh: plan.daysSinceRefresh,
    article: {
      slug: article.slug,
      title: article.title,
      url: `https://eb28.co/blog/${article.slug}/`,
      cluster: article.cluster,
      primaryKeyword: article.primaryKeyword,
    },
    quality: {
      article: {
        ok: articleQuality.ok,
        score: articleQuality.score,
        wordCount: articleQuality.wordCount,
      },
      social: {
        ok: socialQuality.ok,
        score: socialQuality.score,
        creativeVersion: socialPackage.creativeStandards?.version || null,
        featureId: socialPackage.featureSpotlight?.id || null,
      },
    },
    socialPackagePath: reportPath,
  };

  if (options.write) {
    const nextArticles =
      plan.operation === 'refresh'
        ? articles.map((existing) => (existing.slug === plan.existingArticle.slug ? article : existing))
        : [article, ...articles];
    const nextState = {
      ...state,
      updatedAt: new Date().toISOString(),
      runs: [
        {
          runId,
          date,
          slot,
          operation: plan.operation,
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
    await writeJson(reportAbsolutePath, socialPackage);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
