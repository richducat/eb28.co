#!/usr/bin/env node
// Build only the native Limitless entry, independently of the multi-app site router.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.limitless-native-build');
await build({ root, configFile: false, plugins: [react()], publicDir: false,
  build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, 'limitless-native.html') } } });
const webRoot = path.join(root, 'ios/LimitlessCreditGPS/WebRoot');
await fs.rm(webRoot, { recursive: true, force: true });
await fs.mkdir(path.join(webRoot, 'limitless'), { recursive: true });
await fs.copyFile(path.join(outDir, 'limitless-native.html'), path.join(webRoot, 'limitless/index.html'));
await fs.cp(path.join(outDir, 'assets'), path.join(webRoot, 'assets'), { recursive: true });
await fs.copyFile(path.join(root, 'docs/limitless/manifest.webmanifest'), path.join(webRoot, 'limitless/manifest.webmanifest'));
await fs.cp(path.join(root, 'docs/limitless/icons'), path.join(webRoot, 'limitless/icons'), { recursive: true });
console.log('Built isolated Limitless native WebRoot.');
