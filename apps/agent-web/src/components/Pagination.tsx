'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemName = 'bookings',
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safePage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (safePage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(safePage - 1);
        pages.push(safePage);
        pages.push(safePage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        padding: '16px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
      }}
    >
      {/* Range Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing{' '}
          <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{startItem}</strong> to{' '}
          <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{endItem}</strong> of{' '}
          <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{totalItems}</strong>{' '}
          {itemName}
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              style={{
                fontSize: '0.8rem',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
              aria-label="Records per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: safePage === 1 ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
            color: safePage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safePage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="First Page"
          aria-label="First page"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: safePage === 1 ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
            color: safePage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safePage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Previous Page"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--text-muted)' }}>
                  &hellip;
                </span>
              );
            }
            const isCurrent = p === safePage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: isCurrent ? 'var(--primary)' : 'var(--bg-surface)',
                  color: isCurrent ? '#ffffff' : 'var(--text-main)',
                  fontWeight: isCurrent ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: safePage === totalPages ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
            color: safePage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Next Page"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: safePage === totalPages ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
            color: safePage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
            cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Last Page"
          aria-label="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
