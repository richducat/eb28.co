import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Hammer,
  Home,
  Loader2,
  MapPin,
  Menu,
  PaintBucket,
  Phone,
  Ruler,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';

const ALIGNABLE_URL = 'https://www.alignable.com/cocoa-fl/thomas-custom-homes-inc';
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/richducat@gmail.com';
const OFFICE_PHONE = '3215871163';
const OFFICE_PHONE_DISPLAY = '(321) 587-1163';
const OFFICE_ADDRESS = '846 N. Cocoa Blvd. Suite C, Cocoa, FL 32922';

const services = [
  {
    title: 'New Custom Homes',
    description:
      'Ground-up custom homes designed around your lot, lifestyle, and finish preferences.',
    image:
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80',
    projectType: 'New Custom Home',
    icon: Home,
  },
  {
    title: 'Whole-Home Remodels',
    description:
      'Major renovations that modernize layout, finishes, and flow without losing the character of your home.',
    image:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
    projectType: 'Whole Home Remodel',
    icon: Hammer,
  },
  {
    title: 'Additions & Expansions',
    description:
      'New rooms, expanded living areas, and second-story growth that blends with your existing structure.',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
    projectType: 'Addition',
    icon: Ruler,
  },
  {
    title: 'Kitchen & Bath Upgrades',
    description:
      'Focused remodels with cabinetry, surfaces, fixtures, and material choices that elevate everyday use.',
    image:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80',
    projectType: 'Kitchen / Bath Remodel',
    icon: PaintBucket,
  },
];

const processSteps = [
  {
    eyebrow: '01',
    title: 'Discovery & Scope',
    description:
      'We learn the goals of the project, the site conditions, and the level of finish you want before pricing direction is discussed.',
  },
  {
    eyebrow: '02',
    title: 'Design & Planning',
    description:
      'Selections, layout needs, and build constraints are clarified early so the work starts from a realistic plan.',
  },
  {
    eyebrow: '03',
    title: 'Build Execution',
    description:
      'Construction is managed with a focus on craftsmanship, communication, and clean coordination across trades.',
  },
  {
    eyebrow: '04',
    title: 'Final Walkthrough',
    description:
      'The project is reviewed in detail so the finished result feels complete, polished, and ready to enjoy.',
  },
];

const trustPoints = [
  'Custom design and custom homes',
  'New construction and general contracting',
  'Cabinets, countertops, baths, flooring, and structural updates',
  'Local Brevard County presence with public recommendations on Alignable',
];

const projectTypeOptions = [
  'New Custom Home',
  'Whole Home Remodel',
  'Addition',
  'Kitchen / Bath Remodel',
];

const landOptions = [
  'Yes, I already own the land',
  'I have a property under contract',
  'No, I am still searching for land',
];

const timelineOptions = [
  'As soon as possible',
  'Within 3 to 6 months',
  'Within 6 to 12 months',
  'Just researching for now',
];

const budgetOptions = [
  'Under $100k',
  '$100k to $250k',
  '$250k to $500k',
  '$500k to $1M',
  '$1M to $2M',
  '$2M+',
];

const initialFormData = {
  projectType: '',
  hasLand: '',
  timeline: '',
  budget: '',
  name: '',
  email: '',
  phone: '',
  details: '',
};

