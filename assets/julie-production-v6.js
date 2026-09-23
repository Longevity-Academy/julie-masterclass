(function(){
 'use strict';
 function syncDate(index){
  var d=document.getElementById('emDate');if(!d)return;
  d.selectedIndex=Number(index)||0;d.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelectorAll('[name="julie-session"]').forEach(function(r){r.checked=Number(r.value)===d.selectedIndex;});
 }
 document.querySelectorAll('[name="julie-session"]').forEach(function(r){r.addEventListener('change',function(){syncDate(r.value);});});
 var date=document.getElementById('emDate');
 function packageTitle(plan){
  if(plan!=='standard'&&plan!=='vip')return;
  document.getElementById('checkoutPackageTitle').textContent=plan==='vip'?'VIP Masterclass Access':'The Masterclass';
  document.getElementById('checkoutPackageSummary').textContent=plan==='vip'?'$79 / 60-minute class + 30-minute private Q&A':'$49 / 60 minutes live';
 }
 if(window.LLA_PLAN){
  var apply=window.LLA_PLAN.apply;
  window.LLA_PLAN.apply=function(plan){var result=apply.apply(this,arguments);packageTitle(window.LLA_PLAN.get().id);return result;};
  packageTitle(window.LLA_PLAN.get().id);
 }
 if(date)date.addEventListener('change',function(){document.querySelectorAll('[name="julie-session"]').forEach(function(r){r.checked=Number(r.value)===date.selectedIndex;});});
 document.addEventListener('click',function(e){
  var a=e.target.closest('[data-plan]');if(!a)return;
  var plan=a.dataset.plan;
  if(plan==='standard'||plan==='vip'){
   var r=document.querySelector('[name="julie-session"]:checked');if(r)syncDate(r.value);
   packageTitle(plan);
  }
 },true);
 // Visible typography only. Never rewrite JavaScript, endpoints or identifiers.
 function clean(root){
  var walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
  while((n=walk.nextNode())){
   if(n.parentElement&&n.parentElement.closest('script,style,textarea'))continue;
   if(/[—–]/.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(/[—–]/g,', ');
  }
 }
 clean(document.body);
 document.querySelectorAll('video.eteacher-motion').forEach(function(v){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){v.pause();v.removeAttribute('autoplay');return;}
  var visible=false;
  new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(visible)v.play().catch(function(){});else v.pause();}).observe(v);
  v.addEventListener('ended',function(){setTimeout(function(){if(visible){v.currentTime=0;v.play().catch(function(){});}},2200);});
 });
})();
