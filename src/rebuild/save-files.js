import {KEY,restore} from './engine.js?v=1.0.56';
import {date} from './progression.js?v=1.0.56';
import {locations} from './content.js?v=1.0.56';
export async function loadSaveFile(file){if(file.size>150000)throw Error('存档文件过大');return restore(await file.text())}
export function importSummary(s){return `${s.name} · ${date(s)}\n${locations[s.place].name} · 气血${s.hp}/100 · 精力${s.energy}/100 · 铜钱${s.coins}文${s.dead?'\n这段人生已经结束，不会复活。':''}`}
export function saveFileName(s){const name=s.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');return `jianghu-${name}-day${s.day}-${String(Math.floor(s.minute/60)).padStart(2,'0')}${String(s.minute%60).padStart(2,'0')}.json`}
// 先持久保存，再由界面替换当前角色；写入失败时保留原角色和原存档。
export function persistImportedSave(storage,s){storage.setItem(KEY,JSON.stringify(s))}
