export function getPublishingAuthorizationError(pkg) {
  if (pkg?.publishingPolicy?.externalPublishing !== 'authorized') {
    return 'This package is not explicitly authorized for external publishing. Keep it draft-only or create a separately approved package.';
  }
  const draftChannels = Object.entries(pkg?.posts || {})
    .filter(([, post]) => post?.status === 'draft_only')
    .map(([channel]) => channel);
  if (draftChannels.length) {
    return `Draft-only channels cannot be published: ${draftChannels.join(', ')}`;
  }
  return null;
}

export function assertPublishingAuthorized(pkg) {
  const reason = getPublishingAuthorizationError(pkg);
  if (reason) throw new Error(`Refusing to publish: ${reason}`);
}
