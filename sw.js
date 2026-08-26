/* Service worker: guarda os arquivos para o app abrir offline. */
const CACHE = "politica-live-v2";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./Lula-web.jpg",
  "./Flavio.jpg",
  "./Renan-web.jpg",
  "./Augusto-Cury.jpg",
  "./Rose.webp",
  "./whiterose.webp",
  "./Tiktok.webp",
  "./GG.webp",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Responde na hora pelo cache e atualiza em segundo plano,
   assim um deploy novo aparece no próximo carregamento. */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then((cacheada) => {
      const rede = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => cacheada);
      return cacheada || rede;
    })
  );
});
