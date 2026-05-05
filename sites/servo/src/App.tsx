/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Camera, Film, Aperture, Clapperboard, Quote, Instagram } from 'lucide-react';
import React, { useState, useEffect } from 'react';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 mix-blend-difference text-white">
      <div className="font-display font-bold text-xl tracking-tight uppercase">Servo Media</div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase opacity-80">
        <a href="#services" className="hover:opacity-100 transition-opacity">Services</a>
        <a href="#work" className="hover:opacity-100 transition-opacity">Work</a>
        <a href="#results" className="hover:opacity-100 transition-opacity">Results</a>
      </div>
      <a 
        href="#contact" 
        className="px-5 py-2.5 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:scale-105 transition-transform"
      >
        Book a Call
      </a>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden bg-[#050505] text-white">
      {/* Abstract Background Blur */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F27D26]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-[#F27D26] animate-pulse" />
              <span className="text-xs font-mono tracking-widest uppercase text-white/60">Accepting New Clients</span>
            </div>
            <h1 className="font-display text-[12vw] leading-[0.85] tracking-[-0.04em] uppercase mb-8">
              We Capture <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Moments.</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row items-start md:items-center gap-8 max-w-2xl"
          >
            <p className="text-lg md:text-xl text-white/60 font-light leading-relaxed">
              Servo Media is a premier creative studio specializing in cinematic videography and high-end photography that tells your brand's story.
            </p>
            <a 
              href="#contact"
              className="flex items-center justify-center w-24 h-24 rounded-full border border-white/20 hover:bg-white hover:text-black transition-colors group shrink-0"
            >
              <ArrowRight className="w-6 h-6 group-hover:rotate-[-45deg] transition-transform" />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Marquee Banner */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden border-y border-white/10 py-3 bg-[#050505]">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] opacity-50 text-xs font-mono uppercase tracking-widest">
          <span className="mx-4">• Photography</span>
          <span className="mx-4">• Cinematic Video</span>
          <span className="mx-4">• Brand Storytelling</span>
          <span className="mx-4">• Event Coverage</span>
          <span className="mx-4">• Commercials</span>
          <span className="mx-4">• Photography</span>
          <span className="mx-4">• Cinematic Video</span>
          <span className="mx-4">• Brand Storytelling</span>
          <span className="mx-4">• Event Coverage</span>
          <span className="mx-4">• Commercials</span>
        </div>
      </div>
    </section>
  );
}

const services = [
  {
    icon: <Film className="w-6 h-6" />,
    title: "Cinematic Video",
    desc: "High-end commercial and brand films that look like they belong on the big screen."
  },
  {
    icon: <Camera className="w-6 h-6" />,
    title: "Photography",
    desc: "Striking, scroll-stopping photography for products, lifestyle, and events."
  },
  {
    icon: <Clapperboard className="w-6 h-6" />,
    title: "Event Coverage",
    desc: "Capturing the energy and key moments of your live events with unobtrusive precision."
  },
  {
    icon: <Aperture className="w-6 h-6" />,
    title: "Creative Direction",
    desc: "Guiding the visual language of your brand from concept through to final delivery."
  }
];

function Services() {
  return (
    <section id="services" className="py-32 bg-[#050505] text-white overflow-hidden border-t border-white/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div>
            <span className="text-[#F27D26] text-xs font-mono uppercase tracking-widest mb-4 block">01 — What We Do</span>
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter leading-none max-w-2xl">
              Visual Storytelling.
            </h2>
          </div>
          <p className="max-w-sm text-white/50 text-sm">
            We don't just point and shoot. We craft compelling visual narratives that elevate your brand and captivate your audience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 cursor-crosshair">
          {services.map((service, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6 text-white group-hover:bg-[#F27D26] group-hover:text-black transition-colors">
                {service.icon}
              </div>
              <h3 className="text-xl font-medium mb-3">{service.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{service.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const workItems = [
  { img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000', title: 'Vintage Lens Portrait', category: 'Photography' },
  { img: 'https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?auto=format&fit=crop&q=80&w=1000', title: 'Automotive Commercial', category: 'Videography' },
  { img: 'https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=1000', title: 'Music Festival', category: 'Event Coverage' },
  { img: 'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?auto=format&fit=crop&q=80&w=1000', title: 'Fashion Editorial', category: 'Photography' },
]

function Work() {
  return (
    <section id="work" className="py-32 bg-white text-black rounded-t-[3rem] relative z-20">
      <div className="container mx-auto px-6">
        <div className="mb-16">
          <span className="text-[#F27D26] text-xs font-mono uppercase tracking-widest mb-4 block">02 — Selected Work</span>
          <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter leading-none">
            Proven Results.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {workItems.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className={`group cursor-pointer ${i % 2 === 1 ? 'md:mt-24' : ''}`}
            >
              <div className="overflow-hidden rounded-3xl relative aspect-[4/5] bg-neutral-100">
                <img 
                  src={item.img} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[0.16,1,0.3,1]"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
                  <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1] flex justify-between items-end">
                    <div>
                      <div className="text-xs font-mono text-white/70 uppercase tracking-widest mb-2">{item.category}</div>
                      <h3 className="text-2xl font-medium tracking-tight">{item.title}</h3>
                    </div>
                    <div className="flex items-center justify-center w-12 h-12 bg-white text-black rounded-full shrink-0 shadow-xl">
                       <ArrowRight className="w-5 h-5 -rotate-45" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote: "Leo has an incredible eye for detail. The promotional video he created for our product launch exceeded all expectations and truly captured our brand's luxury aesthetic.",
    name: "Sarah Jenkins",
    role: "Marketing Director",
    company: "Luxe Group",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
  },
  {
    quote: "We hired Servo Media for a 3-day music festival, and the raw energy they managed to capture in both the photos and the aftermovie was nothing short of phenomenal.",
    name: "Marcus Thorne",
    role: "Event Organizer",
    company: "SoundScape Fest",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150"
  },
  {
    quote: "Professional, creative, and insanely fast turnaround times. The commercial they produced for our new automotive line is currently running nationally to massive success.",
    name: "David Chen",
    role: "Creative Head",
    company: "Velocity Motors",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
  }
];

function Testimonials() {
  return (
    <section id="testimonials" className="py-32 bg-[#050505] text-white overflow-hidden relative border-t border-white/10">
      <div className="container mx-auto px-6 relative z-10">
        <div className="mb-20 text-center flex flex-col items-center">
          <span className="text-[#F27D26] text-xs font-mono uppercase tracking-widest mb-4 block">03 — Client Voices</span>
          <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter leading-none max-w-3xl">
            Words from the <br/><span className="text-white/30 text-stroke">satisfied.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors relative flex flex-col h-full"
            >
              <Quote className="w-10 h-10 text-[#F27D26]/20 mb-6" />
              <p className="text-lg text-white/80 font-light leading-relaxed mb-8 flex-grow">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover grayscale"
                />
                <div>
                  <div className="font-medium text-sm">{testimonial.name}</div>
                  <div className="text-xs text-white/50 font-mono tracking-widest uppercase mt-1">{testimonial.role}, {testimonial.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-32 bg-[#050505] text-white overflow-hidden relative border-t border-white/10">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <span className="text-[#F27D26] text-xs font-mono uppercase tracking-widest mb-4 block">04 — Who We Are</span>
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter leading-none mb-8">
              We capture the <br/><span className="text-white/30 text-stroke">unseen.</span>
            </h2>
            <p className="text-lg text-white/70 font-light leading-relaxed mb-6">
              Servo Media, founded by Leo, was born out of a passion for authentic visual storytelling. We believe that every brand has a unique heartbeat, and our mission is to translate that pulse into compelling photography and cinematic videography.
            </p>
            <p className="text-lg text-white/70 font-light leading-relaxed mb-12">
              Our core values are simple: unwavering quality, relentless creativity, and a deep commitment to our clients' vision. We don't just point cameras; we direct narratives, curate aesthetics, and elevate your brand's presence to stand out in a noisy world.
            </p>
            
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
              <div>
                <h4 className="text-3xl font-display text-white mb-2">150+</h4>
                <p className="text-sm font-mono text-white/50 uppercase tracking-widest">Projects</p>
              </div>
              <div>
                <h4 className="text-3xl font-display text-white mb-2">5+</h4>
                <p className="text-sm font-mono text-white/50 uppercase tracking-widest">Years Experience</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2 relative"
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden relative border border-white/10">
              <img 
                src="https://images.unsplash.com/photo-1554046920-90dcac824b45?auto=format&fit=crop&q=80&w=1000" 
                alt="Leo from Servo Media" 
                className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-700 ease-out"
              />
              <div className="absolute inset-x-0 bottom-0 p-8 pt-32 bg-gradient-to-t from-black/90 to-transparent">
                <div className="text-2xl font-serif italic text-white mb-1">Leo</div>
                <div className="text-xs font-mono text-[#F27D26] uppercase tracking-widest">Founder & Lead Director</div>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#F27D26]/20 rounded-full blur-[60px] pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function InstagramFeed() {
  type InstagramPost = {
    id: number;
    media_type: 'IMAGE' | 'VIDEO';
    media_url: string;
    thumbnail_url?: string;
    permalink: string;
  };

  const displayPosts: InstagramPost[] = [
    { id: 1, media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400&h=400', permalink: 'https://instagram.com/leo_servomedia' },
    { id: 2, media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?auto=format&fit=crop&q=80&w=400&h=400', permalink: 'https://instagram.com/leo_servomedia' },
    { id: 3, media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=400&h=400', permalink: 'https://instagram.com/leo_servomedia' },
    { id: 4, media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?auto=format&fit=crop&q=80&w=400&h=400', permalink: 'https://instagram.com/leo_servomedia' },
    { id: 5, media_type: 'IMAGE', media_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400', permalink: 'https://instagram.com/leo_servomedia' }
  ];

  return (
    <section id="instagram" className="py-24 bg-white text-black overflow-hidden relative z-20 rounded-t-[3rem]">
      <div className="container mx-auto px-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
         <div>
            <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tighter flex items-center gap-3">
              <Instagram className="w-8 h-8 md:w-10 md:h-10 text-[#F27D26]" />
              @leo_servomedia
            </h2>
         </div>
         <a 
           href="https://www.instagram.com/leo_servomedia/" 
           target="_blank"
           rel="noopener noreferrer"
           className="flex items-center gap-2 px-8 py-4 bg-[#050505] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#F27D26] hover:text-black transition-colors shrink-0"
         >
           Follow Us
         </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 px-2 md:px-6">
        {displayPosts.map((post, i) => (
          <a 
            key={post.id} 
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative aspect-square group overflow-hidden bg-neutral-100 rounded-2xl ${i === 4 ? 'hidden md:block' : ''}`}
          >
            <img 
              src={post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url} 
              alt="Instagram Post" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/30 px-4 py-2 rounded-full backdrop-blur-sm">View Post</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <section id="contact" className="py-32 bg-[#050505] text-white border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 item-center">
          <div>
            <span className="text-[#F27D26] text-xs font-mono uppercase tracking-widest mb-4 block">05 — Connect</span>
            <h2 className="text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] leading-[0.85] mb-8">
              Let's build <br /> <span className="text-white/30 text-stroke">together.</span>
            </h2>
            <p className="text-lg text-white/60 font-light mb-12 max-w-md">
              Ready to create something visually stunning? Fill out the form below to discuss your project requirements.
            </p>

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-[#F27D26]" /> 
                Industry-standard equipment
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-[#F27D26]" /> 
                Fast turnaround times
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-[#F27D26]" /> 
                Creative collaboration & direction
              </li>
            </ul>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-8 md:p-12 rounded-3xl backdrop-blur-md">
             {success ? (
               <div className="h-full flex flex-col items-center justify-center text-center py-12">
                 <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <h3 className="text-3xl font-display uppercase mb-4">Request Sent</h3>
                 <p className="text-white/60">We'll be in touch within 24 hours to schedule your strategy session.</p>
               </div>
             ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-white/50 uppercase tracking-widest">Name</label>
                    <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F27D26] transition-colors" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-white/50 uppercase tracking-widest">Company</label>
                    <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F27D26] transition-colors" placeholder="Brand Inc." />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/50 uppercase tracking-widest">Email</label>
                  <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F27D26] transition-colors" placeholder="john@company.com" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/50 uppercase tracking-widest">What do you need help with?</label>
                  <select required className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F27D26] transition-colors appearance-none">
                    <option value="" disabled selected>Select an option...</option>
                    <option value="video">Videography / Commercials</option>
                    <option value="photo">Photography</option>
                    <option value="event">Event Coverage</option>
                    <option value="both">Photo & Video Package</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/50 uppercase tracking-widest">Project Budget</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F27D26] transition-colors" placeholder="e.g. $5k - $10k" />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-white text-black font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-[#F27D26] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Sending Request...' : 'Apply to Work With Us'}
                </button>
              </form>
             )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-[#050505] text-white border-t border-white/10 py-12">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-display font-bold text-xl tracking-tight uppercase">Servo Media</div>
        <div className="text-xs font-mono text-white/40 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Servo Media. All rights reserved.
        </div>
        <div className="flex items-center gap-6 text-sm">
          <a href="#" className="text-white/60 hover:text-white transition-colors">Instagram</a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">LinkedIn</a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="bg-[#050505] min-h-screen selection:bg-[#F27D26] selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Work />
        <Testimonials />
        <About />
        <InstagramFeed />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
