const DB_NAME = 'pau_brasil_legalized_media';
const DB_VERSION = 1;
const STORE_NAME = 'legalized_files';

function openLegalizedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'docId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open legalized IndexedDB'));
  });
}

export async function saveLegalizedFileToDb(docId: string, dataUrl: string): Promise<void> {
  if (!docId || !dataUrl) return;
  try {
    const db = await openLegalizedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ docId, dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save file'));
    });
    db.close();
  } catch {
    // Ignore IndexedDB quota/block errors
  }
}

export async function loadAllLegalizedFilesFromDb(): Promise<Record<string, string>> {
  try {
    const db = await openLegalizedDb();
    const entries = await new Promise<Array<{ docId: string; dataUrl: string }>>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () =>
          resolve((req.result as Array<{ docId: string; dataUrl: string }>) ?? []);
        req.onerror = () => reject(req.error ?? new Error('Failed to read files'));
      }
    );
    db.close();
    const map: Record<string, string> = {};
    for (const entry of entries) {
      if (entry?.docId && entry?.dataUrl) {
        map[entry.docId] = entry.dataUrl;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function deleteLegalizedFileFromDb(docId: string): Promise<void> {
  if (!docId) return;
  try {
    const db = await openLegalizedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(docId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete file'));
    });
    db.close();
  } catch {
    // Ignore
  }
}
