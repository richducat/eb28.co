import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  Hammer,
  Home,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  Quote,
  Ruler,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from './lib/utils';

const FORM_ENDPOINT = 'https://formsubmit.co/ajax/richducat@gmail.com';
const OFFICE_PHONE = '3215871163';
const OFFICE_PHONE_DISPLAY = '(321) 587-1163';
const OFFICE_ADDRESS = '846 N. Cocoa Blvd. Suite C, Cocoa, FL 32922';
const OFFICE_REGION = 'Brevard County, FL';

const NAV_LINKS = [
  { name: 'Services', href: '#services' },
  { name: 'Gallery', href: '#gallery' },
  { name: 'Financing', href: '#financing' },
  { name: 'Process', href: '#process' },
  { name: 'Contact', href: '#contact' },
];

const SERVICE_ITEMS = [
  {
    id: 'custom-homes',
    title: 'Custom Homes',
    description:
      'Ground-up custom homes designed around your lot, lifestyle, and finish preferences.',
    icon: Home,
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    details: {
      process: [
        'Site Evaluation & Orientation',
        'Architectural Design & Engineering',
        'Permitting & Regulatory Approval',
        'Foundation & Structural Framing',
        'Custom Interior & Exterior Finishes',
      ],
      benefits: [
        "Personalized layout tailored to your family's needs",
        'Modern energy efficiency and smart home integration',
        'Highest quality materials and craftsmanship',
        "Full builder's warranty for peace of mind",
      ],
      examples: [
        'Modern Coastal Estates',
        'Traditional Family Residences',
        'Sustainable Luxury Builds',
      ],
    },
  },
  {
    id: 'major-renovations',
    title: 'Major Renovations',
    description:
      'Modernize layout, finishes, and flow without losing the character of your home.',
    icon: Hammer,
    image:
      'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?q=80&w=2070&auto=format&fit=crop',
    details: {
      process: [
        'Structural Integrity Assessment',
        'Space Planning & Reconfiguration',
        'Selective Demolition & Prep',
        'System Modernization (HVAC, Electrical)',
        'Premium Surface & Fixture Installation',
      ],
      benefits: [
        'Improved functional flow and open-concept living',
        'Significant increase in property market value',
        'Preservation of architectural character',
        'Completely updated interior aesthetic',
      ],
      examples: [
        'Historic Restorations',
        'Mid-Century Modern Conversions',
        'Whole-Home Modernizations',
      ],
    },
  },
  {
    id: 'additions',
    title: 'Additions',
    description:
      'New rooms and expanded living areas that blend seamlessly with your existing structure.',
    icon: Ruler,
    image:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2070&auto=format&fit=crop',
    details: {
      process: [
        'Foundation & Footing Extension',
        'Seamless Structural Integration',
        'Exterior Material Matching',
        'Interior Flow Optimization',
        'Utility Extension & Connection',
      ],
      benefits: [
        'Increased square footage without moving',
        'Customized spaces for growing families',
        'Seamless blend with existing architecture',
        'High return on investment for added space',
      ],
      examples: ['Master Suite Wings', 'Second-Story Expansions', 'Guest Houses & ADUs'],
    },
  },
  {
    id: 'kitchen-bath',
    title: 'Kitchen & Bath',
    description:
      'Focused remodels with cabinetry, surfaces, and fixtures that elevate everyday use.',
    icon: CheckCircle,
    image:
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop',
    details: {
      process: [
        'Ergonomic Layout Optimization',
        'Custom Cabinetry & Storage Design',
        'Plumbing & Electrical Upgrades',
        'Premium Countertop & Tile Installation',
        'High-End Appliance Integration',
      ],
      benefits: [
        'Daily luxury in high-use spaces',
        'Improved storage and functionality',
        'Highest ROI for home improvements',
        'Modern, spa-like aesthetics',
      ],
      examples: [
        "Chef's Gourmet Kitchens",
        'Spa-Inspired Master Baths',
        'Custom Wet Bars & Pantries',
      ],
    },
  },
];

