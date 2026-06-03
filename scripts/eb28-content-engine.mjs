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

function buildArticle(topic, { date, slot, runId }) {
  const slug = slugify(topic.title);
  const clusterLabel = String(topic.cluster || 'organic-growth').replace(/-/g, ' ');
  const keyword = topic.primaryKeyword || topic.title;
  const angle = topic.angle || 'practical implementation';

  return {
    slug,
    title: topic.title,
    description: `${topic.title} explained for business owners who want more qualified organic leads, stronger search visibility, and a website system that converts.`,
    cluster: topic.cluster || 'organic-growth',
    primaryKeyword: keyword,
    datePublished: date,
    dateModified: date,
    author: 'EB28',
    heroLabel: slot === 'am' ? 'Morning growth brief' : 'Evening growth brief',
    sourceRunId: runId,
    summary: `A practical ${slot.toUpperCase()} guide for the ${clusterLabel} cluster, focused on ${angle} and measurable lead generation.`,
    sections: [
      {
        heading: 'The search intent behind this topic',
        body: [
          `People searching for "${keyword}" are usually not looking for theory. They are trying to decide what to fix, who to hire, or how to make their current website produce more qualified leads.`,
          `For EB28, this topic supports the ${clusterLabel} cluster by answering the buyer's next question in plain English and linking them toward a project brief when they are ready.`
        ],
        bullets: [
          'Make the problem obvious in the first screen',
          'Explain what a serious implementation includes',
          'Connect the topic to local proof, speed, and conversion',
          'Offer a direct next step instead of a vague contact prompt'
        ],
      },
      {
        heading: 'What to fix first',
        body: [
          'Start with the parts that affect both rankings and revenue: crawlable content, a clear service promise, fast mobile rendering, trustworthy proof, and a lead path that works every time.',
          'Do not bury the fix under a huge redesign. A small, measurable improvement to the page that already gets impressions can outperform a larger project that never ships.'
        ],
        bullets: [
          'Check the page title and meta description against the exact buyer intent',
          'Add internal links from the homepage, Melbourne Web Studio page, and blog hub',
          'Answer the top objection with a short FAQ',
          'Track the source page on every form submission'
        ],
      },
      {
        heading: 'How EB28 turns it into a system',
        body: [
          'The durable version is a loop: publish the page, submit and inspect the sitemap, measure Search Console query movement, improve pages ranking in positions 4-20, and add citations or outreach targets for the strongest clusters.',
          'That loop is what the EB28 automation now runs daily. It keeps content production, technical SEO, internal links, Search Console checks, and reporting tied to the same ranking goal.'
        ],
        bullets: [
          'Publish two content updates daily at 6 AM and 6 PM Eastern',
          'Run a daily SEO review after the evening content cycle',
          'Inspect the newest URLs and pull actual average position when Search Console credentials are available',
          'Send a report to richducat@gmail.com when email credentials are configured'
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
