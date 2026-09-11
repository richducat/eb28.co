export const CHECKS = [
  {id:'service', action:'Make the inspection services and service area clear on the first screen.'},
  {id:'proof', action:'Add verified credentials and customer proof you have permission to publish.'},
  {id:'mobile', action:'Make the booking or quote request easy to complete on a phone.'},
  {id:'routing', action:'Test the confirmation and verify that a request reaches the right business inbox.'},
  {id:'measurement', action:'Record a successful request as an analytics event, separate from button clicks.'},
];
export const NEEDS = {
  new:'I need a new website',
  rebuild:'My current site needs a clearer booking path',
  form:'The request form or booking handoff is the problem',
  unsure:'I’m not sure yet',
};
const clean = (value,max) => String(value || '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export function assess(answers = {}) {
  const actions = CHECKS.filter(check => answers[check.id] !== true).map(check => check.action);
  return {
    complete: CHECKS.length-actions.length,
    title: actions.length ? `${actions.length} ${actions.length===1?'gap':'gaps'} to check in your booking path` : 'Your core booking path is covered',
    actions: actions.length ? actions : ['Run one real-world check on a phone: submit a test request, confirm delivery, and verify the analytics event.'],
  };
}
export function normalizeWebsite(value) {
  const input=clean(value,250);
  if(!input) return '';
  const candidate=/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  let url;
  try {url=new URL(candidate);} catch {throw new Error('Enter a website such as https://yourwebsite.com, or leave it blank.');}
  if(!['https:','http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || /\s/.test(input)) {
    throw new Error('Enter a public http or https website without a password, or leave it blank.');
  }
  return url.toString();
}
export function makeBrief(values, result = null) {
  const business=clean(values.business,120), area=clean(values.area,160);
  if(!business || !area) throw new Error('Add your business name and main service area.');
  const website=normalizeWebsite(values.website);
  const lines=[
    'EB28 · Inspector Website & Booking Sprint',
    'Project inquiry — $800 one-time website build only',
    '',`Business: ${business}`,`Website: ${website||'Not provided'}`,`Service area: ${area}`,
    `Main need: ${NEEDS[values.need] || NEEDS.unsure}`,
    `Notes: ${clean(values.note,700)||'None provided'}`,
    '', 'Booking-path self-check:',
    ...(result ? [`${result.complete} of 5 items reported in place.`,...result.actions.map(a=>`- ${a}`)] : ['Not completed.']),
    '', 'Requested scope: one responsive page, one booking/request path, an agreed analytics event, one revision round, source files and handoff.',
    'Hosting, domain, paid tools, ongoing support and inspection subscriptions are separate.',
    'Please confirm fit, final scope, required materials and delivery date before invoicing.',
    'This is an inquiry, not an order or payment.'
  ];
  return {text:lines.join('\n'),subject:`Inspector website inquiry — ${business}`};
}
export function emailLink(brief) {
  return `mailto:social@eb28.co?subject=${encodeURIComponent(brief.subject)}&body=${encodeURIComponent(brief.text)}`;
}
