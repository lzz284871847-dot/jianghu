// 发布时同步版本；只缓存本游戏的静态壳，不上传或缓存玩家存档。
const VERSION='1.0.36';
const BASE=new URL('./',self.registration.scope);
const PREFIX=`jianghu-wanxiang-offline:${BASE.pathname}:`;
const CACHE=PREFIX+VERSION;
const FILES=['index.html','manifest.webmanifest',
 'src/rebuild/app.js','src/rebuild/engine.js','src/rebuild/content.js',
 'src/rebuild/commands.js','src/rebuild/progression.js','src/rebuild/world.js',
 'src/rebuild/equipment.js','src/rebuild/discoveries.js','src/rebuild/condition.js',
 'src/rebuild/resources.js','src/rebuild/planner.js','src/rebuild/crafting.js','src/rebuild/offline.js','src/rebuild/contracts.js','src/rebuild/combat.js','src/rebuild/routes.js','src/rebuild/farming.js','src/rebuild/collection-view.js','src/rebuild/save-files.js','src/rebuild/contacts-view.js','src/rebuild/todos.js','src/rebuild/relationships.js','src/rebuild/encounter-view.js','src/rebuild/market.js'];
const key=path=>new URL(`${path}?v=${VERSION}`,BASE).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(FILES.map(path=>new Request(key(path),{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 const path=url.pathname.slice(BASE.pathname.length)||'index.html';
 if(!FILES.includes(path))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(key(path));
  // 联网优先取新页面；不同版本的模块不能被旧缓存冒充。
  if(path==='index.html'){try{const fresh=await fetch(request);if(fresh.ok)return fresh}catch{}if(cached)return cached;}
  else if(!url.searchParams.has('v')||url.searchParams.get('v')===VERSION){if(cached)return cached;}
  try{return await fetch(request)}catch{return new Response('离线文件尚未准备完成。请联网打开游戏一次后再试。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}
 })());
});
