import { canAutoRestart, restartBot, MAX_AUTO_PER_HOUR } from '../bot-control.js';

export const id = 'bot-watchdog';
export const name = 'Bot Watchdog';
export const role = 'Watches your Grok bots and other always-on agents. Restarts the ones you allowed (max 3 an hour) and asks before touching the rest.';
export const tier = 'act';
export const every = 5 * 60 * 1000;

export async function run(ctx) {
  const { board, store, now, emit } = ctx;
  const bots = board.columns.flatMap((c) => c.jobs).filter((j) => j.source === 'bot');
  const down = bots.filter((b) => b.status === 'failed');
  let restarted = 0;
  let proposed = 0;
  for (const bot of down) {
    if (canAutoRestart(bot, now)) {
      const res = await restartBot(bot, { trigger: 'auto' });
      restarted += res.ok ? 1 : 0;
      emit({ type: 'bot:restart', name: bot.title, ok: res.ok, auto: true });
      continue;
    }
    if (!bot.meta.restart) continue;
    const pending = store.get('proposals', []).some((p) => p.status === 'pending' && p.botJobId === bot.id);
    if (pending) continue;
    proposed += 1;
    store.update('proposals', [], (list) => [
      ...list,
      {
        id: `prop:bot:${bot.id}:${now}`,
        createdAt: new Date(now).toISOString(),
        agent: id,
        botJobId: bot.id,
        title: `Restart "${bot.title}"`,
        description: `${bot.reason} Runs: ${bot.meta.restart.join(' ')}. "Approve as standing" lets the watchdog restart it by itself (up to ${MAX_AUTO_PER_HOUR} times an hour).`,
        status: 'pending',
      },
    ]);
    emit({ type: 'proposal:new', title: `Restart ${bot.title}` });
  }
  const up = bots.filter((b) => b.status === 'working').length;
  return { summary: `${bots.length} bots: ${up} running, ${down.length} down, ${restarted} auto-restarted, ${proposed} restart requests sent to you.` };
}
