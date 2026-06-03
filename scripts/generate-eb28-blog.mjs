#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SITE_ORIGIN = 'https://eb28.co';
const BLOG_PATH = '/blog/';
const ARTICLES_FILE = path.join(ROOT, 'content', 'eb28', 'articles.json');
const DOCS_DIR = path.join(ROOT, 'docs');
const BLOG_DIR = path.join(DOCS_DIR, 'blog');
const DATA_DIR = path.join(DOCS_DIR, 'data');

const INTERNAL_SOURCE_LINKS = [
  {
    label: 'EB28 private AI and app development homepage',
    href: '/',
    description: 'Core service page for app development, private AI infrastructure, and lead-generation systems.',
  },
  {
    label: 'Melbourne Web Studio local website builder page',
    href: '/melbournewebstudio/',
    description: 'Local web design, SEO, and conversion offer for Melbourne and Brevard County businesses.',
  },
  {
    label: 'Recon Agent founder beta',
    href: '/reconcile/',
    description: 'Daily Stripe reconciliation product page for finance and operations founders.',
  },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function articlePath(article) {
  return `${BLOG_PATH}${article.slug}/`;
}

function articleUrl(article) {
  return `${SITE_ORIGIN}${articlePath(article)}`;
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => {
    const dateCompare = String(b.datePublished || '').localeCompare(String(a.datePublished || ''));
    if (dateCompare !== 0) return dateCompare;
    return String(a.title).localeCompare(String(b.title));
  });
}

async function readArticles() {
  const raw = await fs.readFile(ARTICLES_FILE, 'utf8');
  const articles = JSON.parse(raw);
  if (!Array.isArray(articles)) {
    throw new Error(`${ARTICLES_FILE} must contain an array`);
  }
  return sortArticles(articles);
}

function readingMinutes(article) {
  const text = [
    article.title,
    article.description,
    article.summary,
    ...(article.sections || []).flatMap((section) => [
      section.heading,
      ...(section.body || []),
      ...(section.bullets || []),
    ]),
    ...(article.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ].join(' ');
  const words = stripTags(text).split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 220));
}

function formatDisplayDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function getRelatedArticles(article, allArticles) {
  const bySlug = new Map(allArticles.map((item) => [item.slug, item]));
  const explicit = (article.relatedSlugs || []).map((slug) => bySlug.get(slug)).filter(Boolean);
  if (explicit.length >= 3) return explicit.slice(0, 3);

  const sameCluster = allArticles.filter(
    (item) => item.slug !== article.slug && item.cluster === article.cluster && !explicit.includes(item),
  );
  const fallback = allArticles.filter(
    (item) => item.slug !== article.slug && !explicit.includes(item) && !sameCluster.includes(item),
  );

  return [...explicit, ...sameCluster, ...fallback].slice(0, 3);
}

