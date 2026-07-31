self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
  // オフライン対応をする場合はここにキャッシュ処理を書きますが、
  // 今回はインストール可能にするための最低限の記述です
});