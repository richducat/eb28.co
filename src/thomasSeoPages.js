export const THOMAS_PRIMARY_ORIGIN = 'https://thomascustom.homes';
export const THOMAS_EB28_BASE_PATH = '/tch';
export const THOMAS_SITE_NAME = 'Thomas Custom Homes';
export const THOMAS_COMPANY_NAME = 'Thomas Custom Homes Inc.';
export const THOMAS_PHONE = '3215871163';
export const THOMAS_PHONE_DISPLAY = '(321) 587-1163';
export const THOMAS_OFFICE_ADDRESS = '846 N. Cocoa Blvd. Suite C, Cocoa, FL 32922';
export const THOMAS_PRIMARY_CTA_LABEL = 'Request a Consultation';
export const THOMAS_PRIMARY_CTA_COPY =
  'Request a consultation to discuss your timeline, lot, budget, and design goals.';

const DEFAULT_RELATED_LINK_TITLE = 'Keep Exploring';
const LOCATION_PAGE_KIND = 'location';
const SERVICE_PAGE_KIND = 'service';
const ARTICLE_PAGE_KIND = 'article';
const RELOCATION_PAGE_KIND = 'relocation';

export const THOMAS_PRIMARY_HOSTNAMES = new Set([
  'thomascustom.homes',
  'www.thomascustom.homes',
]);

export function isThomasPrimaryHostname(hostname = '') {
  return THOMAS_PRIMARY_HOSTNAMES.has(String(hostname).toLowerCase());
}

function createPage(config) {
  return {
    heroCtaLabel: THOMAS_PRIMARY_CTA_LABEL,
    ctaCopy: THOMAS_PRIMARY_CTA_COPY,
    relatedLinksTitle: DEFAULT_RELATED_LINK_TITLE,
    ...config,
  };
}

