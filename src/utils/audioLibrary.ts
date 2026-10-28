/** Files belong in IndexedDB; localStorage has a small string-only quota. */
const DB_NAME = 'joe-dizi-media-v1';
const STORE = 'audio-files';

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Offline audio storage unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioFile(songId: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openLibrary();
    return await new Promise<boolean>(resolve => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(blob, songId);
      transaction.oncomplete = () => { db.close(); resolve(true); };
      transaction.onerror = () => { db.close(); resolve(false); };
      transaction.onabort = () => { db.close(); resolve(false); };
    });
  } catch (error) {
    console.warn('This browser could not keep the imported audio offline', error);
    return false;
  }
}

export async function getAudioFile(songId: string): Promise<Blob | null> {
  try {
    const db = await openLibrary();
    return await new Promise<Blob | null>(resolve => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(songId);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  } catch { return null; }
}

/** Remove the imported audio as well as the songbook's localStorage entry. */
export async function deleteAudioFile(songId: string): Promise<boolean> {
  try {
    const db = await openLibrary();
    return await new Promise<boolean>(resolve => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(songId);
      transaction.oncomplete = () => { db.close(); resolve(true); };
      transaction.onerror = () => { db.close(); resolve(false); };
      transaction.onabort = () => { db.close(); resolve(false); };
    });
  } catch { return false; }
}
