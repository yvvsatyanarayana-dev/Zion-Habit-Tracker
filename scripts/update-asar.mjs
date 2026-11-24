import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const installedAsar = 'C:\\Users\\yerip\\AppData\\Local\\Programs\\zion\\resources\\app.asar';
const tempDir = path.join(os.tmpdir(), 'zion_asar_extract_' + Date.now());
const tempAsar = path.join(os.tmpdir(), 'zion_new_app_' + Date.now() + '.asar');

console.log('Extracting installed app.asar to', tempDir);
execSync(`npx @electron/asar extract "${installedAsar}" "${tempDir}"`, { stdio: 'inherit' });

console.log('Syncing dist and dist-electron...');
fs.cpSync('dist', path.join(tempDir, 'dist'), { recursive: true, force: true });
fs.cpSync('dist-electron', path.join(tempDir, 'dist-electron'), { recursive: true, force: true });

console.log('Packing updated app.asar...');
execSync(`npx @electron/asar pack "${tempDir}" "${tempAsar}"`, { stdio: 'inherit' });

console.log('Overwriting installed app.asar...');
fs.copyFileSync(tempAsar, installedAsar);

console.log('Cleaning up temporary files...');
fs.rmSync(tempDir, { recursive: true, force: true });
fs.rmSync(tempAsar, { force: true });

const stat = fs.statSync(installedAsar);
console.log('SUCCESS! Updated app.asar size:', stat.size, 'bytes, modified:', stat.mtime);