const PROJECTS = [
  {
    id: 'riverside-estate',
    title: 'The Riverside Estate',
    category: 'Custom Home',
    location: 'Rockledge, FL',
    description:
      'A 4,500 sq. ft. luxury coastal home featuring expansive river views and high-end finishes.',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    details:
      'This ground-up build was designed to maximize the natural beauty of the Indian River. Featuring a modern open-concept layout, a chef\'s gourmet kitchen, and a private master wing with a spa-inspired bath.',
    features: [
      'Impact-rated floor-to-ceiling windows',
      'Custom walnut cabinetry',
      'Smart home automation',
      'Infinity-edge pool integration',
    ],
    testimonial: {
      name: 'Alex Bogumil',
      role: 'Capital Fundings, LLC',
      text:
        'Thomas Custom Homes delivered exactly what they promised. Their attention to detail and clear communication made a complex build feel manageable and predictable.',
      image:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    },
    gallery: [
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop',
    ],
  },
  {
    id: 'merritt-island-modern',
    title: 'Merritt Island Modern',
    category: 'Major Renovation',
    location: 'Merritt Island, FL',
    description: 'A complete transformation of a 1970s ranch into a sleek, modern masterpiece.',
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    details:
      'We stripped this home to the studs to reconfigure the floor plan for modern living. The result is a bright, airy space that flows seamlessly from the interior to the new outdoor living area.',
    features: [
      'Vaulted ceilings with exposed beams',
      'Polished concrete flooring',
      'Custom floating staircase',
      'Energy-efficient HVAC upgrade',
    ],
    testimonial: {
      name: 'Tammara Otero',
      role: 'Deshoda Interior Design Studio LLC',
      text:
        'As a designer, I appreciate a builder who respects the vision while bringing practical expertise to the table. Thomas Custom Homes is a true partner in the design-build process.',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
    },
    gallery: [
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154526-990dcea4db0d?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=2084&auto=format&fit=crop',
    ],
  },
  {
    id: 'viera-family-wing',
    title: 'Viera Family Wing',
    category: 'Addition',
    location: 'Viera, FL',
    description:
      'A seamless 1,200 sq. ft. addition providing a new master suite and home office.',
    image:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2070&auto=format&fit=crop',
    details:
      'The challenge was to match the existing Mediterranean architecture perfectly. We extended the roofline and matched the stucco and tile work so the addition looks like it was always part of the home.',
    features: [
      'Seamless structural integration',
      'Custom walk-in closet system',
      'Dedicated soundproof office',
      'Private patio access',
    ],
    testimonial: {
      name: 'David & Sarah Miller',
      role: 'Homeowners',
      text:
        'We were worried about the addition looking like an afterthought, but Thomas Custom Homes made it look original. The process was clean, professional, and on schedule.',
      image:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop',
    },
    gallery: [
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop',
    ],
  },
  {
    id: 'cocoa-beach-kitchen',
    title: "Cocoa Beach Chef's Kitchen",
    category: 'Kitchen & Bath',
    location: 'Cocoa Beach, FL',
    description:
      'A high-performance kitchen remodel designed for entertaining and culinary excellence.',
    image:
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop',
    details:
      'This project focused on maximizing storage and workflow. We installed a massive quartz island, professional-grade appliances, and a hidden walk-in pantry.',
    features: [
      'Sub-Zero & Wolf appliances',
      'Waterfall edge quartz island',
      'Custom lighting design',
      'Hand-crafted tile backsplash',
    ],
    testimonial: {
      name: 'Chef Marcus Thorne',
      role: 'Private Culinary Consultant',
      text:
        'The workflow in this kitchen is exceptional. They did not just build a beautiful space; they built a functional tool for someone who truly loves to cook.',
      image:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop',
    },
    gallery: [
      'https://images.unsplash.com/photo-1556912177-4517fa26df0e?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556912167-755836f62931?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=2070&auto=format&fit=crop',
    ],
  },
];

const PROCESS_STEPS = [
  {
    title: 'Discovery & Scope',
    description:
      'We learn the goals of the project, site conditions, and the level of finish you want before pricing direction is discussed.',
    number: '01',
  },
  {
    title: 'Design & Planning',
    description:
      'Selections, layout needs, and build constraints are clarified early so the work starts from a realistic plan.',
    number: '02',
  },
  {
    title: 'Build Execution',
    description:
      'Construction is managed with a focus on craftsmanship, communication, and clean coordination across trades.',
    number: '03',
  },
  {
    title: 'Final Walkthrough',
    description:
      'The project is reviewed in detail so the finished result feels complete, polished, and ready to enjoy.',
    number: '04',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alex Bogumil',
    role: 'Capital Fundings, LLC',
    text:
      'Thomas Custom Homes delivered exactly what they promised. Their attention to detail and clear communication made a complex build feel manageable and predictable.',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
  },
  {
    name: 'Tammara Otero',
    role: 'Deshoda Interior Design Studio LLC',
    text:
      'As a designer, I appreciate a builder who respects the vision while bringing practical expertise to the table. Thomas Custom Homes is a true partner in the design-build process.',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
  },
];

const FINANCING_QUESTIONS = [
  {
    id: 'employmentStatus',
    label: 'What is your current employment status?',
    options: ['Employed (Full-time)', 'Self-Employed', 'Retired', 'Other'],
  },
  {
    id: 'annualIncome',
    label: 'What is your estimated annual household income?',
    options: ['Under $75,000', '$75,000 - $150,000', '$150,000 - $300,000', '$300,000+'],
  },
  {
    id: 'creditScore',
    label: 'What is your estimated credit score range?',
    options: [
      'Excellent (740+)',
      'Good (680-739)',
      'Fair (620-679)',
      'Challenged (Under 620)',
    ],
  },
  {
    id: 'downPayment',
    label: 'Estimated down payment or equity available?',
    options: ['Less than 10%', '10% - 20%', 'More than 20%'],
  },
  {
    id: 'propertyStatus',
    label: 'What is the status of your project site?',
    options: [
      'I already own the lot',
      'I am currently looking for land',
      'Remodeling my primary residence',
    ],
  },
];