function scrollToId(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function StepOption({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border px-5 py-5 text-left transition ${
        active
          ? 'border-stone-900 bg-stone-900 text-white shadow-lg'
          : 'border-stone-200 bg-white text-stone-800 hover:border-amber-400 hover:bg-amber-50'
      }`}
    >
      {children}
    </button>
  );
}

const ThomasCustomHomesPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const steps =
    formData.projectType === 'New Custom Home'
      ? ['projectType', 'hasLand', 'timeline', 'budget', 'details', 'contact']
      : ['projectType', 'timeline', 'budget', 'details', 'contact'];

  const currentStep = steps[stepIndex];
  const isSuccessStep = stepIndex >= steps.length;
  const progress = isSuccessStep ? 100 : ((stepIndex + 1) / steps.length) * 100;

  const updateFormField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openFunnel = (projectType = '') => {
    setSubmitError('');
    setIsQualifying(true);
    setFormData((previous) => ({
      ...initialFormData,
      projectType,
    }));
    setStepIndex(projectType ? 1 : 0);
    setTimeout(() => scrollToId('lead-funnel'), 120);
  };

  const handleOptionSelect = (field, value) => {
    updateFormField(field, value);
    setSubmitError('');
    setTimeout(() => {
      setStepIndex((previous) => Math.min(previous + 1, steps.length));
    }, 180);
  };

  const resetFunnel = () => {
    setIsQualifying(false);
    setStepIndex(0);
    setSubmitError('');
    setFormData(initialFormData);
  };

  const submitLead = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          business: 'Thomas Custom Homes Inc.',
          officePhone: OFFICE_PHONE_DISPLAY,
          officeAddress: OFFICE_ADDRESS,
          sourcePage: 'eb28.co/tch',
          _subject: `Thomas Custom Homes lead: ${formData.projectType || 'New inquiry'}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Lead submission failed');
      }

      setStepIndex(steps.length);
    } catch (error) {
      console.error('Thomas Custom Homes form submission error:', error);
      setSubmitError(
        `There was an issue sending your request. Please call ${OFFICE_PHONE_DISPLAY} directly.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f4ee] font-estate-body text-stone-800 selection:bg-stone-900 selection:text-white">
      <nav className="sticky top-0 z-50 border-b border-stone-200/70 bg-[#f8f4ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/tch/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white shadow-sm">
              <Home className="h-5 w-5 text-stone-800" />
            </div>
            <div className="leading-none">
              <div className="font-estate-display text-2xl font-semibold tracking-[0.16em] text-stone-900">
                THOMAS
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.42em] text-stone-500">
                Custom Homes Inc.
              </div>
            </div>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#services" className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-600 transition hover:text-stone-950">
              Services
            </a>
            <a href="#process" className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-600 transition hover:text-stone-950">
              Process
            </a>
            <a href="#about" className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-600 transition hover:text-stone-950">
              About
            </a>
            <a
              href={`tel:${OFFICE_PHONE}`}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900"
            >
              {OFFICE_PHONE_DISPLAY}
            </a>
            <button
              type="button"
              onClick={() => openFunnel()}
              className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Start Your Project
            </button>
          </div>

          <button
            type="button"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen((previous) => !previous)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t border-stone-200 bg-white px-4 py-4 md:hidden">
            <div className="space-y-2">
              <a
                href="#services"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:bg-stone-100"
              >
                Services
              </a>
              <a
                href="#process"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:bg-stone-100"
              >
                Process
              </a>
              <a
                href="#about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:bg-stone-100"
              >
                About
              </a>
              <a
                href={`tel:${OFFICE_PHONE}`}
                className="block rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-900"
              >
                Call {OFFICE_PHONE_DISPLAY}
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openFunnel();
                }}
                className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Start Your Project
              </button>
            </div>
          </div>
        ) : null}
      </nav>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-20">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80"
              alt="Thomas Custom Homes residence exterior"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(28,25,23,0.86),rgba(41,37,36,0.55),rgba(120,53,15,0.25))]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-[linear-gradient(to_top,rgba(248,244,238,1),rgba(248,244,238,0))]" />

          <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-end gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-20 lg:pt-20">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-50 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-amber-300" />
                Design Build Construction in Cocoa, Florida
              </div>
              <h1 className="font-estate-display max-w-3xl text-5xl font-semibold leading-[0.94] text-white sm:text-6xl lg:text-7xl">
                Custom homes and major remodels built with a steady hand.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200 sm:text-xl">
                Thomas Custom Homes Inc. helps Brevard County homeowners move from concept to construction with custom home building, additions, and whole-home renovation expertise.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openFunnel()}
                  className="group inline-flex items-center justify-center rounded-full bg-amber-500 px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-stone-950 transition hover:bg-amber-400"
                >
                  Get a Project Estimate
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </button>
                <a
                  href={`tel:${OFFICE_PHONE}`}
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur transition hover:bg-white/15"
                >
                  Call {OFFICE_PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                    Public Profile
                  </div>
                  <div className="mt-3 font-estate-display text-3xl">Tony Thomas Jr.</div>
                  <div className="mt-2 text-sm leading-6 text-stone-200">
                    Owner profile listed in Cocoa, FL with Thomas Custom Homes Inc.
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                    Brevard County
                  </div>
                  <div className="mt-3 font-estate-display text-3xl">Custom Build Focus</div>
                  <div className="mt-2 text-sm leading-6 text-stone-200">
                    New homes, remodels, additions, cabinetry, counters, flooring, and general contracting.
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-100">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-4 py-2">
                  <Star className="h-4 w-4 text-amber-300" />
                  Alignable recommendations
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-4 py-2">
                  <MapPin className="h-4 w-4 text-amber-300" />
                  Cocoa, FL
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
            <div>
              <div className="font-estate-display text-4xl text-stone-900">Custom</div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.26em] text-stone-500">
                Build-first approach
              </div>
            </div>
            <div>
              <div className="font-estate-display text-4xl text-stone-900">Cocoa</div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.26em] text-stone-500">
                Brevard County base
              </div>
            </div>
            <div>
              <div className="font-estate-display text-4xl text-stone-900">Phone</div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
                {OFFICE_PHONE_DISPLAY}
              </div>
            </div>
            <div>
              <div className="font-estate-display text-4xl text-stone-900">Alignable</div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.26em] text-stone-500">
                Public recommendations
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-24 bg-[#f8f4ee] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Services
                </div>
                <h2 className="mt-4 font-estate-display text-4xl text-stone-900 sm:text-5xl">
                  Build support for major home projects, not quick cosmetic work.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-stone-600">
                Thomas Custom Homes Inc. is positioned for homeowners who need planning, craftsmanship, and the ability to manage larger-scope residential construction.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <article
                    key={service.title}
                    className="group overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_20px_60px_rgba(41,37,36,0.08)]"
                  >
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(28,25,23,0.92),rgba(28,25,23,0.1))]" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-estate-display text-3xl">{service.title}</h3>
                      </div>
                    </div>
                    <div className="p-7">
                      <p className="text-base leading-7 text-stone-600">{service.description}</p>
                      <button
                        type="button"
                        onClick={() => openFunnel(service.projectType)}
                        className="mt-6 inline-flex items-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-900 transition hover:text-amber-700"
                      >
                        Discuss this project
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="process" className="scroll-mt-24 bg-stone-900 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                  Our Process
                </div>
                <h2 className="mt-4 font-estate-display text-4xl sm:text-5xl">
                  A calmer construction experience starts with clear sequencing.
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-stone-300">
                  Whether the project is a new custom home or a major renovation, the goal is the same: make key decisions at the right time and keep the build moving with clarity.
                </p>
              </div>

              <div className="grid gap-5">
                {processSteps.map((step) => (
                  <div
                    key={step.eyebrow}
                    className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6 backdrop-blur"
                  >
                    <div className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                      {step.eyebrow}
                    </div>
                    <h3 className="mt-3 font-estate-display text-3xl">{step.title}</h3>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="lead-funnel" className="scroll-mt-24 bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            {!isQualifying ? (
              <div className="overflow-hidden rounded-[2.5rem] border border-stone-200 bg-[linear-gradient(135deg,#1c1917,#44403c_50%,#78350f)] px-8 py-12 text-white shadow-[0_30px_90px_rgba(41,37,36,0.25)] sm:px-12">
                <div className="max-w-3xl">
                  <div className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                    Project Builder
                  </div>
                  <h2 className="mt-4 font-estate-display text-4xl sm:text-5xl">
                    Tell us what you are planning and we will help shape the next step.
                  </h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-200">
                    Answer a few questions about the scope, timing, and budget so the initial conversation starts with useful context.
                  </p>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => openFunnel()}
                      className="inline-flex items-center justify-center rounded-full bg-amber-500 px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-stone-950 transition hover:bg-amber-400"
                    >
                      Start Your Project Builder
                    </button>
                    <a
                      href={`tel:${OFFICE_PHONE}`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white"
                    >
                      Or call {OFFICE_PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[2.5rem] border border-stone-200 bg-[#fcfaf6] shadow-[0_30px_90px_rgba(41,37,36,0.14)]">
                {!isSuccessStep ? (
                  <div className="h-2 w-full bg-stone-100">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}

                <div className="p-8 sm:p-10 lg:p-12">
                  {!isSuccessStep && stepIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitError('');
                        setStepIndex((previous) => Math.max(previous - 1, 0));
                      }}
                      className="mb-8 inline-flex items-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-500 transition hover:text-stone-900"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </button>
                  ) : null}

                  {!isSuccessStep && currentStep === 'projectType' ? (
                    <div>
                      <h3 className="font-estate-display text-4xl text-stone-900">
                        What type of project are you planning?
                      </h3>
                      <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
                        Select the option that best matches your project so we can route the conversation correctly.
                      </p>
                      <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {projectTypeOptions.map((option) => (
                          <StepOption
                            key={option}
                            active={formData.projectType === option}
                            onClick={() => handleOptionSelect('projectType', option)}
                          >
                            <div className="font-estate-display text-2xl">{option}</div>
                          </StepOption>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isSuccessStep && currentStep === 'hasLand' ? (
                    <div>
                      <h3 className="font-estate-display text-4xl text-stone-900">
                        Do you already have the homesite?
                      </h3>
                      <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
                        This helps us understand where you are in the custom home process.
                      </p>
                      <div className="mt-8 grid gap-4">
                        {landOptions.map((option) => (
                          <StepOption
                            key={option}
                            active={formData.hasLand === option}
                            onClick={() => handleOptionSelect('hasLand', option)}
                          >
                            <div className="text-lg font-semibold">{option}</div>
                          </StepOption>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isSuccessStep && currentStep === 'timeline' ? (
                    <div>
                      <h3 className="font-estate-display text-4xl text-stone-900">
                        When would you like to begin?
                      </h3>
                      <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
                        Timing helps us understand readiness and near-term planning needs.
                      </p>
                      <div className="mt-8 grid gap-4">
                        {timelineOptions.map((option) => (
                          <StepOption
                            key={option}
                            active={formData.timeline === option}
                            onClick={() => handleOptionSelect('timeline', option)}
                          >
                            <div className="text-lg font-semibold">{option}</div>
                          </StepOption>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isSuccessStep && currentStep === 'budget' ? (
                    <div>
                      <h3 className="font-estate-display text-4xl text-stone-900">
                        What budget range feels realistic?
                      </h3>
                      <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
                        A rough range helps shape the right level of scope, materials, and sequencing.
                      </p>
                      <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {budgetOptions.map((option) => (
                          <StepOption
                            key={option}
                            active={formData.budget === option}
                            onClick={() => handleOptionSelect('budget', option)}
                          >
                            <div className="text-lg font-semibold">{option}</div>
                          </StepOption>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isSuccessStep && currentStep === 'details' ? (
                    <div>
                      <h3 className="font-estate-display text-4xl text-stone-900">
                        Anything else we should know?
                      </h3>
                      <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
                        Share the style, size, rooms, or priorities that matter most to you.
                      </p>
                      <textarea
                        rows="6"
                        value={formData.details}
                        onChange={(event) => updateFormField('details', event.target.value)}
                        className="mt-8 w-full rounded-[1.75rem] border border-stone-200 bg-white px-5 py-5 text-base leading-7 text-stone-800 outline-none transition focus:border-stone-900"
                        placeholder="Example: We want a modern coastal look, open kitchen, large outdoor living area, and strong primary suite privacy."
                      />
                      <button
                        type="button"
                        onClick={() => setStepIndex((previous) => Math.min(previous + 1, steps.length))}
                        className="mt-6 inline-flex items-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700"
                      >
                        Next Step
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  {!isSuccessStep && currentStep === 'contact' ? (
                    <div>
                      <h3 className="font-estate-display text-4xl text-stone-900">
                        Where should we send the next-step follow-up?
                      </h3>
                      <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
                        Share your contact details and we will package the project summary with your answers above.
                      </p>

                      <form onSubmit={submitLead} className="mt-8 grid gap-5">
                        <div>
                          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Full Name
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(event) => updateFormField('name', event.target.value)}
                            className="w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-4 text-base text-stone-900 outline-none transition focus:border-stone-900"
                          />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                              Email
                            </label>
                            <input
                              required
                              type="email"
                              value={formData.email}
                              onChange={(event) => updateFormField('email', event.target.value)}
                              className="w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-4 text-base text-stone-900 outline-none transition focus:border-stone-900"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                              Phone
                            </label>
                            <input
                              required
                              type="tel"
                              value={formData.phone}
                              onChange={(event) => updateFormField('phone', event.target.value)}
                              className="w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-4 text-base text-stone-900 outline-none transition focus:border-stone-900"
                            />
                          </div>
                        </div>

                        {submitError ? (
                          <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
                            {submitError}
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Project Request
                            </>
                          ) : (
                            'Submit Project Request'
                          )}
                        </button>

                        <p className="inline-flex items-center justify-center gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          <CheckCircle2 className="h-4 w-4" />
                          Your details are used only for project follow-up.
                        </p>
                      </form>
                    </div>
                  ) : null}

                  {isSuccessStep ? (
                    <div className="text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                      </div>
                      <h3 className="mt-6 font-estate-display text-4xl text-stone-900">
                        Project request received
                      </h3>
                      <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-stone-600">
                        Thanks, {formData.name.split(' ')[0] || 'there'}. Your {formData.projectType.toLowerCase()} inquiry has been captured with the planning notes you shared.
                      </p>
                      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                        <a
                          href={`tel:${OFFICE_PHONE}`}
                          className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-900 transition hover:border-stone-900"
                        >
                          Call {OFFICE_PHONE_DISPLAY}
                        </a>
                        <button
                          type="button"
                          onClick={resetFunnel}
                          className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700"
                        >
                          Return to Homepage
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="about" className="scroll-mt-24 bg-[#f3ede5] py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_18px_70px_rgba(41,37,36,0.08)]">
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80"
                alt="Architectural planning and construction coordination"
                className="h-full min-h-[360px] w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center">
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                About Thomas Custom Homes Inc.
              </div>
              <h2 className="mt-4 font-estate-display text-4xl text-stone-900 sm:text-5xl">
                Local build leadership grounded in custom residential work.
              </h2>
              <p className="mt-6 text-lg leading-8 text-stone-600">
                Thomas Custom Homes Inc. is publicly listed in Cocoa, Florida under Tony Thomas Jr. with a design-build construction focus. The business profile highlights custom design, new construction, bathroom remodeling, cabinetry and countertops, flooring, and general contracting services.
              </p>
              <div className="mt-8 grid gap-4">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-amber-700" />
                    <span className="text-base leading-7 text-stone-700">{point}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href={ALIGNABLE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-stone-700"
                >
                  View Alignable Profile
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
                <a
                  href={`tel:${OFFICE_PHONE}`}
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-900 transition hover:border-stone-900"
                >
                  Talk Through Your Project
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-stone-950 py-14 text-stone-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.8fr] lg:px-8">
          <div>
            <div className="font-estate-display text-3xl text-white">Thomas Custom Homes Inc.</div>
            <p className="mt-4 max-w-md text-base leading-7 text-stone-400">
              Custom homes, additions, and remodels shaped around clear communication, practical planning, and lasting craftsmanship.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-stone-500">
              Contact
            </div>
            <div className="mt-5 space-y-4">
              <a href={`tel:${OFFICE_PHONE}`} className="flex items-start gap-3 text-sm text-stone-300 transition hover:text-white">
                <Phone className="mt-0.5 h-4 w-4 text-amber-300" />
                <span>{OFFICE_PHONE_DISPLAY}</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-stone-300">
                <MapPin className="mt-0.5 h-4 w-4 text-amber-300" />
                <span>{OFFICE_ADDRESS}</span>
              </div>
              <a
                href={ALIGNABLE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 text-sm text-stone-300 transition hover:text-white"
              >
                <Star className="mt-0.5 h-4 w-4 text-amber-300" />
                <span>Alignable profile and recommendations</span>
              </a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-stone-500">
              Quick Actions
            </div>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => openFunnel()}
                className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-900 transition hover:bg-stone-200"
              >
                Start Your Project
              </button>
              <a
                href="#services"
                className="block rounded-full border border-white/10 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/30"
              >
                Explore Services
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThomasCustomHomesPage;
