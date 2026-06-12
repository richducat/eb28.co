import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { checkoutUrlFor } from '../useCheckoutConfig.js';

// Guided onboarding quiz replacing the old blank contact form — modeled on the
// Melbourne Web Studio lead quiz: one question at a time, every option teaches
// something, and it ends with a concrete recommendation and price instead of
// an empty message box.
const QUESTIONS = [
    {
        id: 'pain',
        shortLabel: 'Goal',
        question: 'What is eating your time right now?',
        subtext: 'Pick the one you would fix first. Each answer leads to a different machine.',
        options: [
            {
                label: 'Answering the same questions over and over',
                value: 'repeat-questions',
                helper: 'Customers ask, you type. An AI agent that knows your business can take that shift.',
                product: 'ai-agent',
            },
            {
                label: 'Leads reach out, then go cold before I follow up',
                value: 'cold-leads',
                helper: 'Speed wins deals. Automated follow-up keeps buyers warm while you do the work.',
                product: 'leadgen',
            },
            {
                label: 'I cannot trust my numbers without digging through Stripe',
                value: 'stripe-mess',
                helper: 'A daily plain-English money report beats spreadsheet archaeology.',
                product: 'recon',
            },
            {
                label: 'My team pastes company info into public AI tools',
                value: 'data-leak',
                helper: 'Private AI keeps client data in your building — not in someone’s training set.',
                product: 'private-ai',
            },
        ],
    },
    {
        id: 'help',
        shortLabel: 'Fit',
        question: 'How much of this do you want to do yourself?',
        subtext: 'This decides the budget, not your commitment. Honest answers get better plans.',
        options: [
            {
                label: 'I’ll try it myself first — keep it cheap',
                value: 'diy',
                helper: 'Our $10 build proves it works before you spend real money.',
                tier: 'diy',
            },
            {
                label: 'Set it up for me. I’ll run it once it works',
                value: 'done-for-me',
                helper: 'White-glove: we build it, hand you the keys, and stay for 30 days.',
                tier: 'white-glove',
            },
            {
                label: 'Build it and run it with me long-term',
                value: 'partner',
                helper: 'A custom system with us as your ongoing tech partner.',
                tier: 'custom',
            },
        ],
    },
    {
        id: 'timing',
        shortLabel: 'Timing',
        question: 'When does this need to start paying you back?',
        subtext: 'We recommend the shortest honest route, not the biggest invoice.',
        options: [
            {
                label: 'This week — I can feel the missed work',
                value: 'this-week',
                helper: 'Fastest route: start small today, upgrade once it earns its keep.',
            },
            {
                label: 'This month — it’s time',
                value: 'this-month',
                helper: 'Enough room to set it up right the first time.',
            },
            {
                label: 'Just researching — show me what’s possible',
                value: 'researching',
                helper: 'Smart. The $10 build exists exactly for this.',
            },
        ],
    },
];

const RECOMMENDATIONS = {
    recon: {
        key: 'recon',
        name: 'Recon Agent Founder Beta',
        price: '$17/mo',
        serviceNeed: 'recon-agent-founder-beta',
        checkoutId: 'recon-agent-beta',
        pageHref: '/reconcile/',
        why: 'Your bottleneck is financial visibility, and that is exactly what Recon Agent does: a daily plain-English report of what matched, what looks off, and what needs a look.',
        next: [
            'Tell us where to send your plan (below).',
            'Connect your Stripe account — read-only, your data stays yours.',
            'Your first morning money report lands within 1 business day.',
        ],
    },
    diy: {
        key: 'diy',
        name: 'DIY AI Foundation Build',
        price: '$10 one-time',
        serviceNeed: '10-dollar-bot',
        checkoutId: 'diy-ai-foundation',
        why: 'Start with the $10 build: a working AI agent around the exact task you picked, delivered in 24 hours. If it earns its keep, upgrade and we set up the whole system.',
        next: [
            'Tell us where to send your plan (below).',
            'We configure your agent around the task you described.',
            'It lands in your inbox within 24 hours, ready to use.',
        ],
    },
    'white-glove': {
        key: 'white-glove',
        name: 'White-Glove Onboarding',
        price: '$1,000 one-time',
        serviceNeed: 'white-glove',
        checkoutId: 'white-glove-onboarding',
        why: 'You want it built for you, working, with nothing to configure. White-glove is exactly that: we set up the full system, hand you the keys, and stay for 30 days of adjustments.',
        next: [
            'Tell us where to send your plan (below).',
            '1:1 kickoff within 1 business day — we build everything for you.',
            'Your system is live within 7 days, with 30 days of included tweaks.',
        ],
    },
    custom: {
        key: 'custom',
        name: 'Custom System + Partnership',
        price: 'Scoped quote, free',
        serviceNeed: 'consultation',
        checkoutId: null,
        why: 'Long-term systems deserve real scoping. Send your details and you get a concrete plan with prices — not a sales call loop.',
        next: [
            'Tell us where to send your plan (below).',
            'We reply with a scoped plan and exact pricing within 1 business day.',
            'You decide. No pressure, no retainer required to start.',
        ],
    },
};

