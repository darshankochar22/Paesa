// Bug 5: which GST registration prefills a NEW voucher.
//
// The ONLY source is the company's persisted "current default GST registration id".
// There is deliberately NO "first record in the table" (or any other) fallback — if the
// persisted id is null, the voucher shows no registration until the user picks one, which
// then persists. This makes the choice deterministic and sticky.
export function pickDefaultRegistrationFrom(
  defaultId: number | null | undefined,
  registrations: any[],
): any | null {
  if (defaultId == null) return null;
  return (registrations || []).find((r) => Number(r.gst_id) === Number(defaultId)) || null;
}