function baseStyles() {
  return `
    :root {
      color-scheme: light;
      --ink: #101827;
      --muted: #4b5563;
      --line: #d9e2ef;
      --soft: #f6f8fb;
      --accent: #155eef;
      --accent-dark: #0f3f9e;
      --green: #087443;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #ffffff;
      line-height: 1.65;
    }
    a { color: inherit; }
    .skip-link {
      position: absolute;
      left: 1rem;
      top: -4rem;
      z-index: 20;
      background: var(--ink);
      color: white;
      padding: .75rem 1rem;
      border-radius: .5rem;
    }
    .skip-link:focus { top: 1rem; }
    .site-header {
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.94);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .nav {
      max-width: 1120px;
      margin: 0 auto;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .brand {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: .75rem;
      font-weight: 850;
      letter-spacing: 0;
    }
    .brand-mark {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: .5rem;
      background: var(--ink);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: .85rem;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: .9rem;
      align-items: center;
      font-size: .92rem;
      color: var(--muted);
    }
    .nav-links a { text-decoration: none; }
    .nav-links a:hover { color: var(--accent); }
    .cta-link {
      background: var(--accent);
      color: #fff !important;
      padding: .7rem .95rem;
      border-radius: .5rem;
      font-weight: 800;
    }
    main { min-height: 70vh; }
    .hero {
      background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
      border-bottom: 1px solid var(--line);
    }
    .hero-inner, .section, .article-shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 4.5rem 1.25rem;
    }
    .eyebrow {
      margin: 0 0 .9rem;
      color: var(--accent);
      font-size: .76rem;
      text-transform: uppercase;
      letter-spacing: .14em;
      font-weight: 850;
    }
    h1, h2, h3 { line-height: 1.12; letter-spacing: 0; }
    h1 {
      max-width: 890px;
      margin: 0;
      font-size: clamp(2.35rem, 6vw, 4.65rem);
    }
    .lead {
      max-width: 760px;
      margin: 1.25rem 0 0;
      color: var(--muted);
      font-size: clamp(1.04rem, 2vw, 1.25rem);
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: .75rem;
      margin-top: 1.5rem;
      color: var(--muted);
      font-size: .92rem;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      background: white;
      border-radius: 999px;
      padding: .38rem .7rem;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: .5rem;
      background: white;
      padding: 1.2rem;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .card:hover { border-color: #9db8f9; box-shadow: 0 14px 36px rgba(15, 23, 42, .08); }
    .card .kicker {
      color: var(--accent);
      font-size: .72rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: .12em;
      margin-bottom: .85rem;
    }
    .card h2, .card h3 {
      margin: 0;
      font-size: 1.24rem;
    }
    .card p {
      color: var(--muted);
      margin: .85rem 0 0;
    }
    .card .read {
      margin-top: auto;
      padding-top: 1rem;
      color: var(--accent);
      font-weight: 850;
    }
    .band {
      background: var(--soft);
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .article-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 3rem;
      align-items: start;
    }
    article {
      max-width: 760px;
    }
    article h2 {
      font-size: 2rem;
      margin: 2.75rem 0 .8rem;
    }
    article h3 {
      margin: 1.5rem 0 .5rem;
    }
    article p {
      color: #243044;
      font-size: 1.05rem;
    }
    article ul {
      padding-left: 1.25rem;
      color: #243044;
    }
    article li { margin: .45rem 0; }
    .toc, .aside-box {
      border: 1px solid var(--line);
      border-radius: .5rem;
      padding: 1rem;
      background: #fff;
    }
    .toc {
      position: sticky;
      top: 5.5rem;
    }
    .toc h2, .aside-box h2 {
      font-size: 1rem;
      margin: 0 0 .75rem;
    }
    .toc a, .aside-box a {
      display: block;
      color: var(--muted);
      text-decoration: none;
      margin: .55rem 0;
      font-size: .92rem;
    }
    .toc a:hover, .aside-box a:hover { color: var(--accent); }
    .quote {
      border-left: 4px solid var(--accent);
      background: #f5f8ff;
      padding: 1rem 1.25rem;
      border-radius: .5rem;
      margin: 2rem 0;
      color: #1f3158;
      font-weight: 700;
    }
    .cta {
      margin: 3rem 0 0;
      padding: 1.5rem;
      background: #0f172a;
      color: white;
      border-radius: .5rem;
    }
    .cta p { color: #cbd5e1; }
    .cta a {
      display: inline-flex;
      margin-top: .75rem;
      background: #fff;
      color: #0f172a;
      text-decoration: none;
      border-radius: .5rem;
      padding: .8rem 1rem;
      font-weight: 850;
    }
    .faq details {
      border: 1px solid var(--line);
      border-radius: .5rem;
      padding: 1rem;
      margin: .75rem 0;
      background: #fff;
    }
    .faq summary {
      cursor: pointer;
      font-weight: 850;
    }
    .footer {
      border-top: 1px solid var(--line);
      padding: 2rem 1.25rem;
      color: var(--muted);
      font-size: .9rem;
    }
    .footer-inner {
      max-width: 1120px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
    }
    @media (max-width: 860px) {
      .nav { align-items: flex-start; flex-direction: column; }
      .grid { grid-template-columns: 1fr; }
      .article-layout { grid-template-columns: 1fr; }
      .toc { position: static; }
      .hero-inner, .section, .article-shell { padding: 3rem 1rem; }
    }
  `;
}

