import React, { useState } from 'react';
import {
  CloudDownload,
  CloudUpload,
  Download,
  Lock,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Upload,
  Vibrate,
  Volume2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { WorkspaceData } from '../types/workspace';
import {
  decryptWorkspaceData,
  encryptWorkspaceData,
  type EncryptedVaultPayload,
} from '../utils/cryptoSync';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SyncSettingsModalProps {
  open: boolean;
  onClose: () => void;
  workspace: WorkspaceData;
  user: User | null;
  hasGoogleToken: boolean;
  signingIn: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onUploadEncryptedDrive: (passphrase: string) => Promise<void>;
  onRestoreEncryptedDrive: (passphrase: string) => Promise<void>;
  onImportDecryptedWorkspace: (data: WorkspaceData) => void;
  onUpdatePreferences: (patch: Partial<WorkspaceData['preferences']>) => void;
  onTestHaptic: () => void;
  onResetWorkspace: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  open,
  onClose,
  workspace,
  user,
  hasGoogleToken,
  signingIn,
  onGoogleSignIn,
  onGoogleSignOut,
  onUploadEncryptedDrive,
  onRestoreEncryptedDrive,
  onImportDecryptedWorkspace,
  onUpdatePreferences,
  onTestHaptic,
  onResetWorkspace,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    kind: 'ok' | 'err';
    msg: string;
  } | null>(null);

  if (!open) return null;

  const handleDriveUpload = async () => {
    setSyncStatus(null);
    setSyncBusy(true);
    try {
      await onUploadEncryptedDrive(passphrase);
      setSyncStatus({
        kind: 'ok',
        msg: 'Workspace encrypted (AES-256-GCM) and synced to Google Drive AppData.',
      });
    } catch (err) {
      setSyncStatus({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'Encrypted upload failed.',
      });
    } finally {
      setSyncBusy(false);
    }
  };

  const handleDriveRestore = async () => {
    setSyncStatus(null);
    setSyncBusy(true);
    try {
      await onRestoreEncryptedDrive(passphrase);
      setSyncStatus({
        kind: 'ok',
        msg: 'Decrypted and restored workspace from Google Drive AppData.',
      });
    } catch (err) {
      setSyncStatus({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'Encrypted restore failed.',
      });
    } finally {
      setSyncBusy(false);
    }
  };

  const handleLocalEncryptedExport = async () => {
    setSyncStatus(null);
    try {
      const payload = await encryptWorkspaceData(workspace, passphrase);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cadence-vault-${new Date().toISOString().slice(0, 10)}.cadence`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus({ kind: 'ok', msg: 'Exported encrypted .cadence backup file.' });
    } catch (err) {
      setSyncStatus({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'Export failed.',
      });
    }
  };

  const handleLocalEncryptedImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result)) as EncryptedVaultPayload;
        const restored = await decryptWorkspaceData(payload, passphrase);
        onImportDecryptedWorkspace(restored);
        setSyncStatus({ kind: 'ok', msg: 'Decrypted and restored .cadence backup file.' });
      } catch (err) {
        setSyncStatus({
          kind: 'err',
          msg: err instanceof Error ? err.message : 'Decryption failed.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-2xl space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Sync, Encryption &amp; Device Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Local-first storage requires no account. Connect Google only when you want Workspace or encrypted Drive sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Google Workspace Account Connection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Google Workspace Connection (Optional)
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-4">
            <div className="text-xs">
              {user && hasGoogleToken ? (
                <div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Connected as {user.displayName || user.email}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Calendar, Tasks, Sheets, Drive files, and encrypted AppData sync active in memory.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Local-Only Mode Active
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    All data stays in browser localStorage with zero database. Sign in only to read/write Google Sheets, Docs, Tasks, Calendar, or Drive backups.
                  </p>
                </div>
              )}
            </div>

            {user && hasGoogleToken ? (
              <button
                type="button"
                onClick={onGoogleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" /> Disconnect
              </button>
            ) : (
              <GoogleSignInButton onClick={onGoogleSignIn} loading={signingIn} />
            )}
          </div>
        </div>

        {/* Zero-Knowledge AES-256-GCM Encrypted Sync */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AES-256-GCM Encrypted Cross-Device Sync
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your workspace is encrypted client-side via Web Crypto (PBKDF2-SHA256 + AES-GCM-256) before touching Google Drive AppData or leaving your browser.
          </p>

          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter encryption passphrase (min 6 chars)..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!hasGoogleToken || syncBusy}
              onClick={handleDriveUpload}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              Encrypt &amp; Sync to Drive
            </button>
            <button
              type="button"
              disabled={!hasGoogleToken || syncBusy}
              onClick={handleDriveRestore}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <CloudDownload className="h-3.5 w-3.5" />
              Restore Encrypted Drive Vault
            </button>
            <button
              type="button"
              onClick={handleLocalEncryptedExport}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export Encrypted .cadence File
            </button>
            <label className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              Import Encrypted .cadence File
              <input
                type="file"
                accept=".cadence,.json"
                onChange={handleLocalEncryptedImport}
                className="hidden"
              />
            </label>
          </div>

          {syncStatus && (
            <div
              className={`rounded-lg px-3.5 py-2 text-xs font-medium flex items-center gap-2 ${
                syncStatus.kind === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{syncStatus.msg}</span>
            </div>
          )}
        </div>

        {/* Haptic & Feedback Preferences */}
        <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tactile Haptics &amp; Workspace Reset
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={workspace.preferences.hapticsEnabled}
                onChange={(e) =>
                  onUpdatePreferences({ hapticsEnabled: e.target.checked })
                }
              />
              <Vibrate className="h-3.5 w-3.5" />
              Vibration Haptics on Complete
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={workspace.preferences.soundEnabled}
                onChange={(e) =>
                  onUpdatePreferences({ soundEnabled: e.target.checked })
                }
              />
              <Volume2 className="h-3.5 w-3.5" />
              Subtle Tactile Chime
            </label>

            <button
              type="button"
              onClick={onTestHaptic}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Test Haptic Pulse
            </button>

            <button
              type="button"
              onClick={onResetWorkspace}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Local Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
