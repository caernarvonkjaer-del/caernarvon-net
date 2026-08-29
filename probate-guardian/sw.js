// Versioned app-shell cache for offline startup. Bump CACHE_VERSION on any
// deploy that changes a precached file — that both changes this file's bytes
// (so the browser detects an update) and gives activate() a new cache name
// to switch to, so the old one gets cleaned up.
const CACHE_VERSION='v1';
const CACHE_NAME=`pg-shell-${CACHE_VERSION}`;
const PRECACHE_URLS=[
  './',
  'index.html',
  'manifest.json',
  'lib/bootstrap.min.css',
  'lib/bootstrap.bundle.min.js',
  'lib/html2pdf.bundle.min.js',
  'lib/exceljs.min.js',
  'lib/jszip.min.js',
  'templates/annual-template.js',
  'templates/simplified-template.js',
  'templates/guardian-template.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))))
      .then(()=>self.clients.claim())
  );
});

// Cache-first for the app shell, with the network response cached for next
// time when something wasn't precached. Case data never flows through
// fetch() — it lives in memory and in .sav files written directly via the
// File System Access API — so this only ever handles static asset requests.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(e.request,copy));
        }
        return res;
      }).catch(()=>cached);
    })
  );
});
