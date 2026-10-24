import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,KEY} from '../county/engine.js';
import {save,exportSave} from '../county/storage.js';
import {mirrorSave,loadProtected,clearProtected,protectStorage,browserBackup} from '../county/save-protection.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const copy=()=>{let value;return {read:async()=>value,write:async raw=>{value=raw;},clear:async()=>{value=undefined;}};};
test('an existing release save remains authoritative; missing primary recovers exact latest real actions',async()=>{
 const storage=memory(),backup=copy(),s=fresh();assert.ok(act(s,'work'));assert.ok(act(s,'rest'));const before=structuredClone(s);save(s,storage);await mirrorSave(s,backup);
 const current=await loadProtected(storage,backup);assert.equal(current.recovered,false);assert.deepEqual(current.state,before);
 storage.removeItem(KEY);const recovered=await loadProtected(storage,backup);assert.equal(recovered.recovered,true);assert.deepEqual(recovered.state,before);assert.deepEqual(JSON.parse(storage.getItem(KEY)),before);
 const newer=structuredClone(s);assert.ok(act(newer,'wait'));save(newer,storage);assert.deepEqual((await loadProtected(storage,backup)).state,newer);
});
test('backup captures a snapshot and a dead life stays dead on recovery',async()=>{
 const storage=memory(),backup=copy(),s=fresh();const writing=mirrorSave(s,backup);s.coins=0;await writing;assert.equal(JSON.parse(await backup.read()).coins,30);
 s.hp=0;s.dead=true;await mirrorSave(s,backup);const loaded=await loadProtected(storage,backup);assert.equal(loaded.state.dead,true);assert.equal(loaded.state.hp,0);
});
test('invalid primary is preserved and is never replaced by an earlier alive backup',async()=>{
 const storage=memory(),backup=copy();await mirrorSave(fresh(),backup);storage.setItem(KEY,'{broken');await assert.rejects(loadProtected(storage,backup));assert.equal(storage.getItem(KEY),'{broken');
 storage.removeItem(KEY);await backup.write('{broken');await assert.rejects(loadProtected(storage,backup));assert.equal(storage.getItem(KEY),null);
});
test('new life clears both copies and unavailable or failing storage is reported honestly',async()=>{
 const storage=memory(),backup=copy(),s=fresh();save(s,storage);await mirrorSave(s,backup);await clearProtected(storage,backup);assert.deepEqual(await loadProtected(storage,backup),{state:null,recovered:false});
 const failed={read:async()=>{throw Error('unavailable');},clear:async()=>{throw Error('blocked');}};
 assert.match((await loadProtected(storage,failed)).warning,/unavailable/);save(s,storage);await assert.rejects(clearProtected(storage,failed));assert.equal(storage.getItem(KEY),exportSave(s));
 await assert.rejects(browserBackup(null).read());await assert.rejects(browserBackup(null).write('raw'));await browserBackup(null).clear();
 assert.equal(await protectStorage({}),false);assert.equal(await protectStorage({persist:async()=>false}),false);assert.equal(await protectStorage({persist:async()=>true}),true);
});
