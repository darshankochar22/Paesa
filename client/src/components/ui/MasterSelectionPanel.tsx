import { useState, useEffect } from 'react';
import { useEscape } from '@/hooks/useEscape';
import PageTitleBar from './PageTitleBar';
import SearchInput from './SearchInput';
import DataTable, { type TableColumn } from './DataTable';
import RightActionPanel from './RightActionPanel';

interface Props<T> {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  items: T[];
  filterFn: (item: T, search: string) => boolean;
  columns: TableColumn[];
  onSelect: (item: T) => void;
  onCancel: () => void;
  onCreate: () => void;
  createLabel?: string;
  rowKey: (item: T) => string | number;
  emptyMessage?: string;
}

export default function MasterSelectionPanel<T>({
  title,
  subtitle,
  searchPlaceholder = 'Search...',
  items,
  filterFn,
  columns,
  onSelect,
  onCancel,
  onCreate,
  createLabel = 'Create Item',
  rowKey,
  emptyMessage = 'No items found.',
}: Props<T>) {
  const [search, setSearch] = useState('');

  useEscape(onCancel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCreate]);

  const filtered = items.filter((item) => filterFn(item, search));

  // Keys are registered by RightActionPanel (autoShortcuts) — badge and
  // handler are one source of truth. Esc must work from the search box.
  const selectionActions = [
    { key: 'Alt+C', label: createLabel, onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
    { key: 'Alt+C', label: createLabel, onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel, allowInInputs: true },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title={title} subtitle={subtitle} />

      <div className="p-3 bg-white border-b border-gray-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={rowKey}
            onRowClick={onSelect}
            emptyMessage={emptyMessage}
          />
        </div>
        <RightActionPanel actions={selectionActions} autoShortcuts />
      </div>

      <div className="border-t border-gray-200 p-3 flex justify-end bg-white">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-gray-200 bg-white shadow-sm text-black hover:bg-black/[0.03] transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
