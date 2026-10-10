import {KEY,restore} from './engine.js?v=0.1.0';
export function save(s,storage=globalThis.localStorage){restore(JSON.stringify(s));storage.setItem(KEY,JSON.stringify(s));}
export function load(storage=globalThis.localStorage){const raw=storage.getItem(KEY);return raw?restore(raw):null;}
export function importSave(raw,current,storage=globalThis.localStorage){if(raw.length>150000)throw Error('存档过大。');const candidate=restore(raw);if(current?.dead&&!candidate.dead)throw Error('已结束的人生不能通过导入恢复；可创建新角色。');save(candidate,storage);return candidate;}
