/* 36% offer strip with a 36-hour countdown per visitor. No tracking, no network. */
(function(){
  var KEY='lla_offer_end_v1', H=36*3600*1000, end;
  try{ end=parseInt(localStorage.getItem(KEY),10); }catch(e){}
  if(!end||isNaN(end)||end<Date.now()){ end=Date.now()+H; try{ localStorage.setItem(KEY,String(end)); }catch(e){} }
  var el=document.createElement('div'); el.className='lla-strip'; el.setAttribute('role','status');
  el.innerHTML='<span><b>36% off</b> <span class="lla-long">for students and friends of eTeacher Group schools &middot; </span>Seats from <b>$49</b></span><span class="lla-cd" id="llaCd">36:00:00</span>';
  document.body.insertBefore(el, document.body.firstChild);
  var cd=document.getElementById('llaCd');
  function pad(n){return (n<10?'0':'')+n}
  function tick(){ var d=Math.max(0,end-Date.now()); var h=Math.floor(d/3600000), m=Math.floor(d%3600000/60000), s=Math.floor(d%60000/1000); cd.textContent=pad(h)+':'+pad(m)+':'+pad(s); }
  tick(); setInterval(tick,1000);
})();
