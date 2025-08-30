const CACHE_NAME = 'tdm-land-management-v1.1.0';
const OFFLINE_URL = '/offline.html';
const DATA_CACHE_NAME = 'tdm-data-cache-v1.1.0';

// รายการไฟล์ที่ต้อง cache สำหรับใช้งาน offline
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/offline.html',
  '/script.js',
  '/styles.css',
  '/manifest.json',
  '/icons/tdm-icon-192x192.png',
  '/icons/tdm-icon-512x512.png',
  // Local fallbacks for external libraries
  '/libs/font-awesome.css',
  '/libs/leaflet.css', 
  '/libs/leaflet.js'
];

// External CDN resources with local fallbacks
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js'
];

// API endpoints ที่จำเป็นต้อง cache
const API_CACHE_URLS = [
  '/api/organizations',
  '/api/parcels'
];

// ติดตั้ง Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(CACHE_NAME).then(async cache => {
        console.log('📦 Caching static files...');
        // Cache local files
        await cache.addAll(STATIC_CACHE_URLS);
        
        // Try to cache external resources with fallback handling
        for (const url of EXTERNAL_RESOURCES) {
          try {
            await cache.add(url);
            console.log('✅ Cached external resource:', url);
          } catch (error) {
            console.warn('⚠️ Failed to cache external resource:', url, error);
          }
        }
      }),
      
      // Initialize data cache
      caches.open(DATA_CACHE_NAME),
      
      // Skip waiting เพื่อให้ SW ใหม่เข้ามาทำงานทันที
      self.skipWaiting()
    ])
  );
});

// เปิดใช้งาน Service Worker
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // ล้าง cache เก่า
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients ทันที
      self.clients.claim(),
      
      // Initialize offline data storage
      initializeOfflineStorage()
    ])
  );
});

// จัดการ fetch requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ข้าม chrome-extension และ non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

// Initialize offline storage
async function initializeOfflineStorage() {
  try {
    // สร้างข้อมูลตัวอย่างสำหรับใช้งาน offline
    const sampleData = {
      organizations: ['อบต.ไชยคราม', 'อบต.บางไผ่', 'อบต.สามโคก'],
      landTypes: ['ที่ดิน', 'สวนยางพารา', 'สวนปาล์ม', 'นาข้าว', 'บ้านและที่อยู่อาศัย']
    };
    
    const cache = await caches.open(DATA_CACHE_NAME);
    await cache.put('/api/organizations', new Response(JSON.stringify(sampleData.organizations), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
    console.log('📊 Offline data initialized');
  } catch (error) {
    console.error('❌ Failed to initialize offline data:', error);
  }
}

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // สำหรับ API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request);
    }
    
    // สำหรับ static files
    return await handleStaticRequest(request);
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
    
    // ถ้าเป็น navigation request และ offline
    if (request.mode === 'navigate') {
      return await caches.match(OFFLINE_URL) || new Response('Offline');
    }
    
    return new Response('Network error', { status: 500 });
  }
}

