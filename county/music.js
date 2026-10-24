// Audio preferences are independent of the character save. Starting always needs a user gesture.
export const MUSIC_TRACKS=[
 {id:'ripples',name:'水畔 · Ripples',file:'audio/ripples.mp3'},
 {id:'eastern',name:'行路 · Eastern Thought',file:'audio/eastern-thought.mp3'}
];
export function initMusic(root,storage){
 const audio=root.querySelector('audio'),select=root.querySelector('select'),toggle=root.querySelector('button'),summary=root.querySelector('summary'),status=root.querySelector('[role="status"]');let request=0,starting=false;
 let saved;try{storage??=globalThis.localStorage;saved=storage.getItem('qinghe-music-track');}catch{}
 select.replaceChildren(...MUSIC_TRACKS.map(t=>{const o=root.ownerDocument.createElement('option');o.value=t.id;o.textContent=t.name;return o;}));
 select.value=MUSIC_TRACKS.some(t=>t.id===saved)?saved:MUSIC_TRACKS[0].id;
 const track=()=>MUSIC_TRACKS.find(t=>t.id===select.value)||MUSIC_TRACKS[0];
 const source=()=>{audio.src=new URL(track().file+'?v=5.70.0',import.meta.url).href;audio.loop=true;};source();
 const show=()=>{toggle.textContent=starting?'取消加载':audio.paused?'播放音乐':'暂停音乐';summary.textContent=audio.paused?'音乐 · 点此开启':'音乐 · '+track().name;toggle.setAttribute('aria-pressed',String(!audio.paused));};
 const play=async()=>{const token=++request;if(audio.error)audio.load();starting=true;status.textContent='正在准备音乐…';show();try{await audio.play();if(token!==request)return;starting=false;status.textContent='循环播放 · '+track().name;show();}catch{if(token!==request)return;starting=false;audio.pause();status.textContent='未能播放，请保持页面开启后重试；首次需联网准备音频。';show();}};
 toggle.onclick=()=>{if(starting||!audio.paused){request++;starting=false;audio.pause();status.textContent='音乐已暂停。';show();}else play();};
 select.onchange=()=>{const resume=starting||!audio.paused;request++;starting=false;audio.pause();source();try{storage.setItem('qinghe-music-track',track().id);}catch{}status.textContent='已选 '+track().name;show();if(resume)play();};
 audio.addEventListener('playing',()=>{if(audio.paused)return;starting=false;status.textContent='循环播放 · '+track().name;show();});
 audio.addEventListener('pause',show);
 audio.addEventListener('error',()=>{request++;starting=false;audio.pause();status.textContent='音频暂不可用，可换一首或联网后重试。';show();});
 show();return {audio};
}
