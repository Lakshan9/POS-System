// ============================================================
//  SERVICE WORKER - PWA OFFLINE SUPPORT
//  Hotel POS System
// ============================================================

const CACHE_NAME = 'hotel-pos-v1';
const OFFLINE_URL = 'offline.html';

// Assets to cache
const ASSETS = [
  '/',
  'index.html',
  'login.html',
  'items-stock.html',
  'report.html',
  'settings.html',
  'tables.html',
  'style.css',
  'style-items-stock.css',
  'style-login.css',
  'style-report.css',
  'style-settings.css',
  'style-tables.css',
  'manifest.json'
];

// ============================================================
//  INSTALL EVENT - Cache all assets
// ============================================================
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

// ============================================================
//  ACTIVATE EVENT - Clean up old caches
// ============================================================
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

// ============================================================
//  FETCH EVENT - Serve from cache or network
// ============================================================
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (requestUrl.origin !== self.location.origin) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          // Check if cache is fresh (less than 24 hours old)
          const cachedDate = cachedResponse.headers.get('date');
          if (cachedDate) {
            const age = Date.now() - new Date(cachedDate).getTime();
            if (age < 86400000) { // 24 hours
              return cachedResponse;
            }
          }
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
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
            
            // Try to return offline page
            return caches.match(OFFLINE_URL)
              .then(offlineResponse => {
                if (offlineResponse) {
                  return offlineResponse;
                }
                
                // Return a simple offline message
                return new Response(
                  '<html><body><h1>You are offline</h1><p>Please connect to the internet to access this page.</p></body></html>',
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

// ============================================================
//  PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Hotel POS',
      message: 'You have a new notification',
      url: '/'
    };
  }
  
  const options = {
    body: data.message || 'New notification',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      date: new Date().toISOString()
    },
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Hotel POS',
      options
    )
  );
});

// ============================================================
//  NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ============================================================
//  BACKGROUND SYNC
// ============================================================
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  console.log('Service Worker: Syncing orders...');
  try {
    // Get pending orders from localStorage (or IndexedDB)
    // This is where you would sync offline orders
    console.log('Service Worker: Sync complete');
  } catch (error) {
    console.error('Service Worker: Sync failed:', error);
  }
}

// ============================================================
//  MESSAGE HANDLER
// ============================================================
self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});