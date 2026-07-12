import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { MasterSelectionPanel, NotificationBanner, type TableColumn } from '@/components/ui';
import ExciseBookForm from './ExciseBookForm';
import type { ExciseBookType } from '@/types/api';

export default function ExciseBookAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [books, setBooks] = useState<ExciseBookType[]>([]);
  const [selected, setSelected] = useState<ExciseBookType | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.exciseBook.getAll(companyId);
    if (res.success) setBooks(res.exciseBooks ?? []);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (b: ExciseBookType) => {
    const res = await window.api.exciseBook.getById(b.excise_book_id!);
    if (res.success) setSelected(res.exciseBook);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete excise book "${selected.name}"?`)) return;
    const res = await window.api.exciseBook.delete(selected.excise_book_id!);
    if (res.success) {
      setSuccess(`Excise Book "${selected.name}" deleted.`);
      setSelected(null);
      load();
    } else {
      window.alert(res.error || 'Failed to delete excise book.');
    }
  };

  if (!companyId) {
    return <div className="p-6 text-sm text-zinc-500">No company selected.</div>;
  }

  if (!selected) {
    const columns: TableColumn[] = [
      {
        key: 'name',
        label: 'Name',
        span: 'col-span-5',
        render: (r: ExciseBookType) => (
          <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
        ),
      },
      {
        key: 'numbering_method',
        label: 'Method of numbering',
        span: 'col-span-4',
        render: (r: ExciseBookType) => (
          <span className="text-zinc-500 font-semibold">{r.numbering_method || '—'}</span>
        ),
      },
      {
        key: 'used_for',
        label: 'Used for',
        span: 'col-span-3',
        render: (r: ExciseBookType) => (
          <span className="text-zinc-500 font-semibold">{r.used_for || '—'}</span>
        ),
      },
    ];

    return (
      <div className="flex-1 flex flex-col h-full">
        {success && (
          <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}
        <MasterSelectionPanel<ExciseBookType>
          title="Alter Excise Book"
          subtitle="Select Excise Book to Alter"
          searchPlaceholder="Search excise books by name…"
          items={books}
          filterFn={(b, q) =>
            b.name.toLowerCase().includes(q.toLowerCase()) ||
            (b.used_for ?? '').toLowerCase().includes(q.toLowerCase())
          }
          columns={columns}
          onSelect={handleSelect}
          onCancel={() => navigate('/master/alter')}
          onCreate={() => navigate('/master/create/excise-book')}
          createLabel="Create Excise Book"
          rowKey={(b) => b.excise_book_id!}
          emptyMessage="No excise books found."
        />
      </div>
    );
  }

  return (
    <ExciseBookForm
      mode="alter"
      companyId={companyId}
      initial={selected}
      onSaved={(msg) => {
        setSuccess(msg);
        setSelected(null);
        load();
      }}
      onCancel={() => navigate('/master/alter')}
      onBack={() => setSelected(null)}
      onDelete={handleDelete}
    />
  );
}
