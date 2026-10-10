// 少量固定周期与一次后续；不模拟家庭、财产或任务链。
export const followups={boatRepair:{choice:['help'],event:'boatThanks'},herbs:{choice:['help'],event:'herbThanks'},porterRoof:{choice:['supply','prepare'],event:'roofThanks'}};
export const gatherings={weeklyMarket:{offset:2,place:'town',close:1200,name:'青石镇赶集'},weeklySpar:{offset:4,place:'liuxi',close:1080,name:'武馆公开切磋'},weeklyDock:{offset:6,place:'dock',close:1080,name:'码头集中装船'}};
export function rememberHelp(s,kind,choice){const def=followups[kind];if(def&&def.choice.includes(choice)&&!Object.hasOwn(s.echoes,kind))s.echoes[kind]={day:s.day,done:false};}
export function continuityDay(s,news){
 for(const [kind,record] of Object.entries(s.echoes)){if(!record.done&&s.day>=record.day+2){record.done=true;const target=followups[kind].event;s.events.push({id:target+'-'+s.day,kind:target,status:'open',expires:s.day+2});news.push('【可靠消息】先前帮助的事情有了回音，可自行前去，不会自动领取回礼。');}}
 for(const [kind,def] of Object.entries(gatherings)){if(s.day%7===def.offset){s.events.push({id:kind+'-'+s.day,kind,status:'open',expires:s.day+2});news.push('【可靠消息】今日活动：'+def.name+'，今日限定，可参加也可忽略。');}if((s.day+1)%7===def.offset)news.push('【可靠消息】预告：明日'+def.name+'。');}
 const activity=npcActivity(s);if(activity)news.push('【可靠消息】'+activity.text);
}
export function npcActivity(s,id){const day=s.day%7,rows={3:{id:'merchant',place:'ferry',off:'inn',from:8,to:16,text:'柳掌柜今天到旧渡口进货，08:00–16:00在渡口，其余时间在客栈；镇上的普通摊位照常营业。'},5:{id:'boatman',place:'dock',off:'liuxi',from:6,to:18,text:'贺船工今天到青石码头修船，06:00–18:00在码头，收工后回柳溪集。'},6:{id:'master',place:'liuxi',off:'inn',from:7,to:18,text:'周师傅今天到柳溪集准备切磋，07:00–18:00在柳溪集，收工后回客栈。'}};const row=rows[day];return row&&(!id||row.id===id)?row:null;}
export function gatheringBlocker(s,e,choice){const def=gatherings[e.kind];if(!def||choice.id==='leave')return '';return s.minute<480||s.minute+Math.round((choice.hours||0)*60)>def.close||s.day!==e.expires-2?'本次活动已收场，不能再参加；可离开。':'';}
export function validEchoes(s){return s.echoes&&typeof s.echoes==='object'&&!Array.isArray(s.echoes)&&Object.entries(s.echoes).every(([k,v])=>Object.hasOwn(followups,k)&&v&&Number.isSafeInteger(v.day)&&v.day>=1&&v.day<=s.day&&typeof v.done==='boolean'&&(v.done?s.day>=v.day+2:s.day<v.day+2));}
