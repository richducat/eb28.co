// Single source for the local AI packages so the homepage, the /local-ai/
// page, and the route metadata never quote different prices.

export const LOCAL_AI_PACKAGES = [
  {
    id: 'front-desk',
    name: 'AI Front Desk',
    tagline: 'Stop losing the customers who call while you are busy.',
    setup: 1500,
    monthly: 250,
    includes: [
      'Missed call? They get a friendly text back within a minute',
      'A website chat that answers your common questions, day or night',
      'Booking requests go straight to your calendar or phone',
      'After-hours messages sorted so the urgent ones reach you first',
    ],
    fit: 'Trades, home services, salons, and anyone who misses calls on the job.',
  },
  {
    id: 'follow-up',
    name: 'Follow-Up Machine',
    tagline: 'Every lead, review, and unpaid invoice gets followed up — automatically.',
    setup: 2000,
    monthly: 300,
    includes: [
      'New leads get polite follow-ups until they book or say no',
      'Happy customers get asked for a Google review after each job',
      'Overdue invoices get friendly reminders so you stop chasing them',
      'Past customers get a check-in when it is time to come back',
    ],
    fit: 'Businesses that get leads but lose them in the shuffle, or wait too long to get paid.',
    featured: true,
  },
  {
    id: 'workshop',
    name: 'AI in Plain English',
    tagline: 'A 90-minute session at your business for you and your team.',
    setup: 400,
    monthly: 0,
    includes: [
      'What AI can and cannot do for a business like yours',
      'Set up ChatGPT or Claude the safe way, with your own accounts',
      'Hands-on: write replies, quotes, posts, and job notes faster',
      'Full price credited toward a package if you start within 30 days',
    ],
    fit: 'Owners who want to understand it first, or teams that are already curious.',
  },
];

export const LOCAL_AI_FOUNDING_OFFER =
  'Founding client offer: the first 3 Brevard businesses get 50% off setup in exchange for honest feedback we can share.';

export function formatUsd(amount) {
  return `$${amount.toLocaleString('en-US')}`;
}
