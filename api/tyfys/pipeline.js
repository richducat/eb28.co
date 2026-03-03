import { readFeed } from './_readFeed.js';

export default function handler(req, res) {
  try {
    const feed = readFeed();
    res.status(200).json({
      generatedAt: feed.generatedAt,
      pipeline: feed.pipeline,
      approvalsCount: Array.isArray(feed.approvals) ? feed.approvals.length : 0,
      blockedCount: Array.isArray(feed.blocked) ? feed.blocked.length : 0,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
