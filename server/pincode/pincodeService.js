// Offline PIN-code → State/Country resolver.
//
// The app is offline-first, so we don't hit an external postal API. India Post
// encodes the state in the PIN prefix: the first digit is the zone, the first
// two digits the postal circle, and the first three the postal "region". We
// resolve on the first three digits (accurate for most regions) and fall back
// to the first two (postal circle → dominant state).
//
// State drives GST Place of Supply, so callers should treat the result as a
// best-guess default the user can override in the dropdown — not authoritative.

// State names must match client/src/constants/states.ts exactly, otherwise the
// autofilled value won't map to a <select> option.
const S = {
  DL: 'Delhi',
  HR: 'Haryana',
  PB: 'Punjab',
  CH: 'Chandigarh',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  LA: 'Ladakh',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  RJ: 'Rajasthan',
  GJ: 'Gujarat',
  DD: 'Dadra and Nagar Haveli and Daman and Diu',
  MH: 'Maharashtra',
  MP: 'Madhya Pradesh',
  CG: 'Chhattisgarh',
  GA: 'Goa',
  TG: 'Telangana',
  AP: 'Andhra Pradesh',
  KA: 'Karnataka',
  TN: 'Tamil Nadu',
  PY: 'Puducherry',
  KL: 'Kerala',
  WB: 'West Bengal',
  SK: 'Sikkim',
  OD: 'Odisha',
  AS: 'Assam',
  AR: 'Arunachal Pradesh',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  TR: 'Tripura',
  BR: 'Bihar',
  JH: 'Jharkhand',
  AN: 'Andaman and Nicobar Islands',
};

// First-3-digit overrides — used where a circle splits across states (e.g. an
// Army/newer state carved out of a larger one). Checked before the 2-digit map.
const REGION_3 = {
  160: S.CH, // Chandigarh (inside 16 Punjab circle)
  194: S.LA, // Ladakh (inside 18/19 J&K circle)
  246: S.UK,
  248: S.UK,
  249: S.UK,
  262: S.UK,
  263: S.UK, // Uttarakhand (inside 2x UP)
  403: S.GA, // Goa (inside 40 Maharashtra circle)
  605: S.PY, // Puducherry (inside 60 Tamil Nadu circle)
  737: S.SK, // Sikkim (inside 73 West Bengal circle)
  744: S.AN, // Andaman & Nicobar (inside 74 West Bengal circle)
  // North-Eastern states share the 79 circle.
  790: S.AR,
  791: S.AR,
  792: S.AR,
  793: S.ML,
  794: S.ML,
  795: S.MN,
  796: S.MZ,
  797: S.NL,
  798: S.NL,
  799: S.TR,
  // Jharkhand carved out of the Bihar circles (80-85).
  813: S.JH,
  814: S.JH,
  815: S.JH,
  825: S.JH,
  826: S.JH,
  827: S.JH,
  828: S.JH,
  829: S.JH,
  831: S.JH,
  832: S.JH,
  833: S.JH,
  834: S.JH,
  835: S.JH,
};

// First-2-digit postal circle → dominant state.
const CIRCLE_2 = {
  11: S.DL,
  12: S.HR,
  13: S.HR,
  14: S.PB,
  15: S.PB,
  16: S.PB,
  17: S.HP,
  18: S.JK,
  19: S.JK,
  20: S.UP,
  21: S.UP,
  22: S.UP,
  23: S.UP,
  24: S.UP,
  25: S.UP,
  26: S.UP,
  27: S.UP,
  28: S.UP,
  30: S.RJ,
  31: S.RJ,
  32: S.RJ,
  33: S.RJ,
  34: S.RJ,
  36: S.GJ,
  37: S.GJ,
  38: S.GJ,
  39: S.GJ,
  40: S.MH,
  41: S.MH,
  42: S.MH,
  43: S.MH,
  44: S.MH,
  45: S.MP,
  46: S.MP,
  47: S.MP,
  48: S.MP,
  49: S.CG,
  50: S.TG,
  51: S.AP,
  52: S.AP,
  53: S.AP,
  56: S.KA,
  57: S.KA,
  58: S.KA,
  59: S.KA,
  60: S.TN,
  61: S.TN,
  62: S.TN,
  63: S.TN,
  64: S.TN,
  67: S.KL,
  68: S.KL,
  69: S.KL,
  70: S.WB,
  71: S.WB,
  72: S.WB,
  73: S.WB,
  74: S.WB,
  75: S.OD,
  76: S.OD,
  77: S.OD,
  78: S.AS,
  80: S.BR,
  81: S.BR,
  82: S.BR,
  84: S.BR,
  85: S.BR,
  83: S.JH,
};

/**
 * Resolve a 6-digit Indian PIN to { pincode, state, country, matched }.
 * `matched` is false when the PIN is malformed or the prefix is unknown
 * (e.g. Army Postal Service 9x) — state/country are then left empty.
 */
function lookup(pincode) {
  const pin = String(pincode ?? '').replace(/\D/g, '');
  if (pin.length !== 6 || pin[0] === '0') {
    return { pincode: pin, state: '', country: '', matched: false };
  }
  const p3 = Number(pin.slice(0, 3));
  const p2 = Number(pin.slice(0, 2));
  const state = REGION_3[p3] || CIRCLE_2[p2] || '';
  return { pincode: pin, state, country: state ? 'India' : '', matched: Boolean(state) };
}

module.exports = { lookup };
