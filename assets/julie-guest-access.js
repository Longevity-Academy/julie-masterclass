/* Guest access: a hashed, time-limited access code applied through the existing
 * "I have promo code" field. Not referenced anywhere in page copy. When valid,
 * a zero-value CRM order is created and assigned to the chosen class before
 * confirmation. No payment report or card form. Paid pricing is unchanged. */
(function () {
  'use strict';
  var HASHES = ['e74dc39609ebb5ece7a9f1af4bfc3cfbec7627f0c9588958b099986292073374'];
  var EXPIRES_AT = Date.UTC(2026, 10, 15, 21, 59, 59); /* 2026-11-15 23:59:59 Israel */
  var active = '';
  var REC = 'julie_manual_guest_orders_v2', memoryRecords = {}, storageUnavailable = false;
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
      planId: (window.LLA_PLAN && LLA_PLAN.get && LLA_PLAN.get().id) || 'standard',
      promoCode: active ? (active + ' (guest access, 100%)') : ''
    };
  }
  function setErr(msg) { var e = $('emErr2'); e.textContent = msg; e.classList.add('on'); }
  function applied() {
    return !!active && Date.now() < EXPIRES_AT && norm(($('emPromo') || {}).value) === active;
  }
  function reset() {
    active = '';
    var ap = $('emApply'), go = $('emGo2'), tu = $('emTuition');
    var p = (window.LLA_PLAN && LLA_PLAN.get && LLA_PLAN.get()) || {};
    if (ap) ap.textContent = 'Apply';
    if (go) go.textContent = 'Continue to payment';
    if (tu && p.value != null) tu.textContent = p.tuition_label || ('$' + Number(p.value).toFixed(2));
    if ($('checkoutPackageSummary')) $('checkoutPackageSummary').textContent = p.id === 'vip'
      ? '$79 / 60-minute class + 30-minute private Q&A' : '$49 / 60 minutes live';
    if ($('selectedSessionNote')) $('selectedSessionNote').textContent = 'Choose your preferred session before continuing to secure payment.';
  }
  // Existing, retained free-order DTO. This is never activated by a URL,
  // saved coupon, default plan, or merely entering text without pressing Apply.
  window.JulieGuestAccess = {
    applyPrice: function (payload, f) {
      if (!applied() || !f || f.promoCode !== active + ' (guest access, 100%)') return false;
      payload.FirstPayment = 0;
      payload.NumberOfPayments = 0;
      payload.LeftToPay = 0;
      payload.DiscountPercent = 100;
      delete payload.DiscountReason;
      payload.DynamicParameters = String(payload.DynamicParameters || '')
        .replace(/masterclassdiscountpercent=[^&;]*/g, 'masterclassdiscountpercent=100')
        .replace(/masterclassdiscountamount=[^&;]*/g, 'masterclassdiscountamount=79');
      return true;
    }
  };
  function reflect() {
    var tu = $('emTuition'), go = $('emGo2'), ap = $('emApply');
    if (applied()) {
      if (tu) tu.textContent = '$0.00 · Guest access';
      if (go) go.textContent = 'Complete registration';
      if (ap) ap.textContent = 'Applied';
      var plan = (window.LLA_PLAN && LLA_PLAN.get && LLA_PLAN.get()) || {};
      if ($('checkoutPackageSummary')) $('checkoutPackageSummary').textContent = plan.id === 'vip'
        ? '$0 / 60-minute class + 30-minute private Q&A' : '$0 / 60 minutes live';
      if ($('selectedSessionNote')) $('selectedSessionNote').textContent = 'Confirm your preferred session. No payment is required.';
    }
  }
  function recordKey(f) {
    var cfg = LLA_ECOMM.config || {};
    var cls = LLA_ECOMM.classForSession(f.startDate);
    return [cfg.env || 'production', cls.courseId, f.planId, String(f.email).trim().toLowerCase()].join(':');
  }
  function records() {
    if (storageUnavailable) return memoryRecords;
    try { return JSON.parse(localStorage.getItem(REC) || '{}') || {}; }
    catch (e) { return memoryRecords; }
  }
  function save(key, value) {
    var all = records();
    if (value) all[key] = value; else delete all[key];
    memoryRecords = all;
    try { localStorage.setItem(REC, JSON.stringify(all)); } catch (e) { storageUnavailable = true; }
  }
  function idsFrom(body) {
    body = body || {};
    var stid = Number(body.stid || body.StudentId || body.studentId || body.StudentID);
    var orderid = Number(body.orderid || body.OrderId || body.orderId || body.OrderID);
    if (!Number.isSafeInteger(stid) || stid <= 0 || !Number.isSafeInteger(orderid) || orderid <= 0) {
      throw new Error('missing_order_identity');
    }
    return { stid: String(stid), orderid: String(orderid) };
  }
  function assignClass(ids, f) {
    var cfg = LLA_ECOMM.config || {};
    var base = String(cfg.workerBase || '').replace(/\/$/, '') + (cfg.env === 'staging' ? '/staging' : '');
    var cls = LLA_ECOMM.classForSession(f.startDate);
    var body = { StudentID: Number(ids.stid), OrderID: Number(ids.orderid),
      SecondaryCourseID: Number(cls.courseId), AssignNotes: 'Guest access code, free seat, Longevity Masterclass' };
    return fetch(base + '/api/checkout/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('assignment_failed');
      if (r.status === 204) return;
      return r.json().then(function (body) {
        if (!body || body.ok === false) throw new Error('assignment_failed');
      });
    });
  }
  function finish(ids, f) {
    var m = $('enrollModal'), ck = $('ckScreen'), order = $('ckOrder'), done = $('ckDone');
    var plan = (window.LLA_PLAN && LLA_PLAN.plans && LLA_PLAN.plans[f.planId]) || {};
    var h = done.querySelector('h1'), ps = done.querySelectorAll('p');
    if (h) h.textContent = 'Registration confirmed';
    if (ps[0]) ps[0].textContent = 'Your guest seat for the Longevity Masterclass with Julie Gibson Clark is reserved. No payment is due. Your Zoom access details will be sent to ' + f.email + ' before the session.';
    var ref = $('ckReceiptReference');
    if (ref) ref.textContent = 'Order #' + (ids.orderid || '') + ' · ' + (plan.course_name || 'Longevity Masterclass') + ' · ' + f.startDate;
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
        // An earlier hash completion must not apply after the input was edited.
        if (norm($('emPromo').value) !== code) return;
        if (HASHES.indexOf(hx) !== -1 && Date.now() < EXPIRES_AT) { active = code; reflect(); }
        else { reset(); t.textContent = 'Not valid for this package'; }
      }).catch(function () { reset(); t.textContent = 'Could not apply code. Please try again.'; });
      return;
    }
    if (!active) return;
    ev.stopPropagation(); ev.preventDefault();
    if (busy) return;
    if (!applied()) { reset(); setErr('Your guest code has expired or changed. Please apply a valid code before continuing.'); return; }
    var f = fields(), e2 = $('emErr2'); e2.textContent = ''; e2.classList.remove('on');
    if (!window.LLA_ECOMM) { setErr('Something went wrong, please refresh and try again.'); return; }
    var v = LLA_ECOMM.validateLead(f);
    if (!v.ok) { setErr('Please check your details.'); return; }
    f.phone = v.phone;
    busy = true; t.disabled = true; t.textContent = 'Confirming your seat…';
    var key = recordKey(f), prev = records()[key], work;
    if (prev && prev.orderid) {
      // Reuse only this guest context, never unrelated paid/CRM-link order IDs.
      work = (prev.assigned ? Promise.resolve() : assignClass(prev, f).then(function () {
        save(key, { stid: prev.stid, orderid: prev.orderid, assigned: true });
      })).then(function () { finish(prev, f); });
    } else if (prev && prev.attempted) {
      work = Promise.reject(new Error('unconfirmed_attempt'));
    } else {
      save(key, { attempted: true });
      work = LLA_ECOMM.submitLead(f).then(function (r) {
        if (!r || !r.ok || (r.body && r.body.ok === false)) {
          if (r && r.status >= 400 && r.status < 500) save(key, null);
          throw new Error('order_failed');
        }
        var ids = idsFrom(r.body);
        save(key, { stid: ids.stid, orderid: ids.orderid, assigned: false });
        return assignClass(ids, f).then(function () {
          save(key, { stid: ids.stid, orderid: ids.orderid, assigned: true });
          finish(ids, f);
        });
      });
    }
    work.catch(function (e) {
      setErr(e && e.message === 'unconfirmed_attempt'
        ? 'Your registration may already be in. Please do not submit again. Contact advisor@longevitylifeacademy.com and we will confirm your seat.'
        : 'We could not confirm your registration. No payment has been taken. Please contact advisor@longevitylifeacademy.com.');
    }).finally(function () { busy = false; t.disabled = false; reflect(); });
  }, true);
  document.addEventListener('input', function (ev) {
    if (ev.target && ev.target.id === 'emPromo' && active && norm(ev.target.value) !== active) {
      reset();
    }
  }, true);
  document.addEventListener('click', function (ev) {
    if (ev.target && ev.target.closest && ev.target.closest('[data-plan], #emGo1')) reflect();
  });
})();
