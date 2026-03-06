export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Fetch live data from freeopenclawtrader.com
        const response = await fetch('https://freeopenclawtrader.com', {
            headers: { 'User-Agent': 'FundManager-EB28/1.0' },
        });

        if (!response.ok) {
            throw new Error(`Upstream returned ${response.status}`);
        }

        const html = await response.text();

        // Extract window.TICKER_DATA from the HTML
        const match = html.match(/window\.TICKER_DATA\s*=\s*(\{[\s\S]*?\});/);
        if (!match) {
            return res.status(200).json({
                ok: true,
                source: 'freeopenclawtrader.com',
                data: null,
                error: 'No TICKER_DATA found in upstream HTML',
            });
        }

        let tickerData;
        try {
            tickerData = JSON.parse(match[1]);
        } catch (parseError) {
            return res.status(200).json({
                ok: false,
                source: 'freeopenclawtrader.com',
                data: null,
                error: `Failed to parse TICKER_DATA: ${parseError.message}`,
            });
        }

        // Structure data for the Fund Manager agents
        const botStatuses = [];
        if (tickerData.botActivityText) {
            const parts = tickerData.botActivityText.split('•').map(s => s.trim());
            for (const part of parts) {
                const colonIdx = part.indexOf(':');
                if (colonIdx > 0) {
                    botStatuses.push({
                        name: part.slice(0, colonIdx).trim(),
                        status: part.slice(colonIdx + 1).trim(),
                    });
                }
            }
        }

        // Parse trade logs
        const tradeLogs = [];
        if (tickerData.logsList) {
            const lines = tickerData.logsList.split('\n').filter(Boolean);
            for (const line of lines) {
                tradeLogs.push(line.trim());
            }
        }

        // Parse positions
        const positions = [];
        if (tickerData.positionsList) {
            const lines = tickerData.positionsList.split('\n').filter(Boolean);
            for (const line of lines) {
                const parts = line.split('|').map(s => s.trim());
                if (parts.length >= 4) {
                    positions.push({
                        symbol: parts[0],
                        type: parts[1],
                        cost: parts[2]?.replace('cost ', ''),
                        pnl: parts[3]?.replace('pnl ', ''),
                    });
                }
            }
        }

        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({
            ok: true,
            source: 'freeopenclawtrader.com',
            updatedAt: tickerData.updatedAt || new Date().toISOString(),
            portfolio: {
                balance: tickerData.balanceUsd || '$0.00',
                exposure: tickerData.exposureUsd || '$0.00',
                totalPnl: tickerData.totalPnlUsd || '$0.00',
                positionsCount: tickerData.positionsCount || 0,
                winRate: tickerData.winRate || '--',
                profitFactor: tickerData.profitFactor || '--',
                drawdown: tickerData.drawdown || '--',
            },
            bots: botStatuses,
            trades: tradeLogs,
            positions,
            botPerf: tickerData.botPerf || '',
            accountStatus: tickerData.accountStatus || 'UNKNOWN',
            latency: tickerData.latency || '--',
        });
    } catch (error) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).json({
            ok: false,
            error: `Failed to fetch upstream data: ${error.message}`,
        });
    }
}
