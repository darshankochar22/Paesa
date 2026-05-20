import type { VoucherRecordType } from './Voucher';

export interface DaybookEntryType extends VoucherRecordType {
  particulars?: string;
  debit?: number;
  credit?: number;
}
