/**
 * AdminCRUDTable — enterprise shared table for every admin list page.
 *
 * Features (per-page configurable):
 *   • Search box (debounced inside via React state)
 *   • Status filter dropdown
 *   • Column sort (clickable headers)
 *   • Pagination (25 default)
 *   • Bulk select + Bulk action bar (Delete / Publish / Unpublish / Status change)
 *   • Per-row lifecycle buttons: Edit, Delete, Archive, Restore, Publish,
 *     Unpublish, Activate, Deactivate
 *   • Realtime refresh via useRealtimeRefresh(table, onRefresh)
 *   • Empty / loading states
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, Archive, RotateCcw, Eye, EyeOff, CheckCircle, XCircle, Search } from 'lucide-react';
import { useAdminTable, type SortDir } from '../../hooks/useAdminTable';
import { useRealtimeRefresh } from '../../services/realtime';

export type LifecycleAction =
  | 'edit'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'publish'
  | 'unpublish'
  | 'activate'
  | 'deactivate';

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

export interface LifecycleButton<T> {
  action: LifecycleAction;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  /** Decide whether this button is shown for the row. */
  visible?: (row: T) => boolean;
  color?: string;
  /** Disable the button for the row. */
  disabled?: (row: T) => boolean;
  /** Required to call. */
  onClick: (row: T) => void;
}

export interface BulkAction {
  label: string;
  variant: 'danger' | 'primary' | 'secondary';
  /** Run for each id; return true on success. */
  run: (ids: string[]) => Promise<boolean>;
}

export interface AdminCRUDTableProps<T extends { id: string }> {
  table: string;
  rows: T[];
  loading?: boolean;
  columns: ColumnDef<T>[];
  statusOptions?: StatusOption[];
  statusField?: string;
  defaultSort?: { key: string; dir: SortDir };
  pageSize?: number;
  searchableFields: string[];
  lifecycleButtons?: LifecycleButton<T>[];
  bulkActions?: BulkAction[];
  onBulkStatusChange?: (ids: string[], newStatus: string) => Promise<boolean>;
  onRefresh?: () => void | Promise<void>;
  emptyMessage?: string;
}

