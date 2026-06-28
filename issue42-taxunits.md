# Issue #42 — Tax Units (Statutory Masters)

Full analysis of all 14 issue screenshots, then the differences vs the current
code so they can be fixed one by one.

Entry: Gateway → Create → Statutory Masters → **Tax Units**.

---

## Screen-by-screen (all 14 screenshots)

### img_0 — Tax Unit Creation (main form)
Fields, top to bottom:
| Field | Value in shot | Control |
|-------|---------------|---------|
| Name | IT Creation | text |
| (alias) | ITC | text |
| Address | IT Creations Tech Park Road Durg | text — **single line** |
| State | Chhattisgarh | dropdown (List of States) |
| Pincode | 491001 | text |
| Telephone | 7881233567 | text |
| **Registered for** | **Excise** | **selectable field — NOT a static label** |
| Set/alter excise details | Yes | Yes/No → opens Excise Details popup |

### img_1 — Excise Details popup *(Manufacturer Unit)*
| Field | Control |
|-------|---------|
| Unit name | read-only (= tax unit name) |
| Registration type | dropdown: **Dealer / Importer / Manufacturer** |
| Type of manufacturer | shown ONLY for Manufacturer |
| ECC number | text |
| Set/alter excise tariff details | Yes/No |
| Set/alter Rule 11 book details | Yes/No |

### img_2 — Excise Details popup *(Dealer Unit)*
Same as img_1 but **no "Type of manufacturer"** row (Dealer/Importer hide it).
Order: Unit name, Registration type, ECC number, Set/alter excise tariff details,
Set/alter Rule 11 book details.

### img_13 — Type of manufacturer dropdown
"Types of Manufacturer" list = **Regular**, **Small Scale Industries(SSI)**. (Only these two.)

### img_3 — Excise Tariff Details popup
Opened by Set/alter excise tariff details = Yes.
| Field | Value |
|-------|-------|
| Tariff name | Computer Accessories |
| HSN code | 8471 |
| Reporting unit of measure | TU |
| Valuation type | Ad Valorem |
| Rate | 0 % |

### img_4 — Reporting unit of measure dropdown
"List of Excise Reporting UoMs": Undefined, 10GMS=10 Grams, 1KKWH=1000 Kilowatt
Hours, C/K=Carats, CM=Centimetre, CM3=Cubic Centimetre, G=Grams, G:F/S=Gram of
Fissile Isotopes, KG=Kilograms, KL=Kilolitre, L=Litre, M=Metre, M2=Square Metre,
M3=Cubic Metre, MM=Millimetre, MT=Metric Tonne, PA=Number of Pairs, Q=Quintal,
T=Ton, TU=Thousand in Nos, U=Numbers.

### img_5 — Valuation type dropdown
"List of Valuation Types": **Undefined, Ad Valorem, Ad Quantum, Valorem + Quantum**.

### img_8 — Valuation type = Ad Valorem → shows **Rate (%)** only.
### img_7 — Valuation type = Ad Quantum → shows **Rate per Unit** only.
### img_6 — Valuation type = Undefined → shows **Rate (%) + Rate per Unit**.
### img_9 — Valuation type = Valorem + Quantum → shows **Rate (%) + Rate per Unit**.

### img_10 — Excise Details *(Dealer)* with Set/alter Rule 11 book details = Yes (highlighted).
### img_11 — Excise Book selection popup
Title "Excise Book", a numbered list of books (1., 2., …) to pick from / create.

### img_12 — Book Creation (Excise Book = issue #141)
Name, (alias), Method of numbering = Automatic (Manual Override), Prevent
duplicates, Starting number, Width of numerical part, Prefill with zero, Used for
= Rule -11 Invoice, plus Restart Numbering / Prefix Details / Suffix Details tables.

---

## Differences — screenshots vs current implementation

| # | Screenshot says | Current code | Status |
|---|-----------------|--------------|--------|
| 1 | **Registered for** is a real selectable field (value "Excise") | ~~hardcoded `<span>Excise</span>`~~ → now a `<select>` bound to `registeredFor` state, in FIELDS keyboard-nav, sent in payload (`registered_for`) | ✅ **FIXED** |
| 2 | Address single line on its label row | single line ✓ | ✅ |
| 3 | No yellow highlight (our theme) | gray focus border ✓ | ✅ |
| 4 | Type of manufacturer = Regular / SSI (2 options) | Regular / SSI ✓ | ✅ |
| 5 | Manufacturer-only "Type of manufacturer" | conditional ✓ | ✅ |
| 6 | Excise Tariff Details popup (Tariff name/HSN/UoM/Valuation/Rate) | implemented ✓ | ✅ |
| 7 | Rate fields conditional on valuation type | implemented ✓ | ✅ |
| 8 | Reporting UoM full list | implemented ✓ | ✅ |
| 9 | Rule 11 → Excise Book selection | implemented ✓ | ✅ |
| 10 | Excise Details title shows "(<Reg type> Unit)" | implemented ✓ | ✅ |

### Action items — all done
1. ✅ "Registered for" is now a real `<select>` field bound to state + payload
   (only documented option is "Excise"; add more when other tax-unit registration
   types are supported).
2. ✅ **taxAlter at parity** — shared Excise Details flow extracted to
   `exciseDetailsPopups.tsx` and used by BOTH create & alter; alter now loads/edits
   Type of manufacturer, full tariff details and Rule 11 Excise Book, and its
   "Registered for" is a field too.
3. ✅ Dead `ExciseTariffDetails.tsx` (old GST-fields version) deleted.

Shared component: `exciseDetailsPopups.tsx` exports `ExciseDetailsPopup`, `Tariff`,
`EMPTY_TARIFF` — single source for the nested Excise Details → Tariff / Excise Book
popups, consumed by `taxCreate.tsx` and `taxAlter.tsx` (no duplicated JSX).
