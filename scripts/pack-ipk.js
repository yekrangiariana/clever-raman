import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

// Ensure appinfo.json exists in dist and read version dynamically
const appinfoPath = path.join(distDir, 'appinfo.json');
if (!fs.existsSync(appinfoPath)) {
  console.error('Error: dist/appinfo.json not found!');
  process.exit(1);
}

const appinfo = JSON.parse(fs.readFileSync(appinfoPath, 'utf8'));
const appId = appinfo.id || 'org.navidrome.tv';
const version = appinfo.version || '1.0.1';
const outputDir = path.resolve('dist-webos');
const ipkFileName = `${appId}_${version}_all.ipk`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if ares-package CLI is available
let hasAres = false;
try {
  execSync('ares-package --version', { stdio: 'ignore' });
  hasAres = true;
} catch (e) {
  hasAres = false;
}

if (hasAres) {
  console.log('Using webOS CLI (ares-package)...');
  try {
    execSync(`ares-package "${distDir}" -o "${outputDir}"`, { stdio: 'inherit' });
    console.log(`Successfully created IPK via ares-package in ${outputDir}`);
    process.exit(0);
  } catch (err) {
    console.warn('ares-package failed, falling back to manual IPK archive builder...');
  }
}

console.log('Building standard webOS IPK archive...');
const scratchDir = path.join(outputDir, '.scratch');
if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

// 1. debian-binary
fs.writeFileSync(path.join(scratchDir, 'debian-binary'), '2.0\n');

// 2. control.tar.gz
const controlDir = path.join(scratchDir, 'control_dir');
fs.mkdirSync(controlDir, { recursive: true });

const controlContent = `Package: ${appId}
Version: ${version}
Section: misc
Priority: optional
Architecture: all
Maintainer: Community
Description: Music TV for LG webOS
`;

fs.writeFileSync(path.join(controlDir, 'control'), controlContent);
execSync(`tar -czf "${path.join(scratchDir, 'control.tar.gz')}" -C "${controlDir}" control`);

// 3. data.tar.gz
const dataAppDir = path.join(scratchDir, 'data_dir', 'usr', 'palm', 'applications', appId);
fs.mkdirSync(dataAppDir, { recursive: true });

// Copy dist contents to dataAppDir
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(distDir, dataAppDir);

const dataDir = path.join(scratchDir, 'data_dir');
execSync(`tar -czf "${path.join(scratchDir, 'data.tar.gz')}" -C "${dataDir}" usr`);

// 4. Combine into .ipk using ar or tar (MUST run with cwd: scratchDir for relative member names)
const finalIpkPath = path.join(outputDir, ipkFileName);
if (fs.existsSync(finalIpkPath)) {
  fs.unlinkSync(finalIpkPath);
}

try {
  execSync(`ar -cr "${finalIpkPath}" debian-binary control.tar.gz data.tar.gz`, { cwd: scratchDir });
} catch (e) {
  // If ar is missing, tar can archive the components
  execSync(`tar -cf "${finalIpkPath}" debian-binary control.tar.gz data.tar.gz`, { cwd: scratchDir });
}

// Cleanup scratch
fs.rmSync(scratchDir, { recursive: true, force: true });

console.log(`\n✅ IPK Package successfully created:`);
console.log(`   Path: ${finalIpkPath}`);
console.log(`   File size: ${(fs.statSync(finalIpkPath).size / 1024).toFixed(2)} KB`);
console.log(`   Installable via webOS Dev Manager or: ares-install ${finalIpkPath}\n`);
