import { type Voucher, ReadOnlyAttendanceTable } from "./shared";

// Attendance voucher — employee attendance/production values.
export default function AttendanceVoucherView({ voucher }: { voucher: Voucher; balances: Record<number, string> }) {
  return (
    <>
      {voucher.attendance_entries && voucher.attendance_entries.length > 0 && (
        <ReadOnlyAttendanceTable entries={voucher.attendance_entries} />
      )}
    </>
  );
}
