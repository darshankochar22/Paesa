# Startup ERP — IPC Backend API

This directory documents the **backend IPC surface** of the Startup ERP desktop
application (Electron + SQLite). It is a single bundled contract plus per-module
fragments and human-readable notes.

| File | Purpose |
| --- | --- |
| [`openapi.yaml`](./openapi.yaml) | The bundled, self-contained **OpenAPI 3.1** document. Render this. |
| [`modules/<module>.yaml`](./modules/) | Per-module OpenAPI fragments (one per backend module). Source of truth. |
| [`modules/<module>.md`](./modules/) | Per-module human-readable notes for each module. |

> **Important:** the transport here is **Electron IPC, not HTTP.** No HTTP server
> exists. The `openapi.yaml` models each IPC channel as an HTTP `POST`/`GET` path
> *purely as a documentation convention* so the contract renders in OpenAPI tooling
> (Swagger UI / Redoc / Scalar) and can later seed a **Hono REST migration**.

---

## How IPC works in this app

Every backend operation is a **3-point contract** between the renderer and the
main process. All three points must agree on the channel string.

```
 ┌────────────────────────┐   invoke("ledger:create", payload)   ┌────────────────────────┐
 │  Renderer (React)      │ ───────────────────────────────────▶ │  preload.js            │
 │  await window.api      │                                       │  contextBridge bridge  │
 │       .ledger.create() │ ◀─────────────────────────────────── │  ipcRenderer.invoke()  │
 └────────────────────────┘            resolved value             └───────────┬────────────┘
                                                                              │ IPC
                                                                  ┌───────────▼────────────┐
                                                                  │  Main process          │
                                                                  │  ipcMain.handle(       │
                                                                  │    "ledger:create",    │
                                                                  │    ledgerController…)  │
                                                                  └────────────────────────┘
```

1. **`preload.js`** — `contextBridge.exposeInMainWorld('api', { ... })` exposes a
   namespaced, typed surface on `window.api`. Each method forwards to
   `ipcRenderer.invoke('<namespace>:<action>', payload)`:

   ```js
   contextBridge.exposeInMainWorld('api', {
     ledger: {
       create:  (data) => invoke('ledger:create', data),
       getAll:  (company_id) => invoke('ledger:getAll', company_id),
       getById: (id) => invoke('ledger:getById', id),
       update:  (data) => invoke('ledger:update', data),
       delete:  (id) => invoke('ledger:delete', id),
     },
   });
   ```

2. **`ipcMain.handle`** — the main process registers a handler for that exact
   channel. The handler runs in Node (with SQLite access) and returns a resolved
   value, or throws:

   ```js
   ipcMain.handle('ledger:create', (event, data) => ledgerController.create(data));
   ```

3. **`window.api`** — the renderer awaits the call. The resolved value is the
   controller's return shape, documented under each operation's `200` response in
   `openapi.yaml`:

   ```js
   const result = await window.api.ledger.create({ name: 'Sales', /* … */ });
   // result === { success: true, data: { ledger_id: 42, … } }   (or { success:false, error })
   ```

Each operation in `openapi.yaml` carries machine-readable extensions describing
this wiring:

| Extension | Meaning | Example |
| --- | --- | --- |
| `x-ipc-channel` | Literal IPC channel string | `"ledger:create"` |
| `x-window-api` | Renderer-side preload binding | `window.api.ledger.create` |
| `x-controller` | Main-process controller method | `ledgerController.create` |

The bundled `info.x-ipc` block in `openapi.yaml` documents this same 3-point
contract for tooling that reads the spec.

---

## The `namespace:action` channel convention

Channels follow a strict **`namespace:action`** naming convention:

- **`namespace`** — the module (matches an OpenAPI `tag` and a `window.api.<namespace>`
  group), e.g. `ledger`, `voucher`, `report`.
- **`action`** — the operation, e.g. `create`, `getAll`, `getById`, `update`,
  `delete`, or a domain verb like `report:getDayBook`, `voucher:next-number`.

Examples: `company:create`, `voucher:getById`, `report:getTrialBalance`,
`whatsapp:sendDocument`. The `:` separator is what `ipcMain.handle` matches on and
what `window.api.<namespace>.<action>` resolves to.

> A handful of namespaces are aliased in preload for ergonomics (e.g. the
> `financialYear` module is exposed as `window.api.fy.*` over `fy:*` channels).
> The `x-window-api` / `x-ipc-channel` extensions on each operation are
> authoritative when names differ.