export const THOMAS_SEO_PAGES = [
  createPage({
    id: 'thomas-home',
    slug: '',
    kind: 'home',
    routeKey: 'thomas-home',
    navLabel: 'Home',
    title: 'Custom Home Builder in Viera, FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes builds custom homes across Viera, Cocoa, Melbourne, Rockledge, Suntree, and Brevard County. Build on your lot or start your custom-home plan today.',
    h1: 'Custom Homes Built for the Way You Want to Live',
    eyebrow: 'Viera, 32940, and Brevard County',
    heroImage:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Thomas Custom Homes designs and builds custom residences for families who want more than a standard floor plan. Whether you are building in Viera, Cocoa, Melbourne, Rockledge, Suntree, or elsewhere in Brevard County, we help turn your lot, layout ideas, and budget goals into a finished home built around your life.',
      'From build-on-your-lot projects to higher-end custom homes with personalized finishes, our process is built around clear communication, practical planning, and quality craftsmanship. We work with homeowners who want a custom result without feeling lost in the process.',
    ],
    summaryTitle: 'What this site is built to help with',
    summaryItems: [
      'Build-on-your-lot planning in Viera and nearby communities',
      'Custom homes with layouts tailored to daily life and entertaining',
      'Luxury and higher-finish homes with personalized selections',
      'Relocation, out-of-state, and second-home planning support',
    ],
    sections: [
      {
        title: 'Areas We Serve',
        items: [
          'Viera and 32940',
          'Melbourne',
          'Rockledge',
          'Suntree',
          'Cocoa',
          'Brevard County',
        ],
      },
      {
        title: 'What We Build',
        items: [
          'Fully custom homes',
          'Build-on-your-lot homes',
          'Luxury and higher-finish custom homes',
          'Waterfront and lifestyle-oriented homes',
          'Homes for local buyers, relocators, and second-home owners',
        ],
      },
      {
        title: 'Why Homeowners Choose Us',
        paragraphs: [
          'The right builder should do more than promise a beautiful finished product. The right builder should also make the path feel organized from the beginning. Thomas Custom Homes is positioned for homeowners who want a builder that can listen closely, design intelligently, and manage the details that turn ideas into a finished home.',
          'We focus on building homes that feel personal instead of generic. That means aligning the floor plan with how you actually live, planning around your lot and its opportunities, and helping you make confident decisions about layout, finishes, and function.',
        ],
      },
      {
        title: 'For Out-of-State Buyers',
        paragraphs: [
          'If you are moving to the Space Coast from another state, we can structure the process around remote communication, virtual planning meetings, milestone updates, and a build approach designed to keep you informed even when you are not local.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-viera',
      'thomas-build-on-your-lot-viera',
      'thomas-relocating-to-viera',
      'thomas-cost-to-build-viera',
    ],
    primaryCtaCopy:
      'Request a build consultation to review your location, lot status, timeline, and custom-home goals.',
  }),
  createPage({
    id: 'thomas-viera',
    slug: 'custom-home-builder-viera-fl',
    kind: LOCATION_PAGE_KIND,
    routeKey: 'thomas-viera',
    navLabel: 'Viera',
    title: 'Custom Home Builder in Viera FL (32940) | Thomas Custom Homes',
    metaDescription:
      'Looking for a custom home builder in Viera, FL? Thomas Custom Homes builds custom homes, build-on-your-lot homes, and luxury homes in 32940 and nearby communities.',
    h1: 'Custom Home Builder in Viera, Florida',
    eyebrow: 'Primary Location Page',
    heroImage:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'If you are searching for a custom home builder in Viera, Florida, you are usually looking for more than a house. You are looking for the right location, the right layout, and the right long-term fit for your family and lifestyle. Thomas Custom Homes helps homeowners build custom residences in Viera with a process that keeps the project moving while protecting the details that matter.',
      'Viera continues to attract buyers who want a strong combination of newer development, access to the Space Coast, and a polished community feel. That makes the market competitive, and it makes custom-home positioning especially valuable for buyers who do not want a production-home experience.',
    ],
    summaryTitle: 'What We Help With in Viera',
    summaryItems: [
      'Building a custom home on your lot',
      'Planning a higher-end custom residence',
      'Designing a layout around daily lifestyle and entertaining needs',
      'Selecting finishes and features that fit your priorities',
      'Navigating a build in the broader Viera and 32940 market',
    ],
    sections: [
      {
        title: 'Why This Page Should Convert',
        paragraphs: [
          'A local searcher landing here should immediately understand that Thomas Custom Homes is a fit for Viera-specific custom-home work, not just generic construction. The goal is to make the service area, planning approach, and consultation path feel obvious from the first screen.',
          'Our approach is designed for clients who want flexibility in design, a more personalized build, and a finished home that reflects how they actually plan to live in the space.',
        ],
      },
    ],
    faqItems: [
      {
        question: 'Do you build on client-owned land in Viera?',
        answer:
          'Yes. Thomas Custom Homes works with buyers who already own land and want to plan a custom build around the lot, layout goals, and finish level.',
      },
      {
        question: 'Can you help if we are still evaluating lots?',
        answer:
          'Yes. Early consultations can help you evaluate whether a lot fits the kind of custom home you want before you move too far into the process.',
      },
      {
        question: 'Do you work with out-of-state buyers moving into 32940?',
        answer:
          'Yes. The planning process can be structured around remote communication, milestone updates, and consultation calls for buyers relocating to Viera.',
      },
    ],
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-melbourne',
      'thomas-cost-to-build-viera',
    ],
    adjacentPageId: 'thomas-melbourne',
    researchPageId: 'thomas-cost-to-build-viera',
  }),
  createPage({
    id: 'thomas-melbourne',
    slug: 'custom-home-builder-melbourne-fl',
    kind: LOCATION_PAGE_KIND,
    routeKey: 'thomas-melbourne',
    navLabel: 'Melbourne',
    title: 'Custom Home Builder in Melbourne FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes builds custom homes in Melbourne, FL with a streamlined build process, local expertise, and build-on-your-lot options.',
    h1: 'Custom Home Builder in Melbourne, Florida',
    eyebrow: 'Location Page',
    heroImage:
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Thomas Custom Homes serves Melbourne homeowners who want a home built around their needs instead of forced into a standard template. We work with buyers who value craftsmanship, flexibility, and a builder that can guide the process from planning through completion.',
      'Melbourne gives buyers a broad mix of established neighborhoods, newer areas, and access to everything that makes the Space Coast attractive. For homeowners who want a custom residence in this market, having a builder that understands both personalization and process is critical.',
    ],
    summaryTitle: 'What We Build in Melbourne',
    summaryItems: [
      'Custom family homes',
      'Build-on-your-lot homes',
      'Larger-format homes with upgraded finish packages',
      'Homes for primary residences, relocations, and second-home buyers',
    ],
    sections: [
      {
        title: 'Why This Page Matters',
        paragraphs: [
          'If you are comparing builders in Melbourne, the difference should not come down to who uses the biggest promises. It should come down to who can align design, communication, and construction in a way that gives you confidence from the beginning.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-rockledge',
      'thomas-best-neighborhoods-viera',
    ],
    adjacentPageId: 'thomas-rockledge',
    researchPageId: 'thomas-best-neighborhoods-viera',
  }),
  createPage({
    id: 'thomas-rockledge',
    slug: 'custom-home-builder-rockledge-fl',
    kind: LOCATION_PAGE_KIND,
    routeKey: 'thomas-rockledge',
    navLabel: 'Rockledge',
    title: 'Custom Home Builder in Rockledge FL | Thomas Custom Homes',
    metaDescription:
      'Build a custom home in Rockledge, FL with Thomas Custom Homes. Local custom-home expertise, build-on-your-lot service, and a practical process from concept to completion.',
    h1: 'Custom Home Builder in Rockledge, Florida',
    eyebrow: 'Location Page',
    heroImage:
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Thomas Custom Homes works with Rockledge-area buyers who want a more personalized build experience. Whether you already own land or are still working through the planning stage, we help turn your ideas into a buildable path and a finished home tailored to your lifestyle.',
      'Rockledge offers a strong location for homeowners who want access to the broader Brevard market while still building something distinctive. A custom home can make much more sense than trying to settle for an existing floor plan that does not fit your priorities.',
    ],
    summaryTitle: 'What Rockledge Buyers Care About',
    summaryItems: [
      'Efficient communication',
      'A realistic process and timeline',
      'A floor plan that actually fits daily life',
      'Material and finish choices that feel intentional',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This page should reassure the buyer that the process is organized, local, and flexible enough to deliver a genuinely custom result.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-suntree',
      'thomas-custom-vs-production-viera',
    ],
    adjacentPageId: 'thomas-suntree',
    researchPageId: 'thomas-custom-vs-production-viera',
  }),
  createPage({
    id: 'thomas-suntree',
    slug: 'custom-home-builder-suntree-fl',
    kind: LOCATION_PAGE_KIND,
    routeKey: 'thomas-suntree',
    navLabel: 'Suntree',
    title: 'Custom Home Builder in Suntree FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes serves Suntree, FL with custom-home construction, build-on-your-lot guidance, and high-quality personalized home design.',
    h1: 'Custom Home Builder in Suntree, Florida',
    eyebrow: 'Location Page',
    heroImage:
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'For buyers in Suntree, a custom home is often about refinement: a better layout, better flow, and a home that feels designed rather than selected from a menu. Thomas Custom Homes helps turn that vision into a build process that stays grounded and clear.',
      'Suntree attracts homeowners who want convenience, established appeal, and a polished living environment. That makes personalization especially valuable for buyers who do not want their home to feel interchangeable.',
    ],
    summaryTitle: 'How We Fit Suntree Buyers',
    summaryItems: [
      'Custom-home planning',
      'Design-forward build decisions',
      'Build-on-your-lot support',
      'Homes tailored for everyday comfort and entertaining',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This page positions Thomas Custom Homes as the local option for buyers who want a higher-touch building experience in and around Suntree.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-cocoa',
      'thomas-how-long-to-build-viera',
    ],
    adjacentPageId: 'thomas-cocoa',
    researchPageId: 'thomas-how-long-to-build-viera',
  }),
  createPage({
    id: 'thomas-cocoa',
    slug: 'custom-home-builder-cocoa-fl',
    kind: LOCATION_PAGE_KIND,
    routeKey: 'thomas-cocoa',
    navLabel: 'Cocoa',
    title: 'Custom Home Builder in Cocoa FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes builds custom homes and remodel-driven custom projects in Cocoa, FL. Talk with our team about your lot, design goals, and timeline.',
    h1: 'Custom Home Builder in Cocoa, Florida',
    eyebrow: 'Location Page',
    heroImage:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Thomas Custom Homes already has Cocoa relevance through its current website positioning, and this page preserves that strength while sharpening the custom-home message for organic search. The page speaks to homeowners who want a builder capable of delivering a tailored home instead of a generic construction service.',
      'Cocoa remains an important market for the broader Space Coast, and many homeowners search with a city-specific intent rather than a county-wide phrase. This page captures that traffic while clearly guiding users toward a consultation.',
    ],
    summaryTitle: 'Core Offers in Cocoa',
    summaryItems: [
      'Custom-home construction',
      'Build-on-your-lot projects',
      'Higher-finish custom builds',
      'Projects for local families and incoming relocators',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This page supports Cocoa visibility while the homepage and Viera pages drive the broader premium-intent strategy.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-brevard-county',
      'thomas-best-neighborhoods-viera',
    ],
    adjacentPageId: 'thomas-brevard-county',
    researchPageId: 'thomas-best-neighborhoods-viera',
  }),
  createPage({
    id: 'thomas-brevard-county',
    slug: 'custom-home-builder-brevard-county-fl',
    kind: LOCATION_PAGE_KIND,
    routeKey: 'thomas-brevard-county',
    navLabel: 'Brevard County',
    title: 'Custom Home Builder in Brevard County FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes serves Brevard County with custom-home construction, build-on-your-lot service, and personalized design-build guidance.',
    h1: 'Custom Home Builder in Brevard County, Florida',
    eyebrow: 'Regional Page',
    heroImage:
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=2084&auto=format&fit=crop',
    heroParagraphs: [
      'Some buyers search by city. Others search by county because they are still deciding where in the area they want to build. This page captures that broader search intent and directs buyers toward a consultation that narrows location, lot, and budget fit.',
      'Thomas Custom Homes serves homeowners across the Brevard County market, including Viera, Cocoa, Melbourne, Rockledge, and Suntree. The goal is to position the company as a practical local option for custom-home construction across the county.',
    ],
    summaryTitle: 'How This Page Supports Buyers',
    summaryItems: [
      'City-level guidance when you are still comparing areas',
      'Build-on-your-lot support across multiple Brevard communities',
      'A direct path into the most relevant location page',
      'Consultation-first planning around area, lot, and budget fit',
    ],
    sections: [
      {
        title: 'Next-Step Guidance',
        paragraphs: [
          'This page should push users into either the contact form or the most relevant location page based on their intended build area.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-viera',
      'thomas-cost-to-build-viera',
    ],
    adjacentPageId: 'thomas-viera',
    researchPageId: 'thomas-cost-to-build-viera',
  }),
  createPage({
    id: 'thomas-build-on-your-lot-viera',
    slug: 'build-on-your-lot-viera-fl',
    kind: SERVICE_PAGE_KIND,
    routeKey: 'thomas-build-on-your-lot-viera',
    navLabel: 'Build on Your Lot',
    title: 'Build on Your Lot in Viera FL | Thomas Custom Homes',
    metaDescription:
      'Own land in Viera or nearby? Thomas Custom Homes builds custom homes on client-owned lots with a clear process and personalized planning.',
    h1: 'Build on Your Lot in Viera, Florida',
    eyebrow: 'Service Page',
    heroImage:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop',
    heroParagraphs: [
      'If you already own land, or are actively evaluating land, building on your lot can give you more control over location, layout, privacy, and long-term value. Thomas Custom Homes works with buyers who want to use their own lot as the starting point for a fully custom home.',
      'A build-on-your-lot project is not just about house design. It is also about lot fit, site considerations, access, and making smart decisions early. This page reassures buyers that the process can be broken into clear steps and managed professionally.',
    ],
    summaryTitle: 'How the Process Works',
    summaryItems: [
      'Consultation to review lot status, goals, square footage, and budget range',
      'Preliminary planning around home style, layout, and site fit',
      'Selection and design refinement',
      'Construction planning and build execution',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'If you own a lot in Viera, 32940, or nearby Brevard County communities, Thomas Custom Homes can help turn that property into a finished custom home built around your priorities.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-viera',
      'thomas-build-from-out-of-state',
      'thomas-contact-guide',
    ],
    relocationArticleId: 'thomas-build-from-out-of-state',
    serviceName: 'Build on Your Lot in Viera',
  }),
  createPage({
    id: 'thomas-luxury-custom-homes-viera',
    slug: 'luxury-custom-homes-viera-fl',
    kind: SERVICE_PAGE_KIND,
    routeKey: 'thomas-luxury-custom-homes-viera',
    navLabel: 'Luxury Homes',
    title: 'Luxury Custom Homes in Viera FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes builds luxury custom homes in Viera, FL with personalized design, elevated finishes, and a detail-focused building process.',
    h1: 'Luxury Custom Homes in Viera, Florida',
    eyebrow: 'Service Page',
    heroImage:
      'https://images.unsplash.com/photo-1600585154526-990dcea4db0d?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Luxury custom homes should feel personal, not performative. This page speaks to buyers who care about quality, scale, flow, and finish decisions that create a refined final product.',
      'Thomas Custom Homes is positioned here as a builder for clients who want a more elevated home without losing the communication and practical planning that keep a project grounded.',
    ],
    summaryTitle: 'Luxury Themes',
    summaryItems: [
      'Open-concept living designed around the way the homeowner entertains',
      'Higher-end kitchen, bath, and finish selections',
      'Architectural details that create distinction without sacrificing comfort',
      'A custom process centered on fit, function, and long-term livability',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This page should convert buyers who are looking specifically for a more premium custom-home experience in Viera and the surrounding market.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-viera',
      'thomas-relocating-to-viera',
      'thomas-contact-guide',
    ],
    relocationArticleId: 'thomas-relocating-to-viera',
    serviceName: 'Luxury Custom Homes in Viera',
  }),
  createPage({
    id: 'thomas-waterfront-home-builder-viera',
    slug: 'waterfront-home-builder-viera-fl',
    kind: SERVICE_PAGE_KIND,
    routeKey: 'thomas-waterfront-home-builder-viera',
    navLabel: 'Waterfront Homes',
    title: 'Waterfront Home Builder in Viera FL | Thomas Custom Homes',
    metaDescription:
      'Planning a waterfront custom home in Viera or nearby? Thomas Custom Homes helps homeowners create personalized homes built for location, lifestyle, and long-term comfort.',
    h1: 'Waterfront Custom Homes in Viera, Florida',
    eyebrow: 'Service Page',
    heroImage:
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop',
    heroParagraphs: [
      'Waterfront buyers often care about more than square footage. They care about views, natural light, outdoor living, flow, and how the home feels in relation to the site. This page frames Thomas Custom Homes as a builder that understands lifestyle-based custom design.',
      'Even when waterfront inventory is limited, this topic still attracts high-value search intent and should stay part of the site architecture.',
    ],
    summaryTitle: 'What This Page Should Emphasize',
    summaryItems: [
      'Layout choices that maximize views and livability',
      'Indoor-outdoor design priorities',
      'Custom planning that takes the lot and orientation seriously',
      'A process designed around personalization rather than cookie-cutter plans',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This page captures buyers who are already thinking in terms of site, lifestyle, and long-term comfort rather than generic square footage.',
        ],
      },
    ],
    relatedLinks: [
      'thomas-viera',
      'thomas-build-from-out-of-state',
      'thomas-contact-guide',
    ],
    relocationArticleId: 'thomas-build-from-out-of-state',
    serviceName: 'Waterfront Custom Home Building in Viera',
  }),
  createPage({
    id: 'thomas-build-from-out-of-state',
    slug: 'build-a-home-in-viera-from-out-of-state',
    kind: RELOCATION_PAGE_KIND,
    routeKey: 'thomas-build-from-out-of-state',
    navLabel: 'Out-of-State Builds',
    title: 'Build a Home in Viera, FL from Out of State | Thomas Custom Homes',
    metaDescription:
      'Moving to Viera from another state? Thomas Custom Homes helps remote buyers plan and build a custom home with a clear communication process.',
    h1: 'Build a Home in Viera from Out of State',
    eyebrow: 'Relocation Page',
    heroImage:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Many buyers looking at Viera are not local yet. They are planning a move, researching neighborhoods, comparing builders, and trying to understand how a remote build process would actually work. This page speaks directly to that situation.',
      'Thomas Custom Homes helps out-of-state buyers build in Viera through a process built around planning calls, virtual check-ins, milestone communication, and a practical path from lot evaluation to finished home.',
    ],
    summaryTitle: 'What Remote Buyers Care About',
    summaryItems: [
      'How communication will work when they are not local',
      'How design decisions and selections are handled',
      'What timeline to expect',
      'How to narrow down build priorities before construction starts',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'If you are relocating to Viera and want a home designed around your family rather than a production model, Thomas Custom Homes can help you plan a build process that works even when you are managing the project remotely.',
        ],
      },
    ],
    midPagePromoId: 'thomas-build-on-your-lot-viera',
    relatedLinks: [
      'thomas-viera',
      'thomas-relocating-to-viera',
      'thomas-vacation-home-builder-viera',
    ],
  }),
  createPage({
    id: 'thomas-relocating-to-viera',
    slug: 'relocating-to-viera-florida',
    kind: RELOCATION_PAGE_KIND,
    routeKey: 'thomas-relocating-to-viera',
    navLabel: 'Relocation Guide',
    title: 'Relocating to Viera Florida? Custom Home Planning Guide | Thomas Custom Homes',
    metaDescription:
      'Relocating to Viera, Florida and thinking about building? Use this guide to understand your options, timing, and custom-home process.',
    h1: 'Relocating to Viera, Florida: What to Know Before You Build',
    eyebrow: 'Relocation Guide',
    heroImage:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Relocating to Viera is a major move, and many buyers quickly realize that buying an existing home and building a custom home are two very different decisions. This page helps them understand why a custom build may be the right option if layout, finishes, and long-term fit matter.',
    ],
    summaryTitle: 'What to Clarify Early',
    summaryItems: [
      'Choose your target area first',
      'Clarify whether you want a production-home shortcut or a custom-home result',
      'Define timeline, budget range, and lot status early',
      'Use consultations to narrow the process before making commitments',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This guide should feel helpful and search-friendly rather than overly salesy. It should build trust, then drive the visitor toward a consultation.',
        ],
      },
    ],
    midPagePromoId: 'thomas-viera',
    relatedLinks: [
      'thomas-build-from-out-of-state',
      'thomas-build-on-your-lot-viera',
      'thomas-cost-to-build-viera',
    ],
  }),
  createPage({
    id: 'thomas-vacation-home-builder-viera',
    slug: 'vacation-home-builder-viera-fl',
    kind: RELOCATION_PAGE_KIND,
    routeKey: 'thomas-vacation-home-builder-viera',
    navLabel: 'Vacation Homes',
    title: 'Vacation Home Builder in Viera FL | Thomas Custom Homes',
    metaDescription:
      'Thomas Custom Homes helps buyers planning a second home or vacation home in Viera create a personalized build around comfort, flexibility, and long-term use.',
    h1: 'Vacation and Second Home Builder in Viera, Florida',
    eyebrow: 'Buyer Profile Page',
    heroImage:
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Some buyers are planning a primary residence. Others are planning a second home, part-time home, or long-term lifestyle property. This page speaks to the second-home buyer who wants a custom result and a process they can manage confidently.',
    ],
    summaryTitle: 'Message Points',
    summaryItems: [
      'A home designed around how often you will use it',
      'Flexible rooms and guest-friendly layouts',
      'Remote-friendly communication for non-local owners',
      'A build process grounded in planning, not pressure',
    ],
    sections: [
      {
        title: 'Closing Perspective',
        paragraphs: [
          'This page expands the lead net by targeting a buyer profile that often has strong budget capacity and clear intent.',
        ],
      },
    ],
    midPagePromoId: 'thomas-luxury-custom-homes-viera',
    relatedLinks: [
      'thomas-build-from-out-of-state',
      'thomas-viera',
      'thomas-best-neighborhoods-viera',
    ],
  }),
  createPage({
    id: 'thomas-cost-to-build-viera',
    slug: 'cost-to-build-a-home-in-viera-fl',
    kind: ARTICLE_PAGE_KIND,
    routeKey: 'thomas-cost-to-build-viera',
    navLabel: 'Cost Guide',
    title: 'Cost to Build a Home in Viera, FL | Thomas Custom Homes',
    metaDescription:
      'Thinking about the cost to build a home in Viera, FL? Use this guide to understand what drives budget, value, and planning decisions.',
    h1: 'What Affects the Cost to Build a Home in Viera, Florida?',
    eyebrow: 'Research Guide',
    heroImage:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop',
    heroParagraphs: [
      'The real answer to cost is never one number. The cost to build a home in Viera depends on size, lot conditions, design complexity, finish level, and how custom the project truly is. Buyers often start by asking for a price per square foot, but that is only one part of the conversation.',
      'What matters more is understanding which decisions move the budget the most and which choices actually create the best long-term value for your household.',
    ],
    summaryTitle: 'Main Cost Drivers',
    summaryItems: [
      'Lot-related work and site preparation',
      'Square footage and overall complexity',
      'Roof lines, ceiling details, and structural design choices',
      'Kitchen, bath, flooring, and finish selections',
      'Outdoor living features and specialty spaces',
    ],
    sections: [
      {
        title: 'Why Buyers Should Think Beyond Price Per Square Foot',
        paragraphs: [
          'A lower number does not always mean a better outcome. A smart build budget is one that matches the home to the way you plan to live, protects the features that matter most, and avoids overbuilding the wrong areas.',
        ],
      },
      {
        title: 'Best Next Step',
        paragraphs: [
          'The best way to approach budget is to begin with a consultation that reviews your lot status, desired square footage, style goals, and finish expectations. That creates a more realistic starting point than chasing generic online averages.',
        ],
      },
    ],
    midPagePromoId: 'thomas-build-on-your-lot-viera',
    finalMoneyPageId: 'thomas-viera',
    relatedLinks: [
      'thomas-viera',
      'thomas-build-on-your-lot-viera',
      'thomas-how-long-to-build-viera',
    ],
  }),
  createPage({
    id: 'thomas-best-neighborhoods-viera',
    slug: 'best-neighborhoods-in-viera-fl',
    kind: ARTICLE_PAGE_KIND,
    routeKey: 'thomas-best-neighborhoods-viera',
    navLabel: 'Neighborhood Guide',
    title: 'Best Neighborhoods in Viera for Custom Homes | Thomas Custom Homes',
    metaDescription:
      'Exploring where to build in Viera? This guide covers how to think about neighborhoods, lot fit, lifestyle, and custom-home planning.',
    h1: 'Best Neighborhoods in Viera, Florida for a Custom Home Search',
    eyebrow: 'Research Guide',
    heroImage:
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'When buyers search for the best neighborhoods in Viera, they are usually asking a deeper question: where can we build a home that actually fits how we want to live? The answer depends on priorities like privacy, home style, community feel, convenience, and access to the parts of Brevard County that matter most to your routine.',
    ],
    summaryTitle: 'What to Compare',
    summaryItems: [
      'Lot availability and lot character',
      'Lifestyle fit and daily convenience',
      'Whether the area supports the type of home you want to build',
      'How much design flexibility matters to you',
    ],
    sections: [
      {
        title: 'How to Use This Guide',
        paragraphs: [
          'Instead of trying to memorize every neighborhood option, use your consultation to narrow the field based on your actual goals. A custom-home decision gets easier when the location and the floor plan are being considered together rather than separately.',
        ],
      },
      {
        title: 'CTA Tie-In',
        paragraphs: [
          'If you are still deciding where to build, Thomas Custom Homes can help you think through the right questions before you move too far into the process.',
        ],
      },
    ],
    midPagePromoId: 'thomas-viera',
    finalMoneyPageId: 'thomas-build-on-your-lot-viera',
    relatedLinks: [
      'thomas-viera',
      'thomas-build-on-your-lot-viera',
      'thomas-relocating-to-viera',
    ],
  }),
  createPage({
    id: 'thomas-custom-vs-production-viera',
    slug: 'custom-vs-production-homes-viera',
    kind: ARTICLE_PAGE_KIND,
    routeKey: 'thomas-custom-vs-production-viera',
    navLabel: 'Custom vs Production',
    title: 'Custom vs Production Homes in Viera | Thomas Custom Homes',
    metaDescription:
      'Comparing a custom home to a production home in Viera? Learn the tradeoffs and decide which option fits your goals better.',
    h1: 'Custom Home vs Production Home in Viera: Which One Fits You Better?',
    eyebrow: 'Comparison Guide',
    heroImage:
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'For many buyers, the real decision is not whether to build. It is whether to build something custom or choose a production-home route. Both paths have a place, but they serve very different priorities.',
    ],
    summaryTitle: 'When Production Homes Make Sense',
    summaryItems: [
      'You want a faster, more fixed-menu process',
      'You are comfortable with limited personalization',
      'You prefer choosing from pre-set layouts and packages',
    ],
    sections: [
      {
        title: 'When a Custom Home Makes More Sense',
        items: [
          'You want a layout tailored to your household',
          'You care about details and flow, not just square footage',
          'You want more flexibility in finish choices and home character',
          'You want the lot and the design to work together',
        ],
      },
      {
        title: 'Closing Perspective',
        paragraphs: [
          'If you already know you want a home that feels specifically designed for your life, a custom path is usually the better fit. Thomas Custom Homes is positioned for buyers who want that level of personalization.',
        ],
      },
    ],
    midPagePromoId: 'thomas-viera',
    finalMoneyPageId: 'thomas-luxury-custom-homes-viera',
    relatedLinks: [
      'thomas-viera',
      'thomas-luxury-custom-homes-viera',
      'thomas-how-long-to-build-viera',
    ],
  }),
  createPage({
    id: 'thomas-how-long-to-build-viera',
    slug: 'how-long-does-it-take-to-build-a-home-in-viera-fl',
    kind: ARTICLE_PAGE_KIND,
    routeKey: 'thomas-how-long-to-build-viera',
    navLabel: 'Timeline Guide',
    title: 'How Long Does It Take to Build a Home in Viera, FL? | Thomas Custom Homes',
    metaDescription:
      'Use this guide to understand what affects custom-home timelines in Viera and how to prepare for a smoother building process.',
    h1: 'How Long Does It Take to Build a Custom Home in Viera, Florida?',
    eyebrow: 'Planning Guide',
    heroImage:
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop',
    heroParagraphs: [
      'Timeline matters because buyers are planning around more than construction. They are planning around moves, school timing, financing decisions, and life logistics. A custom-home timeline in Viera depends on planning quality, design complexity, lot readiness, and construction execution.',
    ],
    summaryTitle: 'Timeline Stages',
    summaryItems: [
      'Initial consultation and planning',
      'Design and selection decisions',
      'Pre-construction preparation',
      'Construction and milestone management',
      'Final walkthrough and completion',
    ],
    sections: [
      {
        title: 'What Slows Projects Down',
        paragraphs: [
          'Indecision, weak planning, major design changes made late, and unclear expectations can all create avoidable delays. The more organized the early planning stage is, the better the build process typically runs.',
        ],
      },
      {
        title: 'Best Next Step',
        paragraphs: [
          'If you want a more realistic timeline for your goals, the best next step is a consultation based on your lot status, home size, and target finish level.',
        ],
      },
    ],
    midPagePromoId: 'thomas-build-on-your-lot-viera',
    finalMoneyPageId: 'thomas-viera',
    relatedLinks: [
      'thomas-build-on-your-lot-viera',
      'thomas-viera',
      'thomas-cost-to-build-viera',
    ],
  }),
  createPage({
    id: 'thomas-contact-guide',
    slug: 'contact',
    kind: 'utility',
    routeKey: 'thomas-contact-guide',
    navLabel: 'Contact',
    title: 'Contact Thomas Custom Homes | Request a Consultation',
    metaDescription:
      'Request a consultation with Thomas Custom Homes to discuss your lot status, timeline, budget, and custom-home goals in Viera and Brevard County.',
    h1: 'Request a Consultation',
    eyebrow: 'Contact',
    heroImage:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop',
    heroParagraphs: [
      'Use this page when you are ready to talk about your lot, target timeline, project city, and the kind of custom home or major remodel you want to plan.',
    ],
    summaryTitle: 'What to Share',
    summaryItems: [
      'Your project city',
      'Your lot status',
      'Budget range and desired completion timing',
      'The kind of home or renovation you want to discuss',
    ],
    sections: [],
    relatedLinks: ['thomas-home', 'thomas-viera', 'thomas-build-on-your-lot-viera'],
  }),
];

