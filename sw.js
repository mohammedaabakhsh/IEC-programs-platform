const CACHE='iec-platform-v2.5.1-google-forms';
const ASSETS=['./','./index.html','./styles.css','./evaluation-v2.css','./app.js','./evaluation-v2.js','./cloud-sync.js','./question-bank.js','./question-bank.css','./program-features.js','./program-features.css','./advanced-features.js','./advanced-features.css','./completion-features.js','./completion-features.css','./insights-reports.js','./insights-reports.css','./launch-features.js','./launch-features.css','./strategic-suite.js','./strategic-suite.css','./mobile-app.css','./mobile-app.js','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');
  if(isPage){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html').then(cached=>cached||caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>{
    const network=fetch(event.request,{cache:'no-store'}).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>cached);
    return cached||network;
  }));
});