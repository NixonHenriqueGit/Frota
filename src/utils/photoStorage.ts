const DB_NAME = 'pau_brasil_frota_media';
const DB_VERSION = 1;
const STORE_NAME = 'vehicle_photos';

function normalizePlateKey(plate: string): string {
  return plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'plateKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveVehiclePhotoToDb(plate: string, dataUrl: string): Promise<void> {
  const plateKey = normalizePlateKey(plate);
  if (!plateKey) return;
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ plateKey, dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to write photo'));
    });
    db.close();
  } catch {
    // Ignore storage errors if IndexedDB is blocked
  }
}

export async function loadAllVehiclePhotosFromDb(): Promise<Record<string, string>> {
  try {
    const db = await openMediaDb();
    const entries = await new Promise<Array<{ plateKey: string; dataUrl: string }>>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () =>
          resolve((req.result as Array<{ plateKey: string; dataUrl: string }>) ?? []);
        req.onerror = () => reject(req.error ?? new Error('Failed to read photos'));
      }
    );
    db.close();
    const map: Record<string, string> = {};
    for (const item of entries) {
      if (item?.plateKey && item?.dataUrl) {
        map[item.plateKey] = item.dataUrl;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function clearAllVehiclePhotosFromDb(): Promise<void> {
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear photos'));
    });
    db.close();
  } catch {
    // Ignore
  }
}
