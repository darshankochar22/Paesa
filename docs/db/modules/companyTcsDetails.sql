-- ============================================================================
-- Module: companyTcsDetails
-- Source: server/companyTcsDetails/companyTcsDetails.js (SQLite init)
-- Target: PostgreSQL
--
-- Stores one TCS (Tax Collected at Source) profile per company.
-- company_id is BOTH the primary key AND a foreign key to companies(company_id):
-- this is a 1:1 extension table, not an auto-incrementing entity. The PK is the
-- shared company key, so it is NOT a GENERATED IDENTITY column.
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_tcs_details (
    -- PK == FK to companies. Not auto-generated; supplied = the owning company's id.
    company_id                          BIGINT NOT NULL,

    tan_reg_number                      TEXT,
    tan                                 TEXT,
    collector_type                      TEXT DEFAULT 'Company',
    collector_branch                    TEXT,

    -- INTEGER 0/1 boolean in SQLite -> BOOLEAN. App converts 0->false, 1->true.
    -- SQLite DEFAULT 0 -> false.
    set_alter_person_responsible        BOOLEAN NOT NULL DEFAULT false,

    person_responsible_name             TEXT,
    person_responsible_son_daughter_of  TEXT,
    person_responsible_designation      TEXT,
    person_responsible_pan              TEXT,
    person_responsible_flat_no          TEXT,
    person_responsible_premises         TEXT,
    person_responsible_road             TEXT,
    person_responsible_area             TEXT,
    person_responsible_city             TEXT,
    person_responsible_state            TEXT,
    person_responsible_pincode          TEXT,
    person_responsible_phone            TEXT,
    person_responsible_std_code         TEXT,
    person_responsible_telephone        TEXT,
    person_responsible_email            TEXT,

    -- INTEGER 0/1 boolean in SQLite -> BOOLEAN. SQLite DEFAULT 1 -> true.
    ignore_it_exemption                 BOOLEAN NOT NULL DEFAULT true,

    -- SQLite TEXT DEFAULT (datetime('now')) storing ISO-8601 strings -> TIMESTAMPTZ.
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_company_tcs_details PRIMARY KEY (company_id)
);

-- No money / quantity / rate columns exist in this table.

-- ============================================================================
-- Foreign keys (grouped at the bottom for cross-module load ordering).
-- ============================================================================

-- EXPLICIT in source: companyTcsDetails.js declares
--   company_id INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE
ALTER TABLE company_tcs_details
    ADD CONSTRAINT fk_company_tcs_details_company
    FOREIGN KEY (company_id) REFERENCES companies (company_id)
    ON DELETE CASCADE;

-- PK already provides the unique index on company_id; no extra FK index needed.
