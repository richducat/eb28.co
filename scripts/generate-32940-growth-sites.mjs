#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'public', '32940');
const replacementProspectsPath = path.join(repoRoot, 'scripts', 'data', '32940-replacement-prospects.json');
const claimEmail = 'social@eb28.co';
const studioUrl = 'https://eb28.co/melbournewebstudio/';

const baseProspects = [
  {
    slug: 'arabesque-flavors-of-the-middle-east',
    name: 'Arabesque Flavors of the Middle East',
    category: 'Middle Eastern restaurant',
    audience: 'families, lunch regulars, and dinner guests near Viera and Suntree',
    action: 'view the menu and plan a visit',
    focus: ['Menu-first mobile layout', 'Catering and group-order prompts', 'Local search pages for dinner, lunch, and catering'],
  },
  {
    slug: 'asian-wok',
    name: 'Asian Wok',
    category: 'Asian restaurant',
    audience: 'nearby takeout customers and families comparing dinner options',
    action: 'call, order, or check hours quickly',
    focus: ['Fast takeout CTA', 'Menu sections built for phones', 'Google-ready service and cuisine copy'],
  },
  {
    slug: 'bean-sprout-asian-cuisine-sushi-bar',
    name: 'Bean Sprout Asian Cuisine & Sushi Bar',
    category: 'Asian cuisine and sushi bar',
    audience: 'sushi customers, dinner groups, and local takeout searches',
    action: 'browse sushi options and book a visit',
    focus: ['Sushi and entree highlights', 'Reservation and takeout paths', 'Weekly content for nearby food searches'],
  },
  {
    slug: 'bella-title-escrow',
    name: 'Bella Title & Escrow',
    category: 'title and escrow office',
    audience: 'buyers, sellers, agents, and lenders needing a clear closing partner',
    action: 'request a closing conversation',
    focus: ['Trust-first service pages', 'Agent and lender enquiry forms', 'Local search copy for closings and escrow'],
  },
  {
    slug: 'bizzarro-s-pizza',
    name: "Bizzarro's Pizza",
    category: 'pizza restaurant',
    audience: 'families, office lunch buyers, and game-night pickup customers',
    action: 'order pizza or call the store',
    focus: ['Order-now mobile flow', 'Lunch and catering prompts', 'Local blog posts around pizza and group meals'],
  },
  {
    slug: 'bold-cup-coffee',
    name: 'Bold Cup Coffee',
    category: 'coffee shop',
    audience: 'morning commuters, remote workers, and local coffee regulars',
    action: 'find hours, location, and featured drinks',
    focus: ['Cafe atmosphere section', 'Drink and pastry highlights', 'Weekly posts for coffee near me searches'],
  },
  {
    slug: 'cedar-s-cafe',
    name: "Cedar's Cafe",
    category: 'local cafe',
    audience: 'breakfast, lunch, and casual dining customers nearby',
    action: 'check the menu and plan a visit',
    focus: ['Menu and hours above the fold', 'Catering and group dining prompts', 'Food photography-ready layout'],
  },
  {
    slug: 'diane-s-nails',
    name: "Diane's Nails",
    category: 'nail salon',
    audience: 'clients booking manicures, pedicures, and nail appointments',
    action: 'call for an appointment',
    focus: ['Service menu with pricing-ready structure', 'Call and booking buttons', 'Local nail salon SEO pages'],
  },
  {
    slug: 'dynasty-nail-spa',
    name: 'Dynasty Nail Spa',
    category: 'nail spa',
    audience: 'walk-in and appointment clients near Suntree and Viera',
    action: 'book a nail or spa visit',
    focus: ['Mobile appointment CTA', 'Service gallery sections', 'Google Business Profile post topics'],
  },
  {
    slug: 'eatz',
    name: 'Eatz',
    category: 'local restaurant',
    audience: 'nearby customers deciding where to eat today',
    action: 'see the food, hours, and next step',
    focus: ['Simple menu-first homepage', 'Daily special and catering blocks', 'Restaurant SEO foundation'],
  },
  {
    slug: 'el-tesoro-cocina-mexicana',
    name: 'El Tesoro Cocina Mexicana',
    category: 'Mexican restaurant',
    audience: 'locals searching for Mexican food, tacos, margaritas, and dinner spots',
    action: 'view the menu or visit today',
    focus: ['Cuisine-specific landing copy', 'Happy hour and specials sections', 'Weekly local food posts'],
  },
  {
    slug: 'elegant-nail-spa',
    name: 'Elegant Nail Spa',
    category: 'nail spa',
    audience: 'clients comparing manicure, pedicure, and salon options',
    action: 'book an appointment',
    focus: ['Appointment-first layout', 'Service and care pages', 'Trust signals without clutter'],
  },
  {
    slug: 'fairway-cigar-lounge',
    name: 'Fairway Cigar Lounge',
    category: 'cigar lounge',
    audience: 'cigar shoppers, lounge members, and visitors looking for a relaxed local spot',
    action: 'find the lounge, inventory, and events',
    focus: ['Membership and event modules', 'Inventory highlight sections', 'Local search copy for cigar lounge queries'],
  },
  {
    slug: 'flying-burro',
    name: 'Flying Burro',
    category: 'local restaurant',
    audience: 'lunch, dinner, and casual takeout customers',
    action: 'browse the menu and plan a meal',
    focus: ['Fast menu CTA', 'Location and hours panel', 'Local content for food searches'],
  },
  {
    slug: 'fujiyama-japanese',
    name: 'Fujiyama Japanese',
    category: 'Japanese restaurant',
    audience: 'sushi, hibachi, and Japanese food customers nearby',
    action: 'book, call, or view menu options',
    focus: ['Cuisine-led hero copy', 'Sushi and hibachi sections', 'Search pages for Japanese food near me'],
  },
  {
    slug: 'gatto-s-tire-and-auto-services',
    name: "Gatto's Tire & Auto Services",
    category: 'auto repair and tire shop',
    audience: 'drivers needing tires, maintenance, and trustworthy repairs',
    action: 'request service or call the shop',
    focus: ['Service request form', 'Trust and maintenance pages', 'Local SEO for tires, brakes, and repairs'],
  },
  {
    slug: 'genna-pizza-express',
    name: 'Genna Pizza Express',
    category: 'pizza restaurant',
    audience: 'pickup, delivery, and casual dining customers',
    action: 'order pizza or check hours',
    focus: ['Order-first mobile layout', 'Catering and party prompts', 'Weekly pizza and local dining content'],
  },
  {
    slug: 'harbor-city-animal-hospital',
    name: 'Harbor City Animal Hospital',
    category: 'veterinary clinic',
    audience: 'pet owners searching for veterinary care and appointment availability',
    action: 'request an appointment or call the clinic',
    focus: ['Appointment request path', 'Service pages for common pet care searches', 'Trust-first clinic layout'],
  },
  {
    slug: 'luxy-nail-spa',
    name: 'Luxy Nail Spa',
    category: 'nail spa',
    audience: 'clients booking nail care, spa services, and repeat appointments',
    action: 'book or call quickly',
    focus: ['Service menu and gallery', 'Mobile booking CTA', 'Local nail and spa content'],
  },
  {
    slug: 'olive-tree-greek-grill',
    name: 'Olive Tree Greek Grill',
    category: 'Greek restaurant',
    audience: 'Mediterranean food fans, lunch customers, and families nearby',
    action: 'view menu and visit',
    focus: ['Greek menu highlights', 'Lunch and catering sections', 'Weekly content for Mediterranean searches'],
  },
  {
    slug: 'botta-pizzeria-bakery',
    name: 'Botta Pizzeria & Bakery',
    category: 'Neapolitan pizza and bakery',
    audience: 'families, takeout buyers, and diners looking for fresh pizza, pastries, and Italian food near Viera',
    action: 'view the menu, order, or plan a visit',
    focus: ['Menu and ordering path', 'Bakery and pizza sections', 'Local content for pizza, pastry, and catering searches'],
  },
  {
    slug: 'poke-fin-viera',
    name: 'Poke Fin Viera',
    category: 'poke and boba shop',
    audience: 'customers looking for fresh poke bowls, boba drinks, and quick meals near Viera',
    action: 'view bowls, drinks, and ordering details',
    focus: ['Visual menu sections', 'Order and visit CTAs', 'Weekly posts for poke, boba, and healthy lunch searches'],
  },
  {
    slug: 'pristine-spa',
    name: 'Pristine Spa',
    category: 'spa',
    audience: 'clients searching for self-care, skincare, and spa appointments',
    action: 'book a spa visit',
    focus: ['Treatment menu layout', 'Calm conversion path', 'Local spa SEO articles'],
  },
  {
    slug: 'realm-nails-spa',
    name: 'Realm Nails & Spa',
    category: 'nail spa',
    audience: 'appointment and walk-in nail clients nearby',
    action: 'book a manicure, pedicure, or spa service',
    focus: ['Service menu blocks', 'Appointment CTA', 'Local nail salon search content'],
  },
  {
    slug: 'revolutions-cyclery',
    name: 'Revolutions Cyclery',
    category: 'bike shop',
    audience: 'cyclists needing bikes, gear, repairs, and local shop expertise',
    action: 'request service or visit the shop',
    focus: ['Repair and tune-up pages', 'Inventory-ready sections', 'Cycling content for local search'],
  },
  {
    slug: 'suntree-florist',
    name: 'Suntree Florist',
    category: 'florist',
    audience: 'gift buyers, event planners, and customers needing local flower delivery',
    action: 'order flowers or request an arrangement',
    focus: ['Occasion landing pages', 'Delivery and order CTAs', 'Weekly flower and event content'],
  },
  {
    slug: 'suntree-flower-shop',
    name: 'Suntree Flower Shop',
    category: 'flower shop',
    audience: 'customers searching for arrangements, gifts, sympathy flowers, and delivery',
    action: 'order or request a custom arrangement',
    focus: ['Delivery-first layout', 'Occasion-based SEO pages', 'Clear phone and quote path'],
  },
  {
    slug: 'the-salty-bagel',
    name: 'The Salty Bagel',
    category: 'bagel shop',
    audience: 'breakfast customers, office orders, and weekend regulars',
    action: 'check the menu and visit',
    focus: ['Breakfast menu layout', 'Catering and office order prompts', 'Local posts for bagels and breakfast'],
  },
  {
    slug: 'the-shabby-loft',
    name: 'The Shabby Loft',
    category: 'boutique retail shop',
    audience: 'local shoppers looking for gifts, decor, and unique finds',
    action: 'visit the shop or ask about inventory',
    focus: ['Product story sections', 'Event and new-arrival prompts', 'Local retail SEO foundation'],
  },
  {
    slug: 'urban-prime',
    name: 'Urban Prime',
    category: 'restaurant and market',
    audience: 'dining guests, market shoppers, and event customers',
    action: 'reserve, shop, or plan a visit',
    focus: ['Restaurant and market split navigation', 'Event and private dining prompts', 'Local search content for dining and market queries'],
  },
];

