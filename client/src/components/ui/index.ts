export { default as PageTitleBar } from './PageTitleBar';
export { default as StatusBadge } from './StatusBadge';
export { default as AlertBanner } from './AlertBanner';
export { default as NotificationBanner } from './NotificationBanner';
export { default as SearchInput } from './SearchInput';
export { default as SectionCard } from './SectionCard';
export { default as DataTable } from './DataTable';
export type { TableColumn } from './DataTable';
export { default as MenuCard } from './Card';
export { default as FormRow } from './FormRow';
export { default as SideSelectionPanel } from './SideSelectionPanel';
export { default as RightActionPanel } from './RightActionPanel';
export type { RightPanelAction } from './RightActionPanel';
export { default as MasterSelectionPanel } from './MasterSelectionPanel';
export { default as MasterFormFooter } from './MasterFormFooter';

// ── Local primitives (sharp, zinc, shadcn-free) ──────────────────────────────
export { default as Button } from './Button';
export type { ButtonProps } from './Button';
export { default as Input } from './Input';
export type { InputProps } from './Input';
export { default as Select } from './Select';
export type { SelectProps, SelectOption } from './Select';
export { default as Checkbox } from './Checkbox';
export { default as Badge } from './Badge';
export { default as Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export { default as Modal } from './Modal';
export { default as ConfirmModal } from './ConfirmModal';

// ── Composites ───────────────────────────────────────────────────────────────
export { default as FullScreenPanel } from './FullScreenPanel';
export type { FullScreenPanelProps } from './FullScreenPanel';
export { default as ReportHeader } from './ReportHeader';
export type { ReportHeaderProps, ReportHeaderCrumb } from './ReportHeader';
export { default as FilterBar } from './FilterBar';
export { default as TableHeader } from './TableHeader';
export type { HeaderColumn } from './TableHeader';
export { default as RowDeleteButton } from './RowDeleteButton';
export { default as TwoColumnReport } from './TwoColumnReport';
export type { ReportSide } from './TwoColumnReport';

// ── Folded in from blocks/ (originals are now re-export shims) ────────────────
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';
export { StatGrid } from './StatGrid';
export type { StatGridProps } from './StatGrid';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { PageToolbar } from './PageToolbar';
export type { PageToolbarProps } from './PageToolbar';
export { DataTableCard } from './DataTableCard';
export type { DataTableCardProps, DataTableColumn } from './DataTableCard';

// ── Style tokens ─────────────────────────────────────────────────────────────
export * as tokens from './tokens';
