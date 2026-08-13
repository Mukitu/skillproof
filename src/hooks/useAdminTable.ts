
import { useEffect, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export interface UseAdminTableOptions {
  defaultSort?: { key: string; dir: SortDir };
  defaultPageSize?: number;
  pageSize?: number;
  searchableFields: string[];
  statusField?: string;
  syncToUrl?: boolean;
}

export interface UseAdminTableReturn<T> {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  selectAllOnPage: (ids: string[]) => void;
  clearSelection: () => void;
  filtered: T[];
  pageRows: T[];
  totalPages: number;
}

export function useAdminTable<T extends Record<string, any>>(
  rows: T[],
  opts: UseAdminTableOptions
): UseAdminTableReturn<T> {
  const { searchableFields, statusField, defaultSort, defaultPageSize = 25, pageSize: initialPageSize, syncToUrl = false } = opts;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort?.dir ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? defaultPageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  
  useEffect(() => setPage(1), [search, statusFilter, pageSize, sortKey, sortDir]);

  
  useEffect(() => {
    if (!syncToUrl || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (search) url.searchParams.set('q', search); else url.searchParams.delete('q');
    if (statusFilter) url.searchParams.set('status', statusFilter); else url.searchParams.delete('status');
    if (page > 1) url.searchParams.set('p', String(page)); else url.searchParams.delete('p');
    window.history.replaceState({}, '', url.toString());
    
  }, [search, statusFilter, page]);

  const filtered = useMemo(() => {
    let out = rows;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((row) =>
        searchableFields.some((f) => {
          const v = row[f];
          if (v === null || v === undefined) return false;
          return String(v).toLowerCase().includes(q);
        })
      );
    }
    if (statusField && statusFilter) {
      out = out.filter((row) => String(row[statusField] ?? '') === statusFilter);
    }
    if (sortKey && sortDir) {
      const key = sortKey;
      const dir = sortDir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return out;
  }, [rows, search, statusFilter, sortKey, sortDir, searchableFields, statusField]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  function onSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOnPage(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOnPageSelected = ids.every((i) => next.has(i));
      ids.forEach((i) => {
        if (allOnPageSelected) next.delete(i);
        else next.add(i);
      });
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    sortKey, sortDir, onSort,
    page, setPage,
    pageSize, setPageSize,
    selected, toggleSelect, selectAllOnPage, clearSelection,
    filtered, pageRows, totalPages,
  };
}