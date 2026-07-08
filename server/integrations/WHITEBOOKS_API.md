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
- `GET  /einvoice/type/GSTNDETAILS/version/V1_03` Get GSTN details
- `GET  /einvoice/type/SYNC_GSTIN_FROMCP/version/V1_03` Sync GSTIN from common portal
- `POST /einvoice/type/GENERATE_EWAYBILL/version/V1_03` Generate e-Way bill from IRN
- `GET  /einvoice/type/GETEWAYBILLIRN/version/V1_03` Get e-Way bill by IRN
- `GET  /einvoice/qrcode` Get B2C QR code

## e-Way Bill (base path `/ewaybillapi/v1.03`)

Auth: `GET /ewaybillapi/v1.03/authenticate`

- query: `email, username, password, irp?`
- headers: `ip_address, client_id, client_secret, gstin`
  Data calls (headers: `ip_address, client_id, client_secret, gstin`; query `email, irp?`; body plain JSON):
- `POST /ewaybillapi/v1.03/ewayapi/genewaybill` Generate e-Way bill
- `POST /ewaybillapi/v1.03/ewayapi/vehewb` Update Part-B / vehicle
- `POST /ewaybillapi/v1.03/ewayapi/canewb` Cancel
- `POST /ewaybillapi/v1.03/ewayapi/extendvalidity` Extend validity
- `POST /ewaybillapi/v1.03/ewayapi/updatetransporter` Update transporter
- `POST /ewaybillapi/v1.03/ewayapi/gencewb` Generate consolidated
- `GET  /ewaybillapi/v1.03/ewayapi/getewaybill` Get details
  (auth-token header for write ops: confirm empirically against sandbox during build)

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
- `GET  /gstr/retstatus` Return status
- `GET  /gstr1/retsum` + many section GETs (b2b, b2cl, cdnr, hsnsum, exp, nil, at, …)

## Sandbox credentials (developer account: darshannn022@gmail.com)

- e-Invoice / e-Way share one set: `client_id EINS…/EWBS…`, `username BVMGSP`, `password Wbooks@0142`, `gstin 29AAGCB1286Q000`
- GST returns: `client_id GSTS…`, per-state GSTN usernames (e.g. `TN_NT2.152383`, `MH_NT2.1641`), per-GSTIN
- Keep production creds out of committed .env — load via server/loadEnv.js only.
