# companyGstDetails — API reference

Backend module: `server/companyGstDetails/`
Namespace: `companyGstDetails` (same as module name; no typos found)
Renderer binding root: `window.api.companyGstDetails`

This module stores GST configuration for a company. It is a single-row-per-company
settings table keyed by `company_id`, with two IPC channels: a read (`get`) and an
upsert (`save`).

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `companyGstDetails:get` | `window.api.companyGstDetails.get(company_id)` | `company_id` (integer, bare scalar) | `{ success, exists, data }` — `exists=false` with default `data` when no row; `{ success:false, error }` on failure | Fetch the GST configuration for a company, or return defaults if none exists. |
| `companyGstDetails:save` | `window.api.companyGstDetails.save(data)` | `data` object (must include `company_id`; all camel-cased GST settings) | `{ success:true }` on success; `{ success:false, error }` on failure | Upsert (insert or update) the GST configuration for a company. |

## Notes

- Both handlers are wired in `server/index.js`:
  - `ipcMain.handle('companyGstDetails:get', companyGstDetailsController.get)`
  - `ipcMain.handle('companyGstDetails:save', companyGstDetailsController.save)`
- `get` takes the raw `company_id` as the 2nd IPC argument (not wrapped in an object).
- `save` takes a single `data` object; `company_id` is read off it. Missing
  `company_id` returns `{ success: false, error: 'Company ID is required' }`.
- The service returns its own result envelopes; it does not throw across IPC.
  On a caught exception it returns `{ success: false, error: <message> }`.
- Boolean settings (`showGSTAdvances`, `updateGSTStatus`, `gstReturnsConfigured`,
  `setStateWiseThresholdLimit`) are persisted as `0/1` INTEGER and converted to/from
  JS booleans by the service.
- `stateWiseLimits` is stored as JSON-encoded TEXT and parsed to an array on read.
- `effectiveDate` is a free-form display string (e.g. `"1-Apr-26"`), NOT an ISO date.

## Data shape (`data`)

See `CompanyGstDetailsData` / `CompanyGstDetailsSaveInput` in
`companyGstDetails.yaml`. Fields: `hsnSacType`, `hsnSacCode`, `description`,
`taxabilityType`, `gstRate`, `interstateThresholdLimit`, `intrastateThresholdLimit`,
`thresholdLimitIncludes`, `createHSNSummaryFor`, `minimumHSNLength`,
`showGSTAdvances`, `updateGSTStatus`, `gstReturnsConfigured`, `effectiveDate`,
`downloadGSTRegistration`, `downloadReturnType`, `setStateWiseThresholdLimit`,
`stateWiseLimits`, `gstAdvancesApplicableFrom`.
