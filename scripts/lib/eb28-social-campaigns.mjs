function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value, maxLength) {
  const text = compact(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, Math.max(0, maxLength - 1));
  const boundary = clipped.lastIndexOf(' ');
  return `${(boundary > maxLength * 0.55 ? clipped.slice(0, boundary) : clipped).replace(/[.,;:!?-]+$/, '')}…`;
}

function featureHashtags(feature) {
  const byId = {
    'free-website-growth-hosting': ['#WebDesign', '#LocalSEO', '#LeadGeneration', '#SmallBusiness', '#EB28'],
    'ai-agent-foundation': ['#AIAgents', '#BusinessAutomation', '#SmallBusiness', '#ProofOfConcept', '#EB28'],
    'white-glove-onboarding': ['#AIImplementation', '#BusinessSystems', '#LeadAutomation', '#Operations', '#EB28'],
    'private-ai-rag': ['#PrivateAI', '#RAG', '#DataPrivacy', '#BusinessAI', '#EB28'],
    'eb28-app-builder': ['#AppBuilder', '#ProductDesign', '#Prototyping', '#BuildInPublic', '#EB28'],
    'recon-agent-founder-beta': ['#Reconciliation', '#Fintech', '#Operations', '#FounderBeta', '#EB28'],
    'lead-automation-system': ['#LeadAutomation', '#CustomerExperience', '#CRM', '#SmallBusiness', '#EB28'],
    'bluechip-founding-beta': ['#TradingSoftware', '#BuildInPublic', '#PaperTrading', '#RiskControls', '#EB28'],
    'desk-os-safety-system': ['#AgenticAI', '#RiskControls', '#TradingSystems', '#BuildInPublic', '#EB28'],
    'fund-manager-live-tape': ['#BuildInPublic', '#TradingSoftware', '#LiveTape', '#Transparency', '#EB28'],
    'bluechip-setup-portal': ['#PaperTrading', '#TradingSoftware', '#Onboarding', '#RiskControls', '#EB28'],
  };
  return byId[feature.id] || ['#BusinessSystems', '#BuildInPublic', '#EB28'];
}

function laneDisclosure(feature) {
  return feature.lane === 'trading-software'
    ? 'Software, not investment advice. Trading carries real risk of loss.'
    : 'Claims should be verified against the live workflow; consequential decisions stay with an accountable person.';
}

function funnelStage(feature) {
  if (feature.status === 'live_proof') return 'trust';
  if (feature.status === 'founder_beta') return 'consideration';
  return 'education';
}

function xCaption(feature) {
  const campaign = feature.campaign;
  const disclosure = feature.lane === 'trading-software' ? 'Software, not advice. Risk of loss.' : '';
  const reserved = feature.cta.url.length + disclosure.length + 4;
  const lead = truncateAtWord(`${campaign.hook} ${feature.name}: ${campaign.proof}`, 280 - reserved);
  return [lead, feature.cta.url, disclosure].filter(Boolean).join('\n');
}

