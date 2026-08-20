"use client";

import { useEffect } from 'react';

export function useHexKeyboardShortcuts({
  enabled,
  canConfirm,
  busy,
  onRotate,
  onCancel,
  onConfirm,
}: {
  enabled: boolean;
  canConfirm: boolean;
  busy: boolean;
  onRotate: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if ((event.key === 'r' || event.key === 'R') && !busy) {
        event.preventDefault();
        onRotate();
        return;
      }
      if (event.key === 'Enter' && canConfirm && !busy) {
        event.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, canConfirm, enabled, onCancel, onConfirm, onRotate]);
}
