import { getCronStatus, runCronAction } from './_lib/openclaw-data.js';

function parseRequestBody(body) {
    if (!body) {
        return {};
    }

    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch {
            return {};
        }
    }

    if (typeof body === 'object') {
        return body;
    }

    return {};
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
        try {
            const payload = await getCronStatus();
            return res.status(200).json(payload);
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to load cron status',
                detail: error.message,
                jobs: [],
            });
        }
    }

    if (req.method === 'POST') {
        const body = parseRequestBody(req.body);
        const action = String(body.action || '').toLowerCase();
        const id = String(body.id || '').trim();

        if (!action || !id) {
            return res.status(400).json({
                error: 'POST body requires action and id',
            });
        }

        try {
            const actionResult = await runCronAction({ action, id });
            const snapshot = await getCronStatus();

            if (!actionResult.ok) {
                return res.status(502).json({
                    error: actionResult.error || 'Cron command failed',
                    action: actionResult,
                    ...snapshot,
                });
            }

            return res.status(200).json({
                action: actionResult,
                ...snapshot,
            });
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to run cron action',
                detail: error.message,
            });
        }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
}
