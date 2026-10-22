import {KEY,restore} from './engine.js?v=5.62.0';
export const SAVE_LIMIT=150000;
export function exportSave(s){const raw=JSON.stringify(s);restore(raw);return raw;}
export function save(s,storage=globalThis.localStorage){storage.setItem(KEY,exportSave(s));}
export function load(storage=globalThis.localStorage){const raw=storage.getItem(KEY);return raw?restore(raw):null;}
// Validate before asking to replace progress, and again before the actual write.
export function inspectImport(raw,current){if(typeof raw!=='string')throw Error('请选择青河县JSON存档。');if(raw.length>SAVE_LIMIT)throw Error('存档过大。');const candidate=restore(raw);if(current?.dead&&!candidate.dead)throw Error('已结束的人生不能通过导入恢复；可创建新角色。');return candidate;}
export function importSave(raw,current,storage=globalThis.localStorage){const candidate=inspectImport(raw,current);save(candidate,storage);return candidate;}
