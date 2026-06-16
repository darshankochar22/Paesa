// Tamper-evident edit log (MCA Rule 11(g)). Each business write appends one row
// whose row_hash is chained to the previous row's row_hash per company_id; any
// later mutation of a logged row breaks verifyChain().

export interface AuditTrailEntry {
  log_id: number;
  company_id: number;
  entity_type: string;
  entity_id: number | null;
  action: string;
  user: string | null;
  before_snapshot: string | null;
  after_snapshot: string | null;
  prev_hash: string | null;
  row_hash: string | null;
  created_at: string;
}

export interface VerifyChainResult {
  intact: boolean;
  brokenAt?: number;
}

export interface AuditTrailAPI {
  auditTrail: {
    getAll: (company_id: number, limit?: number) => Promise<AuditTrailEntry[]>;
    getByEntity: (
      company_id: number,
      entity_type: string,
      entity_id: number,
    ) => Promise<AuditTrailEntry[]>;
    verifyChain: (company_id: number) => Promise<VerifyChainResult>;
  };
}