export function buildFeatureCampaign(feature, { version = '2026-07-social-v2', generatedAt = new Date().toISOString() } = {}) {
  const campaign = feature.campaign || {};
  const required = ['hook', 'summary', 'problem', 'demonstration', 'proof', 'metric', 'objection'];
  const missing = required.filter((field) => !compact(campaign[field]));
  if (missing.length) throw new Error(`Feature ${feature.id || 'unknown'} is missing campaign fields: ${missing.join(', ')}`);
  const tags = featureHashtags(feature);
  const disclosure = laneDisclosure(feature);
  const featurePoint = feature.features?.[0] || feature.promise;
  const featureStatus = String(feature.status || 'active').replaceAll('_', ' ');
  const creativeSystem = {
    version,
    pillar: feature.lane === 'trading-software' ? 'Trading controls' : 'Business systems',
    objective: funnelStage(feature) === 'trust' ? 'trust_through_evidence' : 'qualified_attention',
    eyebrow: `${featureStatus.toUpperCase()} FEATURE NOTE`,
    headline: campaign.hook,
    subhead: campaign.summary,
    theme: feature.visualTheme || 'cobalt',
    feature,
    steps: [
      { label: 'Name the problem', value: campaign.problem },
      { label: 'Show the workflow', value: campaign.demonstration },
      { label: 'Inspect the proof', value: campaign.proof },
    ],
    metric: {
      label: 'What to measure',
      value: campaign.metric,
    },
    cta: feature.cta,
    disclaimer: `${campaign.objection} ${disclosure}`,
    requiredFormats: {
      instagramCarousel: { width: 1080, height: 1350, slides: 4 },
      vertical: { width: 1080, height: 1920 },
      landscape: { width: 1200, height: 675 },
    },
  };

  return {
    version,
    generatedAt,
    featureId: feature.id,
    lane: feature.lane,
    funnelStage: funnelStage(feature),
    accountRoleRequired: feature.lane,
    publishingPolicy: {
      externalPublishing: 'not_authorized',
      requiredState: 'draft_only',
      note: 'A campaign library entry is reusable source material, never permission to publish.',
    },
    featureSpotlight: feature,
    destinations: {
      feature: feature.cta.url,
    },
    creativeSystem,
    posts: {
      facebook: {
        caption: `${campaign.hook}\n\nThe problem\n${campaign.problem}\n\nWhat to inspect\n${campaign.demonstration}\n\nWhy ${feature.name} exists\n${feature.promise}\n\nProof before promotion\n${campaign.proof}\n\nMeasure: ${campaign.metric}\n\n${feature.cta.label}: ${feature.cta.url}\n\n${disclosure}`,
        status: 'draft_only',
      },
      instagram: {
        caption: `${campaign.hook}\n\n01 — THE PROBLEM\n${campaign.problem}\n\n02 — SHOW THE WORKFLOW\n${campaign.demonstration}\n\n03 — FEATURE SPOTLIGHT\n${feature.name}\n${featurePoint}\n\n04 — PROOF BEFORE SCALE\n${campaign.proof}\n\nMeasure: ${campaign.metric}\n\n${feature.cta.label}: ${feature.cta.url}\n\n${disclosure}\n\n${tags.join(' ')}`,
        status: 'draft_only',
      },
      linkedin: {
        caption: `${campaign.hook}\n\n${campaign.problem}\n\nThe operating sequence:\n• ${campaign.demonstration}\n• Inspect: ${campaign.proof}\n• Measure: ${campaign.metric}\n\nFeature spotlight — ${feature.name}\n${feature.promise}\n\nThe boundary matters: ${campaign.objection}\n\n${feature.cta.url}\n\n${tags.slice(0, 3).join(' ')}`,
        status: 'draft_only',
      },
      x: {
        caption: xCaption(feature),
        status: 'draft_only',
      },
      shortFormVideo: {
        hook: campaign.hook,
        durationSeconds: 45,
        format: '9:16 vertical with burned-in captions and a real product, workflow, or evidence surface',
        beats: [
          { seconds: '0-3', visual: 'Full-screen hook', voiceover: campaign.hook },
          { seconds: '3-12', visual: 'Show the problem in the current workflow', voiceover: campaign.problem },
          { seconds: '12-24', visual: `Demonstrate ${feature.name}`, voiceover: campaign.demonstration },
          { seconds: '24-34', visual: 'Zoom into the proof or control', voiceover: campaign.proof },
          { seconds: '34-41', visual: 'Show the measurement', voiceover: campaign.metric },
          { seconds: '41-45', visual: 'Owned CTA plus boundary', voiceover: `${feature.cta.label}. ${disclosure}` },
        ],
        onScreenText: [campaign.hook, feature.name, 'Show the workflow', 'Inspect the proof', 'Measure the outcome'],
        caption: `${truncateAtWord(campaign.hook, 120)} ${feature.name}: ${truncateAtWord(feature.promise, 150)} ${feature.cta.url} ${tags.slice(0, 4).join(' ')}`,
        status: 'draft_only',
      },
      pinnedProfileIntro: {
        caption: `${feature.name}\n\nFor: ${feature.audience}\n\nWhat it does: ${feature.promise}\n\nWhat to inspect: ${campaign.proof}\n\nBoundary: ${campaign.objection}\n\n${feature.cta.url}`,
        status: 'draft_only',
      },
    },
  };
}

export function buildFeatureCampaignLibrary({ catalog, architecture, lane = 'all', generatedAt = new Date().toISOString() }) {
  const features = (catalog?.features || []).filter(
    (feature) => feature.status !== 'retired' && (lane === 'all' || feature.lane === lane),
  );
  if (!features.length) throw new Error(`No active EB28 features found for lane: ${lane}`);
  const campaigns = features.map((feature) => buildFeatureCampaign(feature, { version: catalog.version, generatedAt }));
  return {
    version: catalog.version,
    generatedAt,
    lane,
    accountDecisionStatus: architecture?.decision?.status || 'unknown',
    externalPublishing: 'not_authorized',
    contentMix: {
      'business-growth': {
        education: 35,
        workflowAndProof: 30,
        featureEducation: 25,
        offer: 10,
      },
      'trading-software': {
        tapeTransparency: 35,
        safetyControls: 30,
        productEducation: 25,
        offer: 10,
      },
    },
    summary: {
      total: campaigns.length,
      businessGrowth: campaigns.filter((item) => item.lane === 'business-growth').length,
      tradingSoftware: campaigns.filter((item) => item.lane === 'trading-software').length,
    },
    campaigns,
  };
}

export function featureCampaignLibraryMarkdown(library) {
  const blocks = library.campaigns.map((campaign) => {
    const posts = campaign.posts;
    return `## ${campaign.featureSpotlight.name}\n\n- Feature ID: \`${campaign.featureId}\`\n- Lane: \`${campaign.lane}\`\n- Funnel stage: \`${campaign.funnelStage}\`\n- CTA: ${campaign.featureSpotlight.cta.url}\n\n### Instagram\n\n${posts.instagram.caption}\n\n### LinkedIn\n\n${posts.linkedin.caption}\n\n### X\n\n${posts.x.caption}\n\n### 45-second video\n\n${posts.shortFormVideo.beats.map((beat) => `- **${beat.seconds}** ${beat.visual} — ${beat.voiceover}`).join('\n')}\n`;
  });
  return `# EB28 feature campaign library\n\nGenerated: ${library.generatedAt}\n\nAccount decision: **${library.accountDecisionStatus}**\n\nAll entries are draft-only reusable source material.\n\n${blocks.join('\n---\n\n')}`;
}