function renderHead({ title, description, canonicalUrl, ogType = 'website', structuredData = [] }) {
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:site_name" content="EB28" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${SITE_ORIGIN}/assets/execution_grid.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/assets/execution_grid.png" />
    <style>${baseStyles()}</style>
    ${structuredData.length ? `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>` : ''}
  `;
}

function renderHeader() {
  return `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <nav class="nav" aria-label="Primary">
        <a class="brand" href="/">
          <span class="brand-mark">EB</span>
          <span>EB28 Organic Growth Library</span>
        </a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/melbournewebstudio/">Melbourne Web Studio</a>
          <a href="/reconcile/">Recon Agent</a>
          <a href="/blog/">Blog</a>
          <a class="cta-link" href="/melbournewebstudio/#quiz">Start Project</a>
        </div>
      </nav>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <span>© ${new Date().getUTCFullYear()} EB28. Built for organic leads, private AI infrastructure, and measurable local growth.</span>
        <span><a href="/sitemap.xml">Sitemap</a> · <a href="/blog/">Blog</a> · <a href="/melbournewebstudio/">Melbourne Web Studio</a></span>
      </div>
    </footer>
  `;
}

function renderIndexPage(articles) {
  const canonicalUrl = `${SITE_ORIGIN}${BLOG_PATH}`;
  const clusters = [...new Set(articles.map((article) => article.cluster).filter(Boolean))];
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'EB28 Organic Growth Library',
      url: canonicalUrl,
      description:
        'Practical guides on Melbourne web design, local SEO, website conversion, private AI infrastructure, and lead automation.',
      publisher: {
        '@type': 'Organization',
        name: 'EB28',
        url: SITE_ORIGIN,
      },
      blogPost: articles.slice(0, 12).map((article) => ({
        '@type': 'BlogPosting',
        headline: article.title,
        url: articleUrl(article),
        datePublished: article.datePublished,
        dateModified: article.dateModified || article.datePublished,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: canonicalUrl },
      ],
    },
  ];

  return `<!doctype html>
<html lang="en">
  <head>${renderHead({
    title: 'EB28 Blog | Melbourne Web Design, Local SEO, Private AI and Lead Automation',
    description:
      'EB28 guides for local businesses that want more organic leads from search, faster websites, local SEO, private AI infrastructure, and conversion automation.',
    canonicalUrl,
    structuredData,
  })}</head>
  <body>
    ${renderHeader()}
    <main id="main-content">
      <section class="hero">
        <div class="hero-inner">
          <p class="eyebrow">Organic lead engine</p>
          <h1>Practical SEO, web design, and AI automation guides for businesses that need customers.</h1>
          <p class="lead">These articles support EB28 and Melbourne Web Studio's search clusters: local web design, map-pack SEO, conversion, lead automation, and private AI infrastructure.</p>
          <div class="meta-row">
            <span class="pill">${articles.length} live articles</span>
            <span class="pill">Updated ${formatDisplayDate(articles[0]?.dateModified || articles[0]?.datePublished || new Date().toISOString().slice(0, 10))}</span>
            <span class="pill">Search-first internal linking</span>
          </div>
        </div>
      </section>

      <section class="section">
        <p class="eyebrow">Newest articles</p>
        <div class="grid">
          ${articles
            .map(
              (article) => `
                <a class="card" href="${articlePath(article)}">
                  <span class="kicker">${escapeHtml(article.heroLabel || article.cluster)}</span>
                  <h2>${escapeHtml(article.title)}</h2>
                  <p>${escapeHtml(article.summary || article.description)}</p>
                  <span class="read">Read the guide</span>
                </a>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="band">
        <div class="section">
          <p class="eyebrow">Cluster coverage</p>
          <div class="grid">
            ${clusters
              .map((cluster) => {
                const clusterArticles = articles.filter((article) => article.cluster === cluster);
                return `
                  <div class="card">
                    <span class="kicker">${escapeHtml(cluster.replace(/-/g, ' '))}</span>
                    <h3>${clusterArticles.length} supporting articles</h3>
                    ${clusterArticles
                      .slice(0, 4)
                      .map((article) => `<p><a href="${articlePath(article)}">${escapeHtml(article.title)}</a></p>`)
                      .join('')}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </section>

      <section class="section">
        <p class="eyebrow">High-authority internal paths</p>
        <div class="grid">
          ${INTERNAL_SOURCE_LINKS.map(
            (link) => `
              <a class="card" href="${link.href}">
                <span class="kicker">Internal link source</span>
                <h3>${escapeHtml(link.label)}</h3>
                <p>${escapeHtml(link.description)}</p>
                <span class="read">Open page</span>
              </a>
            `,
          ).join('')}
        </div>
      </section>
    </main>
    ${renderFooter()}
  </body>
</html>
`;
}

function slugId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderArticlePage(article, allArticles) {
  const canonicalUrl = articleUrl(article);
  const related = getRelatedArticles(article, allArticles);
  const sections = article.sections || [];
  const faqs = article.faqs || [];
  const citations = article.citations || [];
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.description,
      mainEntityOfPage: canonicalUrl,
      url: canonicalUrl,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      author: {
        '@type': 'Organization',
        name: article.author || 'EB28',
        url: SITE_ORIGIN,
      },
      publisher: {
        '@type': 'Organization',
        name: 'EB28',
        url: SITE_ORIGIN,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_ORIGIN}/favicon.svg`,
        },
      },
      image: `${SITE_ORIGIN}/assets/execution_grid.png`,
      keywords: [article.primaryKeyword, article.cluster].filter(Boolean),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}${BLOG_PATH}` },
        { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
      ],
    },
  ];

  if (faqs.length) {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  return `<!doctype html>
