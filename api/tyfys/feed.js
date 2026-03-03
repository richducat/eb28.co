import { readFeed } from './_readFeed.js';

export default function handler(req, res) {
  try {
    const feed = readFeed();
    res.status(200).json(feed);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
