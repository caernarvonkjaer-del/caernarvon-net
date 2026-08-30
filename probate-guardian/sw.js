// dist/web/sw.js is generated from this source file after Vite has emitted
// every hashed chunk. The token below is replaced with one content-revisioned
// manifest whose entries are classified as either critical or offline.
const PRECACHE_MANIFEST=/*__PG_PRECACHE_MANIFEST__*/ null;
const CACHE_PREFIX='pg-';
const CACHE_VERSION=PRECACHE_MANIFEST&&PRECACHE_MANIFEST.cacheVersion;
const SHELL_CACHE=`${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const OFFLINE_CACHE=`${CACHE_PREFIX}offline-${CACHE_VERSION}`;
const READY_MARKER_URL=new URL(`__pg_offline_ready__/${CACHE_VERSION}`,self.registration.scope).href;
const entries=PRECACHE_MANIFEST?PRECACHE_MANIFEST.entries:[];
const criticalEntries=entries.filter(entry=>entry.tier==='critical');
const offlineEntries=entries.filter(entry=>entry.tier==='offline');
const entryByUrl=new Map(entries.map(entry=>[new URL(entry.url,self.registration.scope).href,entry]));
let offlinePackPromise=null;

function requestFor(entry){
  return new Request(new URL(entry.url,self.registration.scope),{cache:'reload'});
}

async function responseRevision(response){
  const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,16);
}

async function fetchVerified(entry,request=requestFor(entry)){
  const response=await fetch(request);
  if(response.redirected)throw new Error(`Redirected response for ${entry.url} was not cached.`);
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const actualRevision=await responseRevision(response);
  if(actualRevision!==entry.revision)throw new Error(`Revision mismatch for ${entry.url}`);
  return response;
}

function recoveryResponse(message,status=502){
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>Probate Guardian loading problem</title></head><body><h1>Probate Guardian could not load this page</h1><p>${message}</p><p>Save any downloaded work, check that you are using the current Probate Guardian address, and reload when your connection is stable.</p></body></html>`,{
    status,
    headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},
  });
}

function isUserDataUrl(url){
  return url.protocol==='blob:'||/\.sav$/i.test(url.pathname)||/(^|\/)case-data(?:\/|$)/i.test(url.pathname);
}

async function installCriticalShell(){
  if(!PRECACHE_MANIFEST)throw new Error('This service worker has no generated precache manifest.');
  const cache=await caches.open(SHELL_CACHE);
  try{
    const responses=await Promise.all(criticalEntries.map(async entry=>({entry,response:await fetchVerified(entry)})));
    await Promise.all(responses.map(({entry,response})=>cache.put(requestFor(entry),response)));
  }catch(error){
    await caches.delete(SHELL_CACHE);
    throw error;
  }
}

async function offlineStatus(){
  if(!PRECACHE_MANIFEST)return {ready:false,available:false,cacheVersion:null,criticalCount:0,offlineCount:0,cachedCount:0};
  const cache=await caches.open(OFFLINE_CACHE);
  const marker=await cache.match(READY_MARKER_URL);
  let ready=false;
  if(marker){
    try{
      const value=await marker.json();
      ready=value.ready===true&&value.cacheVersion===CACHE_VERSION;
    }catch{}
  }
  const cached=await cache.keys();
  return {
    ready,
    available:true,
    cacheVersion:CACHE_VERSION,
    criticalCount:criticalEntries.length,
    offlineCount:offlineEntries.length,
    cachedCount:cached.filter(request=>request.url!==READY_MARKER_URL).length,
  };
}

async function downloadOfflinePack(){
  const existing=await offlineStatus();
  if(existing.ready)return existing;
  const cache=await caches.open(OFFLINE_CACHE);
  const failures=[];
  for(const entry of offlineEntries){
    const request=requestFor(entry);
    if(await cache.match(request))continue;
    try{
      const response=await fetchVerified(entry,request);
      await cache.put(request,response);
    }catch(error){
      failures.push(`${entry.url}: ${error&&error.message||error}`);
    }
  }
  if(failures.length)throw new Error(`Offline pack incomplete (${failures.length} failed): ${failures.join('; ')}`);
  await cache.put(READY_MARKER_URL,new Response(JSON.stringify({ready:true,cacheVersion:CACHE_VERSION}),{
    headers:{'Content-Type':'application/json'},
  }));
  return offlineStatus();
}

function reply(event,message){
  if(event.ports&&event.ports[0])event.ports[0].postMessage(message);
  else if(event.source)event.source.postMessage(message);
}

self.addEventListener('install',event=>{
  event.waitUntil(installCriticalShell());
});

// Do not claim existing clients. On an update, tabs running the previous
// JavaScript remain controlled by their matching worker until they reload.
// The tab that explicitly approves an update reloads after activation.

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='GET_OFFLINE_STATUS'){
    event.waitUntil(offlineStatus().then(status=>reply(event,{type:'OFFLINE_STATUS',...status})));
    return;
  }
  if(event.data&&event.data.type==='DOWNLOAD_OFFLINE_PACK'){
    const attempt=offlinePackPromise??=downloadOfflinePack();
    event.waitUntil(
      attempt
        .then(status=>reply(event,{type:'OFFLINE_PACK_READY',...status}))
        .catch(error=>reply(event,{type:'OFFLINE_PACK_FAILED',message:String(error&&error.message||error)}))
        .finally(()=>{if(offlinePackPromise===attempt)offlinePackPromise=null;})
    );
    return;
  }
  if(event.data&&event.data.type==='ACTIVATE_UPDATE'){
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch',event=>{
  if(!PRECACHE_MANIFEST||event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||isUserDataUrl(url))return;

  if(event.request.mode==='navigate'){
    if(event.request.redirect==='error'){
      event.respondWith(
        fetch(event.request)
          .then(response=>response.redirected?recoveryResponse('The requested host redirected this navigation, so the service worker did not serve cached app files for it.'):response)
          .catch(()=>recoveryResponse('The navigation failed before the app shell could be loaded.'))
      );
      return;
    }
    event.respondWith(
      caches.open(SHELL_CACHE)
        .then(cache=>cache.match(new URL('./index.html',self.registration.scope)))
        .then(cached=>cached&&!cached.redirected?cached:fetch(event.request))
        .then(response=>response.redirected?recoveryResponse('The requested host redirected this navigation, so the service worker did not serve cached app files for it.'):response)
        .catch(()=>recoveryResponse('The app shell was not available from the cache or the network.'))
    );
    return;
  }

  const normalized=new URL(url.href);normalized.search='';normalized.hash='';
  const entry=entryByUrl.get(normalized.href);
  if(!entry)return;
  const cacheName=entry.tier==='critical'?SHELL_CACHE:OFFLINE_CACHE;
  event.respondWith(
    caches.open(cacheName).then(async cache=>{
      const cached=await cache.match(normalized.href);
      if(cached&&!cached.redirected)return cached;
      const response=await fetch(event.request);
      if(response.ok&&!response.redirected){
        const actualRevision=await responseRevision(response);
        if(actualRevision===entry.revision)await cache.put(normalized.href,response.clone());
      }
      return response;
    })
  );
});
