import { useEffect, useRef, useState } from 'react';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

// TallyPrime-style calculator panel. Ctrl+N toggles it anywhere in the app
// (global, capture-phase so no focused field swallows the key); Esc closes it.
// Strict black/white/gray, monospace — matches the app theme.

interface HistoryRow {
  expr: string;
  result: string;
}

/** Safe arithmetic evaluator (+ - * / %, parentheses, decimals) — no eval. */
function evaluate(input: string): number {
  let pos = 0;
  const s = input.replace(/\s+/g, '');

  function peek() {
    return s[pos];
  }
  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = s[pos++];
      const rhs = parseTerm();
      v = op === '+' ? v + rhs : v - rhs;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = s[pos++];
      const rhs = parseFactor();
      if (op === '*') v *= rhs;
      else if (op === '/') v /= rhs;
      else v %= rhs;
    }
    return v;
  }
  function parseFactor(): number {
    if (peek() === '+') {
      pos++;
      return parseFactor();
    }
    if (peek() === '-') {
      pos++;
      return -parseFactor();
    }
    if (peek() === '(') {
      pos++;
      const v = parseExpr();
      if (peek() !== ')') throw new Error('Expected )');
      pos++;
      return v;
    }
    const start = pos;
    while (pos < s.length && /[0-9.]/.test(s[pos])) pos++;
    if (pos === start) throw new Error('Unexpected: ' + (peek() ?? 'end'));
    const num = Number(s.slice(start, pos));
    if (Number.isNaN(num)) throw new Error('Bad number');
    return num;
  }

  const result = parseExpr();
  if (pos !== s.length) throw new Error('Unexpected: ' + peek());
  return result;
}

export default function CalculatorPanel() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+N toggles the calculator from anywhere (matches TallyPrime).
  useShortcuts(
    [
      {
        keys: 'Ctrl+N',
        handler: () => setOpen((o) => !o),
        capture: true,
        allowInInputs: true,
        allowInDialogs: true,
      },
    ],
    {
      priority: PRIORITY.GLOBAL,
    },
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const runCalc = () => {
    const trimmed = expr.trim();
    if (!trimmed) return;
    let result: string;
    try {
      const value = evaluate(trimmed);
      result = Number.isFinite(value) ? String(value) : 'Error';
    } catch {
      result = 'Error';
    }
    setHistory((h) => [...h, { expr: trimmed, result }]);
    setExpr('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCalc();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Calculator"
      className="fixed bottom-0 right-0 z-50 w-80 max-w-full border-l border-t border-black bg-white font-mono flex flex-col shadow-lg"
    >
      <div className="flex items-center justify-between bg-black text-white px-3 py-1.5 text-xs font-semibold select-none">
        <span>Calculator</span>
        <button
          onClick={() => setOpen(false)}
          className="text-white hover:text-zinc-300 font-bold leading-none"
          aria-label="Close calculator"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 max-h-56 overflow-y-auto px-3 py-2 text-xs text-zinc-800 flex flex-col gap-1">
        {history.length === 0 ? (
          <div className="text-zinc-400">
            Type an expression and press Enter (e.g. 1200*18/100).
          </div>
        ) : (
          history.map((row, i) => (
            <div key={i} className="flex justify-between gap-3 border-b border-zinc-100 pb-0.5">
              <span className="text-zinc-500 truncate">{row.expr}</span>
              <span className="font-bold text-zinc-900 shrink-0">= {row.result}</span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-zinc-200 px-3 py-2 flex items-center gap-2">
        <span className="text-zinc-400 text-sm select-none">&gt;</span>
        <input
          ref={inputRef}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="0"
          inputMode="decimal"
          className="flex-1 bg-transparent outline-none text-sm text-zinc-900 placeholder:text-zinc-300"
        />
      </div>
    </div>
  );
}
