const CACHE_NAME = 'clone-social-v1.0.0';
const STATIC_CACHE = 'clone-static-v1.0.0';
const DYNAMIC_CACHE = 'clone-dynamic-v1.0.0';

// Файлы для кеширования при установке
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script-server.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Clearing old cache');
                            return caches.delete(cache);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Перехват запросов
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Пропускаем запросы к API (они должны быть всегда свежими)
    if (url.pathname.startsWith('/api/')) {
        return;
    }
    
    // Пропускаем chrome-extension запросы
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Стратегия: Cache First для статических файлов
    if (request.destination === 'script' || 
        request.destination === 'style' || 
        request.destination === 'image' ||
        request.destination === 'font') {
        
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // Если нет в кеше, загружаем и кешируем
                    return fetch(request)
                        .then(response => {
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            const responseToCache = response.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => {
                                    cache.put(request, responseToCache);
                                });
                            
                            return response;
                        });
                })
        );
        return;
    }
    
    // Стратегия: Network First для HTML страниц
    if (request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Кешируем успешные ответы
                    if (response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Если сеть недоступна, пробуем взять из кеша
                    return caches.match(request)
                        .then(cachedResponse => {
                            return cachedResponse || caches.match('/');
                        });
                })
        );
        return;
    }
    
    // Для остальных запросов используем Network Only
    event.respondWith(fetch(request));
});

// Обработка фоновых синхронизаций
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Фоновая синхронизация
async function doBackgroundSync() {
    try {
        // Здесь можно добавить логику синхронизации данных
        console.log('Service Worker: Background sync completed');
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Обработка push уведомлений
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Новое уведомление в Clone',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Открыть приложение',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'Закрыть',
                icon: '/icons/icon-96x96.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Clone', options)
    );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
