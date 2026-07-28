import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import { submitLeadCapture } from './leadCapture.js';
import {
  GROWTH_HOSTING_FULL_LABEL,
  GROWTH_HOSTING_SHORT_LABEL,
  WEBSITE_ONLY_LABEL,
  WEBSITE_OFFER_DISCLOSURE,
} from './offerTerms.js';
import { checkoutUrlFor, useCheckoutConfig } from './useCheckoutConfig.js';

const CONTACT_EMAIL = 'social@eb28.co';

const SERVICES = [
  {
    id: 'website',
    label: 'Website or redesign',
    short: 'A new site, a redesign, landing pages, or a better conversion path.',
    questions: [
      {
        id: 'website-project',
        prompt: 'What kind of website work do you need?',
        why: 'This separates a clean rebuild from a focused conversion repair.',
        options: ['New website', 'Full redesign', 'Landing page or funnel', 'Improve the current site'],
      },
      {
        id: 'website-action',
        prompt: 'What is the one action the website must get more people to take?',
        why: 'The primary action determines the page hierarchy and what appears above the fold.',
        options: ['Call the business', 'Book an appointment', 'Request a quote', 'Buy or pay online', 'Submit an application'],
      },
      {
        id: 'website-proof',
        prompt: 'What proof can we use right now?',
        why: 'Strong proof usually converts better than extra claims.',
        options: ['Customer reviews', 'Before-and-after work', 'Case studies or results', 'Credentials and awards', 'We need to build proof'],
      },
      {
        id: 'website-pages',
        prompt: 'Which pages or functions feel essential?',
        why: 'This gives us scope without handing you a generic page list.',
        type: 'textarea',
        placeholder: 'Services, locations, booking, quote form, financing, gallery, online payment...',
      },
    ],
  },
  {
    id: 'social',
    label: 'Social media and content',
    short: 'Strategy, posts, short-form content, articles, and a repeatable approval system.',
    questions: [
      {
        id: 'social-channels',
        prompt: 'Where do your customers pay attention first?',
        why: 'We prioritize the channels tied to the buyer instead of filling every feed.',
        options: ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Not sure yet'],
      },
      {
        id: 'social-output',
        prompt: 'What content can your team most reliably help produce?',
        why: 'The best plan is the one your business can keep supplying.',
        options: ['Photos from the work', 'Short phone videos', 'Expert answers and opinions', 'Customer stories', 'EB28 needs to produce nearly everything'],
      },
      {
        id: 'social-result',
        prompt: 'What should content do for the business first?',
        why: 'Reach, trust, leads, and recruiting require different editorial systems.',
        options: ['Generate qualified leads', 'Build local trust', 'Support sales follow-up', 'Recruit better people', 'Stay consistently visible'],
      },
      {
        id: 'social-approval',
        prompt: 'Who reviews content, and how quickly can they approve it?',
        why: 'Approval speed is often the hidden bottleneck in a content program.',
        type: 'textarea',
        placeholder: 'Owner approves by text within a day; office manager supplies photos weekly...',
      },
    ],
  },
  {
    id: 'seo',
    label: 'SEO and local visibility',
    short: 'Local search, service pages, useful content, and technical cleanup.',
    questions: [
      {
        id: 'seo-markets',
        prompt: 'Where do you need to be found?',
        why: 'Search plans are built around real service areas, not a vague national keyword list.',
        type: 'textarea',
        placeholder: 'Cities, counties, neighborhoods, or a national niche...',
      },
      {
        id: 'seo-services',
        prompt: 'Which two or three services are most valuable to grow?',
        why: 'The most searched service is not always the best service to prioritize.',
        type: 'textarea',
        placeholder: 'List the services and why they matter...',
      },
      {
        id: 'seo-presence',
        prompt: 'What search foundation exists today?',
        why: 'This tells us whether the first move is repair, expansion, or measurement.',
        options: ['Website and Google Business Profile', 'Website only', 'Google Business Profile only', 'Neither is ready', 'Not sure'],
      },
    ],
  },
  {
    id: 'leads',
    label: 'Lead generation and follow-up',
    short: 'Offer positioning, capture, qualification, routing, CRM, and faster response.',
    questions: [
      {
        id: 'leads-source',
        prompt: 'Where do most new opportunities come from now?',
        why: 'We need the real source before changing the capture path.',
        options: ['Referrals', 'Google search', 'Social media', 'Paid advertising', 'Partners or outreach', 'It is inconsistent'],
      },
      {
        id: 'leads-response',
        prompt: 'What happens in the first 15 minutes after a lead reaches out?',
        why: 'Response time and ownership reveal where qualified leads are being lost.',
        type: 'textarea',
        placeholder: 'Who sees it, who replies, what they ask, and where it gets recorded...',
      },
      {
        id: 'leads-qualified',
        prompt: 'What makes a lead worth pursuing?',
        why: 'Qualification rules keep the system focused on real buyers.',
        type: 'textarea',
        placeholder: 'Location, service, urgency, budget, property type, team size...',
      },
      {
        id: 'leads-tools',
        prompt: 'Where are leads tracked today?',
        why: 'The intake should fit the operating system you will actually use.',
        options: ['CRM', 'Spreadsheet', 'Email inbox', 'Text messages', 'Nowhere consistently', 'Not sure'],
      },
    ],
  },
  {
    id: 'automation',
    label: 'AI, automation, or CRM',
    short: 'Reduce repetitive work while keeping sensitive decisions with a person.',
    questions: [
      {
        id: 'automation-task',
        prompt: 'Which repeated task should disappear first?',
        why: 'A narrow first automation is easier to verify and improve.',
        type: 'textarea',
        placeholder: 'Lead follow-up, FAQ responses, reporting, scheduling, document intake...',
      },
      {
        id: 'automation-tools',
        prompt: 'Which tools must the system work with?',
        why: 'Integrations and access requirements affect the safest build path.',
        type: 'textarea',
        placeholder: 'Zoho, Salesforce, Google Workspace, Stripe, QuickBooks, a custom app...',
      },
      {
        id: 'automation-risk',
        prompt: 'What must always stay under human approval?',
        why: 'Good automation is explicit about the decisions it cannot make alone.',
        type: 'textarea',
        placeholder: 'Pricing, sending messages, account changes, legal advice, refunds...',
      },
    ],
  },
  {
    id: 'app',
    label: 'App or custom software',
    short: 'Customer portals, mobile apps, internal tools, and focused software products.',
    questions: [
      {
        id: 'app-user',
        prompt: 'Who is the first user, and what are they trying to finish?',
        why: 'One clear user and task produces a stronger first release.',
        type: 'textarea',
        placeholder: 'A field technician closing a job; a customer uploading documents...',
      },
      {
        id: 'app-core',
        prompt: 'What must the first useful version do?',
        why: 'This separates launch-critical behavior from a long wish list.',
        type: 'textarea',
        placeholder: 'Describe the smallest complete outcome...',
      },
      {
        id: 'app-platform',
        prompt: 'Where does it need to work first?',
        why: 'Platform choice affects scope, release work, and integration planning.',
        options: ['Web app', 'iPhone and iPad', 'Android', 'Internal desktop tool', 'Not sure yet'],
      },
    ],
  },
];

