# WhiteBooks (BVM GSP) API — endpoint reference

Extracted from the WhiteBooks developer portal Swagger specs
(`developer.whitebooks.in/static/swagger/{whitebooks_einvoice,whitebooks_ewaybill,whitebooks}.json`).

- **Sandbox base URL:** `https://apisandbox.whitebooks.in`
- **Production base URL:** `https://api.whitebooks.in`
- All requests + responses are **plain JSON** (WhiteBooks does NIC encryption server-side; no AES/SEK/RSA on our side).
- WhiteBooks response envelope: `{ status_cd: "Sucess"|"Failure", status_desc, data: {...}, error? }`
  (note the literal misspelling `"Sucess"`). Auth data: `{ AuthToken, Sek, TokenExpiry, ClientId, UserName }`,
  `TokenExpiry` format `YYYY-MM-DD HH:MM:SS` (~1h).

## e-Invoice (validated live: auth → HTTP 200)

Auth: `GET /einvoice/authenticate`

- query: `email`
- headers: `username, password, ip_address, client_id, client_secret, gstin`
  Data calls (headers: `ip_address, client_id, client_secret, username, auth-token, gstin`; query `email`; body plain JSON):
- `POST /einvoice/type/GENERATE/version/V1_03` Generate IRN (NIC invoice schema: Version/TranDtls/DocDtls/SellerDtls/BuyerDtls/ItemList/ValDtls)
- `POST /einvoice/type/CANCEL/version/V1_03` Cancel IRN
- `GET  /einvoice/type/GETIRN/version/V1_03` Get e-Invoice by IRN
- `GET  /einvoice/type/GETIRNBYDOCDETAILS/version/V1_03` Get IRN by doc details
- `GET  /einvoice/type/GSTNDETAILS/version/V1_03` Get GSTN details
- `GET  /einvoice/type/SYNC_GSTIN_FROMCP/version/V1_03` Sync GSTIN from common portal (query `param1`=gstin)
- `GET  /einvoice/type/GETREJECTEDIRNS/version/V1_03` Get rejected IRNs (query `param1`=date dd/mm/yyyy)
- `POST /einvoice/type/GENERATE_EWAYBILL/version/V1_03` Generate e-Way bill from IRN
- `GET  /einvoice/type/GETEWAYBILLIRN/version/V1_03` Get e-Way bill by IRN (query `param1`=irn)
- `GET  /einvoice/qrcode` Get B2C QR code (all inputs in headers: sgstin, docno, docdate, totinvval, bank\*, \*amount)

## e-Way Bill (base path `/ewaybillapi/v1.03`)

Auth: `GET /ewaybillapi/v1.03/authenticate`

- query: `email, username, password, irp?`
- headers: `ip_address, client_id, client_secret, gstin`
  Data calls (headers: `ip_address, client_id, client_secret, gstin`; query `email, irp?`; body plain JSON):
  Writes (POST, NIC-shaped JSON body): `genewaybill` Generate · `vehewb` Update Part-B/vehicle ·
  `gencewb` Generate consolidated · `canewb` Cancel · `rejewb` Reject · `updatetransporter` Update
  transporter · `extendvalidity` Extend validity · `regentripsheet` Regenerate consolidated ·
  `initmulti` Init multi-vehicle · `addmulti` Add multi-vehicles · `clsewb` Close.
  Reads (GET, query): `getewaybill` (ewbNo) · `getewaybillsfortransporter` (date) ·
  `getewaybillsfortransporterbystate` (stateCode,date) · `getewaybillsfortransporterbygstin`
  (Gen_gstin,date) · `getewaybillreportbytransporterassigneddate` (date,stateCode) ·
  `getewaybillsbydate` (date) · `getewaybillsrejectedbyothers` (date) · `getewaybillsofotherparty`
  (date) · `gettripsheet` (tripSheetNo) · `getewaybillgeneratedbyconsigner` (docType,docNo) ·
  `geterrorlist` · `getgstindetails` (GSTIN) · `gettransporterdetails` (trn_no) ·
  `gethsndetailsbyhsncode` (hsncode).

