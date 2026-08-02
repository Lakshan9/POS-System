const CACHE_NAME = 'hotel-pos-v2';
const OFFLINE_URL = 'offline.html';

const ASSETS = [
  '/',
  'index.html',
  'login.html',
  'items-stock.html',
  'report.html',
  'settings.html',
  'tables.html',
  'offline.html',
  'style.css',
  'style-items-stock.css',
  'style-login.css',
  'style-report.css',
  'style-settings.css',
  'style-tables.css',
  'manifest.json'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files...');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Cache failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  if (requestUrl.origin !== self.location.origin) {
    return;
  }
  
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.warn('Service Worker: Cache put failed:', error);
              });
            
            return response;
          })
          .catch(error => {
            console.warn('Service Worker: Network fetch failed:', error);
            
            return caches.match(OFFLINE_URL)
              .then(offlineResponse => {
                if (offlineResponse) {
                  return offlineResponse;
                }
                
                return new Response(
                  '<html><body style="font-family:Arial;text-align:center;padding:50px;background:#0f172a;color:white;"><h1>📡 You are offline</h1><p>Please connect to the internet to access this page.</p></body></html>',
                  {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                      'Content-Type': 'text/html'
                    })
                  }
                );
              });
          });
      })
  );
});

self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Hotel POS',
      message: 'You have a new notification'
    };
  }
  
  const options = {
    body: data.message || 'New notification',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="40" fill="%238b5cf6"/%3E%3Ctext x="96" y="120" text-anchor="middle" font-size="100" fill="white"%3E%F0%9F%8D%BD%3C/text%3E%3Ctext x="96" y="165" text-anchor="middle" font-size="30" fill="white" font-weight="bold"%3EPOS%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"%3E%3Crect width="72" height="72" rx="20" fill="%238b5cf6"/%3E%3Ctext x="36" y="50" text-anchor="middle" font-size="40" fill="white"%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Hotel POS',
      options
    )
  );
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(windowClients => {
      for (let client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});