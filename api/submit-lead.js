/**
 * POST /api/submit-lead
 *
 * Accepts a JSON body with lead form data, validates it, and
 * forwards to the Google Apps Script web-app URL stored in
 * the GOOGLE_SHEET_WEBHOOK_URL environment variable on Vercel.
 */
export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, phone, email, serviceNeed, message, sourcePage } = req.body || {};

  // ── Validation ──────────────────────────────────────────────
  const errors = [];
  if (!name || !name.trim()) errors.push('Name is required.');
  if (!email || !email.trim()) errors.push('Email is required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Email format is invalid.');
  }
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  // ── Forward to Google Apps Script ───────────────────────────
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('GOOGLE_SHEET_WEBHOOK_URL is not configured.');
    return res.status(500).json({ error: 'Server misconfiguration. Please try again later.' });
  }

  try {
    const payload = {
      name: name.trim(),
      phone: (phone || '').trim(),
      email: email.trim(),
      serviceNeed: (serviceNeed || '').trim(),
      message: (message || '').trim(),
      sourcePage: (sourcePage || 'eb28.co').trim(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Google Apps Script error:', text);
      return res.status(502).json({ error: 'Failed to record submission. Please try again.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('submit-lead fetch error:', err);
    return res.status(500).json({ error: 'Unexpected error. Please try again later.' });
  }
}
