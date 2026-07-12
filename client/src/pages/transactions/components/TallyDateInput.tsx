// A Tally-style typed date field. Unlike a native <input type="date"> (which
// forces the mm/dd/yyyy segmented widget and can't be typed freely), this is a
// plain text box: the user types day-first — "01-4-2026", "1/4/26", "1-Apr-26"
// — and it commits an ISO date (YYYY-MM-DD) on Enter/blur, displaying it as
// Tally's "1-Apr-26" when not being edited.
import { useEffect, useRef, useState } from 'react';
import { parseTallyDate, formatTallyDate } from '@/lib/dueDate';

interface Props {
  value: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  /** Reference date (ISO) used to fill in month/year for bare-day entry. */
  refIso?: string | null;
  dataFieldType?: string;
  className?: string;
  /** Called on Enter after a successful commit — use to advance focus. */
  onEnter?: () => void;
}

export default function TallyDateInput({
  value,
  onChange,
  refIso,
  dataFieldType,
  className,
  onEnter,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  // While editing, show the raw text; otherwise show the Tally-formatted date.
  const display = editing ? text : formatTallyDate(value);

  // When focus arrives (e.g. via Enter from the previous field), select all so
  // the user can immediately type over the shown date.
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = (): boolean => {
    const iso = parseTallyDate(text, refIso ?? value);
    if (iso) {
      onChange(iso);
      return true;
    }
    return false;
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder="DD-MM-YYYY"
      data-field-type={dataFieldType}
      className={className}
      value={display}
      onFocus={() => {
        setText(formatTallyDate(value));
        setEditing(true);
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        commit();
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        commit();
        setEditing(false);
        onEnter?.();
      }}
    />
  );
}
