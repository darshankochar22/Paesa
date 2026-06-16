# payHead Module — IPC API Reference

Backend module: **payHead** (`server/payHead/`)
IPC namespace: **`payHead`** (matches the module name — no aliasing).
Renderer binding root: **`window.api.payHead`** (from `preload.js`).
Controller: **`payHeadController`** (registered in `server/index.js` lines 276–286).

All channels are clean — **no typos** were found in the channel names.

## Behavioral notes

- Every handler receives `(event, arg)`. The `event` is dropped by the controller;
  `arg` is forwarded to the service. Methods marked *(scalar)* take a bare value
  (id / company_id / pay_head_id), not an object.
- The service never throws across IPC. Results are in-band envelopes:
  `{ success: true, ... }` or `{ success: false, error }`.
- `create` rejects a duplicate **active** name (case-insensitive) within the same company.
- `update` and `delete` refuse to act on **predefined** pay heads (`is_predefined = 1`).
- `delete` is a **soft delete** (`is_active = 0`). Slab and formula deletes are **hard deletes**.
- `payHeadService.seedDefaultPayHeads(company_id)` exists but is **not exposed** over IPC
  (called internally during company setup). It seeds 8 predefined pay heads.

## Channels

| Channel | window.api binding | Params (arg 2) | Returns | Summary |
|---|---|---|---|---|
| `payHead:create` | `window.api.payHead.create(data)` | `PayHeadCreateInput` object (`company_id`, `name` required) | `{ success, payHead }` or `{ success:false, error }` | Create a pay head; rejects duplicate active name. |
| `payHead:getAll` | `window.api.payHead.getAll(company_id)` | `company_id` *(scalar)* | `{ success, payHeads: PayHead[] }` | List active pay heads for a company. |
| `payHead:getById` | `window.api.payHead.getById(id)` | `id` *(scalar, pay_head_id)* | `{ success, payHead }` or not-found failure | Fetch one pay head by id. |
| `payHead:update` | `window.api.payHead.update(data)` | `PayHeadUpdateInput` object (`pay_head_id` required) | `{ success, payHead }` or failure | Update a pay head; blocked for predefined. |
| `payHead:delete` | `window.api.payHead.delete(id)` | `id` *(scalar, pay_head_id)* | `{ success }` or failure | Soft-delete (is_active=0); blocked for predefined. |
| `payHead:getSlabs` | `window.api.payHead.getSlabs(pay_head_id)` | `pay_head_id` *(scalar)* | `{ success, slabs: PayHeadSlabLine[] }` | List slab lines, ordered by effective_from. |
| `payHead:createSlab` | `window.api.payHead.createSlab(data)` | `SlabCreateInput` object (`pay_head_id` required) | `{ success, slab }` | Create a slab line. |
| `payHead:deleteSlab` | `window.api.payHead.deleteSlab(id)` | `id` *(scalar, slab_line_id)* | `{ success }` | Hard-delete a slab line. |
| `payHead:getFormulas` | `window.api.payHead.getFormulas(pay_head_id)` | `pay_head_id` *(scalar)* | `{ success, formulas: PayHeadFormulaLine[] }` | List formula lines (joined w/ referenced name), ordered by sequence. |
| `payHead:createFormula` | `window.api.payHead.createFormula(data)` | `FormulaCreateInput` object (`pay_head_id` required) | `{ success, formula }` | Create a formula line. |
| `payHead:deleteFormula` | `window.api.payHead.deleteFormula(id)` | `id` *(scalar, formula_line_id)* | `{ success }` | Hard-delete a formula line. |

## Response component schemas

See `payHead.yaml` for full JSON Schemas. Row types:

- **PayHead** — `pay_heads` row.
- **PayHeadSlabLine** — `pay_head_slab_lines` row.
- **PayHeadFormulaLine** — `pay_head_formula_lines` row. Note: `getFormulas` adds a
  non-stored `pay_head_name` column via `LEFT JOIN pay_heads ON pay_head_id_ref`.

## Source references

- Schema init: `server/payHead/payHead.js`
- Logic/SQL: `server/payHead/payHeadService.js`
- IPC handlers: `server/payHead/payHeadController.js`
- Channel registration: `server/index.js` (lines 276–286)
- Renderer binding: `preload.js` (lines 226–237)
