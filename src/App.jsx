import React, { useState, useEffect } from 'react';
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

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

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
      id: 0,
      title: "DIY AI Foundation Build",
      category: "ai-agents",
      price: "$10.00",
      description: "The perfect proof-of-concept. I will personally set up a foundational AI agent to demonstrate how private logic can transform your workflow.",
      features: ["Secure Account Setup", "Basic Knowledge Base Link", "Custom System Prompt"],
      icon: <Bot className="w-8 h-8 text-white" />,
      highlight: true
    },
    {
      id: 1,
      title: "On-Premise LLM Server",
      category: "infrastructure",
      price: "Custom Quote",
      description: "Run advanced AI models (Llama, Mistral) directly on your own office hardware. Zero cloud dependency. Absolute data sovereignty.",
      features: ["Hardware Spec & Setup", "Local Model Deployment", "Offline Capability"],
      icon: <Server className="w-8 h-8 text-blue-500" />,
      highlight: false
    },
    {
      id: 2,
      title: "eb28.co Cloud AI Hosting",
      category: "infrastructure",
      price: "Custom Quote",
      description: "Rent partitioned, highly-secure GPU instances on our proprietary cloud to run your customized LLMs without the hardware upfront cost.",
      features: ["High-Performance Compute", "Encrypted Data Pipelines", "Managed Maintenance"],
      icon: <Cloud className="w-8 h-8 text-purple-500" />,
      highlight: false
    },
    {
      id: 3,
      title: "Local RAG Knowledge Base",
      category: "ai-agents",
      price: "Custom Quote",
      description: "Chat securely with your internal documents, SOPs, and client histories. Your data never leaves your private infrastructure.",
      features: ["Vector Database Setup", "Semantic Search Integration", "Role-Based Access"],
      icon: <Database className="w-8 h-8 text-green-500" />,
      highlight: false
    },
    {
      id: 4,
      title: "Automated Client Gen Matrix",
      category: "revenue",
      price: "Custom Quote",
      description: "High-intent lead capture systems infused with AI qualification that feed directly into automated CRM customer journeys.",
      features: ["AI Lead Qualification", "Dynamic Email Sequences", "Florida Market SEO"],
      icon: <Users className="w-8 h-8 text-orange-500" />,
      highlight: false
    },
    {
      id: 5,
      title: "Ad-to-AI Conversion Funnel",
      category: "revenue",
      price: "Custom Quote",
      description: "We buy the ads and route the traffic to an autonomous AI agent that closes deals and manages onboarding automatically.",
      features: ["Paid Media Management", "Instant AI Response", "ROAS Analytics"],
      icon: <Target className="w-8 h-8 text-red-500" />,
      highlight: false
    }
  ];

  const categories = [
    { id: 'all', label: 'All Systems' },
    { id: 'infrastructure', label: 'Private Infrastructure' },
    { id: 'ai-agents', label: 'Custom LLMs & Agents' },
    { id: 'revenue', label: 'Revenue & Lead Gen' }
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
              <button onClick={() => scrollToSection('portfolio')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide">Deployments</button>
              <button onClick={() => scrollToSection('packages')} className="text-slate-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide text-blue-400">$10 AI Offer</button>
              <button onClick={() => scrollToSection('contact')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-blue-600/30">
                Architect Your System
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={toggleMenu} className="text-slate-300 hover:text-white">
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700 shadow-xl">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button onClick={() => scrollToSection('services')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Infrastructure</button>
              <button onClick={() => scrollToSection('portfolio')} className="block w-full text-left px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md font-medium">Deployments</button>
              <button onClick={() => scrollToSection('packages')} className="block w-full text-left px-3 py-3 text-blue-400 hover:bg-slate-700 rounded-md font-bold">$10 AI Offer</button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-3 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-bold mt-4">Architect Your System</button>
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 mb-8 backdrop-blur-md shadow-lg">
            <span className="flex h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">eb28.co | Private AI Infrastructure</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Deploy Private AI. <br className="hidden md:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-300">
              Automate Your Revenue.
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 leading-relaxed font-light">
            EB 28 engineers secure, local LLMs and custom AI infrastructure. We deploy on your hardware or our secure cloud to automate your internal processes and drive hyper-targeted client generation.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => scrollToSection('packages')} className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center transform hover:-translate-y-1">
              Start Your AI Core for $10 <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollToSection('contact')} className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center backdrop-blur-sm">
              Consult on Infrastructure
            </button>
          </div>

          {/* Social Proof / Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-slate-800/50 pt-8">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-white mb-1">100%</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Data Sovereignty</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-white mb-1">On-Prem</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Hardware Setup</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-white mb-1">Cloud</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">eb28.co Hosting</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-white mb-1">10x</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Lead Gen ROI</div>
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
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-blue-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-blue-500/30">
                <HardDrive className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Private LLM Infrastructure</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                Run powerful, customized open-source models directly from <strong>your own local hardware</strong> or our highly secure <strong>eb28.co cloud servers</strong>. Total privacy for your internal operations and data.
              </p>
            </div>

            {/* Service 2 */}
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-purple-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-purple-500/30">
                <Cpu className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Custom AI Agents & RAG</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                We develop strategic AI agents that actually know your business. By integrating <strong>Local RAG (Retrieval-Augmented Generation)</strong>, your AI can securely chat with your private SOPs, CRM records, and company documents.
              </p>
            </div>

            {/* Service 3 */}
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700 hover:border-green-500/50 transition-all hover:bg-slate-800 group">
              <div className="w-14 h-14 bg-green-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ring-1 ring-green-500/30">
                <TrendingUp className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Revenue & Lead Automation</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">
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
                    <h4 className="text-white font-bold text-lg">Absolute Data Sovereignty</h4>
                    <p className="text-slate-400 text-sm">Stop feeding ChatGPT your client lists and financial data. We build air-gapped and secure-cloud systems where your proprietary data remains entirely yours.</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="mr-4 mt-1"><Server className="text-blue-400 w-6 h-6" /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Hardware & Cloud Flexibility</h4>
                    <p className="text-slate-400 text-sm">You choose the deployment. Run AI locally on your own business hardware, or rent highly scalable, secure GPU infrastructure directly from <strong>eb28.co</strong>.</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="mr-4 mt-1"><ShieldCheck className="text-purple-400 w-6 h-6" /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Revenue-Driven Architecture</h4>
                    <p className="text-slate-400 text-sm">Our deployments aren't just parlor tricks. They are systematically engineered to capture leads, convert traffic, and automate onboarding workflows.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur-[60px] opacity-20 rounded-full"></div>
              <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-medium">Data Leakage to Big Tech</span>
                    <span className="text-green-400 font-bold">0%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-medium">Custom Process Automation</span>
                    <span className="text-blue-400 font-bold">99%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-slate-300 font-medium">Lead Gen Systems</span>
                    <span className="text-purple-400 font-bold text-sm">Always Active</span>
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-4 italic">Tailor-fit for small businesses scaling in Florida and nationwide.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MARKETPLACE SECTION --- */}
      <section id="portfolio" className="py-20 bg-slate-950">
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
                  {item.highlight ? (
                     <button onClick={() => scrollToSection('contact')} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-400 transition-colors flex items-center shadow-lg shadow-blue-500/50">
                     Build It <ArrowRight className="w-4 h-4 ml-1" />
                   </button>
                  ) : (
                    <button onClick={() => scrollToSection('contact')} className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center">
                      Deploy <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              
              <button onClick={() => scrollToSection('contact')} className="w-full py-4 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg text-lg">
                Build Prototype for $10
              </button>
              <p className="text-center text-xs text-blue-200 mt-3">Delivered securely within 24 hours.</p>
            </div>

            {/* Infrastructure Build */}
            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col lg:order-first">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Private AI Infrastructure</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-500 font-normal">/First</span></div>
              <p className="text-slate-400 text-sm mb-8">For businesses ready to deploy local LLMs and secure internal AI tools.</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <span>On-Prem Hardware Selection & Setup</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <span>eb28.co Cloud Hosting Provisioning</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <CheckCircle className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <span>Local RAG / Document Integration</span>
                </li>
              </ul>
              
              <button onClick={() => scrollToSection('contact')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">Discuss Infrastructure</button>
            </div>

            {/* The Ecosystem */}
            <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col">
              <h3 className="text-xl font-medium text-slate-300 mb-2">The Revenue Ecosystem</h3>
              <div className="text-3xl font-bold text-white mb-6">Consultation<span className="text-lg text-slate-500 font-normal">/First</span></div>
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
              <h2 className="text-3xl font-bold text-white mb-4">Initialize Your Build.</h2>
              <p className="text-slate-400">
                Whether you need a $10 proof-of-concept or a full on-premise LLM server deployment, submit your specs below.
              </p>
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
                <label className="block text-sm font-medium text-slate-400 mb-2">Infrastructure Need</label>
                <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                  <option value="10-dollar-bot">🔥 Deploy $10 Proof of Concept Bot</option>
                  <option value="on-prem">On-Premise Local LLM Setup</option>
                  <option value="cloud">eb28.co Cloud AI Hosting</option>
                  <option value="revenue">Revenue Automation & Paid Ads</option>
                  <option value="consultation">General Tech/Strategy Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Project Specs / Business Goals</label>
                <textarea rows="4" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Tell us about your data privacy needs or revenue goals..."></textarea>
              </div>

              <button type="button" className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg text-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center group">
                Submit Architecture Request <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <p className="text-center text-xs text-slate-500 mt-4">
                🔒 Transmission encrypted. For the $10 Setup, you will be redirected to a secure payment portal immediately.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* --- FOOTER (SEO OPTIMIZED) --- */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <span className="text-2xl font-bold text-white block mb-4">EB 28 | eb28.co</span>
              <p className="text-slate-500 max-w-sm mb-4 leading-relaxed">
                EB 28 builds <strong>Private AI Infrastructure</strong> for small businesses. Whether you need on-premise open-source LLMs, secure cloud hosting via eb28.co, or high-intent revenue automation, we engineer the systems that scale your operations.
              </p>
              <div className="flex items-center text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Serving Florida & National Markets</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Infrastructure</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">On-Premise Server Builds</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">eb28.co Cloud Hosting</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Local RAG Knowledge Bases</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Automated CRM Integrations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Agency</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Our Tech Stack</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Revenue Case Studies</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Security & Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Consultation Booking</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-600 text-sm text-center md:text-left">
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
