import {KEY,restore} from './engine.js?v=5.71.1';
import {save,load,exportSave} from './storage.js?v=5.71.1';

// This database name, store and key deliberately do not depend on release versions.
export function browserBackup(factory=globalThis.indexedDB){
 let queue=Promise.resolve();
 function transaction(mode,value){return new Promise((resolve,reject)=>{
  if(!factory){reject(Error('此浏览器未提供备用存档空间。'));return;}
  let db,settled=false;const timer=setTimeout(()=>finish(Error('备用存档空间暂时无法打开。')),3000);
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);db?.close();error?reject(error):resolve(result);};
  const opening=factory.open('jianghu-qinghe-saves',1);
  opening.onupgradeneeded=()=>{if(!opening.result.objectStoreNames.contains('saves'))opening.result.createObjectStore('saves');};
  opening.onerror=()=>finish(opening.error||Error('备用存档空间无法打开。'));
  opening.onblocked=()=>finish(Error('请关闭其他青河县页面后重试保存。'));
  opening.onsuccess=()=>{db=opening.result;if(settled){db.close();return;}clearTimeout(timer);try{
   const tx=db.transaction('saves',mode),store=tx.objectStore('saves');let result;
   const request=mode==='readonly'?store.get(KEY):value===null?store.delete(KEY):store.put(value,KEY);
   request.onsuccess=()=>{result=request.result;};
   tx.oncomplete=()=>finish(null,result);tx.onerror=()=>finish(tx.error||Error('备用存档未能写入。'));tx.onabort=()=>finish(tx.error||Error('备用存档操作中断。'));
  }catch(error){finish(error);}};
 });}
 const enqueue=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
 return {read:()=>enqueue(()=>transaction('readonly')),write:raw=>enqueue(()=>transaction('readwrite',raw)),clear:()=>factory?enqueue(()=>transaction('readwrite',null)):Promise.resolve()};
}

export const backup=browserBackup();
export function mirrorSave(state,copy=backup){return copy.write(exportSave(state));}
export async function loadProtected(storage=globalThis.localStorage,copy=backup){
 // Invalid primary data must remain available for diagnosis, never silently roll back.
 const state=load(storage);if(state)return {state,recovered:false};
 let raw;try{raw=await copy.read();}catch(error){return {state:null,recovered:false,warning:error.message};}if(!raw)return {state:null,recovered:false};
 const recovered=restore(raw);save(recovered,storage);return {state:recovered,recovered:true};
}
export async function clearProtected(storage=globalThis.localStorage,copy=backup){await copy.clear();storage.removeItem(KEY);}
export async function protectStorage(manager=globalThis.navigator?.storage){
 if(!manager?.persist)return false;
 return !!(await manager.persist());
}
