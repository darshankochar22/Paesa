-- ============================================================================
-- Module: companyGstDetails
-- Postgres DDL translated from SQLite source: server/companyGstDetails/companyGstDetails.js
-- Table: company_gst_details (one row per company; PK == company_id)
-- ============================================================================
--
-- Notes on translation:
--  * In SQLite, company_id is "INTEGER PRIMARY KEY REFERENCES companies(company_id)".
--    It is NOT an autoincrement surrogate key here -- it is both the PK AND a FK to
--    companies. We preserve that: company_id is a plain BIGINT PK, no IDENTITY.
--  * Money / threshold columns are NEVER mapped to floating point. interstate/intrastate
--    threshold limits are currency -> NUMERIC(18,2). gst_rate is a rate -> NUMERIC(18,4).
--  * 0/1 INTEGER flags become BOOLEAN (0 -> false, 1 -> true).
--  * effective_date is a free-form display string ("1-Apr-26") in the source, NOT an
--    ISO date, so it stays TEXT (do NOT map to DATE).
--  * created_at / updated_at hold ISO datetime strings (datetime('now')) -> TIMESTAMPTZ
--    with default now().
--  * state_wise_limits holds a JSON string -> JSONB.
-- ============================================================================

CREATE TABLE company_gst_details (
    company_id                      BIGINT          NOT NULL,            -- PK and FK to companies(company_id); see ALTER below
    hsn_sac_type                    TEXT            DEFAULT 'Not Defined',
    hsn_sac_code                    TEXT,
    description                     TEXT,
    taxability_type                 TEXT            DEFAULT 'Not Defined',
    gst_rate                        NUMERIC(18,4)   DEFAULT 0,           -- rate; never floating point
    interstate_threshold_limit      NUMERIC(18,2)   DEFAULT 50000,       -- MONEY: currency amount, never floating point
    intrastate_threshold_limit      NUMERIC(18,2)   DEFAULT 50000,       -- MONEY: currency amount, never floating point
    threshold_limit_includes        TEXT            DEFAULT 'Value of Invoice',
    create_hsn_summary_for          TEXT            DEFAULT 'All Sections',
    minimum_hsn_length              INTEGER         DEFAULT 4,
    show_gst_advances               BOOLEAN         DEFAULT false,       -- SQLite INTEGER 0/1 -> BOOLEAN
    update_gst_status               BOOLEAN         DEFAULT false,       -- SQLite INTEGER 0/1 -> BOOLEAN
    gst_returns_configured          BOOLEAN         DEFAULT false,       -- SQLite INTEGER 0/1 -> BOOLEAN
    effective_date                  TEXT            DEFAULT '1-Apr-26',  -- free-form display string, NOT an ISO date
    download_gst_registration       TEXT,
    download_return_type            TEXT            DEFAULT 'All Returns',
    set_state_wise_threshold_limit  BOOLEAN         DEFAULT false,       -- SQLite INTEGER 0/1 -> BOOLEAN
    state_wise_limits               JSONB,                               -- SQLite TEXT holding JSON -> JSONB
    gst_advances_applicable_from    TEXT,
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(), -- app stores ISO strings; datetime('now')
    updated_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(), -- app stores ISO strings; datetime('now')
    CONSTRAINT company_gst_details_pkey PRIMARY KEY (company_id)
);

-- ============================================================================
-- Foreign keys (grouped at bottom for cross-module ordering safety)
-- ============================================================================
-- EXPLICIT in SQLite source: company_id REFERENCES companies(company_id) ON DELETE CASCADE.
ALTER TABLE company_gst_details
    ADD CONSTRAINT fk_company_gst_details_company
    FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE;

-- No additional index needed on company_id: it is the PRIMARY KEY (already indexed).
