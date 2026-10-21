// Isolated Chromium cache acceptance, not a physical iPhone/Safari test.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {fresh,KEY} from '../county/engine.js';import {places,VERSION} from '../county/content.js';
const {chromium}=await import(process.env.QINGHE_PLAYWRIGHT_MODULE||'playwright');const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',p.endsWith('.webp')?'image/webp':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.QINGHE_CHROMIUM_PATH?{executablePath:process.env.QINGHE_CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}: {})});const ctx=await browser.newContext({viewport:{width:390,height:812}}),page=await ctx.newPage(),url='http://127.0.0.1:'+server.address().port+'/county/';
 await page.goto(url);await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const files=await page.evaluate(async version=>{const k=(await caches.keys()).find(k=>k.includes(version));return (await (await caches.open(k)).keys()).map(r=>new URL(r.url).pathname);},VERSION);assert.equal(files.length,80);assert.equal(files.filter(p=>p.endsWith('.webp')).length,4);
 await ctx.setOffline(true);
 for(const place of Object.keys(places)){const s=fresh();s.place=place;await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s});await page.reload();await page.locator('#local-art').evaluate(img=>img.decode());assert.equal(await page.locator('#local-map').evaluate(n=>n.classList.contains('art-ready')),true);assert.equal(await page.locator('#local-scene').isVisible(),true);}
 await page.locator('[data-map-kind="facility"]').first().click();assert.equal(await page.locator('#local-contact').isVisible(),true);console.log(JSON.stringify({cachedFiles:files.length,offlinePlaces:16,offlineFacilityClick:true,actualPhone:false}));
}finally{if(browser)await browser.close();server.close();}
