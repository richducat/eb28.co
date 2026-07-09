const CORE_PAGE_HREFS = new Set(['/', '/melbournewebstudio/', '/melbournewebstudio/#quiz', '/reconcile/']);

export const CONTENT_QUALITY_VERSION = 2;
export const MIN_ARTICLE_WORDS = 800;

export function normalizeKeyword(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function articleText(article) {
  return [
    article.title,
    article.description,
    article.summary,
    ...(article.sections || []).flatMap((section) => [
      section.heading,
      ...(section.body || []),
      ...(section.bullets || []),
    ]),
    ...(article.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ]
    .filter(Boolean)
    .join(' ');
}

export function countWords(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function containsKeyword(value, keyword) {
  return normalizeKeyword(value).includes(normalizeKeyword(keyword));
}

function containsKeywordTerms(value, keyword) {
  const ignored = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'the', 'to']);
  const valueTerms = new Set(normalizeKeyword(value).split(' ').filter(Boolean));
  const keywordTerms = normalizeKeyword(keyword)
    .split(' ')
    .filter((term) => term && !ignored.has(term));
  return keywordTerms.length > 0 && keywordTerms.every((term) => valueTerms.has(term));
}

function hasForbiddenPublicContent(article) {
  const serialized = JSON.stringify(article);
  return /social@eb28\.co|tel:|\/(?:deskos|limitless)\//i.test(serialized);
}

function isCoreLink(href) {
  const normalized = String(href || '').replace(/\/$/, '/');
  return CORE_PAGE_HREFS.has(normalized) || /^\/melbournewebstudio\/(?:#[a-z0-9-]+)?$/i.test(normalized);
}

export function analyzeArticleQuality(article) {
  const keyword = article.primaryKeyword || '';
  const sections = article.sections || [];
  const faqs = article.faqs || [];
  const citations = article.citations || [];
  const links = article.internalLinks || [];
  const opening = [article.summary, sections[0]?.heading, ...(sections[0]?.body || [])].join(' ');
  const wordCount = countWords(articleText(article));
  const checks = [
    {
      id: 'keyword-title',
      ok: Boolean(keyword && containsKeywordTerms(article.title, keyword)),
      message: 'Primary keyword appears in the title/H1 source.',
    },
    {
      id: 'keyword-description',
      ok: Boolean(keyword && containsKeyword(article.description, keyword)),
      message: 'Primary keyword appears naturally in the meta description.',
    },
    {
      id: 'description-length',
      ok: String(article.description || '').length >= 110 && String(article.description || '').length <= 170,
      message: 'Meta description is between 110 and 170 characters.',
    },
    {
      id: 'direct-answer',
      ok: Boolean(keyword && containsKeyword(opening, keyword) && countWords(opening) >= 70),
      message: 'The opening gives a substantive direct answer and names the target query.',
    },
    {
      id: 'substantive-length',
      ok: wordCount >= MIN_ARTICLE_WORDS,
      message: `Article contains at least ${MIN_ARTICLE_WORDS} substantive words.`,
    },
    {
      id: 'section-depth',
      ok: sections.length >= 5 && sections.every((section) => (section.body || []).length >= 2),
      message: 'Article has at least five focused sections with explanatory body copy.',
    },
    {
      id: 'actionable-structure',
      ok: sections.filter((section) => (section.bullets || []).length >= 3).length >= 3,
      message: 'Article includes multiple actionable checklists or plans.',
    },
    {
      id: 'faq-depth',
      ok: faqs.length >= 3 && faqs.every((faq) => countWords(faq.answer) >= 35),
      message: 'Article includes at least three useful, snippet-ready FAQ answers.',
    },
    {
      id: 'authoritative-citations',
      ok:
        citations.length >= 3 &&
        citations.every((citation) => citation.label && /^https:\/\//i.test(String(citation.url || ''))),
      message: 'Article includes at least three labeled HTTPS citations.',
    },
    {
      id: 'internal-links',
      ok:
        links.length >= 3 &&
        links.some((link) => /^\/blog\/[^/]+\/?(?:#[a-z0-9-]+)?$/i.test(String(link.href || ''))) &&
        links.some((link) => isCoreLink(link.href)),
      message: 'Article links to both a related guide and a core EB28 conversion path.',
    },
    {
      id: 'public-safety',
      ok: !hasForbiddenPublicContent(article),
      message: 'Article contains no blocked contact or retired-client paths.',
    },
  ];

  const passed = checks.filter((check) => check.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    ok: checks.every((check) => check.ok),
    score,
    wordCount,
    checks,
    failures: checks.filter((check) => !check.ok),
  };
}

export function analyzeSocialPackage(socialPackage) {
  const posts = Object.entries(socialPackage?.posts || {});
  const articleUrl = String(socialPackage?.article?.url || '');
  const serialized = JSON.stringify(socialPackage || {});
  const checks = [
    {
      id: 'canonical-url',
      ok:
        /^https:\/\/eb28\.co\/blog\/[^/]+\/$/.test(articleUrl) &&
        posts.every(([, post]) => !post.url || post.url === articleUrl),
      message: 'Every explicit post URL points to the canonical EB28 article.',
    },
    {
      id: 'draft-only',
      ok: posts.length >= 6 && posts.every(([, post]) => post.status === 'draft_only'),
      message: 'All external-channel assets remain draft-only.',
    },
    {
      id: 'channel-coverage',
      ok: ['facebook', 'instagram', 'linkedin', 'x', 'shortFormVideo'].every((channel) => socialPackage?.posts?.[channel]),
      message: 'The package covers the core owned-social channels and short-form video.',
    },
    {
      id: 'public-safety',
      ok: !/social@eb28\.co|tel:|\/(?:deskos|limitless)\//i.test(serialized),
      message: 'Social copy contains no blocked contact or retired-client paths.',
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    score: Math.round((checks.filter((check) => check.ok).length / checks.length) * 100),
    checks,
    failures: checks.filter((check) => !check.ok),
  };
}
