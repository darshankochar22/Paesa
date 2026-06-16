# Master Module — API Reference

Backend module: `server/master/`

- `masterController.js` — IPC handler(s)
- `masterService.js` — business logic (builds the dynamic Masters menu)
- There is **no** `master.js` schema file — this module owns **no database tables**.

The module exposes one read-only operation. The single IPC channel is registered
in `server/index.js`:

```js
ipcMain.handle('master:getMenu', masterController.getMenu);
```

> Transport note: these are Electron IPC channels, not HTTP endpoints. The
> renderer calls them through the preload `contextBridge` binding
> (`window.api.master.*`).

## Channels

| Channel | window.api binding | Params | Returns | Summary |
|---|---|---|---|---|
| `master:getMenu` | `window.api.master.getMenu(company_id)` | `company_id` (bare integer; defaults to `1` in the service if omitted) | `{ success: true, menu: MenuSection[] }` on success, or `{ success: false, error: string }` on a caught error | Builds the dynamic "Masters" navigation menu for a company, with sections toggled by the company's Tally feature flags. |

### `MenuSection` shape

```ts
{ title: string, items: string[] }
```

### Behavior details (`masterService.getMenu`)

The service reads the company's Tally feature flags via
`tallyFeaturesService.get(company_id)` and assembles a grouped menu:

- **Accounting Masters** — always present: `Group`, `Ledger`, `Cost Centre`,
  `Currency`, `Voucher Type`. If `enable_cost_centres` is truthy, `Cost Centre`
  is appended **again** (note: this duplicates the item in the array).
- **Payment Request** — only when `enable_payment_request_qr` is truthy:
  `Merchant Profile`.
- **Inventory Masters** — only when `maintain_inventory !== 0`: `Stock Group`,
  `Stock Category`, `Stock Items`, `Unit`, `Location`, `Price levels`,
  `Price list (Stock Group)`, `Price list (Stock Category)`.
- **Statutory Masters** — always present.
- **Statutory Details** — always present.
- **Payroll Masters** — always present.

If `tallyFeaturesService.get` returns an unsuccessful result, `features`
defaults to `{}`, so all feature-gated sections are omitted (and `maintain_inventory !== 0`
evaluates true for `undefined`, so Inventory Masters **is** included by default).

## Cross-module dependency

This module depends on the `tallyFeatures` module
(`require('../tallyFeatures/tallyFeaturesService')`). The feature flags read
here (`enable_cost_centres`, `enable_payment_request_qr`, `maintain_inventory`)
live in the `tallyFeatures` module's table(s), documented under that module.

## Warnings / Notes

- The `company_id` argument is a **bare scalar**, not a destructured object.
  The controller passes the raw second IPC argument straight to the service.
- Known data quirk: `Cost Centre` can appear twice in **Accounting Masters**
  when `enable_cost_centres` is enabled (it is hardcoded in the base list AND
  conditionally appended).
- No typo was found in this module's channel name (`master:getMenu`). (Typos do
  exist elsewhere in `index.js`, e.g. `costCetre:getTree`, but they belong to
  other modules and are out of scope here.)
