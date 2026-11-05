'use client';

import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if running as installed standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 2. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('✅ Agent PWA ServiceWorker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('Agent PWA ServiceWorker registration failed:', err);
          });
      });
    }

    // 3. Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setInstalled(true);
      console.log('✅ Agent PWA App successfully installed to desktop');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // If already running standalone, show nothing
  if (isStandalone) {
    return null;
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {deferredPrompt ? (
        <button
          onClick={handleInstallClick}
          type="button"
          title="Install New Chirag Agent Travel Desk as a Desktop App"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.35)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Download size={14} />
          <span>Install Desk App</span>
        </button>
      ) : installed ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.75rem',
            color: '#2dd4bf',
            fontWeight: 700,
            background: 'rgba(45, 212, 191, 0.1)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(45, 212, 191, 0.25)',
          }}
        >
          <CheckCircle2 size={13} />
          <span>Desk App Installed</span>
        </span>
      ) : null}
    </div>
  );
}
