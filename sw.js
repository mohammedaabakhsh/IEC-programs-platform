const CACHE='iec-platform-v2.0.2-sidebar-scroll';
const ASSETS=['./','./index.html','./styles.css','./evaluation-v2.css','./app.js','./evaluation-v2.js','./cloud-sync.js','./question-bank.js','./question-bank.css','./program-features.js','./program-features.css','./advanced-features.js','./advanced-features.css','./completion-features.js','./completion-features.css','./insights-reports.js','./insights-reports.css','./launch-features.js','./launch-features.css','./strategic-suite.js','./strategic-suite.css','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match('./index.html'))));
});