/* ==============================
   چشمک - Service Worker
   برای کار آفلاین
   ============================== */

const CACHE_NAME = 'cheshmak-v63';
const IS_DEV_MODE = true;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css'
];

// نصب - کش کردن فایل‌ها
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE.map(url => {
        return new Request(url, { mode: 'no-cors' });
      })).catch(err => {
        console.log('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// فعال‌سازی
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// fetch - از کش استفاده کن، اگه نبود از شبکه
self.addEventListener('fetch', (event) => {
  // فقط درخواست‌های GET رو کش کن
  if (event.request.method !== 'GET') return;

    // 🔥 این خط برای اپ‌های PWA در اندروید حیاتیه
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // درخواست‌های کروم extension رو نادیده بگیر
  if (!event.request.url.startsWith('http')) return;

  // 🧪 حالت تست: اگه true باشه، مستقیم از شبکه لود می‌کنه و کش رو دور می‌زنه
  if (typeof IS_DEV_MODE !== 'undefined' && IS_DEV_MODE) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      // اگه از شبکه جواب گرفتی، همون رو بده و توی کش هم ذخیره کن
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // اگه شبکه قطع بود، از کش بده
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
       })
  );
});