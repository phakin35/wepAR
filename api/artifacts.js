const artifacts = require('../data/artifacts');
const { mapArtifactsForRuntime } = require('../data/cdn');

module.exports = (req, res) => {
  const useCdn = !!(process.env.VERCEL || process.env.USE_CDN === '1');
  const payload = mapArtifactsForRuntime(artifacts, useCdn);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).json(payload);
};
