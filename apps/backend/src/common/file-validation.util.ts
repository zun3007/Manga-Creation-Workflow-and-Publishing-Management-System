import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

/** Verify the buffer's real magic-number signature matches the extension. */
function hasImageMagicNumber(buffer: Buffer, extension: string): boolean {
  switch (extension) {
    case '.png':
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.webp':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case '.gif': {
      const header = buffer.subarray(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    }
    default:
      return false;
  }
}

/**
 * Validate an uploaded image against an extension + MIME allow-list and its
 * real magic-number signature, then return a safe extension to store it under.
 *
 * The generic /uploads endpoint serves objects publicly, so an attacker who can
 * store an arbitrary/mislabeled file (e.g. HTML with an image extension) could
 * host content or achieve stored-XSS. This closes that hole.
 */
export function assertValidImageUpload(file: Express.Multer.File): {
  extension: string;
} {
  const extension = extname(file.originalname).toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(extension)) {
    throw new BadRequestException('Chỉ chấp nhận ảnh PNG, JPG, WEBP hoặc GIF.');
  }
  if (!IMAGE_MIME_TYPES.includes((file.mimetype ?? '').toLowerCase())) {
    throw new BadRequestException('Content-type ảnh không hợp lệ.');
  }
  if (!file.buffer || !hasImageMagicNumber(file.buffer, extension)) {
    throw new BadRequestException(
      'Nội dung file không khớp với định dạng ảnh đã khai báo.',
    );
  }
  return { extension };
}
