'use client';
import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

/**
 * Reusable Universal Pagination Component
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Active page number (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Callback when page changes (newPage) => void
 * @param {number} [props.totalItems] - Total count of records
 * @param {number} [props.pageSize] - Number of items per page
 * @param {Function} [props.onPageSizeChange] - Optional callback for changing page size
 * @param {Array<number>} [props.pageSizeOptions] - Options for page size dropdown
 * @param {string} [props.itemName] - Name of items (e.g. 'users', 'records', 'systems')
 * @param {boolean} [props.showInfo] - Whether to show the range text (default: true)
 * @param {Object} [props.style] - Custom wrapper inline styles
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'items',
  showInfo = true,
  style = {}
}) {
  const safeCurrent = Math.max(1, Math.min(currentPage || 1, totalPages || 1));
  const safeTotalPages = Math.max(1, totalPages || 1);

  // If there are no items or only 1 page with no item count info and no page size selector, still render cleanly or minimal
  if (safeTotalPages <= 1 && totalItems === 0) {
    return null;
  }

  const startIndex = (safeCurrent - 1) * pageSize + 1;
  const endIndex = totalItems !== undefined ? Math.min(safeCurrent * pageSize, totalItems) : safeCurrent * pageSize;

  // Compute visible page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      let start = Math.max(2, safeCurrent - 1);
      let end = Math.min(safeTotalPages - 1, safeCurrent + 1);

      if (safeCurrent <= 3) {
        start = 2;
        end = 4;
      } else if (safeCurrent >= safeTotalPages - 2) {
        start = safeTotalPages - 3;
        end = safeTotalPages - 1;
      }

      if (start > 2) pages.push('ellipsis-start');

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < safeTotalPages - 1) pages.push('ellipsis-end');

      pages.push(safeTotalPages);
    }
    return pages;
  };

  const handlePageClick = (page) => {
    if (page >= 1 && page <= safeTotalPages && page !== safeCurrent && onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <div
      className="pagination-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        marginTop: '1.25rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
        borderRadius: '12px',
        ...style
      }}
    >
      {/* Left: Info Text & Page Size Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {showInfo && totalItems !== undefined && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: '500' }}>
            Showing{' '}
            <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
              {totalItems === 0 ? 0 : startIndex}
            </strong>{' '}
            to{' '}
            <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
              {endIndex}
            </strong>{' '}
            of{' '}
            <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
              {totalItems}
            </strong>{' '}
            {itemName}
          </div>
        )}

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
                borderRadius: '6px',
                color: 'var(--text-primary, #f8fafc)',
                padding: '4px 8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} style={{ background: '#0f172a', color: '#fff' }}>
                  {opt} per page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* First Button */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={safeCurrent <= 1}
          title="First Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-primary, #f8fafc)',
            fontSize: '0.9rem',
            cursor: safeCurrent <= 1 ? 'not-allowed' : 'pointer',
            opacity: safeCurrent <= 1 ? 0.4 : 1,
            transition: 'all 0.2s'
          }}
        >
          <FiChevronsLeft />
        </button>

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrent - 1)}
          disabled={safeCurrent <= 1}
          title="Previous Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-primary, #f8fafc)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: safeCurrent <= 1 ? 'not-allowed' : 'pointer',
            opacity: safeCurrent <= 1 ? 0.4 : 1,
            transition: 'all 0.2s',
            gap: '4px'
          }}
        >
          <FiChevronLeft /> Prev
        </button>

        {/* Numbered Page Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === 'ellipsis-start' || p === 'ellipsis-end') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '32px',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '0.85rem'
                }}
              >
                …
              </span>
            );
          }

          const isActive = p === safeCurrent;

          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => handlePageClick(p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                height: '32px',
                padding: '0 8px',
                borderRadius: '8px',
                border: isActive
                  ? '1px solid var(--accent-cyan, #06b6d4)'
                  : '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.2))'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isActive
                  ? 'var(--accent-cyan, #06b6d4)'
                  : 'var(--text-primary, #f8fafc)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 0 10px rgba(6, 182, 212, 0.3)' : 'none'
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrent + 1)}
          disabled={safeCurrent >= safeTotalPages}
          title="Next Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-primary, #f8fafc)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: safeCurrent >= safeTotalPages ? 'not-allowed' : 'pointer',
            opacity: safeCurrent >= safeTotalPages ? 0.4 : 1,
            transition: 'all 0.2s',
            gap: '4px'
          }}
        >
          Next <FiChevronRight />
        </button>

        {/* Last Button */}
        <button
          type="button"
          onClick={() => handlePageClick(safeTotalPages)}
          disabled={safeCurrent >= safeTotalPages}
          title="Last Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-primary, #f8fafc)',
            fontSize: '0.9rem',
            cursor: safeCurrent >= safeTotalPages ? 'not-allowed' : 'pointer',
            opacity: safeCurrent >= safeTotalPages ? 0.4 : 1,
            transition: 'all 0.2s'
          }}
        >
          <FiChevronsRight />
        </button>
      </div>
    </div>
  );
}
