import { searchWorkspace } from './_lib/openclaw-data.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const q = String(req.query?.q || '');
    const limit = Number.parseInt(req.query?.limit, 10);

    try {
        const payload = await searchWorkspace(q, {
            limit: Number.isFinite(limit) ? limit : 20,
        });

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(payload);
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to search workspace',
            detail: error.message,
            items: [],
        });
    }
}
