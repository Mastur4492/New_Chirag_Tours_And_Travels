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
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'records',
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with ellipsis
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
    <div className={`pagination-container ${className}`}>
      {/* Left side: Range Info & Page Size Selector */}
      <div className="pagination-info-wrapper">
        <span className="pagination-info-text">
          Showing <strong className="text-slate-800 font-semibold">{startItem}</strong> to{' '}
          <strong className="text-slate-800 font-semibold">{endItem}</strong> of{' '}
          <strong className="text-slate-800 font-semibold">{totalItems}</strong> {itemName}
        </span>

        {onPageSizeChange && (
          <div
            className="pagination-size-selector"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
              Rows per page:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="pagination-select"
              aria-label="Records per page"
              style={{
                height: '30px',
                padding: '0 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
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

      {/* Right side: Navigation Buttons */}
      <div className="pagination-controls">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          className="pagination-btn pagination-nav-btn"
          title="First Page"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          className="pagination-btn pagination-nav-btn"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Pills */}
        <div className="pagination-numbers">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
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
                className={`pagination-btn pagination-page-btn ${isCurrent ? 'active' : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          className="pagination-btn pagination-nav-btn"
          title="Next Page"
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          className="pagination-btn pagination-nav-btn"
          title="Last Page"
          aria-label="Go to last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
