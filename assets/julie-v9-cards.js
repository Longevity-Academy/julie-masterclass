/* v9 strip clock. 72-hour flash window per visitor, persisted, real ticking. Checkout, forms, tracking untouched. */
(function(){
  'use strict';
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};

  var KEY='lla_mc_flash_end', HOURS=72;
  function flashEnd(){
    var end=0; try{end=parseInt(localStorage.getItem(KEY)||'0',10);}catch(e){}
    var now=Date.now();
    if(!end||end<now){ end=now+HOURS*3600*1000; try{localStorage.setItem(KEY,String(end));}catch(e){} }
    return end;
  }
  var END=flashEnd();
  function pad(n){return (n<10?'0':'')+n;}
  function clockText(){
    var s=Math.max(0,Math.floor((END-Date.now())/1000));
    var h=Math.floor(s/3600); s-=h*3600; var m=Math.floor(s/60); s-=m*60;
    return pad(h)+':'+pad(m)+':'+pad(s);
  }
  function paintClocks(){
    var t=clockText();
    $$('.v9-clock').forEach(function(el){ if(el.textContent!==t) el.textContent=t; });
    if(END-Date.now()<=0){ END=flashEnd(); }
  }
  paintClocks(); setInterval(paintClocks,1000);
})();
