import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'assets/hex-world/pbr-source-catalog.json');
const outputPath = process.env.HEX_PBR_MANIFEST_OUT
  ? path.resolve(process.env.HEX_PBR_MANIFEST_OUT)
  : path.join(root, 'assets/hex-world/pbr-manifest.json');

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const userAgent = catalog.userAgent || 'NarinylandAssetResolver/1.0';
const hashCache = new Map();

function normalized(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findKey(object, aliases) {
  const entries = Object.keys(object ?? {});
  for (const alias of aliases) {
    const match = entries.find((key) => normalized(key) === normalized(alias));
    if (match) return match;
  }
  return null;
}

function pickFormat(node, preferred = ['jpg', 'png']) {
  for (const format of preferred) {
    if (node?.[format]?.url) return { format, record: node[format] };
  }
  throw new Error(`PBR_RESOLVE_FORMAT_MISSING:${preferred.join(',')}`);
}

function safeRelative(value) {
  const clean = String(value).replaceAll('\\', '/').replace(/^\/+/, '');
  if (!clean || clean.split('/').includes('..')) throw new Error(`PBR_RESOLVE_UNSAFE_PATH:${value}`);
  return clean;
}

function basenameFromUrl(url) {
  const pathname = new URL(url).pathname;
  return path.posix.basename(decodeURIComponent(pathname));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`PBR_RESOLVE_HTTP_${response.status}:${url}`);
  return response.json();
}

async function sha256For(url) {
  if (hashCache.has(url)) return hashCache.get(url);
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`PBR_RESOLVE_DOWNLOAD_${response.status}:${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(buffer).digest('hex');
  hashCache.set(url, { sha256: digest, size: buffer.byteLength });
  return hashCache.get(url);
}

async function resolveFile(record, out, extra = {}) {
  if (!record?.url || !record?.md5) throw new Error(`PBR_RESOLVE_INVALID_FILE:${out}`);
  const hashed = await sha256For(record.url);
  if (record.size && record.size !== hashed.size) {
    throw new Error(`PBR_RESOLVE_SIZE_MISMATCH:${out}:${record.size}:${hashed.size}`);
  }
  return {
    url: record.url,
    md5: record.md5,
    sha256: hashed.sha256,
    size: hashed.size,
    out: safeRelative(out),
    ...extra,
  };
}

async function resolveTexture(asset, files) {
  const variants = {};
  for (const resolution of asset.resolutions) {
    const roles = {};
    for (const [role, aliases] of Object.entries(asset.roles)) {
      const mapKey = findKey(files, aliases);
      if (!mapKey) throw new Error(`PBR_RESOLVE_MAP_MISSING:${asset.sourceAssetId}:${role}`);
      const resolutionNode = files[mapKey]?.[resolution];
      if (!resolutionNode) throw new Error(`PBR_RESOLVE_RESOLUTION_MISSING:${asset.sourceAssetId}:${mapKey}:${resolution}`);
      const { format, record } = pickFormat(resolutionNode);
      roles[role] = await resolveFile(
        record,
        `textures/${asset.id}/${role}_${resolution}.${format}`,
        { role, resolution, format },
      );
    }
    variants[resolution] = { roles };
  }
  return { variants };
}

async function resolveModel(asset, files) {
  const variants = {};
  const gltfRootKey = findKey(files, ['gltf']);
  if (!gltfRootKey) throw new Error(`PBR_RESOLVE_GLTF_MISSING:${asset.sourceAssetId}`);
  for (const resolution of asset.resolutions) {
    const record = files[gltfRootKey]?.[resolution]?.gltf;
    if (!record?.url) throw new Error(`PBR_RESOLVE_GLTF_RESOLUTION_MISSING:${asset.sourceAssetId}:${resolution}`);
    const entryName = basenameFromUrl(record.url);
    const entry = await resolveFile(record, `models/${asset.id}/${entryName}`, { resolution, format: 'gltf', entry: true });
    const includes = [];
    for (const [includeName, includeRecord] of Object.entries(record.include ?? {})) {
      includes.push(await resolveFile(
        includeRecord,
        `models/${asset.id}/${safeRelative(includeName)}`,
        { resolution, format: path.posix.extname(includeName).slice(1) || 'bin', include: true },
      ));
    }
    variants[resolution] = { entry, includes };
  }
  return { variants };
}

async function resolveHdri(asset, files) {
  const variants = {};
  const hdriKey = findKey(files, ['hdri']);
  if (!hdriKey) throw new Error(`PBR_RESOLVE_HDRI_MISSING:${asset.sourceAssetId}`);
  for (const resolution of asset.resolutions) {
    const record = files[hdriKey]?.[resolution]?.hdr;
    if (!record?.url) throw new Error(`PBR_RESOLVE_HDRI_RESOLUTION_MISSING:${asset.sourceAssetId}:${resolution}`);
    variants[resolution] = {
      hdr: await resolveFile(record, `hdri/${asset.id}_${resolution}.hdr`, { resolution, format: 'hdr' }),
    };
  }
  return { variants };
}

const resolvedAssets = [];
for (const asset of catalog.assets) {
  const [info, files] = await Promise.all([
    fetchJson(`https://api.polyhaven.com/info/${asset.sourceAssetId}`),
    fetchJson(`https://api.polyhaven.com/files/${asset.sourceAssetId}`),
  ]);
  const resolved = asset.kind === 'texture'
    ? await resolveTexture(asset, files)
    : asset.kind === 'model'
      ? await resolveModel(asset, files)
      : await resolveHdri(asset, files);
  resolvedAssets.push({
    id: asset.id,
    sourceAssetId: asset.sourceAssetId,
    source: 'polyhaven',
    sourcePage: `https://polyhaven.com/a/${asset.sourceAssetId}`,
    license: 'CC0',
    kind: asset.kind,
    name: info.name ?? asset.sourceAssetId,
    authors: info.authors ?? {},
    filesHash: info.files_hash ?? null,
    ...resolved,
  });
  console.error(`[pbr-resolve] resolved ${asset.id} (${asset.sourceAssetId})`);
}

const manifest = {
  version: 1,
  provider: 'polyhaven',
  apiAttribution: 'Asset metadata resolved from the Poly Haven public API; shipped assets are CC0.',
  resolvedAt: new Date().toISOString(),
  assets: resolvedAssets,
};
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest));
