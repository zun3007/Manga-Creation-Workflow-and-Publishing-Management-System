import { describe, it, expect } from 'vitest';
import { validateUpload } from './fileValidation';

describe('fileValidation', () => {
  it('accepts valid PNG within size limit', () => {
    const file = new File([new Uint8Array(1000)], 'test.png', { type: 'image/png' });
    const result = validateUpload(file);
    expect(result.ok).toBe(true);
  });

  it('accepts valid JPEG within size limit', () => {
    const file = new File([new Uint8Array(1000)], 'test.jpg', { type: 'image/jpeg' });
    const result = validateUpload(file);
    expect(result.ok).toBe(true);
  });

  it('accepts valid WebP within size limit', () => {
    const file = new File([new Uint8Array(1000)], 'test.webp', { type: 'image/webp' });
    const result = validateUpload(file);
    expect(result.ok).toBe(true);
  });

  it('accepts valid PDF within size limit', () => {
    const file = new File([new Uint8Array(1000)], 'test.pdf', { type: 'application/pdf' });
    const result = validateUpload(file);
    expect(result.ok).toBe(true);
  });

  it('rejects file exceeding default 25MB limit', () => {
    const oversizeBytes = 26 * 1024 * 1024; // 26MB
    const file = new File([new Uint8Array(oversizeBytes)], 'large.png', { type: 'image/png' });
    const result = validateUpload(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('File quá lớn');
      expect(result.message).toContain('25MB');
    }
  });

  it('respects custom maxMB option', () => {
    const file = new File([new Uint8Array(15 * 1024 * 1024)], 'test.png', { type: 'image/png' });
    const result = validateUpload(file, { maxMB: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('10MB');
    }
  });

  it('rejects unsupported file type', () => {
    const file = new File([new Uint8Array(1000)], 'test.txt', { type: 'text/plain' });
    const result = validateUpload(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Định dạng không hỗ trợ');
    }
  });

  it('supports wildcard accept patterns', () => {
    const file = new File([new Uint8Array(1000)], 'test.jpg', { type: 'image/jpeg' });
    const result = validateUpload(file, { accept: ['image/*'] });
    expect(result.ok).toBe(true);
  });

  it('supports custom accept list', () => {
    const file = new File([new Uint8Array(1000)], 'test.doc', { type: 'application/msword' });
    const result = validateUpload(file, { accept: ['application/msword'] });
    expect(result.ok).toBe(true);
  });

  it('rejects file not in custom accept list', () => {
    const file = new File([new Uint8Array(1000)], 'test.png', { type: 'image/png' });
    const result = validateUpload(file, { accept: ['application/pdf'] });
    expect(result.ok).toBe(false);
  });

  it('checks both size and type, reporting size error first', () => {
    const oversizeBytes = 26 * 1024 * 1024;
    const file = new File([new Uint8Array(oversizeBytes)], 'test.txt', { type: 'text/plain' });
    const result = validateUpload(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('quá lớn');
    }
  });

  it('checks type when size is OK', () => {
    const file = new File([new Uint8Array(1000)], 'test.txt', { type: 'text/plain' });
    const result = validateUpload(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Định dạng');
    }
  });
});
