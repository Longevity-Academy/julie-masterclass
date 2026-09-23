/* Payment contract shared by the Julie UI and its offline regression tests.
 * Price DTO matches the deployed Blueprint checkout. Course IDs remain the
 * existing masterclass IDs; this file does not invent a second CRM product.
 */
(function (root) {
  'use strict';
  var prices = {
    standard: { firstPayment: 49, numberOfPayments: 1, leftToPay: 0 },
    vip: { firstPayment: 79, numberOfPayments: 1, leftToPay: 0 }
  };
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
      'masterclassplan=' + plan;
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
    return {
      intent_id: details.Airwallex.paymentIntentId,
      client_secret: details.Airwallex.clientSecret,
      currency: 'USD',
      mode: 'payment',
      country_code: 'US',
      methods: ['card', 'googlepay', 'paypal', 'applepay'],
      payment_methods: ['card', 'googlepay', 'paypal', 'applepay'],
      paymentMethods: ['card', 'googlepay', 'paypal', 'applepay'],
      payment_method_types: ['card', 'googlepay', 'paypal', 'applepay'],
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
    dropInOptions: dropInOptions
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JuliePaymentSafety;
})(typeof window !== 'undefined' ? window : globalThis);
