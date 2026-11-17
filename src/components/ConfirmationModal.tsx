import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { PendingConfirmation } from '../types/workspace';

interface ConfirmationModalProps {
  confirmation: PendingConfirmation | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  confirmation,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  if (!confirmation) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await confirmation.onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                confirmation.isDestructive
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {confirmation.isDestructive ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <h3
              id="confirm-modal-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {confirmation.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close confirmation dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {confirmation.description}
        </p>

        {confirmation.affectedItems && confirmation.affectedItems.length > 0 && (
          <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-3 text-xs text-slate-700 dark:text-slate-300">
            {confirmation.affectedItems.map((item, idx) => (
              <li key={idx} className="truncate">
                • {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer ${
              confirmation.isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-60`}
          >
            {busy ? 'Applying...' : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
