export type FileValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type FileValidationOptions = {
  maxMB?: number;
  accept?: string[];
};

const DEFAULT_MAX_MB = 25;
const DEFAULT_ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

export function validateUpload(
  file: File,
  opts?: FileValidationOptions
): FileValidationResult {
  const maxMB = opts?.maxMB ?? DEFAULT_MAX_MB;
  const accept = opts?.accept ?? DEFAULT_ACCEPT;

  // Check file size
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File quá lớn (tối đa ${maxMB}MB).`,
    };
  }

  // Check file type
  const isTypeValid = isValidFileType(file, accept);
  if (!isTypeValid) {
    return {
      ok: false,
      message: 'Định dạng không hỗ trợ.',
    };
  }

  return { ok: true };
}

function isValidFileType(file: File, accept: string[]): boolean {
  // Check MIME type
  if (accept.includes(file.type)) {
    return true;
  }

  // Check for wildcard patterns like "image/*"
  for (const pattern of accept) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (file.type.startsWith(prefix + '/')) {
        return true;
      }
    }
  }

  // Check file extension for known types (e.g., .psd)
  const name = file.name.toLowerCase();
  if (name.endsWith('.psd')) {
    // Photoshop files often have type 'application/octet-stream'
    if (accept.includes('image/vnd.adobe.photoshop') || accept.includes('image/*')) {
      return true;
    }
  }

  return false;
}