const DESIGN_TONES = [
  ['authoritative', 'Authoritative and reassuring', 'Clear, credible, and built to reduce uncertainty.'],
  ['bold', 'Bold and direct', 'Fast hierarchy, high contrast, and one obvious next move.'],
  ['premium', 'Premium and editorial', 'Measured pacing, sharper typography, and selective detail.'],
  ['local', 'Warm and local', 'Human language, real-world proof, and approachable visuals.'],
];

const OFFER_OPTIONS = [
  {
    id: 'growth-hosting-annual',
    eyebrow: 'Annual website offer · most included',
    title: GROWTH_HOSTING_FULL_LABEL,
    body: 'The website build is included. The upfront payment covers 12 months of managed hosting, technical upkeep, SEO foundations, weekly content, and lead-routing support.',
  },
  {
    id: 'website-build-only',
    eyebrow: 'Website only',
    title: WEBSITE_ONLY_LABEL,
    body: 'A one-time website build. Hosting, SEO upkeep, weekly content, and ongoing lead-routing support are not included.',
  },
  {
    id: 'no-website-yet',
    eyebrow: 'Other services first',
    title: 'Discuss the website after the initial service',
    body: 'Keep the website offer attached to the brief without choosing an option today.',
  },
];

const NEXT_STEPS = [
  ['call', 'Book a focused fit call', 'Use my answers so the call starts with decisions.'],
  ['proposal', 'Send scope and next steps', 'Review the brief and tell me what EB28 recommends.'],
  ['start', 'I am ready to start', 'Prioritize the fastest honest path into production.'],
];