### Error shape

Handlers generally return an envelope. Success is typically
`{ success: true, data: … }`; failure is `{ success: false, error: "<message>" }`.
A handler may also reject (throw), in which case the renderer's `await` rejects.
The shared [`Error`](./openapi.yaml) schema in `components.schemas` is the canonical
cross-module error envelope; individual modules also keep their own
`Error` / `ServiceError` shapes (namespaced — see below).

---

## Rendering `openapi.yaml`

Any OpenAPI 3.1 renderer works. The HTTP paths/methods are placeholders for
display; read them as channel names.

### Swagger UI (Docker, zero install)

```bash
docker run --rm -p 8080:8080 \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v "$(pwd)/docs/api:/spec" \
  swaggerapi/swagger-ui
# open http://localhost:8080
```

### Redoc

```bash
npx @redocly/cli preview-docs docs/api/openapi.yaml
# or build a static file:
npx @redocly/cli build-docs docs/api/openapi.yaml -o docs/api/openapi.html
```

### Scalar

```bash
npx @scalar/cli serve docs/api/openapi.yaml
```

Or drop the file into the hosted Scalar / Swagger Editor (https://editor.swagger.io)
and paste the YAML.

### Lint / validate

```bash
npx @redocly/cli lint docs/api/openapi.yaml
# or
npx @stoplight/spectral-cli lint docs/api/openapi.yaml
```

---

## How `openapi.yaml` is assembled (and how to regenerate)

`openapi.yaml` is **generated** by merging every fragment under
`docs/api/modules/*.yaml`. Do not hand-edit `openapi.yaml`; edit the relevant
fragment and re-merge. The merge:

- concatenates **all `paths`** from every fragment (every channel is its own
  operation; nothing is deduped) and preserves the
  `x-ipc-channel` / `x-window-api` / `x-controller` extensions;
- merges **all `components.schemas`** and **`components.responses`**, **namespacing
  every definition with its module** (`<module>_<Name>`) to avoid collisions, and
  rewriting all internal `$ref`s accordingly;
- adds one shared top-level **`Error`** schema and an **`info.x-ipc`** block
  documenting the 3-point contract.

### Regenerate

The merge is a plain text/YAML transform over the fragments. Conceptually:

1. Read each `docs/api/modules/<module>.yaml`.
2. Prefix its schema/response names with `<module>_` and rewrite its `$ref`s.
3. Append its `paths` and namespaced `components` into the bundle.
4. Prepend the shared header (`openapi`, `info` + `x-ipc`, `tags`) and the shared
   `Error` schema.

> Because the fragments are the source of truth, the safest workflow is:
> **edit a fragment → re-run the merge → re-lint `openapi.yaml`.** If you add a new
> module, also add it to the tag index below.

---

## Tag index (modules)

49 modules / tags, **252 operations** total. Each row links to that module's
human-readable notes.

| Tag (module) | Ops | Description |
| --- | --- | --- |
| [`attendance`](./modules/attendance.md) | 5 | Employee attendance records and lookups. |
| [`attendanceType`](./modules/attendanceType.md) | 5 | Attendance type masters (present, leave, holiday, etc.). |
| [`balanceSheetReport`](./modules/balanceSheetReport.md) | 4 | Balance Sheet financial report generation. |
| [`banking`](./modules/banking.md) | 5 | Bank reconciliation, bank statements, and balance summaries. |
| [`company`](./modules/company.md) | 6 | Company master: create, read, update company profiles. |
| [`companyCreationSuccess`](./modules/companyCreationSuccess.md) | 2 | Post company-creation success/bootstrap flow. |
| [`companyFeatureValues`](./modules/companyFeatureValues.md) | 4 | Company-scoped feature flag values. |
| [`companyGstDetails`](./modules/companyGstDetails.md) | 2 | Company GST registration details. |
| [`companyPanCinDetails`](./modules/companyPanCinDetails.md) | 2 | Company PAN/CIN statutory identifiers. |
| [`companyTcsDetails`](./modules/companyTcsDetails.md) | 2 | Company TCS (Tax Collected at Source) details. |
| [`companyTdsDetails`](./modules/companyTdsDetails.md) | 2 | Company TDS (Tax Deducted at Source) details. |
| [`costCentre`](./modules/costCentre.md) | 6 | Cost centre masters for cost allocation. |
| [`currency`](./modules/currency.md) | 6 | Currency masters and exchange configuration. |
| [`dayBookReport`](./modules/dayBookReport.md) | 4 | Day Book report (chronological voucher listing). |
| [`eInvoice`](./modules/eInvoice.md) | 9 | E-Invoice generation, IRN, and GSP integration. |
| [`employee`](./modules/employee.md) | 6 | Employee masters and payroll subject records. |
| [`employeeCategory`](./modules/employeeCategory.md) | 5 | Employee category masters. |
| [`employeeGroup`](./modules/employeeGroup.md) | 6 | Employee group masters. |
| [`featureGroup`](./modules/featureGroup.md) | 2 | Feature group definitions (feature catalog). |
| [`featureItem`](./modules/featureItem.md) | 3 | Feature item definitions (feature catalog). |
| [`financialYear`](./modules/financialYear.md) | 5 | Financial year configuration per company. |
| [`godown`](./modules/godown.md) | 6 | Godown / warehouse location masters. |
| [`group`](./modules/group.md) | 6 | Accounting group masters (chart-of-accounts groups). |
| [`gst`](./modules/gst.md) | 6 | GST configuration, rates, and computations. |
| [`gstClassification`](./modules/gstClassification.md) | 5 | GST classification masters (HSN/SAC mappings). |
| [`gstRegistration`](./modules/gstRegistration.md) | 5 | GST registration masters per company. |
| [`ledger`](./modules/ledger.md) | 6 | Ledger account masters. |
| [`master`](./modules/master.md) | 1 | Dynamic "Masters" navigation menu builder. |
| [`payHead`](./modules/payHead.md) | 11 | Payroll pay-head masters (earnings/deductions). |
| [`payrollUnit`](./modules/payrollUnit.md) | 5 | Payroll unit masters (time/work units). |
| [`physicalStock`](./modules/physicalStock.md) | 5 | Physical stock verification entries. |
| [`priceLevels`](./modules/priceLevels.md) | 3 | Price level masters. |
| [`priceList`](./modules/priceList.md) | 5 | Price list masters and entries. |
| [`profitLossReport`](./modules/profitLossReport.md) | 4 | Profit & Loss financial report generation. |
| [`report`](./modules/report.md) | 7 | Shared/generic reporting endpoints. |
| [`salaryStructure`](./modules/salaryStructure.md) | 7 | Salary structure definitions for employees. |
| [`stockCategory`](./modules/stockCategory.md) | 5 | Stock category masters. |
| [`stockGroup`](./modules/stockGroup.md) | 6 | Stock group masters. |
| [`stockItem`](./modules/stockItem.md) | 8 | Stock item (inventory) masters. |
| [`tallyFeatures`](./modules/tallyFeatures.md) | 3 | Tally feature flags (F11 features) per company. |
| [`taxUnits`](./modules/taxUnits.md) | 5 | Tax unit masters. |
| [`tcsNatureOfGoods`](./modules/tcsNatureOfGoods.md) | 5 | TCS nature-of-goods masters. |
| [`tdsNatureOfPayment`](./modules/tdsNatureOfPayment.md) | 5 | TDS nature-of-payment masters. |
| [`trialBalanceReport`](./modules/trialBalanceReport.md) | 4 | Trial Balance report generation. |
| [`unit`](./modules/unit.md) | 6 | Unit of measure masters. |
| [`voucher`](./modules/voucher.md) | 13 | Vouchers: sales, purchase, payment, receipt, journal, etc. |
| [`voucherEntryActions`](./modules/voucherEntryActions.md) | 4 | Voucher-entry helper actions and lookups. |
| [`voucherType`](./modules/voucherType.md) | 7 | Voucher type masters. |
| [`whatsapp`](./modules/whatsapp.md) | 8 | WhatsApp messaging integration (documents/notifications). |

---

## Notes on schema namespacing & collisions

To keep the bundle self-contained and collision-free, **every** module schema and
response is namespaced as `<module>_<Name>` in `openapi.yaml` (e.g.
`ledger_SuccessResult`, `gstRegistration_FailureResult`). This was required because
many common names are reused across modules — for example `Error` (49 modules),
`SuccessResult` (19), `FailureResult` (15), `ServiceError` (9), `CompanyIdInput` (9),
`SuccessOnly` (5), and several others. The single un-prefixed `Error` schema at the
top of `components.schemas` is the only shared, cross-module type.
