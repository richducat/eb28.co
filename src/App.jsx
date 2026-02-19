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
  BarChart,
  Globe,
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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const products = [
    {
      id: 0,
      title: 'DIY AI Chatbot Foundation',
      category: 'ai',
      price: '$10.00',
      description: 'STOP missing calls. I will personally configure the core architecture of your 24/7 AI sales agent.',
      features: ['Instant Account Setup', 'Knowledge Base Linking', 'Response Logic Training'],
      icon: <Bot className="w-8 h-8 text-white" />,
      highlight: true
    },
    {
      id: 1,
      title: 'Automated Onboarding Suite',
      category: 'systems',
      price: 'Custom Quote',
      description: 'Eliminate manual data entry. A complete customer journey flow that handles 99% of intake automatically.',
      features: ['Digital Smart Forms', 'Instant CRM Sync', 'Auto-Email Nurture'],
      icon: <Users className="w-8 h-8 text-blue-500" />,
      highlight: false
    },
    {
      id: 2,
      title: 'Enterprise AI Sales Agent',
      category: 'ai',
      price: 'Custom Quote',
      description: 'A custom-trained LLM that knows your inventory, answers FAQs, and books appointments while you sleep.',
      features: ['Natural Language Processing', 'Calendar Integration', 'Sentiment Analysis'],
      icon: <Cpu className="w-8 h-8 text-purple-500" />,
      highlight: false
    },
    {
      id: 3,
      title: 'E-Com Florida Analytics',
      category: 'apps',
      price: 'Custom Quote',
      description: 'High-performance analytics dashboard for tracking ad spend vs. revenue in real-time.',
      features: ['Real-time ROAS Tracking', 'Visual Data Graphs', 'One-Click Export'],
      icon: <BarChart className="w-8 h-8 text-green-500" />,
      highlight: false
    },
    {
      id: 4,
      title: 'High-Intent Lead Gen Sites',
      category: 'websites',
      price: 'Custom Quote',
      description: 'SEO-optimized landing pages designed specifically to dominate Florida real estate & service markets.',
      features: ['Sub-Second Load Time', 'Mobile Conversion Focused', 'Lead Magnet Integration'],
      icon: <Globe className="w-8 h-8 text-orange-500" />,
      highlight: false
    },
    {
      id: 5,
      title: 'Ad Spend Manager',
      category: 'marketing',
      price: 'Custom Quote',
      description: 'Internal tool to manage Facebook & Google ads from one central hub. Stop wasting budget.',
      features: ['Multi-platform Control', 'Budget Safety Alerts', 'Profit Calculator'],
      icon: <Target className="w-8 h-8 text-red-500" />,
      highlight: false
    }
  ];

  const categories = [
    { id: 'all', label: 'All Solutions' },
    { id: 'systems', label: 'Onboarding Systems' },
    { id: 'ai', label: 'AI Chatbots' },
    { id: 'apps', label: 'Custom Apps' },
    { id: 'websites', label: 'Websites' },
    { id: 'marketing', label: 'Marketing' }
  ];

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
              <button onClick={() => scrollToSection('portfolio')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Systems</button>
              <button onClick={() => scrollToSection('packages')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide text-blue-400">$10 AI Offer</button>
              <button onClick={() => scrollToSection('contact')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-blue-600/30">
                Get a Strategy Call
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={toggleMenu} className="text-slate-300 hover:text-white">
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700 shadow-xl">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button onClick={() => scrollToSection('services')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Expertise</button>
              <button onClick={() => scrollToSection('portfolio')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Systems</button>
              <button onClick={() => scrollToSection('packages')} className="block w-full text-left px-3 py-3 text-blue-400 hover:bg-slate-700 rounded-md font-bold">$10 AI Offer</button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-3 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-bold mt-4">Get a Strategy Call</button>
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
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">Serving Miami, Orlando, Tampa & Jacksonville</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Stop Losing Leads. <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-300">Automate Your Revenue.</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 leading-relaxed font-light">
            EB 28 builds the digital infrastructure that lets you scale without hiring more staff. Custom Apps. AI Chatbots. Automated Cashflow.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => scrollToSection('packages')} className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center transform hover:-translate-y-1">
              Start with AI for $10 <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollToSection('contact')} className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center backdrop-blur-sm">
              Free System Audit
            </button>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Dominating the Florida Market</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">We don't just "make websites." We build military-grade digital sales engines designed to outperform your competition in search and conversion.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-blue-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-blue-500/30">
                <Code className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Custom React Apps</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">Off-the-shelf software is slow and generic. We build custom <strong>React & Native mobile apps</strong> tailored to your specific business logic. Fast, secure, and built to scale your operations.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-purple-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-purple-500/30">
                <Bot className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI & Chatbot Automation</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">Stop paying support staff to answer the same questions. Our <strong>Custom AI Agents</strong> handle support, qualify leads, and book appointments 24/7/365 with zero downtime.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-green-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-green-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-green-500/30">
                <Target className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Paid Media & Onboarding</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">Traffic is useless without conversion. We design the entire <strong>Customer Journey Flow</strong>—from the first Facebook Ad click to the automated onboarding email sequence.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="portfolio" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">The Systems Marketplace</h2>
              <p className="text-slate-400 max-w-xl">Don't reinvent the wheel. Deploy our proven, pre-built automation systems into your business today.</p>
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
                      {item.category}
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
                    {item.highlight ? 'Buy Now' : 'Inquire'} <ArrowRight className="w-4 h-4 ml-1" />
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
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Pricing Models</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Transparent options for every stage of business growth.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-400 relative flex flex-col transform md:-translate-y-4 shadow-2xl shadow-blue-500/30 order-first lg:order-none z-20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-blue-900 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full border border-blue-200">Limited Offer</div>
              <h3 className="text-xl font-bold text-white mb-2">DIY AI Setup</h3>
              <div className="text-5xl font-extrabold text-white mb-6">$10<span className="text-lg text-blue-200 font-normal">/one-time</span></div>
              <p className="text-blue-100 text-sm mb-6 font-medium">The "No-Brainer" Entry. I will personally configure the foundation of your AI chatbot so you can stop losing sleep over missed messages.</p>
              <div className="bg-blue-900/30 rounded-lg p-4 mb-6 border border-blue-400/30">
                <p className="text-xs text-blue-100 uppercase tracking-wider font-bold mb-2">What You Get:</p>
                <ul className="space-y-3">
                  {['Platform Account Creation', 'Knowledge Base Connection', '1 Custom Prompt Template', '30-Min Video Guide Included'].map((feature) => (
                    <li key={feature} className="flex items-start text-white text-sm">
                      <CheckCircle className="w-5 h-5 text-green-300 mr-2 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => scrollToSection('contact')} className="w-full py-4 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg text-lg">
                Get It For $10
              </button>
              <p className="text-center text-xs text-blue-200 mt-3">Delivered within 24 hours.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col lg:order-first">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Custom Build</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-500 font-normal">/First</span></div>
              <p className="text-slate-400 text-sm mb-8">For businesses that need a specific problem solved. Web, App, or Automation.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>React / Native App Development</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Custom CRM Integrations</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Specific Feature Implementation</span></li>
              </ul>
              <button onClick={() => scrollToSection('contact')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">Book Strategy Call</button>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Full Partnership</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-500 font-normal">/First</span></div>
              <p className="text-slate-400 text-sm mb-8">Total digital takeover. We handle the tech, the ads, and the systems.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Complex Architecture Design</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Ongoing Ad Management</span></li>
                <li className="flex items-start text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" /><span>Dedicated Support Team</span></li>
              </ul>
              <button onClick={() => scrollToSection('contact')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">Contact for Quote</button>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-800 shadow-2xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">Let's Build Your Machine.</h2>
              <p className="text-slate-400">Select your path below. We respond to all Florida-based inquiries within 2 hours during business days.</p>
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
                  <option value="10-dollar-bot">🔥 Buy the $10 DIY AI Bot Setup</option>
                  <option value="custom-app">Discuss Custom App Development</option>
                  <option value="marketing">Scale with Paid Ads</option>
                  <option value="consultation">Book a General Strategy Call</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Project Details</label>
                <textarea rows="4" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Tell us about your business goals..."></textarea>
              </div>

              <button type="button" className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg text-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center group">
                Submit Request <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
              <p className="text-slate-500 max-w-sm mb-4 leading-relaxed">EB 28 is Florida's leading <strong>Digital Automation Agency</strong>. We specialize in React Native App Development, AI Chatbot Training, and Automated Customer Journey flows for service-based businesses in Miami, Orlando, and Tampa.</p>
              <div className="flex items-center text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Headquartered in Florida, USA</span>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Core Services</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Custom App Development</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">AI Sales Agents</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Facebook Ad Management</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Onboarding Automation</a></li>
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
