/* Julie checkout international buyer details.
 * Base country data and phone normalization are copied from the approved
 * /blueprint-checkout/verification-live-20260923/assets/lla-country.js.
 * No new CRM IDs or network requests are introduced.
 * CountryIsoCode remains US for the existing USD pricing contract; the actual
 * buyer country is recorded in the documented DynamicParameters message.
 */
(function (root) {
  'use strict';
  if (root.JulieInternationalCheckout) return;
  var RAW =
  'US|United States|1;AF|Afghanistan|93;AL|Albania|355;DZ|Algeria|213;AD|Andorra|376;AO|Angola|244;AG|Antigua and Barbuda|1;AR|Argentina|54;AM|Armenia|374;AU|Australia|61;AT|Austria|43;AZ|Azerbaijan|994;BS|Bahamas|1;BH|Bahrain|973;BD|Bangladesh|880;BB|Barbados|1;BY|Belarus|375;BE|Belgium|32;BZ|Belize|501;BJ|Benin|229;BM|Bermuda|1;BT|Bhutan|975;BO|Bolivia|591;BA|Bosnia and Herzegovina|387;BW|Botswana|267;BR|Brazil|55;BN|Brunei|673;BG|Bulgaria|359;BF|Burkina Faso|226;BI|Burundi|257;KH|Cambodia|855;CM|Cameroon|237;CA|Canada|1;CV|Cape Verde|238;KY|Cayman Islands|1;CF|Central African Republic|236;TD|Chad|235;CL|Chile|56;CN|China|86;CO|Colombia|57;KM|Comoros|269;CG|Congo|242;CD|Congo (DRC)|243;CR|Costa Rica|506;CI|Cote d Ivoire|225;HR|Croatia|385;CU|Cuba|53;CY|Cyprus|357;CZ|Czechia|420;DK|Denmark|45;DJ|Djibouti|253;DM|Dominica|1;DO|Dominican Republic|1;EC|Ecuador|593;EG|Egypt|20;SV|El Salvador|503;GQ|Equatorial Guinea|240;ER|Eritrea|291;EE|Estonia|372;SZ|Eswatini|268;ET|Ethiopia|251;FJ|Fiji|679;FI|Finland|358;FR|France|33;GA|Gabon|241;GM|Gambia|220;GE|Georgia|995;DE|Germany|49;GH|Ghana|233;GI|Gibraltar|350;GR|Greece|30;GD|Grenada|1;GT|Guatemala|502;GN|Guinea|224;GW|Guinea-Bissau|245;GY|Guyana|592;HT|Haiti|509;HN|Honduras|504;HK|Hong Kong|852;HU|Hungary|36;IS|Iceland|354;IN|India|91;ID|Indonesia|62;IR|Iran|98;IQ|Iraq|964;IE|Ireland|353;IL|Israel|972;IT|Italy|39;JM|Jamaica|1;JP|Japan|81;JO|Jordan|962;KZ|Kazakhstan|7;KE|Kenya|254;KI|Kiribati|686;KW|Kuwait|965;KG|Kyrgyzstan|996;LA|Laos|856;LV|Latvia|371;LB|Lebanon|961;LS|Lesotho|266;LR|Liberia|231;LY|Libya|218;LI|Liechtenstein|423;LT|Lithuania|370;LU|Luxembourg|352;MO|Macau|853;MG|Madagascar|261;MW|Malawi|265;MY|Malaysia|60;MV|Maldives|960;ML|Mali|223;MT|Malta|356;MH|Marshall Islands|692;MR|Mauritania|222;MU|Mauritius|230;MX|Mexico|52;FM|Micronesia|691;MD|Moldova|373;MC|Monaco|377;MN|Mongolia|976;ME|Montenegro|382;MA|Morocco|212;MZ|Mozambique|258;MM|Myanmar|95;NA|Namibia|264;NR|Nauru|674;NP|Nepal|977;NL|Netherlands|31;NZ|New Zealand|64;NI|Nicaragua|505;NE|Niger|227;NG|Nigeria|234;MK|North Macedonia|389;NO|Norway|47;OM|Oman|968;PK|Pakistan|92;PW|Palau|680;PS|Palestine|970;PA|Panama|507;PG|Papua New Guinea|675;PY|Paraguay|595;PE|Peru|51;PH|Philippines|63;PL|Poland|48;PT|Portugal|351;PR|Puerto Rico|1;QA|Qatar|974;RO|Romania|40;RU|Russia|7;RW|Rwanda|250;KN|Saint Kitts and Nevis|1;LC|Saint Lucia|1;VC|Saint Vincent and the Grenadines|1;WS|Samoa|685;SM|San Marino|378;SA|Saudi Arabia|966;SN|Senegal|221;RS|Serbia|381;SC|Seychelles|248;SL|Sierra Leone|232;SG|Singapore|65;SK|Slovakia|421;SI|Slovenia|386;SB|Solomon Islands|677;SO|Somalia|252;ZA|South Africa|27;KR|South Korea|82;SS|South Sudan|211;ES|Spain|34;LK|Sri Lanka|94;SD|Sudan|249;SR|Suriname|597;SE|Sweden|46;CH|Switzerland|41;SY|Syria|963;TW|Taiwan|886;TJ|Tajikistan|992;TZ|Tanzania|255;TH|Thailand|66;TL|Timor-Leste|670;TG|Togo|228;TO|Tonga|676;TT|Trinidad and Tobago|1;TN|Tunisia|216;TR|Turkey|90;TM|Turkmenistan|993;TV|Tuvalu|688;UG|Uganda|256;UA|Ukraine|380;AE|United Arab Emirates|971;GB|United Kingdom|44;UY|Uruguay|598;UZ|Uzbekistan|998;VU|Vanuatu|678;VA|Vatican City|379;VE|Venezuela|58;VN|Vietnam|84;YE|Yemen|967;ZM|Zambia|260;ZW|Zimbabwe|263';

  var LIST = RAW.split(';').map(function (r) {
    var p = r.split('|');
    return { iso: p[0], name: p[1], dial: p[2] };
  });
  /* Added the two missing sovereign countries (North Korea, Sao Tome and Principe) from countries-list@3.4.1 (MIT):
   * https://www.npmjs.com/package/countries-list
   * Calling codes/short lengths: libphonenumber-js@1.13.13 (MIT):
   * https://www.npmjs.com/package/libphonenumber-js
   * Approved 200-country base retained; no territory expansion. No numeric CRM IDs.
   */
  var EXTRA_COUNTRIES = [{"iso":"KP","name":"North Korea","dial":"850"},{"iso":"ST","name":"Sao Tome and Principe","dial":"239"}];
  LIST = LIST.concat(EXTRA_COUNTRIES);
  LIST.forEach(function(c) { if (c.iso === 'VA') c.dial = '39'; });
  LIST.sort(function(a,b) { if(a.iso === 'US') return -1; if(b.iso === 'US') return 1; return a.name.localeCompare(b.name); });
  var SHORT_NATIONAL = {"AC":5,"AE":5,"AT":4,"AU":5,"AX":5,"CK":5,"DE":4,"FI":5,"FK":5,"HK":5,"IR":4,"KI":5,"KR":5,"LU":4,"NL":5,"NO":5,"NU":4,"NZ":5,"SB":5,"SH":4,"SI":5,"SJ":5,"TA":4,"TK":4,"TO":5,"TV":5,"UY":4,"VU":5,"WS":5,"ZA":5};
  var BY_ISO = {};
  LIST.forEach(function (c) { BY_ISO[c.iso] = c; });

  /* E.164: leading +, country calling code, 4 to 14 more digits, 15 digits max
     overall. Deliberately permissive beyond that. National numbering plans for
     190 countries are not something this file can police, and rejecting a real
     customer is worse than passing the CRM a number it can review. */
  function toE164(raw, iso) {
    var c = BY_ISO[iso];
    if (!c) return { ok: false, reason: 'unknown_country' };
    var s = String(raw || '').trim();
    var kept = s.replace(/[^\d+]/g, '');
    // Accept the explicit international 00 prefix without losing Italy's zero.
    if (kept.indexOf('00') === 0) kept = '+' + kept.slice(2);
    var digits;
    if (kept.charAt(0) === '+') {
      digits = kept.slice(1).replace(/\D/g, '');
      /* 2026-09-21: a +<code> number must belong to the selected country.
         Previously +972... under Japan passed; the dial code was never checked. */
      if (digits.indexOf(c.dial) !== 0) return { ok: false, reason: 'dial_code_mismatch' };
    } else {
      digits = kept.replace(/\D/g, '');
      /* Strip a single leading trunk zero, used across most of Europe,
         Africa and Asia, before prefixing the country code. */
      // Italy/Vatican zeros are significant internationally, not trunk prefixes.
      // https://github.com/google/libphonenumber/blob/master/FAQ.md
      if (digits.charAt(0) === '0' && iso !== 'IT' && iso !== 'VA') digits = digits.replace(/^0+/, '');
      /* Every country in the +1 North American plan shares the same code and
         carries its area code inside the national number. Prefixing a country
         specific code such as 1876 to a number that already begins 876 would
         send the CRM the area code twice, so +1 is treated as a plain prefix
         and a number that already starts with it is left alone. */
      if (c.dial === '1') {
        if (digits.length === 10) digits = '1' + digits;
      } else if (iso === 'IT' || iso === 'VA' || digits.indexOf(c.dial) !== 0) {
        digits = c.dial + digits;
      }
    }
    if (!/^[1-9]\d{5,14}$/.test(digits)) return { ok: false, reason: 'phone_length' };
    /* Keep the approved permissive bounds, with sourced shorter national
       lengths for countries/territories whose real numbers need them. */
    var nat = digits.slice(c.dial.length);
    if (nat.length < (SHORT_NATIONAL[iso] || 6) || nat.length > 12) return { ok: false, reason: 'phone_length' };
    return { ok: true, e164: '+' + digits };
  }


  var STATES = 'AL|Alabama;AK|Alaska;AZ|Arizona;AR|Arkansas;CA|California;CO|Colorado;CT|Connecticut;DE|Delaware;DC|District of Columbia;FL|Florida;GA|Georgia;HI|Hawaii;ID|Idaho;IL|Illinois;IN|Indiana;IA|Iowa;KS|Kansas;KY|Kentucky;LA|Louisiana;ME|Maine;MD|Maryland;MA|Massachusetts;MI|Michigan;MN|Minnesota;MS|Mississippi;MO|Missouri;MT|Montana;NE|Nebraska;NV|Nevada;NH|New Hampshire;NJ|New Jersey;NM|New Mexico;NY|New York;NC|North Carolina;ND|North Dakota;OH|Ohio;OK|Oklahoma;OR|Oregon;PA|Pennsylvania;RI|Rhode Island;SC|South Carolina;SD|South Dakota;TN|Tennessee;TX|Texas;UT|Utah;VT|Vermont;VA|Virginia;WA|Washington;WV|West Virginia;WI|Wisconsin;WY|Wyoming'.split(';').map(function (r) { var p = r.split('|'); return { iso: p[0], name: p[1] }; });
  var US_STATES = {};
  STATES.forEach(function (s) { US_STATES[s.iso] = true; });
  var doc = root.document;
  function el(id) { return doc && doc.getElementById(id); }
  function selected() { return el('emCountry') ? el('emCountry').value : 'US'; }
  function state() { return selected() === 'US' && el('emState') ? el('emState').value : ''; }
  function personal(fields) {
    fields = fields || {};
    var iso = String(fields.countryIso || selected()).toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(BY_ISO, iso)) return { error: 'invalid_country' };
    var phone, stateCode = '';
    if (iso === 'US') {
      phone = root.LLA_US && root.LLA_US.validatePhone
        ? root.LLA_US.validatePhone(fields.phone)
        : { ok: false, reason: 'validator_unavailable' };
      if (!phone.ok) return { error: 'non_us_phone', reason: phone.reason };
      stateCode = String(fields.stateCode !== undefined ? fields.stateCode : state()).toUpperCase();
      if (!US_STATES[stateCode]) return { error: 'invalid_state' };
    } else {
      phone = toE164(fields.phone, iso);
      if (!phone.ok) return { error: 'invalid_phone', reason: phone.reason };
    }
    return { countryIso: iso, stateCode: stateCode, e164: phone.e164 };
  }
  function applyPayload(payload, buyer) {
    if (!buyer || buyer.error || !BY_ISO[buyer.countryIso] || !buyer.e164) throw new Error('INVALID_BUYER_DETAILS');
    payload.MobilePhone = buyer.e164;
    root.LLA_BUYER_COUNTRY = buyer.countryIso;
    try { root.sessionStorage.setItem('julie_buyer_country', buyer.countryIso); } catch (ignore) {}
    // This is the verified Blueprint pricing lock, NOT a buyer-country claim.
    payload.CountryIsoCode = 'US';
    payload.CountryIsoCodeByIp = 'US';
    delete payload.CountryId;
    delete payload.State;
    delete payload.StateProvinceRegion;
    delete payload.StateId;
    var parts = String(payload.DynamicParameters || '').split(/[&;]/).filter(function (p) {
      return p && !/^stateisocodebyip=/i.test(p) && !/^message=/i.test(p);
    });
    // Preserve the existing message without its former hardcoded US-state prefix.
    var oldMessage = String(payload.DynamicParameters || '').match(/(?:^|[&;])message=([^&;]*)/i);
    var message = oldMessage ? oldMessage[1].replace(/^US%20State%20(?:[A-Z]{2}%20)?/i, '') : 'SELF%20SERVICE%20ECOMM%20CHECKOUT%20Longevity%20Masterclass';
    var countryNote = 'Buyer%20country%20' + buyer.countryIso;
    if (buyer.countryIso === 'US') {
      if (!US_STATES[buyer.stateCode]) throw new Error('INVALID_US_STATE');
      parts.push('stateisocodebyip=' + buyer.stateCode);
      countryNote += '%20US%20State%20' + buyer.stateCode;
    }
    parts.push('message=' + countryNote + '%20' + message);
    payload.DynamicParameters = parts.join('&');
    return payload;
  }
  function sync() {
    var select = el('emCountry'), stateSelect = el('emState'), field = el('emStateField');
    if (!select || !stateSelect || !field) return;
    var country = BY_ISO[select.value], isUS = select.value === 'US';
    field.hidden = !isUS;
    field.style.display = isUS ? '' : 'none';
    if (el('emStep1')) el('emStep1').classList.toggle('has-state', isUS);
    stateSelect.required = isUS;
    stateSelect.disabled = !isUS;
    if (!isUS) stateSelect.value = '';
    var dial = doc.querySelector('#enrollModal .em-cc');
    if (dial) dial.textContent = country ? country.iso + ' +' + country.dial : '';
    if (el('emPhone')) el('emPhone').placeholder = country ? '+' + country.dial + ' mobile number' : 'Mobile number';
  }
  function boot() {
    var phone = el('emPhone');
    if (!phone || !el('emStep1')) return;
    var phoneLabel = doc.querySelector('#emStep1 label[for="emPhone"]');
    if (!el('emCountry')) {
      var label = doc.createElement('label');
      label.className = 'em-lb'; label.htmlFor = 'emCountry'; label.textContent = 'Country*';
      var select = doc.createElement('select');
      select.id = 'emCountry'; select.name = 'buyer_country'; select.className = 'em-in';
      select.required = true; select.autocomplete = 'country';
      LIST.forEach(function (c) { var opt = doc.createElement('option'); opt.value = c.iso; opt.textContent = c.name; select.appendChild(opt); });
      select.value = 'US';
      var anchor = phoneLabel || phone.parentNode;
      anchor.parentNode.insertBefore(label, anchor);
      anchor.parentNode.insertBefore(select, anchor);
    }
    if (!el('emState')) {
      var field = doc.createElement('div'); field.id = 'emStateField';
      var stateLabel = doc.createElement('label');
      stateLabel.className = 'em-lb'; stateLabel.htmlFor = 'emState'; stateLabel.textContent = 'State*';
      var stateSelect = doc.createElement('select');
      stateSelect.id = 'emState'; stateSelect.name = 'buyer_state'; stateSelect.className = 'em-in';
      stateSelect.autocomplete = 'address-level1'; stateSelect.required = true;
      var blank = doc.createElement('option'); blank.value = ''; blank.textContent = 'Select your state'; stateSelect.appendChild(blank);
      STATES.forEach(function (s) { var opt = doc.createElement('option'); opt.value = s.iso; opt.textContent = s.name; stateSelect.appendChild(opt); });
      field.appendChild(stateLabel); field.appendChild(stateSelect);
      el('emCountry').insertAdjacentElement('afterend', field);
    }
    el('emCountry').addEventListener('change', sync);
    phone.addEventListener('blur', function () {
      // Convenience only: a buyer's explicit state always takes precedence.
      if (selected() !== 'US' || state()) return;
      var p = root.LLA_US && root.LLA_US.validatePhone && root.LLA_US.validatePhone(phone.value);
      var suggested = p && p.ok && root.LLA_US.stateForAreaCode ? root.LLA_US.stateForAreaCode(p.e164.slice(2, 5)) : '';
      if (US_STATES[suggested]) el('emState').value = suggested;
    });
    sync();
  }
  root.JulieInternationalCheckout = { list: LIST, states: STATES, toE164: toE164, selected: selected, state: state, personal: personal, applyPayload: applyPayload, boot: boot };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JulieInternationalCheckout;
  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);

/* Country metadata license:
The MIT License (MIT)

Copyright (c) 2014 Annexare Studio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/* Calling-code metadata license:
(The MIT License)

Copyright (c) 2016 @catamphetamine <purecatamphetamine@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