function initialSelection() {
  if (typeof window === 'undefined') return [];
  const value = new URLSearchParams(window.location.search).get('service');
  return SERVICES.some((service) => service.id === value) ? [value] : [];
}

function initialNextStep() {
  if (typeof window === 'undefined') return 'proposal';
  return new URLSearchParams(window.location.search).get('intent') === 'call' ? 'call' : 'proposal';
}

function initialReferral() {
  if (typeof window === 'undefined') return { source: '', prospect: '', entryUrl: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('source') || '',
    prospect: params.get('prospect') || '',
    entryUrl: window.location.href,
  };
}

function serviceLabel(serviceId) {
  return SERVICES.find((service) => service.id === serviceId)?.label || serviceId;
}

function QuestionScreen({ question, value, onChange, onBack, onNext, stepLabel }) {
  const answered = Boolean(String(value || '').trim());

  return (
    <div className="start-question-layout">
      <aside className="start-rep-card">
        <span className="start-rep-mark">EB</span>
        <p className="start-rep-status"><i /> Project assistant</p>
        <h2>{question.prompt}</h2>
        <p>{question.why}</p>
        <small>{stepLabel}</small>
      </aside>

      <section className="start-answer-card">
        {question.options ? (
          <div className="start-option-list">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                className={value === option ? 'is-selected' : ''}
                aria-pressed={value === option}
                onClick={() => onChange(option)}
              >
                <span>{value === option ? <Check aria-hidden="true" /> : null}</span>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className="start-field start-textarea-large"
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            autoFocus
          />
        )}

        <div className="start-step-actions">
          <button type="button" className="start-back" onClick={onBack}><ArrowLeft /> Back</button>
          <button type="button" className="start-primary" onClick={onNext} disabled={!answered}>
            Continue <ArrowRight />
          </button>
        </div>
      </section>
    </div>
  );
}