export const THOMAS_PAGE_MAP = new Map(THOMAS_SEO_PAGES.map((page) => [page.id, page]));
export const THOMAS_PAGE_BY_ROUTE_KEY = new Map(
  THOMAS_SEO_PAGES.map((page) => [page.routeKey, page]),
);
export const THOMAS_PAGE_BY_SLUG = new Map(THOMAS_SEO_PAGES.map((page) => [page.slug, page]));

export const THOMAS_INDEXABLE_PAGES = THOMAS_SEO_PAGES.filter((page) => page.kind !== 'utility');

export function getThomasPageById(pageId) {
  return THOMAS_PAGE_MAP.get(pageId) || THOMAS_PAGE_MAP.get('thomas-home');
}

export function getThomasPageByRouteKey(routeKey) {
  return THOMAS_PAGE_BY_ROUTE_KEY.get(routeKey) || THOMAS_PAGE_MAP.get('thomas-home');
}

function trimTrailingSlash(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\/+$/, '');
  return normalized || '/';
}

export function normalizeThomasPathname(pathname = '/') {
  let normalized = trimTrailingSlash(pathname);

  if (normalized === THOMAS_EB28_BASE_PATH) {
    return '/';
  }

  if (normalized.startsWith(`${THOMAS_EB28_BASE_PATH}/`)) {
    normalized = normalized.slice(THOMAS_EB28_BASE_PATH.length) || '/';
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized === '/contact' ? '/contact' : normalized;
}

export function getThomasPageForLocation({ pathname = '/', hostname = '' } = {}) {
  const rawPathname = trimTrailingSlash(pathname);
  const isEb28ThomasPath =
    rawPathname === THOMAS_EB28_BASE_PATH || rawPathname.startsWith(`${THOMAS_EB28_BASE_PATH}/`);
  const isPrimaryHost = isThomasPrimaryHostname(hostname);

  if (!isPrimaryHost && !isEb28ThomasPath) {
    return null;
  }

  const normalizedPathname = normalizeThomasPathname(pathname);
  const slug = normalizedPathname === '/' ? '' : normalizedPathname.slice(1);

  if (THOMAS_PAGE_BY_SLUG.has(slug)) {
    return THOMAS_PAGE_BY_SLUG.get(slug);
  }

  if (isPrimaryHost) {
    return THOMAS_PAGE_MAP.get('thomas-home');
  }

  return null;
}

export function getThomasPrimaryPath(pageOrId) {
  const page = typeof pageOrId === 'string' ? getThomasPageById(pageOrId) : pageOrId;
  if (!page || !page.slug) {
    return '/';
  }

  return `/${page.slug}/`;
}

export function getThomasEb28Path(pageOrId) {
  const page = typeof pageOrId === 'string' ? getThomasPageById(pageOrId) : pageOrId;
  if (!page || !page.slug) {
    return `${THOMAS_EB28_BASE_PATH}/`;
  }

  return `${THOMAS_EB28_BASE_PATH}/${page.slug}/`;
}

export function getThomasPathForHostname(pageOrId, hostname = '') {
  return isThomasPrimaryHostname(hostname)
    ? getThomasPrimaryPath(pageOrId)
    : getThomasEb28Path(pageOrId);
}

export function getThomasCanonicalUrl(pageOrId, origin = THOMAS_PRIMARY_ORIGIN) {
  const page = typeof pageOrId === 'string' ? getThomasPageById(pageOrId) : pageOrId;
  return `${origin}${getThomasPrimaryPath(page)}`;
}

export function buildThomasSitemapXml(origin = THOMAS_PRIMARY_ORIGIN) {
  const urls = THOMAS_INDEXABLE_PAGES.map((page) => `${origin}${getThomasPrimaryPath(page)}`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

export function buildThomasRobotsTxt(origin = THOMAS_PRIMARY_ORIGIN) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