<html lang="en">
  <head>${renderHead({
    title: `${article.title} | EB28`,
    description: article.description,
    canonicalUrl,
    ogType: 'article',
    structuredData,
  })}</head>
  <body>
    ${renderHeader()}
    <main id="main-content">
      <section class="hero">
        <div class="hero-inner">
          <p class="eyebrow">${escapeHtml(article.heroLabel || article.cluster || 'EB28 guide')}</p>
          <h1>${escapeHtml(article.title)}</h1>
          <p class="lead">${escapeHtml(article.summary || article.description)}</p>
          <div class="meta-row">
            <span class="pill">${escapeHtml(article.primaryKeyword || 'SEO guide')}</span>
            <span class="pill">${formatDisplayDate(article.datePublished)}</span>
            <span class="pill">${readingMinutes(article)} min read</span>
          </div>
        </div>
      </section>

      <div class="article-shell">
        <div class="article-layout">
          <article>
            <p class="quote">The goal is not more content for its own sake. The goal is a clearer path from search impression to qualified lead.</p>
            ${sections
              .map((section) => {
                const id = slugId(section.heading);
                return `
                  <section id="${id}">
                    <h2>${escapeHtml(section.heading)}</h2>
                    ${(section.body || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                    ${(section.bullets || []).length ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
                  </section>
                `;
              })
              .join('')}

            ${
              faqs.length
                ? `
                  <section class="faq" id="faq">
                    <h2>FAQs</h2>
                    ${faqs
                      .map(
                        (faq) => `
                          <details>
                            <summary>${escapeHtml(faq.question)}</summary>
                            <p>${escapeHtml(faq.answer)}</p>
                          </details>
                        `,
                      )
                      .join('')}
                  </section>
                `
                : ''
            }

            ${
              citations.length
                ? `
                  <section id="sources">
                    <h2>Sources and citations</h2>
                    <ul>
                      ${citations
                        .map(
                          (citation) =>
                            `<li><a href="${escapeHtml(citation.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(citation.label)}</a></li>`,
                        )
                        .join('')}
                    </ul>
                  </section>
                `
                : ''
            }

            <section class="cta">
              <h2>Turn this into a lead system</h2>
              <p>EB28 builds the website, local SEO, private AI, and follow-up automation needed to turn organic traffic into customers.</p>
              <a href="/melbournewebstudio/#quiz">Start the project brief</a>
            </section>
          </article>

          <aside>
            <div class="toc">
              <h2>On this page</h2>
              ${sections.map((section) => `<a href="#${slugId(section.heading)}">${escapeHtml(section.heading)}</a>`).join('')}
              ${faqs.length ? '<a href="#faq">FAQs</a>' : ''}
              ${citations.length ? '<a href="#sources">Sources</a>' : ''}
            </div>

            <div class="aside-box" style="margin-top: 1rem;">
              <h2>Related articles</h2>
              ${related.map((item) => `<a href="${articlePath(item)}">${escapeHtml(item.title)}</a>`).join('')}
            </div>

            <div class="aside-box" style="margin-top: 1rem;">
              <h2>Internal links</h2>
              ${INTERNAL_SOURCE_LINKS.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join('')}
            </div>
          </aside>
        </div>
      </div>
    </main>
    ${renderFooter()}
  </body>
</html>
`;
}

