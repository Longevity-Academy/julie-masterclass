/* Payment contract shared by the Julie UI and its offline regression tests.
 * Price DTO matches the deployed Blueprint checkout. Course IDs remain the
 * existing masterclass IDs; this file does not invent a second CRM product.
 */
(function (root) {
  'use strict';
  var crmCourseName = 'Longevity Masterclass';
  var catalogCents = 7900;
  var discountCents = { standard: 3000, vip: 0 };
  var prices = {};
  Object.keys(discountCents).forEach(function (plan) {
    prices[plan] = { firstPayment: (catalogCents - discountCents[plan]) / 100,
      numberOfPayments: 1, leftToPay: 0 };
  });
  function discount(plan) {
    price(plan);
    return { crmCourseName: crmCourseName, basePrice: catalogCents / 100,
      discountAmount: discountCents[plan] / 100,
      discountPercent: discountCents[plan] * 100 / catalogCents,
      finalPrice: (catalogCents - discountCents[plan]) / 100 };
  }
  function price(plan) {
    if (!Object.prototype.hasOwnProperty.call(prices, plan)) {
      throw new Error('UNSUPPORTED_MASTERCLASS_PLAN');
    }
    return Object.assign({}, prices[plan]);
  }
  function applyPrice(payload, plan) {
    var p = price(plan);
    payload.FirstPayment = p.firstPayment;
    payload.NumberOfPayments = p.numberOfPayments;
    payload.LeftToPay = p.leftToPay;
    payload.DynamicParameters = (payload.DynamicParameters ? payload.DynamicParameters + '&' : '') +
      'masterclassplan=' + plan +
      '&masterclassbaseprice=79&masterclassdiscountpercent=' + discount(plan).discountPercent +
      '&masterclassdiscountamount=' + discount(plan).discountAmount +
      '&crmcourse=' + encodeURIComponent(crmCourseName);
    return payload;
  }
  function validateDetails(details, plan) {
    var p = price(plan), d = details || {}, a = d.Airwallex || {};
    if (!a.paymentIntentId || !a.clientSecret || d.PaymentID == null || d.PaymentID === '') {
      throw new Error('PAYMENT_DETAILS_INCOMPLETE');
    }
    if (String(a.currency || '').toUpperCase() !== 'USD' ||
        !Number.isFinite(Number(a.amount)) || Number(a.amount) !== p.firstPayment ||
        Number(d.NumOfPayments) !== p.numberOfPayments) {
      throw new Error('PAYMENT_PLAN_MISMATCH');
    }
    if ((d.FirstPayment != null && Number(d.FirstPayment) !== p.firstPayment) ||
        (d.AmountToCharge != null && Number(d.AmountToCharge) !== p.firstPayment) ||
        (d.LeftToPay != null && Number(d.LeftToPay) !== p.leftToPay)) {
      throw new Error('PAYMENT_PLAN_MISMATCH');
    }
    return { amount: Number(a.amount), currency: 'USD', plan: plan };
  }
  function dropInOptions(details) {
    var shopperCountry = root.LLA_BUYER_COUNTRY || '';
    if (!shopperCountry) {
      try { shopperCountry = root.sessionStorage.getItem('julie_buyer_country') || ''; } catch (ignore) {}
    }
    if (!/^[A-Z]{2}$/.test(shopperCountry)) shopperCountry = 'US';
    return {
      intent_id: details.Airwallex.paymentIntentId,
      client_secret: details.Airwallex.clientSecret,
      currency: 'USD',
      mode: 'payment',
      country_code: shopperCountry,
      methods: ['card', 'paypal'],
      payment_methods: ['card', 'paypal'],
      paymentMethods: ['card', 'paypal'],
      payment_method_types: ['card', 'paypal'],
      applePayRequestOptions: {
        countryCode: 'CY', buttonType: 'buy', buttonColor: 'black',
        totalPriceLabel: 'Longevity Life Academy by eTeacher Group'
      },
      googlePayRequestOptions: {
        countryCode: 'US',
        merchantInfo: { merchantName: 'Longevity Life Academy by eTeacher Group' },
        buttonType: 'pay', buttonColor: 'black', buttonSizeMode: 'fill',
        allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
        emailRequired: false, billingAddressRequired: false
      },
      showPayButton: true,
      appearance: { locale: 'en' }
    };
  }
  root.JuliePaymentSafety = {
    price: price, applyPrice: applyPrice, validateDetails: validateDetails,
    dropInOptions: dropInOptions, discount: discount
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JuliePaymentSafety;
})(typeof window !== 'undefined' ? window : globalThis);
