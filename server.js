const express = require('express');
const cors = require('cors');
const path = require('path');
const artifacts = require('./data/artifacts');
const { mapArtifactsForRuntime } = require('./data/cdn');

const app = express();
const PORT = process.env.PORT || 3000;
const useCdn = process.env.USE_CDN === '1';
const runtimeArtifacts = mapArtifactsForRuntime(artifacts, useCdn);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// JSON API
app.get('/api/artifacts', (req, res) => {
  res.json(runtimeArtifacts);
});

// HTML entry point redirect
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.artifacts = runtimeArtifacts;
