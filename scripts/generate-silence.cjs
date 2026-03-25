const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const publicDir = path.join(__dirname, 'docs');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const silencePath = path.join(publicDir, 'silence.mp3');

// Generate 5 seconds of silence
try {
  execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 5 -q:a 9 -acodec libmp3lame ${silencePath} -y`);
  console.log('Successfully generated silence.mp3 to docs/silence.mp3');
} catch (e) {
  console.error('Failed to use ffmpeg, writing base64 fallback...', e);
  // Base64 for 1s of silent stereo MP3
  const b64 = "//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
  fs.writeFileSync(silencePath, Buffer.from(b64, 'base64'));
}

// Also write to public/ just in case Vite resolves it during dev
const devPath = path.join(__dirname, 'public');
if (!fs.existsSync(devPath)) fs.mkdirSync(devPath, { recursive: true });
try { fs.copyFileSync(silencePath, path.join(devPath, 'silence.mp3')); } catch(e){}
