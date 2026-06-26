import React, { Suspense, lazy, useState, useEffect } from 'react';
import {
  Rocket,
  Code,
  Bot,
  Target,
  ArrowRight,
  CheckCircle,
  MapPin,
  Menu,
  X,
  Cpu,
  BarChart,
  Globe,
  Zap,
  Users,
  ShieldCheck,
  TrendingUp,
  Clock,
  Server,
  Database,
  Lock,
  Cloud,
  HardDrive
} from 'lucide-react';

import { useCheckoutConfig, checkoutUrlFor } from './useCheckoutConfig.js';
import OnboardingQuiz from './components/OnboardingQuiz.jsx';

const LiveAgentDemo = lazy(() => import('./components/LiveAgentDemo'));

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  // Product the visitor was viewing when they clicked a quote CTA; the
  // onboarding quiz includes it in the lead submission.
  const [interestedIn, setInterestedIn] = useState('');
  // Stripe Payment Link URLs from /checkout-config.json. Buy buttons activate
  // automatically when a URL is configured; otherwise CTAs fall back to the form.
  const checkoutProducts = useCheckoutConfig();
  const diyCheckoutUrl = checkoutUrlFor(checkoutProducts, 'diy-ai-foundation');
  const whiteGloveCheckoutUrl = checkoutUrlFor(checkoutProducts, 'white-glove-onboarding');
  // Real customer quotes from /testimonials-config.json. The section stays
  // hidden until real testimonials exist — never ship invented ones.
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/testimonials-config.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.testimonials)) {
          setTestimonials(payload.testimonials.filter((t) => t?.quote));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // --- DATA: PORTFOLIO / PRODUCTS ---
  const products = [
    {
      id: 'recon-agent-beta',
      title: "Recon Agent Founder Beta",
      category: "revenue",
      price: "$17/mo",
      description: "A simple morning check for Stripe. See what matched, what looks off, and what needs a quick review.",
      features: ["Daily summary", "Find payout problems fast", "Founder onboarding support"],
      icon: <BarChart className="w-8 h-8 text-cyan-300" />,
      highlight: false,
      ctaHref: "/reconcile/",
      ctaLabel: "See Founder Beta"
    },
    {
      id: 0,
      title: "DIY AI Foundation Build",
      category: "ai-agents",
      price: "$10.00",
      description: "Try us for $10. We set up a working AI agent around one task in your business — secure account, your data linked, custom prompt — delivered to your inbox within 24 hours.",
      features: ["Secure Account Setup", "Basic Knowledge Base Link", "Custom System Prompt"],
      icon: <Bot className="w-8 h-8 text-white" />,
      highlight: true,
      checkoutId: 'diy-ai-foundation',
      serviceValue: '10-dollar-bot'
    },
    {
      id: 'white-glove-onboarding',
      title: "White-Glove Onboarding",
      category: "ai-agents",
      price: "$1,000",
      description: "Skip the learning curve — we set the whole system up for you. AI agent, knowledge base, and lead capture wired into your business and handed over working.",
      features: ["Fully configured on your data", "Connected to your existing tools", "1:1 kickoff + 30 days of adjustments"],
      icon: <Rocket className="w-8 h-8 text-amber-400" />,
      highlight: false,
      checkoutId: 'white-glove-onboarding',
      serviceValue: 'white-glove'
    },
    {
      id: 1,
      title: "On-Premise LLM Server",
      category: "infrastructure",
      price: "Custom Quote",
      description: "Your own private ChatGPT-style AI, running on hardware you own. Nothing leaves your building — your client data stays yours, even with the internet off.",
      features: ["Hardware Spec & Setup", "Local Model Deployment", "Offline Capability"],
      icon: <Server className="w-8 h-8 text-blue-500" />,
      highlight: false,
      serviceValue: 'on-prem'
    },
    {
      id: 2,
      title: "eb28.co Cloud AI Hosting",
      category: "infrastructure",
      price: "Custom Quote",
      description: "All the privacy of your own AI without buying hardware. We host your models on dedicated, secured eb28.co instances and handle the maintenance.",
      features: ["High-Performance Compute", "Encrypted Data Pipelines", "Managed Maintenance"],
      icon: <Cloud className="w-8 h-8 text-purple-500" />,
      highlight: false,
      serviceValue: 'cloud'
    },
    {
      id: 3,
      title: "Local RAG Knowledge Base",
      category: "ai-agents",
      price: "Custom Quote",
      description: "An AI that has actually read your documents. Ask questions of your SOPs, client histories, and files — privately, on your own infrastructure.",
      features: ["Vector Database Setup", "Semantic Search Integration", "Role-Based Access"],
      icon: <Database className="w-8 h-8 text-green-500" />,
      highlight: false,
      serviceValue: 'rag'
    },
    {
      id: 4,
      title: "Automated Client Gen Matrix",
      category: "revenue",
      price: "Custom Quote",
      description: "A lead machine that never sleeps. Captures high-intent leads, qualifies them with AI, and follows up automatically through your CRM.",
      features: ["AI Lead Qualification", "Dynamic Email Sequences", "Florida Market SEO"],
      icon: <Users className="w-8 h-8 text-orange-500" />,
      highlight: false,
      serviceValue: 'revenue'
    },
    {
      id: 5,
      title: "Ad-to-AI Conversion Funnel",
      category: "revenue",
      price: "Custom Quote",
      description: "We run the ads, an AI agent answers every click instantly, qualifies the buyer, and books the deal — so paid traffic never waits on a human.",
      features: ["Paid Media Management", "Instant AI Response", "ROAS Analytics"],
      icon: <Target className="w-8 h-8 text-red-500" />,
      highlight: false,
      serviceValue: 'revenue'
    }
  ];

  const portfolioProjects = [
    {
      id: 'tool-reconcile',
      title: "Recon Agent",
      type: "Founder Beta",
      url: "/reconcile/",
      description: "Catches Stripe payout problems before your accountant does. Daily plain-English reports for $17/mo."
    },
    {
      id: 'tool-appbuilder',
      title: "EB28 App Builder",
      type: "AI Builder",
      url: "/appbuilder/",
      description: "Turns an app idea into sharper concepts, visuals, and production-ready source. Try it free."
    },
    {
      id: 'tool-fundmanager',
      title: "Fund Manager Live",
      type: "Live Dashboard",
      url: "/fundmanager/",
      description: "A live portfolio dashboard watching real positions around the clock — proof our agents run for real."
    },
    {
      id: 'tool-deskos',
      title: "Desk OS — Trading Agents",
      type: "Agent System",
      url: "/deskos/",
      description: "Eight prediction-market trading agents behind a gated runner, kill switch, and capital guard."
    },
    {
      id: 0,
      title: "Tesla Helper App",
      type: "Utility App",
      url: "https://teslahelper.app"
    },
    {
      id: 3,
      title: "FC Street",
      type: "Web Game",
      url: "https://fc-street.vercel.app/"
    },
    {
      id: 6,
      title: "Veteran Claim App",
      type: "Claims Platform",
      url: "https://tyfys.net/app"
    },
    {
      id: 7,
      title: "Toby AI + Lab App",
      type: "AI Fitness App",
      url: "https://app.labstudio.fit"
    },
    {
      id: 8,
      title: "VoltGuard",
      type: "Business Website",
      url: "https://voltguard.homes/#services"
    },
    {
      id: 9,
      title: "Daily Disspatch",
      type: "Content Website",
      url: "https://dailydisspatch.com"
    },
    {
      id: 10,
      title: "Best Deals Online",
      type: "Ecommerce Website",
      url: "https://bestdealsonline.us/"
    },
    {
      id: 11,
      title: "Best Mobile VPN",
      type: "Affiliate Website",
      url: "https://www.bestmobilevpn.net/"
    }
  ];

  const categories = [
    { id: 'all', label: 'All Systems' },
    { id: 'infrastructure', label: 'Private Infrastructure' },
    { id: 'ai-agents', label: 'Custom LLMs & Agents' },
    { id: 'revenue', label: 'Revenue & Lead Gen' }
  ];

  const seoArticles = [
    {
      title: 'AI Receptionist for Local Business',
      href: '/blog/ai-receptionist-for-local-business-what-to-automate-and-what-to-keep-human/',
      cluster: 'Lead automation',
      description: 'What to automate, what to keep human, and how to stop ready buyers from going cold.'
    },
    {
      title: 'Website Audit Checklist for Melbourne FL',
      href: '/blog/website-audit-checklist-for-melbourne-fl-businesses-losing-leads/',
      cluster: 'Conversion',
      description: 'A practical lead-leak checklist for local businesses that need more calls from the traffic they already have.'
    },
    {
      title: 'Best Website Builder in Melbourne FL',
      href: '/blog/best-website-builder-in-melbourne-fl-what-local-companies-should-look-for/',
      cluster: 'Melbourne web design',
      description: 'What local companies should look for before trusting a website builder with their first impression.'
    },
    {
      title: 'How to Rank in the Melbourne FL Map Pack',
      href: '/blog/how-to-rank-in-the-melbourne-fl-map-pack-without-spammy-seo/',
      cluster: 'Local SEO',
      description: 'How profile signals, website content, reviews, and citations work together without spammy SEO.'
    },
    {
      title: 'Website Conversion Checklist for Melbourne FL',
      href: '/blog/website-conversion-checklist-melbourne-fl/',
      cluster: 'Conversion',
      description: 'The homepage, proof, CTA, and follow-up fixes that help local traffic become real enquiries.'
    }
  ];

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  // Remember which product the visitor was viewing, then take them into the
  // onboarding quiz; the quiz tags the submission with it.
  const goToContactFor = (serviceValue) => {
    if (serviceValue) {
      setInterestedIn(serviceValue);
    }
    scrollToSection('contact');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">

      {/* --- NAVIGATION --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                EB
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">EB 28</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8 items-center">
              <button onClick={() => scrollToSection('services')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Infrastructure</button>
              <button onClick={() => scrollToSection('portfolio')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Portfolio</button>
              <button onClick={() => scrollToSection('deployments')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Deployments</button>
              <a href="/blog/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Blog</a>
              <a href="/melbournewebstudio/#quiz" className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Melbourne Studio</a>
              <a href="/reconcile/" className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-medium uppercase tracking-wide">Recon Agent</a>
              <button onClick={() => scrollToSection('packages')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide text-blue-400">$10 AI Offer</button>
              <button onClick={() => scrollToSection('contact')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-blue-600/30">
                Architect Your System
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="text-slate-300 hover:text-white"
                aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-navigation"
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div id="mobile-navigation" className="md:hidden bg-slate-800 border-b border-slate-700 shadow-xl">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button onClick={() => scrollToSection('services')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Infrastructure</button>
              <button onClick={() => scrollToSection('portfolio')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Portfolio</button>
              <button onClick={() => scrollToSection('deployments')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Deployments</button>
              <a href="/blog/" className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Blog</a>
              <a href="/melbournewebstudio/#quiz" className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Melbourne Studio</a>
              <a href="/reconcile/" className="block w-full text-left px-3 py-3 text-cyan-300 hover:bg-slate-700 rounded-md font-bold">Recon Agent Founder Beta</a>
              <button onClick={() => scrollToSection('packages')} className="block w-full text-left px-3 py-3 text-blue-400 hover:bg-slate-700 rounded-md font-bold">$10 AI Offer</button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-3 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-bold mt-4">Architect Your System</button>
            </div>
          </div>
        )}
      </nav>

      <main id="main-content">
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 -z-20">
          <img
            src="/images/hero_bg_app.png"
            alt=""
            width="1600"
            height="900"
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 mb-8 backdrop-blur-md shadow-lg">
            <span className="flex h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">eb28.co | Private AI Infrastructure</span>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/melbournewebstudio/#quiz" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/15">
              Free website build + $98/mo Growth Hosting <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/reconcile/" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/15">
              New founder beta: Recon Agent at $17/mo <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Top App Development &amp; <br className="hidden md:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-300">
              Website Builder Near Me.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 leading-relaxed font-light">
            EB 28 is the premier app development and website builder near me in Melbourne, FL. We engineer secure, high-performance apps and automated platforms to scale your local operations and drive targeted client generation.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4">
            <a href="/melbournewebstudio/#quiz" className="group px-8 py-4 bg-white hover:bg-blue-50 text-slate-950 rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center transform hover:-translate-y-1">
              Claim Free Website Build <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            {diyCheckoutUrl ? (
              <a href={diyCheckoutUrl} className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center transform hover:-translate-y-1">
                Start Your AI Core for $10 <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            ) : (
              <button onClick={() => scrollToSection('packages')} className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center transform hover:-translate-y-1">
                Start Your AI Core for $10 <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            <button onClick={() => scrollToSection('contact')} className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center backdrop-blur-sm">
              Consult on Infrastructure
            </button>
          </div>

          <div className="mt-16">
            <Suspense
              fallback={
                <div
                  className="mx-auto h-[220px] max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-blue-950/20"
                  aria-hidden="true"
                />
              }
            >
              <LiveAgentDemo scrollToSection={scrollToSection} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* --- PROOF BAR --- */}
      <section className="py-12 bg-slate-950 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-extrabold text-white mb-1">12</p>
              <p className="text-slate-400 text-sm">Live products & client sites — every one clickable below, no mockups</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-white mb-1">2<span className="text-xl text-slate-400">/day</span></p>
              <p className="text-slate-400 text-sm">Guides published by our own automation — the same systems we sell</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-white mb-1">24<span className="text-xl text-slate-400">h</span></p>
              <p className="text-slate-400 text-sm">From $10 checkout to a working AI agent in your inbox</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-white mb-1">7<span className="text-xl text-slate-400">days</span></p>
              <p className="text-slate-400 text-sm">From white-glove checkout to a fully installed system</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICES SECTION (SEO & AI INFRA RICH) --- */}
      <section id="services" className="py-20 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Strategic Artificial Intelligence</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Public AI leaks your company secrets. We build military-grade, localized intelligence ecosystems that protect your data while scaling your output.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="relative p-8 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-blue-500/50 transition-all hover:bg-slate-800/80 group overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="absolute inset-0 -z-10">
                <img src="/images/service_llm_infra.png" alt="" width="640" height="420" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="w-14 h-14 bg-blue-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-blue-500/30 backdrop-blur-md">
                <HardDrive className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Private LLM Infrastructure</h3>
              <p className="text-slate-300 mb-4 text-sm leading-relaxed">
                Run powerful, customized open-source models directly from <strong>your own local hardware</strong> or our highly secure <strong>eb28.co cloud servers</strong>. Total privacy for your internal operations and data.
              </p>
            </div>

            {/* Service 2 */}
            <div className="relative p-8 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 transition-all hover:bg-slate-800/80 group overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="absolute inset-0 -z-10">
                <img src="/images/service_ai_agents.png" alt="" width="640" height="420" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="w-14 h-14 bg-purple-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-purple-500/30 backdrop-blur-md">
                <Cpu className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Custom AI Agents & RAG</h3>
              <p className="text-slate-300 mb-4 text-sm leading-relaxed">
                We develop strategic AI agents that actually know your business. By integrating <strong>Local RAG (Retrieval-Augmented Generation)</strong>, your AI can securely chat with your private SOPs, CRM records, and company documents.
              </p>
            </div>

            {/* Service 3 */}
            <div className="relative p-8 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-green-500/50 transition-all hover:bg-slate-800/80 group overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="absolute inset-0 -z-10">
                <img src="/images/service_revenue.png" alt="" width="640" height="420" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="w-14 h-14 bg-green-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-green-500/30 backdrop-blur-md">
                <TrendingUp className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Revenue & Lead Automation</h3>
              <p className="text-slate-300 mb-4 text-sm leading-relaxed">
                AI is useless if it doesn't make money. We fuse our custom intelligence builds with <strong>high-intent paid media and automated customer journeys</strong> to flood your business with qualified leads and seamless onboarding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- WHY CHOOSE EB 28 (SEO BLOCK) --- */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-2">The EB 28 Advantage</h3>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Deep Tech Meets Client Generation.</h2>
              <div className="space-y-6">
                <div className="flex">
                  <div className="mr-4 mt-1"><Lock className="text-green-400 w-6 h-6" /></div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Absolute Data Sovereignty</h3>
                    <p className="text-slate-400 text-sm">Stop feeding ChatGPT your client lists and financial data. We build air-gapped and secure-cloud systems where your proprietary data remains entirely yours.</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="mr-4 mt-1"><Server className="text-blue-400 w-6 h-6" /></div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Hardware & Cloud Flexibility</h3>
                    <p className="text-slate-400 text-sm">You choose the deployment. Run AI locally on your own business hardware, or rent highly scalable, secure GPU infrastructure directly from <strong>eb28.co</strong>.</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="mr-4 mt-1"><ShieldCheck className="text-purple-400 w-6 h-6" /></div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Revenue-Driven Architecture</h3>
                    <p className="text-slate-400 text-sm">Our deployments aren't just parlor tricks. They are systematically engineered to capture leads, convert traffic, and automate onboarding workflows.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur-[80px] opacity-20 rounded-full"></div>

              <div className="relative z-0 mb-6 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl group">
                <img src="/images/advantage_security.png" alt="Secure private AI infrastructure interface" width="960" height="640" loading="lazy" decoding="async" className="w-full h-auto object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
              </div>

              <div className="relative bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl -mt-20 z-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-medium">Data Leakage to Big Tech</span>
                    <span className="text-green-400 font-bold">0%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-medium">Custom Process Automation</span>
                    <span className="text-blue-400 font-bold">99%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-medium">Lead Gen Systems</span>
                    <span className="text-purple-400 font-bold text-sm">Always Active</span>
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-4 italic">Tailor-fit for small businesses scaling in Florida and nationwide.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- ORGANIC GROWTH LIBRARY --- */}
      <section id="resources" className="py-20 bg-slate-900 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-2">Organic Growth Library</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Search pages built to compound.</h2>
              <p className="text-slate-400 max-w-2xl">
                These guides support the highest-intent EB28 clusters and create internal links from the homepage into newer pages that need ranking momentum.
              </p>
            </div>
            <a href="/blog/" className="inline-flex items-center justify-center px-5 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-blue-50 transition-colors">
              View Blog <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {seoArticles.map((article) => (
              <a
                key={article.href}
                href={article.href}
                className="group block rounded-2xl border border-slate-800 bg-slate-950 p-6 hover:border-blue-500/60 hover:bg-slate-800/70 transition-all"
              >
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {article.cluster}
                </span>
                <h3 className="mt-5 text-xl font-bold text-white">{article.title}</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{article.description}</p>
                <div className="mt-5 inline-flex items-center text-blue-400 font-semibold text-sm">
                  Read Guide <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- LIVE APP PORTFOLIO --- */}
      <section id="portfolio" className="py-20 bg-slate-950 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Live App Portfolio</h2>
            <p className="text-slate-400 max-w-3xl mx-auto">
              Direct access to the apps, websites, and games we have been building. Every project is live so clients can experience the execution quality firsthand.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioProjects.map((project) => {
              const isExternal = project.url.startsWith('http');

              return (
              <a
                key={project.id}
                href={project.url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="group block rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-500/60 hover:bg-slate-800/70 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {project.type}
                  </span>
                  <Globe className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{project.title}</h3>
                {project.description ? (
                  <p className="text-slate-400 text-sm leading-relaxed">{project.description}</p>
                ) : (
                  <p className="text-slate-400 text-sm break-all">{project.url}</p>
                )}
                <div className="mt-5 inline-flex items-center text-blue-400 font-semibold text-sm">
                  Open Project <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- MARKETPLACE SECTION --- */}
      <section id="deployments" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Infrastructure & Deployments</h2>
              <p className="text-slate-400 max-w-xl">
                From local server builds to revenue-generating ad funnels, explore the architectures we build for our partners.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="mt-6 md:mt-0 flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((item) => (
              <div key={item.id} className={`group bg-slate-900 rounded-2xl border ${item.highlight ? 'border-blue-500 shadow-blue-500/20 shadow-xl ring-1 ring-blue-500/20' : 'border-slate-800'} overflow-hidden hover:border-slate-600 transition-all hover:shadow-2xl flex flex-col`}>
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-lg transition-colors ${item.highlight ? 'bg-blue-600' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                      {item.icon}
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${item.highlight ? 'bg-white text-blue-900 border-white' : 'bg-blue-900/30 text-blue-400 border-blue-800/50'}`}>
                      {item.category.replace('-', ' ')}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 line-clamp-3">{item.description}</p>

                  <div className="space-y-2 mb-6">
                    {item.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center text-sm text-slate-300">
                        <Zap className={`w-3 h-3 mr-2 ${item.highlight ? 'text-white' : 'text-yellow-500'}`} />
                        {feat}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
                  <span className={`text-2xl font-bold ${item.highlight ? 'text-blue-400' : 'text-white'}`}>{item.price}</span>
                  {item.ctaHref ? (
                    <a href={item.ctaHref} className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm hover:bg-cyan-50 transition-colors flex items-center">
                      {item.ctaLabel || 'Open'} <ArrowRight className="w-4 h-4 ml-1" />
                    </a>
                  ) : item.checkoutId && checkoutUrlFor(checkoutProducts, item.checkoutId) ? (
                    <a href={checkoutUrlFor(checkoutProducts, item.checkoutId)} className="px-4 py-2 bg-blue-700 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors flex items-center shadow-lg shadow-blue-700/40">
                      Buy Now <ArrowRight className="w-4 h-4 ml-1" />
                    </a>
                  ) : item.highlight ? (
                     <button onClick={() => goToContactFor(item.serviceValue)} className="px-4 py-2 bg-blue-700 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors flex items-center shadow-lg shadow-blue-700/40">
                     Build It <ArrowRight className="w-4 h-4 ml-1" />
                   </button>
                  ) : (
                    <button onClick={() => goToContactFor(item.serviceValue)} className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center">
                      Get Quote <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS (renders only when real quotes exist in config) --- */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-20 bg-slate-950 border-y border-slate-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Real customers. Real words.</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Unedited feedback from people who bought, paid, and got their system delivered.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <figure key={idx} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col">
                  <blockquote className="text-slate-200 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-5 pt-4 border-t border-slate-800">
                    <span className="block text-white font-bold">{t.name}</span>
                    {t.role && <span className="block text-slate-400 text-sm">{t.role}</span>}
                    {t.product && (
                      <span className="inline-flex items-center mt-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {t.product}
                      </span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- PACKAGES SECTION (HIGH INTENT) --- */}
      <section id="packages" className="py-20 bg-slate-900 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Deployment Models</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Start with a low-risk proof of concept or engage us to architect your entire private intelligence and revenue ecosystem.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* DIY (The $10 Offer) */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-400 relative flex flex-col transform md:-translate-y-4 shadow-2xl shadow-blue-500/30 order-first lg:order-none z-20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-blue-900 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full border border-blue-200">Proof of Concept</div>

              <h3 className="text-xl font-bold text-white mb-2">AI Agent Foundation</h3>
              <div className="text-5xl font-extrabold text-white mb-6">$10<span className="text-lg text-blue-200 font-normal">/one-time</span></div>
              <p className="text-blue-100 text-sm mb-6 font-medium">
                The perfect entry point. I will personally set up a foundational AI logic agent to prove how custom prompts and data linkage can automate your tasks.
              </p>

              <div className="bg-blue-900/30 rounded-lg p-4 mb-6 border border-blue-400/30">
                <p className="text-xs text-blue-100 uppercase tracking-wider font-bold mb-2">What's Included:</p>
                <ul className="space-y-3">
                  <li className="flex items-start text-white text-sm">
                    <CheckCircle className="w-5 h-5 text-green-300 mr-2 shrink-0" />
                    <span>Secure Account Architecture</span>
                  </li>
                  <li className="flex items-start text-white text-sm">
                    <CheckCircle className="w-5 h-5 text-green-300 mr-2 shrink-0" />
                    <span>Basic Local Data Linkage</span>
                  </li>
                  <li className="flex items-start text-white text-sm">
                    <CheckCircle className="w-5 h-5 text-green-300 mr-2 shrink-0" />
                    <span>1 Custom Strategic Prompt</span>
                  </li>
                  <li className="flex items-start text-white text-sm">
                    <CheckCircle className="w-5 h-5 text-green-300 mr-2 shrink-0" />
                    <span>System Integration Guide</span>
                  </li>
                </ul>
              </div>

              {diyCheckoutUrl ? (
                <a href={diyCheckoutUrl} className="block w-full py-4 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg text-lg text-center">
                  Buy Now — $10
                </a>
              ) : (
                <button onClick={() => goToContactFor('10-dollar-bot')} className="w-full py-4 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg text-lg">
                  Build Prototype for $10
                </button>
              )}
              <p className="text-center text-xs text-blue-200 mt-3">
                {diyCheckoutUrl ? 'Secure Stripe checkout. Setup starts the moment you pay.' : 'Delivered securely within 24 hours.'}
              </p>
            </div>

            {/* White-Glove Onboarding */}
            <div className="p-8 rounded-2xl bg-slate-800 border border-amber-400/40 flex flex-col lg:order-first">
              <h3 className="text-xl font-medium text-amber-300 mb-2">White-Glove Onboarding</h3>
              <div className="text-3xl font-bold text-white mb-6">$1,000<span className="text-lg text-slate-300 font-normal">/one-time</span></div>
              <p className="text-slate-400 text-sm mb-8">We set the entire system up for you. Nothing to learn, nothing to configure — you get the keys to a working machine.</p>

              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-amber-400 mr-3 shrink-0" />
                  <span>Full AI agent + knowledge base built on your data</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-amber-400 mr-3 shrink-0" />
                  <span>Lead capture wired to your site, inbox, and CRM</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-amber-400 mr-3 shrink-0" />
                  <span>1:1 kickoff and handoff — live within 7 days</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-amber-400 mr-3 shrink-0" />
                  <span>30 days of included adjustments</span>
                </li>
              </ul>

              {whiteGloveCheckoutUrl ? (
                <a href={whiteGloveCheckoutUrl} className="block w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg font-bold transition-colors text-center">Buy Now — $1,000</a>
              ) : (
                <button onClick={() => goToContactFor('white-glove')} className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg font-bold transition-colors">Get Set Up For Me</button>
              )}
            </div>

            {/* The Ecosystem */}
            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col">
              <h3 className="text-xl font-medium text-slate-300 mb-2">The Revenue Ecosystem</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-300 font-normal">/First</span></div>
              <p className="text-slate-400 text-sm mb-8">We tie your private AI directly to client generation and lead conversion.</p>

              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <span>Custom AI Sales Agents</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <span>Paid Media & Ad Spend Management</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <span>Automated CRM Onboarding Flows</span>
                </li>
              </ul>

              <button onClick={() => scrollToSection('contact')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">Architect Revenue</button>
            </div>
          </div>
        </div>
      </section>

      {/* --- LEAD CAPTURE SECTION --- */}
      <section id="contact" className="py-20 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-800 shadow-2xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">Find your machine in 60 seconds.</h2>
              <p className="text-slate-400">
                Three quick questions — each answer teaches you something about how this works.
                You end with a plan, a price, and the first step. No sales pressure.
              </p>
            </div>

            <OnboardingQuiz checkoutProducts={checkoutProducts} interestedIn={interestedIn} />
          </div>
        </div>
      </section>
      </main>

      {/* --- FOOTER (SEO OPTIMIZED) --- */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">Footer navigation</h2>
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <span className="text-2xl font-bold text-white block mb-4">EB 28 | eb28.co</span>
              <p className="text-slate-400 max-w-sm mb-4 leading-relaxed">
                EB 28 builds <strong>Private AI Infrastructure</strong> for small businesses. Whether you need on-premise open-source LLMs, secure cloud hosting via eb28.co, or high-intent revenue automation, we engineer the systems that scale your operations.
              </p>
              <div className="flex items-center text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Serving Melbourne, FL & National Markets</span>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Infrastructure</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#services" className="hover:text-blue-400 transition-colors">On-Premise Server Builds</a></li>
                <li><a href="#deployments" className="hover:text-blue-400 transition-colors">eb28.co Cloud Hosting</a></li>
                <li><a href="/appbuilder/" className="hover:text-blue-400 transition-colors">EB28 App Builder</a></li>
                <li><a href="/fundmanager/" className="hover:text-blue-400 transition-colors">Fund Manager Live</a></li>
                <li><a href="/deskos/" className="hover:text-blue-400 transition-colors">Desk OS</a></li>
                <li><a href="/blog/private-ai-infrastructure-small-business/" className="hover:text-blue-400 transition-colors">Private AI Guide</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Agency</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#portfolio" className="hover:text-blue-400 transition-colors">Live Portfolio</a></li>
                <li><a href="#packages" className="hover:text-blue-400 transition-colors">$10 Proof of Concept</a></li>
                <li><a href="#services" className="hover:text-blue-400 transition-colors">Security & Privacy</a></li>
                <li><a href="/blog/" className="hover:text-blue-400 transition-colors">Organic Growth Blog</a></li>
                <li><a href="/blog/local-seo-map-pack-melbourne-fl/" className="hover:text-blue-400 transition-colors">Local SEO Checklist</a></li>
                <li><a href="#contact" className="hover:text-blue-400 transition-colors">Consultation Intake</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} EB 28. All rights reserved. | Private AI & Revenue Architecture.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
               <div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
               </div>
               <div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
