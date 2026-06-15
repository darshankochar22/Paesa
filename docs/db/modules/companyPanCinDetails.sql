-- ============================================================================
-- Module: companyPanCinDetails
-- Postgres schema contract translated from SQLite source
--   server/companyPanCinDetails/companyPanCinDetails.js
--
-- Stores one PAN/CIN record per company (one-to-one with companies).
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_pan_cin_details (
    -- SQLite: company_id INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE
    -- This is the PRIMARY KEY (not an autoincrement surrogate) and is also the FK to
    -- companies. It is NOT generated as identity because callers supply it explicitly.
    company_id   BIGINT      NOT NULL,

    pan          TEXT,                                         -- SQLite TEXT, nullable
    cin          TEXT,                                         -- SQLite TEXT, nullable

    -- SQLite: TEXT DEFAULT (datetime('now')) — app stores ISO datetime strings.
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_company_pan_cin_details PRIMARY KEY (company_id)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- company_id is already the PK (and the FK target column), so it is indexed by
-- the primary key constraint; no extra FK index is required.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Foreign keys (grouped at bottom for cross-module load ordering)
-- ----------------------------------------------------------------------------

-- EXPLICIT in SQLite source:
--   company_id INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE
ALTER TABLE company_pan_cin_details
    ADD CONSTRAINT fk_company_pan_cin_details_company
    FOREIGN KEY (company_id)
    REFERENCES companies (company_id)
    ON DELETE CASCADE;
