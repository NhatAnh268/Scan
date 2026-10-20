const CACHE = "barcode-app-v2";
const SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // data.xlsx: luôn thử lấy bản mới nhất, không có mạng thì dùng bản lưu trên máy (localStorage trong app)
  if (url.pathname.endsWith("data.xlsx")) return;

  // Trang chính: ưu tiên bản mới từ mạng (để cập nhật app), mất mạng mới dùng bản lưu
  if (req.mode === "navigate" || url.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(h => h || caches.match("./index.html")))
    );
    return;
  }

  // Còn lại: ưu tiên cache, không có thì tải mạng rồi lưu lại (gồm cả thư viện CDN)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
