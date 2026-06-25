import React, { useState } from 'react';
import { ArrowRight, Bot, BarChart, CheckCircle, Clock, Mail, ShieldCheck } from 'lucide-react';
import { submitLeadCapture } from './leadCapture.js';

// Post-purchase onboarding. Stripe Payment Links redirect here after payment
// (configured per product in /public/checkout-config.json). The intake form
// collects everything needed to start fulfillment, so a paying customer is
// onboarded without waiting on a human reply.
const PRODUCTS = {
    'diy-ai-foundation': {
        name: 'DIY AI Foundation Build',
        price: '$10 one-time',
        icon: <Bot className="w-8 h-8 text-blue-400" />,
        deliverySla: 'within 24 hours',
        steps: [
            'Tell us about your business and the task you want automated (form below, ~2 minutes).',
            'We configure your AI agent: secure account, knowledge base link, and a custom system prompt built around your task.',
            'Your finished setup and integration guide arrive in your inbox within 24 hours.',
        ],
        fields: [
            {
                id: 'useCase',
                label: 'What task should your AI agent handle first? *',
                placeholder: 'e.g. Answer customer FAQs from my price list, draft follow-up emails, summarize job notes...',
                type: 'textarea',
                required: true,
            },
            {
                id: 'dataSource',
                label: 'Where does the relevant info live today?',
                placeholder: 'e.g. Google Drive folder, Notion, a PDF price list, my website...',
                type: 'text',
                required: false,
            },
        ],
    },
    'white-glove-onboarding': {
        name: 'White-Glove Onboarding',
        price: '$1,000 one-time',
        icon: <ShieldCheck className="w-8 h-8 text-amber-400" />,
        deliverySla: 'kickoff within 1 business day, live within 7 days',
        steps: [
            'Tell us about your business and what to set up first (form below, ~2 minutes).',
            'We schedule your 1:1 kickoff within 1 business day and build everything for you — AI agent, knowledge base, lead capture, tool connections.',
            'Handoff: your system is live within 7 days, with 30 days of included adjustments after delivery.',
        ],
        fields: [
            {
                id: 'business',
                label: 'Your business — what do you sell and to whom? *',
                placeholder: 'e.g. Residential lawn care in Brevard County, ~200 active customers...',
                type: 'textarea',
                required: true,
            },
            {
                id: 'firstSystem',
                label: 'What should we set up first? *',
                placeholder: 'e.g. An AI receptionist for missed calls, a quote follow-up machine, a private AI on our SOPs...',
                type: 'text',
                required: true,
            },
            {
                id: 'currentTools',
                label: 'Tools you use today',
                placeholder: 'e.g. Gmail, QuickBooks, Jobber, a WordPress site...',
                type: 'text',
                required: false,
            },
            {
                id: 'phone',
                label: 'Phone for your kickoff call',
                placeholder: '(555) 000-0000',
                type: 'text',
                required: false,
            },
        ],
    },
    'recon-agent-beta': {
        name: 'Recon Agent Founder Beta',
        price: '$17/mo',
        icon: <BarChart className="w-8 h-8 text-cyan-300" />,
        deliverySla: 'within 1 business day',
        steps: [
            'Tell us which Stripe account and finance inbox to watch (form below, ~2 minutes).',
            'We connect your daily reconciliation report — read-only access, your data stays yours.',
            'Your first "what happened" morning report lands in your inbox within 1 business day.',
        ],
        fields: [
            {
                id: 'stripeEmail',
                label: 'Email on your Stripe account *',
                placeholder: 'you@yourcompany.com',
                type: 'email',
                required: true,
            },
            {
                id: 'financeInbox',
                label: 'Finance inbox or forwarding alias to match receipts against',
                placeholder: 'receipts@yourcompany.com',
                type: 'text',
                required: false,
            },
            {
                id: 'monthlyVolume',
                label: 'Rough monthly Stripe volume',
                placeholder: 'e.g. $8,000 / ~150 payments',
                type: 'text',
                required: false,
            },
        ],
    },
};

const GENERIC_PRODUCT = {
    name: 'Your EB28 purchase',
    price: '',
    icon: <CheckCircle className="w-8 h-8 text-green-400" />,
    deliverySla: 'within 1 business day',
    steps: [
        'Confirm your details in the form below (~2 minutes).',
        'We prepare your setup based on what you ordered.',
        'Everything you need arrives in your inbox within 1 business day.',
    ],
    fields: [
        {
            id: 'orderNotes',
            label: 'What did you purchase, and anything we should know?',
            placeholder: 'Tell us about your order and your business...',
            type: 'textarea',
            required: false,
        },
    ],
};

