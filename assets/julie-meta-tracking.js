/* Julie Gibson Clark Live Masterclass - isolated Meta tracking helper.
 * Browser Pixel event + Conversions API twin with ONE shared event_id per event.
 *
 * Loaded BEFORE the Pixel base code, which gates itself on LLA_META.mode()==='live',
 * stamps its PageView with LLA_META.pageViewId() and then calls LLA_META.pageEvents().
 * Public API used by index.html is unchanged: window.LLA_META.track(name, data, email)
 * The three existing call sites in index.html are untouched:
 *   AddToCart        - after the CRM order exists ("Continue to payment")
 *   InitiateCheckout - when the payment screen opens
 *   Purchase         - only after verified PayPal capture / Airwallex SUCCEEDED intent
 *
 * Event identity (browser eventID === server event_id):
 *   PageView          julie_pv_<page-session>   (browser copy fired by the Pixel base code)
 *   ViewContent       julie_vc_<page-session>
 *   AddToCart         julie_atc_<CRM orderid>   (LLA_ECOMM.getCheckoutIds)
 *   InitiateCheckout  julie_ic_<CRM orderid>
 *   Purchase          <CRM orderid>             (stable; confirmed once per order)
 *
 * Buyer identity: only the buyer of THIS event. Explicit email from the call site (or the
 * form's email), the current form's fields when the form carries that same email, and the
 * checkout-validated session contact only when its email matches. Nothing is persisted.
 * Country only from the explicit country field; never inferred from a phone prefix.
 *
 * Modes (LLA_META.mode()):
 *   'off'  ?qa=1 / ?llatest=1, ?env=staging, LLA_ECOMM_CONFIG.env==='staging', or any URL other
 *          than https://www.longevitylifeacademy.com/julie-masterclass/ -> nothing is sent.
 *   'test' ?meta_test=TESTnnnnn -> server copies only, flagged with test_event_code, no Pixel.
 *   'live' Pixel + Conversions API.
 *
 * Release: julie-meta-20260927-2
 */
