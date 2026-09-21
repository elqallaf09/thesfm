/* Notification-only service worker. Never caches account pages, API replies or credentials. */
self.addEventListener('push', event => {
 let payload;try{payload=event.data?.json();}catch{return;}
 if(!payload)return;
 event.waitUntil(self.registration.showNotification('THE SFM',{body:String(payload.body||'').slice(0,240),icon:'/icons/icon-192.png',data:{url:'/notifications'},tag:'sfm-notification-center'}));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil(clients.openWindow('/notifications'));
});