// จัดการ API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname + url.search;
  
  try {
    // สำหรับ private network/localhost - พยายาม network ก่อน
    let networkResponse;
    
    if (url.hostname === 'localhost' || url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.') || url.hostname.startsWith('172.')) {
      // Private network - ให้เวลามากขึ้นสำหรับการเชื่อมต่อ
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 วินาที timeout
      
      try {
        networkResponse = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log('⏱️ Private network timeout, falling back to cache');
        }
        throw fetchError;
      }
    } else {
      // Public network - ใช้ timeout ปกติ
      networkResponse = await fetch(request);
    }
    
    // ถ้าเป็น GET request ที่สำเร็จ ให้ cache ไว้
    if (request.method === 'GET' && networkResponse.ok) {
      const dataCache = await caches.open(DATA_CACHE_NAME);
      dataCache.put(cacheKey, networkResponse.clone());
      console.log('💾 Cached API response:', cacheKey);
    }
    
    // ถ้าเป็น POST request ที่สำเร็จ ให้ลบข้อมูล offline ที่เกี่ยวข้อง
    if (request.method === 'POST' && networkResponse.ok) {
      await cleanupSyncedData(request);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('🔄 Network failed for API:', cacheKey, error.message);
    
    // ถ้า network ล้มเหลว
    if (request.method === 'GET') {
      // ลอง get จาก cache
      const dataCache = await caches.open(DATA_CACHE_NAME);
      const cachedResponse = await dataCache.match(cacheKey);
      if (cachedResponse) {
        console.log('✅ Serving from cache:', cacheKey);
        return cachedResponse;
      }
      
      // ถ้าไม่มีใน cache ให้ส่ง default data
      if (url.pathname === '/api/organizations') {
        return new Response(JSON.stringify(['อบต.ไชยคราม', 'อบต.บางไผ่', 'อบต.สามโคก']), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
    } else if (request.method === 'POST') {
      // เก็บข้อมูลไว้สำหรับ sync ภายหลัง
      await storeOfflineData(request);
      return new Response(JSON.stringify({ 
        success: true, 
        offline: true, 
        message: 'ข้อมูลถูกเก็บไว้แล้ว จะส่งเมื่อมีการเชื่อมต่อใหม่' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// จัดการ static file requests  
async function handleStaticRequest(request) {
  try {
    // พยายาม fetch จาก network ก่อน
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('🔄 Network failed, checking cache for:', request.url);
    
    // ถ้า network ล้มเหลว ให้ใช้จาก cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // ถ้าเป็น navigation request ให้ใช้ offline page
    if (request.mode === 'navigate') {
      return await caches.match(OFFLINE_URL) || new Response('Offline');
    }
    
    throw error;
  }
}

// เก็บข้อมูลสำหรับ sync ภายหลัง
async function storeOfflineData(request) {
  try {
    const data = await request.clone().json();
    const offlineData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: data,
      timestamp: Date.now(),
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // เก็บข้อมูลใน IndexedDB
    await saveToIndexedDB(offlineData);
    console.log('💾 Data stored for offline sync:', offlineData.id);
    
    // ลงทะเบียน background sync
    if ('serviceWorker' in self && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register('background-sync');
    }
    
  } catch (error) {
    console.error('❌ Failed to store offline data:', error);
  }
}

// ทำความสะอาดข้อมูลที่ sync แล้ว
async function cleanupSyncedData(request) {
  try {
    const data = await request.clone().json();
    if (data.parcel_cod) {
      await removePendingDataByParcelCode(data.parcel_cod);
      console.log('🧹 Cleaned up synced data for parcel:', data.parcel_cod);
    }
  } catch (error) {
    console.error('❌ Failed to cleanup synced data:', error);
  }
}

// บันทึกข้อมูลใน IndexedDB
function saveToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TDM_OfflineData', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending'], 'readwrite');
      const store = transaction.objectStore('pending');
      
      store.add(data);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // ลบ object store เก่าถ้ามี
      if (db.objectStoreNames.contains('pending')) {
        db.deleteObjectStore('pending');
      }
      
      // สร้าง object store ใหม่
      const store = db.createObjectStore('pending', { keyPath: 'id' });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('parcel_cod', 'body.parcel_cod', { unique: false });
      store.createIndex('url', 'url', { unique: false });
    };
  });
}

// Background Sync สำหรับ sync ข้อมูลเมื่อออนไลน์
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync ข้อมูลที่เก็บไว้ offline
async function syncOfflineData() {
  try {
    const pendingData = await getAllPendingData();
    console.log(`📤 Found ${pendingData.length} offline items to sync...`);
    
    if (pendingData.length === 0) {
      return;
    }
    
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const item of pendingData) {
      try {
        console.log(`🔄 Syncing item ${item.id}...`);
        
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            ...item.headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.body)
        });
        
        if (response.ok) {
          await removePendingData(item.id);
          syncedCount++;
          console.log(`✅ Successfully synced item: ${item.id}`);
          
          // แจ้งเตือนไปยัง client
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: item.body,
              timestamp: new Date().toLocaleString('th-TH')
            });
          });
        } else {
          failedCount++;
          console.log(`❌ Failed to sync item ${item.id}: ${response.status}`);
        }
      } catch (error) {
        failedCount++;
        console.log(`❌ Network error syncing item ${item.id}:`, error.message);
      }
    }
    
    console.log(`📊 Sync completed: ${syncedCount} success, ${failedCount} failed`);
    
    // แจ้งผลรวม
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        syncedCount,
        failedCount,
        timestamp: new Date().toLocaleString('th-TH')
      });
    });
    
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// ดึงข้อมูลที่รอ sync ทั้งหมด
function getAllPendingData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TDM_OfflineData', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending'], 'readonly');
      const store = transaction.objectStore('pending');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// ลบข้อมูลที่ sync แล้ว
function removePendingData(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TDM_OfflineData', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending'], 'readwrite');
      const store = transaction.objectStore('pending');
      
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// ลบข้อมูลตาม parcel code
function removePendingDataByParcelCode(parcelCode) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TDM_OfflineData', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending'], 'readwrite');
      const store = transaction.objectStore('pending');
      const index = store.index('parcel_cod');
      const getRequest = index.getAll(parcelCode);
      
      getRequest.onsuccess = () => {
        const items = getRequest.result;
        let deleteCount = 0;
        
        items.forEach(item => {
          store.delete(item.id);
          deleteCount++;
        });
        
        transaction.oncomplete = () => {
          console.log(`🗑️ Removed ${deleteCount} offline items for parcel: ${parcelCode}`);
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

// Push notifications (สำหรับอนาคต)
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('ระบบจัดการที่ดิน', options)
    );
  }
});

console.log('🚀 Service Worker loaded successfully!');
