/**
 * FasoData Service Worker — v1.0
 *
 * Stratégies de cache :
 *   - Assets statiques (JS/CSS/fonts) : Cache First (longue durée)
 *   - Pages Next.js : Network First avec fallback cache
 *   - API /api/prices/* : Network First, fallback données cachées
 *   - Page /terrain : précachée, toujours disponible hors-ligne
 *
 * Background Sync :
 *   - Les relevés de prix soumis hors-ligne sont stockés dans IndexedDB
 *   - Quand la connexion revient → sync automatique vers l'API
 */

const CACHE_VERSION  = 'fasodata-v1';
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE  = `${CACHE_VERSION}-dynamic`;
const API_CACHE      = `${CACHE_VERSION}-api`;

const SYNC_TAG_PRICES = 'sync-prices';

// Pages et assets précachés dès l'installation
const PRECACHE_URLS = [
  '/terrain',
  '/carte-prix',
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon.svg',
];

// ── Installation ──────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installation v1');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ── Activation ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('fasodata-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions Chrome
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // API /api/prices/* — Network First avec cache de secours
  if (url.pathname.startsWith('/api/prices')) {
    event.respondWith(networkFirst(request, API_CACHE, 3000));
    return;
  }

  // Assets statiques (_next/static) — Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Pages Next.js — Network First avec fallback
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstWithFallback(request, DYNAMIC_CACHE));
    return;
  }

  // Tuiles carte (CartoDB, OSM) — Cache First, 7 jours
  if (url.hostname.includes('carto') || url.hostname.includes('openstreetmap')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }
});

// ── Stratégies de cache ───────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ressource indisponible', { status: 503 });
  }
}

async function networkFirst(request, cacheName, timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), timeoutMs);
    const response   = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: 'Hors ligne', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback : page hors-ligne
    return caches.match('/offline.html') ?? new Response(
      '<html><body><h1>FasoData — Hors connexion</h1><p>Cette page n\'est pas disponible sans internet.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ── Background Sync — Relevés de prix hors-ligne ──────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG_PRICES) {
    console.log('[SW] Background Sync — envoi relevés hors-ligne');
    event.waitUntil(syncOfflinePrices());
  }
});

async function syncOfflinePrices() {
  const db    = await openIndexedDB();
  const queue = await getAllFromDB(db, 'priceQueue');

  console.log(`[SW] ${queue.length} relevé(s) à synchroniser`);

  for (const item of queue) {
    try {
      const formData = new URLSearchParams();
      formData.append('from',   item.reporter || '+00000000000');
      formData.append('to',     '+22699000000');
      formData.append('text',   `${item.commodity.toUpperCase()} ${item.region.toUpperCase()} ${item.price}`);
      formData.append('date',   item.submittedAt || new Date().toISOString());
      formData.append('id',     `offline_${item.id}`);

      const response = await fetch('/api/prices/sms/at-callback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formData.toString(),
      });

      if (response.ok || response.status === 200) {
        await deleteFromDB(db, 'priceQueue', item.id);
        console.log(`[SW] ✅ Relevé synchronisé : ${item.commodity}/${item.region}/${item.price}`);
      }
    } catch (err) {
      console.error(`[SW] ❌ Erreur sync relevé ${item.id}:`, err);
    }
  }

  db.close();

  // Notifier les clients de la synchronisation réussie
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) =>
    client.postMessage({ type: 'SYNC_COMPLETE', count: queue.length })
  );
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('fasodata-offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('priceQueue')) {
        const store = db.createObjectStore('priceQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('submittedAt', 'submittedAt');
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

function getAllFromDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function deleteFromDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title ?? 'FasoData', {
        body:    data.body ?? '',
        icon:    '/icons/icon.svg',
        badge:   '/icons/icon.svg',
        tag:     data.tag ?? 'fasodata-alert',
        data:    data,
        actions: [
          { action: 'view', title: '📊 Voir la carte' },
          { action: 'dismiss', title: 'Ignorer' },
        ],
      })
    );
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/carte-prix')
    );
  }
});

console.log('[SW] FasoData Service Worker chargé ✅');
