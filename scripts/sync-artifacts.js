const fs = require('fs');
const path = require('path');
const artifacts = require('../data/artifacts');
const { mapArtifactsForRuntime } = require('../data/cdn');

const useCdn = !!(process.env.VERCEL || process.env.USE_CDN === '1');
const output = mapArtifactsForRuntime(artifacts, useCdn);

const jsonPath = path.join(__dirname, '..', 'public', 'assets', 'artifacts.json');
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(
  `Synced ${output.length} artifacts to public/assets/artifacts.json` +
    (useCdn ? ' (CDN model URLs for Vercel)' : '')
);
