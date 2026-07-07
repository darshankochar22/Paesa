// Shared plain-text / fixed-width export helper. Mirrors exportCsv.ts but for
// SDF (fixed-width) text files — used by the PF E-Return screens, which in Tally
// export a .txt data file rather than a printed document.

/** Download a string as a text file (default .txt, plain-text MIME). */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.txt') ? filename : `${filename}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Pad/truncate a value to a fixed-width field (one column of an SDF record). */
export function fw(
  value: string | number | null | undefined,
  width: number,
  align: 'left' | 'right' = 'left',
): string {
  const s = String(value ?? '').slice(0, width);
  return align === 'right' ? s.padStart(width) : s.padEnd(width);
}

/** Join fixed-width fields into one SDF record line. `specs` = [value, width, align?]. */
export function fixedRow(
  specs: Array<[string | number | null | undefined, number, ('left' | 'right')?]>,
): string {
  return specs.map(([v, w, a]) => fw(v, w, a)).join('');
}
