'use client';
/**
 * @file Toast.tsx
 * @description Sleek toast notifications container.
 */
import React from 'react';
import { useToastStore, ToastItem } from '@/store/toastStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
  info: <Info size={16} className="text-indigo-400 shrink-0" />,
};

const BORDER_COLORS = {
  success: 'border-emerald-500/30 bg-[#16231d]',
  error: 'border-red-500/30 bg-[#251717]',
  warning: 'border-amber-500/30 bg-[#251f14]',
  info: 'border-indigo-500/30 bg-[#1c1c28]',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 380,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t: ToastItem) => (
        <div
          key={t.id}
          className={`pointer-events-auto border rounded-xl p-3.5 shadow-2xl flex items-start gap-3 transition-all duration-200 ${BORDER_COLORS[t.type]}`}
          style={{
            backdropFilter: 'blur(8px)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {ICONS[t.type]}
          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs font-semibold text-zinc-100 leading-snug">
              {t.title}
            </div>
            {t.message && (
              <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words whitespace-pre-line">
                {t.message}
              </div>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
