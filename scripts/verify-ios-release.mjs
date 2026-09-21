import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`iOS release verification failed: ${message}`);
  process.exitCode = 1;
}

const legacyConfigPath = join(root, 'capacitor.config.json');
if (existsSync(legacyConfigPath)) {
  fail('remove the root capacitor.config.json; capacitor.config.ts is the single source of truth');
}

const capacitorConfig = readFileSync(join(root, 'capacitor.config.ts'), 'utf8');
if (!capacitorConfig.includes("appId: 'com.mounirrouissi.sumofruits'")) {
  fail('capacitor.config.ts does not contain the production bundle identifier');
}

const iconPath = join(
  root,
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'AppIcon.appiconset',
  'AppIcon-512@2x.png',
);
const icon = readFileSync(iconPath);
const pngSignature = '89504e470d0a1a0a';
if (icon.subarray(0, 8).toString('hex') !== pngSignature) {
  fail('App Store icon is not a valid PNG');
} else {
  const width = icon.readUInt32BE(16);
  const height = icon.readUInt32BE(20);
  const colorType = icon[25];
  if (width !== 1024 || height !== 1024) {
    fail(`App Store icon must be 1024x1024; found ${width}x${height}`);
  }
  if (colorType === 4 || colorType === 6) {
    fail('App Store icon contains an alpha channel');
  }
}

const infoPlist = readFileSync(join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
if (!infoPlist.includes('<string>UIInterfaceOrientationPortrait</string>')) {
  fail('portrait orientation is missing from Info.plist');
}
if (infoPlist.includes('UIInterfaceOrientationLandscape')) {
  fail('landscape orientation is enabled even though version 1.0 is portrait-only');
}

const project = readFileSync(join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'), 'utf8');
if (project.includes('TARGETED_DEVICE_FAMILY = "1,2"')) {
  fail('iPad support is enabled even though version 1.0 is iPhone-only');
}
const iphoneTargets = project.match(/TARGETED_DEVICE_FAMILY = 1;/g) ?? [];
if (iphoneTargets.length < 2) {
  fail('Debug and Release targets must both be configured for iPhone');
}

const legalUi = readFileSync(join(root, 'src', 'components', 'LegalCreditsModal.tsx'), 'utf8');
for (const requiredPath of ['PRIVACY.md', 'SUPPORT.md']) {
  if (!legalUi.includes(requiredPath)) {
    fail(`in-app Legal screen does not link to ${requiredPath}`);
  }
}

if (!process.exitCode) {
  console.log('iOS release assets and configuration verified.');
}
