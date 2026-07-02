#!/usr/bin/env node
/*
 * Spiimask — masking test suite
 * Runs the REAL core.js masking engine under a browser shim and asserts, for every
 * PII type, both POSITIVE (must mask) and NEGATIVE (must NOT mask) cases — plus the
 * edge/regression cases for every bug we've fixed. Exits non-zero on any failure.
 *
 *   node test/masking.test.js
 */
const fs = require('fs');
const path = require('path');

// ---- browser shim so core.js loads under node -----------------------------
global.document = {
  execCommand() {}, addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  body: { appendChild() {}, removeChild() {} }, querySelector: () => null,
};
global.window = { addEventListener() {}, document: global.document };
global.navigator = { clipboard: {} };
eval(fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8'));
const S = global.window.Spiimask;

// enable every PII type + no custom masks
S.config = S.config || {};
S.PII_REGEXES.forEach(r => { S.config['pii_' + r.type.toLowerCase()] = true; });
S.config.pii_api_key = true;
S.config.custom_masks = [];

// ---- helpers ---------------------------------------------------------------
const TOKEN_RE = /\[([A-Z0-9_]+)_[a-z0-9]{6}\]/g; // type may contain digits (IPV4, IPV6)
function run(input) {
  S.piiMap = {}; S.piiCounters = {}; S._maskCountPending = 0;
  const out = S.maskText(input);
  const types = new Set([...out.matchAll(TOKEN_RE)].map(m => m[1]));
  return { out, types };
}
let pass = 0, fail = 0;
const fails = [];
function ok(cond, desc) { if (cond) pass++; else { fail++; fails.push(desc); console.log('  ❌ ' + desc); } }
function mask(type, input, note)   { ok(run(input).types.has(type),  `[${type}] MASK   ${note || JSON.stringify(input)}`); }
function maskAny(types, input, note) { const got = run(input).types; ok(types.some(t => got.has(t)), `[${types.join('|')}] MASK   ${note || JSON.stringify(input)}`); }
function nomask(type, input, note) { ok(!run(input).types.has(type), `[${type}] NO-MASK ${note || JSON.stringify(input)}`); }
function jsonValid(body, note) {
  const { out } = run(body);
  let good = true; try { JSON.parse(out); } catch (e) { good = false; }
  ok(good, `JSON-SAFE ${note || body.slice(0, 40)}`);
}

// ===========================================================================
// POSITIVE + NEGATIVE per type
// ===========================================================================

// Contact
mask('EMAIL', 'reach me at dan.o+tag@sub.example.co.il please');
nomask('EMAIL', 'this is not-an-email @ nowhere');
mask('PHONE', 'call me 054-1234567');
mask('PHONE_INTL', 'intl +1 415 555 0199', 'non-IL international (+972 is handled as PHONE by design)');
mask('PHONE_IL_LANDLINE', 'office 03-1234567');

// Identity — checksum gated
mask('ID', 'ת"ז 123456782', 'valid IL id (check digit)');
nomask('ID', 'number 123456789', 'invalid IL id checksum -> not masked');
mask('SSN_US', 'SSN 123-45-6789');
mask('NI_UK', 'NI AB123456C');

// Financial — checksum + keyword gated
mask('CREDIT_CARD', 'card 4111 1111 1111 1111', 'Visa (Luhn ok)');
mask('CREDIT_CARD', 'mc 5500005555555559', 'Mastercard');
mask('CREDIT_CARD', 'amex 378282246310005', 'Amex');
nomask('CREDIT_CARD', 'ref 1782980809123456', 'REGRESSION: 1782 bug number (no BIN) not masked');
nomask('CREDIT_CARD', 'id 1234567890123456', 'random 16-digit (no network) not masked');
mask('CVV', 'CVV: 123');
nomask('CVV', 'quantity 123', 'bare 3 digits not a CVV');
mask('CARD_EXPIRY', 'exp 12/25');
nomask('CARD_EXPIRY', 'the ratio 12/25', 'bare MM/YY without keyword');
mask('IBAN', 'IL620108000000099999999', 'valid IL IBAN (mod-97)');
mask('SWIFT_BIC', 'SWIFT POALILIT');
maskAny(['COMPANY_IL', 'VAT_IL'], 'ח"פ 512345678', 'IL business id masked (COMPANY/VAT overlap — VAT runs first, still masked)');
mask('VAT_IL', 'עוסק מורשה 123456782');

// Secrets — keyword gated + JSON-safety
mask('PASSWORD', 'password: Hunter2!');
mask('PASSWORD', 'pwd=S3cretPass');
nomask('PASSWORD', 'the password is weak', 'natural prose (no : / =) not masked');
mask('API_KEY', 'aws AKIAIOSFODNN7EXAMPLE', 'AWS access key id');
mask('API_KEY', 'token ghp_' + 'a'.repeat(36), 'GitHub PAT (36 chars)');
mask('URL_CREDS', 'https://user:pass@internal.example.com/path');

// Medical
mask('HEALTH_FUND', 'קופת חולים 12345678');
nomask('HEALTH_FUND', 'order number 12345678', 'bare number not a health-fund #');

// Crypto
mask('ETH_WALLET', 'eth 0x52908400098527886E0F7030069857D2E4169EE7');
mask('BTC_WALLET', 'btc bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

// Network
mask('IPV4', 'server 192.168.10.24');
mask('IPV6', 'addr fe80::1ff:fe23:4567:890a');
nomask('IPV6', 'css ::before selector', 'REGRESSION: ::before is not an IPv6 addr');
mask('MAC', 'mac 00:1A:2B:3C:4D:5E');

// Israel
mask('PLATE_IL', 'plate 12-345-67', 'old 7-digit plate');
mask('PLATE_IL', 'plate 123-45-678', 'new 8-digit plate');

// New in v0.5.10-0.5.12 — keyword gated
mask('BANK_ACCOUNT', 'חשבון בנק: 12-345-678901');
mask('BANK_ACCOUNT', 'account number 4567890');
nomask('BANK_ACCOUNT', 'account balance is 50000', 'REGRESSION: prose, not an account #');
nomask('BANK_ACCOUNT', 'phone 03-1234567', 'phone shape, no bank keyword');
mask('DOB', 'date of birth: 15/07/1985');
mask('DOB', 'נולד ב-03/12/1990');
nomask('DOB', 'the meeting is 15/07/2025', 'innocent date, no birth keyword');
mask('DATE', 'issue date 05/12/2020');
mask('DATE', 'valid until 01/01/2027');
mask('DATE', 'אשפוז בתאריך 05/05/2023');
nomask('DATE', "let's meet 03/15/2025", 'REGRESSION: everyday date never masked');
mask('DRIVERS_LICENSE', "driver's license 12345678");
mask('DRIVERS_LICENSE', 'רישיון נהיגה: 87654321');
nomask('DRIVERS_LICENSE', 'build 12345678 released', 'bare number, no license keyword');

// ===========================================================================
// JSON-SAFETY (mask must never corrupt the request body) — regression suite
// ===========================================================================
jsonValid(JSON.stringify({ prompt: 'my password: Mattiba', uuid: 'abc-123', model: 'x' }), 'password (the Claude payload-breaker)');
jsonValid(JSON.stringify({ prompt: 'חשבון בנק 12-345-678901 ואימייל dan@x.com', next: 'y' }), 'bank + email in JSON');
jsonValid(JSON.stringify({ prompt: 'card 4111111111111111 cvv 123 exp 12/25', n: 2 }), 'card cluster in JSON');
jsonValid(JSON.stringify({ prompt: 'password: verylongsecretwithnospaces12345 tail', a: 1 }), 'long password value bounded at quote');

// ===========================================================================
console.log(`\n=================  RESULT: ${pass} passed, ${fail} failed  =================`);
if (fail) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('ALL GREEN ✅');
