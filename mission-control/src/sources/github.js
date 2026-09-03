import { makeJob } from '../jobs/model.js';

export const id = 'github';
export const label = 'GitHub PR';

const AI_BRANCH = /^(claude|codex|copilot|cursor|devin|gemini|ai)\//i;

/**
 * Pull requests on AI branches across the configured repos.
 * Needs GITHUB_TOKEN and MC_GITHUB_REPOS="owner/repo,owner/repo2". Silent when unset.
 */
export function prToJob(pr, repo, now = Date.now()) {
  const updated = Date.parse(pr.updated_at || pr.created_at);
  let status = 'needs_you';
  let reason = 'Open PR waiting for your review or merge.';
  if (pr.merged_at) {
    status = 'done';
    reason = 'Merged.';
  } else if (pr.state === 'closed') {
    status = 'done';
    reason = 'Closed without merging.';
  } else if (pr.draft) {
    status = 'working';
    reason = 'Draft PR, still being worked on.';
  } else if (pr.mergeable_state === 'dirty') {
    status = 'follow_up';
    reason = 'Merge conflict with the base branch.';
  } else if (now - updated > 3 * 24 * 3600 * 1000) {
    status = 'follow_up';
    reason = 'Open for more than three days with no activity.';
  }
  return makeJob({
    id: `github:${repo}#${pr.number}`,
    source: id,
    title: pr.title,
    status,
    reason,
    branch: pr.head && pr.head.ref,
    project: repo.split('/')[1],
    startedAt: pr.created_at,
    lastActivity: pr.updated_at || pr.created_at,
    lastMessage: (pr.body || '').slice(0, 400),
    link: pr.html_url,
    meta: { number: pr.number, repo, author: pr.user && pr.user.login, draft: pr.draft },
    tags: [AI_BRANCH.test((pr.head && pr.head.ref) || '') ? 'ai-branch' : 'human'],
  });
}

export async function collect({ now = Date.now(), fetchImpl = globalThis.fetch } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repos = (process.env.MC_GITHUB_REPOS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !repos.length || !fetchImpl) return [];
  const jobs = [];
  for (const repo of repos) {
    try {
      const res = await fetchImpl(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=50&sort=updated&direction=desc`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'eb28-mission-control' },
      });
      if (!res.ok) continue;
      const prs = await res.json();
      for (const pr of prs) jobs.push(prToJob(pr, repo, now));
    } catch {
      /* offline */
    }
  }
  return jobs;
}