export function AdminCRUDTable<T extends { id: string }>(props: AdminCRUDTableProps<T>) {
  const {
    table, rows, loading,
    columns, statusOptions, statusField,
    defaultSort, pageSize = 25, searchableFields,
    lifecycleButtons = [], bulkActions = [],
    onBulkStatusChange, onRefresh,
    emptyMessage = 'No records found.',
  } = props;

  const tbl = useAdminTable<T>(rows, {
    searchableFields, statusField, defaultSort, pageSize,
  });

  const [bulkStatus, setBulkStatus] = useState<string>('');

  // Realtime refresh.
  useRealtimeRefresh(table, async () => {
    if (onRefresh) await onRefresh();
  });

  function handleBulkAction(bulk: BulkAction) {
    const ids = Array.from(tbl.selected);
    if (!ids.length) return;
    if (!confirm(`Apply "${bulk.label}" to ${ids.length} record(s)?`)) return;
    void bulk.run(ids).then(async (ok) => {
      if (ok) {
        tbl.clearSelection();
        if (onRefresh) await onRefresh();
      }
    });
  }

  async function handleBulkStatusChange() {
    if (!onBulkStatusChange || !bulkStatus) return;
    const ids = Array.from(tbl.selected);
    if (!ids.length) return;
    if (!confirm(`Set status to "${bulkStatus}" for ${ids.length} record(s)?`)) return;
    const ok = await onBulkStatusChange(ids, bulkStatus);
    if (ok) {
      setBulkStatus('');
      tbl.clearSelection();
      if (onRefresh) await onRefresh();
    }
  }

  const pageIds = tbl.pageRows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => tbl.selected.has(id));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={tbl.search}
            onChange={(e) => tbl.setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded border border-gray-300 pl-7 pr-3 py-1.5 text-sm w-64"
          />
        </div>
        {statusOptions && statusOptions.length > 0 && (
          <select
            value={tbl.statusFilter}
            onChange={(e) => tbl.setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-500">
          {tbl.filtered.length} of {rows.length} record{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Bulk action bar */}
      {tbl.selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-sm font-medium text-blue-900">{tbl.selected.size} selected</span>
          {bulkActions.map((b, i) => (
            <button
              key={i}
              onClick={() => handleBulkAction(b)}
              className={`rounded px-3 py-1 text-sm ${
                b.variant === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : b.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {b.label}
            </button>
          ))}
          {onBulkStatusChange && statusOptions && (
            <div className="flex items-center gap-1">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">Change status…</option>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={handleBulkStatusChange}
                disabled={!bulkStatus}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
          <button
            onClick={tbl.clearSelection}
            className="ml-auto rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={() => tbl.selectAllOnPage(pageIds)}
                  aria-label="Select all on page"
                />
              </th>
              {columns.map((c) => {
                const sortable = c.sortable !== false;
                const isActive = tbl.sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={`px-3 py-2 ${sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
                    onClick={sortable ? () => tbl.onSort(c.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {isActive && (tbl.sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </span>
                  </th>
                );
              })}
              <th className="w-44 px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={columns.length + 2} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && tbl.pageRows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="px-3 py-6 text-center text-gray-500">{emptyMessage}</td></tr>
            )}
            {!loading && tbl.pageRows.map((row) => {
              const visibleButtons = lifecycleButtons.filter((b) => !b.visible || b.visible(row));
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={tbl.selected.has(row.id)}
                      onChange={() => tbl.toggleSelect(row.id)}
                      aria-label={`Select ${row.id}`}
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {c.render ? c.render(row) : String(row[c.key] ?? '')}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {visibleButtons.map((b, i) => {
                        const Icon = b.icon || defaultIcon(b.action);
                        const cls = b.color || defaultColor(b.action);
                        const disabled = b.disabled ? b.disabled(row) : false;
                        return (
                          <button
                            key={i}
                            disabled={disabled}
                            onClick={() => b.onClick(row)}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${cls} disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={b.label}
                          >
                            <Icon size={12} />
                            <span className="hidden md:inline">{b.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">
          Page {tbl.page} of {tbl.totalPages}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => tbl.setPage(Math.max(1, tbl.page - 1))}
            disabled={tbl.page === 1}
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
          >Prev</button>
          <button
            onClick={() => tbl.setPage(Math.min(tbl.totalPages, tbl.page + 1))}
            disabled={tbl.page === tbl.totalPages}
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
          >Next</button>
        </div>
      </div>
    </div>
  );
}

function defaultIcon(action: LifecycleAction) {
  switch (action) {
    case 'edit': return Edit;
    case 'delete': return Trash2;
    case 'archive': return Archive;
    case 'restore': return RotateCcw;
    case 'publish': return CheckCircle;
    case 'unpublish': return XCircle;
    case 'activate': return Eye;
    case 'deactivate': return EyeOff;
  }
}

function defaultColor(action: LifecycleAction): string {
  switch (action) {
    case 'edit': return 'border border-gray-300 text-gray-700 hover:bg-gray-50';
    case 'delete': return 'bg-red-600 text-white hover:bg-red-700';
    case 'archive': return 'border border-gray-300 text-gray-700 hover:bg-gray-50';
    case 'restore': return 'border border-gray-300 text-gray-700 hover:bg-gray-50';
    case 'publish': return 'bg-green-600 text-white hover:bg-green-700';
    case 'unpublish': return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'activate': return 'bg-blue-600 text-white hover:bg-blue-700';
    case 'deactivate': return 'border border-gray-300 text-gray-700 hover:bg-gray-50';
  }
}

export default AdminCRUDTable;