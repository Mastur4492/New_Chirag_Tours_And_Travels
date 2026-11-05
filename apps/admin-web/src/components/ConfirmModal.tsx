'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string | React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string | null;
  hideCancel?: boolean;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  hideCancel = false,
  variant = 'primary',
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    primary: {
      iconBg: '#f0fdfa',
      iconBorder: '#99f6e4',
      iconColor: '#0f766e',
      Icon: CheckCircle2,
      confirmBg: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
      confirmColor: '#ffffff',
      confirmShadow: '0 4px 14px rgba(15, 118, 110, 0.3)',
    },
    danger: {
      iconBg: '#fff1f2',
      iconBorder: '#fecdd3',
      iconColor: '#be123c',
      Icon: AlertTriangle,
      confirmBg: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
      confirmColor: '#ffffff',
      confirmShadow: '0 4px 14px rgba(190, 18, 60, 0.3)',
    },
    warning: {
      iconBg: '#fffbeb',
      iconBorder: '#fde68a',
      iconColor: '#d97706',
      Icon: AlertTriangle,
      confirmBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      confirmColor: '#ffffff',
      confirmShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
    },
    info: {
      iconBg: '#eff6ff',
      iconBorder: '#bfdbfe',
      iconColor: '#2563eb',
      Icon: Info,
      confirmBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      confirmColor: '#ffffff',
      confirmShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
    },
  }[variant];

  const { Icon } = variantStyles;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          padding: 24,
          position: 'relative',
          animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon */}
        {!isLoading && (
          <button
            onClick={onCancel}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: variantStyles.iconBg,
              border: `1px solid ${variantStyles.iconBorder}`,
              color: variantStyles.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={24} />
          </div>

          <div style={{ flex: 1, paddingRight: 16 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>

            {message && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: '0.88rem',
                  color: '#475569',
                  lineHeight: 1.55,
                }}
              >
                {message}
              </div>
            )}

            {children && (
              <div style={{ marginTop: 12 }}>
                {children}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid #f1f5f9',
          }}
        >
          {!hideCancel && cancelLabel && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            disabled={isLoading || confirmDisabled}
            onClick={onConfirm}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: (isLoading || confirmDisabled) ? '#94a3b8' : variantStyles.confirmBg,
              color: variantStyles.confirmColor,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: (isLoading || confirmDisabled) ? 'not-allowed' : 'pointer',
              boxShadow: (isLoading || confirmDisabled) ? 'none' : variantStyles.confirmShadow,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
              opacity: (isLoading || confirmDisabled) ? 0.75 : 1,
            }}
          >
            {isLoading && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            )}
            <span>{isLoading ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
