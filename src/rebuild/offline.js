// 缓存状态独立于游戏和存档；缓存失败仍可正常联网玩。
export async function setupOffline({nav=globalThis.navigator,status,button,base=globalThis.document?.baseURI}={}){
 if(!status||!button)return;
 button.disabled=true;
 if(!nav?.serviceWorker){status.textContent='此浏览器未提供离线缓存功能，可以继续联网玩。';return}
 status.textContent='正在准备离线文件，首次请保持联网。';
 let registration;
 const watch=worker=>{if(!worker)return;const changed=()=>{if(worker.state==='activated')status.textContent='离线文件已就绪。可断网继续玩；更新后的页面将在下次打开时使用。';if(worker.state==='redundant')status.textContent='离线文件准备失败。可以继续联网玩，稍后检查更新。'};worker.addEventListener('statechange',changed);changed()};
 try{
  registration=await nav.serviceWorker.register(new URL('sw.js',base).href,{scope:new URL('./',base).href,updateViaCache:'none'});
  watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
  button.disabled=false;
  button.onclick=async()=>{button.disabled=true;status.textContent='正在检查离线版本更新…';try{await registration.update();if(registration.installing){watch(registration.installing);status.textContent='正在下载新版本，完成后下次打开生效。'}else status.textContent=registration.active?'离线文件已就绪；本次更新检查已完成。':'离线文件仍在准备，请保持联网。'}catch{status.textContent='暂时无法检查更新。已准备的离线版仍可使用，联网后再试。'}finally{button.disabled=false}};
  await nav.serviceWorker.ready;
  status.textContent='离线文件已就绪。可断网继续玩；联网时可检查更新。';
 }catch{status.textContent='离线文件准备失败，可以继续联网玩；联网后重新打开再试。'}
}
