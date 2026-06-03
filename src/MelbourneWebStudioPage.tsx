/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  MessageSquare,
  Wrench,
  Play,
  CheckCircle2,
  ShieldCheck,
  Mail,
  MapPin,
  ArrowRight,
  ArrowLeft,
  XCircle,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  ExternalLink,
  Bot,
  Cpu,
  Sparkles,
  Database,
  Send,
  User,
  X,
  MessageCircle,
  Trophy,
  Award,
  Star,
  Layers,
  Code,
  Quote,
  Calendar,
  Clock,
  BookOpen,
  Facebook,
  Twitter,
  Linkedin,
  Share2,
  ChevronRight,
  RefreshCw,
  BarChart3,
  PieChart,
  Wallet,
  Globe,
  Download,
  Search,
  Zap,
  Layout,
  Target,
  Users,
  Palette,
  Type as TypeIcon,
  Smartphone,
  Lock,
  Loader2,
  Rocket,
} from "lucide-react";

const LEAD_CAPTURE_ENDPOINT = "https://formsubmit.co/ajax/richducat@gmail.com";
const DISCOVERY_CALL_URL = "https://bookings.tyfys.net/#/4739587000001163002";

type AuthorityAnalysis = {
  rating: number;
  title: string;
  assessment: string;
  killerInsight: string;
  priorityFixes: string[];
  competitiveEdge: number;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const submitLeadCapture = async (payload: Record<string, unknown>) => {
  const enhancedPayload = {
    ...payload,
    _subject: "[EB28 HIGH PRIORITY LEAD] Melbourne Web Studio Submission"
  };

  const response = await fetch(LEAD_CAPTURE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(enhancedPayload),
  });

  if (!response.ok) {
    throw new Error(`Lead capture failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  if (data && typeof data === "object" && "success" in data && !data.success) {
    throw new Error("Lead capture endpoint rejected the request");
  }
};

const normalizeWebsiteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getDomainLabel = (value: string) => {
  try {
    return new URL(normalizeWebsiteUrl(value)).hostname.replace(/^www\./, "");
  } catch {
    return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./, "");
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildAuthorityAnalysis = (websiteUrl: string, quizScore: number): AuthorityAnalysis => {
  const domain = getDomainLabel(websiteUrl) || "your site";
  const issueLevel = clamp(quizScore, 0, 5);
  const rating = clamp(5 - Math.floor(issueLevel * 0.8), 1, 5);
  const competitiveEdge = clamp(84 - issueLevel * 11, 29, 86);

  if (issueLevel >= 4) {
    return {
      rating,
      title: "Good business. Quiet website.",
      assessment: `${domain} may be doing enough to prove the business is real, but it is not giving a busy local buyer enough reason to act right now. That means some people who should be calling you are probably clicking back, comparing options, and choosing the company that feels clearer, faster, and easier to trust.`,
      killerInsight:
        "Your biggest leak is probably not effort. It is the moment between a buyer landing on the page and deciding whether you feel like the obvious choice.",
      priorityFixes: [
        "Make the first screen say who you help, what you do, and why they should call",
        "Help more nearby buyers find you when they search on Google",
        "Add a simple follow-up path so after-hours leads do not go cold",
      ],
      competitiveEdge,
    };
  }

  if (issueLevel >= 2) {
    return {
      rating,
      title: "Close, but too easy to leave.",
      assessment: `${domain} has a workable foundation, but a buyer still has to think too hard before taking the next step. The offer can feel sharper, the page can guide people more clearly, and your local proof can do more of the selling before a competitor gets the call.`,
      killerInsight:
        "You may not need more pages first. You need fewer doubts between the first click and the first enquiry.",
      priorityFixes: [
        "Tighten the main message so buyers know they are in the right place",
        "Give Google and local customers stronger proof that you serve this market",
        "Make every enquiry easier to answer, qualify, and follow up",
      ],
      competitiveEdge,
    };
  }

  return {
    rating,
    title: "Trusted, with room to win more.",
    assessment: `${domain} is already doing several things right. The business feels legitimate, the offer is understandable, and the next gains are likely hiding in small but important places: faster trust, clearer proof, better local search coverage, and quicker follow-up when someone is ready to talk.`,
    killerInsight:
      "You are not starting from zero. A few sharper signals can turn more of the traffic you already have into real conversations.",
    priorityFixes: [
      "Show stronger proof near every important call-to-action",
      "Create more local search coverage around your best services",
      "Speed up replies so interested buyers stay warm",
    ],
    competitiveEdge,
  };
};

const buildBlueprint = ({
  leadData,
  onboardingData,
  selectedPackage,
  websiteUrl,
  aiAnalysis,
}: {
  leadData: { name: string; email: string; phone: string; businessName: string };
  onboardingData: {
    industry: string;
    goals: string;
    targetAudience: string;
    brandVoice: string;
    competitors: string;
    features: string;
  };
  selectedPackage: { name?: string; price?: number; type?: string } | null;
  websiteUrl: string;
  aiAnalysis: AuthorityAnalysis | null;
}) => {
  const businessName = leadData.businessName || "Your Business";
  const packageName = selectedPackage?.name || "Custom Web Growth Plan";
  const audience = onboardingData.targetAudience || "local customers ready to buy";
  const brandVoice = onboardingData.brandVoice || "clear, credible, modern, and local-first";
  const currentSite = websiteUrl ? getDomainLabel(websiteUrl) : "a new launch";
  const features = onboardingData.features
    ? onboardingData.features
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : ["high-converting homepage", "clear enquiry path", "mobile-first layout"];

  return [
    `${businessName.toUpperCase()} | PROJECT BLUEPRINT`,
    `Package: ${packageName}`,
    `Current Site: ${currentSite}`,
    "",
    "1. POSITIONING",
    `Industry: ${onboardingData.industry || "Local service business"}`,
    `Audience: ${audience}`,
    `Brand Voice: ${brandVoice}`,
    `Core Goal: ${onboardingData.goals || "Generate more qualified local enquiries."}`,
    "",
    "2. HERO DIRECTION",
    `Headline angle: Lead with the clearest promise ${businessName} can own in the local market.`,
    `Support line: Explain why prospects should trust the team quickly, with a direct CTA above the fold.`,
    `Primary CTA: Book a call / Request a quote / Start the project brief.`,
    "",
    "3. TRUST ARCHITECTURE",
    "Use local proof early: testimonials, recognitions, Google Business signals, and real team credibility.",
    aiAnalysis
      ? `Audit focus: ${aiAnalysis.killerInsight}`
      : "Audit focus: tighten speed, clarity, and local authority signals.",
    "",
    "4. SITE STRUCTURE",
    "Homepage",
    "Service / offer pages",
    "Proof / case studies",
    "Team / credibility",
    "Contact and conversion section",
    "",
    "5. MUST-HAVE FEATURES",
    ...features.map((feature, index) => `${index + 1}. ${feature}`),
    "",
    "6. MOBILE PRIORITIES",
    "Fast first paint",
    "Thumb-friendly CTA placement",
    "Short sections with strong visual hierarchy",
    "Sticky contact path for high-intent visitors",
    "",
    "7. FIRST BUILD SPRINT",
    "Clarify the offer",
    "Design the conversion-focused homepage",
    "Build trust modules and lead capture",
    "Prepare local SEO foundations and launch copy",
  ].join("\n");
};

const inferPackageName = (message: string) => {
  if (message.includes("ai suite") || message.includes("automation") || message.includes("media buyer")) {
    return "AI Business Suite";
  }
  if (message.includes("seo") || message.includes("hosting") || message.includes("google business")) {
    return "The Power Foundation";
  }
  if (message.includes("website") || message.includes("build") || message.includes("redesign")) {
    return "The Professional Build";
  }
  if (message.includes("openclaw") || message.includes("fund")) {
    return "OpenClaw Fund Manager";
  }
  return null;
};

const buildChatReply = (userMessage: string) => {
  const lower = userMessage.toLowerCase();
  const emailMatch = userMessage.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const websiteMatch = userMessage.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
  const selectedPackage = inferPackageName(lower);

  if (lower.includes("book") || lower.includes("call") || lower.includes("discovery")) {
    return {
      text: "A discovery call is the fastest way to map the right package and next steps. Use the booking link and we can turn that into a clear plan quickly.",
      type: "appointment" as const,
      data: {
        preferredDate: "Choose any open slot",
        preferredTime: "30-minute strategy call",
      },
    };
  }

  if (lower.includes("crm") || lower.includes("zoho") || lower.includes("salesforce")) {
    const crmType = lower.includes("salesforce")
      ? "Salesforce"
      : lower.includes("zoho")
        ? "Zoho"
        : "Custom CRM";
    return {
      text: "That sounds like a CRM cleanup and automation project. We can scope the pipeline, the follow-up logic, and the reporting around how your team actually works.",
      type: "crm" as const,
      data: {
        crmType,
        primaryGoal: "Lead tracking and automated follow-ups",
      },
    };
  }

  if (selectedPackage) {
    return {
      text: `${selectedPackage} sounds like the closest fit based on what you described. Start the project brief and we’ll follow up with the right scope, timeline, and secure checkout steps.`,
      type: "onboarding" as const,
      data: { selectedPackage },
    };
  }

  if (emailMatch) {
    return {
      text: "Perfect. That gives us enough to move from general advice into a real project conversation. Finish the project brief and we can respond with next steps quickly.",
      type: "info" as const,
      data: {
        businessName: "Your business",
        industry: lower.includes("dentist")
          ? "Dentist"
          : lower.includes("lawyer")
            ? "Legal"
            : lower.includes("restaurant")
              ? "Restaurant"
              : "Local business",
        contactEmail: emailMatch[0],
        hasWebsite: Boolean(websiteMatch),
        websiteUrl: websiteMatch ? websiteMatch[0] : "",
      },
    };
  }

  if (lower.includes("seo") || lower.includes("google") || lower.includes("rank")) {
    return {
      text: "If local SEO is the bottleneck, the Power Foundation is usually the right place to start. The SEO article in Resources is a solid primer, and the project brief helps us see where rankings are leaking.",
    };
  }

  if (lower.includes("website") || lower.includes("design") || lower.includes("redesign")) {
    return {
      text: "That usually starts with the Professional Build. The web design article in Resources will feel relevant, and the lead leak quiz is the quickest way to see what is stopping more visitors from contacting you.",
    };
  }

  if (lower.includes("ads") || lower.includes("marketing") || lower.includes("lead")) {
    return {
      text: "That points toward the AI Business Suite, especially if leads are coming in after hours or follow-up is inconsistent. The marketing article in Resources is worth a quick read before you fill out the project brief.",
    };
  }

  return {
    text: "That makes sense. Start with the lead leak quiz and I’ll help narrow the best next step from there. If you already know the pain point, tell me whether it’s design, SEO, leads, or follow-up.",
  };
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-2" : "bg-white py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between w-full">
        <div className="flex flex-col">
          <span
            className={`font-bold tracking-tighter text-slate-900 transition-all ${
              isScrolled ? "text-lg" : "text-xl"
            }`}
          >
            MELBOURNE
          </span>
          <span
            className={`font-medium text-slate-500 -mt-1 tracking-widest transition-all ${
              isScrolled ? "text-[10px]" : "text-sm"
            }`}
          >
            WEB STUDIO
          </span>
          <a
            href="https://eb28.co"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[8px] font-bold text-blue-500/40 uppercase tracking-[0.2em] transition-all hover:text-blue-500 ${
              isScrolled ? "opacity-0 h-0 overflow-hidden" : "opacity-100 mt-0.5"
            }`}
          >
            powered by eb28.co
          </a>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["How It Works", "Case Studies", "Pricing", "Resources", "Our Team", "Contact"].map(
            (item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                {item}
              </a>
            ),
          )}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            Live Chat
          </button>
          <button
            onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
            className={`bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-all shadow-sm ${
              isScrolled ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"
            }`}
          >
            Start Your Project
          </button>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative px-6 py-16 md:py-24 max-w-7xl mx-auto w-full overflow-hidden bg-white">

      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              50+ Local Businesses Served
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 leading-[1.1] mb-6">
            Get a Website That <span className="text-blue-600">Actually Works</span> for Your
            Business.
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-md leading-relaxed">
            No tech-speak, no hidden fees. Just a fast, professional site that helps locals find
            you.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-slate-900 text-white px-8 py-4 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Start Your Project
            </button>
            <button
              onClick={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-white text-slate-900 border-2 border-slate-100 px-8 py-4 rounded-lg font-bold hover:bg-slate-50 transition-all"
            >
              See How It Works
            </button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <img
            src="/images/appbuilder_bg.png"
            alt="Melbourne Web Studio project planning interface"
            width="900"
            height="1125"
            decoding="async"
            fetchpriority="high"
            className="relative rounded-2xl shadow-2xl z-10 w-full object-cover aspect-[4/5] bg-slate-100"
          />
        </motion.div>
      </div>
    </section>
  );
};

