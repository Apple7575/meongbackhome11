const CACHE='meongback-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('meongback-offline-')&&k!==CACHE).map(k=>caches.delete(k))))]));});
// Never cache reports, photos, account responses, or authenticated HTML.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});
self.addEventListener('push',event=>{let p={};try{p=event.data?.json()||{};}catch{}event.waitUntil(self.registration.showNotification(p.title||'멍백홈에 새 소식이 있어요',{body:p.body||'새로운 소식을 확인해주세요.',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:p.url||'meongback',data:{url:typeof p.url==='string'&&p.url.startsWith('/#/')?p.url:'/#/my'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(event.notification.data?.url||'/#/my',self.location.origin);event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{for(const c of windows){if(new URL(c.url).origin===self.location.origin){await c.navigate(target.href);return c.focus();}}return clients.openWindow(target.href);}));});
