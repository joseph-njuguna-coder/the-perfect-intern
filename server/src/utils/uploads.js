import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

export const uploadRoot = path.resolve(env.uploadDir);

const MAGIC = {
  pdf: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  image: (b) => (b[0] === 0xff && b[1] === 0xd8) // jpeg
    || b.subarray(1, 4).toString('latin1') === 'PNG'
    || (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'),
};
MAGIC.doc = (b) => MAGIC.pdf(b) || MAGIC.image(b);
const EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Disk uploader into a private sub-folder. Random file names; extension derived from validated MIME type. */
export function uploader(folder, { kind, maxBytes }) {
  const dir = path.join(uploadRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
  const allowed = kind === 'pdf' ? ['application/pdf'] : kind === 'doc' ? ['application/pdf', ...IMAGES] : IMAGES;
  return multer({
    limits: { fileSize: maxBytes, files: 1 },
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT[file.mimetype] || ''}`),
    }),
    fileFilter: (req, file, cb) => (allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new AppError(422, 'BAD_FILE_TYPE', kind === 'pdf' ? 'Upload a PDF file.' : kind === 'doc' ? 'Upload a PDF, JPG, PNG or WebP file.' : 'Upload a JPG, PNG or WebP image.'))),
  }).single('file');
}

/** Confirms the real file contents match the claimed type; deletes the file if not. */
export function verifyUpload(file, kind) {
  const fd = fs.openSync(file.path, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  if (!MAGIC[kind](buf)) {
    fs.rmSync(file.path, { force: true });
    throw new AppError(422, 'BAD_FILE_CONTENT', kind === 'pdf' ? 'That file is not a valid PDF.' : kind === 'doc' ? 'That file is not a valid PDF or image.' : 'That file is not a valid image.');
  }
}

/** Resolves a stored relative path safely inside the upload root. */
export function resolveStored(rel) {
  const full = path.resolve(uploadRoot, rel);
  if (!full.startsWith(uploadRoot + path.sep)) throw new AppError(400, 'BAD_PATH', 'Invalid file path.');
  return full;
}
export const removeStored = (rel) => { if (rel) fs.rmSync(resolveStored(rel), { force: true }); };