const TrustSignals = () => (
  <section className="px-6 py-12 border-y border-slate-100 bg-white">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 text-center md:text-left">
            Trusted by Melbourne&apos;s Local Favorites
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {["The Daily Grind", "Melbourne Legal", "FitLife Studio", "Coastal Eats"].map(
              (name) => (
                <div key={name} className="flex items-center justify-center">
                  <span className="font-black text-xl tracking-tighter text-slate-900">
                    {name.toUpperCase()}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center md:justify-end gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-8 md:pt-0 md:pl-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Top Web Studio 2025</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Melbourne Business Awards
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">5-Star Rated</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Google Business Profile
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ProblemSolution = () => (
  <section id="how-it-works" className="px-6 py-20 bg-slate-50">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-16">
        The Problem/Solution
      </h2>
      <div className="grid md:grid-cols-2 gap-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
          <ArrowRight className="w-8 h-8 text-slate-300" />
        </div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">The Old Way</h3>
            <p className="text-sm text-slate-500">(Confusing &amp; Expensive)</p>
          </div>
          <ul className="space-y-4">
            {["Confusing Jargon", "Surprise Costs", "Generic Templates"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-2xl shadow-sm border-2 border-blue-100"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Our Way</h3>
            <p className="text-sm text-slate-500">(Simple &amp; Effective)</p>
          </div>
          <ul className="space-y-4">
            {["Plain English", "Transparent Pricing", "Custom for You"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-slate-600 font-medium">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  </section>
);

const Pricing = () => (
  <section id="pricing" className="px-6 py-24 max-w-7xl mx-auto w-full">
    <div className="text-center mb-20">
      <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
        Your Path to a Powerful Online Presence
      </h2>
      <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        We believe in total transparency. No jargon, no hidden fees, just a clear, guided journey
        to help your business thrive.
      </p>
    </div>

    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-12 gap-8 items-center bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all"
      >
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-200">
            1
          </div>
          <div className="w-px h-full bg-slate-100 mt-4 hidden md:block"></div>
        </div>
        <div className="md:col-span-7">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Step 1: The Professional Build
          </h3>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your website is your digital storefront. We build you a high-performance, mobile-first
            site that doesn&apos;t just look pretty, it&apos;s engineered to turn visitors into
            loyal customers. You own every pixel.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Custom, Non-Template Design",
              "Conversion-Optimized Layout",
              "Lightning Fast Load Times",
              "Full Ownership & Control",
              "Mobile-First Engineering",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-4 text-center md:text-right">
          <div className="inline-block bg-slate-50 px-8 py-6 rounded-3xl border border-slate-100 mb-4">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
              One-Time Investment
            </p>
            <p className="text-5xl font-black text-slate-900">$800</p>
          </div>
          <button
            onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
          >
            Start Your Project <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-12 gap-8 items-center bg-blue-50/50 p-8 md:p-12 rounded-[2.5rem] border border-blue-100 shadow-sm hover:shadow-md transition-all"
      >
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-100">
            2
          </div>
          <div className="w-px h-full bg-slate-100 mt-4 hidden md:block"></div>
        </div>
        <div className="md:col-span-7">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Step 2: The Power Foundation
          </h3>
          <p className="text-slate-600 mb-6 leading-relaxed">
            A great site needs a strong foundation. This isn&apos;t just &quot;hosting&quot;, it&apos;s
            active growth management. We handle your SEO, Google Business listings, and search
            placement so you stay at the top of the map.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Premium Managed Hosting",
              "Active SEO Management",
              "Google Business Optimization",
              "Search Engine Placement",
              "99.9% Uptime & Security",
              "Unlimited Content Updates",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-4 text-center md:text-right">
          <div className="inline-block bg-white px-8 py-6 rounded-3xl border border-blue-100 shadow-sm mb-4">
            <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">
              Monthly Foundation
            </p>
            <p className="text-5xl font-black text-slate-900">
              $80<span className="text-xl font-bold text-slate-400">/mo</span>
            </p>
          </div>
          <button
            onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, scale: 1.01 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-12 gap-8 items-center bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden group transition-all duration-500"
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] group-hover:bg-blue-500/20 transition-all duration-700"></div>

        <div className="md:col-span-1 flex flex-col items-center relative z-10">
          <div className="w-12 h-12 bg-blue-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-400/50">
            3
          </div>
          <div className="w-px h-full bg-slate-800 mt-4 hidden md:block"></div>
        </div>
        <div className="md:col-span-7 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Step 3: AI Business Suite</h3>
            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/30">
              Advanced
            </span>
          </div>
          <p className="text-slate-300 mb-10 leading-relaxed text-lg">
            Stop trading time for money. Our AI Business Suite puts your growth on autopilot with
            specialized autonomous agents designed to handle the heavy lifting of running a local
            business.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">
                  Front of House
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your 24/7 digital closer. It warms up leads, answers complex questions, and
                onboards new clients instantly.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400/60">
                <CheckCircle2 className="w-3 h-3" /> INCLUDED
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">
                  Media Buyer AI
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous ad specialist. It monitors campaigns, generates reports, and suggests
                optimizations 24/7.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-rose-400/60">
                <CheckCircle2 className="w-3 h-3" /> INCLUDED
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                  Stripe Recon
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous financial management. It tracks revenue, reconciles accounts, and
                handles invoice follow-ups.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400/60">
                <CheckCircle2 className="w-3 h-3" /> INCLUDED
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Database className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">
                  CRM Manager
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pipeline automation at its best. We build your custom CRM or manage your
                Zoho/Salesforce so your data stays clean.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400/60">
                <CheckCircle2 className="w-3 h-3" /> INCLUDED
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 text-center md:text-right">
          <div className="inline-block bg-slate-800 px-8 py-6 rounded-3xl border border-slate-700 mb-4">
            <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">
              Total Suite Price
            </p>
            <p className="text-5xl font-black text-white">
              $170<span className="text-xl font-bold text-slate-500">/mo</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-widest">
              All 4 Agents Included
            </p>
          </div>
          <button
            onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full bg-blue-500 text-slate-900 font-bold py-4 rounded-2xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            Deploy AI Suite <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-12 gap-8 items-center bg-indigo-50/50 p-8 md:p-12 rounded-[2.5rem] border border-indigo-100 shadow-sm hover:shadow-md transition-all"
      >
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-100">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="w-px h-full bg-slate-100 mt-4 hidden md:block"></div>
        </div>
        <div className="md:col-span-7">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-6 h-6 text-indigo-600" />
            <h3 className="text-2xl font-bold text-slate-900">
              Tools for the Finance Industry
            </h3>
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed">
            The OpenClaw ecosystem provides professional-grade tools for modern finance and
            decentralized markets. From institutional fund management to high-velocity crypto
            trading.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[
              "Solana Trading dApp (High Speed)",
              "Meme Coin Scanner (Solana & Base)",
              "Token Creator & Launchpad",
              "Autonomous Trading Bots",
              "Real-time Asset Tracking",
              "Secure Investor Portals",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-100 inline-flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-600" />
            <p className="text-sm font-bold text-indigo-700">
              Includes mandatory 3-hour strategic onboarding &amp; setup.
            </p>
          </div>
        </div>
        <div className="md:col-span-4 text-center md:text-right">
          <div className="inline-block bg-white px-8 py-6 rounded-3xl border border-indigo-100 shadow-sm mb-4">
            <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">
              Finance Suite
            </p>
            <p className="text-5xl font-black text-slate-900">
              $170<span className="text-xl font-bold text-slate-400">/mo</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                One-Time Setup
              </p>
              <p className="text-2xl font-black text-slate-900">$800</p>
            </div>
          </div>
          <button
            onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            Get Finance Tools <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-12 gap-8 items-center bg-orange-50 p-8 md:p-12 rounded-[2.5rem] border border-orange-100 shadow-sm hover:shadow-md transition-all"
      >
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-orange-100">
            5
          </div>
        </div>
        <div className="md:col-span-7">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Unsure? Let&apos;s Chat First.</h3>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Not sure which path is right for you? Book a 30-minute Discovery Call. We&apos;ll
            dive into your business, look at your goals, and figure out exactly what you need to
            move forward with confidence.
          </p>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-orange-200 inline-flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <p className="text-sm font-bold text-orange-700">
              Bonus: Get 12.5% OFF your website build after our call!
            </p>
          </div>
        </div>
        <div className="md:col-span-4 text-center md:text-right">
          <div className="inline-block bg-white px-8 py-6 rounded-3xl border border-orange-200 shadow-sm">
            <p className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-1">
              30-Min Strategy Call
            </p>
            <p className="text-5xl font-black text-slate-900">$53</p>
            <button className="mt-4 w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-all text-sm">
              Book Your Call
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const Team = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const team = [
    {
      name: "Julian Vance",
      role: "Lead Architect & Founder",
      degree: "B.S. in Computer Science & AI",
      exp: "12+ years in full-stack development and autonomous systems. Former lead engineer for multi-million dollar fintech platforms.",
      achievement:
        "Architected the OpenClaw Fund Management ecosystem used by institutional investors.",
      highlight: "Graduated with Honors in Computational Intelligence",
      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "Alex",
      role: "Head of AI Operations",
      degree: "Ph.D. in Neural Networks",
      exp: "Specialized in autonomous agent orchestration and natural language processing. 8 years at the forefront of AI integration.",
      achievement:
        "Developed the 'Front of House' AI agent that currently manages lead intake for 50+ Melbourne businesses.",
      highlight: "Achieved Google Cloud Professional Machine Learning Engineer certification",
      img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "Sarah",
      role: "Operations & Client Success",
      degree: "M.B.A. in Strategic Management",
      exp: "10+ years managing complex digital transformations for local and national brands. Expert in ROI tracking and client advocacy.",
      achievement:
        "Maintained a 98% client retention rate over the last 5 years of studio operations.",
      highlight: "Certified Project Management Professional (PMP)",
      img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "Marcus",
      role: "Senior Full-Stack Developer",
      degree: "B.E. in Software Engineering",
      exp: "Specialist in high-performance web architectures and secure API integrations. 7 years of deep-level coding experience.",
      achievement:
        "Optimized the core build engine that delivers 99+ PageSpeed scores for all our client sites.",
      highlight: "Top 1% contributor on GitHub for open-source React frameworks",
      img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
    },
  ];

  const validateField = (name: string, value: string) => {
    if (name === "name") {
      if (!value.trim()) return "Name is required";
      if (value.trim().length < 2) return "Name is too short";
      return "";
    }
    if (name === "email") {
      if (!value.trim()) return "Email is required";
      if (!isValidEmail(value)) return "Invalid email format";
      return "";
    }
    if (!value.trim()) return "Message is required";
    if (value.trim().length < 10) return "Message must be at least 10 characters";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const nextErrors = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      message: validateField("message", formData.message),
    };
    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.email || nextErrors.message) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLeadCapture({
        ...formData,
        serviceNeed: "melbourne-web-studio-direct-inquiry",
        sourcePage: "melbournewebstudio.eb28.co",
        _subject: `Melbourne Web Studio inquiry from ${formData.name}`,
      });
      setIsSuccess(true);
      setFormData({ name: "", email: "", message: "" });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Direct inquiry failed", error);
      setSubmitError("Something went wrong. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="our-team" className="px-6 py-24 max-w-7xl mx-auto w-full">
      <div className="grid lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em]">
                The Melbourne Collective
              </h2>
              <p className="text-slate-500 text-xs">Real people. Real results. No-BS approach.</p>
            </div>
          </div>

          <h3 className="text-4xl font-bold text-slate-900 mb-12 tracking-tight">
            The Minds Behind the Machine
          </h3>

          <div className="space-y-12 mb-16">
            {team.map((member) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group flex flex-col md:flex-row gap-8 items-start"
              >
                <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-[2rem] shadow-xl group-hover:shadow-blue-200/50 transition-all duration-500">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                    <h4 className="text-2xl font-bold text-slate-900">{member.name}</h4>
                    <span className="text-blue-600 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-full">
                      {member.role}
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <BookOpen className="w-3 h-3" /> {member.degree}
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">{member.exp}</p>
                  <div className="flex flex-col gap-2 items-start">
                    <div className="inline-flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <p className="text-xs font-bold text-slate-700">{member.achievement}</p>
                    </div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">
                      {member.highlight}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
              <h4 className="text-3xl font-bold mb-4">Ready to join the elite?</h4>
              <p className="text-slate-400 text-lg mb-8 max-w-xl leading-relaxed">
                If your website is not bringing in enough of the right calls, start with the
                quiz. I&apos;ll show you the first thing I would fix before you spend on anything else.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40"
                >
                  Take the Lead Leak Quiz <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="bg-white/10 backdrop-blur-md text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all border border-white/10"
                >
                  View Packages
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="contact" className="lg:col-span-4 sticky top-24">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <h4 className="text-2xl font-bold text-slate-900 mb-2">Direct Inquiry</h4>
            <p className="text-slate-500 text-sm mb-8">
              Skip the line and send us a direct message.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Full Name
                  </label>
                  {errors.name && (
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {errors.name}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`w-full px-5 py-4 rounded-2xl border ${
                    errors.name
                      ? "border-red-400/50 focus:ring-red-500"
                      : "border-slate-800 focus:ring-blue-500"
                  } focus:outline-none focus:ring-2 bg-slate-800/50 text-white placeholder:text-slate-600 transition-all`}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Email Address
                  </label>
                  {errors.email && (
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {errors.email}
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className={`w-full px-5 py-4 rounded-2xl border ${
                    errors.email
                      ? "border-red-400/50 focus:ring-red-500"
                      : "border-slate-800 focus:ring-blue-500"
                  } focus:outline-none focus:ring-2 bg-slate-800/50 text-white placeholder:text-slate-600 transition-all`}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Your Message
                  </label>
                  {errors.message && (
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {errors.message}
                    </span>
                  )}
                </div>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your business..."
                  rows={4}
                  className={`w-full px-5 py-4 rounded-2xl border ${
                    errors.message
                      ? "border-red-400/50 focus:ring-red-500"
                      : "border-slate-800 focus:ring-blue-500"
                  } focus:outline-none focus:ring-2 bg-slate-800/50 text-white placeholder:text-slate-600 transition-all resize-none`}
                />
              </div>

              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold py-5 rounded-2xl flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Message Sent Successfully!
                </motion.div>
              ) : (
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !!errors.name ||
                    !!errors.email ||
                    !!errors.message ||
                    !formData.name ||
                    !formData.email ||
                    !formData.message
                  }
                  className={`w-full ${
                    isSubmitting ? "bg-slate-700" : "bg-blue-600 hover:bg-blue-700"
                  } text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Message
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}
              {submitError && <p className="text-xs text-red-400 px-1">{submitError}</p>}
            </form>

            <div className="mt-8 pt-8 border-t border-slate-800 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Direct inbox
                </p>
                <p className="text-sm font-bold">richducat@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const OnboardingFunnel = () => {
  const [funnelStep, setFunnelStep] = useState<
    "QUIZ" | "SCAN" | "RESULTS" | "QUALIFY" | "PRICING" | "ONBOARDING" | "SUCCESS"
  >("QUIZ");
  const [quizStep, setQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<AuthorityAnalysis | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mockup, setMockup] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [qualifyErrors, setQualifyErrors] = useState<Record<string, string>>({});

  const [leadData, setLeadData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
  });

  const [onboardingData, setOnboardingData] = useState({
    industry: "",
    goals: "",
    targetAudience: "",
    brandVoice: "",
    competitors: "",
    features: "",
  });

  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [targetPackage, setTargetPackage] = useState<string | null>(null);
  const [quickLeadData, setQuickLeadData] = useState({
    bestTime: "",
    notes: "",
  });

  useEffect(() => {
    const savedLead = localStorage.getItem("leadData");
    const savedPackage = localStorage.getItem("selectedPackage");
    const savedAnalysis = localStorage.getItem("aiAnalysis");
    const savedUrl = localStorage.getItem("websiteUrl");

    if (savedLead) setLeadData(JSON.parse(savedLead));
    if (savedPackage) setSelectedPackage(JSON.parse(savedPackage));
    if (savedAnalysis) setAiAnalysis(JSON.parse(savedAnalysis));
    if (savedUrl) setWebsiteUrl(savedUrl || "");
  }, []);

  const quizQuestions = [
    {
      id: "primaryGoal",
      shortLabel: "Goal",
      question: "What win would you feel in the business this month?",
      subtext: "Pick the answer that would put the most money, time, or momentum back in your hands.",
      options: [
        {
          label: "More calls from people ready to buy",
          value: "local-leads",
          helper: "Not more random traffic. More nearby people who already need what you sell.",
          score: 2,
          package: "The Power Foundation",
        },
        {
          label: "Stop looking smaller than the business really is",
          value: "new-site",
          helper: "Your site should make a good prospect feel like they found the right place.",
          score: 1,
          package: "The Professional Build",
        },
        {
          label: "Follow up before good leads disappear",
          value: "automation",
          helper: "When someone raises a hand, they hear back while they still care.",
          score: 2,
          package: "AI Business Suite",
        },
      ],
    },
    {
      id: "biggestLeak",
      shortLabel: "Leak",
      question: "Where do you think good customers slip away?",
      subtext: "Most local websites lose the job before the owner ever knows a buyer was there.",
      options: [
        {
          label: "They search, but they find someone else first",
          value: "search-visibility",
          helper: "The demand is already out there. Your competitor is just collecting it.",
          score: 2,
          package: "The Power Foundation",
        },
        {
          label: "They visit, but nothing makes them act",
          value: "conversion",
          helper: "They look around, feel unsure, and leave without calling, booking, or asking.",
          score: 2,
          package: "The Professional Build",
        },
        {
          label: "They reach out, then go cold",
          value: "follow-up",
          helper: "The interest is real, but the reply is late, weak, or too easy to ignore.",
          score: 1,
          package: "AI Business Suite",
        },
      ],
    },
    {
      id: "timeline",
      shortLabel: "Timing",
      question: "How expensive is this starting to feel?",
      subtext: "This keeps the recommendation honest, not bloated.",
      options: [
        {
          label: "It is costing us work now",
          value: "this-week",
          helper: "You want the fastest smart fix, not another month of guessing.",
          score: 2,
          package: "The Power Foundation",
        },
        {
          label: "It needs to get handled this month",
          value: "thirty-days",
          helper: "You want the right plan, a clean path, and no wasted spend.",
          score: 1,
          package: "The Professional Build",
        },
        {
          label: "I am not sure yet. Show me the leak",
          value: "researching",
          helper: "You want the problem named before you put money behind a fix.",
          score: 0,
          package: "The Professional Build",
        },
      ],
    },
    {
      id: "readiness",
      shortLabel: "Fit",
      question: "What would make this feel worth doing?",
      subtext: "Pick the kind of help you actually want, not the biggest package on a menu.",
      options: [
        {
          label: "Tell me the first thing you would fix",
          value: "audit-plan",
          helper: "You want the shortest honest answer before deciding anything else.",
          score: 0,
          package: "The Power Foundation",
        },
        {
          label: "Build the page that makes people choose us",
          value: "done-for-me",
          helper: "You want the offer, proof, and next step handled the right way.",
          score: 1,
          package: "The Professional Build",
        },
        {
          label: "Build the whole customer-getting system",
          value: "full-system",
          helper: "You want the site, Google, intake, follow-up, and reporting working together.",
          score: 2,
          package: "AI Business Suite",
        },
      ],
    },
  ];

  const scoreQuizAnswers = (answers: Record<string, string>) =>
    quizQuestions.reduce((total, question) => {
      const option = question.options.find((item) => item.value === answers[question.id]);
      return total + (option?.score || 0);
    }, 0);

  const getRecommendedPackage = (answers: Record<string, string>) => {
    const packageCounts = quizQuestions.reduce<Record<string, number>>((counts, question) => {
      const option = question.options.find((item) => item.value === answers[question.id]);
      if (option?.package) counts[option.package] = (counts[option.package] || 0) + 1;
      return counts;
    }, {});

    return (
      Object.entries(packageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "The Power Foundation"
    );
  };

  const handleQuizSelect = (questionId: string, value: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleQuizContinue = () => {
    const currentQuestion = quizQuestions[quizStep];
    if (!quizAnswers[currentQuestion.id]) return;

    if (quizStep < quizQuestions.length - 1) {
      setQuizStep((prev) => prev + 1);
      return;
    }

    const finalScore = clamp(scoreQuizAnswers(quizAnswers), 0, 5);
    const recommendedPackage = getRecommendedPackage(quizAnswers);
    setQuizScore(finalScore);
    setTargetPackage(recommendedPackage);
    setFunnelStep("QUALIFY");
  };

  const handleQuizBack = () => {
    if (quizStep > 0) setQuizStep((prev) => prev - 1);
  };

  const startScan = async () => {
    if (!websiteUrl) return;
    setIsScanning(true);
    setScanProgress(0);

    const statuses = [
      "Connecting...",
      "Checking your Google signals...",
      "Checking page speed...",
      "Looking for lead leaks...",
      "Writing your next-step plan...",
    ];
    for (let i = 0; i < statuses.length; i += 1) {
      setScanStatus(statuses[i]);
      setScanProgress((i + 1) * 20);
      await new Promise((r) => setTimeout(r, 600));
    }
    const result = buildAuthorityAnalysis(websiteUrl, quizScore);
    setAiAnalysis(result);
    localStorage.setItem("aiAnalysis", JSON.stringify(result));
    localStorage.setItem("websiteUrl", websiteUrl);
    setFunnelStep("RESULTS");
    setIsScanning(false);
  };

  const getFixPackage = (fix: string) => {
    const f = fix.toLowerCase();
    if (f.includes("ai") || f.includes("automation") || f.includes("agent") || f.includes("bot")) {
      return "AI Business Suite";
    }
    if (
      f.includes("seo") ||
      f.includes("map") ||
      f.includes("rank") ||
      f.includes("google") ||
      f.includes("search")
    ) {
      return "The Power Foundation";
    }
    return "The Professional Build";
  };

  const handlePackageSelection = async (pkg: any) => {
    setSelectedPackage(pkg);
    localStorage.setItem("selectedPackage", JSON.stringify(pkg));
    localStorage.setItem("leadData", JSON.stringify(leadData));
    setSubmissionError("");
    setFunnelStep("ONBOARDING");
  };

  const validateQualify = () => {
    const nextErrors: Record<string, string> = {};
    if (!leadData.name.trim()) nextErrors.name = "Enter your name.";
    if (!leadData.businessName.trim()) nextErrors.businessName = "Enter the business name.";
    if (!leadData.email.trim() || !isValidEmail(leadData.email)) {
      nextErrors.email = "Enter a valid email.";
    }
    if (websiteUrl.trim()) {
      try {
        new URL(normalizeWebsiteUrl(websiteUrl));
      } catch {
        nextErrors.websiteUrl = "Enter a valid website URL or leave it blank.";
      }
    }
    return nextErrors;
  };

  const submitPrequalification = async () => {
    const nextErrors = validateQualify();
    setQualifyErrors(nextErrors);
    setSubmissionError("");

    if (Object.keys(nextErrors).length) return;

    const assessedUrl = websiteUrl.trim() || leadData.businessName.trim();
    const result = buildAuthorityAnalysis(assessedUrl, quizScore);
    setAiAnalysis(result);
    localStorage.setItem("aiAnalysis", JSON.stringify(result));
    localStorage.setItem("leadData", JSON.stringify(leadData));
    if (websiteUrl.trim()) localStorage.setItem("websiteUrl", websiteUrl.trim());

    setIsSubmitting(true);
    try {
      await submitLeadCapture({
        ...leadData,
        phone: leadData.phone.trim(),
        websiteUrl: websiteUrl.trim() ? normalizeWebsiteUrl(websiteUrl) : "",
        bestTime: quickLeadData.bestTime,
        notes: quickLeadData.notes,
        quizAnswers,
        quizScore,
        recommendedPackage: targetPackage || getRecommendedPackage(quizAnswers),
        assessment: result.assessment,
        killerInsight: result.killerInsight,
        serviceNeed: "melbourne-web-studio-growth-quiz",
        sourcePage: "melbournewebstudio.eb28.co",
        _subject: `Melbourne Web Studio growth quiz for ${
          leadData.businessName || leadData.name || "new lead"
        }`,
      });
      setFunnelStep("RESULTS");
    } catch (error) {
      console.error("Prequalification failed", error);
      setSubmissionError("We couldn't send this yet. Check the fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOnboarding = async () => {
    if (!selectedPackage) {
      setSubmissionError("Pick a package first so we can finish your brief correctly.");
      setFunnelStep("PRICING");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const generatedMockup = buildBlueprint({
        leadData,
        onboardingData,
        selectedPackage,
        websiteUrl,
        aiAnalysis,
      });

      await submitLeadCapture({
        ...leadData,
        ...onboardingData,
        selectedPackage: selectedPackage.name,
        packagePrice: selectedPackage.price,
        websiteUrl: normalizeWebsiteUrl(websiteUrl),
        quizScore,
        assessment: aiAnalysis?.assessment || "",
        killerInsight: aiAnalysis?.killerInsight || "",
        blueprint: generatedMockup,
        sourcePage: "melbournewebstudio.eb28.co",
        _subject: `Melbourne Web Studio project brief for ${leadData.businessName || leadData.name || "new lead"}`,
      });

      setMockup(generatedMockup);
      setFunnelStep("SUCCESS");
    } catch (e) {
      console.error("Onboarding failed", e);
      setSubmissionError("We couldn't send your project brief just yet. Please try again or book a strategy call.");
    }
    setIsSubmitting(false);
  };

  const renderQuiz = () => {
    const currentQuestion = quizQuestions[quizStep];
    const selectedValue = quizAnswers[currentQuestion.id] || "";
    const progress = ((quizStep + 1) / quizQuestions.length) * 100;

    return (
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            Free 60-Second Lead Leak Finder
          </div>
          <div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
              Find the spot where buyers stop short.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-600">
              Answer 4 quick questions. I&apos;ll show you the first fix I&apos;d make if the job
              was to turn more local visitors into calls, bookings, and quote requests.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Time", "About 60 seconds"],
              ["Built for", "Local service businesses"],
              ["Result", "Your first fix"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                MW
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  Melbourne Web Studio
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  {quizStep === 0 ? "1-minute check" : `Step ${quizStep + 1} - ${currentQuestion.shortLabel}`}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right text-xs font-black text-slate-500">
              {Math.round(progress)}%
            </p>
          </div>

          <div className="h-1.5 bg-slate-100">
            <motion.div
              className="h-full bg-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>

          <div className="p-5 md:p-8">
            {quizStep === 0 && (
              <div className="mb-4 rounded-lg border-l-2 border-amber-300 bg-amber-50/40 px-3 py-2.5">
                <p className="text-[13px] font-black leading-tight text-slate-950">
                  If the right people cannot find you, believe you, or get a fast answer, they
                  do not wait. They call the next business that feels easier to trust.
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  <span>Takes 1 minute</span>
                  <span className="text-amber-500" aria-hidden="true">•</span>
                  <span>No sales trap</span>
                  <span className="text-amber-500" aria-hidden="true">•</span>
                  <span>Plain answer</span>
                </div>
              </div>
            )}

            {quizStep > 0 && (
              <button
                type="button"
                onClick={handleQuizBack}
                className="mb-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            )}

            <fieldset>
              <legend className="text-2xl font-black leading-tight text-slate-950 md:text-3xl">
                {currentQuestion.question}
              </legend>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                {currentQuestion.subtext}
              </p>

              <div className="mt-5 space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedValue === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleQuizSelect(currentQuestion.id, option.value)}
                      className={`relative flex w-full items-start gap-3 rounded-xl border-[3px] p-4 text-left transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-300/30 ${
                        isSelected
                          ? "border-amber-400 bg-amber-50 text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/40"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-slate-950 bg-slate-950 text-amber-300"
                            : "border-slate-300 bg-slate-50 text-slate-400"
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-black leading-snug text-slate-950">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-sm font-medium leading-snug text-slate-500">
                          {option.helper}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleQuizContinue}
                disabled={!selectedValue}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-black transition-all ${
                  selectedValue
                    ? "bg-amber-400 text-slate-950 shadow-md hover:-translate-y-0.5 hover:bg-amber-500"
                    : "cursor-not-allowed bg-slate-100 text-slate-500"
                }`}
              >
                {quizStep === quizQuestions.length - 1 ? "Show Me The First Fix" : "Next Question"}
                {selectedValue && <ArrowRight className="h-5 w-5" />}
              </button>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                <span>No sales pressure</span>
                <span className="text-amber-500" aria-hidden="true">•</span>
                <span>No canned PDF</span>
                <span className="text-amber-500" aria-hidden="true">•</span>
                <span>One useful answer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScan = () => (
    <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white text-center shadow-2xl">
      {!isScanning && !scanProgress ? (
        <div className="max-w-xl mx-auto">
          <h3 className="text-3xl font-bold mb-6">Want me to look at the actual page?</h3>
          <p className="text-slate-400 mb-10">
            Add your website if you have one. I&apos;ll look at it the way a buyer does before
            they decide to call, book, or keep comparing.
          </p>
          <div className="relative mb-6">
            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-5 pl-14 pr-6 font-bold text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={startScan}
            disabled={!websiteUrl}
            className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            Check My Page
          </button>
        </div>
      ) : (
        <div>
          <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <Search className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-3xl font-bold mb-4">Scanning {websiteUrl}...</h3>
          <p className="text-slate-400 mb-10 font-mono text-sm">{scanStatus}</p>
          <div className="max-w-md mx-auto">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scanProgress}%` }}
                className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-blue-600/5 opacity-50"></div>
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/3">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px]">
                First Fix Ready
              </span>
            </div>
            <h3 className="text-4xl font-bold mb-6 tracking-tight leading-tight">
              {aiAnalysis?.title}
            </h3>

            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl mb-8 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Customer Confidence Score
              </p>
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-8 h-8 ${
                      i <= (aiAnalysis?.rating || 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-700"
                    }`}
                  />
                ))}
              </div>
              <div className="text-5xl font-black text-white mb-2">
                {aiAnalysis?.rating}.0<span className="text-slate-600">/5</span>
              </div>
              <p className="text-xs text-slate-400">
                Prepared for {websiteUrl ? getDomainLabel(websiteUrl) : leadData.businessName || "your business"}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setFunnelStep("PRICING")}
                className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3"
              >
                Show Me The Best Path <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.open(DISCOVERY_CALL_URL, "_blank")}
                className="w-full bg-white text-slate-900 font-bold py-5 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                Talk Through The Fix <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 space-y-8">
            <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/30 p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-xl font-bold">The First Thing I Would Fix</h4>
              </div>
              <p className="text-blue-100 text-lg italic leading-relaxed">
                &quot;{aiAnalysis?.killerInsight}&quot;
              </p>
            </div>

            <div className="bg-slate-800/30 border border-slate-700 p-8 rounded-3xl">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" /> Where The Sale May Be Slipping Away
              </h4>
              <p className="text-slate-400 leading-relaxed text-lg">{aiAnalysis?.assessment}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-800/30 border border-slate-700 p-8 rounded-3xl">
                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">
                  Moves I Would Make First
                </h4>
                <div className="space-y-4">
                  {aiAnalysis?.priorityFixes?.map((fix: string, i: number) => {
                    const pkgName = getFixPackage(fix);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-4 bg-slate-800/20 p-4 rounded-2xl border border-slate-700/50 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <span className="text-slate-300 font-medium text-sm leading-tight">
                            {fix}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setTargetPackage(pkgName);
                            setFunnelStep("PRICING");
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap flex items-center gap-1 shrink-0"
                        >
                          Fix{" "}
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700 p-8 rounded-3xl flex flex-col justify-center items-center text-center">
                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">
                  Size Of The Opening
                </h4>
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-700"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={364.4}
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{
                        strokeDashoffset:
                          364.4 - (364.4 * (aiAnalysis?.competitiveEdge || 0)) / 100,
                      }}
                      className="text-blue-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black">{aiAnalysis?.competitiveEdge}%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  A directional read on how much room your site has to make a stronger first
                  impression.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-slate-800">
          <h4 className="text-center text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-12">
            What I Would Do First
          </h4>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 hidden md:block"></div>
            {[
              {
                day: "Day 1-30",
                title: "Make the first impression pay",
                desc: "Clarify the offer, proof, and next step so buyers know why to choose you.",
              },
              {
                day: "Day 31-60",
                title: "Get found by better buyers",
                desc: "Build local search signals and proof around the terms your best customers use.",
              },
              {
                day: "Day 61-90",
                title: "Stop letting leads cool off",
                desc: "Tighten intake and follow-up so interest turns into booked work faster.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="relative z-10 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center"
              >
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4 shadow-lg shadow-blue-900/40">
                  {i + 1}
                </div>
                <h5 className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-1">
                  {step.day}
                </h5>
                <h6 className="font-bold mb-2">{step.title}</h6>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderQualify = () => (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
      <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
          Final step
        </p>
        <h3 className="mt-3 text-3xl font-black leading-tight tracking-tight">
          Want me to tell you where the money is leaking?
        </h3>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
          Send your answers. I&apos;ll look at it like a customer would and reply with the first
          move I&apos;d make to get more good people to contact you.
        </p>
        <div className="mt-8 space-y-3">
          {[
            "A human answer, not a template",
            "The fix I would make first",
            "Email first. Phone only if you add it",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-300" />
              <span className="text-sm font-bold text-white">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70 md:p-8">
        <div className="mb-5 rounded-2xl border-2 border-blue-200 bg-blue-50/80 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">
                Send me the fix
              </p>
              <h4 className="mt-1 text-xl font-black leading-tight text-slate-950">
                Where should I send your first-fix note?
              </h4>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="growth-name" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
              Your name
            </label>
            <input
              id="growth-name"
              type="text"
              autoComplete="name"
              value={leadData.name}
              onChange={(e) => {
                setLeadData({ ...leadData, name: e.target.value });
                setQualifyErrors((prev) => ({ ...prev, name: "" }));
              }}
              className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:ring-4 focus:ring-amber-300/25 ${
                qualifyErrors.name ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-amber-400"
              }`}
              placeholder="Your name"
            />
            {qualifyErrors.name && <p className="mt-1 text-xs font-semibold text-red-600">{qualifyErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="growth-business" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
              Business name
            </label>
            <input
              id="growth-business"
              type="text"
              autoComplete="organization"
              value={leadData.businessName}
              onChange={(e) => {
                setLeadData({ ...leadData, businessName: e.target.value });
                setQualifyErrors((prev) => ({ ...prev, businessName: "" }));
              }}
              className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:ring-4 focus:ring-amber-300/25 ${
                qualifyErrors.businessName ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-amber-400"
              }`}
              placeholder="Business name"
            />
            {qualifyErrors.businessName && (
              <p className="mt-1 text-xs font-semibold text-red-600">{qualifyErrors.businessName}</p>
            )}
          </div>

          <div>
            <label htmlFor="growth-email" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
              Best email
            </label>
            <input
              id="growth-email"
              type="email"
              autoComplete="email"
              value={leadData.email}
              onChange={(e) => {
                setLeadData({ ...leadData, email: e.target.value });
                setQualifyErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:ring-4 focus:ring-amber-300/25 ${
                qualifyErrors.email ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-amber-400"
              }`}
              placeholder="you@business.com"
            />
            {qualifyErrors.email && <p className="mt-1 text-xs font-semibold text-red-600">{qualifyErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="growth-phone" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
              Phone optional
            </label>
            <input
              id="growth-phone"
              type="tel"
              autoComplete="tel"
              value={leadData.phone}
              onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:border-amber-400 focus:ring-4 focus:ring-amber-300/25"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="growth-website" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
              Website optional
            </label>
            <input
              id="growth-website"
              type="text"
              autoComplete="url"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setQualifyErrors((prev) => ({ ...prev, websiteUrl: "" }));
              }}
              className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:ring-4 focus:ring-amber-300/25 ${
                qualifyErrors.websiteUrl ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-amber-400"
              }`}
              placeholder="yourbusiness.com"
            />
            {qualifyErrors.websiteUrl && (
              <p className="mt-1 text-xs font-semibold text-red-600">{qualifyErrors.websiteUrl}</p>
            )}
          </div>

          <div>
            <label htmlFor="growth-best-time" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
              Best time to reply
            </label>
            <select
              id="growth-best-time"
              value={quickLeadData.bestTime}
              onChange={(e) => setQuickLeadData({ ...quickLeadData, bestTime: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:border-amber-400 focus:ring-4 focus:ring-amber-300/25"
            >
              <option value="">Anytime</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="growth-notes" className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
            What do you think is costing you customers?
          </label>
          <textarea
            id="growth-notes"
            rows={3}
            value={quickLeadData.notes}
            onChange={(e) => setQuickLeadData({ ...quickLeadData, notes: e.target.value })}
            className="w-full resize-none rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none transition-all focus:border-amber-400 focus:ring-4 focus:ring-amber-300/25"
            placeholder="Example: We need more booked jobs, the site feels old, or better leads keep choosing someone else."
          />
        </div>

        {submissionError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {submissionError}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={submitPrequalification}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-4 text-base font-black text-slate-950 shadow-md transition-all hover:-translate-y-0.5 hover:bg-amber-500 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Me The First Fix"}
            {!isSubmitting && <ArrowRight className="h-5 w-5" />}
          </button>
          <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            I&apos;ll reply by email. If you leave the phone blank, I won&apos;t call.
          </p>
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-8">
      <div className="text-center mb-12">
        {leadData.name && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold mb-6 border border-blue-100"
          >
            <RefreshCw className="w-3 h-3" /> Welcome Back, {leadData.name.split(" ")[0]}! Your
            progress has been restored.
          </motion.div>
        )}
        <h3 className="text-3xl font-bold text-slate-900 mb-4">
          Choose the path you want priced.
        </h3>
        <p className="text-slate-500">
          Based on your answers, this is the practical next step for{" "}
          {leadData.businessName || "your business"}. Choose the path that feels right and
          I&apos;ll turn it into a clear scope, timeline, and next step.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            name: "The Professional Build",
            price: 800,
            type: "One-Time",
            features: ["Custom Design", "Mobile-First", "SEO Ready", "Fast Load Times"],
            color: "slate",
          },
          {
            name: "The Power Foundation",
            price: 80,
            type: "Monthly",
            features: [
              "Managed Hosting",
              "Active SEO",
              "GBP Optimization",
              "Unlimited Updates",
            ],
            color: "blue",
          },
          {
            name: "AI Business Suite",
            price: 170,
            type: "Monthly",
            features: [
              "Front of House AI",
              "Media Buyer AI",
              "Fund Manager AI",
              "24/7 Automation",
            ],
            color: "ai",
          },
        ].map((pkg, i) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -10, scale: 1.02 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col relative overflow-hidden group ${
              pkg.name === "AI Business Suite"
                ? "bg-slate-900 text-white border-blue-500/30 shadow-2xl shadow-blue-900/20"
                : pkg.name === targetPackage ||
                    (pkg.name === "The Power Foundation" && !targetPackage)
                  ? "bg-white border-blue-600 shadow-2xl z-10"
                  : "bg-white border-slate-100 shadow-sm"
            }`}
          >
            {pkg.name === "AI Business Suite" && (
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
            )}

            {(pkg.name === targetPackage ||
              (pkg.name === "The Power Foundation" && !targetPackage)) && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-20">
                Likely Best Fit
              </div>
            )}

            {pkg.name === "AI Business Suite" && (
              <div className="absolute top-6 right-6">
                <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            )}

            <div className="mb-8 relative z-10">
              <h4
                className={`text-xl font-bold mb-2 ${
                  pkg.name === "AI Business Suite" ? "text-white" : "text-slate-900"
                }`}
              >
                {pkg.name}
              </h4>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl font-black ${
                    pkg.name === "AI Business Suite" ? "text-white" : "text-slate-900"
                  }`}
                >
                  ${pkg.price}
                </span>
                <span
                  className={`${
                    pkg.name === "AI Business Suite" ? "text-slate-400" : "text-slate-400"
                  } font-bold text-sm`}
                >
                  {pkg.type === "Monthly" ? "/mo" : "one-time"}
                </span>
              </div>
            </div>
            <div className="space-y-4 mb-10 flex-1 relative z-10">
              {pkg.features.map((f) => (
                <div
                  key={f}
                  className={`flex items-center gap-3 text-sm ${
                    pkg.name === "AI Business Suite" ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      pkg.name === "AI Business Suite" ? "text-blue-400" : "text-blue-500"
                    }`}
                  />{" "}
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handlePackageSelection(pkg)}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 relative z-10 ${
                pkg.name === "AI Business Suite"
                  ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40"
                  : pkg.name === "The Power Foundation" || pkg.name === targetPackage
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Build My Project Brief <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderOnboarding = () => (
    <div className="bg-white rounded-[2.5rem] p-10 md:p-16 border border-slate-200 shadow-xl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">Tell me what this needs to win.</h3>
        </div>
        <p className="text-slate-500 mb-10 text-lg">
          Give me the basics for {selectedPackage?.name || "your project"}. I&apos;ll turn it into
          a practical brief and follow up with scope, timing, and the cleanest way to get moving.
        </p>

        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                What kind of business is it?
              </label>
              <input
                type="text"
                value={onboardingData.industry}
                onChange={(e) => setOnboardingData({ ...onboardingData, industry: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:border-blue-600 outline-none transition-all"
                placeholder="e.g. roofing, med spa, restaurant, law firm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Who is the best customer?
              </label>
              <input
                type="text"
                value={onboardingData.targetAudience}
                onChange={(e) =>
                  setOnboardingData({ ...onboardingData, targetAudience: e.target.value })
                }
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:border-blue-600 outline-none transition-all"
                placeholder="e.g. homeowners, parents, business owners"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              What should this help you sell?
            </label>
            <textarea
              value={onboardingData.goals}
              onChange={(e) => setOnboardingData({ ...onboardingData, goals: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:border-blue-600 outline-none transition-all resize-none"
              rows={3}
              placeholder="Tell me the calls, bookings, applications, or quote requests you want more of."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              How should it feel?
            </label>
            <input
              type="text"
              value={onboardingData.brandVoice}
              onChange={(e) => setOnboardingData({ ...onboardingData, brandVoice: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:border-blue-600 outline-none transition-all"
              placeholder="e.g. premium, local, tough, clean, family-owned"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              What must be included?
            </label>
            <textarea
              value={onboardingData.features}
              onChange={(e) => setOnboardingData({ ...onboardingData, features: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:border-blue-600 outline-none transition-all resize-none"
              rows={3}
              placeholder="e.g. booking, quote form, financing page, reviews, before-and-after photos"
            />
          </div>
          <button
            onClick={submitOnboarding}
            disabled={isSubmitting || !onboardingData.industry || !onboardingData.goals}
            className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Send My Project Brief <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>
          {submissionError && <p className="text-sm text-red-500">{submissionError}</p>}
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-emerald-600/10 opacity-50"></div>
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-4xl font-bold mb-4">I got your brief.</h3>
          <p className="text-slate-400 text-lg">
            The working plan is below, and I&apos;ll follow up at {leadData.email} with the next
            step.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 md:p-12 rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <Layout className="w-6 h-6 text-blue-400" />
            <h4 className="text-2xl font-bold">Your Working Plan</h4>
          </div>
          <div className="prose prose-invert max-w-none">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50 font-mono text-sm leading-relaxed whitespace-pre-wrap text-blue-100">
              {mockup}
            </div>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <Target className="w-5 h-5 text-blue-400 mb-3" />
              <h5 className="font-bold text-sm mb-1">The goal is clear</h5>
              <p className="text-xs text-slate-500">
                The plan is tied to the outcome you want from the site.
              </p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <Palette className="w-5 h-5 text-emerald-400 mb-3" />
              <h5 className="font-bold text-sm mb-1">The first impression matters</h5>
              <p className="text-xs text-slate-500">
                The page needs to make the right buyer feel safe taking the next step.
              </p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <Smartphone className="w-5 h-5 text-amber-400 mb-3" />
              <h5 className="font-bold text-sm mb-1">Mobile comes first</h5>
              <p className="text-xs text-slate-500">
                Most buyers will judge it on a phone before they ever call.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-400 mb-6">
            I&apos;ll review this brief within 24 hours and send the right scope, timeline, and
            secure payment options for {selectedPackage?.name || "your project"}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.open(DISCOVERY_CALL_URL, "_blank")}
              className="bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-blue-500 transition-all flex items-center gap-2"
            >
              Book A Strategy Call <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const blob = new Blob([mockup], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${(leadData.businessName || "melbourne-project-brief").replace(/\s+/g, "-").toLowerCase()}.txt`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-white/10 backdrop-blur-md text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2"
            >
              Download The Plan <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section id="quiz" className="bg-slate-50 px-4 py-10 md:px-6 md:py-16">
      <motion.div
        className="mx-auto w-full max-w-7xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {funnelStep === "QUIZ" && renderQuiz()}
        {funnelStep === "SCAN" && renderScan()}
        {funnelStep === "RESULTS" && renderResults()}
        {funnelStep === "QUALIFY" && renderQualify()}
        {funnelStep === "PRICING" && renderPricing()}
        {funnelStep === "ONBOARDING" && renderOnboarding()}
        {funnelStep === "SUCCESS" && renderSuccess()}
      </motion.div>
    </section>
  );
};

const BlogQuiz = ({
  questions,
  title,
  category,
}: {
  questions: any[];
  title: string;
  category: string;
}) => {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (isYes: boolean) => {
    if (isYes) setScore((prev) => prev + 1);
    if (step < questions.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const getResult = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage <= 33) {
      return {
        title: "Novice Explorer",
        desc: `You're just starting your journey in ${category}. There's a lot of potential waiting to be unlocked!`,
        color: "from-slate-400 to-slate-600",
      };
    }
    if (percentage <= 66) {
      return {
        title: "Competent Strategist",
        desc: `You have a solid grasp of ${category} principles. A few more optimizations and you'll be a leader.`,
        color: "from-blue-400 to-blue-600",
      };
    }
    return {
      title: "Master Authority",
      desc: `Impressive! You're a true authority in ${category}. You're setting the standard for Melbourne businesses.`,
      color: "from-emerald-400 to-emerald-600",
    };
  };

  const result = getResult();

  if (showResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-3xl p-8 text-white text-center relative overflow-hidden mt-12"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${result.color} opacity-10`}></div>
        <div className="relative z-10">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h4 className="text-2xl font-bold mb-2">{result.title}</h4>
          <p className="text-slate-400 text-sm mb-6">{result.desc}</p>
          <button
            onClick={() => {
              setStep(0);
              setScore(0);
              setShowResult(false);
            }}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> Retake Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 mt-12">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h4 className="font-bold text-slate-900">Article Quiz: {title}</h4>
      </div>
      <div className="mb-6">
        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
      <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-lg font-bold text-slate-900 mb-4">{questions[step].q}</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all"
          >
            Yes
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 bg-white text-slate-900 border border-slate-200 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
          >
            No
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeError("");
    if (email && isValidEmail(email)) {
      setIsSubmitting(true);
      try {
        await submitLeadCapture({
          email,
          serviceNeed: "melbourne-growth-newsletter",
          sourcePage: "melbournewebstudio.eb28.co",
          _subject: "Melbourne Web Studio newsletter signup",
        });
        setIsSubscribed(true);
        setEmail("");
        setTimeout(() => setIsSubscribed(false), 5000);
      } catch (error) {
        console.error("Newsletter signup failed", error);
        setSubscribeError("We couldn't save your email. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setSubscribeError("Please enter a valid email address.");
    }
  };

  return (
    <section className="px-6 py-24 bg-blue-600 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-300 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-6">
              <Mail className="w-4 h-4 text-white" />
              <span className="text-xs font-black text-white uppercase tracking-widest">
                Growth Newsletter
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
              Get Local Growth Strategies <span className="text-blue-200">Delivered Weekly.</span>
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed max-w-xl">
              No spam. Just actionable insights on SEO, AI automation, and web design specifically
              for Melbourne business owners.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-white/20 shadow-2xl">
            {isSubscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">You&apos;re on the list!</h3>
                <p className="text-blue-100">
                  Check your inbox for your first growth strategy.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-5 pl-14 pr-6 font-bold text-white placeholder:text-blue-200 focus:border-white outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-blue-600 font-bold py-5 rounded-2xl hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 group"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Join 500+ Local Owners
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                {subscribeError && <p className="text-center text-sm text-red-100">{subscribeError}</p>}
                <p className="text-center text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                  Join the Space Coast&apos;s most exclusive business community.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Resources = () => {
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const posts = [
    {
      title: "5 Web Design Tips for Melbourne Small Businesses",
      excerpt:
        "Your website is your digital storefront. Learn how to make it high-converting and mobile-friendly for local customers.",
      takeaways: [
        "Mobile-first design is essential",
        "Clear CTAs drive conversions",
        "Local social proof builds trust",
        "Speed optimization is critical",
        "Authentic imagery humanizes your brand",
      ],
      quiz: [
        { q: "Is your website fully responsive on mobile?", desc: "" },
        { q: "Do you have a clear CTA on your homepage?", desc: "" },
        { q: "Are you using real photos of your business?", desc: "" },
      ],
      content: `
        <p class="lead">In today's digital-first economy, your website is often the first point of contact between your business and a potential customer. For small businesses in Melbourne, FL, standing out requires more than just a pretty layout—it requires a strategic approach to design that prioritizes user experience and conversion.</p>

        <div class="bg-blue-50 border-l-4 border-blue-600 p-8 my-10 rounded-r-[2rem] shadow-sm">
          <p class="text-blue-900 font-bold text-xl italic leading-relaxed">"A website that doesn't convert is just an expensive digital brochure. We build growth engines that work while you sleep."</p>
          <p class="text-blue-600 text-sm font-black uppercase tracking-widest mt-4">— Rich Ducat, Founder</p>
        </div>

        <h2>1. Mobile-First is Non-Negotiable</h2>
        <p>Over 60% of local searches happen on mobile devices. If your site doesn't load quickly or look perfect on a smartphone, you're losing leads before they even see what you offer. We build every site with a mobile-first philosophy, ensuring seamless navigation on any screen size.</p>

        <div class="grid md:grid-cols-2 gap-8 my-12">
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 class="font-bold text-slate-900 mb-2">The 3-Second Rule</h4>
            <p class="text-sm text-slate-600">If your mobile site takes longer than 3 seconds to load, 53% of visitors will abandon it. Speed is your first impression.</p>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 class="font-bold text-slate-900 mb-2">Thumb-Friendly Design</h4>
            <p class="text-sm text-slate-600">Buttons and links must be easy to tap with one hand. We prioritize the "thumb zone" for all critical actions.</p>
          </div>
        </div>

        <h2>2. Clear Calls to Action (CTAs)</h2>
        <p>Don't make your visitors guess what to do next. Whether it's "Book a Consultation," "Call Now," or "Get a Free Quote," your CTAs should be prominent, clear, and strategically placed throughout the page.</p>

        <p>A high-converting site uses contrasting colors for buttons and direct language that tells the user exactly what value they'll receive by clicking.</p>

        <h2>3. Local Social Proof</h2>
        <p>Melbourne is a tight-knit community. Highlighting testimonials from other local business owners or recognizable Space Coast landmarks builds immediate trust. People want to know you're a real part of the community.</p>

        <ul>
          <li><strong>Video Testimonials:</strong> Seeing a real person talk about their success is 10x more powerful than text.</li>
          <li><strong>Local Badges:</strong> Displaying your Melbourne Chamber of Commerce membership or local awards.</li>
          <li><strong>Case Studies:</strong> Showing real data from local projects (like our <a href="#case-studies">Successful Projects</a> section).</li>
        </ul>

        <h2>4. Speed is a Feature</h2>
        <p>A one-second delay in page load time can lead to a 7% reduction in conversions. We optimize every image and line of code to ensure your site is lightning-fast, keeping both users and Google happy.</p>

        <h2>5. Authentic Imagery</h2>
        <p>Stock photos are fine, but authentic photos of your team, your office, or your work in action are far more powerful. They humanize your brand and show customers exactly who they'll be working with.</p>

        <p>In Melbourne, showing your team at the beach or near the causeway creates an instant local connection that stock photos of generic office buildings can't match.</p>
      `,
      category: "Web Design",
      date: "Mar 28, 2026",
      readTime: "5 min read",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "SEO Best Practices for 2026: Dominating Local Search",
      excerpt:
        "Google Business Profile, local keywords, and fast load times. Everything you need to stay at the top of the map.",
      takeaways: [
        "Optimize your GBP profile",
        "Focus on 'near me' intent",
        "Monitor Core Web Vitals",
        "Build local Space Coast backlinks",
        "Create community-focused content",
      ],
      quiz: [
        { q: "Is your NAP consistent across the web?", desc: "" },
        { q: "Do you respond to all Google reviews?", desc: "" },
        { q: "Is your site optimized for 'near me' searches?", desc: "" },
      ],
      content: `
        <p class="lead">Local SEO is the lifeblood of service-based businesses. If you're a roofer in Melbourne or a plumber in Palm Bay, you need to be the first name people see when they search for your services. Here's how to dominate local search in 2026.</p>

        <div class="bg-slate-900 text-white p-10 my-12 rounded-[3rem] relative overflow-hidden shadow-2xl">
          <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div class="relative z-10">
            <h4 class="text-2xl font-bold mb-4 flex items-center gap-2">
              <span class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">!</span>
              The Map Pack Secret
            </h4>
            <p class="text-slate-400 text-lg leading-relaxed">The 'Map Pack' accounts for nearly 45% of all clicks on local search results. If you're not in the top 3, you're missing half your potential traffic. Our <a href="#pricing" class="text-blue-400 hover:text-blue-300 underline">Power Foundation</a> package is designed specifically to get you there.</p>
          </div>
        </div>

        <h2>1. Optimize Your Google Business Profile</h2>
        <p>Your Google Business Profile (GBP) is often more important than your actual website for local discovery. Ensure your NAP (Name, Address, Phone) is consistent everywhere, post regular updates, and actively encourage customer reviews.</p>

        <h2>2. Focus on "Near Me" Keywords</h2>
        <p>Search intent has shifted. People aren't just searching for "plumbers"; they're searching for "best plumber near me" or "emergency roofer Melbourne FL." Your content should naturally incorporate these local identifiers.</p>

        <h2>3. Core Web Vitals Matter</h2>
        <p>Google's ranking algorithm heavily weighs user experience. This includes how fast your page loads, how quickly it becomes interactive, and how stable the layout is as it loads. Technical SEO is the foundation of your search rankings.</p>

        <h2>4. High-Quality Local Backlinks</h2>
        <p>A link from the Melbourne Regional Chamber or a local news outlet like Florida Today carries significant weight for local SEO. It signals to Google that you are a relevant and trusted authority in the Space Coast area.</p>

        <h2>5. Content for the Community</h2>
        <p>Write about local events, local challenges, or local regulations. This not only helps with SEO but also positions you as an expert who truly understands the Melbourne market.</p>
      `,
      category: "SEO",
      date: "Mar 22, 2026",
      readTime: "8 min read",
      image:
        "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "Digital Marketing Trends: Why AI Agents are the Future",
      excerpt:
        "Automating lead qualification and 24/7 customer service. See how AI is changing the game for local business owners.",
      takeaways: [
        "24/7 lead qualification is now possible",
        "Hyper-personalization at scale",
        "Predictive analytics for service timing",
        "AI-assisted content generation",
        "Seamless CRM automation",
      ],
      quiz: [
        { q: "Do you capture leads after business hours?", desc: "" },
        { q: "Is your CRM updated automatically?", desc: "" },
        { q: "Do you use AI for any marketing tasks?", desc: "" },
      ],
      content: `
        <p class="lead">The marketing landscape is shifting rapidly, and AI is at the forefront. For local business owners, AI isn't about replacing people—it's about augmenting your team and ensuring you never miss a lead again.</p>

        <blockquote class="border-l-8 border-blue-600 pl-8 my-12 py-4 bg-slate-50 rounded-r-3xl">
          <p class="text-3xl font-bold text-slate-900 leading-tight tracking-tight">"AI is the great equalizer for small businesses. It gives you the bandwidth of a Fortune 500 company at a fraction of the cost."</p>
          <cite class="text-blue-600 font-black uppercase tracking-widest text-sm mt-4 block">— Alex, Head of AI Operations</cite>
        </blockquote>

        <h2>1. 24/7 Autonomous Lead Qualification</h2>
        <p>Most leads come in after hours. An AI agent can engage with a potential customer at 2 AM, answer their questions, and even book a discovery call for you. By the time you wake up, the lead is already pre-qualified and on your calendar.</p>

        <p>Our <a href="#pricing">AI Business Suite</a> includes the "Front of House" agent which handles this exact workflow seamlessly.</p>

        <h2>2. Hyper-Personalized Marketing</h2>
        <p>AI can analyze customer data to deliver highly personalized messages. Instead of a generic blast, your customers receive offers and information that are specifically relevant to their needs and past interactions.</p>

        <h2>3. Predictive Analytics</h2>
        <p>AI can help you predict when a customer might need your services again. For example, a landscaping business can use AI to identify when a lawn might need seasonal treatment based on local weather patterns and past service dates.</p>

        <h2>4. Content Generation at Scale</h2>
        <p>Creating consistent blog posts and social media updates is time-consuming. AI tools can help you brainstorm ideas, draft outlines, and even generate initial drafts that your team can then refine and polish.</p>

        <h2>5. Seamless CRM Integration</h2>
        <p>Our AI Business Suite integrates directly with your CRM, ensuring that every interaction is logged and every follow-up is automated. It's the ultimate tool for maintaining a high-touch feel without the manual labor.</p>
      `,
      category: "Marketing",
      date: "Mar 15, 2026",
      readTime: "6 min read",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    },
  ];

  const relatedPosts =
    selectedPost !== null ? posts.filter((_, i) => i !== selectedPost).slice(0, 2) : [];

  if (selectedPost !== null) {
    const post = posts[selectedPost];
    return (
      <section id="resources" className="px-6 py-24 bg-white min-h-screen relative">
        <div className="fixed top-0 left-0 w-full h-1 z-50 bg-slate-100">
          <motion.div className="h-full bg-blue-600" style={{ width: `${scrollProgress}%` }} />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_300px] gap-16">
            <div className="max-w-4xl">
              <button
                onClick={() => {
                  setSelectedPost(null);
                  window.scrollTo({
                    top: document.getElementById("resources")?.offsetTop || 0,
                    behavior: "smooth",
                  });
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold mb-12 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Resources
              </button>

              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                  {post.category}
                </span>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {post.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {post.readTime}
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-8 tracking-tight leading-tight">
                {post.title}
              </h1>

              <div className="relative h-[400px] rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl shadow-slate-200">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div
                className="prose prose-slate prose-lg max-w-none
                  prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight
                  prose-p:text-slate-600 prose-p:leading-relaxed
                  prose-strong:text-slate-900 prose-strong:font-bold
                  prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8
                  prose-a:text-blue-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                  prose-li:text-slate-600
                  prose-img:rounded-[2.5rem] prose-img:shadow-2xl
                "
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              <div className="mt-16 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Enjoyed this article?</h4>
                  <p className="text-slate-500 text-sm">
                    Share it with your network or head back to our resources.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setSelectedPost(null);
                      window.scrollTo({
                        top: document.getElementById("resources")?.offsetTop || 0,
                        behavior: "smooth",
                      });
                    }}
                    className="bg-white text-slate-900 border border-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-50 transition-all text-sm"
                  >
                    Back to Blog
                  </button>
                  <button
                    onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                    className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-100"
                  >
                    Get Help with This
                  </button>
                </div>
              </div>

              <BlogQuiz questions={post.quiz} title={post.title} category={post.category} />

              <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap items-center gap-6">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Share2 className="w-3 h-3" /> Share this article
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                      )
                    }
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-100"
                  >
                    <Facebook className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`,
                        "_blank",
                      )
                    }
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-sky-500 hover:text-white transition-all border border-slate-100"
                  >
                    <Twitter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
                        "_blank",
                      )
                    }
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-700 hover:text-white transition-all border border-slate-100"
                  >
                    <Linkedin className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-32 space-y-8">
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" /> Key Takeaways
                  </h4>
                  <ul className="space-y-4">
                    {post.takeaways.map((t, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-600 rounded-3xl p-8 text-white">
                  <h4 className="font-bold mb-4">Need help with this?</h4>
                  <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                    Our Melbourne team specializes in implementing these exact strategies for local
                    businesses.
                  </p>
                  <button
                    onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full bg-white text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition-all text-sm"
                  >
                    Free Strategy Session
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-20 pt-12 border-t border-slate-100">
            <h4 className="text-2xl font-bold text-slate-900 mb-8">Related Articles</h4>
            <div className="grid sm:grid-cols-2 gap-8">
              {relatedPosts.map((rp, i) => (
                <div
                  key={i}
                  className="group cursor-pointer"
                  onClick={() => {
                    const index = posts.findIndex((p) => p.title === rp.title);
                    setSelectedPost(index);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
                    <img
                      src={rp.image}
                      alt={rp.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h5 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {rp.title}
                  </h5>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 pt-12 border-t border-slate-100">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                  Ready to implement these strategies?
                </h2>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                  Don&apos;t let your competition outpace you. Let&apos;s build a digital
                  strategy that actually works for your Melbourne business.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => {
                      setSelectedPost(null);
                      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="bg-blue-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
                  >
                    Get a Free Strategy Session
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                    className="bg-white/10 backdrop-blur-md text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all border border-white/10"
                  >
                    Chat with Alex
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="resources" className="px-6 py-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-black text-blue-600 uppercase tracking-[0.2em]">
                Knowledge Base
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Resources for Growth
            </h2>
            <p className="text-slate-600 mt-4 text-lg leading-relaxed">
              Expert insights, local SEO strategies, and the latest in AI automation. We share what
              we know to help your Melbourne business thrive.
            </p>
          </div>
          <button
            onClick={() => {
              window.scrollTo({
                top: document.getElementById("resources")?.offsetTop || 0,
                behavior: "smooth",
              });
            }}
            className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all group"
          >
            View All Articles <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-16 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">
                Static SEO library
              </span>
              <h3 className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">
                New crawlable guides for local search growth
              </h3>
              <p className="mt-3 text-slate-600 max-w-2xl">
                These articles are published as static pages on eb28.co so Google can crawl,
                index, and measure them in Search Console.
              </p>
            </div>
            <a
              href="/blog/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Open Blog <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Melbourne FL Web Design Cost Guide",
                href: "/blog/melbourne-fl-web-design-cost-guide-2026/",
                text: "Pricing, scope, and ROI signals for local businesses comparing website builders.",
              },
              {
                title: "Local SEO Map Pack Checklist",
                href: "/blog/local-seo-map-pack-melbourne-fl/",
                text: "Google Business Profile, reviews, citations, and website signals working together.",
              },
              {
                title: "Website Conversion Checklist",
                href: "/blog/website-conversion-checklist-melbourne-fl/",
                text: "Above-the-fold clarity, speed, proof, forms, and follow-up for more qualified leads.",
              },
            ].map((article) => (
              <a
                key={article.href}
                href={article.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <h4 className="font-bold text-slate-900 leading-tight">{article.title}</h4>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{article.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-600">
                  Read guide <ArrowRight className="w-3 h-3" />
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
              onClick={() => {
                setSelectedPost(i);
                window.scrollTo({
                  top: document.getElementById("resources")?.offsetTop || 0,
                  behavior: "smooth",
                });
              }}
            >
              <div className="relative h-56 rounded-3xl overflow-hidden mb-6 shadow-sm group-hover:shadow-xl transition-all duration-500">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20 shadow-sm">
                    {post.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> {post.date}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {post.readTime}
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                {post.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs group-hover:gap-3 transition-all">
                Read Full Article <ArrowRight className="w-3 h-3" />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-white px-6 py-16">
    <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-2">
        <div className="flex flex-col mb-6">
          <span className="font-bold text-2xl tracking-tighter">MELBOURNE</span>
          <span className="text-sm font-medium text-slate-400 -mt-1 tracking-widest">
            WEB STUDIO
          </span>
          <a
            href="https://eb28.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-blue-400/30 uppercase tracking-[0.2em] mt-1 hover:text-blue-400 transition-colors"
          >
            powered by eb28.co
          </a>
        </div>
        <p className="text-slate-400 max-w-xs mb-6">
          Helping local businesses thrive in the digital world with professional, high-converting
          websites.
        </p>
        <div className="flex gap-4">
          <Mail className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white transition-colors" />
          <MessageSquare className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white transition-colors" />
          <MapPin className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>
      <div>
        <h4 className="font-bold mb-6">Quick Links</h4>
        <ul className="space-y-4 text-slate-400 text-sm">
          <li>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
          </li>
          <li>
            <a href="#case-studies" className="hover:text-white transition-colors">
              Case Studies
            </a>
          </li>
          <li>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </li>
          <li>
            <a href="#resources" className="hover:text-white transition-colors">
              Resources
            </a>
          </li>
          <li>
            <a href="/blog/" className="hover:text-white transition-colors">
              Organic Growth Blog
            </a>
          </li>
          <li>
            <a href="/blog/local-seo-map-pack-melbourne-fl/" className="hover:text-white transition-colors">
              Local SEO Checklist
            </a>
          </li>
          <li>
            <a href="#our-team" className="hover:text-white transition-colors">
              Our Team
            </a>
          </li>
          <li>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </li>
          <li>
            <button
              onClick={() => alert("Privacy Policy coming soon!")}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
          </li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-6">Contact Info</h4>
        <ul className="space-y-4 text-slate-400 text-sm">
          <li>richducat@gmail.com</li>
          <li>Based in Melbourne, FL</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
      <p>© 2026 MELBOURNE WEB STUDIO</p>
      <div className="flex gap-6">
        <button
          onClick={() => alert("Privacy Policy coming soon!")}
          className="hover:text-white transition-colors"
        >
          Privacy Policy
        </button>
        <button
          onClick={() => alert("Terms of Service coming soon!")}
          className="hover:text-white transition-colors"
        >
          Terms of Service
        </button>
      </div>
    </div>
  </footer>
);

const Process = () => (
  <section id="how-it-works" className="px-6 py-24 bg-slate-50 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em] mb-4">
          How We Turn Visits Into Leads
        </h2>
        <h3 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
          A simple 3-step path to more local customers
        </h3>
        <p className="text-slate-500 mt-6 text-lg max-w-2xl mx-auto">
          First we find what is making buyers hesitate. Then we fix the page, strengthen your local
          search presence, and make follow-up easier.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 hidden md:block z-0"></div>

        {[
          {
            step: "01",
            icon: Target,
            title: "Find the lost calls",
            desc: "We look at the page the way a buyer does and find the moments where people lose trust, get confused, or leave.",
            color: "bg-blue-600",
            shadow: "shadow-blue-200",
          },
          {
            step: "02",
            icon: Cpu,
            title: "Make the choice easy",
            desc: "We build the message, layout, proof, and calls-to-action so visitors know why to choose you and what to do next.",
            color: "bg-slate-900",
            shadow: "shadow-slate-200",
          },
          {
            step: "03",
            icon: Rocket,
            title: "Get found and follow up",
            desc: "We strengthen your local search foundation and make it easier to respond while the buyer is still ready to talk.",
            color: "bg-emerald-600",
            shadow: "shadow-emerald-200",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="relative z-10 flex flex-col items-center text-center group"
          >
            <div
              className={`w-20 h-20 ${item.color} text-white rounded-3xl shadow-xl ${item.shadow} flex items-center justify-center mb-8 transform group-hover:scale-110 transition-all duration-500 group-hover:rotate-3`}
            >
              <item.icon className="w-10 h-10" />
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-white text-slate-900 rounded-full flex items-center justify-center font-black text-xs border-2 border-slate-100 shadow-sm">
                {item.step}
              </div>
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">{item.title}</h4>
            <p className="text-slate-500 text-sm leading-relaxed px-4">{item.desc}</p>

            {i < 2 && (
              <div className="md:hidden mt-8 text-slate-300">
                <ChevronRight className="w-6 h-6 rotate-90" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-20 text-center">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
          className="inline-flex items-center gap-2 text-blue-600 font-bold hover:gap-4 transition-all"
        >
          Learn more about our process <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </section>
);

const CaseStudies = () => {
  const cases = [
    {
      client: "The Creative House",
      industry: "Creative Agency",
      url: "https://eb28.co/tch/",
      image:
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
      before:
        "Fragmented brand identity and a portfolio that didn't showcase the true scale of their high-end creative work.",
      after:
        "A high-impact, visually stunning portfolio hub that emphasizes storytelling and professional production value.",
      services: ["Brand Strategy", "Portfolio Design", "Motion Graphics", "UX Optimization"],
      tech: ["React", "Framer Motion", "Tailwind CSS", "Vite"],
      results: "50% increase in high-ticket client inquiries.",
      color: "bg-purple-50 text-purple-700 border-purple-100",
    },
    {
      client: "Daily Disspatch",
      industry: "News & Media",
      url: "https://dailydisspatch.com",
      image:
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800",
      before:
        "A slow, cluttered news site that struggled with mobile readability and inefficient ad placement strategies.",
      after:
        "A lightning-fast, minimalist news platform optimized for readability and high-performance ad delivery.",
      services: ["News Platform Build", "Ad Strategy", "Performance SEO", "Mobile Optimization"],
      tech: ["Next.js", "Vercel", "Tailwind CSS", "Google AdSense"],
      results: "300% improvement in load speed and 2x ad revenue.",
      color: "bg-slate-50 text-slate-700 border-slate-100",
    },
    {
      client: "Tesla Helper",
      industry: "Automotive Tech",
      url: "https://teslahelper.app",
      image:
        "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800",
      before:
        "A complex set of tools for Tesla owners that lacked a cohesive, user-friendly interface for daily use.",
      after:
        "A sleek, intuitive web app that simplifies Tesla ownership with real-time data and automated insights.",
      services: ["SaaS Development", "API Integration", "UI/UX Design", "Mobile App Wrap"],
      tech: ["React", "Tesla API", "Firebase", "Tailwind CSS"],
      results: "10,000+ active users within the first 6 months.",
      color: "bg-red-50 text-red-700 border-red-100",
    },
    {
      client: "TYFYS",
      industry: "Community Platform",
      url: "https://tyfys.net",
      image:
        "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800",
      before:
        "A community project with no central hub for coordination, recognition, or honoring service members.",
      after:
        "A powerful platform for honoring service and coordinating local support efforts across the Space Coast.",
      services: ["Community Platform", "Database Design", "Social Integration", "SEO"],
      tech: ["React", "Firebase", "Tailwind CSS", "Lucide Icons"],
      results: "Coordinated support for 500+ local veterans.",
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      client: "VA Claim Team",
      industry: "Legal Consulting",
      url: "https://vaclaimteam.com",
      image:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800",
      before:
        "A complex manual process for veterans to navigate claims, leading to high drop-off rates and confusion.",
      after:
        "A streamlined, automated intake and guidance system that simplifies the entire VA claim process.",
      services: ["Intake Automation", "Lead Qualification", "Secure Portal", "SEO"],
      tech: ["Next.js", "Tailwind CSS", "Firebase", "Stripe"],
      results: "40% reduction in processing time per claim.",
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      client: "Fund Manager",
      industry: "FinTech",
      url: "https://eb28.co/fundmanager",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
      before:
        "Manual spreadsheet tracking for investment funds that was prone to error and difficult for investors to view.",
      after:
        "A professional, real-time fund management dashboard with automated reporting and secure investor portals.",
      services: ["FinTech Development", "Dashboard Design", "Real-time Data", "Security Audit"],
      tech: ["React", "D3.js", "Firebase", "Tailwind CSS"],
      results: "Managing $5M+ in assets with zero manual entry errors.",
      color: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
    {
      client: "Media Buyer AI",
      industry: "Marketing Automation",
      url: "#",
      image:
        "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=800",
      before:
        "Media buyers spending hours on repetitive reporting and manual campaign optimization tasks.",
      after:
        "An autonomous AI agent that monitors campaigns, generates reports, and suggests optimizations 24/7.",
      services: ["AI Integration", "Chatbot Development", "Marketing Automation", "API Hooking"],
      tech: ["Gemini AI", "React", "Tailwind CSS", "Python"],
      results: "Saved media buyers an average of 15 hours per week.",
      color: "bg-rose-50 text-rose-700 border-rose-100",
    },
  ];

  return (
    <section id="case-studies" className="px-6 py-24 max-w-7xl mx-auto w-full">
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
          Successful Projects
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
          We don&apos;t just build websites; we build tools that solve real business problems. See
          how we&apos;ve helped local Melbourne businesses grow.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {cases.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col"
          >
            <div className="relative h-64 overflow-hidden">
              <img
                src={item.image}
                alt={item.client}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 left-6">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${item.color}`}
                >
                  {item.industry}
                </span>
              </div>
            </div>

            <div className="p-10 flex flex-col flex-1">
              <h3 className="text-3xl font-bold text-slate-900 mb-8">
                {item.url && item.url !== "#" ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group/link"
                  >
                    {item.client}
                    <ExternalLink className="w-5 h-5 text-slate-300 group-hover/link:text-blue-600 transition-colors" />
                  </a>
                ) : (
                  <span className="flex items-center justify-between">
                    {item.client}
                    <ExternalLink className="w-5 h-5 text-slate-300" />
                  </span>
                )}
              </h3>

              <div className="space-y-8 flex-1">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex gap-4">
                    <div className="mt-1 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Before
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.before}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="mt-1 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        After
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.after}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Code className="w-3 h-3" /> Technologies Used
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.tech.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 bg-blue-50/50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100/50"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Services by Melbourne Web Studio
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.services.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-100">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    The Results
                  </p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{item.results}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Testimonials = () => {
  const testimonials = [
    {
      quote:
        "Alex and the team didn't just build a website; they built a growth engine. Our foot traffic has never been higher, and the mobile menu is a game-changer for our morning rush.",
      author: "James Miller",
      business: "Owner, The Daily Grind",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    },
    {
      quote:
        "The professional authority our new site projects is night and day compared to our old one. The lead capture system is actually pre-qualifying our clients before we even pick up the phone.",
      author: "Sarah Jenkins",
      business: "Partner, Melbourne Legal",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
    },
    {
      quote:
        "I used to spend 15 hours a week managing bookings. Now, the AI handles everything. It's like having a full-time assistant that never sleeps. Best investment I've made for my gym.",
      author: "Marcus Chen",
      business: "Founder, FitLife Studio",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    },
  ];

  return (
    <section className="px-6 py-24 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            What Our Clients Say
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Real results for real Melbourne businesses. Here&apos;s why local owners trust us with
            their digital growth.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2rem] relative group hover:bg-slate-800 transition-all duration-300"
            >
              <Quote className="absolute top-8 right-8 w-10 h-10 text-blue-500/20 group-hover:text-blue-500/40 transition-colors" />

              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-slate-300 mb-8 italic leading-relaxed">&quot;{t.quote}&quot;</p>

              <div className="flex items-center gap-4">
                <img
                  src={t.image}
                  alt={t.author}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-white font-bold text-sm">{t.author}</p>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    {t.business}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    {
      role: "user" | "model";
      text: string;
      type?: "info" | "appointment" | "onboarding" | "crm";
      data?: any;
    }[]
  >([
    {
      role: "model",
      text: "Hi there! I'm Alex. I know running a local business in Melbourne can be a lot to juggle. What kind of business are you growing, and what's been the biggest challenge with your online presence lately?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-chat", handleOpen);
    return () => window.removeEventListener("open-chat", handleOpen);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);
    const response = buildChatReply(userMessage);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: response.text,
          type: response.type,
          data: response.data,
        },
      ]);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-80 md:w-96 h-[550px] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        >
          <div className="bg-slate-900 p-4 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-sm">Alex</p>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                    Live
                  </span>
                </div>
                <p className="text-slate-400 text-[10px]">Typically replies in minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm"
                  }`}
                >
                  {m.text}
                </div>

                {m.type === "info" && (
                  <div className="mt-2 w-full max-w-[85%] bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs space-y-1 shadow-sm">
                    <p className="font-bold text-blue-800 border-b border-blue-100 pb-1 mb-2">
                      Lead Snapshot
                    </p>
                    <p>
                      <span className="text-slate-500">Name:</span> {m.data.businessName}
                    </p>
                    <p>
                      <span className="text-slate-500">Industry:</span> {m.data.industry}
                    </p>
                    <p>
                      <span className="text-slate-500">Email:</span> {m.data.contactEmail}
                    </p>
                    <p>
                      <span className="text-slate-500">Website:</span>{" "}
                      {m.data.hasWebsite ? m.data.websiteUrl : "Starting from scratch"}
                    </p>
                  </div>
                )}

                {m.type === "appointment" && (
                  <div className="mt-2 w-full max-w-[85%] bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs space-y-1 shadow-sm">
                    <p className="font-bold text-orange-800 border-b border-orange-100 pb-1 mb-2">
                      Strategy Session Ready
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Melbourne, FL / Zoom
                    </p>
                    <p className="flex items-center gap-2 font-semibold">
                      <Play className="w-3 h-3" /> {m.data.preferredDate} at{" "}
                      {m.data.preferredTime}
                    </p>
                    <button
                      onClick={() => window.open(DISCOVERY_CALL_URL, "_blank")}
                      className="mt-2 w-full bg-orange-500 text-white py-1.5 rounded-lg font-bold"
                    >
                      Book the Call
                    </button>
                  </div>
                )}

                {m.type === "onboarding" && (
                  <div className="mt-2 w-full max-w-[85%] bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs space-y-1 shadow-sm">
                    <p className="font-bold text-emerald-800 border-b border-emerald-100 pb-1 mb-2">
                      Recommended Next Step
                    </p>
                    <p className="text-slate-600 mb-2">
                      You&apos;ve selected the <span className="font-bold">{m.data.selectedPackage}</span>.
                      Let&apos;s get your project moving!
                    </p>
                    <button
                      onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
                      className="w-full bg-emerald-600 text-white py-1.5 rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-3 h-3" /> Open Project Brief
                    </button>
                  </div>
                )}

                {m.type === "crm" && (
                  <div className="mt-2 w-full max-w-[85%] bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs space-y-1 shadow-sm">
                    <p className="font-bold text-purple-800 border-b border-purple-100 pb-1 mb-2">
                      CRM Scope Outline
                    </p>
                    <p>
                      <span className="text-slate-500">System:</span> {m.data.crmType}
                    </p>
                    <p>
                      <span className="text-slate-500">Primary Goal:</span> {m.data.primaryGoal}
                    </p>
                    <p className="text-slate-600 mt-2 italic">
                      &quot;This gives us a clean starting point for your CRM build or cleanup.&quot;
                    </p>
                    <button
                      onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                      className="mt-2 w-full bg-purple-600 text-white py-1.5 rounded-lg font-bold"
                    >
                      Talk to the Team
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask Alex anything..."
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110 group relative"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse z-10"></div>
          <MessageCircle className="w-8 h-8" />
          <div className="absolute -top-12 right-0 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Live Chat Online
          </div>
        </button>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900 pt-20">
      <Navbar />
      <main>
        <OnboardingFunnel />
        <Hero />
        <TrustSignals />
        <Process />
        <ProblemSolution />
        <CaseStudies />
        <Testimonials />
        <Pricing />
        <Newsletter />
        <Resources />
        <Team />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
