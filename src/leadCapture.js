const LEAD_CAPTURE_EMAIL = 'social@eb28.co';
const DEFAULT_LEAD_CAPTURE_ENDPOINT = `https://formsubmit.co/ajax/${LEAD_CAPTURE_EMAIL}`;

function getLeadCaptureEndpoint() {
  if (typeof window === 'undefined') return DEFAULT_LEAD_CAPTURE_ENDPOINT;
  const configuredEndpoint = window.__EB28_LEAD_CAPTURE_ENDPOINT__;
  if (typeof configuredEndpoint === 'string' && configuredEndpoint.trim()) {
    return configuredEndpoint.trim();
  }
  const metaEndpoint = document.querySelector('meta[name="eb28-lead-capture-endpoint"]')?.content;
  return typeof metaEndpoint === 'string' && metaEndpoint.trim()
    ? metaEndpoint.trim()
    : DEFAULT_LEAD_CAPTURE_ENDPOINT;
}

export async function submitLeadCapture(payload, options = {}) {
  const endpoint = getLeadCaptureEndpoint();
  if (!endpoint) {
    throw new Error('Lead capture endpoint is not configured.');
  }

  const subject = String(payload?._subject || options.defaultSubject || '[EB28 HIGH PRIORITY LEAD] Website Lead');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      _subject: subject,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Lead capture failed with status ${response.status}`);
  }

  const success = data && typeof data === 'object' ? data.success : undefined;
  if (success === false || String(success).toLowerCase() === 'false') {
    const message =
      data && typeof data === 'object' && typeof data.message === 'string'
        ? data.message
        : 'Lead capture endpoint rejected the submission';
    throw new Error(message);
  }

  return data;
}
