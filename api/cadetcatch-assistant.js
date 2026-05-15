const MODEL = process.env.CADETCATCH_OPENAI_MODEL || 'gpt-5-nano';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';

function readBody(req) {
  if (!req.body) {
    return {};
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function cleanText(value, maxLength = 600) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

function buildReviewPrompt(body) {
  const candidate = body?.candidate || {};
  return [
    'Draft a short, parent-friendly review note for a possible public photo match.',
    'Do not overstate certainty. Do not use tactical language. Keep it warm, plain, and concise.',
    `Cadet name: ${cleanText(candidate.cadetName, 120) || 'Unknown'}`,
    `Source name: ${cleanText(candidate.sourceName, 120) || 'Public source'}`,
    `Source host: ${cleanText(candidate.sourceHost, 160) || 'Unknown'}`,
    `Confidence score: ${cleanText(candidate.confidence, 20) || 'Unknown'}%`,
    `Detected face count: ${cleanText(candidate.detectedFaceCount, 20) || 'Unknown'}`,
    'Return two short paragraphs only.',
  ].join('\n');
}

function buildSourcePrompt(body) {
  return [
    'Find public-facing, non-login photo or news sources that a Coast Guard Academy parent could review for cadet photos.',
    'Only include sources that appear publicly accessible without private account credentials.',
    'Prefer official academy, public affairs, and reputable public media sources.',
    'Return a compact JSON array of objects with name, url, and reason.',
    `User context: ${cleanText(body?.query, 500) || 'Coast Guard Academy cadet photos'}`,
  ].join('\n');
}

async function callOpenAI({ prompt, useWebSearch }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured on the server.');
    error.statusCode = 500;
    throw error;
  }

  const requestBody = {
    model: MODEL,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You support CadetCatch, a parent-facing iOS app for finding cadet photos from approved public sources. Be accurate, plain-spoken, and privacy-preserving.',
          },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }],
      },
    ],
    max_output_tokens: 900,
  };

  if (useWebSearch) {
    requestBody.tools = [{ type: 'web_search' }];
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'OpenAI request failed.');
    error.statusCode = response.status;
    throw error;
  }

  return {
    text: extractOutputText(payload),
    model: payload?.model || MODEL,
    sources: payload?.sources || [],
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = readBody(req);
  const action = cleanText(body?.action, 80);

  try {
    if (action === 'review-note') {
      const result = await callOpenAI({
        prompt: buildReviewPrompt(body),
        useWebSearch: false,
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }

    if (action === 'source-suggestions') {
      const result = await callOpenAI({
        prompt: buildSourcePrompt(body),
        useWebSearch: true,
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: 'Unsupported CadetCatch assistant action.' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'CadetCatch assistant failed.',
    });
  }
}
