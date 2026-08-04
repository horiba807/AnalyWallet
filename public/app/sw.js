// インストール処理
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // 新しいService Workerをすぐに有効化する
  self.skipWaiting();
});

// アプティベート処理（古いキャッシュのクリアなど）
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  return self.clients.claim();
});

// 通信の割り込み処理（PWAの必須条件）
self.addEventListener('fetch', (event) => {
  // 最低限リクエストをそのまま通過させる処理
  event.respondWith(fetch(event.request));
});