'use client';

import React, { useState, useRef, useEffect } from 'react';

interface InfoBadgeProps {
  text: string;
  className?: string;
  size?: number;
}

export function InfoBadge({ text, className = '', size = 15 }: InfoBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close when clicking outside anywhere in the document
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        margin: '0 4px',
        lineHeight: 1,
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label="More information"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: isOpen ? '#ccfbf1' : '#f1f5f9',
          border: isOpen ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
          color: isOpen ? '#0f766e' : '#475569',
          fontSize: size <= 15 ? '10px' : '11px',
          fontWeight: 800,
          fontFamily: 'serif',
          fontStyle: 'italic',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(15, 118, 110, 0.2)' : '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        i
      </button>

      {isOpen && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 7px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: 'max-content',
            maxWidth: '240px',
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '11px',
            fontWeight: 500,
            padding: '7px 11px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px -2px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)',
            lineHeight: 1.45,
            textAlign: 'center',
            whiteSpace: 'normal',
            pointerEvents: 'auto',
          }}
        >
          {text}
          {/* Arrow Caret */}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #0f172a',
            }}
          />
        </span>
      )}
    </span>
  );
}