const avenueProspects = [
  {
    slug: 'clevens-face-and-body-specialist',
    name: 'Clevens Face and Body Specialist',
    category: 'aesthetic medicine and skincare practice',
    audience: 'clients comparing cosmetic, skincare, and wellness appointments near Viera',
    action: 'book a consultation or call the location',
    focus: ['Service menu and consultation path', 'Before-visit trust and location details', 'Weekly content for local skincare and aesthetics searches'],
  },
  {
    slug: 'escapology',
    name: 'Escapology',
    category: 'escape room and entertainment venue',
    audience: 'families, date-night guests, teams, and groups planning local activities',
    action: 'book an escape room or plan a group visit',
    focus: ['Private room booking path', 'Group event and party prompts', 'Local activity content for Viera searches'],
  },
  {
    slug: 'sirocco-station',
    name: 'Sirocco Station',
    category: 'Lebanese and Mediterranean restaurant',
    audience: 'local diners, shoppers, and families comparing where to eat near Viera',
    action: 'view menu, order, reserve, or visit',
    focus: ['Menu and ordering path above the fold', 'Location, hours, and event-friendly content', 'Weekly local search posts for nearby food queries'],
  },
  {
    slug: 'viera-discovery-center',
    name: 'Viera Discovery Center',
    category: 'community discovery center',
    audience: 'home buyers, visitors, and families learning about the Viera community',
    action: 'plan a visit or request community information',
    focus: ['Community information paths', 'Builder and relocation prompts', 'Weekly content for Viera relocation searches'],
  },
  {
    slug: 'nourish',
    name: 'Nourish',
    category: 'body care and home goods retailer',
    audience: 'local shoppers looking for gifts, home goods, and self-care products',
    action: 'browse categories and plan a visit',
    focus: ['Product category navigation', 'Gift, seasonal, and event prompts', 'Local search content for shoppers'],
  },
  {
    slug: 'trader-joes',
    name: "Trader Joe's",
    category: 'specialty grocery store',
    audience: 'grocery shoppers and families comparing nearby food and pantry options',
    action: 'check location details and plan a visit',
    focus: ['Store visit information', 'Featured category sections', 'Local grocery and shopping content'],
  },
  {
    slug: 'j-crew-factory',
    name: 'J.Crew Factory',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'lets-plant-it',
    name: "Let's Plant It",
    category: 'plant and gift shop',
    audience: 'local shoppers looking for plants, gifts, workshops, and interactive retail experiences',
    action: 'browse plant options, book an experience, or visit',
    focus: ['Workshop and visit prompts', 'Plant care content sections', 'Local gift and plant search pages'],
  },
  {
    slug: 'tommy-bahama',
    name: 'Tommy Bahama',
    category: 'apparel and lifestyle retailer',
    audience: 'local shoppers comparing coastal styles, gifts, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'kendra-scott',
    name: 'Kendra Scott',
    category: 'jewelry and accessories shop',
    audience: 'gift buyers, shoppers, and customers looking for in-store jewelry help',
    action: 'browse products, call, or plan a visit',
    focus: ['Product-category landing sections', 'Gift and occasion prompts', 'Local shopping SEO content'],
  },
  {
    slug: 'crumbl',
    name: 'Crumbl',
    category: 'cookie and dessert shop',
    audience: 'dessert buyers, families, office treat shoppers, and event hosts',
    action: 'view weekly flavors, order, or visit',
    focus: ['Weekly flavor and ordering path', 'Gift and event prompts', 'Local dessert search content'],
  },
  {
    slug: 'southern-tide',
    name: 'Southern Tide',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing coastal styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'air-anchor',
    name: 'Air & Anchor',
    category: 'jewelry and accessories shop',
    audience: 'gift buyers, shoppers, and customers looking for in-store help',
    action: 'browse products, call, or plan a visit',
    focus: ['Product-category landing sections', 'Gift and occasion prompts', 'Local shopping SEO content'],
  },
  {
    slug: 'american-eagle',
    name: 'American Eagle',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'aerie',
    name: 'Aerie',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'nordstrom-rack',
    name: 'Nordstrom Rack',
    category: 'apparel and home retailer',
    audience: 'local shoppers comparing fashion, shoes, home items, and in-store deals',
    action: 'visit the store or browse featured departments',
    focus: ['Department navigation', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'warby-parker',
    name: 'Warby Parker',
    category: 'eyewear shop',
    audience: 'customers comparing glasses, eye exams, and local eyewear help',
    action: 'book an appointment, browse frames, or visit',
    focus: ['Appointment and frame browsing paths', 'Insurance and visit-ready content', 'Local eyewear search pages'],
  },
  {
    slug: 'viera-dental',
    name: 'Viera Dental',
    category: 'dental practice',
    audience: 'families and patients comparing dental appointments near Viera',
    action: 'request an appointment or call the office',
    focus: ['Service and insurance-ready pages', 'Appointment request path', 'Local dental search content'],
  },
  {
    slug: 'verizon-wireless',
    name: 'Verizon Wireless',
    category: 'wireless phone store',
    audience: 'customers comparing phones, plans, device help, and local availability',
    action: 'book, call, or visit',
    focus: ['Service and device paths', 'Location and availability modules', 'Weekly content for local phone searches'],
  },
  {
    slug: 'urban-air-adventure-park',
    name: 'Urban Air Adventure Park',
    category: 'indoor adventure park',
    audience: 'families, birthday planners, and groups looking for indoor activities',
    action: 'book tickets, parties, or group events',
    focus: ['Ticket and party booking paths', 'Group event modules', 'Local activity and birthday content'],
  },
  {
    slug: 'tuscany-grill',
    name: 'Tuscany Grill',
    category: 'Italian restaurant',
    audience: 'local diners, shoppers, and families comparing where to eat near Viera',
    action: 'view menu, reserve, order, or visit',
    focus: ['Menu and reservation path above the fold', 'Location, hours, and event-friendly content', 'Weekly local Italian food posts'],
  },
  {
    slug: 'thai-hana',
    name: 'Thai Hana',
    category: 'Thai and sushi restaurant',
    audience: 'sushi, Thai food, dinner, and takeout customers near Viera',
    action: 'view menu, order, reserve, or visit',
    focus: ['Menu and ordering path above the fold', 'Sushi and Thai category sections', 'Weekly local food search posts'],
  },
  {
    slug: 'talbots',
    name: 'Talbots',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'sur-la-table',
    name: 'Sur La Table',
    category: 'kitchenware and cooking retailer',
    audience: 'home cooks, gift buyers, and shoppers comparing kitchen products and classes',
    action: 'browse categories, book a class, or plan a visit',
    focus: ['Product and class navigation', 'Gift and seasonal prompts', 'Local kitchenware search content'],
  },
  {
    slug: 'sunglass-hut',
    name: 'Sunglass Hut',
    category: 'eyewear and accessories shop',
    audience: 'gift buyers, shoppers, and customers looking for sunglasses near Viera',
    action: 'browse products, call, or plan a visit',
    focus: ['Product-category landing sections', 'Gift and occasion prompts', 'Local shopping SEO content'],
  },
  {
    slug: 'steak-n-shake',
    name: "Steak 'n Shake",
    category: 'burger restaurant',
    audience: 'burger, shake, lunch, and family dining customers near Viera',
    action: 'view menu, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Location, hours, and offer content', 'Weekly local burger search posts'],
  },
  {
    slug: 'sport-clips',
    name: 'Sport Clips',
    category: 'hair salon',
    audience: 'clients comparing haircuts, wait times, and nearby appointment options',
    action: 'check in, book, or visit',
    focus: ['Service menu and booking path', 'Before-visit trust and location details', 'Weekly content for local haircut searches'],
  },
  {
    slug: 'spectrum',
    name: 'Spectrum',
    category: 'internet and mobile service store',
    audience: 'customers comparing internet, TV, mobile, and in-store service options',
    action: 'call, compare plans, or visit',
    focus: ['Service path navigation', 'Location and support modules', 'Weekly content for local internet service searches'],
  },
  {
    slug: 'soma',
    name: 'Soma',
    category: 'apparel and intimates retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'sola-salons',
    name: 'Sola Salons',
    category: 'salon studio suites',
    audience: 'beauty professionals and clients looking for salon services near Viera',
    action: 'book a service or request studio information',
    focus: ['Service and studio paths', 'Professional and client CTAs', 'Local salon search content'],
  },
  {
    slug: 'sleep-number-by-select-comfort',
    name: 'Sleep Number by Select Comfort',
    category: 'mattress and sleep retailer',
    audience: 'local shoppers comparing mattresses, sleep products, and in-store help',
    action: 'browse products, call, or plan a visit',
    focus: ['Product category navigation', 'Consultation and store visit prompts', 'Local sleep product content'],
  },
  {
    slug: 'skin-laundry',
    name: 'Skin Laundry',
    category: 'skincare clinic',
    audience: 'clients comparing facial, laser, and skincare appointments near Viera',
    action: 'book an appointment or call the location',
    focus: ['Treatment menu and booking path', 'Before-visit trust and location details', 'Weekly content for local skincare searches'],
  },
  {
    slug: 'sephora',
    name: 'Sephora',
    category: 'beauty retailer',
    audience: 'beauty shoppers comparing products, services, and local availability',
    action: 'browse products, book a service, or visit',
    focus: ['Product and service paths', 'Store visit and offer CTAs', 'Local beauty shopping content'],
  },
  {
    slug: 'sally-beauty-supply',
    name: 'Sally Beauty Supply',
    category: 'beauty supply retailer',
    audience: 'beauty shoppers and professionals comparing products and local availability',
    action: 'browse products, call, or visit',
    focus: ['Product category navigation', 'Professional and shopper CTAs', 'Local beauty supply search content'],
  },
  {
    slug: 'playa-bowls',
    name: 'Playa Bowls',
    category: 'acai bowl and smoothie shop',
    audience: 'smoothie, bowl, breakfast, and quick-meal customers near Viera',
    action: 'view menu, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Healthy meal and catering prompts', 'Weekly local bowl and smoothie posts'],
  },
  {
    slug: 'pizza-gallery-grill',
    name: 'Pizza Gallery & Grill',
    category: 'pizza restaurant and grill',
    audience: 'pizza, dinner, patio, and group dining customers near Viera',
    action: 'view menu, reserve, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Group dining and event modules', 'Weekly local pizza search posts'],
  },
  {
    slug: 'pearle-vision',
    name: 'Pearle Vision',
    category: 'eye care and eyewear office',
    audience: 'patients comparing eye exams, glasses, contacts, and local eyewear help',
    action: 'book an appointment, browse frames, or visit',
    focus: ['Appointment and frame browsing paths', 'Insurance and visit-ready content', 'Local eye care search pages'],
  },
  {
    slug: 'paris-banh-mi',
    name: 'Paris Banh Mi',
    category: 'Vietnamese cafe and bakery',
    audience: 'banh mi, boba, bakery, and quick lunch customers near Viera',
    action: 'view menu, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Bakery and drink category sections', 'Weekly local cafe search posts'],
  },
  {
    slug: 'panera-bread',
    name: 'Panera Bread',
    category: 'bakery cafe',
    audience: 'breakfast, lunch, coffee, catering, and quick-meal customers near Viera',
    action: 'view menu, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Catering and office order prompts', 'Weekly local cafe search posts'],
  },
  {
    slug: 'old-navy',
    name: 'Old Navy',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'office-depot',
    name: 'Office Depot',
    category: 'office supply and print shop',
    audience: 'local businesses, students, and shoppers looking for supplies, printing, and tech help',
    action: 'browse services, call, or plan a visit',
    focus: ['Print and service navigation', 'Business supply prompts', 'Local office service content'],
  },
  {
    slug: 'nothing-bundt-cakes',
    name: 'Nothing Bundt Cakes',
    category: 'cake and dessert shop',
    audience: 'birthday, office, event, and dessert buyers near Viera',
    action: 'browse cakes, order, or visit',
    focus: ['Cake ordering path', 'Occasion and event prompts', 'Weekly local dessert search content'],
  },
  {
    slug: 'moes-southwest-grill',
    name: "Moe's Southwest Grill",
    category: 'Mexican fast-casual restaurant',
    audience: 'lunch, dinner, catering, and takeout customers near Viera',
    action: 'view menu, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Catering and group-order prompts', 'Weekly local Mexican food posts'],
  },
  {
    slug: 'mens-wearhouse',
    name: "Men's Wearhouse",
    category: 'menswear and formalwear retailer',
    audience: 'local shoppers comparing suits, tuxedos, tailoring, and in-store help',
    action: 'book, browse collections, or visit',
    focus: ['Formalwear and tailoring paths', 'Appointment and event prompts', 'Seasonal local menswear content'],
  },
  {
    slug: 'the-melting-pot',
    name: 'The Melting Pot',
    category: 'fondue restaurant',
    audience: 'date-night diners, families, celebrations, and group dining customers',
    action: 'view menu, reserve, or plan a celebration',
    focus: ['Reservation and menu path', 'Celebration and group dining prompts', 'Weekly local date-night content'],
  },
  {
    slug: 'massage-envy',
    name: 'Massage Envy',
    category: 'massage and skincare studio',
    audience: 'clients comparing massage, stretch, facial, and wellness appointments',
    action: 'book an appointment or call the location',
    focus: ['Service menu and booking path', 'Membership and first-visit content', 'Weekly content for local massage searches'],
  },
  {
    slug: 'lululemon',
    name: 'lululemon',
    category: 'athletic apparel retailer',
    audience: 'local shoppers comparing activewear, gear, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and community prompts', 'Seasonal local activewear content'],
  },
  {
    slug: 'longhorn-steakhouse',
    name: 'Longhorn Steakhouse',
    category: 'steakhouse restaurant',
    audience: 'dinner, lunch, family, and group dining customers near Viera',
    action: 'view menu, join waitlist, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Dinner and group dining prompts', 'Weekly local steakhouse posts'],
  },
  {
    slug: 'loft',
    name: 'LOFT',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'lilly-pulitzer',
    name: 'Lilly Pulitzer',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing resort styles, gifts, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'lane-bryant',
    name: 'Lane Bryant',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'kohls',
    name: "Kohl's",
    category: 'department store',
    audience: 'local shoppers comparing apparel, home goods, gifts, and in-store deals',
    action: 'visit the store or browse featured departments',
    focus: ['Department navigation', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'kirklands',
    name: "Kirkland's",
    category: 'home decor and gift retailer',
    audience: 'local shoppers looking for home decor, seasonal items, and gifts',
    action: 'browse categories and plan a visit',
    focus: ['Product category navigation', 'Gift, seasonal, and event prompts', 'Local home decor search content'],
  },
  {
    slug: 'kay-jewelers',
    name: 'Kay Jewelers',
    category: 'jewelry shop',
    audience: 'gift buyers, engagement shoppers, and customers looking for in-store jewelry help',
    action: 'browse products, call, or plan a visit',
    focus: ['Product-category landing sections', 'Gift and occasion prompts', 'Local jewelry SEO content'],
  },
  {
    slug: 'j-mclaughlin',
    name: 'J.McLaughlin',
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing classic styles, gifts, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'the-good-feet-store',
    name: 'The Good Feet Store',
    category: 'arch support and footwear store',
    audience: 'customers comparing foot comfort, arch supports, and in-store fittings',
    action: 'book a fitting, call, or visit',
    focus: ['Fitting and product paths', 'Pain-point and appointment content', 'Local foot comfort search pages'],
  },
  {
    slug: 'gifts-more-at-the-paper-store',
    name: 'Gifts & More at The Paper Store',
    category: 'gift and specialty retailer',
    audience: 'gift buyers and local shoppers looking for cards, home decor, toys, and accessories',
    action: 'browse categories and plan a visit',
    focus: ['Gift category navigation', 'Seasonal and occasion prompts', 'Local gift shop search content'],
  },
  {
    slug: 'five-guys-burgers-and-fries',
    name: 'Five Guys Burgers and Fries',
    category: 'burger restaurant',
    audience: 'burger, fries, lunch, and family meal customers near Viera',
    action: 'view menu, order, or visit',
    focus: ['Menu and ordering path above the fold', 'Location, hours, and offer content', 'Weekly local burger search posts'],
  },
  {
    slug: 'european-wax-center',
    name: 'European Wax Center',
    category: 'waxing and beauty studio',
    audience: 'clients comparing waxing appointments, packages, and nearby availability',
    action: 'book an appointment or call the location',
    focus: ['Service menu and booking path', 'Before-visit trust and location details', 'Weekly content for local waxing searches'],
  },
  {
    slug: 'ethan-allen',
    name: 'Ethan Allen',
    category: 'furniture and interior design retailer',
    audience: 'homeowners and shoppers comparing furniture, design help, and local showroom options',
    action: 'browse collections, book design help, or visit',
    focus: ['Room and collection navigation', 'Design consultation prompts', 'Local furniture search content'],
  },
  {
    slug: 'world-market',
    name: 'World Market',
    category: 'home, food, and gift retailer',
    audience: 'local shoppers looking for furniture, decor, specialty food, and gifts',
    action: 'browse categories and plan a visit',
    focus: ['Product category navigation', 'Gift, seasonal, and event prompts', 'Local specialty shopping content'],
  },
  {
    slug: 'cold-stone-creamery',
    name: 'Cold Stone Creamery',
    category: 'ice cream and dessert shop',
    audience: 'dessert buyers, families, birthday planners, and shoppers near Viera',
    action: 'view menu, order cakes, or visit',
    focus: ['Menu and cake ordering path', 'Birthday and event prompts', 'Weekly local ice cream search posts'],
  },
  {
    slug: 'club-pilates',
    name: 'Club Pilates',
    category: 'pilates studio',
    audience: 'clients comparing pilates classes, memberships, and nearby studio availability',
    action: 'book a class or call the studio',
    focus: ['Class and membership paths', 'First-visit and schedule content', 'Weekly local pilates search pages'],
  },
  {
    slug: 'chilis',
    name: "Chili's",
    category: 'casual dining restaurant',
    audience: 'lunch, dinner, family meal, and takeout customers near Viera',
    action: 'view menu, order, join waitlist, or visit',
    focus: ['Menu and ordering path above the fold', 'Specials and family dining prompts', 'Weekly local casual dining posts'],
  },
  {
    slug: 'chicos',
    name: "Chico's",
    category: 'apparel and fashion retailer',
    audience: 'local shoppers comparing styles, sizes, offers, and in-store availability',
    action: 'visit the store or browse featured collections',
    focus: ['Featured collection sections', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'burn-boot-camp',
    name: 'Burn Boot Camp',
    category: 'fitness studio',
    audience: 'clients comparing fitness classes, memberships, and nearby training options',
    action: 'book a trial, view classes, or call',
    focus: ['Class and membership paths', 'Trial and first-visit content', 'Weekly local fitness search pages'],
  },
  {
    slug: 'books-a-million',
    name: 'Books-A-Million',
    category: 'bookstore and gift retailer',
    audience: 'book lovers, students, families, and gift buyers near Viera',
    action: 'browse categories and plan a visit',
    focus: ['Book and gift category navigation', 'Event and seasonal prompts', 'Local bookstore search content'],
  },
  {
    slug: 'bonefish-grill',
    name: 'Bonefish Grill',
    category: 'seafood restaurant',
    audience: 'dinner, date-night, lunch, and group dining customers near Viera',
    action: 'view menu, reserve, order, or visit',
    focus: ['Menu and reservation path above the fold', 'Dinner and group dining prompts', 'Weekly local seafood posts'],
  },
  {
    slug: 'belk',
    name: 'Belk',
    category: 'department store',
    audience: 'local shoppers comparing apparel, home goods, beauty, and in-store deals',
    action: 'visit the store or browse featured departments',
    focus: ['Department navigation', 'Store visit and offer CTAs', 'Seasonal local shopping content'],
  },
  {
    slug: 'bath-body-works',
    name: 'Bath & Body Works',
    category: 'beauty and fragrance retailer',
    audience: 'beauty shoppers and gift buyers comparing fragrance, body care, and home scent products',
    action: 'browse products, call, or visit',
    focus: ['Product category navigation', 'Gift and seasonal prompts', 'Local beauty shopping content'],
  },
  {
    slug: 'att-wireless',
    name: 'AT&T Wireless',
    category: 'wireless phone store',
    audience: 'customers comparing phones, plans, device help, and local availability',
    action: 'call, compare plans, or visit',
    focus: ['Service and device paths', 'Location and support modules', 'Weekly content for local phone searches'],
  },
  {
    slug: 'amc-theatres',
    name: 'AMC Theatres',
    category: 'movie theater',
    audience: 'moviegoers, families, date-night guests, and groups planning entertainment near Viera',
    action: 'buy tickets, check showtimes, or visit',
    focus: ['Showtime and ticket paths', 'Event and group prompts', 'Local entertainment search content'],
  },
  {
    slug: 'addy-rose-hair-studio',
    name: 'Addy Rose Hair Studio',
    category: 'hair salon',
    audience: 'clients comparing haircuts, color, styling, and nearby appointment options',
    action: 'book an appointment or call the studio',
    focus: ['Service menu and booking path', 'Before-visit trust and stylist content', 'Weekly content for local hair salon searches'],
  },
  {
    slug: '7-senses-kids',
    name: '7 Senses Kids',
    category: 'kids gift and toy shop',
    audience: 'parents, gift buyers, and families looking for baby, kids, and eco-friendly gifts',
    action: 'browse categories and plan a visit',
    focus: ['Gift category navigation', 'Parent and child-focused prompts', 'Local kids gift search content'],
  },
  {
    slug: '28-north-gastropub',
    name: '28 North Gastropub',
    category: 'gastropub and restaurant',
    audience: 'date-night diners, lunch guests, craft food fans, and group dining customers',
    action: 'view menu, reserve, order, or visit',
    focus: ['Menu and reservation path above the fold', 'Group dining and local sourcing prompts', 'Weekly local gastropub posts'],
  },
];

async function loadReplacementProspects() {
  const raw = await fs.readFile(replacementProspectsPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${path.relative(repoRoot, replacementProspectsPath)} must contain an array.`);
  }

  return parsed.map((prospect, index) => {
    const requiredFields = ['slug', 'name', 'category', 'audience', 'action', 'focus'];
    for (const field of requiredFields) {
      if (!prospect[field] || (field === 'focus' && !Array.isArray(prospect[field]))) {
        throw new Error(`Replacement prospect ${index + 1} is missing ${field}.`);
      }
    }

    return {
      slug: prospect.slug,
      name: prospect.name,
      category: prospect.category,
      audience: prospect.audience,
      action: prospect.action,
      focus: prospect.focus,
    };
  });
}

function dedupeProspects(items) {
  const seen = new Set();

  return items.filter((prospect) => {
    if (seen.has(prospect.slug)) {
      return false;
    }
    seen.add(prospect.slug);
    return true;
  });
}

const replacementProspects = await loadReplacementProspects();
const prospects = dedupeProspects([...baseProspects, ...avenueProspects, ...replacementProspects]);

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const attr = escapeHtml;

function buildMailto(prospect) {
  const subject = encodeURIComponent(`Book the free EB28 website review for ${prospect.name}`);
  const body = encodeURIComponent(
    `I want to claim the free website concept for ${prospect.name} and book a 10-minute review call.\n\nName:\nPhone:\nBest time for a 10-minute review:\nCurrent website or Google listing:\n`,
  );
  return `mailto:${claimEmail}?subject=${subject}&body=${body}`;
}

function focusMarkup(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n');
}

function renderProspectPage(prospect, index) {
  const title = `${prospect.name} free website concept | EB28 Growth Hosting`;
  const description = `A free local website concept for ${prospect.name}. EB28 can host, optimize, and publish weekly local content for $98/month after owner approval.`;
  const mailto = buildMailto(prospect);
  const accent = index % 3 === 0 ? '#0f766e' : index % 3 === 1 ? '#2563eb' : '#be123c';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,follow" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${attr(description)}" />
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #5b6472;
        --line: #e5e7eb;
        --wash: #f6f7f9;
        --accent: ${accent};
        --accent-soft: color-mix(in srgb, var(--accent) 11%, white);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: #fff;
        line-height: 1.5;
      }
      a { color: inherit; }
      .notice {
        background: #111827;
        color: #fff;
        padding: 10px 20px;
        text-align: center;
        font-size: 13px;
      }
      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        max-width: 1180px;
        margin: 0 auto;
        padding: 18px 22px;
      }
      .brand {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-weight: 900;
        letter-spacing: 0;
      }
      .brand small {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }
      .nav-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 12px 16px;
        border: 1px solid var(--line);
        border-radius: 8px;
        text-decoration: none;
        font-weight: 800;
        font-size: 14px;
        background: #fff;
      }
      .btn.primary {
        background: var(--ink);
        color: #fff;
        border-color: var(--ink);
      }
      .btn.accent {
        background: var(--accent);
        color: #fff;
        border-color: var(--accent);
      }
      .hero {
        border-top: 1px solid var(--line);
        background:
          radial-gradient(circle at 82% 20%, var(--accent-soft), transparent 31%),
          linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      }
      .wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 70px 22px;
      }
      .hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
        gap: 48px;
        align-items: center;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 18px;
        padding: 7px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      h1 {
        margin: 0;
        max-width: 840px;
        font-size: clamp(38px, 7vw, 72px);
        line-height: .95;
        letter-spacing: 0;
      }
      .lead {
        margin: 24px 0 0;
        max-width: 680px;
        color: var(--muted);
        font-size: clamp(17px, 2vw, 21px);
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 30px;
      }
      .preview {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 24px 70px rgb(15 23 42 / 12%);
        overflow: hidden;
      }
      .preview-top {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 14px;
        border-bottom: 1px solid var(--line);
        background: #f8fafc;
      }
      .dot { width: 10px; height: 10px; border-radius: 999px; background: #cbd5e1; }
      .preview-body { padding: 26px; }
      .mock-title {
        margin: 0 0 8px;
        font-size: 27px;
        line-height: 1.05;
        letter-spacing: 0;
      }
      .mock-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 22px 0;
      }
      .mock-strip span {
        min-height: 86px;
        border-radius: 7px;
        background: var(--accent-soft);
        border: 1px solid color-mix(in srgb, var(--accent) 20%, white);
      }
      .mock-panel {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }
      .mock-panel div {
        height: 12px;
        border-radius: 999px;
        background: #e5e7eb;
      }
      .band { border-top: 1px solid var(--line); }
      .section-title {
        max-width: 760px;
        margin: 0 0 26px;
        font-size: clamp(29px, 4vw, 46px);
        line-height: 1;
        letter-spacing: 0;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 24px;
        background: #fff;
      }
      .card h3 {
        margin: 0 0 10px;
        font-size: 18px;
      }
      .card p, .card li { color: var(--muted); }
      .card ul {
        margin: 0;
        padding-left: 20px;
      }
      .offer {
        background: var(--ink);
        color: #fff;
      }
      .offer .wrap {
        display: grid;
        grid-template-columns: minmax(0, .95fr) minmax(300px, 1.05fr);
        gap: 36px;
        align-items: start;
      }
      .offer .section-title, .offer .lead { color: #fff; }
      .offer-list {
        display: grid;
        gap: 12px;
        margin: 26px 0 0;
        padding: 0;
        list-style: none;
      }
      .offer-list li {
        display: flex;
        gap: 10px;
        color: #d1d5db;
      }
      .offer-list li::before {
        content: "";
        width: 9px;
        height: 9px;
        margin-top: 8px;
        border-radius: 999px;
        background: var(--accent);
        flex: 0 0 auto;
      }
      form {
        display: grid;
        gap: 12px;
        padding: 24px;
        border: 1px solid rgb(255 255 255 / 14%);
        border-radius: 8px;
        background: rgb(255 255 255 / 7%);
      }
      .form-intro {
        margin: 0 0 4px;
        color: #e5e7eb;
        font-size: 15px;
      }
      .field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      label {
        display: grid;
        gap: 7px;
        color: #e5e7eb;
        font-size: 13px;
        font-weight: 800;
      }
      input, textarea {
        width: 100%;
        border: 1px solid rgb(255 255 255 / 18%);
        border-radius: 7px;
        background: rgb(255 255 255 / 10%);
        color: #fff;
        padding: 13px 14px;
        font: inherit;
      }
      input::placeholder, textarea::placeholder { color: #9ca3af; }
      textarea { min-height: 96px; resize: vertical; }
      .fine {
        color: #9ca3af;
        font-size: 12px;
      }
      .index-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .index-list a {
        display: block;
        padding: 15px;
        border: 1px solid var(--line);
        border-radius: 8px;
        text-decoration: none;
        background: #fff;
        font-weight: 800;
      }
      footer {
        border-top: 1px solid var(--line);
        padding: 28px 22px;
        color: var(--muted);
        text-align: center;
      }
      @media (max-width: 860px) {
        .hero-grid, .offer .wrap, .cards, .index-list, .field-grid {
          grid-template-columns: 1fr;
        }
        .wrap { padding: 46px 18px; }
        .nav { align-items: flex-start; flex-direction: column; }
        .nav-actions { justify-content: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="notice">
      Unofficial free website concept prepared by EB28 for owner review. This is not the business's current official website.
    </div>
    <header class="nav" aria-label="Page header">
      <div class="brand">
        <span>${escapeHtml(prospect.name)}</span>
        <small>${escapeHtml(prospect.category)} growth concept by EB28</small>
      </div>
      <div class="nav-actions">
        <a class="btn" href="${attr(studioUrl)}">About EB28</a>
        <a class="btn primary" href="#claim">Claim this free site</a>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="wrap hero-grid">
          <div>
            <p class="eyebrow">Free website build + $98/mo Growth Hosting</p>
            <h1>A sharper website concept for ${escapeHtml(prospect.name)}.</h1>
            <p class="lead">
              Built to help ${escapeHtml(prospect.audience)} ${escapeHtml(prospect.action)} without hunting through clutter, slow pages, or unclear next steps.
            </p>
            <div class="hero-actions">
              <a class="btn accent" href="#claim">Claim this free site</a>
              <a class="btn" href="${attr(mailto)}">Email EB28</a>
            </div>
          </div>
          <aside class="preview" aria-label="Website concept preview">
            <div class="preview-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
            <div class="preview-body">
              <p class="eyebrow">${escapeHtml(prospect.category)}</p>
              <h2 class="mock-title">${escapeHtml(prospect.name)}</h2>
              <p>Clear service or menu highlights, fast contact paths, and local search content structured for customers nearby.</p>
              <div class="mock-strip"><span></span><span></span><span></span></div>
              <a class="btn primary" href="#claim">Owner approval needed</a>
              <div class="mock-panel"><div style="width: 92%"></div><div style="width: 74%"></div><div style="width: 58%"></div></div>
            </div>
          </aside>
        </div>
      </section>

      <section class="band">
        <div class="wrap">
          <h2 class="section-title">What this site would help customers do.</h2>
          <div class="cards">
            <article class="card">
              <h3>Act faster</h3>
              <p>Put the highest-intent action near the top of every mobile screen: call, book, order, request service, or plan a visit.</p>
            </article>
            <article class="card">
              <h3>Trust the business</h3>
              <p>Use owner-approved photos, service details, hours, location cues, and proof where a customer naturally needs confidence.</p>
            </article>
            <article class="card">
              <h3>Find it on Google</h3>
              <p>Publish search-friendly pages and weekly local content so more nearby customers can discover the business before choosing a competitor.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="band">
        <div class="wrap">
          <h2 class="section-title">Launch focus for ${escapeHtml(prospect.name)}.</h2>
          <div class="cards">
            <article class="card">
              <h3>Priority fixes</h3>
              <ul>
                ${focusMarkup(prospect.focus)}
              </ul>
            </article>
            <article class="card">
              <h3>Owner approval needed</h3>
              <p>Before public launch, EB28 confirms correct hours, phone number, domain access, photos, menu or service details, and any required legal or brand language.</p>
            </article>
            <article class="card">
              <h3>Lead routing</h3>
              <p>Every claim form on this concept sends to <strong>${claimEmail}</strong>. EB28 can route approved site leads to the business's preferred inbox at launch.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="offer" id="claim">
        <div class="wrap">
          <div>
            <p class="eyebrow">EB28 Growth Hosting</p>
            <h2 class="section-title">The website build is free. Hosting, SEO, and weekly content are $98/month.</h2>
            <p class="lead">
              EB28 builds the first version at no upfront cost. If the owner wants to use it, EB28 hosts and improves it for $98/month with local SEO upkeep and weekly blog posts.
            </p>
            <ul class="offer-list">
              <li>Managed website hosting, SSL, technical upkeep, and launch support.</li>
              <li>Local SEO structure, page titles, descriptions, sitemap, and performance checks.</li>
              <li>One weekly local blog post or Google Business Profile content prompt.</li>
              <li>One monthly website update request included after launch.</li>
              <li>No ownership confusion: the owner keeps the business, domain, content rights, and customer relationships.</li>
            </ul>
          </div>
          <form action="https://formsubmit.co/${claimEmail}" method="POST" accept-charset="UTF-8">
            <p class="form-intro">Tell EB28 when to review this free site with you. The request goes straight to ${claimEmail}.</p>
            <input type="hidden" name="_subject" value="Booked review request: ${attr(prospect.name)} free EB28 website" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="source" value="eb28-32940-${attr(prospect.slug)}" />
            <input type="hidden" name="business" value="${attr(prospect.name)}" />
            <input type="hidden" name="category" value="${attr(prospect.category)}" />
            <input type="hidden" name="concept_url" value="https://eb28.co/32940/${attr(prospect.slug)}.html" />
            <input type="hidden" name="offer" value="Free website build plus EB28 Growth Hosting at $98/month with SEO and weekly blog posts" />
            <input type="hidden" name="requested_next_step" value="Claim free website concept and book a 10-minute review call" />
            <div class="field-grid">
              <label>
                Your name
                <input name="name" autocomplete="name" required placeholder="Name" />
              </label>
              <label>
                Work email
                <input name="email" type="email" autocomplete="email" required placeholder="you@example.com" />
              </label>
            </div>
            <div class="field-grid">
              <label>
                Phone
                <input name="phone" type="tel" autocomplete="tel" placeholder="Best number" />
              </label>
              <label>
                Best 10-minute review time
                <input name="preferred_review_time" required placeholder="Today after 3, weekday mornings..." />
              </label>
            </div>
            <label>
              What should EB28 check first?
              <textarea name="message" placeholder="Optional: current website, Google listing, photos, menu, booking link, or anything that needs to be corrected before launch."></textarea>
            </label>
            <button class="btn accent" type="submit">Book my free website review</button>
            <p class="fine">No obligation. Prefer email? Send a note to <a href="${attr(mailto)}">${claimEmail}</a>. Reply "no thanks" any time and EB28 will stop following up.</p>
          </form>
        </div>
      </section>
    </main>

    <footer>
      Prepared by <a href="https://eb28.co">EB28</a>. Unofficial concept for owner review only. Contact <a href="mailto:${claimEmail}">${claimEmail}</a>.
    </footer>
  </body>
</html>
`;
}

function renderIndex() {
  const links = prospects
    .map(
      (prospect) =>
        `<a href="/32940/${attr(prospect.slug)}.html">${escapeHtml(prospect.name)}<br><small>${escapeHtml(prospect.category)}</small></a>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,follow" />
    <title>32940 Free Website Concepts | EB28 Growth Hosting</title>
    <meta name="description" content="Free website concepts for local 32940 businesses, prepared by EB28 with $98/month Growth Hosting available after owner approval." />
    <style>
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f8fafc; }
      main { max-width: 1120px; margin: 0 auto; padding: 64px 22px; }
      h1 { margin: 0; font-size: clamp(38px, 7vw, 70px); line-height: .96; letter-spacing: 0; }
      p { color: #4b5563; font-size: 18px; max-width: 780px; line-height: 1.55; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 26px 0 40px; }
      a.button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 12px 16px; border-radius: 8px; background: #111827; color: #fff; font-weight: 900; text-decoration: none; }
      .index-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .index-list a { display: block; min-height: 92px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; text-decoration: none; color: #111827; font-weight: 900; box-shadow: 0 8px 30px rgb(15 23 42 / 5%); }
      .index-list small { display: inline-block; margin-top: 7px; color: #6b7280; font-weight: 700; }
      .notice { margin-top: 36px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #6b7280; font-size: 14px; }
      @media (max-width: 840px) { .index-list { grid-template-columns: 1fr; } main { padding: 42px 18px; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Free website concepts for 32940 local businesses.</h1>
      <p>EB28 prepared these noindex owner-review pages as a lead-generation offer: the custom website build is free, and approved sites can be hosted, optimized, and supported for $98/month with weekly local content.</p>
      <div class="actions">
        <a class="button" href="${studioUrl}">View EB28 Growth Hosting</a>
        <a class="button" href="mailto:${claimEmail}?subject=32940%20free%20website%20concepts">Email ${claimEmail}</a>
      </div>
      <section class="index-list" aria-label="Business website concepts">
        ${links}
      </section>
      <p class="notice">These are unofficial concepts for owner review only. They are not the current official websites for the listed businesses.</p>
    </main>
  </body>
</html>
`;
}

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

for (const [index, prospect] of prospects.entries()) {
  await fs.writeFile(path.join(outDir, `${prospect.slug}.html`), renderProspectPage(prospect, index));
}

await fs.writeFile(path.join(outDir, 'index.html'), renderIndex());

console.log(`Generated ${prospects.length} 32940 growth site concepts in ${path.relative(repoRoot, outDir)}`);
