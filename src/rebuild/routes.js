import {locations} from './content.js?v=1.0.23';
export function travelMinutes(s,to){return s.weather==='雨'&&['road','hill','bamboo'].includes(to)?60:30}
// 仅按当前天气估算，行程仍由已有移动规则逐段执行。
export function findRoute(s,to){
 if(!Object.hasOwn(locations,s.place)||!Object.hasOwn(locations,to))return null;
 const remaining=new Set(Object.keys(locations)),dist=new Map([[s.place,0]]),previous=new Map();
 while(remaining.size){
  let current=null,best=Infinity;for(const key of remaining)if((dist.get(key)??Infinity)<best){current=key;best=dist.get(key)}
  if(current===null)break;remaining.delete(current);if(current===to)break;
  for(const next of locations[current].routes){if(!remaining.has(next))continue;const cost=best+travelMinutes(s,next);if(cost<(dist.get(next)??Infinity)){dist.set(next,cost);previous.set(next,current)}}
 }
 if(!dist.has(to))return null;
 const steps=[];for(let cursor=to;cursor!==s.place;cursor=previous.get(cursor))steps.unshift(cursor);
 return {steps,minutes:dist.get(to)};
}
