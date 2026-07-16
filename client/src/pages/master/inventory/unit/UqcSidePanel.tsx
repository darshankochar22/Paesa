import { SideSelectionPanel } from '@/components/ui';
import { UQC_LIST } from './UqcPopup';

// Right-side "List of UQCs" — the same panel pattern the group/godown/category masters use
// for their "Under" selection, so UQC picking is consistent everywhere. Searchable because the
// UQC list is long (46 codes). Rendered at the master's container level (needs a `relative`
// positioned ancestor), not anchored under the field like the old UqcPopup.
export default function UqcSidePanel({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <SideSelectionPanel
      title="List of UQCs"
      searchable
      items={UQC_LIST.map((u) => ({ id: u, label: u }))}
      selected={selected || 'Not Applicable'}
      onSelect={(val) => onSelect(val || 'Not Applicable')}
      onClose={onClose}
    />
  );
}
