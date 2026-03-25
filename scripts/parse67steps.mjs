import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = '/Users/richardducat/Desktop/wakeupyabish/67_step_daily_mindset_companion.txt';
const outputPath = path.join(__dirname, '../src/data/67steps.json');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

const steps = [];
let currentStep = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  if (line.startsWith('DAY ')) {
    if (currentStep) {
      steps.push(currentStep);
    }
    const match = line.match(/DAY (\d+)\s*[-–]\s*(.*)/i);
    currentStep = {
      day: match ? parseInt(match[1]) : steps.length + 1,
      title: match ? match[2].trim() : line.replace(/DAY \d+\s*[-–]\s*/i, ''),
      source: '',
      morningMindset: '',
      actionTip: '',
      eveningWindDown: ''
    };
  } else if (currentStep) {
    if (line.toLowerCase().startsWith('source step:')) {
      currentStep.source = line.replace(/source step:/i, '').trim();
    } else if (line.toLowerCase().startsWith('morning mindset:')) {
      currentStep.morningMindset = line.replace(/morning mindset:/i, '').trim();
    } else if (line.toLowerCase().startsWith('easy action tip:')) {
      currentStep.actionTip = line.replace(/easy action tip:/i, '').trim();
    } else if (line.toLowerCase().startsWith('evening wind-down:')) {
      let windDown = line.replace(/evening wind-down:/i, '').trim();
      if (windDown.startsWith('"') && windDown.endsWith('"')) {
        windDown = windDown.slice(1, -1);
      }
      currentStep.eveningWindDown = windDown;
    }
  }
}

if (currentStep) {
  steps.push(currentStep);
}

fs.writeFileSync(outputPath, JSON.stringify(steps, null, 2));
console.log(`Successfully parsed ${steps.length} steps and wrote to ${outputPath}`);
