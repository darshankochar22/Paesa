import { menuHotkey } from '@/hooks/useMenuHotkeys';

// Renders a menu label with its TallyPrime hotkey letter underlined, so the
// keyboard shortcut is discoverable ("Ledger" → the L is underlined). Weight,
// not colour, per the app's strict black/white theme.
export function MenuHotkeyLabel({ label }: { label: string }) {
  const { index } = menuHotkey(label);
  if (index < 0) return <>{label}</>;
  return (
    <>
      {label.slice(0, index)}
      <span className="underline font-semibold">{label[index]}</span>
      {label.slice(index + 1)}
    </>
  );
}
