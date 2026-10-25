/* Guest access: a hashed, time-limited access code applied through the existing
 * "I have promo code" field. Not referenced anywhere in page copy. When valid,
 * the CRM lead/order is created exactly as today (notes carry the code) and the
 * buyer skips the card form. No Meta events, no charge, no change to pricing. */
(function () {
  'use strict';
  var HASHES = ['e74dc39609ebb5ece7a9f1af4bfc3cfbec7627f0c9588958b099986292073374'];
  var EXPIRES_AT = Date.UTC(2026, 9, 28, 21, 59, 59); /* 2026-10-28 23:59:59 Israel */
  var active = '';
  function $(id) { return document.getElementById(id); }
  function norm(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function sha256(s) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function fields() {
    return {
      fullName: $('emName').value, email: $('emEmail').value, phone: $('emPhone').value,
      smsConsent: $('emSms').checked, startDate: ($('emDate') || {}).value || '',
      promoCode: active ? (active + ' (guest access, 100%)') : ''
    };
  }
  function setErr(msg) { var e = $('emErr2'); e.textContent = msg; e.classList.add('on'); }
  function reflect() {
    var tu = $('emTuition'), go = $('emGo2'), ap = $('emApply');
    if (active) {
      if (tu) tu.textContent = '$0.00 · Guest access';
      if (go) go.textContent = 'Complete registration';
      if (ap) ap.textContent = 'Applied';
    }
  }
  function finish(ids) {
    var m = $('enrollModal'), ck = $('ckScreen'), order = $('ckOrder'), done = $('ckDone');
    var plan = (window.LLA_PLAN && LLA_PLAN.get && LLA_PLAN.get()) || {};
    var h = done.querySelector('h1'), ps = done.querySelectorAll('p');
    if (h) h.textContent = 'Registration confirmed';
    if (ps[0]) ps[0].textContent = 'Your guest seat for the Longevity Masterclass with Julie Gibson Clark is reserved. No payment is due. Your Zoom access details will be sent to ' + $('emEmail').value + ' before the session.';
    var ref = $('ckReceiptReference');
    if (ref) ref.textContent = 'Order #' + (ids.orderid || '') + ' · ' + (plan.course_name || 'Longevity Masterclass') + ' · ' + ($('emDate') || {}).value;
    ['ckVipCoupon', 'ckCourseLink'].forEach(function (id) { var el = $(id); if (el) el.style.display = 'none'; });
    m.classList.remove('open'); order.style.display = 'none'; done.style.display = 'block';
    ck.style.display = 'block'; document.body.style.overflow = 'hidden'; ck.scrollTop = 0;
    try { var s3 = $('ckSt3'); if (s3) s3.classList.add('done'); var b2 = $('ckBar2'); if (b2) b2.classList.add('done'); } catch (e) {}
    try { window.LLA_AC && LLA_AC.send && LLA_AC.send('LGV_Guest_Access_Registered'); } catch (e) {}
  }
  var busy = false;
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('#emApply, #emGo2') : null;
    if (!t) return;
    if (t.id === 'emApply') {
      var code = norm($('emPromo').value);
      if (!code) return;
      ev.stopPropagation(); ev.preventDefault();
      sha256(code).then(function (hx) {
        if (HASHES.indexOf(hx) !== -1 && Date.now() < EXPIRES_AT) { active = code; reflect(); }
        else { active = ''; t.textContent = 'Not valid for this package'; }
      });
      return;
    }
    if (!active) return;
    ev.stopPropagation(); ev.preventDefault();
    if (busy) return;
    var f = fields(), e2 = $('emErr2'); e2.textContent = ''; e2.classList.remove('on');
    if (!window.LLA_ECOMM) { setErr('Something went wrong, please refresh and try again.'); return; }
    var v = LLA_ECOMM.validateLead(f);
    if (!v.ok) { setErr('Please check your details.'); return; }
    f.phone = v.phone;
    busy = true; t.disabled = true; t.textContent = 'Confirming your seat…';
    LLA_ECOMM.submitLead(f).then(function (r) {
      if (!r || !r.ok) throw new Error('order_failed');
      finish(LLA_ECOMM.getCheckoutIds() || {});
    }).catch(function () {
      setErr('We could not confirm your registration. Please contact advisor@longevitylifeacademy.com.');
    }).finally(function () { busy = false; t.disabled = false; reflect(); });
  }, true);
  document.addEventListener('input', function (ev) {
    if (ev.target && ev.target.id === 'emPromo' && active && norm(ev.target.value) !== active) {
      active = ''; var ap = $('emApply'); if (ap) ap.textContent = 'Apply';
      var go = $('emGo2'); if (go) go.textContent = 'Continue to payment';
      var tu = $('emTuition'), p = (window.LLA_PLAN && LLA_PLAN.get && LLA_PLAN.get()) || {};
      if (tu && p.value != null) tu.textContent = '$' + Number(p.value).toFixed(2);
    }
  }, true);
})();