(function (root) {
  'use strict';
  var RELEASE = 'julie-meta-20260927-2';
  var PIXEL_ID = '1440305917310328';
  var RELAY_URL = 'https://lla-ac-events.vercel.app/api/meta/capi';
  var SOURCE = 'julie-masterclass';
  var PROD_HOST = 'www.longevitylifeacademy.com';
  var PROD_PATHS = ['/julie-masterclass/', '/julie-masterclass/index.html'];
  var COOKIE_DOMAIN = 'longevitylifeacademy.com';
  var CURRENCY = 'USD';
  var PRODUCT_LINE = 'julie_masterclass';
  var PRODUCT_NAME = 'Julie Gibson Clark Live Masterclass';
  var PLANS = {
    standard: { id: 'standard', content_id: 'julie-masterclass-standard', content_name: 'The Masterclass', value: 49 },
    vip:      { id: 'vip',      content_id: 'julie-masterclass-vip',      content_name: 'VIP Masterclass', value: 79 }
  };
  var MAX_ATTEMPTS = 3;                 /* initial send + 2 bounded retries, same event_id */
  var RETRY_MS = [1500, 4000];
  var FBP_RE = /^fb\.\d+\.\d{13}\.\d+$/;
  var CLICK_RE = /^[A-Za-z0-9_-]+$/;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var TEST_RE = /[?&]meta_test=(TEST\d{3,10})(?:&|$)/;
  var QA_RE = /[?&](llatest|qa)=1(?:&|$)/;
  var doc = root.document;
  var loc = root.location || {};

  /* ---------- environment / mode ---------- */
  function search() { return String(loc.search || ''); }
  function isStaging() {
    try { if (root.LLA_ECOMM_CONFIG && root.LLA_ECOMM_CONFIG.env === 'staging') return true; } catch (e) {}
    try { return new URLSearchParams(search()).get('env') === 'staging'; } catch (e) { return false; }
  }
  function testCode() { var m = TEST_RE.exec(search()); return m ? m[1] : ''; }
  /* Exact production page only: https + exact host + exact path (same rule as the relay). */
  function onProductionPage() {
    return String(loc.protocol || '') === 'https:' && String(loc.hostname || '') === PROD_HOST &&
      PROD_PATHS.indexOf(String(loc.pathname || '')) >= 0;
  }
  function mode() {
    if (QA_RE.test(search())) return 'off';
    if (isStaging()) return 'off';
    if (testCode()) return 'test';
    return onProductionPage() ? 'live' : 'off';
  }

  /* ---------- storage helpers (never throw) ---------- */
  function ls(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function ss(k) { try { return root.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { root.sessionStorage.setItem(k, v); } catch (e) {} }
  function json(v) { try { return JSON.parse(v || 'null'); } catch (e) { return null; } }

  /* Cookie read WITHOUT decoding: click identifiers must travel byte-for-byte. */
  function ck(n) {
    try {
      var m = String(doc.cookie || '').match(new RegExp('(?:^|;\\s*)' + n + '=([^;]+)'));
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  /* ---------- Meta click id (fbc) ---------- */
  /* URL fbclid: read the transport encoding once; URLSearchParams would turn '+' into a space. */
  function urlClickId() {
    var m = /[?&]fbclid=([^&#]*)/.exec(search());
    if (!m || !m[1]) return '';
    var raw = m[1], dec = raw;
    try { dec = decodeURIComponent(raw); } catch (e) {}
    return CLICK_RE.test(dec) ? dec : (CLICK_RE.test(raw) ? raw : '');
  }
  function storedFbc() {
    var s = json(ls('julie_fbc_v1'));
    if (!s || !s.fbc || !s.ts || (Date.now() - s.ts) > 90 * 86400000) return null;
    return s;
  }
  function persistFbc(value, clickId, ts) {
    lsSet('julie_fbc_v1', JSON.stringify({ fbc: value, clickId: clickId, ts: ts }));
    try {
      var host = String(loc.hostname || '');
      var attrs = '; path=/; max-age=7776000; SameSite=Lax';
      if (host === COOKIE_DOMAIN || host.slice(-(COOKIE_DOMAIN.length + 1)) === '.' + COOKIE_DOMAIN) attrs += '; domain=.' + COOKIE_DOMAIN;
      if (loc.protocol === 'https:') attrs += '; Secure';
      doc.cookie = '_fbc=' + value + attrs;
    } catch (e) {}
  }
  /* Chain: _fbc cookie that matches the URL click -> URL fbclid (fb.1.<first-seen ms>.<fbclid>,
   * persisted as _fbc for 90 days) -> _fbc cookie -> stored first-seen value -> legacy
   * lla_attribution_v1 (fbclid + first-landing timestamp). Never invented. */
  function fbc() {
    try {
      var cookie = ck('_fbc');
      var click = urlClickId();
      if (click) {
        if (cookie && cookie.split('.').slice(3).join('.') === click) return cookie;
        var s = storedFbc();
        var ts = (s && s.clickId === click) ? s.ts : Date.now();
        var value = (s && s.clickId === click) ? s.fbc : ('fb.1.' + ts + '.' + click);
        persistFbc(value, click, ts);
        return value;
      }
      if (cookie) return cookie;
      var st = storedFbc();
      if (st) return st.fbc;
      var a = json(ls('lla_attribution_v1'));
      if (a && a.fbclid && CLICK_RE.test(String(a.fbclid))) return 'fb.1.' + (a.ts || Date.now()) + '.' + a.fbclid;
      return '';
    } catch (e) { return ''; }
  }
  function fbp() { var v = ck('_fbp'); return FBP_RE.test(v) ? v : ''; }

  /* ---------- buyer identity (this event's buyer only; nothing persisted) ---------- */
  function normEmail(v) { var s = String(v || '').trim().toLowerCase(); return EMAIL_RE.test(s) ? s : ''; }
  function letters(s) { return String(s || '').toLowerCase().replace(/[^a-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF]/g, ''); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function val(id) { try { var el = doc.getElementById(id); return el && el.value ? String(el.value) : ''; } catch (e) { return ''; } }
  function nameInto(out, fullName) {
    var parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return;
    out.fn = letters(parts[0]);
    out.ln = parts.length > 1 ? letters(parts[parts.length - 1]) : '';
  }
  function checkoutIds() {
    try { return (root.LLA_ECOMM && root.LLA_ECOMM.getCheckoutIds && root.LLA_ECOMM.getCheckoutIds()) || null; } catch (e) { return null; }
  }
  function identity(emailArg) {
    var out = { email: '', phone: '', fn: '', ln: '', st: '', country: '', external_id: '' };
    var explicit = normEmail(emailArg);
    var formEmail = normEmail(val('emEmail'));
    out.email = explicit || formEmail;
    if (!out.email) return out;                                  /* anonymous event: no PII at all */
    if (formEmail && formEmail === out.email) {                  /* the visible form belongs to this buyer */
      nameInto(out, val('emName'));
      var country = val('emCountry');
      if (/^[A-Za-z]{2}$/.test(country)) out.country = country.toLowerCase();
      var st = val('emState');
      if (/^[A-Za-z]{2}$/.test(st) && (!out.country || out.country === 'us')) out.st = st.toLowerCase();
      var ph = digits(val('emPhone'));
      if (ph.length === 10 && out.country === 'us') ph = '1' + ph; /* explicit US selection only */
      if (ph.length >= 7) out.phone = ph;
    }
    var c = json(ss('lla_ac_contact'));                          /* checkout-validated contact (E.164 phone) */
    if (c && normEmail(c.email) === out.email) {
      var cp = digits(c.phone);
      if (cp.length >= 7) out.phone = cp;
      if (!out.fn) nameInto(out, c.fullName);
      var ids = checkoutIds();                                   /* CRM student id of THIS buyer's order */
      if (ids && ids.stid) out.external_id = String(ids.stid);
    }
    return out;
  }

  /* ---------- product classification ---------- */
  function planFor(data) {
    var name = data && data.content_name ? String(data.content_name) : '';
    for (var k in PLANS) if (PLANS[k].content_name === name) return PLANS[k];
    try { var cur = root.LLA_PLAN && root.LLA_PLAN.get && root.LLA_PLAN.get(); if (cur && PLANS[cur.id]) return PLANS[cur.id]; } catch (e) {}
    return null;
  }
  var pageSession = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function pageViewId() { return 'julie_pv_' + pageSession; }
  function eventIdFor(name, data, plan) {
    var ids = checkoutIds();
    var order = ids && ids.orderid ? String(ids.orderid) : '';
    if (name === 'Purchase') return String(data.order_id);
    if (name === 'AddToCart') return 'julie_atc_' + (order || (pageSession + '_' + (plan ? plan.id : 'na')));
    if (name === 'InitiateCheckout') return 'julie_ic_' + (order || (pageSession + '_' + (plan ? plan.id : 'na')));
    if (name === 'ViewContent') return 'julie_vc_' + pageSession;
    return 'julie_' + name.toLowerCase() + '_' + pageSession;
  }

  /* ---------- receipts (diagnostics only, last 20, this tab) ---------- */
  function receipt(row) {
    try {
      var rows = json(ss('julie_meta_receipts')) || [];
      rows = rows.filter(function (r) { return !(r.event_id === row.event_id && r.event_name === row.event_name); });
      rows.push(row);
      ssSet('julie_meta_receipts', JSON.stringify(rows.slice(-20)));
    } catch (e) {}
  }
  function receipts() { return json(ss('julie_meta_receipts')) || []; }

  /* ---------- relay delivery ----------
   * accepted  : HTTP 2xx AND body.ok === true AND events_received >= 1 (Meta acknowledged)
   * skipped   : relay refused on purpose (e.g. qa_excluded) - terminal
   * rejected  : 4xx, Meta 4xx behind the relay, or unparseable/unsuccessful body - terminal, no retry
   * transient / network_error : 5xx, 429 or no response - retried up to MAX_ATTEMPTS with the SAME event_id */
  function post(payload, attempt, done) {
    attempt = attempt || 1;
    var body = JSON.stringify(payload);
    var row = { event_name: payload.event_name, event_id: payload.event_id, release: RELEASE, ts: Date.now(), attempt: attempt, status: 'sent' };
    receipt(row);
    var p;
    try {
      p = root.fetch(RELAY_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true });
    } catch (e) { p = Promise.reject(e); }
    return p.then(function (r) {
      row.http = r.status;
      try { row.fbc_state = r.headers && r.headers.get ? (r.headers.get('x-lla-fbc') || '') : ''; row.relay = r.headers && r.headers.get ? (r.headers.get('x-lla-release') || '') : ''; } catch (e) {}
      var parsed;
      try { parsed = Promise.resolve(r.json()); } catch (e) { parsed = Promise.reject(e); }
      return parsed.catch(function () { return {}; }).then(function (b) {
        b = b && typeof b === 'object' ? b : {};
        if (b.fbtrace_id) row.fbtrace_id = b.fbtrace_id;
        if (b.error) row.error = typeof b.error === 'string' ? b.error : (b.error.message || 'error');
        if (r.ok && b.ok === true && Number(b.events_received) >= 1) row.status = 'accepted';
        else if (r.ok && b.skipped) row.status = 'skipped';
        else if (r.status === 502 && b.meta_status && Number(b.meta_status) < 500) row.status = 'rejected';
        else if (r.status >= 500 || r.status === 429) row.status = 'transient';
        else row.status = 'rejected';
        return row;
      });
    }).catch(function () {
      row.status = 'network_error';
      return row;
    }).then(function (row) {
      receipt(row);
      var again = (row.status === 'network_error' || row.status === 'transient') && attempt < MAX_ATTEMPTS;
      if (again) return new Promise(function (res) { root.setTimeout(res, RETRY_MS[attempt - 1] || RETRY_MS[RETRY_MS.length - 1]); }).then(function () { return post(payload, attempt + 1, done); });
      if (done) { try { done(row); } catch (e) {} }
      return row;
    });
  }
  var deferred = [], flushed = false;
  /* PageView / ViewContent server copies leave after the Pixel has loaded (window load + 1.5 s)
   * or immediately when the page is being left; fbp/fbc are re-read at send time because the
   * Pixel writes its cookies asynchronously. Commerce events are never deferred. */
  function flushDeferred() {
    if (flushed) return; flushed = true;
    var q = deferred; deferred = [];
    q.forEach(function (item) {
      item.payload.fbp = fbp() || item.payload.fbp;
      item.payload.fbc = fbc() || item.payload.fbc;
      post(item.payload, 1, item.done);
    });
  }
  function scheduleFlush() {
    try {
      var arm = function () { root.setTimeout(flushDeferred, 1500); };
      if (doc.readyState === 'complete') arm(); else root.addEventListener('load', arm, { once: true });
      root.addEventListener('pagehide', flushDeferred, { once: true });
    } catch (e) { flushDeferred(); }
  }

  /* ---------- core ---------- */
  var sent = {};   /* name:event_id -> 'inflight' | 'accepted' | 'skipped' | 'failed' */
  function dispatch(name, pixelData, payload, opts) {
    var m = mode();
    if (m === 'off') return null;
    var key = name + ':' + payload.event_id;
    var state = sent[key];
    if (state === 'inflight' || state === 'accepted' || state === 'skipped') return null;
    var first = !state;
    sent[key] = 'inflight';
    if (m === 'test') payload.test_event_code = testCode();
    else if (first) { try { if (root.fbq) root.fbq('track', name, pixelData, { eventID: payload.event_id }); } catch (e) {} }  /* Pixel copy exactly once */
    var done = function (row) {
      sent[key] = (row.status === 'accepted' || row.status === 'skipped') ? row.status : 'failed';   /* failed -> a later call may retry, same id */
      if (opts && opts.onResult) { try { opts.onResult(row); } catch (e) {} }
    };
    if (opts && opts.defer) { deferred.push({ payload: payload, done: done }); if (deferred.length === 1) scheduleFlush(); }
    else post(payload, 1, done);
    return payload.event_id;
  }
  function basePayload(name, eventId, i) {
    return {
      source: SOURCE, release: RELEASE,
      event_name: name, event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      url: String(loc.href || ''), referrer: String((doc && doc.referrer) || ''),
      email: i.email, phone: i.phone, fn: i.fn, ln: i.ln, st: i.st, country: i.country, external_id: i.external_id,
      fbp: fbp(), fbc: fbc(), fbclid: urlClickId()
    };
  }
  var purchaseConfirmed = json(ss('julie_meta_purchase_confirmed')) || {};
  function track(name, data, email) {
    try {
      name = String(name || '');
      data = data || {};
      if (name !== 'AddToCart' && name !== 'InitiateCheckout' && name !== 'Purchase') return null;
      var value = Number(data.value);
      var currency = String(data.currency || CURRENCY).toUpperCase();
      var order = '';
      if (name === 'Purchase') {
        /* Purchase is only accepted with a real order id, a positive charged amount and a currency. */
        order = String(data.order_id || '').trim();
        if (!order || !isFinite(value) || value <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
        if (purchaseConfirmed[order]) return null;              /* already acknowledged by Meta for this order */
      }
      var plan = planFor(data);
      var i = identity(email);
      var eventId = eventIdFor(name, data, plan);
      var pixelData = { value: isFinite(value) ? value : 0, currency: currency, product_line: PRODUCT_LINE };
      if (plan) {
        pixelData.content_ids = [plan.content_id];
        pixelData.content_type = 'product';
        pixelData.content_name = plan.content_name;
        pixelData.contents = [{ id: plan.content_id, quantity: 1, item_price: pixelData.value }];
        pixelData.plan = plan.id;
      } else if (data.content_name) pixelData.content_name = String(data.content_name);
      if (name === 'Purchase') pixelData.order_id = order;
      var payload = basePayload(name, eventId, i);
      payload.value = pixelData.value; payload.currency = currency;
      payload.plan = plan ? plan.id : '';
      payload.content_name = pixelData.content_name || '';
      payload.content_ids = pixelData.content_ids || [];
      payload.content_type = pixelData.content_type || '';
      payload.contents = pixelData.contents || [];
      payload.order_id = order;
      var opts = { onResult: null };
      if (name === 'Purchase') {
        opts.onResult = function (row) {
          if (row.status === 'accepted') { purchaseConfirmed[order] = { event_id: eventId, ts: Date.now() }; ssSet('julie_meta_purchase_confirmed', JSON.stringify(purchaseConfirmed)); }
        };
      }
      return dispatch(name, pixelData, payload, opts);
    } catch (e) { return null; }
  }
  /* Called by the Pixel base code after its (gated) init + PageView. Idempotent. */
  var pvQueued = false;
  function pageEvents() {
    try {
      var m = mode();
      if (m === 'off') return;
      var i = identity('');
      if (!pvQueued) {
        pvQueued = true;
        var pv = basePayload('PageView', pageViewId(), i);       /* browser copy came from the base code (live) */
        if (m === 'test') pv.test_event_code = testCode();
        deferred.push({ payload: pv, done: null }); if (deferred.length === 1) scheduleFlush();
      }
      var vcData = { content_ids: [PLANS.standard.content_id, PLANS.vip.content_id], content_type: 'product', content_name: PRODUCT_NAME, product_line: PRODUCT_LINE };
      var vc = basePayload('ViewContent', eventIdFor('ViewContent', {}, null), i);
      vc.content_ids = vcData.content_ids; vc.content_type = 'product'; vc.content_name = PRODUCT_NAME;
      dispatch('ViewContent', vcData, vc, { defer: true });
    } catch (e) {}
  }

  root.LLA_META = {
    track: track, release: RELEASE, mode: mode, fbc: fbc, fbp: fbp, identity: identity,
    receipts: receipts, plans: PLANS, pageEvents: pageEvents, pageViewId: pageViewId,
    _flushDeferred: flushDeferred
  };
})(typeof window !== 'undefined' ? window : globalThis);
