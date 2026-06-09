
export type DraftSnapshot = {
  manifest: unknown;
  blobs: Record<string, Blob>;
};

export type StoredDraft = DraftSnapshot & {
  key: string;
  savedAt: number;
};

/**
 * Internal abstraction for draft storage.
 * Enables testability by allowing injection of an in-memory store.
 */
interface DraftStore {
  get(key: string): Promise<StoredDraft | null>;
  set(key: string, draft: StoredDraft): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * IndexedDB-backed draft store (production default).
 */
class IndexedDBDraftStore implements DraftStore {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('manga-studio', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'key' });
        }
      };
    });
  }

  async get(key: string): Promise<StoredDraft | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || null);
    });
  }

  async set(_key: string, draft: StoredDraft): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.put(draft);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.delete(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }
}

/**
 * Generate a draft key for a page or task.
 * @param kind 'page' or 'task'
 * @param id numeric ID
 */
export function draftKey(kind: 'page' | 'task', id: number): string {
  return `${kind}:${id}`;
}

/**
 * Save a draft snapshot (manifest + blobs) to storage.
 * @param key draft key from draftKey()
 * @param snapshot { manifest, blobs } from serializeDoc()
 * @param store optional injected store (for testing); defaults to IndexedDB
 */
export async function saveDraft(
  key: string,
  snapshot: DraftSnapshot,
  store?: DraftStore
): Promise<void> {
  const s = store ?? new IndexedDBDraftStore();
  const draft: StoredDraft = {
    key,
    manifest: snapshot.manifest,
    blobs: snapshot.blobs,
    savedAt: Date.now(),
  };
  await s.set(key, draft);
}

/**
 * Load a draft from storage.
 * @param key draft key from draftKey()
 * @param store optional injected store (for testing); defaults to IndexedDB
 * @returns the full draft with manifest, blobs, and savedAt time, or null if not found
 */
export async function loadDraft(
  key: string,
  store?: DraftStore
): Promise<{ manifest: unknown; blobs: Record<string, Blob>; savedAt: number } | null> {
  const s = store ?? new IndexedDBDraftStore();
  const draft = await s.get(key);
  if (!draft) return null;
  return {
    manifest: draft.manifest,
    blobs: draft.blobs,
    savedAt: draft.savedAt,
  };
}

/**
 * Get metadata (savedAt time) for a draft without loading full content.
 * @param key draft key from draftKey()
 * @param store optional injected store (for testing); defaults to IndexedDB
 * @returns { savedAt } if exists, null otherwise
 */
export async function getDraftMeta(
  key: string,
  store?: DraftStore
): Promise<{ savedAt: number } | null> {
  const s = store ?? new IndexedDBDraftStore();
  const draft = await s.get(key);
  if (!draft) return null;
  return { savedAt: draft.savedAt };
}

/**
 * Clear (delete) a draft from storage.
 * @param key draft key from draftKey()
 * @param store optional injected store (for testing); defaults to IndexedDB
 */
export async function clearDraft(
  key: string,
  store?: DraftStore
): Promise<void> {
  const s = store ?? new IndexedDBDraftStore();
  await s.delete(key);
}

/**
 * Internal export for testing: factory for in-memory store.
 */
export function createInMemoryStore(): DraftStore {
  const data = new Map<string, StoredDraft>();
  return {
    async get(key: string) {
      return data.get(key) || null;
    },
    async set(key: string, draft: StoredDraft) {
      data.set(key, draft);
    },
    async delete(key: string) {
      data.delete(key);
    },
  };
}