Code: all wired in `server/ewayBill/ewayBillService.js` (named methods + `ewayRequest` generic
seam) → ewayBillController → `ewayBill:*` IPC → preload `window.api.ewayBill.*`. e-Way auth is
client-cred (no taxpayer OTP), so these are live-testable. IRN-linked generate/cancel/get keep a
NIC fallback; the rest are WhiteBooks-only.

## GST Return Filing (base path `/`) — GSTN OTP-session flow

Auth is two-step (taxpayer receives an OTP on their registered mobile):

1. `GET /authentication/otprequest` headers: `gst_username, state_cd, ip_address, client_id, client_secret`; query `email`
   → GSTN sends OTP to taxpayer
2. `GET /authentication/authtoken` query: `email, otp`; headers: `gst_username, state_cd, ip_address, txn, client_id, client_secret`
   → returns session token + `txn`

- `GET /authentication/refreshtoken`, `GET /authentication/logout`
- EVC/OTP for filing: `GET /authentication/otpforevc`
  Data calls (headers include `gstin, ret_period, gst_username, state_cd, ip_address, txn, client_id, client_secret`; query `email`):
- `PUT  /gstr1/retsave` Save GSTR-1 data
- `POST /gstr1/retfile` File GSTR-1 (DSC)
- `POST /gstr1/retevcfile` File GSTR-1 (EVC/OTP)
- `POST /gstr1/reset` Reset
- `POST /gstr3b/retfile` / `POST /gstr3b/retevcfile` File GSTR-3B
- `GET  /gstr3b/retsum`, `/gstr3b/autoliab`, `/gstr3b/openingbal`, `/gstr3b/closingbal` (compute helpers)
- `GET  /gstr/retstatus` Return status · `GET /gstr/rettrack` Track returns
- `GET  /gstr1/retsum` + confirmed section GETs: `dociss, cdnra, b2cl, b2ba, ata, txp, supeco, supecoa, ecom, ecoma`
- Public (no OTP session per spec, but same transport): `GET /public/{search,rettrack,pref,unregistered-applicants,unregistered-applicants-validation}`
- `GET /authentication/refreshtoken` extend session

### GST portal read/download surface — code

`server/gstFiling/gstPortalService.js` exposes the whole /gstapis catalog:

- `getSection(type, section, q)` → `GET /{type}/{section}` (GSTN convention; drives GSTR-2A/2B/2X downloads by passing type+section)
- `getSummary(type, q)` → `/{type}/retsum`; `retTrack`, `publicSearch/RetTrack`, `getPreferences`, `urdDetails/Validate`, `refreshToken`, `requestEvcFor(form_type)`
- `portalRequest({method,path,query,headers,body})` — namespace-guarded generic call for anything else (ledger, payment/challan, IMS, notices, ITC-03/04, CMP)
- Filing: `gstFilingService.saveToPortal/fileReturn` now take any `return_type` (`/{type}/retsave|retevcfile`) + optional passthrough `payload` for returns with no local builder (GSTR-9/9C, composition/TDS/TCS/IMS family). Local builders exist only for GSTR-1 & GSTR-3B.
- All GST-portal calls need the taxpayer's live OTP session (`requestOtp → authenticate(otp)`); they return "authenticate first" until then.

## Sandbox credentials (developer account: darshannn022@gmail.com)

- e-Invoice / e-Way share one set: `client_id EINS…/EWBS…`, `username BVMGSP`, `password Wbooks@0142`, `gstin 29AAGCB1286Q000`
- GST returns: `client_id GSTS…`, per-state GSTN usernames (e.g. `TN_NT2.152383`, `MH_NT2.1641`), per-GSTIN
- Keep production creds out of committed .env — load via server/loadEnv.js only.
