/* Keep tests out of the real ~/.eb28-mission-control state folder. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.MC_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-test-'));
process.env.MC_BOTS = path.join(process.env.MC_HOME, 'bots.json');
