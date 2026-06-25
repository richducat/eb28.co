export const LEAD_CAPTURE_EMAIL = 'richducat@gmail.com';
export const LEAD_CAPTURE_ENDPOINT = `https://formsubmit.co/ajax/${LEAD_CAPTURE_EMAIL}`;

export async function submitLeadCapture(payload, options = {}) {
  const subject = String(payload?._subject || options.defaultSubject || '[EB28 HIGH PRIORITY LEAD] Website Lead');
  const response = await fetch(LEAD_CAPTURE_ENDPOINT, {
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
