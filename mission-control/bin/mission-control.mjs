#!/usr/bin/env node
/* CLI: `mission-control web|scan|digest|agents [run <id>]|automations [run <id>]` */
import { execFile } from 'node:child_process';
import { buildBoard } from '../src/board.js';
import { createServer, listen } from '../src/server.js';
import { AGENTS, Orchestrator } from '../src/workforce/orchestrator.js';
import { loadRegistry, runAutomation } from '../src/workforce/automations.js';
import { store } from '../src/store.js';
import { ago } from '../src/jobs/model.js';

const [cmd = 'web', ...rest] = process.argv.slice(2);

const printBoard = (board) => {
  for (const col of board.columns) {
    if (!col.jobs.length) continue;
    console.log(`\n== ${col.title} (${col.jobs.length})`);
    for (const j of col.jobs) console.log(`  [${j.source}] ${j.title}  · ${ago(j.lastActivity)}${j.alive ? ' · live' : ''}\n      ${j.reason}${j.resumeCommand ? `\n      ${j.resumeCommand}` : ''}`);
  }
  if (board.errors.length) console.log('\nerrors:', board.errors);
};

if (cmd === 'scan') {
  printBoard(await buildBoard());
} else if (cmd === 'web') {
  const orchestrator = new Orchestrator();
  const server = createServer({ orchestrator });
  const port = await listen(server);
  orchestrator.start();
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Mission Control running at ${url}  (state in ${store.root})`);
  if (!rest.includes('--no-open')) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    execFile(opener, [url], () => {});
  }
} else if (cmd === 'digest') {
  const o = new Orchestrator();
  await o.refreshBoard();
  await o.runAgent(AGENTS.find((a) => a.id === 'reporter'), { force: true });
  console.log(store.get('digests', [])[0].markdown);
} else if (cmd === 'agents') {
  const o = new Orchestrator();
  await o.refreshBoard();
  if (rest[0] === 'run') {
    const targets = rest[1] ? AGENTS.filter((a) => a.id === rest[1]) : AGENTS;
    for (const a of targets) console.log(a.id, '→', (await o.runAgent(a, { force: true })).summary);
  } else {
    for (const a of (await o.status()).agents) console.log(`${a.enabled ? '●' : '○'} ${a.id.padEnd(18)} ${a.cadence.padEnd(16)} ${a.lastRunAt ? ago(a.lastRunAt) : 'never'}  ${a.lastSummary}`);
  }
} else if (cmd === 'automations') {
  const reg = loadRegistry();
  if (rest[0] === 'run') {
    const a = reg.find((x) => x.id === rest[1]);
    if (!a) throw new Error(`unknown automation ${rest[1]}`);
    if (a.tier === 'manual' && !rest.includes('--yes')) throw new Error('manual-tier automation: add --yes to confirm');
    const run = await runAutomation(a, { trigger: 'cli' });
    console.log(run.output || '');
    process.exitCode = run.ok ? 0 : 1;
  } else {
    for (const a of reg) console.log(`${a.tier.padEnd(9)} ${a.enabled ? '●' : '○'} ${a.id.padEnd(30)} ${(a.schedule || 'on demand').padEnd(14)} ${a.title}`);
  }
} else {
  console.log('usage: mission-control web [--no-open] | scan | digest | agents [run [id]] | automations [run <id> [--yes]]');
}
