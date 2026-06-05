import { describe, it, expect } from 'vitest';
import {
  draftKey,
  saveDraft,
  loadDraft,
  getDraftMeta,
  clearDraft,
  createInMemoryStore,
} from './persist';

describe('persist', () => {
  it('draftKey generates correct keys', () => {
    expect(draftKey('page', 42)).toBe('page:42');
    expect(draftKey('task', 100)).toBe('task:100');
  });

  it('saveDraft and loadDraft round-trip manifest + blobs + savedAt', async () => {
    const store = createInMemoryStore();
    const key = 'page:1';
    const manifest = { version: 1, doc: { id: 'doc1', width: 1000, height: 1414 }, layerImages: {} };
    const blob1 = new Blob(['layer1'], { type: 'image/png' });
    const blob2 = new Blob(['layer2'], { type: 'image/png' });
    const blobs = { 'layer-1': blob1, 'layer-2': blob2 };
    const snapshot = { manifest, blobs };

    await saveDraft(key, snapshot, store);

    const loaded = await loadDraft(key, store);
    expect(loaded).not.toBeNull();
    expect(loaded!.manifest).toEqual(manifest);
    expect(Object.keys(loaded!.blobs)).toEqual(['layer-1', 'layer-2']);
    expect(loaded!.blobs['layer-1']).toBe(blob1);
    expect(loaded!.blobs['layer-2']).toBe(blob2);
    expect(typeof loaded!.savedAt).toBe('number');
    expect(loaded!.savedAt).toBeGreaterThan(0);
  });

  it('getDraftMeta returns savedAt without loading full content', async () => {
    const store = createInMemoryStore();
    const key = 'task:5';
    const manifest = { version: 1 };
    const blobs = { 'layer-big': new Blob(['x'.repeat(10000)], { type: 'image/png' }) };
    const snapshot = { manifest, blobs };

    await saveDraft(key, snapshot, store);

    const meta = await getDraftMeta(key, store);
    expect(meta).not.toBeNull();
    expect(typeof meta!.savedAt).toBe('number');
  });

  it('getDraftMeta returns null for missing draft', async () => {
    const store = createInMemoryStore();
    const meta = await getDraftMeta('page:999', store);
    expect(meta).toBeNull();
  });

  it('loadDraft returns null for missing draft', async () => {
    const store = createInMemoryStore();
    const loaded = await loadDraft('page:999', store);
    expect(loaded).toBeNull();
  });

  it('clearDraft removes draft from storage', async () => {
    const store = createInMemoryStore();
    const key = 'page:7';
    const manifest = { version: 1 };
    const blobs = { 'layer-1': new Blob(['x'], { type: 'image/png' }) };

    await saveDraft(key, { manifest, blobs }, store);
    let loaded = await loadDraft(key, store);
    expect(loaded).not.toBeNull();

    await clearDraft(key, store);
    loaded = await loadDraft(key, store);
    expect(loaded).toBeNull();
  });

  it('multiple drafts are stored independently', async () => {
    const store = createInMemoryStore();
    const key1 = 'page:1';
    const key2 = 'page:2';

    const manifest1 = { version: 1, id: 'doc1' };
    const manifest2 = { version: 1, id: 'doc2' };
    const blob1 = new Blob(['a'], { type: 'image/png' });
    const blob2 = new Blob(['b'], { type: 'image/png' });

    await saveDraft(key1, { manifest: manifest1, blobs: { 'layer-1': blob1 } }, store);
    await saveDraft(key2, { manifest: manifest2, blobs: { 'layer-2': blob2 } }, store);

    const loaded1 = await loadDraft(key1, store);
    const loaded2 = await loadDraft(key2, store);

    expect(loaded1!.manifest).toEqual(manifest1);
    expect(loaded2!.manifest).toEqual(manifest2);
    expect(loaded1!.blobs['layer-1']).toBe(blob1);
    expect(loaded2!.blobs['layer-2']).toBe(blob2);
  });
});
