import { useRef, useState, type KeyboardEvent } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

// "Description(s) for Item" — Tally-style multi-line description entry. Each
// description is its own line, listed one under another. Enter on a filled line
// commits it and drops to the next line (appending a fresh blank line when at
// the end); Enter on an empty line accepts the whole list (End of List). The
// lines are stored back as a single newline-joined string on descriptionRaw.
export default function ItemDescriptionPopup({
  itemName,
  initial,
  onClose,
  onSave,
}: {
  itemName: string;
  initial: string | undefined;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [lines, setLines] = useState<string[]>(() => {
    const existing = (initial ?? '')
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    // Always keep a trailing blank line to type the next description into.
    return [...existing, ''];
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const commit = () => {
    onSave(
      lines
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n'),
    );
    onClose();
  };

  const focusLine = (idx: number) => {
    setTimeout(() => {
      (
        containerRef.current?.querySelector(`[data-desc-line="${idx}"]`) as HTMLInputElement | null
      )?.focus();
    }, 20);
  };

  const setLine = (idx: number, v: string) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? v : l)));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      // Own Enter fully (preventDefault) so the shell's field-nav stays out of it.
      e.preventDefault();
      // Enter on an empty line = End of List → accept the whole list.
      if (!lines[idx].trim()) {
        commit();
        return;
      }
      // Filled line: append a fresh blank line when at the end, then step down.
      if (idx === lines.length - 1) setLines((prev) => [...prev, '']);
      focusLine(idx + 1);
    } else if (e.key === 'Backspace' && lines[idx] === '' && lines.length > 1) {
      // Backspace on an empty (non-only) line removes it and moves up.
      e.preventDefault();
      setLines((prev) => prev.filter((_, i) => i !== idx));
      focusLine(Math.max(0, idx - 1));
    }
  };

  return (
    <VoucherPopupShell
      title="Description(s) for Item"
      headerRight={<span className="font-semibold text-black">{itemName}</span>}
      size="tally"
      onClose={onClose}
      onAccept={commit}
      hint="Enter: next line  ·  Enter on empty line: Accept  ·  Esc: Close"
    >
      <div ref={containerRef} className="flex flex-col">
        <div className="text-xs font-semibold text-black border-b border-gray-300 pb-1 mb-2">
          Description(s)
        </div>
        {lines.map((line, idx) => (
          <input
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            data-desc-line={idx}
            type="text"
            value={line}
            autoFocus={idx === lines.length - 1}
            onChange={(e) => setLine(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder={idx === 0 ? 'Type a description…' : ''}
            className="w-full text-sm bg-white px-1 py-1 outline-none border-b border-transparent focus:border-black"
            autoComplete="off"
          />
        ))}
      </div>
    </VoucherPopupShell>
  );
}
