import React, { useState } from 'react';
import { ArrowRight, ArrowUp, CalendarDays } from 'lucide-react';

const ROUTES = {
  website: '/get-started/?service=website',
  marketing: '/get-started/?service=social',
  call: '/get-started/?intent=call',
};

function replyFor(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes('website') || normalized.includes('redesign') || normalized.includes('hosting')) {
    return {
      text: 'The website can be built at no cost when you choose 12 months of Growth Hosting: $1,176 paid upfront, which works out to $98 a month. Website-only is $800 one-time.',
      href: ROUTES.website,
      label: 'Start the website brief',
    };
  }

  if (normalized.includes('social') || normalized.includes('content') || normalized.includes('seo') || normalized.includes('marketing')) {
    return {
      text: 'We will ask about your audience, offers, channels, current assets, approval process, and the result you need. You will leave the intake with a clear next step, not a generic sales pitch.',
      href: ROUTES.marketing,
      label: 'Start the marketing brief',
    };
  }

  if (normalized.includes('call') || normalized.includes('book') || normalized.includes('talk')) {
    return {
      text: 'Use the guided start page and choose “Book a fit call.” It collects the basics first, so the call can focus on decisions instead of repeating your contact information.',
      href: ROUTES.call,
      label: 'Book a fit call',
    };
  }

  return {
    text: 'Start with the guided brief. It asks only the questions that match your services, then sends EB28 a structured project brief so we can get the work moving.',
    href: '/get-started/',
    label: 'Start my project',
  };
}

export default function ConversionAssistant({ compact = false, source = 'home' }) {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState(null);

  const choose = (message) => {
    setReply(replyFor(message));
  };

  const submit = (event) => {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    choose(question);
    setInput('');
  };

  return (
    <div className={`conversion-assistant ${compact ? 'is-compact' : ''}`} data-source={source}>
      <div className="conversion-assistant-head">
        <span className="conversion-assistant-mark">EB</span>
        <div>
          <strong>EB28 Project Assistant</strong>
          <small><i /> Ready to route your project</small>
        </div>
      </div>

      <div className="conversion-chat">
        <div className="conversion-message conversion-message-left">
          Tell me what you need help with: a website, social and content, more leads, or automation. I’ll point you to the right first step.
        </div>
        <div className="conversion-message conversion-message-right">
          Can I get a clear plan before a sales call?
        </div>
        <div className="conversion-message conversion-message-left">
          Yes. The guided brief qualifies the project first. Then you can book a focused call, request a proposal, or choose the website offer.
        </div>

        {reply && (
          <div className="conversion-message conversion-message-left conversion-reply" role="status">
            <span>{reply.text}</span>
            <a href={reply.href}>{reply.label} <ArrowRight aria-hidden="true" /></a>
          </div>
        )}

        <div className="conversion-quick-actions" aria-label="Common project needs">
          <button type="button" onClick={() => choose('website')}>I need a website</button>
          <button type="button" onClick={() => choose('social marketing')}>I need marketing</button>
        </div>

        <a className="conversion-book" href={ROUTES.call}>
          <CalendarDays aria-hidden="true" /> Book a 15-minute fit call
        </a>
      </div>

      <form className="conversion-chat-input" onSubmit={submit}>
        <label className="sr-only" htmlFor={`conversion-question-${source}`}>Ask the EB28 Project Assistant</label>
        <input
          id={`conversion-question-${source}`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your project..."
        />
        <button type="submit" aria-label="Send question"><ArrowUp /></button>
      </form>
    </div>
  );
}
