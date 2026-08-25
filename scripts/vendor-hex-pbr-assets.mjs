import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'assets/hex-world/pbr-manifest.json'), 'utf8'));
const outputRoot = path.join(root, 'public/assets/hex-world');
const userAgent = 'NarinylandAssetVendor/1.0 (+https://github.com/poojaroonwit/narinyland)';

if (!Array.isArray(manifest.assets) || manifest.assets.length === 0 || !manifest.resolvedAt) {
  throw new Error('PBR_ASSET_MANIFEST_UNRESOLVED');
}

function allFiles(asset) {
  const files = [];
  for (const variant of Object.values(asset.variants ?? {})) {
    if (variant.roles) files.push(...Object.values(variant.roles));
    if (variant.entry) files.push(variant.entry);
    if (Array.isArray(variant.includes)) files.push(...variant.includes);
    if (variant.hdr) files.push(variant.hdr);
  }
  return files;
}

async function sha256File(filePath) {
  try {
    const buffer = await readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function fileMatches(filePath, expectedSha256, expectedSize) {
  try {
    const info = await stat(filePath);
    if (expectedSize && info.size !== expectedSize) return false;
    return (await sha256File(filePath)) === expectedSha256;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function downloadVerified(assetId, file) {
  const destination = path.join(outputRoot, file.out);
  const normalizedDestination = path.resolve(destination);
  if (!normalizedDestination.startsWith(path.resolve(outputRoot) + path.sep)) {
    throw new Error(`PBR_ASSET_UNSAFE_OUTPUT:${assetId}:${file.out}`);
  }
  if (await fileMatches(destination, file.sha256, file.size)) {
    console.error(`[pbr-vendor] cached ${file.out}`);
    return;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const temp = `${destination}.tmp-${process.pid}`;
  await rm(temp, { force: true });
  const response = await fetch(file.url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`PBR_ASSET_DOWNLOAD_FAILED:${assetId}:${file.out}:${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(buffer).digest('hex');
  if (digest !== file.sha256 || (file.size && buffer.byteLength !== file.size)) {
    throw new Error(`PBR_ASSET_CHECKSUM_MISMATCH:${assetId}:${file.out}`);
  }
  await writeFile(temp, buffer);
  await rename(temp, destination);
  console.error(`[pbr-vendor] downloaded ${file.out}`);
}

for (const asset of manifest.assets) {
  if (asset.license !== 'CC0') throw new Error(`PBR_ASSET_LICENSE_REJECTED:${asset.id}`);
  for (const file of allFiles(asset)) {
    if (!file?.url || !file?.sha256 || !file?.out) throw new Error(`PBR_ASSET_FILE_INVALID:${asset.id}`);
    await downloadVerified(asset.id, file);
  }
}

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, '.manifest-version'), `${manifest.version}:${manifest.resolvedAt}\n`, 'utf8');
