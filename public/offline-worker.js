/* Public offline shell only. Never cache account/API responses or private HTML. */
const CACHE='steady-public-offline-v3';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const response=await fetch('/offline',{cache:'reload',credentials:'omit'});
 if(!response.ok)throw new Error('Offline shell unavailable');
 const html=await response.clone().text();await cache.put('/offline',response);
 const assets=[...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')))];
 await cache.addAll(assets);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('steady-public-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/_next/static/')){event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;})());return;}
 if(request.mode==='navigate'&&url.pathname==='/offline'){event.respondWith((async()=>{try{const response=await fetch('/offline',{credentials:'omit'});if(!response.ok)throw new Error('Offline shell unavailable');const html=await response.clone().text(),cache=await caches.open(CACHE);const assets=[...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')))];await cache.addAll(assets);await cache.put('/offline',response.clone());return response;}catch{return await caches.match('/offline')||new Response('Reconnect to open Steady.',{status:503});}})());return;}
 if(request.mode==='navigate'&&!url.pathname.startsWith('/auth/')&&!url.pathname.startsWith('/api/'))event.respondWith(fetch(request).catch(async()=>{const cached=await caches.match('/offline');return cached||new Response('Reconnect to open Steady.',{status:503});}));
});