export default function GetStartedPage() {
  const checkoutProducts = useCheckoutConfig();
  const [referral] = useState(initialReferral);
  const [phase, setPhase] = useState('services');
  const [selectedServices, setSelectedServices] = useState(initialSelection);
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    role: '',
    location: '',
    websiteUrl: '',
    preferredContact: 'Text message',
    preferredTime: '',
  });
  const [project, setProject] = useState({
    primaryOffer: '',
    idealCustomer: '',
    mainGoal: '',
    timing: '',
    investment: '',
  });
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [design, setDesign] = useState({
    tone: '',
    brandAssets: '',
    references: '',
    avoid: '',
  });
  const [offerChoice, setOfferChoice] = useState('');
  const [nextStep, setNextStep] = useState(initialNextStep);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const questionQueue = useMemo(
    () => selectedServices.flatMap((serviceId) => {
      const service = SERVICES.find((item) => item.id === serviceId);
      return (service?.questions || []).map((question) => ({
        ...question,
        serviceId,
        serviceLabel: service.label,
      }));
    }),
    [selectedServices],
  );

  const currentQuestion = questionQueue[questionIndex];
  const selectedTone = DESIGN_TONES.find(([id]) => id === design.tone);
  const checkoutId = offerChoice === 'growth-hosting-annual' || offerChoice === 'website-build-only'
    ? offerChoice
    : null;
  const checkoutUrl = checkoutId ? checkoutUrlFor(checkoutProducts, checkoutId) : '';
  const completedSteps =
    phase === 'services' ? 0
      : phase === 'contact' ? 1
        : phase === 'project' ? 2
          : phase === 'questions' ? 3 + questionIndex
            : phase === 'design' ? 3 + questionQueue.length
              : phase === 'offer' ? 4 + questionQueue.length
                : 5 + questionQueue.length;
  const totalSteps = 6 + questionQueue.length;
  const progress = Math.min(100, Math.round((completedSteps / totalSteps) * 100));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase, questionIndex]);

  const updateContact = (event) => {
    const { name, value } = event.target;
    setContact((previous) => ({ ...previous, [name]: value }));
  };

  const updateProject = (event) => {
    const { name, value } = event.target;
    setProject((previous) => ({ ...previous, [name]: value }));
  };

  const toggleService = (serviceId) => {
    setSelectedServices((previous) =>
      previous.includes(serviceId)
        ? previous.filter((item) => item !== serviceId)
        : [...previous, serviceId],
    );
  };

  const validateContact = () => {
    if (!contact.name.trim() || !contact.businessName.trim() || !contact.phone.trim()) {
      return 'Add your name, business name, and phone number.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      return 'Add a valid email address.';
    }
    return '';
  };

  const validateProject = () => {
    if (!project.primaryOffer.trim() || !project.idealCustomer.trim() || !project.mainGoal.trim()) {
      return 'Add the main offer, ideal customer, and result you need.';
    }
    if (!project.timing || !project.investment) {
      return 'Choose a timing and planned investment range.';
    }
    return '';
  };

  const nextQuestion = () => {
    if (questionIndex < questionQueue.length - 1) {
      setQuestionIndex((previous) => previous + 1);
      return;
    }
    setPhase('design');
  };

  const previousQuestion = () => {
    if (questionIndex > 0) {
      setQuestionIndex((previous) => previous - 1);
      return;
    }
    setPhase('project');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!offerChoice || !nextStep) {
      setError('Choose a website option and your preferred next step.');
      return;
    }
    if (!consent) {
      setError('Confirm that EB28 can contact you about this project request.');
      return;
    }

    const structuredBrief = {
      version: 'eb28-client-intake-v1',
      selectedServices: selectedServices.map(serviceLabel),
      business: project,
      onboardingAnswers: questionQueue.map((question) => ({
        service: question.serviceLabel,
        question: question.prompt,
        answer: answers[question.id],
      })),
      designDirection: {
        tone: selectedTone?.[1] || design.tone,
        brandAssets: design.brandAssets,
        references: design.references,
        avoid: design.avoid,
        protectedProductionBoundary:
          'Detailed copy, page architecture, visual components, content calendar, and implementation files were not generated in the public intake.',
      },
      websiteOfferChoice: OFFER_OPTIONS.find((option) => option.id === offerChoice)?.title,
      requestedNextStep: NEXT_STEPS.find(([id]) => id === nextStep)?.[1],
      referral,
    };

    setStatus('submitting');
    try {
      await submitLeadCapture({
        ...contact,
        serviceNeed: selectedServices.join(','),
        selectedServices: selectedServices.map(serviceLabel),
        preferredNextStep: structuredBrief.requestedNextStep,
        websiteOfferChoice: structuredBrief.websiteOfferChoice,
        offerDisclosure: WEBSITE_OFFER_DISCLOSURE,
        structuredProjectBrief: structuredBrief,
        sourcePage: referral.entryUrl || 'https://eb28.co/get-started/',
        consent: 'User requested contact about this project by their selected contact method.',
        _subject: `[EB28 CLIENT INTAKE] ${contact.businessName}: ${selectedServices.map(serviceLabel).join(', ')}`,
      });
      setStatus('success');
      setPhase('success');
    } catch (submissionError) {
      console.error('EB28 client intake failed', submissionError);
      setStatus('idle');
      setError(`The brief could not send yet. Email ${CONTACT_EMAIL} and include your business name.`);
    }
  };

  return (
    <div className="start-design">
      <a className="start-skip" href="#start-main">Skip to intake</a>
      <header className="start-nav">
        <a href="/" className="start-logo">EB<span>28</span></a>
        <div className="start-nav-copy">
          <span>Structured project intake</span>
          <a href={`mailto:${CONTACT_EMAIL}`}>Need help?</a>
        </div>
      </header>

      <div className="start-progress" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <main id="start-main">
        {phase === 'services' && (
          <section className="start-shell start-services-step">
            <div className="start-step-intro">
              <p className="start-eyebrow"><span /> START THE RIGHT CONVERSATION</p>
              <h1>Tell us what you need. We’ll ask the questions that make the work better.</h1>
              <p>Select one or more services. The intake changes around your choices and sends EB28 a structured brief before you ever get on a call.</p>
              <div className="start-trust-line"><ShieldCheck /> About 4–8 minutes. No payment on this form.</div>
            </div>

            <div className="start-service-picker">
              {SERVICES.map((service) => {
                const selected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    className={selected ? 'is-selected' : ''}
                    aria-pressed={selected}
                    onClick={() => toggleService(service.id)}
                  >
                    <span className="start-service-check">{selected ? <Check /> : null}</span>
                    <strong>{service.label}</strong>
                    <small>{service.short}</small>
                  </button>
                );
              })}
              <button
                type="button"
                className="start-primary start-picker-next"
                disabled={selectedServices.length === 0}
                onClick={() => setPhase('contact')}
              >
                Continue with {selectedServices.length || 0} selected <ArrowRight />
              </button>
            </div>
          </section>
        )}

        {phase === 'contact' && (
          <section className="start-shell start-form-step">
            <div className="start-step-intro">
              <p className="start-eyebrow"><span /> YOUR CONTACT DETAILS</p>
              <h1>Give the project a real owner.</h1>
              <p>We collect this before the detailed brief so your answers arrive together and Richard does not have to ask you to repeat them by text.</p>
            </div>

            <form
              className="start-form-card"
              onSubmit={(event) => {
                event.preventDefault();
                const validationError = validateContact();
                setError(validationError);
                if (!validationError) setPhase('project');
              }}
            >
              <div className="start-form-grid">
                <label>Full name *<input className="start-field" name="name" value={contact.name} onChange={updateContact} autoComplete="name" required /></label>
                <label>Role<input className="start-field" name="role" value={contact.role} onChange={updateContact} placeholder="Owner, marketing lead..." /></label>
                <label>Business name *<input className="start-field" name="businessName" value={contact.businessName} onChange={updateContact} required /></label>
                <label>Location or service area<input className="start-field" name="location" value={contact.location} onChange={updateContact} placeholder="Melbourne, FL / nationwide..." /></label>
                <label>Email *<input className="start-field" type="email" name="email" value={contact.email} onChange={updateContact} autoComplete="email" required /></label>
                <label>Mobile phone *<input className="start-field" type="tel" name="phone" value={contact.phone} onChange={updateContact} autoComplete="tel" required /></label>
                <label className="start-full">Website or main social profile<input className="start-field" name="websiteUrl" value={contact.websiteUrl} onChange={updateContact} placeholder="https://" /></label>
                <label>Best way to reach you
                  <select className="start-field" name="preferredContact" value={contact.preferredContact} onChange={updateContact}>
                    <option>Text message</option>
                    <option>Phone call</option>
                    <option>Email</option>
                  </select>
                </label>
                <label>Best day or time<input className="start-field" name="preferredTime" value={contact.preferredTime} onChange={updateContact} placeholder="Weekdays after 2 PM..." /></label>
              </div>
              {error && <p className="start-error" role="alert">{error}</p>}
              <div className="start-step-actions">
                <button type="button" className="start-back" onClick={() => setPhase('services')}><ArrowLeft /> Back</button>
                <button type="submit" className="start-primary">Continue <ArrowRight /></button>
              </div>
            </form>
          </section>
        )}

        {phase === 'project' && (
          <section className="start-shell start-form-step">
            <div className="start-step-intro">
              <p className="start-eyebrow"><span /> BUSINESS CONTEXT</p>
              <h1>What has to change for this project to be worth doing?</h1>
              <p>Specific goals make the design, content, and technical decisions easier to defend.</p>
            </div>

            <form
              className="start-form-card"
              onSubmit={(event) => {
                event.preventDefault();
                const validationError = validateProject();
                setError(validationError);
                if (!validationError) {
                  setQuestionIndex(0);
                  setPhase(questionQueue.length ? 'questions' : 'design');
                }
              }}
            >
              <div className="start-form-grid">
                <label className="start-full">What do you sell, and what should we prioritize? *
                  <textarea className="start-field" name="primaryOffer" value={project.primaryOffer} onChange={updateProject} required />
                </label>
                <label className="start-full">Who is the best-fit customer? *
                  <textarea className="start-field" name="idealCustomer" value={project.idealCustomer} onChange={updateProject} required />
                </label>
                <label className="start-full">What measurable result do you want first? *
                  <textarea className="start-field" name="mainGoal" value={project.mainGoal} onChange={updateProject} placeholder="More qualified calls, faster follow-up, consistent weekly content..." required />
                </label>
                <label>Timing *
                  <select className="start-field" name="timing" value={project.timing} onChange={updateProject} required>
                    <option value="">Choose one</option>
                    <option>Ready to start now</option>
                    <option>Within 30 days</option>
                    <option>Within 90 days</option>
                    <option>Researching for later</option>
                  </select>
                </label>
                <label>Planned investment *
                  <select className="start-field" name="investment" value={project.investment} onChange={updateProject} required>
                    <option value="">Choose one</option>
                    <option>Start with the website offer</option>
                    <option>Under $2,500</option>
                    <option>$2,500–$7,500</option>
                    <option>$7,500–$15,000</option>
                    <option>$15,000+</option>
                    <option>Need help setting a realistic range</option>
                  </select>
                </label>
              </div>
              {error && <p className="start-error" role="alert">{error}</p>}
              <div className="start-step-actions">
                <button type="button" className="start-back" onClick={() => setPhase('contact')}><ArrowLeft /> Back</button>
                <button type="submit" className="start-primary">Start the detailed brief <ArrowRight /></button>
              </div>
            </form>
          </section>
        )}

        {phase === 'questions' && currentQuestion && (
          <QuestionScreen
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(value) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: value }))}
            onBack={previousQuestion}
            onNext={nextQuestion}
            stepLabel={`${currentQuestion.serviceLabel} · question ${questionIndex + 1} of ${questionQueue.length}`}
          />
        )}

        {phase === 'design' && (
          <section className="start-shell start-design-step">
            <div className="start-step-intro">
              <p className="start-eyebrow"><span /> DESIGN CONVERSATION</p>
              <h1>Set a direction without giving away the production work.</h1>
              <p>You get a useful high-level direction here. The full messaging, page map, content calendar, visual components, and build files stay inside EB28’s production workflow.</p>
            </div>

            <div className="start-design-workbench">
              <div className="start-tone-grid">
                {DESIGN_TONES.map(([id, title, body]) => (
                  <button
                    key={id}
                    type="button"
                    className={design.tone === id ? 'is-selected' : ''}
                    aria-pressed={design.tone === id}
                    onClick={() => setDesign((previous) => ({ ...previous, tone: id }))}
                  >
                    <span>{design.tone === id ? <Check /> : null}</span>
                    <strong>{title}</strong>
                    <small>{body}</small>
                  </button>
                ))}
              </div>

              <label>What brand assets already exist?
                <textarea className="start-field" value={design.brandAssets} onChange={(event) => setDesign((previous) => ({ ...previous, brandAssets: event.target.value }))} placeholder="Logo files, colors, fonts, photography, testimonials..." />
              </label>
              <label>Links or references you like
                <textarea className="start-field" value={design.references} onChange={(event) => setDesign((previous) => ({ ...previous, references: event.target.value }))} placeholder="Paste URLs and say what you like about each..." />
              </label>
              <label>Anything the work must avoid?
                <textarea className="start-field" value={design.avoid} onChange={(event) => setDesign((previous) => ({ ...previous, avoid: event.target.value }))} placeholder="Visual clichés, phrases, competitors, compliance risks..." />
              </label>

              <div className="start-direction-preview">
                <div>
                  <p>High-level direction</p>
                  <h2>{selectedTone?.[1] || 'Choose a direction above'}</h2>
                  <span>
                    Primary job: {project.mainGoal || 'your first measurable result'}. The detailed execution stays protected until the project starts.
                  </span>
                </div>
                <div className="start-locked-list">
                  <p><LockKeyhole /> Kept in the EB28 production brief</p>
                  <span>Final copy and offer architecture</span>
                  <span>Page map and conversion components</span>
                  <span>Content calendar and production assets</span>
                  <span>Implementation files and automation logic</span>
                </div>
              </div>

              <div className="start-step-actions">
                <button type="button" className="start-back" onClick={() => {
                  if (questionQueue.length) {
                    setQuestionIndex(questionQueue.length - 1);
                    setPhase('questions');
                  } else {
                    setPhase('project');
                  }
                }}><ArrowLeft /> Back</button>
                <button
                  type="button"
                  className="start-primary"
                  disabled={!design.tone}
                  onClick={() => setPhase('offer')}
                >
                  See the starting options <ArrowRight />
                </button>
              </div>
            </div>
          </section>
        )}

        {phase === 'offer' && (
          <form className="start-shell start-offer-step" onSubmit={submit}>
            <div className="start-offer-intro">
              <p className="start-eyebrow"><span /> EVERY CLIENT SEES THE SAME WEBSITE OFFER</p>
              <h1>Choose how you want the website handled.</h1>
              <p>{WEBSITE_OFFER_DISCLOSURE}</p>
            </div>

            <div className="start-offer-options">
              {OFFER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={offerChoice === option.id ? 'is-selected' : ''}
                  aria-pressed={offerChoice === option.id}
                  onClick={() => setOfferChoice(option.id)}
                >
                  <span className="start-offer-radio">{offerChoice === option.id ? <Check /> : null}</span>
                  <small>{option.eyebrow}</small>
                  <strong>{option.title}</strong>
                  <p>{option.body}</p>
                </button>
              ))}
            </div>

            <div className="start-next-step">
              <h2>What should happen next?</h2>
              <div>
                {NEXT_STEPS.map(([id, title, body]) => (
                  <button
                    key={id}
                    type="button"
                    className={nextStep === id ? 'is-selected' : ''}
                    aria-pressed={nextStep === id}
                    onClick={() => setNextStep(id)}
                  >
                    <span>{nextStep === id ? <Check /> : null}</span>
                    <strong>{title}</strong>
                    <small>{body}</small>
                  </button>
                ))}
              </div>
            </div>

            <label className="start-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>I agree that EB28 can contact me about this project by the contact method I selected. This does not authorize billing, hosting, advertising, or any other paid work.</span>
            </label>

            {error && <p className="start-error" role="alert">{error}</p>}
            <div className="start-step-actions">
              <button type="button" className="start-back" onClick={() => setPhase('design')}><ArrowLeft /> Back</button>
              <button type="submit" className="start-primary" disabled={status === 'submitting' || !offerChoice || !consent}>
                {status === 'submitting' ? 'Sending your brief...' : 'Send my project brief'} <ArrowRight />
              </button>
            </div>
            <p className="start-submit-note"><ShieldCheck /> Your answers are sent as one structured EB28 intake. No payment is taken on this form.</p>
            <p className="start-processor-note">
              Form delivery is processed by FormSubmit and sent to EB28 for the sole purpose of reviewing and replying to this project request.
            </p>
          </form>
        )}

        {phase === 'success' && (
          <section className="start-success">
            <CheckCircle2 aria-hidden="true" />
            <p className="start-eyebrow">PROJECT BRIEF RECEIVED</p>
            <h1>The right conversation is already underway.</h1>
            <p>
              EB28 received your contact details, selected services, onboarding answers, design direction, website choice, and preferred next step. You will not need to repeat the brief on the first call.
            </p>
            <div className="start-success-offer">
              <small>Your website choice</small>
              <strong>{OFFER_OPTIONS.find((option) => option.id === offerChoice)?.title}</strong>
              {offerChoice === 'growth-hosting-annual' && <span>{GROWTH_HOSTING_SHORT_LABEL}</span>}
            </div>
            {checkoutUrl ? (
              <a className="start-primary" href={checkoutUrl}>
                Continue to secure checkout <ArrowRight />
              </a>
            ) : (
              <p className="start-success-note">
                EB28 will confirm fit and send the correct next step. No Stripe payment link was activated from this form.
              </p>
            )}
            <a className="start-back-link" href="/">Return to EB28</a>
          </section>
        )}
      </main>

      <footer className="start-footer">
        <span>EB28 · Melbourne, Florida</span>
        <span>Structured for EB28’s design, content, automation, and build workflow.</span>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </div>
  );
}
