/* 36% offer: top strip with a 36-hour countdown per visitor, and the bottom enrol bar. No tracking, no network. */
(function(){
  var KEY='lla_offer_end_v1', H=36*3600*1000, end;
  try{ end=parseInt(localStorage.getItem(KEY),10); }catch(e){}
  if(!end||isNaN(end)||end<Date.now()){ end=Date.now()+H; try{ localStorage.setItem(KEY,String(end)); }catch(e){} }
  var strip=document.createElement('div'); strip.className='lla-strip'; strip.setAttribute('role','status');
  strip.innerHTML='<span><b>36% off</b> <span class="lla-long">for students and friends of eTeacher Group schools &middot; </span>Seats from <b>$49</b></span><span class="lla-cd" id="llaCd">36:00:00</span>';
  document.body.insertBefore(strip, document.body.firstChild);
  var bar=document.createElement('div'); bar.className='lla-bar'; bar.id='llaBar';
  bar.innerHTML='<span class="l"><i>The Longevity Masterclass</i><b>$49</b><s>$77</s><em>36% off</em></span><a href="#packages">Enroll Now &rarr;</a>';
  document.body.appendChild(bar);
  var cd=document.getElementById('llaCd');
  function pad(n){return (n<10?'0':'')+n}
  function tick(){ var d=Math.max(0,end-Date.now()); cd.textContent=pad(Math.floor(d/3600000))+':'+pad(Math.floor(d%3600000/60000))+':'+pad(Math.floor(d%60000/1000)); }
  tick(); setInterval(tick,1000);
  var pr=document.getElementById('pricing');
  function onScroll(){ var past=scrollY>innerHeight*0.6; var inPricing=false; if(pr){ var r=pr.getBoundingClientRect(); inPricing=r.top<innerHeight*0.5&&r.bottom>innerHeight*0.5; } bar.classList.toggle("on", past); }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
})();
