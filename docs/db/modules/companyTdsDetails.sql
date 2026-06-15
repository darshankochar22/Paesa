-- =====================================================================
-- Module: companyTdsDetails
-- Source: server/companyTdsDetails/companyTdsDetails.js
-- Target: PostgreSQL
-- Stores TDS (Tax Deducted at Source) deductor configuration.
-- 1:1 with companies: company_id is both PK and FK -> at most one row/company.
-- =====================================================================

CREATE TABLE IF NOT EXISTS company_tds_details (
    -- PK is ALSO the FK to companies(company_id). It is NOT an identity/auto
    -- column here: it is supplied by the caller and shared with companies.
    company_id                      BIGINT NOT NULL,

    tan_reg_number                  TEXT,
    tan                             TEXT,
    deductor_type                   TEXT NOT NULL DEFAULT 'Company',  -- SQLite DEFAULT 'Company'
    deductor_branch                 TEXT,

    -- INTEGER 0/1 boolean flags in SQLite -> BOOLEAN in Postgres.
    -- Storage/service converts: stored 0 => false, 1 => true.
    set_alter_person_responsible    BOOLEAN NOT NULL DEFAULT FALSE,   -- SQLite INTEGER DEFAULT 0

    person_responsible_name         TEXT,
    person_responsible_designation  TEXT,
    person_responsible_pan          TEXT,
    person_responsible_phone        TEXT,
    person_responsible_email        TEXT,

    ignore_it_exemption             BOOLEAN NOT NULL DEFAULT TRUE,    -- SQLite INTEGER DEFAULT 1 (0=>false,1=>true)
    activate_tds_for_items          BOOLEAN NOT NULL DEFAULT FALSE,   -- SQLite INTEGER DEFAULT 0

    -- App stores ISO-8601 datetime strings via datetime('now') -> TIMESTAMPTZ.
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),  -- SQLite DEFAULT (datetime('now'))
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),  -- SQLite DEFAULT (datetime('now'))

    CONSTRAINT pk_company_tds_details PRIMARY KEY (company_id)
);

-- No money/quantity columns in this module (no amount/rate/qty/balance fields).

-- ---------------------------------------------------------------------
-- Foreign keys (grouped at bottom for cross-module load ordering safety)
-- ---------------------------------------------------------------------

-- EXPLICIT FK in source:
--   companyTdsDetails.js declares
--   "company_id INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE".
ALTER TABLE company_tds_details
    ADD CONSTRAINT fk_company_tds_details_company
    FOREIGN KEY (company_id)
    REFERENCES companies (company_id)
    ON DELETE CASCADE;

-- The PK already indexes company_id, so no additional FK index is required.
