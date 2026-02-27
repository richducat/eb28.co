import React, { useState, useEffect } from 'react';
import {
  Code,
  Bot,
  Target,
  ArrowRight,
  CheckCircle,
  MapPin,
  Menu,
  X,
  Cpu,
  Zap,
  Users,
  ShieldCheck,
  TrendingUp,
  Clock
} from 'lucide-react';

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const products = [
    {
      id: 0,
      title: 'DIY Private AI Chatbot Setup',
      category: 'starter',
      price: '$10.00',
      description: 'Launch a live AI assistant fast. We configure your starter bot with your business context so you can test real conversations immediately.',
      features: ['Platform Setup Done-For-You', 'Prompt + Guardrail Configuration', 'Knowledge Source Connection'],
      icon: <Bot className="w-8 h-8 text-white" />,
      highlight: true
    },
    {
      id: 1,
      title: 'On-Premise LLM Infrastructure',
      category: 'infrastructure',
      price: 'Consultation Required',
      description: 'Run local models on your own business hardware so your client and operational data stays private, controlled, and compliant.',
      features: ['Hardware + GPU Planning', 'Local Model Deployment (Llama/Mistral)', 'Private API Endpoints for Your Team'],
      icon: <Cpu className="w-8 h-8 text-blue-500" />,
      highlight: false
    },
    {
      id: 2,
      title: 'EB28 Private Cloud AI Instance',
      category: 'cloud',
      price: 'Consultation Required',
      description: 'Need private AI without buying servers? We provision isolated cloud infrastructure through eb28.co with secure model hosting.',
      features: ['Dedicated Compute + Isolation', 'Encrypted Storage + Backups', 'Model Monitoring + Updates'],
      icon: <ShieldCheck className="w-8 h-8 text-purple-500" />,
      highlight: false
    },
    {
      id: 3,
      title: 'Private RAG Knowledge Base',
      category: 'systems',
      price: 'Consultation Required',
      description: 'Transform SOPs, docs, and customer history into a private AI knowledge layer your team can query in plain language.',
      features: ['Document + CRM Data Ingestion', 'Role-Based Access Controls', 'Source-Cited AI Answers'],
      icon: <Code className="w-8 h-8 text-green-500" />,
      highlight: false
    },
    {
      id: 4,
      title: 'Lead + Revenue Automation Engine',
      category: 'automation',
      price: 'Consultation Required',
      description: 'Connect ads, forms, CRM, and follow-up workflows into one AI-assisted pipeline designed to convert traffic into booked business.',
      features: ['Lead Qualification + Routing', 'Automated SMS/Email Follow-Up', 'Pipeline Visibility + Conversion Analytics'],
      icon: <TrendingUp className="w-8 h-8 text-orange-500" />,
      highlight: false
    },
    {
      id: 5,
      title: 'AI Workflow Modernization',
      category: 'operations',
      price: 'Consultation Required',
      description: 'Automate repetitive internal work across intake, quoting, onboarding, and service delivery with custom AI workflows.',
      features: ['Process Mapping + Automation Design', 'Custom Integrations Across Your Stack', 'Team Training + Operational Handoff'],
      icon: <Users className="w-8 h-8 text-red-500" />,
      highlight: false
    }
  ];

  const categories = [
    { id: 'all', label: 'All Solutions' },
    { id: 'starter', label: '$10 Starter' },
    { id: 'infrastructure', label: 'On-Prem LLMs' },
    { id: 'cloud', label: 'Private Cloud AI' },
    { id: 'systems', label: 'RAG Systems' },
    { id: 'automation', label: 'Revenue Automation' },
    { id: 'operations', label: 'Ops Automation' }
  ];

  const categoryTagLabels = {
    starter: 'starter',
    infrastructure: 'on-prem',
    cloud: 'private cloud',
    systems: 'rag',
    automation: 'revenue',
    operations: 'ops'
  };

  const filteredProducts = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                EB
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">EB 28</span>
            </div>

            <div className="hidden md:flex space-x-8 items-center">
              <button onClick={() => scrollToSection('services')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Expertise</button>
              <button onClick={() => scrollToSection('portfolio')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">AI Stack</button>
              <button onClick={() => scrollToSection('packages')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide text-blue-400">$10 Starter</button>
              <button onClick={() => scrollToSection('contact')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-blue-600/30">
                Book Infrastructure Call
              </button>
            </div>

            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="text-slate-300 hover:text-white"
                type="button"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700 shadow-xl">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button onClick={() => scrollToSection('services')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Expertise</button>
              <button onClick={() => scrollToSection('portfolio')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">AI Stack</button>
              <button onClick={() => scrollToSection('packages')} className="block w-full text-left px-3 py-3 text-blue-400 hover:bg-slate-700 rounded-md font-bold">$10 Starter</button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-3 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-bold mt-4">Book Infrastructure Call</button>
            </div>
          </div>
        )}
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 mb-8 backdrop-blur-md shadow-lg">
            <span className="flex h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">Private AI Infrastructure for Florida: Miami, Orlando, Tampa, Jacksonville</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Deploy Private AI. <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-300">Own Your Models. Grow Revenue.</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 leading-relaxed font-light">
            EB 28 builds secure AI systems for small businesses that need real outcomes, not generic prompts. Run LLMs on your own hardware or on private cloud infrastructure rented through eb28.co, then connect them to lead generation and revenue automation.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => scrollToSection('packages')} className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center transform hover:-translate-y-1">
              Start Private AI for $10 <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollToSection('contact')} className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center backdrop-blur-sm">
              Book AI Infrastructure Call
            </button>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">AI Infrastructure Built for Business Outcomes</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">From local model deployment to private cloud hosting and conversion automation, we build systems that reduce workload and increase booked revenue for Florida businesses.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-blue-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-blue-500/30">
                <Code className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">On-Prem AI + Local LLM Deployment</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">Deploy open-source models like <strong>Llama and Mistral</strong> on your own infrastructure. Keep sensitive customer and operational data private while giving your team AI capabilities internally.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-purple-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-purple-500/30">
                <Bot className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Private Cloud AI Hosting (eb28.co)</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">If you do not want to manage servers, we host your stack in an isolated private environment. You get secure model endpoints, monitoring, updates, and reliable performance.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-green-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-green-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-green-500/30">
                <Target className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Lead + Revenue Automation Systems</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">Your AI stack should produce revenue. We connect ads, funnels, CRM, onboarding, and follow-up so your operation qualifies, nurtures, and converts leads with less manual effort.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="portfolio" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Private AI Systems Marketplace</h2>
              <p className="text-slate-400 max-w-xl">Select your path: local infrastructure, private cloud, RAG knowledge systems, or full lead and revenue automation powered by secure AI workflows.</p>
            </div>
            <div className="mt-6 md:mt-0 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
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
                    <div className={`p-3 rounded-lg transition-colors ${item.highlight ? 'bg-blue-600' : 'bg-slate-800 group-hover:bg-slate-700'}`}>{item.icon}</div>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${item.highlight ? 'bg-white text-blue-900 border-white' : 'bg-blue-900/30 text-blue-400 border-blue-800/50'}`}>
                      {categoryTagLabels[item.category] || item.category}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 line-clamp-2">{item.description}</p>

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
                  <button
                    onClick={() => scrollToSection('contact')}
                    className={`${item.highlight ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/50' : 'bg-white text-slate-900 hover:bg-blue-50'} px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center`}
                  >
                    {item.highlight ? 'Get Started' : 'Book Call'} <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="py-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Engagement Paths</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Start with the $10 proof-of-concept, then scale into private AI infrastructure and revenue automation through consultation.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-400 relative flex flex-col transform md:-translate-y-4 shadow-2xl shadow-blue-500/30 order-first lg:order-none z-20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-blue-900 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full border border-blue-200">Limited Offer</div>
              <h3 className="text-xl font-bold text-white mb-2">$10 AI Starter Setup</h3>
              <div className="text-5xl font-extrabold text-white mb-6">$10<span className="text-lg text-blue-200 font-normal">/one-time</span></div>
              <p className="text-blue-100 text-sm mb-6 font-medium">Validate the opportunity fast. We launch your first private-ready AI assistant foundation and show you how to use it in your lead flow.</p>
              <div className="bg-blue-900/30 rounded-lg p-4 mb-6 border border-blue-400/30">
                <p className="text-xs text-blue-100 uppercase tracking-wider font-bold mb-2">What You Get:</p>
                <ul className="space-y-3">
                  {['Done-for-you starter bot provisioning', 'Prompt + safety baseline', 'One business knowledge source linked', 'Quick-start training video'].map((feature) => (
                    <li key={feature} className="flex items-start text-white text-sm">
                      <CheckCircle className="w-5 h-5 text-green-300 mr-2 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => scrollToSection('contact')} className="w-full py-4 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg text-lg">
                Claim $10 Starter
              </button>
              <p className="text-center text-xs text-blue-200 mt-3">Typical delivery: within 24 hours.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col lg:order-first">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Private Infrastructure Build</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-500 font-normal">/First</span></div>
              <p className="text-slate-400 text-sm mb-8">For businesses deploying local LLMs or private cloud AI with strict data control requirements.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>On-prem hardware + model architecture</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Private cloud deployment via eb28.co</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>RAG and secure internal knowledge systems</span></li>
              </ul>
              <button onClick={() => scrollToSection('contact')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">Book Infrastructure Call</button>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Revenue Automation Partnership</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-500 font-normal">/First</span></div>
              <p className="text-slate-400 text-sm mb-8">For teams that want private AI connected directly to growth systems and client acquisition flows.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Lead capture, qualification, and follow-up automation</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>AI-assisted onboarding and service workflows</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Continuous optimization with reporting and iteration</span></li>
              </ul>
              <button onClick={() => scrollToSection('contact')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">Plan My Build</button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-950 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Why Florida Businesses Choose Private AI with EB 28</h2>
            <p className="text-slate-400 max-w-3xl mx-auto">Public AI tools are useful, but they are not built around your business model, your data boundaries, or your revenue goals. EB 28 builds AI infrastructure you can control and scale.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800">
              <ShieldCheck className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Data Control</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Deploy on your own servers or in isolated private cloud to keep customer records, SOPs, and internal docs out of shared public AI environments.</p>
            </div>
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800">
              <Clock className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Operational Speed</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Automate repetitive tasks across intake, support, and delivery so your team spends less time on admin work and more time on high-value execution.</p>
            </div>
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800">
              <TrendingUp className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Revenue Alignment</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Every system is built around lead quality, conversion rate, and client lifetime value so AI is tied directly to measurable business growth.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-800 shadow-2xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">Plan Your Private AI Rollout.</h2>
              <p className="text-slate-400">Tell us your goals and current stack. We reply to Florida-based inquiries within 2 business hours.</p>
            </div>

            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Name</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Phone (SMS Enabled)</label>
                  <input type="tel" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="(555) 000-0000" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input type="email" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="john@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">I want to...</label>
                <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                  <option value="10-dollar-bot">🔥 Buy the $10 Private AI Starter Setup</option>
                  <option value="on-prem">Deploy On-Premise LLM Infrastructure</option>
                  <option value="private-cloud">Launch a Private Cloud AI Instance (eb28.co)</option>
                  <option value="revenue-automation">Build Lead + Revenue Automation Systems</option>
                  <option value="consultation">Book a Full AI Strategy Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Project Details</label>
                <textarea rows="4" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Share your industry, current software/tools, and where you want AI to reduce workload or increase client generation..."></textarea>
              </div>

              <button type="button" className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg text-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center group">
                Request Consultation <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <span className="text-2xl font-bold text-white block mb-4">EB 28</span>
              <p className="text-slate-500 max-w-sm mb-4 leading-relaxed">EB 28 builds private AI infrastructure and revenue automation systems for Florida small businesses. We deploy local LLMs, private cloud AI instances, and custom lead generation workflows that reduce manual workload and accelerate growth.</p>
              <div className="flex items-center text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Headquartered in Florida, USA</span>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Core Services</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">On-Premise LLM Deployment</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Private Cloud AI Hosting</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">RAG Knowledge Systems</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Lead + Revenue Automation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">About EB 28</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Book Consultation</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy & Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-600 text-sm text-center md:text-left">&copy; {new Date().getFullYear()} EB 28. All rights reserved. | Built for Speed & Conversion.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