async function writeArticlePages(articles) {
  await fs.rm(BLOG_DIR, { recursive: true, force: true });
  await fs.mkdir(BLOG_DIR, { recursive: true });
  await fs.writeFile(path.join(BLOG_DIR, 'index.html'), renderIndexPage(articles), 'utf8');

  for (const article of articles) {
    const articleDir = path.join(BLOG_DIR, article.slug);
    await fs.mkdir(articleDir, { recursive: true });
    await fs.writeFile(path.join(articleDir, 'index.html'), renderArticlePage(article, articles), 'utf8');
  }
}

async function writeFeedFiles(articles) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const feed = {
    generatedAt: new Date().toISOString(),
    site: SITE_ORIGIN,
    blogUrl: `${SITE_ORIGIN}${BLOG_PATH}`,
    articles: articles.map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      cluster: article.cluster,
      primaryKeyword: article.primaryKeyword,
      url: articleUrl(article),
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
    })),
  };

  await fs.writeFile(path.join(DATA_DIR, 'eb28-blog-feed.json'), `${JSON.stringify(feed, null, 2)}\n`, 'utf8');

  const rssItems = articles
    .slice(0, 20)
    .map(
      (article) => `
        <item>
          <title>${escapeXml(article.title)}</title>
          <link>${escapeXml(articleUrl(article))}</link>
          <guid>${escapeXml(articleUrl(article))}</guid>
          <description>${escapeXml(article.description)}</description>
          <pubDate>${new Date(`${article.datePublished}T12:00:00Z`).toUTCString()}</pubDate>
        </item>
      `,
    )
    .join('');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>EB28 Organic Growth Library</title>
    <link>${SITE_ORIGIN}${BLOG_PATH}</link>
    <description>EB28 guides for web design, local SEO, private AI, and lead automation.</description>
    ${rssItems}
  </channel>
</rss>
`;

  await fs.writeFile(path.join(BLOG_DIR, 'feed.xml'), rss, 'utf8');
}

async function updateSitemap(articles) {
  const sitemapPath = path.join(DOCS_DIR, 'sitemap.xml');
  let existing = '';
  try {
    existing = await fs.readFile(sitemapPath, 'utf8');
  } catch {
    existing = '';
  }

  const urls = [];
  const seen = new Set();
  const addUrl = (url, lastmod = '') => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push({ url, lastmod });
  };

  const locRegex = /<loc>([\s\S]*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(existing))) {
    addUrl(match[1].trim());
  }

  addUrl(`${SITE_ORIGIN}${BLOG_PATH}`, articles[0]?.dateModified || articles[0]?.datePublished || '');
  for (const article of articles) {
    addUrl(articleUrl(article), article.dateModified || article.datePublished || '');
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(({ url, lastmod }) => {
      const lines = ['  <url>', `    <loc>${escapeXml(url)}</loc>`];
      if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
      lines.push('  </url>');
      return lines.join('\n');
    }),
    '</urlset>',
    '',
  ].join('\n');

  await fs.writeFile(sitemapPath, xml, 'utf8');
}

async function main() {
  const articles = await readArticles();
  await writeArticlePages(articles);
  await writeFeedFiles(articles);
  await updateSitemap(articles);
  console.log(`[OK] Generated EB28 blog with ${articles.length} articles`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
