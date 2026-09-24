(() => {
  'use strict';
  const incoming=new URLSearchParams(location.search);
  document.querySelectorAll('a[data-plan="fullcourse"]').forEach(a=>{
    const u=new URL(window.LLA_PLAN.blueprintCheckout());
    u.searchParams.set('enroll','1');
    u.searchParams.set('plan','monthly');
    u.searchParams.set('code','JULIE249');
    u.searchParams.set('promo','on'); /* JULIE249 has no hard expiry (Omri, 24 Sep 2026); the date on the card is urgency copy only */
    for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','cid','fbclid','gclid','qa'])if(incoming.has(k))u.searchParams.set(k,incoming.get(k));
    a.href=u.href;
  });
  const pricing=document.getElementById('pricing');
  if(pricing)new IntersectionObserver(([entry])=>{
    document.querySelectorAll('#et-bumpyard-widget,.lla-float-cta').forEach(e=>e.style.visibility=entry.isIntersecting?'hidden':'');
  }).observe(pricing);
})();