function pickRecommendation(answers) {
    const pain = QUESTIONS[0].options.find((o) => o.value === answers.pain);
    const help = QUESTIONS[1].options.find((o) => o.value === answers.help);

    if (pain?.product === 'recon') return RECOMMENDATIONS.recon;
    if (help?.tier === 'white-glove') return RECOMMENDATIONS['white-glove'];
    if (help?.tier === 'custom') return RECOMMENDATIONS.custom;
    return RECOMMENDATIONS.diy;
}

export default function OnboardingQuiz({ checkoutProducts, interestedIn }) {
    const [step, setStep] = useState(0); // 0..2 questions, 3 = plan + details
    const [answers, setAnswers] = useState({});
    const [contact, setContact] = useState({ name: '', email: '', phone: '', message: '' });
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const totalSteps = QUESTIONS.length + 1;
    const progress = ((step + 1) / totalSteps) * 100;
    const onDetailsStep = step === QUESTIONS.length;
    const recommendation = onDetailsStep ? pickRecommendation(answers) : null;
    const checkoutUrl = recommendation?.checkoutId
        ? checkoutUrlFor(checkoutProducts, recommendation.checkoutId)
        : '';

    const select = (questionId, value) => setAnswers((prev) => ({ ...prev, [questionId]: value }));

    const next = () => {
        if (!answers[QUESTIONS[step].id]) return;
        setStep((prev) => prev + 1);
    };

    const back = () => setStep((prev) => Math.max(0, prev - 1));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!contact.name.trim()) { setError('Please enter your name.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
            setError('Please enter a valid email address.'); return;
        }

        setStatus('submitting');
        try {
            await fetch('https://formsubmit.co/ajax/richducat@gmail.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    ...contact,
                    serviceNeed: recommendation.serviceNeed,
                    recommendedPlan: `${recommendation.name} (${recommendation.price})`,
                    quizAnswers: answers,
                    interestedIn: interestedIn || 'none',
                    sourcePage: 'eb28.co onboarding quiz',
                    _subject: `[EB28 HIGH PRIORITY LEAD] Quiz: ${recommendation.name}`,
                }),
            });
            setStatus('success');
        } catch {
            setError('Something went wrong. Please try again.');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Your plan is on its way.</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                    {recommendation.name} — {recommendation.price}. We reply within one business day,
                    usually much faster.
                </p>
                {checkoutUrl && (
                    <a
                        href={checkoutUrl}
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/25 mb-4"
                    >
                        Skip the wait — start now for {recommendation.price} <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                )}
                <div>
                    <button
                        onClick={() => { setStatus('idle'); setStep(0); setAnswers({}); setContact({ name: '', email: '', phone: '', message: '' }); }}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Start Over
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Progress header */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {onDetailsStep
                        ? 'Your plan'
                        : `Step ${step + 1} of ${totalSteps} — ${QUESTIONS[step].shortLabel}`}
                </p>
                <p className="text-xs font-bold text-slate-500">{Math.round(progress)}%</p>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {step > 0 && (
                <button
                    type="button"
                    onClick={back}
                    className="mb-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </button>
            )}

            {!onDetailsStep ? (
                <fieldset>
                    <legend className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {QUESTIONS[step].question}
                    </legend>
                    <p className="mt-2 text-sm text-slate-400">{QUESTIONS[step].subtext}</p>

                    <div className="mt-6 space-y-3">
                        {QUESTIONS[step].options.map((option) => {
                            const isSelected = answers[QUESTIONS[step].id] === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => select(QUESTIONS[step].id, option.value)}
                                    className={`relative flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-800'
                                    }`}
                                >
                                    <span
                                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-500 text-white'
                                                : 'border-slate-600 bg-slate-800 text-slate-500'
                                        }`}
                                    >
                                        {isSelected ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <span className="h-2 w-2 rounded-full bg-slate-600" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-bold text-white leading-snug">{option.label}</span>
                                        <span className="mt-1 block text-sm text-slate-400 leading-snug">{option.helper}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={next}
                            disabled={!answers[QUESTIONS[step].id]}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg py-4 text-lg font-bold transition-all ${
                                answers[QUESTIONS[step].id]
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25'
                                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                            }`}
                        >
                            {step === QUESTIONS.length - 1 ? 'Show Me My Plan' : 'Next Question'}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            <span>60 seconds</span>
                            <span className="text-blue-500" aria-hidden="true">•</span>
                            <span>No sales pressure</span>
                            <span className="text-blue-500" aria-hidden="true">•</span>
                            <span>Ends with a price</span>
                        </div>
                    </div>
                </fieldset>
            ) : (
                <form onSubmit={submit} className="space-y-6">
                    <div className="rounded-2xl border border-blue-500/40 bg-blue-500/5 p-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Recommended for you</p>
                        <h3 className="text-2xl font-bold text-white">
                            {recommendation.name} <span className="text-blue-400">— {recommendation.price}</span>
                        </h3>
                        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{recommendation.why}</p>
                        <ol className="mt-4 space-y-2">
                            {recommendation.next.map((item, idx) => (
                                <li key={idx} className="flex items-start text-sm text-slate-300">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold mr-3 shrink-0 mt-0.5">{idx + 1}</span>
                                    {item}
                                </li>
                            ))}
                        </ol>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="quiz-name" className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                            <input id="quiz-name" name="name" autoComplete="name" type="text" value={contact.name} onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John Doe" />
                        </div>
                        <div>
                            <label htmlFor="quiz-phone" className="block text-sm font-medium text-slate-300 mb-2">Phone (optional)</label>
                            <input id="quiz-phone" name="phone" autoComplete="tel" inputMode="tel" type="tel" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="(555) 000-0000" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="quiz-email" className="block text-sm font-medium text-slate-300 mb-2">Email — where your plan goes *</label>
                        <input id="quiz-email" name="email" autoComplete="email" type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="john@example.com" />
                    </div>

                    <div>
                        <label htmlFor="quiz-message" className="block text-sm font-medium text-slate-300 mb-2">Anything we should know? (optional)</label>
                        <textarea id="quiz-message" name="message" rows="3" value={contact.message} onChange={(e) => setContact((p) => ({ ...p, message: e.target.value }))} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Your business, your tools, your deadline..."></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg text-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === 'submitting' ? 'Sending...' : 'Send My Plan'}
                        {status !== 'submitting' && <ArrowRight className="ml-2 w-5 h-5" />}
                    </button>

                    {checkoutUrl && (
                        <a
                            href={checkoutUrl}
                            className="flex w-full items-center justify-center py-4 bg-white text-slate-900 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
                        >
                            Skip the wait — start now for {recommendation.price}
                        </a>
                    )}

                    <p className="text-center text-xs text-slate-500 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 mr-1 text-green-400" />
                        🔒 Transmission encrypted. We reply within one business day — usually much faster.
                    </p>
                </form>
            )}
        </div>
    );
}