const INITIAL_FINANCING_DATA = {
  employmentStatus: '',
  annualIncome: '',
  creditScore: '',
  downPayment: '',
  monthlyDebt: '',
  propertyStatus: '',
};

const INITIAL_CONTACT_FORM = {
  name: '',
  email: '',
  projectType: 'Custom Home',
  message: '',
  completionDate: '',
  budgetRange: 'Under $100k',
  wantsFinancing: false,
  financingData: { ...INITIAL_FINANCING_DATA },
};

const INITIAL_CHAT_MESSAGES = [
  {
    role: 'model',
    text:
      "Hi! I'm the Thomas Custom Homes assistant. Are you planning a new custom home, a major remodel, or an addition in Brevard County?",
  },
];

const BREVARD_KEYWORDS = [
  'brevard',
  'cocoa',
  'merritt island',
  'rockledge',
  'viera',
  'melbourne',
  'cocoa beach',
  'titusville',
  'palm bay',
  'suntree',
];

const SMALL_PROJECT_KEYWORDS = [
  'small repair',
  'minor repair',
  'patch',
  'handyman',
  'fix a door',
  'fix a wall',
  'paint touch up',
  'small job',
];

function buildConsultantReply(userMessage) {
  const text = userMessage.toLowerCase();

  if (SMALL_PROJECT_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return `Thomas Custom Homes focuses on custom homes, major renovations, additions, and larger kitchen or bath projects rather than small handyman work. If the scope is larger and it is in Brevard County, call ${OFFICE_PHONE_DISPLAY} or use the estimate form below.`;
  }

  if (text.includes('finance') || text.includes('loan') || text.includes('mortgage')) {
    return `If you want to explore financing, use the financing toggle inside the project estimate form. That qualifier helps the team understand whether a discovery call should also include a financing conversation.`;
  }

  if (text.includes('custom home') || text.includes('new build') || text.includes('new home')) {
    return `For a custom home, the biggest qualifiers are the lot, the city, and your target start window. If you already own the lot or have one under contract, include that in the estimate form so the next step can be scoped properly.`;
  }

  if (text.includes('addition')) {
    return `For an addition, the next helpful details are what space you want to add, whether the home is occupied during construction, and the budget range. If you send those through the form, Thomas Custom Homes can shape whether a discovery call or site walkthrough makes the most sense.`;
  }

  if (
    text.includes('remodel') ||
    text.includes('renovation') ||
    text.includes('kitchen') ||
    text.includes('bath')
  ) {
    return `For renovation work, the key qualifiers are project size, property location, and how complete the update needs to be. Thomas Custom Homes is best aligned for major remodels, additions, and finish-driven kitchen or bath projects in Brevard County.`;
  }

  if (
    text.includes('price') ||
    text.includes('cost') ||
    text.includes('budget') ||
    text.includes('estimate')
  ) {
    return `Pricing depends on scope, structural work, finish level, and timeline. The fastest way to get useful pricing direction is to send the project type, budget range, and desired completion date through the request form or call ${OFFICE_PHONE_DISPLAY}.`;
  }

  if (
    text.includes('where') ||
    text.includes('location') ||
    text.includes('area') ||
    text.includes('serve')
  ) {
    return `Thomas Custom Homes primarily serves Cocoa and the broader Brevard County area. If your project is nearby, send the city in your request and the team can confirm fit quickly.`;
  }

  if (BREVARD_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return `That sounds like the right service area. The next best step is to share the project type, budget range, target completion date, and whether you want financing support so Thomas Custom Homes can decide whether to start with a discovery call or site walkthrough.`;
  }

  return `The best next step is to share your project type, budget range, target completion date, and whether you want financing support through the estimate form below. If it is a major residential build or remodel in Brevard County, Thomas Custom Homes can help you move the planning conversation forward.`;
}

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed left-0 right-0 top-0 z-50 px-6 py-4 transition-all duration-300',
        isScrolled ? 'bg-white/90 py-3 shadow-sm backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <a href="#top" className="group flex items-center gap-2">
          <div className="rounded-lg bg-brand-primary p-1.5 text-white transition-transform group-hover:scale-110">
            <Home size={24} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              THOMAS
            </span>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-brand-muted">
              CUSTOM HOMES INC.
            </span>
          </div>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-primary"
            >
              {link.name}
            </a>
          ))}
          <a
            href={`tel:${OFFICE_PHONE}`}
            className="flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-primary/90 hover:shadow-lg active:scale-95"
          >
            <Phone size={16} />
            {OFFICE_PHONE_DISPLAY}
          </a>
        </div>

        <button
          type="button"
          className="p-2 text-slate-900 md:hidden"
          onClick={() => setIsMobileMenuOpen((previous) => !previous)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-0 right-0 top-full border-t border-slate-100 bg-white p-6 shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="border-b border-slate-50 py-2 text-lg font-medium text-slate-900"
                >
                  {link.name}
                </a>
              ))}
              <a
                href={`tel:${OFFICE_PHONE}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-4 text-lg font-semibold text-white"
              >
                <Phone size={20} />
                Call {OFFICE_PHONE_DISPLAY}
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop"
          alt="Modern custom home"
          className="h-full w-full object-cover brightness-[0.85]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
            <ShieldCheck size={14} className="text-brand-accent" />
            Brevard County&apos;s Premier Builder
          </div>
          <h1 className="mb-6 font-display text-5xl font-bold leading-[1.1] text-white md:text-7xl">
            Custom homes and major remodels built with a{' '}
            <span className="text-brand-accent italic">steady hand.</span>
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-slate-200 md:text-xl">
            Thomas Custom Homes Inc. helps Brevard County homeowners move from concept to
            construction with custom home building, additions, and whole-home renovation
            expertise.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href={`tel:${OFFICE_PHONE}`}
              className="flex items-center justify-center gap-2 rounded-full bg-brand-accent px-8 py-4 text-lg font-bold text-slate-950 transition-all hover:bg-white hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-95"
            >
              Start Your Project
              <ArrowRight size={20} />
            </a>
            <a
              href="#gallery"
              className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
            >
              View Gallery
            </a>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 hidden border-t border-white/10 bg-white/5 py-8 backdrop-blur-xl lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">20+ Years</div>
              <div className="text-sm text-slate-400">Experience-led building</div>
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">Clear Communication</div>
              <div className="text-sm text-slate-400">Honest scope alignment</div>
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
              <MapPin size={24} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">Brevard County Base</div>
              <div className="text-sm text-slate-400">Local build leadership</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const [selectedService, setSelectedService] = useState(null);

  return (
    <section id="services" className="scroll-mt-28 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div className="max-w-2xl">
            <span className="mb-4 block text-sm font-bold uppercase tracking-widest text-brand-accent">
              Our Expertise
            </span>
            <h2 className="mb-6 font-display text-4xl font-bold text-slate-900 md:text-5xl">
              Build support for major home projects, not quick cosmetic work.
            </h2>
            <p className="text-lg text-slate-600">
              Thomas Custom Homes Inc. is positioned for homeowners who need planning,
              craftsmanship, and the ability to manage larger-scope residential construction.
            </p>
          </div>
          <a
            href="#gallery"
            className="group flex items-center gap-2 font-bold text-brand-primary transition-colors hover:text-brand-accent"
          >
            View Project Gallery
            <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {SERVICE_ITEMS.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.button
                key={service.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedService(service)}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 text-left transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="mb-4 text-brand-accent transition-transform duration-500 group-hover:-translate-y-2">
                    <Icon size={32} />
                  </div>
                  <h3 className="mb-2 font-display text-2xl font-bold text-white">
                    {service.title}
                  </h3>
                  <p className="translate-y-4 text-sm leading-relaxed text-slate-300 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    Click to learn more about our {service.title.toLowerCase()} process.
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedService ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedService(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close service details"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2.5rem] bg-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="absolute right-6 top-6 z-10 rounded-full bg-slate-100 p-2 text-slate-900 transition-colors hover:bg-slate-200"
              >
                <X size={24} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-64 md:h-auto">
                  <img
                    src={selectedService.image}
                    alt={selectedService.title}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent md:hidden" />
                  <div className="absolute bottom-6 left-6 md:hidden">
                    <h3 className="font-display text-3xl font-bold text-white">
                      {selectedService.title}
                    </h3>
                  </div>
                </div>

                <div className="p-8 md:p-12">
                  <div className="mb-8 hidden md:block">
                    <div className="mb-4 text-brand-accent">
                      <selectedService.icon size={32} />
                    </div>
                    <h3 className="font-display text-4xl font-bold text-slate-900">
                      {selectedService.title}
                    </h3>
                  </div>

                  <p className="mb-10 text-lg leading-relaxed text-slate-600">
                    {selectedService.description}
                  </p>

                  <div className="space-y-10">
                    <div>
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-primary">
                        <Clock size={16} className="text-brand-accent" />
                        The Build Process
                      </h4>
                      <ul className="space-y-3">
                        {selectedService.details.process.map((item, index) => (
                          <li key={item} className="flex items-start gap-3 text-slate-700">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-[10px] font-bold text-brand-accent">
                              {index + 1}
                            </div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-primary">
                        <ShieldCheck size={16} className="text-brand-accent" />
                        Key Benefits
                      </h4>
                      <ul className="space-y-3">
                        {selectedService.details.benefits.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-slate-700">
                            <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-primary">
                        <Hammer size={16} className="text-brand-accent" />
                        Project Examples
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedService.details.examples.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 border-t border-slate-100 pt-8">
                    <a
                      href={`tel:${OFFICE_PHONE}`}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-primary py-4 font-bold text-white transition-all hover:bg-brand-primary/90 active:scale-95"
                    >
                      <Phone size={20} />
                      Discuss Your {selectedService.title} Project
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Gallery() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <section id="gallery" className="scroll-mt-28 bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="mb-4 block text-sm font-bold uppercase tracking-widest text-brand-accent">
            Our Portfolio
          </span>
          <h2 className="mb-6 font-display text-4xl font-bold text-slate-900 md:text-5xl">
            Explore our recently completed projects across Brevard County.
          </h2>
          <p className="text-lg text-slate-600">
            From ground-up custom builds to major structural renovations, we bring the same level
            of craftsmanship and clarity to every project.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {PROJECTS.map((project, index) => (
            <motion.button
              key={project.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedProject(project)}
              className="group relative aspect-[16/10] overflow-hidden rounded-[2.5rem] text-left shadow-lg transition-all duration-500 hover:shadow-2xl"
            >
              <img
                src={project.image}
                alt={project.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-full bg-brand-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950">
                    {project.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-white/60">
                    <MapPin size={12} />
                    {project.location}
                  </span>
                </div>
                <h3 className="mb-4 font-display text-3xl font-bold text-white transition-colors group-hover:text-brand-accent">
                  {project.title}
                </h3>
                <p className="mb-6 max-w-md translate-y-4 text-sm text-slate-300 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  {project.description}
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  View Project Details
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedProject ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              aria-label="Close gallery modal"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[3rem] bg-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="absolute right-8 top-8 z-20 rounded-full bg-slate-100 p-3 text-slate-900 transition-colors hover:bg-slate-200"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col">
                <div className="relative h-[40vh] md:h-[50vh]">
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                </div>

                <div className="relative z-10 -mt-20 px-8 pb-16 md:px-16">
                  <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl md:p-12">
                    <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="mb-4 flex items-center gap-3">
                          <span className="rounded-full bg-brand-primary px-4 py-1 text-xs font-bold uppercase tracking-widest text-white">
                            {selectedProject.category}
                          </span>
                          <span className="flex items-center gap-1 text-sm font-medium text-brand-muted">
                            <MapPin size={14} className="text-brand-accent" />
                            {selectedProject.location}
                          </span>
                        </div>
                        <h3 className="font-display text-4xl font-bold text-slate-900 md:text-5xl">
                          {selectedProject.title}
                        </h3>
                      </div>
                      <a
                        href={`tel:${OFFICE_PHONE}`}
                        className="rounded-full bg-brand-accent px-8 py-4 font-bold text-slate-950 shadow-lg transition-all hover:bg-brand-primary hover:text-white active:scale-95"
                      >
                        Inquire About This Build
                      </a>
                    </div>

                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                      <div className="space-y-8 lg:col-span-2">
                        <div>
                          <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-brand-primary">
                            Project Overview
                          </h4>
                          <p className="text-xl leading-relaxed text-slate-600">
                            {selectedProject.details}
                          </p>
                        </div>

                        <div>
                          <h4 className="mb-6 text-sm font-bold uppercase tracking-widest text-brand-primary">
                            Key Features
                          </h4>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {selectedProject.features.map((feature) => (
                              <div
                                key={feature}
                                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
                                  <CheckCircle size={18} />
                                </div>
                                <span className="font-semibold text-slate-700">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedProject.testimonial ? (
                          <div className="relative overflow-hidden rounded-[2rem] border border-brand-primary/10 bg-brand-primary/5 p-8">
                            <Quote size={40} className="absolute right-6 top-6 text-brand-primary/10" />
                            <h4 className="mb-6 text-sm font-bold uppercase tracking-widest text-brand-primary">
                              Client Feedback
                            </h4>
                            <p className="relative z-10 mb-6 text-lg italic text-slate-700">
                              &quot;{selectedProject.testimonial.text}&quot;
                            </p>
                            <div className="flex items-center gap-4">
                              <img
                                src={selectedProject.testimonial.image}
                                alt={selectedProject.testimonial.name}
                                className="h-12 w-12 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-bold text-slate-900">
                                  {selectedProject.testimonial.name}
                                </div>
                                <div className="text-xs text-brand-muted">
                                  {selectedProject.testimonial.role}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-6">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-brand-primary">
                          Project Gallery
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {selectedProject.gallery.map((imageUrl, index) => (
                            <div key={imageUrl} className="aspect-video overflow-hidden rounded-2xl shadow-sm">
                              <img
                                src={imageUrl}
                                alt={`${selectedProject.title} detail ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Financing() {
  return (
    <section id="financing" className="scroll-mt-28 overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-primary/10 bg-brand-primary/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-primary">
              <ShieldCheck size={14} className="text-brand-accent" />
              Flexible Build Solutions
            </div>
            <h2 className="mb-8 font-display text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              In-house financing for <span className="text-brand-accent">well-qualified buyers.</span>
            </h2>
            <p className="mb-10 text-lg leading-relaxed text-slate-600">
              We understand that a custom home or major renovation is a significant investment. To
              help clients move forward with confidence, Thomas Custom Homes offers a financing
              interest path that can be reviewed alongside your project scope and timeline.
            </p>

            <div className="mb-10 space-y-6">
              {[
                'Competitive rates for construction-to-permanent loans',
                'Streamlined approval planning integrated with your build',
                'Flexible draw schedules aligned with construction milestones',
                'Guidance for financing conversations during early project planning',
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
                    <CheckCircle size={16} />
                  </div>
                  <span className="font-medium text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-8 py-4 font-bold text-white shadow-xl shadow-brand-primary/20 transition-all hover:bg-brand-primary/90 active:scale-95"
            >
              Check Your Eligibility
              <ArrowRight size={20} />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-[3rem] shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop"
                alt="Consultation"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
            </div>
            <div className="absolute -bottom-10 -left-10 hidden max-w-xs rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl md:block">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-accent/20 text-brand-accent">
                  <ShieldCheck size={24} />
                </div>
                <div className="font-bold text-slate-900">Secure & Compliant</div>
              </div>
              <p className="text-sm leading-relaxed text-slate-500">
                Financing requests are treated as preliminary qualification information so the team
                can guide the next conversation clearly and responsibly.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="process" className="scroll-mt-28 overflow-hidden bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 max-w-3xl">
          <span className="mb-4 block text-sm font-bold uppercase tracking-widest text-brand-accent">
            The Process
          </span>
          <h2 className="mb-6 font-display text-4xl font-bold md:text-5xl">
            A calmer construction experience starts with clear sequencing.
          </h2>
          <p className="text-lg text-slate-400">
            Whether the project is a new custom home or a major renovation, the goal is the same:
            make key decisions at the right time and keep the build moving with clarity.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-white/10 lg:block" />
          {PROCESS_STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="relative z-10 mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-xl font-bold text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                {step.number}
              </div>
              <h3 className="mb-4 font-display text-2xl font-bold">{step.title}</h3>
              <p className="leading-relaxed text-slate-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="mb-4 block text-sm font-bold uppercase tracking-widest text-brand-accent">
            Testimonials
          </span>
          <h2 className="mb-6 font-display text-4xl font-bold text-slate-900">
            Homeowners and collaborators remember the experience as much as the finished work.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-[2rem] border border-slate-100 bg-white p-10 shadow-sm"
            >
              <Quote size={48} className="absolute right-8 top-8 text-slate-100" />
              <p className="relative z-10 mb-8 text-xl italic text-slate-700">
                &quot;{testimonial.text}&quot;
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-14 w-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="font-bold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-brand-muted">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [formData, setFormData] = useState(INITIAL_CONTACT_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [financingStep, setFinancingStep] = useState(0);

  const currentFinancingQuestion = FINANCING_QUESTIONS[financingStep];

  function validateField(name, value) {
    if (name === 'name') {
      if (!value.trim()) return 'Name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
    }

    if (name === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    }

    if (name === 'message') {
      if (!value.trim()) return 'Message is required';
      if (value.trim().length < 10) return 'Message must be at least 10 characters';
    }

    if (name === 'completionDate' && !value.trim()) {
      return 'Desired completion date is required';
    }

    return '';
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (name.startsWith('fin_')) {
      const field = name.replace('fin_', '');
      setFormData((previous) => ({
        ...previous,
        financingData: {
          ...previous.financingData,
          [field]: value,
        },
      }));
      return;
    }

    if (type === 'checkbox') {
      if (!checked) {
        setFinancingStep(0);
      }

      setFormData((previous) => ({
        ...previous,
        [name]: checked,
        financingData: checked ? previous.financingData : { ...INITIAL_FINANCING_DATA },
      }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: validateField(name, value) }));
  }

  function answerFinancingQuestion(option) {
    const question = FINANCING_QUESTIONS[financingStep];

    setFormData((previous) => ({
      ...previous,
      financingData: {
        ...previous.financingData,
        [question.id]: option,
      },
    }));

    if (financingStep < FINANCING_QUESTIONS.length - 1) {
      window.setTimeout(() => {
        setFinancingStep((previous) => previous + 1);
      }, 180);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const nextErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      message: validateField('message', formData.message),
      completionDate: validateField('completionDate', formData.completionDate),
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    if (
      formData.wantsFinancing &&
      FINANCING_QUESTIONS.some((question) => !formData.financingData[question.id])
    ) {
      setSubmitError('Please complete the financing qualifier or turn financing off before sending.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          projectType: formData.projectType,
          budgetRange: formData.budgetRange,
          completionDate: formData.completionDate,
          message: formData.message,
          wantsFinancing: formData.wantsFinancing ? 'Yes' : 'No',
          financingEmploymentStatus: formData.financingData.employmentStatus || 'Not provided',
          financingAnnualIncome: formData.financingData.annualIncome || 'Not provided',
          financingCreditScore: formData.financingData.creditScore || 'Not provided',
          financingDownPayment: formData.financingData.downPayment || 'Not provided',
          financingPropertyStatus: formData.financingData.propertyStatus || 'Not provided',
          business: 'Thomas Custom Homes Inc.',
          officePhone: OFFICE_PHONE_DISPLAY,
          officeAddress: OFFICE_ADDRESS,
          sourcePage: 'eb28.co/tch',
          _subject: `Thomas Custom Homes lead: ${formData.projectType}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Form submission failed');
      }

      setIsSuccess(true);
      setFormData({
        ...INITIAL_CONTACT_FORM,
        financingData: { ...INITIAL_FINANCING_DATA },
      });
      setErrors({});
      setFinancingStep(0);
      window.setTimeout(() => setIsSuccess(false), 10000);
    } catch (error) {
      console.error('Thomas Custom Homes contact form error:', error);
      setSubmitError(`Please try again or call ${OFFICE_PHONE_DISPLAY} directly.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-28 overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-[3rem] bg-brand-primary p-8 text-white md:p-20">
          <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand-accent/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-8 font-display text-4xl font-bold md:text-5xl">
                Tell us what you are planning and we will help shape the next step.
              </h2>
              <p className="mb-10 text-lg text-slate-300">
                Local build leadership grounded in custom residential work. The goal is to help
                homeowners move forward with better planning, steadier communication, and work
                that feels finished the right way.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-accent">
                    <Phone size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Call Us Directly</div>
                    <a
                      href={`tel:${OFFICE_PHONE}`}
                      className="text-xl font-bold transition-colors hover:text-brand-accent"
                    >
                      {OFFICE_PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-accent">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Visit Our Office</div>
                    <div className="text-xl font-bold">{OFFICE_ADDRESS}</div>
                  </div>
                </div>
              </div>
            </div>

            <div id="contact-form" className="rounded-[2rem] bg-white p-8 text-slate-900 shadow-2xl">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckCircle size={40} />
                    </div>
                    <h3 className="mb-4 font-display text-3xl font-bold">Message Sent!</h3>
                    <p className="text-slate-600">
                      Thank you for reaching out. We&apos;ve received your request and will follow up
                      shortly to discuss your project.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSuccess(false)}
                      className="mt-8 font-bold text-brand-primary hover:underline"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="mb-6 font-display text-2xl font-bold">Request a Project Estimate</h3>
                    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={cn(
                              'w-full rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
                              errors.name
                                ? 'border-red-500 focus:ring-red-200'
                                : 'border-slate-200 focus:ring-brand-primary/20',
                            )}
                            placeholder="John Doe"
                          />
                          {errors.name ? (
                            <p className="text-[10px] font-bold uppercase tracking-tight text-red-500">
                              {errors.name}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={cn(
                              'w-full rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
                              errors.email
                                ? 'border-red-500 focus:ring-red-200'
                                : 'border-slate-200 focus:ring-brand-primary/20',
                            )}
                            placeholder="john@example.com"
                          />
                          {errors.email ? (
                            <p className="text-[10px] font-bold uppercase tracking-tight text-red-500">
                              {errors.email}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Project Type
                          </label>
                          <div className="relative">
                            <select
                              name="projectType"
                              value={formData.projectType}
                              onChange={handleChange}
                              className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                            >
                              <option>Custom Home</option>
                              <option>Major Renovation</option>
                              <option>Addition</option>
                              <option>Kitchen/Bath Remodel</option>
                            </select>
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                              <ChevronRight size={16} className="rotate-90" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Budget Range
                          </label>
                          <div className="relative">
                            <select
                              name="budgetRange"
                              value={formData.budgetRange}
                              onChange={handleChange}
                              className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                            >
                              <option>Under $100k</option>
                              <option>$100k - $250k</option>
                              <option>$250k - $500k</option>
                              <option>$500k - $1M</option>
                              <option>$1M+</option>
                            </select>
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                              <ChevronRight size={16} className="rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Desired Completion Date
                        </label>
                        <input
                          type="text"
                          name="completionDate"
                          value={formData.completionDate}
                          onChange={handleChange}
                          className={cn(
                            'w-full rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
                            errors.completionDate
                              ? 'border-red-500 focus:ring-red-200'
                              : 'border-slate-200 focus:ring-brand-primary/20',
                          )}
                          placeholder="e.g., Summer 2026 or December 2025"
                        />
                        {errors.completionDate ? (
                          <p className="text-[10px] font-bold uppercase tracking-tight text-red-500">
                            {errors.completionDate}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={18} className="text-brand-accent" />
                            <span className="text-sm font-bold text-slate-900">
                              Interested in In-House Financing?
                            </span>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              name="wantsFinancing"
                              checked={formData.wantsFinancing}
                              onChange={handleChange}
                              className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand-primary peer-focus:outline-none peer-checked:after:translate-x-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:border-white" />
                          </label>
                        </div>

                        <AnimatePresence>
                          {formData.wantsFinancing ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-slate-200 pt-4">
                                <div className="mb-4">
                                  <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>Financing Qualifier</span>
                                    <span>
                                      Step {financingStep + 1} of {FINANCING_QUESTIONS.length}
                                    </span>
                                  </div>
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                                    <motion.div
                                      className="h-full bg-brand-accent"
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${((financingStep + 1) / FINANCING_QUESTIONS.length) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <p className="font-bold text-slate-800">
                                    {currentFinancingQuestion.label}
                                  </p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {currentFinancingQuestion.options.map((option) => {
                                      const isSelected =
                                        formData.financingData[currentFinancingQuestion.id] === option;

                                      return (
                                        <button
                                          key={option}
                                          type="button"
                                          onClick={() => answerFinancingQuestion(option)}
                                          className={cn(
                                            'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
                                            isSelected
                                              ? 'border-brand-primary bg-brand-primary text-white'
                                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-primary/50',
                                          )}
                                        >
                                          {option}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex items-center justify-between pt-2">
                                    <button
                                      type="button"
                                      disabled={financingStep === 0}
                                      onClick={() => setFinancingStep((previous) => previous - 1)}
                                      className="text-xs font-bold text-slate-400 transition-colors hover:text-brand-primary disabled:opacity-0"
                                    >
                                      Back
                                    </button>
                                    {financingStep < FINANCING_QUESTIONS.length - 1 &&
                                    formData.financingData[currentFinancingQuestion.id] ? (
                                      <button
                                        type="button"
                                        onClick={() => setFinancingStep((previous) => previous + 1)}
                                        className="text-xs font-bold text-brand-primary hover:underline"
                                      >
                                        Next Question
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Message
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          className={cn(
                            'h-24 w-full resize-none rounded-xl border bg-slate-50 px-4 py-3 transition-all focus:outline-none focus:ring-2',
                            errors.message
                              ? 'border-red-500 focus:ring-red-200'
                              : 'border-slate-200 focus:ring-brand-primary/20',
                          )}
                          placeholder="Tell us about your project..."
                        />
                        {errors.message ? (
                          <p className="text-[10px] font-bold uppercase tracking-tight text-red-500">
                            {errors.message}
                          </p>
                        ) : null}
                      </div>

                      {submitError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
                          {submitError}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-4 font-bold text-white shadow-lg shadow-brand-primary/20 transition-all active:scale-95',
                          isSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-brand-primary/90',
                        )}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Sending...
                          </>
                        ) : (
                          'Send Request'
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-1 lg:col-span-2">
            <a href="#top" className="mb-6 flex items-center gap-2">
              <div className="rounded-lg bg-brand-primary p-1.5 text-white">
                <Home size={24} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                  THOMAS
                </span>
                <span className="text-[10px] font-semibold tracking-[0.2em] text-brand-muted">
                  CUSTOM HOMES INC.
                </span>
              </div>
            </a>
            <p className="mb-8 max-w-sm text-slate-500">
              Experience-led custom building and remodeling in Cocoa and across Brevard County.
              Built with a steady hand and clear communication.
            </p>
            <div className="flex gap-4 text-slate-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold">
                f
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold">
                in
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold">
                ig
              </span>
            </div>
          </div>

          <div>
            <h4 className="mb-6 font-bold text-slate-900">Quick Links</h4>
            <ul className="space-y-4 text-slate-500">
              <li>
                <a href="#services" className="transition-colors hover:text-brand-primary">
                  Services
                </a>
              </li>
              <li>
                <a href="#process" className="transition-colors hover:text-brand-primary">
                  Our Process
                </a>
              </li>
              <li>
                <a href="#financing" className="transition-colors hover:text-brand-primary">
                  Financing
                </a>
              </li>
              <li>
                <a href="#contact" className="transition-colors hover:text-brand-primary">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-bold text-slate-900">Contact Info</h4>
            <ul className="space-y-4 text-slate-500">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-1 shrink-0 text-brand-accent" />
                <span>{OFFICE_ADDRESS}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="shrink-0 text-brand-accent" />
                <a href={`tel:${OFFICE_PHONE}`} className="transition-colors hover:text-brand-primary">
                  {OFFICE_PHONE_DISPLAY}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-10 text-sm text-slate-400 md:flex-row">
          <p>© {new Date().getFullYear()} Thomas Custom Homes Inc. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#contact" className="transition-colors hover:text-slate-600">
              Privacy Policy
            </a>
            <a href="#contact" className="transition-colors hover:text-slate-600">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleSendMessage() {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages((previous) => [...previous, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    window.setTimeout(() => {
      const reply = buildConsultantReply(userMessage);
      setMessages((previous) => [...previous, { role: 'model', text: reply }]);
      setIsLoading(false);
    }, 500);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 flex h-[500px] w-[90vw] max-w-[400px] flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-brand-primary p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-brand-accent">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="font-bold">Project Consultant</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    Thomas Custom Homes
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 transition-colors hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    'flex max-w-[85%] flex-col',
                    message.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                      message.role === 'user'
                        ? 'rounded-tr-none bg-brand-primary text-white'
                        : 'rounded-tl-none border border-slate-100 bg-white text-slate-700',
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="flex items-center gap-2 text-xs font-medium italic text-slate-400">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.4s]" />
                  </div>
                  Consultant is typing...
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-100 bg-white p-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 rounded-lg bg-brand-primary p-2 text-white transition-all hover:bg-brand-primary/90 disabled:opacity-50"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
                Instant qualification helper
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className={cn(
          'group relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95',
          isOpen ? 'rotate-90 bg-white text-brand-primary' : 'bg-brand-primary text-white',
        )}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isOpen ? <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-brand-accent" /> : null}
        {!isOpen ? <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-brand-accent" /> : null}
      </button>
    </div>
  );
}

export default function ThomasCustomHomesPage() {
  return (
    <div className="relative bg-white font-sans text-slate-900">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Gallery />
        <Financing />
        <Process />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
