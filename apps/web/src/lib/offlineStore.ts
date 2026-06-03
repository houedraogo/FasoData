/**
 * Helper IndexedDB — file d'attente de relevés de prix hors-ligne.
 * Utilisé par la page /terrain quand l'enquêteur est sans connexion.
 */

export interface OfflinePriceEntry {
  id?:         number;       // auto-increment IDB key
  commodity:   string;
  region:      string;
  price:       number;
  reporter:    string;       // numéro de téléphone ou identifiant
  submittedAt: string;       // ISO date string
  synced:      boolean;
}

const DB_NAME    = "fasodata-offline";
const DB_VERSION = 1;
const STORE_NAME = "priceQueue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB non disponible (SSR)"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("submittedAt", "submittedAt");
        store.createIndex("synced",      "synced");
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

/** Ajouter un relevé à la file d'attente. */
export async function queuePriceEntry(entry: Omit<OfflinePriceEntry, "id" | "synced">): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add({ ...entry, synced: false });
    req.onsuccess = (e) => resolve((e.target as IDBRequest).result as number);
    req.onerror   = (e) => reject((e.target as IDBRequest).error);
    tx.oncomplete = () => db.close();
  });
}

/** Récupérer tous les relevés en attente. */
export async function getPendingEntries(): Promise<OfflinePriceEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => {
      db.close();
      resolve(((e.target as IDBRequest).result as OfflinePriceEntry[]).filter((r) => !r.synced));
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/** Supprimer un relevé après synchronisation. */
export async function deleteEntry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror   = (e) => reject((e.target as IDBRequest).error);
  });
}

/** Déclencher la synchronisation via Background Sync (si supporté). */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
      .sync.register("sync-prices");
    console.log("[PWA] Background Sync enregistré");
    return true;
  } catch {
    return false;
  }
}

/** Synchronisation manuelle (fallback si Background Sync non disponible). */
export async function manualSync(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingEntries();
  let synced = 0, failed = 0;

  for (const entry of pending) {
    try {
      const fd = new URLSearchParams();
      fd.append("from", entry.reporter);
      fd.append("to",   "+22699000000");
      fd.append("text", `${entry.commodity.toUpperCase()} ${entry.region.toUpperCase()} ${entry.price}`);
      fd.append("date", entry.submittedAt);
      fd.append("id",   `offline_${entry.id}`);

      const resp = await fetch("/api/prices/sms/at-callback", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    fd.toString(),
      });

      if (resp.ok) {
        await deleteEntry(entry.id!);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
