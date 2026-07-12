export function socialPackageLane(pkg) {
  return String(pkg?.lane || pkg?.featureSpotlight?.lane || pkg?.creativeSystem?.feature?.lane || '').trim();
}

export function getSocialAccountArchitectureError(pkg, architecture) {
  if (!architecture) {
    return 'The EB28 social account architecture is missing. Publishing must remain blocked.';
  }
  const policy = architecture.publishingPolicy || {};
  if (architecture.decision?.status !== 'approved' || policy.status !== 'approved') {
    return `The EB28 account architecture is ${architecture.decision?.status || policy.status || 'unresolved'}. Choose the brand role for @eb28co before publishing.`;
  }
  if (policy.externalPublishing !== 'authorized') {
    return 'The EB28 account architecture does not authorize external publishing.';
  }
  const lane = socialPackageLane(pkg);
  if (!lane) {
    return 'The social package does not declare a business-growth or trading-software lane.';
  }
  const allowedLanes = Array.isArray(policy.allowedLanes) ? policy.allowedLanes : [];
  if (!allowedLanes.includes(lane)) {
    return `The ${lane} lane is not approved for the configured EB28 Buffer channels.`;
  }
  return null;
}

export function assertSocialAccountArchitecture(pkg, architecture) {
  const reason = getSocialAccountArchitectureError(pkg, architecture);
  if (reason) throw new Error(`Refusing to publish: ${reason}`);
}