export default function WelcomePage() {
    const productId = new URLSearchParams(window.location.search).get('p') || '';
    const product = PRODUCTS[productId] || GENERIC_PRODUCT;

    const [formData, setFormData] = useState({ name: '', email: '' });
    const [formStatus, setFormStatus] = useState('idle');
    const [formError, setFormError] = useState('');

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.name?.trim()) { setFormError('Please enter your name.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.email || '').trim())) {
            setFormError('Please enter a valid email address.'); return;
        }
        const missing = product.fields.find((f) => f.required && !String(formData[f.id] || '').trim());
        if (missing) { setFormError('Please fill in the required fields.'); return; }

        setFormStatus('submitting');
        try {
            await submitLeadCapture({
                ...formData,
                product: product.name,
                productId: productId || 'unknown',
                sourcePage: 'eb28.co/welcome',
                _subject: `[EB28 PAID ONBOARDING] ${product.name}`,
            });
            setFormStatus('success');
        } catch (err) {
            console.error('EB28 paid onboarding lead failed', err);
            setFormError('Something went wrong. Please try again.');
            setFormStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
            <main className="relative pt-20 pb-24 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -z-10"></div>

                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Confirmation header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
                            Payment received. You&rsquo;re in.
                        </h1>
                        <p className="text-xl text-slate-400">
                            {product.name}{product.price ? ` — ${product.price}` : ''}. Setup starts now — complete the
                            two-minute form below and everything else happens automatically.
                        </p>
                    </div>

                    {/* What happens next */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 mb-10 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-lg bg-slate-800">{product.icon}</div>
                            <h2 className="text-2xl font-bold text-white">What happens next</h2>
                        </div>
                        <ol className="space-y-4">
                            {product.steps.map((step, idx) => (
                                <li key={idx} className="flex items-start text-slate-300">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold mr-4 shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span className="leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-6 flex items-center text-sm text-slate-400">
                            <Clock className="w-4 h-4 mr-2 text-green-400" />
                            Delivery {product.deliverySla} of completing the form below.
                        </div>
                    </div>

                    {/* Onboarding intake */}
                    <div className="bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-800 shadow-2xl">
                        {formStatus === 'success' ? (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6">
                                    <Mail className="w-8 h-8 text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3">Onboarding started.</h2>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    Your setup is in the build queue. Watch your inbox — delivery {product.deliverySla}.
                                    You can reply to any email from us if something changes. Once your system is
                                    running, we&rsquo;ll check in — if it&rsquo;s working for you, we&rsquo;d love a
                                    short testimonial.
                                </p>
                                <a href="/" className="inline-flex items-center mt-8 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
                                    Back to eb28.co <ArrowRight className="w-4 h-4 ml-2" />
                                </a>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <h2 className="text-2xl font-bold text-white">Start your setup</h2>

                                {formError && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                                        {formError}
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="welcome-name" className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                                        <input id="welcome-name" name="name" autoComplete="name" type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label htmlFor="welcome-email" className="block text-sm font-medium text-slate-300 mb-2">Email used at checkout *</label>
                                        <input id="welcome-email" name="email" autoComplete="email" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="john@example.com" />
                                    </div>
                                </div>

                                {product.fields.map((field) => (
                                    <div key={field.id}>
                                        <label htmlFor={`welcome-${field.id}`} className="block text-sm font-medium text-slate-300 mb-2">{field.label}</label>
                                        {field.type === 'textarea' ? (
                                            <textarea id={`welcome-${field.id}`} name={field.id} rows="4" value={formData[field.id] || ''} onChange={(e) => updateField(field.id, e.target.value)} required={field.required} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder={field.placeholder}></textarea>
                                        ) : (
                                            <input id={`welcome-${field.id}`} name={field.id} type={field.type} value={formData[field.id] || ''} onChange={(e) => updateField(field.id, e.target.value)} required={field.required} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder={field.placeholder} />
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="submit"
                                    disabled={formStatus === 'submitting'}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg text-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {formStatus === 'submitting' ? 'Submitting...' : 'Start My Setup'}
                                    {formStatus !== 'submitting' && <ArrowRight className="ml-2 w-5 h-5" />}
                                </button>

                                <p className="text-center text-xs text-slate-500 flex items-center justify-center">
                                    <ShieldCheck className="w-4 h-4 mr-1 text-green-400" />
                                    Your details go straight into the build queue and nowhere else.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
