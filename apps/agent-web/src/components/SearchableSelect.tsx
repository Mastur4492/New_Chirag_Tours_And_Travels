'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: (SearchableOption | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  clearable?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search or type...',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  style,
  menuStyle,
  clearable = false,
  emptyMessage = 'No matching options found',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options to SearchableOption[]
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
  }, [options]);

  // Selected Option Object
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Filter & prioritize options based on search query (prefix matches first!)
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();

    // Tier 1: Item label starts with the search letter/word (e.g. "Agra", "Andaman" for "a")
    const tier1: SearchableOption[] = [];
    // Tier 2: Word inside label starts with query (e.g. "North Goa", "South Andaman")
    const tier2: SearchableOption[] = [];
    // Tier 3: Contains anywhere in label, subLabel, or value
    const tier3: SearchableOption[] = [];

    normalizedOptions.forEach((opt) => {
      const labelLower = opt.label.toLowerCase();
      const subLower = opt.subLabel ? opt.subLabel.toLowerCase() : '';
      const valLower = opt.value.toLowerCase();

      if (labelLower.startsWith(q)) {
        tier1.push(opt);
      } else if (labelLower.split(/[\s,/-]+/).some((w) => w.startsWith(q))) {
        tier2.push(opt);
      } else if (labelLower.includes(q) || subLower.includes(q) || valLower.includes(q)) {
        tier3.push(opt);
      }
    });

    return [...tier1, ...tier2, ...tier3];
  }, [normalizedOptions, searchQuery]);

  // Handle open / close
  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery('');

    // Pre-highlight the currently selected item or 0
    const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [disabled, filteredOptions, value]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, handleClose]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Ensure highlighted item is scrolled into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredOptions.length > 0) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        const topPos = highlightedElement.offsetTop;
        const bottomPos = topPos + highlightedElement.offsetHeight;
        if (topPos < listElement.scrollTop) {
          listElement.scrollTop = topPos;
        } else if (bottomPos > listElement.scrollTop + listElement.clientHeight) {
          listElement.scrollTop = bottomPos - listElement.clientHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  // Select an option
  const handleSelect = (val: string) => {
    onChange(val);
    handleClose();
  };

  // Keyboard Navigation & Typeahead
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleOpen();
        return;
      }
      // If user types a single alphanumeric letter directly when focused on the closed dropdown
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /[a-zA-Z0-9]/.test(e.key)) {
        e.preventDefault();
        handleOpen();
        setSearchQuery(e.key);
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current && !current.disabled) {
        handleSelect(current.value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-root ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: 'inherit',
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for form integration */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: isOpen ? '1.5px solid #0d9488' : '1.5px solid #cbd5e1',
          borderRadius: 10,
          fontSize: '13.5px',
          fontWeight: selectedOption ? 600 : 400,
          color: selectedOption ? '#0f172a' : '#94a3b8',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(13, 148, 136, 0.15)'
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: 8,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
                borderRadius: 4,
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            style={{
              color: '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '100%',
            minWidth: 240,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            boxShadow:
              '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.15s ease-out',
            ...menuStyle,
          }}
        >
          {/* Top Search Input Bar */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={15} color="#0d9488" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0f172a',
                padding: '4px 0',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHighlightedIndex(0);
                  searchInputRef.current?.focus();
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options Scrollable List */}
          <div
            ref={listRef}
            role="listbox"
            style={{
              maxHeight: 250,
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) {
                        handleSelect(opt.value);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      // High-contrast Blue Highlight Bar as requested by user
                      background: isHighlighted
                        ? '#eff6ff'
                        : isSelected
                        ? '#f0fdf4'
                        : 'transparent',
                      color: isHighlighted
                        ? '#1d4ed8'
                        : isSelected
                        ? '#059669'
                        : opt.disabled
                        ? '#94a3b8'
                        : '#1e293b',
                      borderLeft: isHighlighted
                        ? '3.5px solid #2563eb'
                        : isSelected
                        ? '3.5px solid #059669'
                        : '3.5px solid transparent',
                      fontWeight: isSelected ? 700 : isHighlighted ? 600 : 500,
                      transition: 'background 0.1s ease, color 0.1s ease',
                      marginBottom: 2,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </div>
                      {opt.subLabel && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: isHighlighted ? '#3b82f6' : '#64748b',
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {opt.subLabel}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: isHighlighted ? '#dbeafe' : '#f1f5f9',
                            color: isHighlighted ? '#1e40af' : '#475569',
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={15} color="#059669" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
