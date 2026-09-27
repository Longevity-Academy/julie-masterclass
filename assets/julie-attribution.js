/* Julie-only acquisition context. Never writes another funnel's storage.
 * A new click/campaign replaces old context; incomplete SAME-journey URLs can
 * inherit known fields. Missing identity stays missing, never a Google default.
 * No CRM calls, Meta events, payment or ActiveCampaign behavior in this module.
 */
(function(root){
  'use strict';
  var KEY='julie_attribution_v2', TTL=30*86400000;
  var KEYS=['cid','adGroupID','gclid','fbclid','msclkid','ttclid','li_fat_id','wbraid','gbraid',
    'utm_source','utm_medium','utm_campaign','utm_content','utm_term','creative','placement',
    'cq_src','cq_cmp','cq_con','cq_med','cq_net','cq_plt'];
  var IDENTITY=['cid','adGroupID','utm_source','utm_medium','utm_campaign','utm_term',
    'utm_content','creative','cq_src','cq_cmp','cq_con','cq_net'];
  var CLICKS=['fbclid','gclid','msclkid','ttclid','li_fat_id','wbraid','gbraid'];
  function readKey(key){
    try{
      var a=JSON.parse(root.localStorage.getItem(key)||'null');
      if(!a||!Number.isFinite(a.ts)||a.ts>Date.now()+300000||Date.now()-a.ts>TTL)return null;
      return a;
    }catch(e){return null;}
  }
  function julieLanding(value){
    try{var u=new URL(value);return u.origin==='https://www.longevitylifeacademy.com'&&
      /^\/julie-masterclass\/(?:index\.html)?$/.test(u.pathname);}catch(e){return false;}
  }
  function read(){
    var own=readKey(KEY);if(own)return own;
    var old=readKey('lla_attribution_v1');
    // Migrate only a known Julie landing. Never borrow the brand site's campaign.
    return old&&julieLanding(old.first_landing)?old:null;
  }
  function copy(a){
    var out={};if(!a)return out;
    KEYS.forEach(function(k){if(a[k])out[k]=String(a[k]);});
    return out;
  }
  function capture(query){
    try{
      var p=new URLSearchParams(String(query===undefined?root.location.search:query).replace(/^\?/,'').replace(/\?/g,'&'));
      var incoming={},has=false;
      KEYS.forEach(function(k){var v=p.get(k);if(v){incoming[k]=v;has=true;}});
      var old=read();
      if(!has)return old;
      var changed=!!old&&IDENTITY.some(function(k){return incoming[k]&&old[k]&&incoming[k]!==String(old[k]);});
      // An unrecognised click is not evidence of the previous campaign/ad set.
      if(old&&CLICKS.some(function(k){return incoming[k]&&incoming[k]!==String(old[k]||'');}))changed=true;
      var out=copy(changed?null:old);
      KEYS.forEach(function(k){if(incoming[k])out[k]=incoming[k];});
      var retained=old&&!changed;
      out.ts=retained?old.ts:Date.now();
      out.first_landing=retained?old.first_landing:root.location.href;
      out.first_referrer=retained?old.first_referrer:(root.document.referrer||'');
      try{root.localStorage.setItem(KEY,JSON.stringify(out));}catch(e){}
      return out;
    }catch(e){return read();}
  }
  function queryString(query,attr){
    try{
      var p=new URLSearchParams(String(query||'').replace(/^\?/,'').replace(/\?/g,'&'));
      KEYS.forEach(function(k){if(!p.get(k)&&attr&&attr[k])p.set(k,String(attr[k]));});
      return p.toString();
    }catch(e){return String(query||'').replace(/^\?/,'');}
  }
  root.LLA_ATTR={keys:KEYS.slice(),capture:capture,read:read,queryString:queryString,
    release:'julie-attribution-20260927-1'};
})(window);
