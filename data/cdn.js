const CDN_BASE = 'https://cdn.jsdelivr.net/gh/phakin35/wepAR@main/public';

function withCdnAssetPath(assetPath) {
  if (!assetPath || assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  return `${CDN_BASE}/${assetPath.replace(/^\/+/, '')}`;
}

function mapArtifactsForRuntime(artifacts, useCdn) {
  if (!useCdn) return artifacts;

  return artifacts.map((artifact) => ({
    ...artifact,
    model: withCdnAssetPath(artifact.model),
  }));
}

module.exports = {
  CDN_BASE,
  withCdnAssetPath,
  mapArtifactsForRuntime,
};
