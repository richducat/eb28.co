export const id = 'pr-steward';
export const name = 'PR Steward';
export const role = 'Keeps AI-authored pull requests moving: flags conflicts, stale reviews, and merged work so branches get cleaned up.';
export const tier = 'observe';
export const every = 10 * 60 * 1000;

export async function run(ctx) {
  const { board, store } = ctx;
  const prs = board.columns.flatMap((c) => c.jobs).filter((j) => j.source === 'github');
  if (!prs.length) return { summary: process.env.GITHUB_TOKEN ? 'No open PRs on watched repos.' : 'Idle: set GITHUB_TOKEN and MC_GITHUB_REPOS to watch pull requests.' };
  const conflicts = prs.filter((p) => /conflict/i.test(p.reason));
  const stale = prs.filter((p) => p.status === 'follow_up');
  store.set('pr-report', { generatedAt: new Date().toISOString(), open: prs.length, conflicts: conflicts.map((p) => p.id), stale: stale.map((p) => p.id) });
  return { summary: `${prs.length} open PRs, ${conflicts.length} with conflicts, ${stale.length} stale.` };
}
