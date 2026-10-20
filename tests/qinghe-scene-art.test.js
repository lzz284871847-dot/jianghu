import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {SCENE_ART} from '../county/scene-art.js';
import {localScene} from '../county/local-map.js';import {fresh} from '../county/engine.js';import {places} from '../county/content.js';
test('all sixteen local maps use a shipped regional illustration without changing the save',()=>{
 const s=fresh(),sw=fs.readFileSync(new URL('../county/sw.js',import.meta.url),'utf8');let bytes=0;
 for(const art of Object.values(SCENE_ART)){const file=fs.readFileSync(new URL('../county/'+art.src,import.meta.url));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');assert.ok(sw.includes("'"+art.src+"'"));bytes+=file.length;}
 assert.ok(bytes<650000,'four backgrounds must stay below 650 KB together');
 for(const place of Object.keys(places)){s.place=place;const before=structuredClone(s),scene=localScene(s);assert.deepEqual(scene.art,SCENE_ART[scene.terrain]);assert.deepEqual(s,before);}
 assert.ok(sw.includes("'scene-art.js'"));
});
