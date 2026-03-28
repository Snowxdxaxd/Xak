import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import crypto from 'node:crypto';

// ─── Configuration ───────────────────────────────────────────────────────────

const __media_dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR
  || path.join(__media_dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

const MAX_FILE_SIZES = {
  image:    20  * 1024 * 1024,
  video:    200 * 1024 * 1024,
  audio:    50  * 1024 * 1024,
  document: 20  * 1024 * 1024,
};

const USER_QUOTA_BYTES   = Number(process.env.MEDIA_USER_QUOTA_MB || 1024) * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = Number(process.env.MEDIA_RATE_LIMIT   || 30);
const SIGNED_URL_TTL_MS   = 24 * 60 * 60 * 1000;
const MAX_FILES_PER_MSG   = 2;

const ALLOWED_MIME = {
  image:    ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'],
  video:    ['video/mp4','video/webm','video/quicktime'],
  audio:    ['audio/mpeg','audio/wav','audio/x-m4a','audio/ogg','audio/mp4'],
  document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
if (!existsSync(THUMB_DIR))  mkdirSync(THUMB_DIR,  { recursive: true });

// ─── MIME helpers ────────────────────────────────────────────────────────────

export function classifyMime(mime) {
  for (const [type, list] of Object.entries(ALLOWED_MIME)) {
    if (list.includes(mime)) return type;
  }
  return null;
}

export function getAllAllowedMimes() {
  return Object.values(ALLOWED_MIME).flat();
}

export function getMaxSizeForType(mediaType) {
  return MAX_FILE_SIZES[mediaType] || MAX_FILE_SIZES.document;
}

export async function detectRealMime(filePath, declaredMime) {
  try {
    const { fileTypeFromFile } = await import('file-type');
    const result = await fileTypeFromFile(filePath);
    return result ? result.mime : declaredMime;
  } catch {
    return declaredMime;
  }
}

// ─── Signed URLs ─────────────────────────────────────────────────────────────

export function signMediaUrl(mediaId, secret) {
  const expires = Date.now() + SIGNED_URL_TTL_MS;
  const sig = crypto.createHmac('sha256', secret)
    .update(`${mediaId}:${expires}`).digest('hex');
  return { sig, expires };
}

export function verifyMediaSignature(mediaId, sig, expires, secret) {
  if (Date.now() > Number(expires)) return false;
  const expected = crypto.createHmac('sha256', secret)
    .update(`${mediaId}:${expires}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

// ─── Thumbnails ──────────────────────────────────────────────────────────────

export async function generateImageThumbnail(storedName) {
  try {
    const sharp = (await import('sharp')).default;
    const inputPath  = path.join(UPLOAD_DIR, storedName);
    const thumbName  = `thumb_${path.parse(storedName).name}.webp`;
    const outputPath = path.join(THUMB_DIR, thumbName);

    const meta = await sharp(inputPath).metadata();
    await sharp(inputPath)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(outputPath);

    return { thumbName, width: meta.width || null, height: meta.height || null };
  } catch (err) {
    console.error('[media] thumbnail failed:', err.message);
    return { thumbName: null, width: null, height: null };
  }
}

// ─── Rate limiter (in-memory, resets on restart) ─────────────────────────────

const _buckets = new Map();

export function checkUploadRateLimit(userId) {
  const now = Date.now();
  const entry = _buckets.get(userId);
  if (!entry || now - entry.start > 3_600_000) {
    _buckets.set(userId, { count: 1, start: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) return false;
  entry.count++;
  return true;
}

// ─── File operations ─────────────────────────────────────────────────────────

export const UPLOAD_PATH = UPLOAD_DIR;
export const THUMB_PATH  = THUMB_DIR;
export const MAX_FILES   = MAX_FILES_PER_MSG;
export const QUOTA_BYTES = USER_QUOTA_BYTES;

export async function deleteFiles(storedName, thumbName) {
  await fs.unlink(path.join(UPLOAD_DIR, storedName)).catch(() => {});
  if (thumbName) {
    await fs.unlink(path.join(THUMB_DIR, thumbName)).catch(() => {});
  }
}
