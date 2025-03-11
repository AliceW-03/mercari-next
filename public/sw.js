// Add version for cache management
const CACHE_VERSION = "v1"
const CACHE_NAME = `app-cache-${CACHE_VERSION}`

// Add install event handler
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache essential assets
      return cache.addAll([
        "/",
        "/icons/192.png",
        "/icons/512.png",
        // Add other assets you want to cache
      ])
    })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Add activate event handler
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith("app-cache-") && name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all clients immediately
  self.clients.claim()
})

self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || "/icon.png",
      // badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
      },
      image:
        "https://static.mercdn.net/item/detail/webp/photos/m53658219971_1.jpg?1722428919",
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.")
  event.notification.close()
  event.waitUntil(clients.openWindow("<https://your-website.com>"))
})
