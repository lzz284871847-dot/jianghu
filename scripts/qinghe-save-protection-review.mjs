// Isolated browser saves only; this is not a physical phone test.
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {fresh,KEY} from '../county/engine.js';
const {chromium}=await import(process.env.QINGHE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/county/';let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.QINGHE_CHROMIUM_PATH?{executablePath:process.env.QINGHE_CHROMIUM_PATH}: {})});
 const context=await browser.newContext({viewport:{width:390,height:812}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#create button[type="submit"]:enabled').waitFor();
 // Seed the unchanged primary format used by the previous release, before any new backup exists.
 const legacy=fresh({name:'更新存档验收'});await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s:legacy});await page.reload();
 await page.locator('#game:visible').waitFor();await page.locator('#save-protection-status').filter({hasText:'备用存档已同步'}).waitFor();assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),legacy);
 await page.locator('#day-plan-input').fill('1');await page.locator('#day-plan-form button[type="submit"]').click();await page.locator('#day-plan-report').filter({hasText:'已依次办理'}).waitFor();await page.locator('#save-protection-status').filter({hasText:'备用存档已同步'}).waitFor();
 const settled=await page.evaluate(key=>localStorage.getItem(key),KEY);assert.notEqual(settled,JSON.stringify(legacy));
 await page.locator('#quick-save').click();await page.locator('#save-protection-status').filter({hasText:/持久保存/}).waitFor();assert.match(await page.locator('#quick-save-status').innerText(),/已保存/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Release query strings cannot change the origin's primary save key.
 await page.goto(url+'?updated=5.71.1');await page.locator('#game:visible').waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),settled);
 await page.locator('#save-protection-status').filter({hasText:'备用存档已同步'}).waitFor();await page.evaluate(key=>localStorage.removeItem(key),KEY);await page.reload();await page.locator('#save-alert').filter({hasText:'已从此浏览器的备用存档恢复'}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),settled);
 // The new backup module must work with an actual service worker while offline.
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.locator('#offline').filter({hasText:'已就绪'}).waitFor();await context.setOffline(true);await page.reload();await page.locator('#game:visible').waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),settled);await context.setOffline(false);
 // Do not roll back a corrupt primary to an older backup or allow accidental overwrite.
 await page.evaluate(key=>localStorage.setItem(key,'{broken'),KEY);await page.reload();await page.locator('#startup-error').filter({hasText:'暂不创建新角色'}).waitFor();assert.ok(await page.locator('#create button[type="submit"]').isDisabled());assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),'{broken');
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:settled});await page.reload();await page.locator('#game:visible').waitFor();await page.locator('#save-protection-status').filter({hasText:'备用存档已同步'}).waitFor();await page.locator('#tabs button[data-tab="system"]').click();page.once('dialog',d=>d.accept());await page.locator('#new').click();await page.locator('#setup:visible').waitFor();await page.reload();await page.locator('#create button[type="submit"]:enabled').waitFor();assert.equal(await page.locator('#game').isVisible(),false);assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),null);
 assert.deepEqual(errors,[]);await context.close();console.log(JSON.stringify({previousSaveRetained:true,actualActionSaved:true,missingPrimaryRecovered:true,invalidPrimaryPreserved:true,offlineReload:true,newLifeClearsBackup:true,actualPhone:false}));
}finally{await browser?.close();server.close();}
