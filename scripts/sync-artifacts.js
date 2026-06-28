const fs = require('fs');
const path = require('path');
const artifacts = require('../data/artifacts');

const jsonPath = path.join(__dirname, '..', 'public', 'assets', 'artifacts.json');
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(artifacts, null, 2) + '\n', 'utf8');

console.log(`Synced ${artifacts.length} artifacts to public/assets/artifacts.json`);
